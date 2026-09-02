import { NextResponse } from "next/server";
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
    } = (await request.json()) as {
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
    const { buffer, candidateUrls, cost: backdropCost, shadow, claudeCost, autoPicked } =
      provider === "bria-replace"
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
        const { error: uploadError } = await supabase.storage.from("images").upload(path, fileBuffer, {
          contentType: "image/png",
          upsert: true,
        });
        if (uploadError) {
          console.warn("[generate-backdrop] 후보 업로드 실패, 원본 URL 유지:", uploadError.message);
          storedCandidateUrls.push(candidateUrls[i]);
          continue;
        }
        const { data: publicData } = supabase.storage.from("images").getPublicUrl(path);
        storedCandidateUrls.push(publicData.publicUrl);
      }
    }

    return NextResponse.json({
      backdropDataUrl,
      candidateUrls: storedCandidateUrls,
      // flux 외(bria / nano-banana / flux-kontext-pro)는 원본 상품이 이미 합성돼 있음
      productAlreadyComposited: provider !== "flux",
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
