/**
 * 클라이언트 측 배경 생성·이미지 보정 파이프라인.
 * CreateProductForm(초안)에서는 쓰지 않고, draft 승인 시에만 호출한다.
 */

import { getCategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import type { PhotoCostBreakdown, ReferenceAnalysisInput } from "@/lib/types/generate";
import type { ShadowAnalysis } from "@/lib/vision-utils";

export type UploadedImage = {
  url: string;
  path: string;
};

export type BackdropGenerateResult = {
  backdropDataUrl?: string;
  candidateUrls?: string[];
  autoPicked?: boolean;
  cost: number;
  conceptBriefCost: number;
  backdropCost: number;
  claudeCost?: number;
  referenceAnalysisCost?: number;
  referenceAnalysis?: ReferenceAnalysisInput;
  testMode?: boolean;
  shadowAnalysis?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  /** bria-replace / bria-genfill 배경에는 원본 상품이 이미 합성돼 있음 (이중노출 방지용) */
  productAlreadyComposited?: boolean;
};

export async function generateBackdrop(params: {
  category: string;
  productName: string;
  brandName: string | null;
  imageUrls: string[];
  price?: number;
  keyFeatures?: string | null;
  ingredients?: string | null;
  targetCustomer?: string | null;
  referenceImageUrl?: string | null;
}): Promise<BackdropGenerateResult | null> {
  try {
    const response = await fetch("/api/generate-backdrop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: params.category,
        productName: params.productName,
        brandName: params.brandName,
        imageUrls: params.imageUrls,
        price: params.price,
        keyFeatures: params.keyFeatures ?? null,
        ingredients: params.ingredients ?? null,
        targetCustomer: params.targetCustomer ?? null,
        referenceImageUrl: params.referenceImageUrl ?? null,
      }),
    });

    const result = (await response.json()) as BackdropGenerateResult & { error?: string };

    if (!response.ok) {
      console.warn(
        "[generate-backdrop] 배경 생성 실패, 원본 이미지 사용:",
        result.error ?? "unknown",
      );
      return null;
    }

    const candidates = result.candidateUrls?.filter(Boolean) ?? [];
    if (!result.backdropDataUrl && candidates.length === 0) {
      console.warn("[generate-backdrop] 배경 후보가 없습니다.");
      return null;
    }

    return {
      backdropDataUrl: result.backdropDataUrl,
      candidateUrls: candidates,
      autoPicked: result.autoPicked ?? true,
      cost: result.cost ?? 0,
      conceptBriefCost: result.conceptBriefCost ?? 0,
      backdropCost: result.backdropCost ?? result.cost ?? 0,
      claudeCost: result.claudeCost ?? 0,
      referenceAnalysisCost: result.referenceAnalysisCost ?? 0,
      referenceAnalysis: result.referenceAnalysis,
      testMode: result.testMode ?? false,
      shadowAnalysis: result.shadowAnalysis,
      conceptBrief: result.conceptBrief,
      productAlreadyComposited: result.productAlreadyComposited ?? false,
    };
  } catch (err) {
    console.warn("[generate-backdrop] 배경 생성 실패, 원본 이미지 사용:", err);
    return null;
  }
}

