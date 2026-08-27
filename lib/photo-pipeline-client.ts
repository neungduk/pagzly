/**
 * 클라이언트 측 배경 생성·이미지 보정 파이프라인.
 * CreateProductForm(초안)에서는 쓰지 않고, draft 승인 시에만 호출한다.
 */

import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import type { PhotoCostBreakdown, ReferenceAnalysisInput } from "@/lib/types/generate";
import type { ShadowAnalysis } from "@/lib/vision-utils";

export type UploadedImage = {
  url: string;
  path: string;
};

export const SOURCE_IMAGE_EXPIRED = "SOURCE_IMAGE_EXPIRED";

export class SourceImageExpiredError extends Error {
  readonly code = SOURCE_IMAGE_EXPIRED;
  constructor(message = "사진 세션이 만료되었습니다. 사진을 다시 업로드해 주세요.") {
    super(message);
    this.name = "SourceImageExpiredError";
  }
}

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
  /** generate-backdrop에서 추출한 상품 테마 — section-backdrops 톤 주입용 */
  theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent">;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 일시 실패 대비 1~2회 재시도. 전부 실패하면 null + 명시 로그. */
async function withBackoffRetry<T>(
  label: string,
  run: () => Promise<T | null>,
  maxAttempts = 2,
): Promise<T | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await run();
      if (result != null) return result;
      console.warn(`[${label}] attempt ${attempt}/${maxAttempts} returned null`);
    } catch (err) {
      if (err instanceof SourceImageExpiredError) throw err;
      lastError = err;
      console.warn(`[${label}] attempt ${attempt}/${maxAttempts} failed:`, err);
    }
    if (attempt < maxAttempts) {
      await sleep(400 * attempt);
    }
  }
  console.error(
    `[${label}] FALLBACK: all ${maxAttempts} attempts failed` +
      (lastError != null ? ` — last error: ${String(lastError)}` : ""),
  );
  return null;
}

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
  return withBackoffRetry("generate-backdrop", async () => {
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

    const result = (await response.json()) as BackdropGenerateResult & {
      error?: string;
      code?: string;
    };

    if (!response.ok) {
      if (result.code === SOURCE_IMAGE_EXPIRED || response.status === 410) {
        throw new SourceImageExpiredError(
          result.error ?? "사진 세션이 만료되었습니다. 사진을 다시 업로드해 주세요.",
        );
      }
      console.warn(
        "[generate-backdrop] API error:",
        result.error ?? response.status,
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
  });
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
  /**
   * 상품 사진에서 추출한 실제 테마 (backdropResult.theme, 21차 신규). 있으면
   * 카테고리 고정 팔레트 대신 이 값을 장식 그래픽(generateDecorativeGraphic)에
   * 쓴다 — 22차: 배경은 이미 이 값을 쓰고 있었는데 장식만 카테고리 기본값에
   * 남아 있던 불일치를 해소.
   */
  theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent"> | null;
  onProgress?: (event: PhotoPipelineProgressEvent) => void;
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
    theme: productTheme,
    onProgress,
  } = params;

  let totalCost = 0;
  let decorCost = 0;
  let claudeCost = 0;
  let decorDataUrl: string | undefined;
  // 22차: 상품별 추출 테마(productTheme)를 우선 사용, 없으면(추출 실패 등) 기존처럼
  // 카테고리 고정 팔레트로 폴백 — hero/섹션 배경이 이미 쓰고 있는 값과 동일한 우선순위.
  const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
  const themeColors = productTheme
    ? {
        accent: productTheme.accent,
        baseNeutral: productTheme.baseNeutral,
        deepAccent: productTheme.deepAccent,
      }
    : categoryTheme
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

  async function enhanceOneOnce(
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
      console.warn("[enhance-image] API 실패:", result.error ?? item.path);
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
    return withBackoffRetry(`enhance-image:${item.path}`, () =>
      enhanceOneOnce(item, backdropDataUrl, options),
    );
  }

  const totalEnhanceSteps = uploaded.length + (isBeauty ? 2 : 0);
  let enhanceStep = 0;

  function reportEnhance(label: string, current: number, total: number) {
    onProgress?.({
      stage: "enhancing",
      detail: label,
      current,
      total,
    });
  }

  const extras: UploadedImage[] = [];
  if (isBeauty) {
    if (uploaded.length < 2 && sectionBackdrops?.ingredientUrl) {
      enhanceStep += 1;
      reportEnhance("성분 배경 합성", enhanceStep, totalEnhanceSteps);
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
      enhanceStep += 1;
      reportEnhance("텍스처 배경 합성", enhanceStep, totalEnhanceSteps);
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
  // 비히어로는 빈 section backdrop만 사용. 합성된 hero를 슬롯 3/6/9에 재쓰면
  // rembg가 스킵되며 손·어두운 플레이트가 복제된다 (전자제품 Pexels 라이프스타일샷에서 특히).
  const sectionPool = [
    sectionBackdrops?.ingredientUrl,
    sectionBackdrops?.textureUrl,
  ].filter((u): u is string => Boolean(u) && u !== heroBackdrop);
  const backdropSlotLabels = ["hero", "ingredient", "texture"] as const;
  for (let index = 0; index < uploaded.length; index++) {
    enhanceStep += 1;
    reportEnhance(`사진 보정 ${index + 1}/${uploaded.length}`, enhanceStep, totalEnhanceSteps);
    const item = uploaded[index];
    const isHero = index === 0;
    let resolvedBackdrop: string;
    let backdropLabel: string;
    if (isHero) {
      resolvedBackdrop = heroBackdrop;
      backdropLabel = "hero";
    } else if (sectionPool.length > 0) {
      const slotIndex = (index - 1) % sectionPool.length;
      resolvedBackdrop = sectionPool[slotIndex]!;
      backdropLabel = slotIndex === 0 ? "ingredient" : "texture";
    } else {
      // section 배경이 없으면 예전 라운드로빈 유지하되, 합성 hero 재사용 플래그는 끈다
      const slotIndex = index % backdropByIndex.length;
      resolvedBackdrop = backdropByIndex[slotIndex] ?? heroBackdrop;
      backdropLabel = `${backdropSlotLabels[slotIndex] ?? "hero"}-empty-fallback`;
    }
    console.log(`[enhance] idx=${index} backdrop=${backdropLabel}`);
    try {
      const enhanced = await enhanceOne(item, resolvedBackdrop, {
        applyDecor: isHero,
        reuseDecor: !isHero,
        pathSuffix: "enhanced",
        // 합성본(hero) 스킵은 히어로 슬롯(index===0)에만. 그 외는 항상 rembg 합성.
        backdropAlreadyComposited: isHero ? backdropAlreadyComposited : false,
      });
      if (!enhanced) {
        console.error(
          `[enhance-image] FALLBACK: slot ${index} 원본 유지 — ${item.path}`,
        );
      }
      results.push(enhanced ?? item);
    } catch (err) {
      console.error("[enhance-image] FALLBACK: 보정 예외, 원본 사용:", item.path, err);
      results.push(item);
    }
  }

  return { images: [...results, ...extras], cost: totalCost, decorCost, claudeCost };
}

export type PhotoPipelineStage = "backdrop" | "sections" | "enhancing";

export type PhotoPipelineProgressEvent = {
  stage: PhotoPipelineStage | "generating";
  detail?: string;
  current?: number;
  total?: number;
  elapsedMs?: number;
  costUsdSoFar?: number;
  retrying?: boolean;
  warning?: string;
};

/** @deprecated — use PhotoPipelineProgressEvent */
export type PhotoPipelineProgress = PhotoPipelineStage;

export type PhotoPipelineProgressCallback = (event: PhotoPipelineProgressEvent) => void;

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
  draftToken?: string | null;
  pickBackdrop: (urls: string[]) => Promise<string>;
  onStage?: PhotoPipelineProgressCallback;
}): Promise<{
  images: UploadedImage[];
  photoProcessingCost: number;
  photoCostBreakdown: PhotoCostBreakdown;
  conceptBrief?: ConceptBrief;
  referenceAnalysis?: ReferenceAnalysisInput;
  testMode: boolean;
  /** 히어로 배경 실패로 enhance를 건너뛴 경우 */
  backdropFailed?: boolean;
  warning?: string;
}> {
  const { uploaded, onStage, pickBackdrop } = params;
  const pipelineStartedAt = Date.now();

  const emit = (event: Omit<PhotoPipelineProgressEvent, "elapsedMs">) => {
    onStage?.({
      ...event,
      elapsedMs: Date.now() - pipelineStartedAt,
    });
  };

  emit({ stage: "backdrop", detail: "히어로 배경 생성 중" });

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
    // 히어로 배경 실패 ≠ 전체 파이프라인 포기.
    // 원본으로 상세 조립은 계속하고, UI에서 재시도 유도.
    console.error(
      "[pipeline] hero backdrop FAILED — isolating: skip enhance, continue with originals",
    );
    return {
      images: uploaded,
      photoProcessingCost: 0,
      photoCostBreakdown: {},
      testMode: false,
      backdropFailed: true,
      warning:
        "배경 생성에 실패해 원본 사진으로 상세를 구성했습니다. 사진 보정만 다시 시도할 수 있습니다.",
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

  emit({
    stage: "backdrop",
    detail:
      candidates.length > 1
        ? `배경 후보 ${candidates.length}장 — 선택 대기`
        : `배경 후보 ${Math.max(candidates.length, 1)}장 준비`,
    costUsdSoFar: photoProcessingCost,
  });

  if (!testMode && candidates.length > 1) {
    chosenBackdrop = await pickBackdrop(candidates);
  } else if (candidates.length >= 1) {
    chosenBackdrop = candidates[0];
  }

  if (!chosenBackdrop) {
    console.error(
      "[pipeline] no chosen backdrop — isolating: skip enhance, continue with originals",
    );
    return {
      images: uploaded,
      photoProcessingCost: photoProcessingCost,
      photoCostBreakdown,
      conceptBrief: backdropResult.conceptBrief,
      referenceAnalysis: backdropResult.referenceAnalysis,
      testMode,
      backdropFailed: true,
      warning:
        "배경이 선택되지 않아 원본 사진으로 상세를 구성했습니다.",
    };
  }

  let sectionBackdrops: { ingredientUrl?: string | null; textureUrl?: string | null } | undefined;
  // 사진 1장이어도 섹션별 배경을 생성해 히어로와 동일 배경 반복을 피한다.
  // TEST_MODE에서는 section-backdrops API가 디스크 캐시를 쓰므로 비용 캡이 유지된다.
  if (backdropResult.shadowAnalysis && uploaded.length >= 1) {
    emit({ stage: "sections", detail: "섹션 배경 생성 중", costUsdSoFar: photoProcessingCost });
    try {
      const sectionRes = await fetch("/api/section-backdrops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shadowAnalysis: backdropResult.shadowAnalysis,
          conceptBrief: backdropResult.conceptBrief,
          category: params.category,
          theme: backdropResult.theme,
          draftToken: params.draftToken ?? null,
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
        emit({
          stage: "sections",
          detail: "섹션 배경 완료",
          costUsdSoFar: photoProcessingCost,
        });
      } else {
        console.warn("[section-backdrops] 생략:", sectionJson.error);
        emit({
          stage: "sections",
          detail: "섹션 배경 생략",
          warning: sectionJson.error,
          costUsdSoFar: photoProcessingCost,
        });
      }
    } catch (err) {
      console.warn("[section-backdrops] 생략:", err);
      emit({
        stage: "sections",
        detail: "섹션 배경 생략",
        warning: err instanceof Error ? err.message : String(err),
        costUsdSoFar: photoProcessingCost,
      });
    }
  }

  emit({
    stage: "enhancing",
    detail: "사진 보정 시작",
    current: 0,
    total: uploaded.length,
    costUsdSoFar: photoProcessingCost,
  });

  const enhanced = await enhanceImages({
    uploaded,
    heroBackdrop: chosenBackdrop,
    shadowAnalysis: backdropResult.shadowAnalysis,
    conceptBrief: backdropResult.conceptBrief,
    category: params.category,
    productName: params.productName,
    sectionBackdrops,
    backdropAlreadyComposited: backdropResult.productAlreadyComposited ?? false,
    theme: backdropResult.theme,
    onProgress: (event) => emit({ ...event, costUsdSoFar: photoProcessingCost }),
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
