import { NextResponse } from "next/server";
import Replicate from "replicate";
import { usageGate } from "@/lib/usage-guard-server";
import { USAGE_EST_COST_USD } from "@/lib/usage-guard";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/test-mode";
import { isForceRegenerate } from "@/lib/force-regenerate";
import {
  SCENE_GEN_RATIO_RANGE,
  planSceneGeneration,
  runSceneGeneration,
  sceneGenEnabledFromEnv,
  sceneGenCostUsd,
  sceneImageMapFrom,
  sceneRefResizeSpec,
  type SceneRefMeta,
} from "@/lib/scene-image-gen";
import type { FetchBuffer } from "@/lib/info-backdrop";

/** 슬롯당 60초 타임아웃 + 429 재전송 대기를 감안한 실행 상한(초). 문서: route segment config maxDuration */
export const maxDuration = 150;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
const strArr = (v: unknown, max: number): string[] => (Array.isArray(v) ? v.slice(0, max).map((x) => (typeof x === "string" ? x : "")) : []);

/** 참조 사진은 우리 Storage 주소만 읽는다(클라이언트가 보낸 임의 주소를 서버가 가져오지 않게) */
function isOwnStorageUrl(u: string): boolean {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return false;
    const x = new URL(u);
    return x.protocol === "https:" && x.host === new URL(base).host && x.pathname.startsWith("/storage/");
  } catch {
    return false;
  }
}

/**
 * 422차 — 뷰티 인물 사용 컷(use-person · use-hand-mist) 생성. 계획·상한·폴백은 lib/scene-image-gen.ts가 정한다.
 * 어떤 실패든 오류 없이 빈 맵(슬롯 비움)으로 응답한다(내부 로그만). 로그에 URL·키·프롬프트 원문을 남기지 않는다.
 * 저장 위치는 섹션 배경과 같은 버킷(`<user>/scene-images/`).
 */
