import { getStorage } from "@/lib/storage";
import { CACHE_IMMUTABLE } from "@/lib/storage/policy";
import { NextResponse } from "next/server";
import { usageGate } from "@/lib/usage-guard-server";
import { USAGE_EST_COST_USD } from "@/lib/usage-guard";
import { createClient } from "@/lib/supabase/server";
import {
  generateBackdrop,
  generateBackdropViaBria,
  generateBackdropViaBriaGenFill,
  generateBackdropViaNanoBanana,
  generateBackdropViaFluxKontext,
  getBackdropProvider,
} from "@/lib/photo-enhance";
import { extractProductTheme } from "@/lib/color-extract";
import { getCategoryTheme } from "@/lib/category-theme";
import { generateConceptBrief } from "@/lib/concept-brief";
import { fetchFileBuffer } from "@/lib/fetch-file-buffer";
import { analyzeReferenceImage } from "@/lib/reference-analysis";
import { isTestMode } from "@/lib/test-mode";
import { logForceRegenerateStatus } from "@/lib/force-regenerate";
import {
  analyzeShadowDirection,
  DEFAULT_SHADOW,
  type ShadowAnalysis,
} from "@/lib/vision-utils";
import { resetCostLogTallies } from "@/lib/cost-log-tally";

const SOURCE_IMAGE_EXPIRED = "SOURCE_IMAGE_EXPIRED";

/** 히어로 원본이 스토리지에서 사라졌는지 사전 확인 (Replicate 400 전에 차단). */
async function probeSourceImage(url: string): Promise<"ok" | "missing" | "unreachable"> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (head.ok) return "ok";
    if (head.status === 404 || head.status === 400) return "missing";

    // 일부 CDN/스토리지는 HEAD를 거부 → 1바이트 Range GET으로 재확인
    const ranged = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
    });
    if (ranged.ok || ranged.status === 206) return "ok";
    if (ranged.status === 404 || ranged.status === 400) return "missing";
    // 본문이 JSON not_found 인 경우 (Supabase public object)
    if (ranged.status >= 400) {
      const text = await ranged.text().catch(() => "");
      if (/not_found|NoSuchKey|Object not found/i.test(text)) return "missing";
    }
    return "unreachable";
  } catch {
    return "unreachable";
  }
}

