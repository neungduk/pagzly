import { getImageRouter } from "@/lib/image-router";
import { isImageRouterEnabled } from "@/lib/image-router/pipeline-bridge";
import { isTestMode } from "@/lib/test-mode";
import {
  getLifestyleShotConfig,
  countLifestyleShotsToGenerate,
} from "@/lib/lifestyle-shot-config";
import type { ImageAspectRatio } from "@/lib/image-router/types";
import {
  isLifestyleAiPath,
  LIFESTYLE_AI_PATH_MARKER,
  planLifestyleShots,
  type LifestyleShotPlan,
} from "@/lib/lifestyle-shot-planner";
import { evaluateLifestyleShotGate } from "@/lib/lifestyle-shot-quality-gate";
import { compositeProductOnLifestylePhoto } from "@/lib/lifestyle-product-composite";
import { parseProductHeightCm } from "@/lib/lifestyle-physical-scale";
import {
  EMPTY_SCENE_RETRY_PROMPT_SUFFIX,
  evaluateEmptySceneOccupancy,
} from "@/lib/empty-scene-gate";

export type GeneratedLifestyleShot = {
  url: string;
  path: string;
  cost: number;
  label: string;
};

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) {
      const base64 = url.split(",")[1];
      if (!base64) return null;
      return Buffer.from(base64, "base64");
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function deriveBasePath(referencePath: string): string {
  const cleaned = referencePath.replace(/\.[^./]+$/, "");
  if (cleaned.includes("/")) {
    return cleaned.replace(/-enhanced.*$/, "").replace(/-lifestyle-ai.*$/, "");
  }
  return cleaned;
}

/**
 * AI 일상샷 생성 — 111차: 빈손 씬 생성 → 손 검출 → 실측 스케일 픽셀 합성.
 * 치수 파싱 실패·검출 불신뢰 시 해당 컷 폐기 (추정 합성 금지).
 */
export async function generateLifestyleShots(params: {
  productImageUrl: string;
  referenceStoragePath: string;
  category: string;
  productName: string;
  brandName?: string | null;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
  productSizeHint?: string | null;
  uploadCount: number;
  userId: string;
  draftToken?: string | null;
  uploadPng: (
    storagePath: string,
    buffer: Buffer,
  ) => Promise<{ publicUrl: string; path: string } | { error: string }>;
}): Promise<{ shots: GeneratedLifestyleShot[]; totalCost: number }> {
  const lifestyleConfig = getLifestyleShotConfig();
  if (!lifestyleConfig.enabled) {
    console.warn("[lifestyle-shots] LIFESTYLE_SHOTS_ENABLED=false — skip");
    return { shots: [], totalCost: 0 };
  }

  if (isTestMode()) {
    console.log("[lifestyle-shots] TEST_MODE — AI 일상샷 생성 생략 ($0)");
    return { shots: [], totalCost: 0 };
  }

  if (!isImageRouterEnabled()) {
    console.warn("[lifestyle-shots] IMAGE_ROUTER disabled — skip");
    return { shots: [], totalCost: 0 };
  }

  if (!process.env.REPLICATE_API_TOKEN && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("[lifestyle-shots] no image provider credentials — skip");
    return { shots: [], totalCost: 0 };
  }

  const count = countLifestyleShotsToGenerate(params.uploadCount, lifestyleConfig);
  if (count <= 0) {
    return { shots: [], totalCost: 0 };
  }

  const plans = planLifestyleShots({
    category: params.category,
    productName: params.productName,
    brandName: params.brandName,
    targetCustomer: params.targetCustomer,
    keyFeatures: params.keyFeatures,
    productSizeHint: params.productSizeHint,
    count,
  });

  const productHeightCm = parseProductHeightCm(params.productSizeHint);
  const usePixelComposite = params.category !== "반려동물";

  if (usePixelComposite && productHeightCm == null) {
    console.warn(
      "[lifestyle-shots] productSizeHint에서 높이(cm) 파싱 실패 — AI 사용샷 전체 스킵 (추정 합성 금지)",
    );
    return { shots: [], totalCost: 0 };
  }

  const router = getImageRouter({
    userId: params.userId,
    draftToken: params.draftToken,
  });

  const basePath = deriveBasePath(params.referenceStoragePath);
  const shots: GeneratedLifestyleShot[] = [];
  let totalCost = 0;
  let rejected = 0;

  for (let i = 0; i < plans.length; i += 1) {
    const plan = plans[i]!;
    const emptyScene = plan.taskType === "PRODUCT_LIFESTYLE_EMPTY_SCENE";

    const shot = await generateOneShot({
      router,
      plan,
      productImageUrl: params.productImageUrl,
      passProductImage: !emptyScene,
      userId: params.userId,
      draftToken: params.draftToken,
      index: i,
      basePath,
      uploadPng: params.uploadPng,
      lifestyleConfig,
      attempt: 0,
    });
    if (!shot) {
      rejected += 1;
      continue;
    }
    totalCost += shot.cost;

    // 레거시(펫 등): 제품이 그려진 씬 — 105차 7번 유사도 게이트 유지
    // 인물 빈손 경로(111차)는 제품 픽셀 합성으로 대체되어 본 게이트 불필요(제품 유사도 측정 불가)
    if (!emptyScene) {
      const gate = await evaluateLifestyleShotGate({
        referenceUrl: params.productImageUrl,
        generatedUrl: shot.url,
      }).catch((err) => {
        console.warn("[lifestyle-ai] gate error — accept shot", err);
        return { pass: true, reasons: [] as string[], centerSimilarity: 1 };
      });

      if (!gate.pass) {
        console.warn(
          `[lifestyle-ai] generated=1 rejected reason=${gate.reasons.join(",") || "gate"} ` +
            `sim=${gate.centerSimilarity.toFixed(3)} — drop`,
        );
        rejected += 1;
        continue;
      }
      shots.push(shot);
      continue;
    }

    // 111차 — 빈손 씬 → (115차 점유 게이트) → 픽셀 합성
    const gated = await ensureCleanEmptyScene({
      router,
      plan,
      productImageUrl: params.productImageUrl,
      userId: params.userId,
      draftToken: params.draftToken,
      index: i,
      basePath,
      uploadPng: params.uploadPng,
      lifestyleConfig,
      firstShot: shot,
    });
    totalCost += gated.extraCost;
    if (!gated.shot) {
      rejected += 1;
      continue;
    }

    const composite = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: gated.shot.url,
      productImageUrl: params.productImageUrl,
      category: params.category,
      productName: params.productName,
      productHeightCm,
      requirePixelPaste: true,
    });
    totalCost += composite.cost;

    if (
      !composite.composited ||
      (composite.method !== "pixel-paste" && composite.method !== "pixel-paste+grasp-refine")
    ) {
      console.warn(
        `[lifestyle-ai] pixel composite dropped reason=${composite.fallbackReason ?? composite.method ?? "unknown"}`,
      );
      rejected += 1;
      continue;
    }

    const composedBuf = await fetchImageBuffer(composite.url);
    if (!composedBuf) {
      rejected += 1;
      continue;
    }

    const storagePath = `${basePath}-${LIFESTYLE_AI_PATH_MARKER}-${i + 1}-px.png`;
    const uploaded = await params.uploadPng(storagePath, composedBuf);
    if ("error" in uploaded) {
      console.warn(`[lifestyle-shots] composite upload failed: ${uploaded.error}`);
      rejected += 1;
      continue;
    }

    shots.push({
      url: uploaded.publicUrl,
      path: uploaded.path,
      cost: gated.shot.cost + composite.cost,
      label: plan.label,
    });
  }

  console.log(
    `[lifestyle-ai] generated=${shots.length} rejected=${rejected} plans=${plans.length} pixelComposite=${usePixelComposite}`,
  );
  return { shots, totalCost };
}