export async function enhanceImages(params: {
  uploaded: UploadedImage[];
  heroBackdrop: string;
  shadowAnalysis?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  category?: string;
  productName?: string;
  sectionBackdrops?: { ingredientUrl?: string | null; textureUrl?: string | null };
  /** heroBackdrop(및 폴백되는 section backdrop)에 상품이 이미 합성돼 있는지 (이중노출 방지용) */
  backdropAlreadyComposited?: boolean;
}): Promise<{ images: UploadedImage[]; cost: number; decorCost: number; claudeCost: number }> {
  const {
    uploaded,
    heroBackdrop,
    shadowAnalysis,
    conceptBrief,
    category: productCategory,
    productName,
    sectionBackdrops,
    backdropAlreadyComposited,
  } = params;

  let totalCost = 0;
  let decorCost = 0;
  let claudeCost = 0;
  let decorDataUrl: string | undefined;
  const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
  const themeColors = categoryTheme
    ? {
        accent: categoryTheme.accent,
        baseNeutral: categoryTheme.baseNeutral,
        deepAccent: categoryTheme.deepAccent,
      }
    : undefined;
  const isBeauty = productCategory === "화장품/뷰티";
  const backdropByIndex = [
    heroBackdrop,
    sectionBackdrops?.ingredientUrl || heroBackdrop,
    sectionBackdrops?.textureUrl || heroBackdrop,
  ];

  async function enhanceOne(
    item: UploadedImage,
    backdropDataUrl: string,
    options: {
      applyDecor: boolean;
      keepOriginal?: boolean;
      pathSuffix?: string;
      reuseDecor?: boolean;
      backdropAlreadyComposited?: boolean;
    },
  ): Promise<UploadedImage | null> {
    const response = await fetch("/api/enhance-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: item.url,
        storagePath: item.path,
        backdropDataUrl,
        shadowAnalysis,
        conceptBrief,
        applyDecor: options.applyDecor,
        decorDataUrl: options.reuseDecor ? decorDataUrl : undefined,
        theme: themeColors,
        keepOriginal: options.keepOriginal,
        pathSuffix: options.pathSuffix,
        productName: productName || undefined,
        backdropAlreadyComposited: options.backdropAlreadyComposited ?? false,
      }),
    });

    const result = (await response.json()) as {
      enhancedUrl?: string;
      enhancedPath?: string;
      cost?: number;
      decorCost?: number;
      claudeCost?: number;
      decorDataUrl?: string;
      error?: string;
    };

    if (!response.ok || !result.enhancedUrl || !result.enhancedPath) {
      console.warn("[enhance-image] 보정 실패, 원본 사용:", result.error ?? item.path);
      return null;
    }

    totalCost += result.cost ?? 0;
    decorCost += result.decorCost ?? 0;
    claudeCost += result.claudeCost ?? 0;
    if (result.decorDataUrl) {
      decorDataUrl = result.decorDataUrl;
    }
    return { url: result.enhancedUrl, path: result.enhancedPath };
  }

  const extras: UploadedImage[] = [];
  if (isBeauty) {
    if (uploaded.length < 2 && sectionBackdrops?.ingredientUrl) {
      try {
        const extra = await enhanceOne(uploaded[0], sectionBackdrops.ingredientUrl, {
          applyDecor: false,
          keepOriginal: true,
          pathSuffix: "ingredient",
        });
        if (extra) extras.push(extra);
      } catch (err) {
        console.warn("[enhance-image] 성분 배경 추가 합성 실패:", err);
      }
    }
    if (uploaded.length + extras.length < 3 && sectionBackdrops?.textureUrl) {
      try {
        const extra = await enhanceOne(uploaded[0], sectionBackdrops.textureUrl, {
          applyDecor: false,
          keepOriginal: true,
          pathSuffix: "texture",
        });
        if (extra) extras.push(extra);
      } catch (err) {
        console.warn("[enhance-image] 텍스처 배경 추가 합성 실패:", err);
      }
    }
  }

  const results: UploadedImage[] = [];
  for (let index = 0; index < uploaded.length; index++) {
    const item = uploaded[index];
    const isHero = index === 0;
    const resolvedBackdrop = backdropByIndex[index] ?? heroBackdrop;
    try {
      const enhanced = await enhanceOne(item, resolvedBackdrop, {
        applyDecor: isHero,
        reuseDecor: !isHero,
        pathSuffix: "enhanced",
        // section backdrop(ingredient/texture)이 실제로 쓰인 경우가 아니라
        // heroBackdrop으로 폴백된 경우에만 "이미 상품이 합성됨" 플래그를 넘긴다.
        backdropAlreadyComposited: resolvedBackdrop === heroBackdrop ? backdropAlreadyComposited : false,
      });
      results.push(enhanced ?? item);
    } catch (err) {
      console.warn("[enhance-image] 보정 실패, 원본 사용:", item.path, err);
      results.push(item);
    }
  }

  return { images: [...results, ...extras], cost: totalCost, decorCost, claudeCost };
}

export type PhotoPipelineProgress = "backdrop" | "enhancing";

/**
 * 배경 후보 선택 → (선택) 섹션 배경 → enhanceImages 일괄 실행.
 * pickBackdrop: 후보가 2장 이상일 때 사용자 선택 대기.
 */
