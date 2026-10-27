import { getStorage } from "@/lib/storage";
import { CACHE_IMMUTABLE } from "@/lib/storage/policy";
import { NextResponse } from "next/server";
import { usageGate } from "@/lib/usage-guard-server";
import { USAGE_EST_COST_USD } from "@/lib/usage-guard";
import { createClient } from "@/lib/supabase/server";
import { generateSectionBackdropVariants } from "@/lib/photo-enhance";
import type { ConceptBrief } from "@/lib/concept-brief";
import type { CategoryTheme } from "@/lib/category-theme";
import {
  readSectionBackdropCache,
  writeSectionBackdropCache,
} from "@/lib/section-backdrop-cache";
import { isTestMode } from "@/lib/test-mode";
import { isForceRegenerate } from "@/lib/force-regenerate";
import type { ShadowAnalysis } from "@/lib/vision-utils";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 426차 R1: 일일 한도·킬 스위치(서버 강제, 한도 안이면 통과)
    const blocked = await usageGate(user.id, "photo", USAGE_EST_COST_USD.sectionBackdrops);
    if (blocked) return blocked;

    const userId = user.id;

    const body = (await request.json()) as {
      shadowAnalysis?: ShadowAnalysis;
      conceptBrief?: ConceptBrief;
      category?: string;
      theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">;
      draftToken?: string | null;
      productFormulation?: string | null;
    };

    const { shadowAnalysis, conceptBrief, category, theme, draftToken, productFormulation } =
      body;

    if (!shadowAnalysis) {
      return NextResponse.json({ error: "shadowAnalysis가 필요합니다." }, { status: 400 });
    }

    if (isTestMode() && !isForceRegenerate()) {
      const cached = readSectionBackdropCache();
      if (cached) {
        console.log("[section-backdrops] TEST_MODE — 디스크 캐시 사용 ($0, Replicate 미호출)");
        return NextResponse.json({
          ingredientUrl: cached.ingredientDataUrl,
          textureUrl: cached.textureDataUrl,
          cost: 0,
          fromCache: true,
        });
      }
    }

    if (
      !process.env.REPLICATE_API_TOKEN &&
      !process.env.FLUX_API_KEY &&
      !process.env.BFL_API_KEY
    ) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN 또는 FLUX_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    if (isForceRegenerate()) {
      console.log("[section-backdrops] FORCE_REGENERATE — flux-schnell ×2 새 생성");
    }

    const { ingredientUrl, textureUrl, cost } = await generateSectionBackdropVariants(
      shadowAnalysis,
      conceptBrief,
      category ?? "기타",
      theme,
      { userId, draftToken },
      productFormulation,
    );

    if (isTestMode() && ingredientUrl && textureUrl) {
      try {
        await writeSectionBackdropCache(ingredientUrl, textureUrl);
      } catch (error) {
        console.warn("[section-backdrops] TEST_MODE 캐시 저장 실패:", error);
      }
    }

    const stamp = Date.now();
    async function store(url: string | null, kind: string): Promise<string | null> {
      if (!url) return null;
      let fileBuffer: Buffer;
      if (url.startsWith("data:")) {
        const base64 = url.split(",")[1];
        if (!base64) return null;
        fileBuffer = Buffer.from(base64, "base64");
      } else {
        const response = await fetch(url);
        if (!response.ok) return url;
        fileBuffer = Buffer.from(await response.arrayBuffer());
      }
      const storagePath = `${userId}/section-backdrops/${stamp}-${kind}.png`;
      // 459차: lib/storage 경유. stamp가 요청마다 달라 경로가 고유 → 1년 immutable
      const storage = getStorage(supabase);
      const { error: uploadError } = await storage.putObject({
        path: storagePath,
        body: fileBuffer,
        contentType: "image/png",
        upsert: true,
        cacheControl: CACHE_IMMUTABLE,
      });
      if (uploadError) {
        console.warn("[section-backdrops] 업로드 실패, 원본 URL 유지:", uploadError.message);
        return url.startsWith("data:") ? null : url;
      }
      return storage.getPublicUrl(storagePath);
    }

    const [ingredient, texture] = await Promise.all([
      store(ingredientUrl, "ingredient"),
      store(textureUrl, "texture"),
    ]);

    return NextResponse.json({
      ingredientUrl: ingredient,
      textureUrl: texture,
      cost,
    });
  } catch (error) {
    console.error("[section-backdrops]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "섹션 배경 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
