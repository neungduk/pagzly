import { NextResponse } from "next/server";
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

    const userId = user.id;

    const { shadowAnalysis, conceptBrief, category, theme } = (await request.json()) as {
      shadowAnalysis?: ShadowAnalysis;
      conceptBrief?: ConceptBrief;
      category?: string;
      theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">;
    };

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

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN이 설정되지 않았습니다." },
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
      const response = await fetch(url);
      if (!response.ok) return url;
      const fileBuffer = Buffer.from(await response.arrayBuffer());
      const storagePath = `${userId}/section-backdrops/${stamp}-${kind}.png`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(storagePath, fileBuffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (uploadError) {
        console.warn("[section-backdrops] 업로드 실패, 원본 URL 유지:", uploadError.message);
        return url;
      }
      const { data } = supabase.storage.from("images").getPublicUrl(storagePath);
      return data.publicUrl;
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
