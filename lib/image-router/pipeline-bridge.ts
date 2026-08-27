/**
 * 기존 photo pipeline ↔ ImageRouter 연결 브릿지.
 * 기본 ON — IMAGE_ROUTER_ENABLED=false 일 때만 legacy.
 */
import { getImageRouter } from "@/lib/image-router";
import type { ImageTaskType } from "@/lib/image-router";

export function isImageRouterEnabled(): boolean {
  const raw = process.env.IMAGE_ROUTER_ENABLED;
  if (raw === "false" || raw === "0") return false;
  return true;
}

export type RouterGenerateContext = {
  userId: string;
  draftToken?: string | null;
  pageId?: string | null;
  idempotencyKey: string;
};

/**
 * Router로 PNG/data URL 생성 시도. 실패하면 null (caller가 legacy 사용).
 */
export async function tryGenerateImageViaRouter(params: {
  taskType: ImageTaskType;
  prompt: string;
  productImageUrl?: string | null;
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9";
  resolution?: "512" | "768" | "1024";
  context: RouterGenerateContext;
}): Promise<{ url: string; cost: number; generationId: string } | null> {
  if (!isImageRouterEnabled()) return null;

  const router = getImageRouter({
    userId: params.context.userId,
    pageId: params.context.pageId,
    draftToken: params.context.draftToken,
  });

  const result = await router.generateImage({
    taskType: params.taskType,
    productImages: params.productImageUrl ? [{ url: params.productImageUrl }] : [],
    prompt: params.prompt,
    aspectRatio: params.aspectRatio ?? "1:1",
    resolution: params.resolution ?? "1024",
    userId: params.context.userId,
    pageId: params.context.pageId,
    draftToken: params.context.draftToken,
    idempotencyKey: params.context.idempotencyKey,
  });

  if (result.status !== "succeeded" || result.outputUrls.length === 0) {
    console.warn(
      `[pipeline-bridge] router failed task=${params.taskType} status=${result.status} ` +
        `err=${result.errorMessage ?? "-"}`,
    );
    return null;
  }

  return {
    url: result.outputUrls[0]!,
    cost: result.actualCost,
    generationId: result.generationId,
  };
}
