import { getStorage } from "@/lib/storage";
import { CACHE_IMMUTABLE } from "@/lib/storage/policy";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { usageGate } from "@/lib/usage-guard-server";
import { USAGE_EST_COST_USD } from "@/lib/usage-guard";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { isTestMode } from "@/lib/test-mode";
import { isForceRegenerate } from "@/lib/force-regenerate";
import { STYLE_AUTO_ENABLED } from "@/lib/style-director";
import { beautyStyleOn } from "@/lib/beauty-style";
import {
  INFO_BACKDROP_RATIO_RANGE,
  infoBackdropCostUsd,
  infoBackdropMapFrom,
  planInfoBackdrops,
  runInfoBackdropPlan,
  type FetchBuffer,
  type InfoBackdropMap,
  type InfoZone,
} from "@/lib/info-backdrop";

const ZONES: readonly InfoZone[] = ["steps", "points", "stat", "compare", "care"];
const FASHION = "의류/패션";
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

/**
 * 417차 — 인포 구간 AI 배경(패션·bold/dramatic 자동 적용). 호출 계획·상한·폴백은 lib/info-backdrop.ts가 정한다.
 * 어떤 실패든 오류 없이 빈 맵(코드 배경)으로 응답한다(내부 로그만). 로그에 URL·키를 남기지 않는다.
 * 저장 위치는 섹션 배경과 같은 버킷·폴더(`<user>/section-backdrops/`).
 */
export async function POST(request: Request) {
  const empty = (skipped: string, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ infoBackdrops: {} as InfoBackdropMap, cost: 0, skipped, ...extra });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const body = (await request.json()) as {
      zones?: unknown;
      category?: unknown;
      material?: unknown;
      color?: unknown;
      mood?: unknown;
      productKey?: unknown;
    };
    // 424차 운영 킬 스위치: INFO_BACKDROPS_ENABLED=false면 인포 AI 배경을 만들지 않는다(코드 배경으로 진행, 비용 0)
    if (process.env.INFO_BACKDROPS_ENABLED === "false") return empty("disabled");
    const beauty = beautyStyleOn(typeof body.category === "string" ? body.category : null);
    if (!beauty && (body.category !== FASHION || !STYLE_AUTO_ENABLED)) return empty("not-eligible");
    const zones = Array.isArray(body.zones) ? ZONES.filter((z) => (body.zones as unknown[]).includes(z)) : [];
    if (zones.length === 0) return empty("no-zones");
    if (isTestMode() && !isForceRegenerate()) {
      console.log("[info-backdrops] TEST_MODE — 호출 생략($0)");
      return empty("test-mode");
    }
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return empty("no-token");

    const plan = planInfoBackdrops(zones);
    console.log(
      `[info-backdrops] plan zones=${plan.items.map((i) => i.zone).join(",") || "-"} estimate=$${plan.estimateUsd.toFixed(3)} fallback=${plan.fallbacks.map((f) => `${f.zone}:${f.reason}`).join(",") || "-"}`,
    );
    if (plan.items.length === 0) return empty("empty-plan");
    // 426차 R1: 실제 호출이 확정된 뒤에만 한도를 예약한다(대상 아님·TEST_MODE는 세지 않음)
    const blocked = await usageGate(user.id, "photo", USAGE_EST_COST_USD.infoBackdrops);
    if (blocked) return blocked;

    const replicate = new Replicate({ auth: token });
    const fetchBuffer: FetchBuffer = async (u) => {
      if (u.startsWith("data:")) {
        const b64 = u.split(",")[1];
        return b64 ? Buffer.from(b64, "base64") : null;
      }
      const r = await fetch(u);
      return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
    };
    const [lo, hi] = INFO_BACKDROP_RATIO_RANGE;
    const results = await runInfoBackdropPlan(
      plan,
      { material: clip(body.material, 400), color: clip(body.color, 400), mood: clip(body.mood, 400), category: beauty ? body.category as string : null },
      clip(body.productKey, 120) || "product",
      {
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
      },
    );

    // 업로드 — 실패하면 그 구간은 코드 배경(호출은 이미 과금됐으므로 비용에는 남긴다)
    const stamp = Date.now();
    const uploaded = await Promise.all(
      results.map(async (r) => {
        if (!r.ok || !r.buffer) return { zone: r.zone, ok: false, url: null as string | null };
        try {
          const png = await sharp(r.buffer).png().toBuffer();
          const storagePath = `${user.id}/section-backdrops/${stamp}-info-${r.zone}.png`;
          // 459차: lib/storage 경유. stamp가 요청마다 달라 경로가 고유 → 1년 immutable
          const storage = getStorage(supabase);
          const { error } = await storage.putObject({ path: storagePath, body: png, contentType: "image/png", upsert: true, cacheControl: CACHE_IMMUTABLE });
          if (error) {
            console.warn(`[info-backdrops] zone=${r.zone} 업로드 실패 → 폴백: ${error.message}`);
            return { zone: r.zone, ok: false, url: null };
          }
          return { zone: r.zone, ok: true, url: storage.getPublicUrl(storagePath) };
        } catch (e) {
          console.warn(`[info-backdrops] zone=${r.zone} 이미지 처리 실패 → 폴백: ${e instanceof Error ? e.message : String(e)}`);
          return { zone: r.zone, ok: false, url: null };
        }
      }),
    );
    const cost = infoBackdropCostUsd(results);
    const infoBackdrops = infoBackdropMapFrom(uploaded);
    const fatal = results.some((r) => r.fatal);
    if (fatal) console.error("[info-backdrops] 인증·결제 오류(401/402/403) — 이후 호출 중단, 코드 배경으로 진행");
    console.log(
      `[info-backdrops] done ok=${Object.keys(infoBackdrops).length}/${plan.items.length} cost=$${cost.toFixed(3)} calls=${results.filter((r) => r.billed).length}`,
    );
    return NextResponse.json({
      infoBackdrops,
      cost,
      stopped: fatal,
      log: results.map((r) => ({ zone: r.zone, model: r.kind, ok: r.ok, seconds: +r.seconds.toFixed(1), retries: r.retries, billed: r.billed, reason: r.reason ?? null, format: r.format ?? null })),
    });
  } catch (error) {
    console.error("[info-backdrops]", error instanceof Error ? error.message : String(error));
    return empty("error");
  }
}