export async function POST(request: Request) {
  const empty = (skipped: string, extra: Record<string, unknown> = {}) => NextResponse.json({ sceneImages: {}, cost: 0, skipped, ...extra });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = (await request.json()) as {
      category?: unknown;
      productName?: unknown;
      targetCustomer?: unknown;
      sizeHint?: unknown;
      productHeightCm?: unknown;
      volumeText?: unknown;
      imageUrls?: unknown;
      imageTags?: unknown;
      imageOrigins?: unknown;
      imageRoles?: unknown;
    };
    const imageUrls = strArr(body.imageUrls, 20);
    const tags = Array.isArray(body.imageTags) ? (body.imageTags as unknown[]).slice(0, 20).map((t) => strArr(t, 8)) : [];
    const origins = strArr(body.imageOrigins, 20);
    const roles = strArr(body.imageRoles, 20);
    const refs: SceneRefMeta[] = imageUrls.map((_, i) => ({ tags: tags[i] ?? [], origin: origins[i] || undefined, role: roles[i] || undefined }));
    const token = process.env.REPLICATE_API_TOKEN;
    const plan = planSceneGeneration({
      category: clip(body.category, 40),
      productName: clip(body.productName, 200),
      targetCustomer: clip(body.targetCustomer, 200),
      sizeHint: clip(body.sizeHint, 200),
      heightCm: typeof body.productHeightCm === "number" ? body.productHeightCm : null,
      volumeText: clip(body.volumeText, 600),
      hasToken: !!token,
      testMode: isTestMode() && !isForceRegenerate(),
      enabled: sceneGenEnabledFromEnv(),
      refs,
    });
    console.log(
      `[scene-images] plan slots=${plan.slots.map((s) => s.slot).join(",") || "-"} estimate=$${plan.estimateUsd.toFixed(3)} refs=${plan.refIndexes.join(",") || "-"} size=${plan.dims ? `${plan.dims.heightCm}cm${plan.dims.estimated ? "(추정)" : ""}` : "-"} skipped=${plan.skipped.map((s) => `${s.slot}:${s.reason}`).join(",") || "-"}`,
    );
    if (plan.slots.length === 0 || !token) return empty(plan.skipped[0]?.reason ?? "empty-plan");
    // 426차 R1: 실제 호출이 확정된 뒤에만 한도를 예약한다
    const blocked = await usageGate(user.id, "photo", USAGE_EST_COST_USD.sceneImages);
    if (blocked) return blocked;

    // 참조 사진: 우리 Storage 주소만, 긴 변 1536px JPEG 90으로 줄여 data URI로 전송
    const refDataUris: string[] = [];
    for (const idx of plan.refIndexes) {
      const u = imageUrls[idx];
      if (!u || !isOwnStorageUrl(u)) continue;
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const jpg = await sharp(Buffer.from(await r.arrayBuffer()))
          .rotate()
          .resize(sceneRefResizeSpec.longEdge, sceneRefResizeSpec.longEdge, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: sceneRefResizeSpec.quality })
          .toBuffer();
        refDataUris.push(`data:image/jpeg;base64,${jpg.toString("base64")}`);
      } catch {
        /* 이 참조는 건너뜀 */
      }
    }
    if (refDataUris.length === 0) return empty("no-reference-readable");

    const replicate = new Replicate({ auth: token });
    const fetchBuffer: FetchBuffer = async (u) => {
      if (u.startsWith("data:")) {
        const b64 = u.split(",")[1];
        return b64 ? Buffer.from(b64, "base64") : null;
      }
      const r = await fetch(u);
      return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    };
    const [lo, hi] = SCENE_GEN_RATIO_RANGE;
    const results = await runSceneGeneration(plan, refDataUris, {
      run: (slug, input) => replicate.run(slug as `${string}/${string}`, { input }),
      fetchBuffer,
      validate: async (buf) => {
        try {
          const m = await sharp(buf).metadata();
          return !!m.width && !!m.height && m.width / m.height >= lo && m.width / m.height <= hi;
        } catch {
          return false;
        }
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      log: (line) => console.log(line),
    });

    // 업로드 — 실패하면 그 슬롯은 비움(호출은 이미 과금됐으므로 비용에는 남긴다)
    const stamp = Date.now();
    const uploaded = await Promise.all(
      results.map(async (r) => {
        if (!r.ok || !r.buffer) return { slot: r.slot, url: null as string | null };
        try {
          const png = await sharp(r.buffer).png().toBuffer();
          const storagePath = `${user.id}/scene-images/${stamp}-${r.slot}.png`;
          const { error } = await supabase.storage.from("images").upload(storagePath, png, { contentType: "image/png", upsert: true });
          if (error) {
            console.warn(`[scene-images] slot=${r.slot} 업로드 실패 → 슬롯 비움: ${error.message}`);
            return { slot: r.slot, url: null };
          }
          return { slot: r.slot, url: supabase.storage.from("images").getPublicUrl(storagePath).data.publicUrl };
        } catch (e) {
          console.warn(`[scene-images] slot=${r.slot} 이미지 처리 실패 → 슬롯 비움: ${e instanceof Error ? e.message : String(e)}`);
          return { slot: r.slot, url: null };
        }
      }),
    );
    const cost = sceneGenCostUsd(results);
    const sceneImages = sceneImageMapFrom(uploaded, plan.dims);
    const fatal = results.some((r) => r.fatal);
    if (fatal) console.error("[scene-images] 인증·결제 오류(401/402/403) — 슬롯 비움으로 진행");
    console.log(`[scene-images] done ok=${Object.keys(sceneImages).length}/${plan.slots.length} cost=$${cost.toFixed(3)} calls=${results.filter((r) => r.billed).length}`);
    return NextResponse.json({
      sceneImages,
      cost,
      stopped: fatal,
      log: results.map((r) => ({ slot: r.slot, ok: r.ok, seconds: +r.seconds.toFixed(1), retries: r.retries, billed: r.billed, reason: r.reason ?? null, format: r.format ?? null })),
    });
  } catch (error) {
    console.error("[scene-images]", error instanceof Error ? error.message : String(error));
    return empty("error");
  }
}
