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
 * AI 일상샷 생성 — ImageRouter(Kontext/Flux/Gemini)로 사람·반려동물 포함 장면 연출.
 * 상품 레퍼런스는 enhanced hero(또는 첫 장)를 사용한다.
 */
export async function generateLifestyleShots(params: {
  productImageUrl: string;
  referenceStoragePath: string;
  category: string;
  productName: string;
  brandName?: string | null;
  targetCustomer?: string | null;
  keyFeatures?: string | null;
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
    count,
  });

  const router = getImageRouter({
    userId: params.userId,
    draftToken: params.draftToken,
  });

  const basePath = deriveBasePath(params.referenceStoragePath);
  const shots: GeneratedLifestyleShot[] = [];
  let totalCost = 0;

  for (let i = 0; i < plans.length; i += 1) {
    const plan = plans[i]!;
    const shot = await generateOneShot({
      router,
      plan,
      productImageUrl: params.productImageUrl,
      userId: params.userId,
      draftToken: params.draftToken,
      index: i,
      basePath,
      uploadPng: params.uploadPng,
      lifestyleConfig,
    });
    if (shot) {
      shots.push(shot);
      totalCost += shot.cost;
    }
  }

  return { shots, totalCost };
}

async function generateOneShot(params: {
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
}): Promise<GeneratedLifestyleShot | null> {
  const { plan, index } = params;
  const idempotencyKey = `lifestyle-${params.draftToken ?? params.userId}-${index}-${Date.now()}`;

  try {
    const result = await params.router.generateImage({
      taskType: plan.taskType,
      productImages: [{ url: params.productImageUrl }],
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

    const storagePath = `${params.basePath}-${LIFESTYLE_AI_PATH_MARKER}-${index + 1}.png`;
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
