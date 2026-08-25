import type { ComparisonChartSection } from "@/lib/types/generate";

/** 화이트리스트 — 이 3개 문자열만 최종 허용. AI가 뭘 보내든 이 중 하나로 강제 치환. */
export const COMPARISON_CHART_BASELINE_LABELS = ["일반 제품", "업계 평균", "타 제품"] as const;

const DEFAULT_BASELINE_LABEL: (typeof COMPARISON_CHART_BASELINE_LABELS)[number] = "일반 제품";

const SELF_ASSESSED_DISCLAIMER = "자체 평가 기준 (개인차가 있을 수 있어요)";

function clampMetricValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * comparison_chart 섹션을 서버가 최종 검증·강제하는 함수.
 * - baselineLabel: 화이트리스트 밖이면 무조건 기본값으로 치환 (특정 브랜드명 노출 방지).
 * - basis: 유효하지 않으면 self_assessed로 안전하게 폴백.
 * - basis가 self_assessed면 basisNote를 고정 디스클레이머로 강제 (AI가 뭘 보내든 덮어씀).
 * - ourValue/baselineValue: 0~100 사이로 클램프 (unit이 %가 아니어도 우선 이 범위로 통일 —
 *   19차 범위 밖 unit이 필요해지면 그때 확장).
 */
export function sanitizeComparisonChartSection(
  section: ComparisonChartSection,
): ComparisonChartSection {
  const baselineLabel = (
    COMPARISON_CHART_BASELINE_LABELS as readonly string[]
  ).includes(section.baselineLabel)
    ? section.baselineLabel
    : DEFAULT_BASELINE_LABEL;

  const basis = section.basis === "measured" ? "measured" : "self_assessed";
  const basisNote =
    basis === "self_assessed"
      ? SELF_ASSESSED_DISCLAIMER
      : section.basisNote?.trim() || "자체 테스트 결과";

  return {
    ...section,
    baselineLabel,
    basis,
    basisNote,
    metrics: section.metrics.slice(0, 4).map((metric) => ({
      ...metric,
      ourValue: clampMetricValue(metric.ourValue),
      baselineValue: clampMetricValue(metric.baselineValue),
    })),
  };
}