/**
 * 115차 — 빈손 씬이 이미 물체를 쥐고 있으면 최대 1회 재생성, 그래도 실패면 drop.
 */
async function ensureCleanEmptyScene(params: {
  router: ReturnType<typeof getImageRouter>;
  plan: LifestyleShotPlan;
  productImageUrl: string;
  userId: string;
  draftToken?: string | null;
  index: number;
  basePath: string;
  uploadPng: (
    storagePath: string,
    buffer: Buffer,
  ) => Promise<{ publicUrl: string; path: string } | { error: string }>;
  lifestyleConfig: ReturnType<typeof getLifestyleShotConfig>;
  firstShot: GeneratedLifestyleShot;
}): Promise<{ shot: GeneratedLifestyleShot | null; extraCost: number }> {
  let extraCost = 0;
  let shot = params.firstShot;
  let retried = false;

  const runGate = async (url: string) => {
    const buf = await fetchImageBuffer(url);
    if (!buf) {
      return {
        result: "already-occupied" as const,
        cost: 0,
        reason: "fetch-failed",
      };
    }
    return evaluateEmptySceneOccupancy(buf);
  };

  let gate = await runGate(shot.url);
  extraCost += gate.cost;

  if (gate.result === "clean") {
    console.log(
      `[empty-scene-gate] result=clean retried=false action=composite reason=${gate.reason ?? "-"}`,
    );
    return { shot, extraCost };
  }

  console.log(
    `[empty-scene-gate] result=already-occupied retried=false action=retry reason=${gate.reason ?? "-"}`,
  );

  retried = true;
  const retryPlan: LifestyleShotPlan = {
    ...params.plan,
    prompt: `${params.plan.prompt} ${EMPTY_SCENE_RETRY_PROMPT_SUFFIX}`,
  };
  const retryShot = await generateOneShot({
    router: params.router,
    plan: retryPlan,
    productImageUrl: params.productImageUrl,
    passProductImage: false,
    userId: params.userId,
    draftToken: params.draftToken,
    index: params.index,
    basePath: params.basePath,
    uploadPng: params.uploadPng,
    lifestyleConfig: params.lifestyleConfig,
    attempt: 1,
  });

  if (!retryShot) {
    console.log(
      `[empty-scene-gate] result=already-occupied retried=true action=drop reason=retry-generate-failed`,
    );
    return { shot: null, extraCost };
  }
  extraCost += retryShot.cost;
  shot = retryShot;

  gate = await runGate(shot.url);
  extraCost += gate.cost;

  if (gate.result === "clean") {
    console.log(
      `[empty-scene-gate] result=clean retried=true action=composite reason=${gate.reason ?? "-"}`,
    );
    return { shot, extraCost };
  }

  console.log(
    `[empty-scene-gate] result=already-occupied retried=${retried} action=drop reason=${gate.reason ?? "-"}`,
  );
  return { shot: null, extraCost };
}

