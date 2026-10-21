/**
 * 427차 1-2 — 판매자가 직접 입력한 비교 정보(항목·우리 제품·일반 제품).
 * 비교 차트·비교표는 이 입력이 있을 때만 상세페이지에 나온다. 값은 입력 그대로(공백만 정리) 쓰고 새 수치·문장을 만들지 않는다.
 * 저장은 424차 display JSONB(products.photo_cost_breakdown.display.comparisonRows)와 같은 위치에 한다(lib/saved-display.ts).
 */
export type ComparisonRow = {
  label: string;
  /** 우리 제품 값(짧은 글, 예: "있음", "20수 싱글 저지") */
  ours: string;
  /** 비교 대상 값(예: "없음") */
  other: string;
};

export const COMPARISON_MAX_ROWS = 4;
const MAX_LABEL = 20;
const MAX_VALUE = 30;

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** 알 수 없는 값은 버리고, 세 칸이 모두 채워진 행만 남긴다(최대 4행). 하나도 없으면 빈 배열 */
export function normalizeComparisonRows(raw: unknown): ComparisonRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ComparisonRow[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const row = { label: clean(o.label, MAX_LABEL), ours: clean(o.ours, MAX_VALUE), other: clean(o.other, MAX_VALUE) };
    if (row.label && row.ours && row.other) out.push(row);
    if (out.length >= COMPARISON_MAX_ROWS) break;
  }
  return out;
}

/** 비교표를 만들 수 있는 입력인가(2행 이상) */
export const hasComparisonInput = (rows: readonly ComparisonRow[] | undefined): boolean => (rows?.length ?? 0) >= 2;
