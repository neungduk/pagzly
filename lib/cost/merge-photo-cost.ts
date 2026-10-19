import type { PhotoCostBreakdown } from "@/lib/types/generate";

/**
 * 406차 — 초안 비용표와 사진 단계 비용표 합치기.
 *
 * 초안 요청(/api/generate draft)의 claude 칸에는 초안 단계 Claude 비용(이미지 분석·QA·보조 컨셉 요약 등)이 들어 있고,
 * 사진 단계(runPhotoEnhancementPipeline)의 claude 칸에는 배경·합성 단계 Claude 비용이 들어 있다.
 * 예전에는 `{...초안, ...사진}`으로 합쳐 초안 Claude 비용이 사라졌다(404차 실생성: 서버 로그 초안 claude $0.0926 누락).
 * 최종 요청은 이 표의 claude를 이어받아 generationCost에 더하므로, claude는 덮지 않고 더한다.
 * 나머지 칸은 이전처럼 사진 단계 값이 우선한다(초안의 conceptBrief·referenceAnalysis는 이미 초안 claude 안에 들어 있다).
 */
export function mergeDraftAndPhotoCost(
  draft: PhotoCostBreakdown | undefined,
  photo: PhotoCostBreakdown | undefined,
): PhotoCostBreakdown {
  const merged: PhotoCostBreakdown = { ...(draft ?? {}), ...(photo ?? {}) };
  if (draft?.claude != null || photo?.claude != null) {
    merged.claude = (draft?.claude ?? 0) + (photo?.claude ?? 0);
  }
  return merged;
}
