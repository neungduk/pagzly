import type { PhotoCostBreakdown } from "@/lib/types/generate";

export type PipelineSummaryStepId =
  | "image_analysis"
  | "tone_manner"
  | "layout_design"
  | "content";

export type PipelineSummaryStep = {
  id: PipelineSummaryStepId;
  label: string;
  done: boolean;
  detail?: string;
};

export type GenerationPipelineSummary = {
  completedAt?: string;
  steps: PipelineSummaryStep[];
};

function photoPipelineRan(
  photoProcessingCost?: number,
  photoCostBreakdown?: PhotoCostBreakdown,
): boolean {
  if ((photoProcessingCost ?? 0) > 0) return true;
  if (!photoCostBreakdown) return false;
  return Object.keys(photoCostBreakdown).length > 0;
}

/** draft→result 전달 또는 result 로드 시 실제 데이터로만 요약 구성 */
export function buildGenerationPipelineSummary(input: {
  imageAnalysis?: string | null;
  theme?: { baseNeutral?: string } | null;
  photoProcessingCost?: number;
  photoCostBreakdown?: PhotoCostBreakdown;
  backdropFailed?: boolean;
  sectionCount?: number;
}): GenerationPipelineSummary {
  const imageDone = Boolean(input.imageAnalysis?.trim());
  const toneDone = Boolean(input.theme?.baseNeutral?.trim());
  const layoutRan = photoPipelineRan(input.photoProcessingCost, input.photoCostBreakdown);
  const contentDone = (input.sectionCount ?? 0) > 0;

  const steps: PipelineSummaryStep[] = [
    {
      id: "image_analysis",
      label: "이미지 분석 완료",
      done: imageDone,
      detail: imageDone ? "Vision 분석 반영" : undefined,
    },
    {
      id: "tone_manner",
      label: "톤앤매너 추출 완료",
      done: toneDone,
      detail: toneDone && input.theme?.baseNeutral ? input.theme.baseNeutral : undefined,
    },
    {
      id: "layout_design",
      label: "레이아웃 디자인 완료",
      done: layoutRan,
      detail: input.backdropFailed
        ? "배경·보정 일부 원본 사용"
        : layoutRan
          ? "배경·보정 파이프라인"
          : undefined,
    },
    {
      id: "content",
      label: "콘텐츠 제작 완료",
      done: contentDone,
      detail: contentDone ? `${input.sectionCount}개 섹션` : undefined,
    },
  ];

  return { steps };
}