export async function POST(request: Request) {
  try {
    logForceRegenerateStatus();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 426차 R1: 일일 한도·킬 스위치(서버 강제, 한도 안이면 통과)
    const blocked = await usageGate(user.id, "photo", USAGE_EST_COST_USD.generateBackdrop);
    if (blocked) return blocked;

    // 130차 — 이어지는 enhance 배치의 [cost] 집계 기준점
    resetCostLogTallies();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const {
      category,
      productName,
      brandName,
      imageUrls,
      price,
      keyFeatures,
      ingredients,
      targetCustomer,
      referenceImageUrl,
      skipBackdropImage,
    } = (await request.json()) as {
      /** 405차 — true면 배경 이미지 생성만 건너뛰고 conceptBrief·theme·shadowAnalysis는 그대로 돌려준다(기본 false) */
      skipBackdropImage?: boolean;
      category?: string;
      productName?: string;
      brandName?: string | null;
      imageUrls?: string[];
      price?: number;
      keyFeatures?: string | null;
      ingredients?: string | null;
      targetCustomer?: string | null;
      referenceImageUrl?: string | null;
    };

    if (!category || !productName) {
      return NextResponse.json(
        { error: "category, productName이 필요합니다." },
        { status: 400 },
      );
    }

    const sourceUrl = imageUrls?.[0];
    if (sourceUrl) {
      const probe = await probeSourceImage(sourceUrl);
      if (probe === "missing") {
        console.error("[generate-backdrop] SOURCE_IMAGE_EXPIRED:", sourceUrl);
        return NextResponse.json(
          {
            error:
              "사진 세션이 만료되었습니다. 사진을 다시 업로드해 주세요.",
            code: SOURCE_IMAGE_EXPIRED,
          },
          { status: 410 },
        );
      }
    }

    // 배경 생성 프롬프트에 상품 고유 색감을 반영하기 위해, 업로드된 원본
    // 사진에서 먼저 색을 뽑아본다. 실패(무채색 상품, 사진 없음 등)하면
    // 카테고리 기본 테마로 폴백 — 배경 생성 자체를 막지 않는다.
    let referenceAnalysis: { colorHex: string[]; moodKeywords: string[] } | undefined;
    let referenceAnalysisCost = 0;
    if (referenceImageUrl) {
      try {
        const buf = await fetchFileBuffer(referenceImageUrl);
        const mediaType = referenceImageUrl.toLowerCase().includes(".png")
          ? ("image/png" as const)
          : ("image/jpeg" as const);
        const result = await analyzeReferenceImage(buf, mediaType);
        referenceAnalysis = {
          colorHex: result.colorHex,
          moodKeywords: result.moodKeywords,
        };
        referenceAnalysisCost = result.cost;
      } catch (err) {
        console.warn("[generate-backdrop] reference-analysis 실패", err);
      }
    }

    const { brief: conceptBrief, cost: conceptBriefCost } = await generateConceptBrief({
      category,
      productName,
      brandName: brandName ?? null,
      price,
      keyFeatures: keyFeatures ?? null,
      ingredients: ingredients ?? null,
      targetCustomer: targetCustomer ?? null,
      referenceAnalysis,
    });

    let theme = getCategoryTheme(category);
    if (imageUrls?.length) {
      try {
        const extracted = await extractProductTheme(imageUrls);
        if (extracted) theme = { ...theme, ...extracted };
      } catch (err) {
        console.warn("[generate-backdrop] 색상 추출 실패, 카테고리 기본 테마로 폴백", err);
      }
    }

    const provider = getBackdropProvider(category);
    console.log(`[generate-backdrop] BACKDROP_PROVIDER=${provider}`);

    let heroShadow: ShadowAnalysis = { ...DEFAULT_SHADOW };
    let heroShadowCost = 0;
    if (imageUrls?.[0]) {
      try {
        const heroBuffer = await fetchFileBuffer(imageUrls[0]);
        const heroResult = await analyzeShadowDirection(heroBuffer);
        heroShadow = heroResult.shadow;
        heroShadowCost = heroResult.cost;
        console.log(`[generate-backdrop] 히어로 조명 1회 분석: ${heroShadow.promptHint}`);
      } catch (err) {
        console.warn("[generate-backdrop] 히어로 조명 분석 실패 — DEFAULT_SHADOW", err);
      }
    }

    const backdropArgs = [
      category,
      productName,
      brandName ?? null,
      theme,
      imageUrls?.[0],
      conceptBrief,
      heroShadow,
    ] as const;
    // 405차 — 패션 히어로가 원본이면 배경 후보 이미지는 어디에도 쓰이지 않는다. 생성 함수들은 shadow로
    // 넘겨받은 heroShadow를 그대로 돌려주므로(resolveShadowForBackdrop), 건너뛰어도 shadowAnalysis는 같다.
    const skipped = skipBackdropImage === true;
    if (skipped) console.log("[generate-backdrop] 배경 이미지 생성 건너뜀(패션 히어로 원본) — conceptBrief·theme·shadow만 반환");
    const { buffer, candidateUrls, cost: backdropCost, shadow, claudeCost, autoPicked } = skipped
      ? { buffer: undefined, candidateUrls: [] as string[], cost: 0, shadow: heroShadow, claudeCost: 0, autoPicked: true }
      : provider === "bria-replace"
        ? await generateBackdropViaBria(...backdropArgs)
        : provider === "bria-genfill"
          ? await generateBackdropViaBriaGenFill(...backdropArgs)
          : provider === "nano-banana"
            ? await generateBackdropViaNanoBanana(...backdropArgs)
            : provider === "flux-kontext-pro"
              ? await generateBackdropViaFluxKontext(...backdropArgs)
              : await generateBackdrop(...backdropArgs);

    let backdropDataUrl: string | undefined;
    if (buffer) {
      backdropDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    }

    let storedCandidateUrls = candidateUrls;
    if (candidateUrls.length > 0) {
      storedCandidateUrls = [];
      const stamp = Date.now();
      for (let i = 0; i < candidateUrls.length; i += 1) {
        const response = await fetch(candidateUrls[i]);
        if (!response.ok) continue;
        const fileBuffer = Buffer.from(await response.arrayBuffer());
        const path = `${user.id}/backdrop-candidates/${stamp}-${i}.png`;
        // 459차: lib/storage 경유. stamp가 요청마다 달라 경로가 고유 → 1년 immutable
        const storage = getStorage(supabase);
        const { error: uploadError } = await storage.putObject({
          path,
          body: fileBuffer,
          contentType: "image/png",
          upsert: true,
          cacheControl: CACHE_IMMUTABLE,
        });
        if (uploadError) {
          console.warn("[generate-backdrop] 후보 업로드 실패, 원본 URL 유지:", uploadError.message);
          storedCandidateUrls.push(candidateUrls[i]);
          continue;
        }
        storedCandidateUrls.push(storage.getPublicUrl(path));
      }
    }

    return NextResponse.json({
      backdropDataUrl,
      candidateUrls: storedCandidateUrls,
      // flux 외(bria / nano-banana / flux-kontext-pro)는 원본 상품이 이미 합성돼 있음
      productAlreadyComposited: !skipped && provider !== "flux",
      backdropSkipped: skipped,
      autoPicked,
      cost: backdropCost + conceptBriefCost + referenceAnalysisCost,
      conceptBriefCost,
      backdropCost,
      claudeCost: (claudeCost ?? 0) + referenceAnalysisCost + heroShadowCost,
      referenceAnalysis,
      referenceAnalysisCost,
      shadowAnalysis: shadow,
      conceptBrief,
      theme,
      testMode: isTestMode(),
    });
  } catch (error) {
    console.error("[generate-backdrop]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "배경 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
