import fs from "fs";
import { ImageRouter } from "@/lib/image-router/router";
import type { GenerateImageResult, ImageRouterContext } from "@/lib/image-router/types";
import type { ImagePlan, ImagePlanItem } from "@/lib/image-router/orchestrator/image-plan-types";
import {
  toRouterAspectRatio,
  toRouterQualityLevel,
  toRouterTaskType,
} from "@/lib/image-router/orchestrator/validate-image-plan";
import type { ProviderRegistry } from "@/lib/image-router/providers/registry";

export type ExecuteImagePlanItemResult = {
  item: ImagePlanItem;
  result: GenerateImageResult;
};

export type ExecuteImagePlanResult = {
  items: ExecuteImagePlanItemResult[];
  totalImageCostUsd: number;
  succeeded: number;
  failed: number;
};

function toProviderImageUrl(source: string): string {
  if (
    source.startsWith("data:") ||
    source.startsWith("http://") ||
    source.startsWith("https://")
  ) {
    return source;
  }
  if (!fs.existsSync(source)) return source;
  const buf = fs.readFileSync(source);
  const lower = source.toLowerCase();
  const mime = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * imagePlan → ImageRouter.generateImage 순차 실행.
 * 상세페이지 HTML/섹션 조립은 하지 않는다.
 */
export async function executeImagePlan(params: {
  plan: ImagePlan;
  productImageUrls: string[];
  context?: ImageRouterContext;
  registry?: ProviderRegistry;
  /** 비용 제한용 — 앞에서 N개만 생성 */
  maxImages?: number;
  resolution?: "512" | "768" | "1024";
  timeoutMs?: number;
  onItemStart?: (item: ImagePlanItem, index: number, total: number) => void;
  onItemDone?: (entry: ExecuteImagePlanItemResult, index: number) => void;
}): Promise<ExecuteImagePlanResult> {
  const list = params.plan.imagePlan.slice(0, params.maxImages ?? params.plan.imagePlan.length);
  const productImages = params.productImageUrls.map((url) => ({
    url: toProviderImageUrl(url),
  }));

  const router = new ImageRouter({
    context: params.context,
    registry: params.registry,
    trackJobs: false,
    timeoutMs: params.timeoutMs ?? 180_000,
  });

  const items: ExecuteImagePlanItemResult[] = [];
  let totalImageCostUsd = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i]!;
    params.onItemStart?.(item, i, list.length);

    const result = await router.generateImage({
      taskType: toRouterTaskType(item.taskType),
      productImages,
      prompt: `${item.purpose}\n\n${item.prompt}`,
      aspectRatio: toRouterAspectRatio(item.aspectRatio),
      qualityLevel: toRouterQualityLevel(item.qualityLevel),
      resolution: params.resolution ?? "768",
      userId: params.context?.userId,
      pageId: params.context?.pageId,
      draftToken: params.context?.draftToken,
      idempotencyKey: `image-plan-${params.context?.draftToken ?? "x"}-${item.order}-${Date.now()}`,
    });

    totalImageCostUsd += result.actualCost;
    if (result.status === "succeeded") succeeded += 1;
    else failed += 1;

    const entry = { item, result };
    items.push(entry);
    params.onItemDone?.(entry, i);
  }

  return {
    items,
    totalImageCostUsd: Math.round(totalImageCostUsd * 1_000_000) / 1_000_000,
    succeeded,
    failed,
  };
}
