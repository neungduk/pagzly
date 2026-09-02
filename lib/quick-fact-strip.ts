/** spec_table 핵심 행 → 퀵팩트 스트립 (55차) */

import type { DetailSection } from "@/lib/types/generate";

const PLACEHOLDER_PATTERNS = [
  "판매자 확인 필요",
  "판매자에게 문의",
  "판매자 정책을 확인",
  "확인 필요",
];

export const QUICK_FACT_LABEL_WHITELIST = [
  "소재",
  "원산지",
  "용량",
  "색상",
  "제조사",
  "제조국",
  "브랜드",
  "중량",
  "성분",
  "모델명",
  "품번",
  "혼용률",
  "제형",
  "향",
  "규격",
] as const;

export type QuickFact = { label: string; value: string };

function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

function findProductSpecTable(sections: DetailSection[]) {
  return sections.find(
    (s) => s.type === "spec_table" && s.slot === "spec_table" && s.rows.length > 0,
  );
}

/** spec_table에서 2~4개 핵심 행 추출. 없으면 빈 배열 */
export function extractQuickFacts(sections: DetailSection[]): QuickFact[] {
  const spec = findProductSpecTable(sections);
  if (!spec || spec.type !== "spec_table") return [];

  const validRows = spec.rows.filter(
    (r) => r.label.trim() && r.value.trim() && !isPlaceholderValue(r.value),
  );
  if (validRows.length === 0) return [];

  const whitelisted = validRows.filter((r) =>
    QUICK_FACT_LABEL_WHITELIST.some((w) => r.label.includes(w)),
  );

  const picked = (whitelisted.length > 0 ? whitelisted : validRows.slice(0, 2)).slice(0, 4);
  return picked.map((r) => ({ label: r.label.trim(), value: r.value.trim() }));
}

export function formatQuickFactLine(facts: QuickFact[]): string {
  return facts.map((f) => `${f.label} : ${f.value}`).join(" · ");
}

export function buildQuickFactStripHtml(
  facts: QuickFact[],
  theme: { accent: string; deepAccent: string; baseNeutral: string },
): string {
  if (facts.length === 0) return "";
  const line = formatQuickFactLine(facts)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="border-top:1px solid ${theme.accent}38;border-bottom:1px solid ${theme.accent}38;background:${theme.baseNeutral}a6;padding:12px 16px;text-align:center;font-size:12px;font-weight:500;color:${theme.deepAccent}">${line}</div>`;
}