async function generateOneShot(params: {
  router: ReturnType<typeof getImageRouter>;
  plan: LifestyleShotPlan;
  productImageUrl: string;
  /** false면 빈손 씬 — 제품 이미지를 Kontext에 넣지 않음 */
  passProductImage: boolean;
  userId: string;
  draftToken?: string | null;
  index: number;
  basePath: string;
  uploadPng: (
    storagePath: string,
    buffer: Buffer,
  ) => Promise<{ publicUrl: string; path: string } | { error: string }>;
  lifestyleConfig: ReturnType<typeof getLifestyleShotConfig>;
  attempt: number;
}): Promise<GeneratedLifestyleShot | null> {
  const { plan, index } = params;
  const idempotencyKey = `lifestyle-${params.draftToken ?? params.userId}-${index}-a${params.attempt}-${Date.now()}`;

  try {
    const result = await params.router.generateImage({
      taskType: plan.taskType,
      productImages: params.passProductImage
        ? [{ url: params.productImageUrl }]
        : [],
      prompt: plan.prompt,
      aspectRatio: plan.aspectRatio as ImageAspectRatio,
      qualityLevel: params.lifestyleConfig.qualityLevel,
      resolution: params.lifestyleConfig.resolution,
      userId: params.userId,
      draftToken: params.draftToken,
      idempotencyKey,
    });

    if (result.status !== "succeeded" || result.outputUrls.length === 0) {
      console.warn(
        `[lifestyle-shots] shot ${index} failed: ${result.errorMessage ?? result.status}`,
      );
      return null;
    }

    const remoteUrl = result.outputUrls[0]!;
    const buffer = await fetchImageBuffer(remoteUrl);
    if (!buffer) {
      console.warn(`[lifestyle-shots] shot ${index} download failed`);
      return null;
    }

    const storagePath = `${params.basePath}-${LIFESTYLE_AI_PATH_MARKER}-${index + 1}${params.attempt ? `-r${params.attempt}` : ""}.png`;
    const uploaded = await params.uploadPng(storagePath, buffer);
    if ("error" in uploaded) {
      console.warn(`[lifestyle-shots] upload failed: ${uploaded.error}`);
      return null;
    }

    return {
      url: uploaded.publicUrl,
      path: uploaded.path,
      cost: result.actualCost,
      label: plan.label,
    };
  } catch (err) {
    console.warn(`[lifestyle-shots] shot ${index} error:`, err);
    return null;
  }
}

export function lifestyleAiIndexesFromPaths(paths: string[]): number[] {
  return paths
    .map((p, i) => (isLifestyleAiPath(p) ? i : -1))
    .filter((i) => i >= 0);
}
