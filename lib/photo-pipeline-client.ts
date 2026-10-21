/**
 * 클라이언트 측 배경 생성·이미지 보정 파이프라인.
 * CreateProductForm(초안)에서는 쓰지 않고, draft 승인 시에만 호출한다.
 */

import { INFO_BACKDROP_EXTRA_WAIT_MS, type InfoBackdropMap, type InfoZone } from "@/lib/info-backdrop";
import { SCENE_GEN_EXTRA_WAIT_MS, applySceneCost } from "@/lib/scene-image-gen";
import { normalizeSceneImages, type SceneImageMap } from "@/lib/scene-images";
import { getCategoryTheme, type CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { buildLifestyleCompositeRequestBody } from "@/lib/lifestyle-composite-request";
import { computeStudioCompositeLimit } from "@/lib/lifestyle-shot-planner";
import { isHeroKeptOriginal, planStudioComposite, shouldSkipBackdropImage } from "@/lib/fashion-composite-policy";
import { getLifestyleShotConfig } from "@/lib/lifestyle-shot-config";
import type { ProductImageOrigin } from "@/lib/image-origins";
import type { PhotoCostBreakdown, ReferenceAnalysisInput } from "@/lib/types/generate";
import { extractCosmeticsFormulation } from "@/lib/cosmetics-texture-swatch";
import type { ShadowAnalysis } from "@/lib/vision-utils";

export type UploadedImage = {
  url: string;
  path: string;
  origin?: ProductImageOrigin;
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
  /** 405차 — 서버가 배경 이미지 생성을 건너뜀(skipBackdropImage 요청에 대한 확인) */
  backdropSkipped?: boolean;
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
  /** 405차 — true면 서버가 배경 이미지 생성만 건너뛴다(패션 히어로 원본). 후보 0장이 정상이다 */
  skipBackdropImage?: boolean;
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
        skipBackdropImage: params.skipBackdropImage === true,
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
    if (!result.backdropDataUrl && candidates.length === 0 && !(params.skipBackdropImage && result.backdropSkipped)) {
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
      // 419차 — 상품 사진에서 뽑은 테마를 버리지 않는다(406차 제안서 4절). 섹션 배경·합성 장식 색에 전달된다
      theme: result.theme,
      productAlreadyComposited: result.productAlreadyComposited ?? false,
      backdropSkipped: result.backdropSkipped === true,
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
  /** 404차 — 사진별 역할(uploaded와 같은 순서). 패션 착장·코디는 합성하지 않고 원본을 쓴다 */
  imageRoles?: readonly string[];
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
    imageRoles,
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
    return {
      url: result.enhancedUrl,
      path: result.enhancedPath,
      origin: "enhanced" as const,
    };
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
    // 100차 — 업로드가 많아도 성분/텍스처 파생을 최소 1장씩 확보.
    // 101차 — 실패 시 원본 URL을 복제해 넣지 않음(같은 URL 3회 저장 방지). 성공분만 extras.
    if (sectionBackdrops?.ingredientUrl) {
      enhanceStep += 1;
      reportEnhance("성분 배경 합성", enhanceStep, totalEnhanceSteps);
      try {
        const extra = await enhanceOne(uploaded[0], sectionBackdrops.ingredientUrl, {
          applyDecor: false,
          keepOriginal: true,
          pathSuffix: "ingredient",
        });
        if (extra) extras.push(extra);
        else console.warn("[enhance-image] ingredient extra 실패 — 원본 복제하지 않음");
      } catch (err) {
        console.warn("[enhance-image] 성분 배경 추가 합성 실패:", err);
      }
    }
    if (sectionBackdrops?.textureUrl) {
      enhanceStep += 1;
      reportEnhance("텍스처 배경 합성", enhanceStep, totalEnhanceSteps);
      try {
        const source = uploaded[Math.min(1, uploaded.length - 1)] ?? uploaded[0];
        const extra = await enhanceOne(source, sectionBackdrops.textureUrl, {
          applyDecor: false,
          keepOriginal: true,
          pathSuffix: "texture",
        });
        if (extra) extras.push(extra);
        else console.warn("[enhance-image] texture extra 실패 — 원본 복제하지 않음");
      } catch (err) {
        console.warn("[enhance-image] 텍스처 배경 추가 합성 실패:", err);
      }
    }
  }

  const studioCompositeLimit = computeStudioCompositeLimit(uploaded.length);
  const studioPassthrough = Math.max(0, uploaded.length - studioCompositeLimit);
  const compositePlan = planStudioComposite({
    category: productCategory,
    roles: imageRoles,
    count: uploaded.length,
    studioLimit: studioCompositeLimit,
  });
  console.log(
    `[photo-pipeline] studioLimit=${studioCompositeLimit} uploaded=${uploaded.length} passthrough=${studioPassthrough} wornOriginal=${compositePlan.filter((d) => d === "original-worn").length}`,
  );

  const results: UploadedImage[] = [];
  let enhanceFailCount = 0;
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
    if (compositePlan[index] === "original-worn") {
      console.log(`[enhance] idx=${index} skip studio composite — fashion worn shot, keep original`);
      results.push({ ...item, origin: item.origin ?? "original" });
      continue;
    }
    if (compositePlan[index] === "original-limit") {
      console.log(`[enhance] idx=${index} skip studio composite — keep original (lifestyle pool)`);
      results.push({ ...item, origin: item.origin ?? "original" });
      continue;
    }
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
    if (!resolvedBackdrop) {
      // 405차 — 배경 이미지를 건너뛰었고 섹션 배경도 없으면 합성할 배경이 없다. 호출하지 않고 원본을 쓴다
      console.log(`[enhance] idx=${index} skip — no backdrop (hero backdrop skipped, no section backdrop)`);
      results.push({ ...item, origin: item.origin ?? "original" });
      continue;
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
        enhanceFailCount += 1;
        console.error(
          `[enhance-image] FALLBACK: slot ${index} 원본 유지 — ${item.path}`,
        );
      }
      // 보정 실패해도 슬롯을 버리지 않는다 — 원본을 풀에 남겨 30회 동일컷 반복을 막는다.
      results.push(enhanced ?? { ...item, origin: item.origin ?? "original" });
    } catch (err) {
      enhanceFailCount += 1;
      console.error("[enhance-image] FALLBACK: 보정 예외, 원본 사용:", item.path, err);
      results.push({ ...item, origin: item.origin ?? "original" });
    }
  }

  console.log(
    `[enhance-image] done uploaded=${uploaded.length} kept=${results.length} extras=${extras.length} fallbackOriginals=${enhanceFailCount}`,
  );

  // 130차 — 서버 per-image [cost] 집계 한 줄 (개별 로그는 유지)
  try {
    await fetch("/api/enhance-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flushCostTalliesOnly: true }),
    });
  } catch (err) {
    console.warn("[cost] tally flush failed:", err);
  }

  // 101차 — 동일 URL이 extras/폴백으로 여러 번 들어오면 풀에서 제거
  const merged = [...results, ...extras];
  const deduped: UploadedImage[] = [];
  const seenUrls = new Set<string>();
  for (const img of merged) {
    if (!img?.url || seenUrls.has(img.url)) {
      if (img?.url) {
        console.warn(
          `[enhance-image] drop duplicate url ${img.url.split("/").pop() ?? img.url}`,
        );
      }
      continue;
    }
    seenUrls.add(img.url);
    deduped.push(img);
  }
  if (deduped.length !== merged.length) {
    console.warn(
      `[enhance-image] deduped ${merged.length} → ${deduped.length} (removed ${merged.length - deduped.length})`,
    );
  }

  return { images: deduped, cost: totalCost, decorCost, claudeCost };
}