export async function runPhotoEnhancementPipeline(params: {
  uploaded: UploadedImage[];
  category: string;
  productName: string;
  brandName: string | null;
  price: number;
  keyFeatures?: string | null;
  ingredients?: string | null;
  targetCustomer?: string | null;
  referenceImageUrl?: string | null;
  pickBackdrop: (urls: string[]) => Promise<string>;
  onStage?: (stage: PhotoPipelineProgress) => void;
}): Promise<{
  images: UploadedImage[];
  photoProcessingCost: number;
  photoCostBreakdown: PhotoCostBreakdown;
  conceptBrief?: ConceptBrief;
  referenceAnalysis?: ReferenceAnalysisInput;
  testMode: boolean;
} | null> {
  const { uploaded, onStage, pickBackdrop } = params;
  onStage?.("backdrop");

  const backdropResult = await generateBackdrop({
    category: params.category,
    productName: params.productName,
    brandName: params.brandName,
    imageUrls: uploaded.map((item) => item.url),
    price: params.price,
    keyFeatures: params.keyFeatures,
    ingredients: params.ingredients,
    targetCustomer: params.targetCustomer,
    referenceImageUrl: params.referenceImageUrl,
  });

  if (!backdropResult) {
    return {
      images: uploaded,
      photoProcessingCost: 0,
      photoCostBreakdown: {},
      testMode: false,
    };
  }

  let photoProcessingCost = backdropResult.cost;
  let photoCostBreakdown: PhotoCostBreakdown = {
    conceptBrief: backdropResult.conceptBriefCost,
    backdrop: backdropResult.backdropCost,
    claude: backdropResult.claudeCost ?? 0,
    referenceAnalysis: backdropResult.referenceAnalysisCost ?? 0,
  };

  let chosenBackdrop = backdropResult.backdropDataUrl;
  const candidates = backdropResult.candidateUrls ?? [];
  const testMode = backdropResult.testMode ?? false;

  if (!testMode && candidates.length > 1) {
    chosenBackdrop = await pickBackdrop(candidates);
  } else if (candidates.length >= 1) {
    chosenBackdrop = candidates[0];
  }

  if (!chosenBackdrop) {
    throw new Error("배경이 선택되지 않았습니다.");
  }

  let sectionBackdrops: { ingredientUrl?: string | null; textureUrl?: string | null } | undefined;
  if (backdropResult.shadowAnalysis && uploaded.length >= 2) {
    try {
      const sectionRes = await fetch("/api/section-backdrops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shadowAnalysis: backdropResult.shadowAnalysis,
          conceptBrief: backdropResult.conceptBrief,
          category: params.category,
        }),
      });
      const sectionJson = (await sectionRes.json()) as {
        ingredientUrl?: string | null;
        textureUrl?: string | null;
        cost?: number;
        error?: string;
      };
      if (sectionRes.ok) {
        sectionBackdrops = {
          ingredientUrl: sectionJson.ingredientUrl,
          textureUrl: sectionJson.textureUrl,
        };
        photoProcessingCost += sectionJson.cost ?? 0;
        photoCostBreakdown = {
          ...photoCostBreakdown,
          sectionBackdrops: sectionJson.cost ?? 0,
        };
      } else {
        console.warn("[section-backdrops] 생략:", sectionJson.error);
      }
    } catch (err) {
      console.warn("[section-backdrops] 생략:", err);
    }
  }

  onStage?.("enhancing");
  const enhanced = await enhanceImages({
    uploaded,
    heroBackdrop: chosenBackdrop,
    shadowAnalysis: backdropResult.shadowAnalysis,
    conceptBrief: backdropResult.conceptBrief,
    category: params.category,
    productName: params.productName,
    sectionBackdrops,
    backdropAlreadyComposited: backdropResult.productAlreadyComposited ?? false,
  });

  photoProcessingCost += enhanced.cost;
  photoCostBreakdown = {
    ...photoCostBreakdown,
    enhance: enhanced.cost - enhanced.decorCost,
    decor: enhanced.decorCost,
    claude: (photoCostBreakdown.claude ?? 0) + enhanced.claudeCost,
  };

  return {
    images: enhanced.images,
    photoProcessingCost,
    photoCostBreakdown,
    conceptBrief: backdropResult.conceptBrief,
    referenceAnalysis: backdropResult.referenceAnalysis,
    testMode,
  };
}
