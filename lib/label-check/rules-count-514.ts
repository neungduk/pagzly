/**
 * 514 — 랜딩 숫자 띠용 규칙 개수(JSON 실측). 하드코딩·fs 금지(클라 번들 안전).
 */
import krJson from "@/review/data/kr_label_rules_draft_v0.1.json";
import usJson from "@/review/data/us_label_rules_draft_v0.1.json";

export function labelRuleCounts514(): { kr: number; us: number } {
  const kr = Array.isArray((krJson as { rules?: unknown }).rules)
    ? (krJson as { rules: unknown[] }).rules.length
    : 0;
  const us = Array.isArray((usJson as { rules?: unknown }).rules)
    ? (usJson as { rules: unknown[] }).rules.length
    : 0;
  return { kr, us };
}