export type PhotoPipelineStage =
  | "backdrop"
  | "sections"
  | "enhancing"
  | "lifestyle-composite"
  | "lifestyle";

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
  productSizeHint?: string | null;
  /** 125차 — 폼에서 받은 실측 높이(cm). hint 파싱보다 우선 */
  productHeightCm?: number | null;
  /** false/미지정이면 AI 인물 사용샷 생성 생략 (105차 C 옵트인) */
  enableAiLifestyleShots?: boolean;
  ingredients?: string | null;
  targetCustomer?: string | null;
  referenceImageUrl?: string | null;
  lifestyleImageUrl?: string | null;
  draftToken?: string | null;
  /** 404차 — 사진별 역할(uploaded와 같은 순서). 패션 착장·코디(히어로 포함)는 합성하지 않고 원본을 쓴다 */
  imageRoles?: readonly string[];
  /** 417차 — 인포 구간 AI 배경 요청(패션·스타일 자동 적용일 때만 호출부가 채운다). 없으면 호출 0 */
  infoBackdrop?: { zones: InfoZone[]; material: string; color: string; mood: string; productKey: string };
  /** 422차 — 뷰티 인물 사용 컷 요청(뷰티·flag on일 때만 호출부가 채운다). 없으면 호출 0. 계획·조건은 서버(lib/scene-image-gen.ts)가 다시 판단 */
  sceneImage?: {
    productName: string;
    targetCustomer: string | null;
    sizeHint: string | null;
    productHeightCm: number | null;
    /** 참조 후보(업로드 순서와 같음) */
    imageTags?: string[][];
    imageOrigins?: string[];
    imageRoles?: readonly string[];
  };
  pickBackdrop: (urls: string[]) => Promise<string>;
  onStage?: PhotoPipelineProgressCallback;
}): Promise<{
  images: UploadedImage[];
  photoProcessingCost: number;
  photoCostBreakdown: PhotoCostBreakdown;
  conceptBrief?: ConceptBrief;
  referenceAnalysis?: ReferenceAnalysisInput;
  testMode: boolean;
  /** 417차 — 인포 구간 AI 배경 URL 맵(성공한 구간만, 없으면 코드 배경) */
  infoBackdrops?: InfoBackdropMap;
  /** 422차 — 뷰티 인물 사용 컷 슬롯 맵(성공한 슬롯만, 없으면 빈 슬롯) */
  sceneImages?: SceneImageMap;
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

  // 405차 — 패션 히어로가 원본이면 배경 이미지 생성을 서버에서 건너뛴다(conceptBrief·theme·shadow만 받음)
  const skipBackdropImage = shouldSkipBackdropImage(params.category, params.imageRoles);
  emit({ stage: "backdrop", detail: skipBackdropImage ? "상품 분석 중(히어로 원본 사용)" : "히어로 배경 생성 중" });

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
    skipBackdropImage,
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

  // 404차 — 패션 히어로가 원본이면 배경 후보는 히어로에 합성되지 않고, 섹션 배경이 없을 때
  // 비히어로 합성의 예비 배경으로만 쓰인다. 고를 의미가 없으므로 선택 화면 없이 첫 후보를 쓴다.
  const heroKeptOriginal = isHeroKeptOriginal(params.category, params.imageRoles);
  const waitsForPick = !testMode && candidates.length > 1 && !heroKeptOriginal;

  emit({
    stage: "backdrop",
    detail: backdropResult.backdropSkipped
      ? "배경 생성 생략(히어로 원본 사용)"
      : candidates.length > 1 && !heroKeptOriginal
        ? `배경 후보 ${candidates.length}장 — 선택 대기`
        : `배경 후보 ${Math.max(candidates.length, 1)}장 준비`,
    costUsdSoFar: photoProcessingCost,
  });

  if (waitsForPick) {
    chosenBackdrop = await pickBackdrop(candidates);
  } else if (candidates.length >= 1) {
    chosenBackdrop = candidates[0];
  }

  // 405차 — 배경 이미지를 건너뛴 경우 고른 배경이 없는 것이 정상이다. 비히어로 합성은 섹션 배경만 쓴다(enhanceImages)
  const backdropSkipped = backdropResult.backdropSkipped === true;
  if (!chosenBackdrop && !backdropSkipped) {
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
    const productFormulation =
      params.category === "화장품/뷰티"
        ? extractCosmeticsFormulation(
            undefined,
            [params.ingredients, params.keyFeatures, backdropResult.conceptBrief?.theme]
              .filter(Boolean)
              .join(" "),
          )
        : null;
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
          productFormulation,
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

  // 417차 — 인포 구간 AI 배경: 사진 보정과 병렬로 시작하고, 끝난 뒤 최대 25초만 더 기다린다(초과분은 코드 배경)
  const infoBackdropJob: Promise<{ infoBackdrops: InfoBackdropMap; cost: number } | null> | null = params.infoBackdrop?.zones.length
    ? fetch("/api/info-backdrops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params.infoBackdrop,
          mood: params.infoBackdrop.mood || [backdropResult.conceptBrief?.mood, backdropResult.conceptBrief?.theme].filter(Boolean).join(" "),
          category: params.category,
        }),
      })
        .then(async (res) => (res.ok ? ((await res.json()) as { infoBackdrops?: InfoBackdropMap; cost?: number }) : null))
        .then((j) => (j ? { infoBackdrops: j.infoBackdrops ?? {}, cost: j.cost ?? 0 } : null))
        .catch(() => null)
    : null;

  // 422차 — 뷰티 인물 사용 컷: 사진 보정과 병렬로 시작하고, 끝난 뒤 최대 45초만 더 기다린다(초과분은 빈 슬롯)
  const sceneJob: Promise<{ sceneImages: SceneImageMap; cost: number } | null> | null = params.sceneImage
    ? fetch("/api/scene-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: params.category,
          productName: params.sceneImage.productName,
          targetCustomer: params.sceneImage.targetCustomer,
          sizeHint: params.sceneImage.sizeHint,
          productHeightCm: params.sceneImage.productHeightCm,
          imageUrls: uploaded.map((item) => item.url),
          imageTags: params.sceneImage.imageTags,
          imageOrigins: params.sceneImage.imageOrigins,
          imageRoles: params.sceneImage.imageRoles,
        }),
      })
        .then(async (res) => (res.ok ? ((await res.json()) as { sceneImages?: SceneImageMap; cost?: number }) : null))
        .then((j) => (j ? { sceneImages: normalizeSceneImages(j.sceneImages), cost: j.cost ?? 0 } : null))
        .catch(() => null)
    : null;

  emit({
    stage: "enhancing",
    detail: "사진 보정 시작",
    current: 0,
    total: uploaded.length,
    costUsdSoFar: photoProcessingCost,
  });

  const enhanced = await enhanceImages({
    uploaded,
    heroBackdrop: chosenBackdrop ?? "",
    shadowAnalysis: backdropResult.shadowAnalysis,
    conceptBrief: backdropResult.conceptBrief,
    category: params.category,
    productName: params.productName,
    sectionBackdrops,
    backdropAlreadyComposited: backdropResult.productAlreadyComposited ?? false,
    theme: backdropResult.theme,
    imageRoles: params.imageRoles,
    onProgress: (event) => emit({ ...event, costUsdSoFar: photoProcessingCost }),
  });

  photoProcessingCost += enhanced.cost;
  photoCostBreakdown = {
    ...photoCostBreakdown,
    enhance: enhanced.cost - enhanced.decorCost,
    decor: enhanced.decorCost,
    claude: (photoCostBreakdown.claude ?? 0) + enhanced.claudeCost,
  };

  let finalImages = enhanced.images;

  if (params.lifestyleImageUrl) {
    emit({
      stage: "lifestyle-composite",
      detail: "라이프스타일 합성 중",
      costUsdSoFar: photoProcessingCost,
    });
    try {
      const built = buildLifestyleCompositeRequestBody({
        lifestyleImageUrl: params.lifestyleImageUrl,
        productImageUrl: finalImages[0]?.url ?? uploaded[0]?.url ?? "",
        category: params.category,
        productName: params.productName,
        storageBasePath: finalImages[0]?.path ?? uploaded[0]?.path,
        productHeightCm: params.productHeightCm,
        productSizeHint: params.productSizeHint,
      });
      console.log(
        `[125cha][photo-pipeline] lifestyle scale shouldAttempt=${built.shouldAttempt} productHeightCm=${built.productHeightCm} hint=${JSON.stringify(params.productSizeHint ?? null)}`,
      );
      if (!built.shouldAttempt || !built.body) {
        console.warn(
          `[lifestyle-composite] skip — ${built.skipReason ?? "missing-product-height-cm"} (제품 높이 cm 필요)`,
        );
        emit({
          stage: "lifestyle-composite",
          detail: "라이프스타일 합성 생략 — 제품 높이(cm) 없음",
          warning: "제품 높이(cm)를 입력하면 손 크기 기준으로 합성합니다.",
          costUsdSoFar: photoProcessingCost,
        });
      } else {
        console.log(
          `[125cha][photo-pipeline] POST /api/lifestyle-composite body.productHeightCm=${built.body.productHeightCm} body.productSizeHint=${JSON.stringify(built.body.productSizeHint)}`,
        );
        const compositeRes = await fetch("/api/lifestyle-composite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(built.body),
        });
        const compositeJson = (await compositeRes.json()) as {
          url?: string;
          path?: string | null;
          cost?: number;
          composited?: boolean;
          error?: string;
          fallbackReason?: string;
        };
        if (compositeRes.ok && compositeJson.url) {
          if (compositeJson.composited) {
            const compositePath =
              compositeJson.path?.trim() ||
              (compositeJson.url.includes("lifestyle-composite")
                ? compositeJson.url
                : `lifestyle-composite/${Date.now()}.png`);
            finalImages.push({
              url: compositeJson.url,
              path: compositePath,
              origin: "composite",
            });
            console.log(
              `[lifestyle-composite] appended image index ${finalImages.length - 1} path=${compositePath.slice(0, 80)}`,
            );
          }
          const compositeCost = compositeJson.cost ?? 0;
          photoProcessingCost += compositeCost;
          photoCostBreakdown = {
            ...photoCostBreakdown,
            lifestyleComposite: compositeCost,
          };
          emit({
            stage: "lifestyle-composite",
            detail: compositeJson.composited
              ? "라이프스타일 합성 완료"
              : "라이프스타일 합성 생략 — 원본 사용",
            warning: compositeJson.fallbackReason,
            costUsdSoFar: photoProcessingCost,
          });
        } else if (!compositeRes.ok) {
          console.warn("[lifestyle-composite] skip:", compositeJson.error);
        }
      }
    } catch (compositeErr) {
      console.warn("[lifestyle-composite] failed:", compositeErr);
      emit({
        stage: "lifestyle-composite",
        detail: "라이프스타일 합성 생략",
        warning: compositeErr instanceof Error ? compositeErr.message : String(compositeErr),
        costUsdSoFar: photoProcessingCost,
      });
    }
  }

  if (uploaded.length >= getLifestyleShotConfig().minUploadCount) {
    console.log(
      `[photo-pipeline] enableAiLifestyleShots=${params.enableAiLifestyleShots === true}`,
    );
    if (params.enableAiLifestyleShots !== true) {
      console.log(
        "[photo-pipeline] AI lifestyle shots skipped — enableAiLifestyleShots not opted in",
      );
    } else {
    emit({
      stage: "lifestyle",
      detail: "AI 일상샷 생성 중",
      costUsdSoFar: photoProcessingCost,
    });
    try {
      const heroRef = uploaded[0];
      const lifestyleRes = await fetch("/api/generate-lifestyle-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 103차 A — enhanced 대신 원본 업로드 컷 (스케일·라벨 단서 유지)
          productImageUrl: heroRef?.url ?? finalImages[0]?.url,
          referenceStoragePath: heroRef?.path ?? finalImages[0]?.path,
          category: params.category,
          productName: params.productName,
          brandName: params.brandName,
          targetCustomer: params.targetCustomer,
          keyFeatures: params.keyFeatures,
          productSizeHint: params.productSizeHint ?? null,
          enableAiLifestyleShots: true,
          uploadCount: uploaded.length,
          draftToken: params.draftToken ?? null,
        }),
      });
      const lifestyleJson = (await lifestyleRes.json()) as {
        shots?: { url: string; path: string; label?: string }[];
        cost?: number;
        error?: string;
      };
      if (lifestyleRes.ok && lifestyleJson.shots?.length) {
        for (const shot of lifestyleJson.shots) {
          finalImages.push({ url: shot.url, path: shot.path, origin: "ai-lifestyle" });
        }
        const lifestyleCost = lifestyleJson.cost ?? 0;
        photoProcessingCost += lifestyleCost;
        photoCostBreakdown = {
          ...photoCostBreakdown,
          lifestyle: lifestyleCost,
        };
        emit({
          stage: "lifestyle",
          detail: `AI 일상샷 ${lifestyleJson.shots.length}장 완료`,
          costUsdSoFar: photoProcessingCost,
        });
      } else if (!lifestyleRes.ok) {
        console.warn("[lifestyle-shots] API skip:", lifestyleJson.error);
        emit({
          stage: "lifestyle",
          detail: "일상샷 생성 생략",
          warning: lifestyleJson.error,
          costUsdSoFar: photoProcessingCost,
        });
      }
    } catch (lifestyleErr) {
      console.warn("[lifestyle-shots] failed:", lifestyleErr);
      emit({
        stage: "lifestyle",
        detail: "일상샷 생성 생략",
        warning: lifestyleErr instanceof Error ? lifestyleErr.message : String(lifestyleErr),
        costUsdSoFar: photoProcessingCost,
      });
    }
    } // enableAiLifestyleShots
  }

  let infoBackdrops: InfoBackdropMap | undefined;
  if (infoBackdropJob) {
    const waited = await Promise.race([
      infoBackdropJob,
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), INFO_BACKDROP_EXTRA_WAIT_MS)),
    ]);
    if (waited && waited !== "timeout") {
      infoBackdrops = Object.keys(waited.infoBackdrops).length ? waited.infoBackdrops : undefined;
      photoProcessingCost += waited.cost;
      photoCostBreakdown = { ...photoCostBreakdown, infoBackdrops: waited.cost };
    } else if (waited === "timeout") {
      // 늦게 끝난 호출은 과금됐을 수 있으나 이 화면에는 쓰지 않는다(코드 배경). 비용은 서버 로그 [info-backdrops] done에 남는다
      console.warn("[info-backdrops] 대기 25초 초과 — 코드 배경으로 진행");
    }
  }

  let sceneImages: SceneImageMap | undefined;
  if (sceneJob) {
    const waited = await Promise.race([
      sceneJob,
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), SCENE_GEN_EXTRA_WAIT_MS)),
    ]);
    if (waited && waited !== "timeout") {
      sceneImages = Object.keys(waited.sceneImages).length ? waited.sceneImages : undefined;
      ({ photoProcessingCost, photoCostBreakdown } = applySceneCost(photoProcessingCost, photoCostBreakdown, waited.cost));
    } else if (waited === "timeout") {
      // 늦게 끝난 호출은 과금됐을 수 있으나 이 화면에는 쓰지 않는다(빈 슬롯). 비용은 서버 로그 [scene-images] done에 남는다
      console.warn("[scene-images] 대기 45초 초과 — 장면 이미지 없이 진행");
    }
  }

  const uploadedCount = uploaded.length;
  const finalUnique = new Set(finalImages.map((i) => i.url)).size;
  if (finalUnique < finalImages.length) {
    const dedupedFinal: UploadedImage[] = [];
    const seen = new Set<string>();
    for (const img of finalImages) {
      if (!img.url || seen.has(img.url)) continue;
      seen.add(img.url);
      dedupedFinal.push(img);
    }
    console.warn(
      `[photo-pipeline] final dedupe ${finalImages.length} → ${dedupedFinal.length}`,
    );
    finalImages = dedupedFinal;
  }
  const studioLimit = computeStudioCompositeLimit(uploadedCount);
  const passthrough = Math.max(0, uploadedCount - studioLimit);
  console.log(
    `[photo-pipeline] uploaded=${uploadedCount} enhanced=${enhanced.images.length} passthrough=${passthrough} finalUnique=${new Set(finalImages.map((i) => i.url)).size}`,
  );

  return {
    images: finalImages,
    photoProcessingCost,
    photoCostBreakdown,
    conceptBrief: backdropResult.conceptBrief,
    referenceAnalysis: backdropResult.referenceAnalysis,
    testMode,
    infoBackdrops,
    sceneImages,
  };
}
