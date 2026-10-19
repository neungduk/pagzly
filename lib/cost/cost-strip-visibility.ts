/**
 * 407차 — 결과 화면 "AI 비용" 띠(GenerationCostStrip)는 내부 원가(USD, 단계별)라 기본으로 숨긴다.
 * NEXT_PUBLIC_SHOW_COST_STRIP가 정확히 "true"일 때만 보인다. 원가 기록(DB generation_cost·세션 photoCostBreakdown)은 그대로 쌓인다.
 * NEXT_PUBLIC_ 값은 빌드 때 번들에 박힌다 — 직접 참조해야 인라인되며, 바꾸면 dev 서버 재시작·재빌드가 필요하다.
 */
export function isCostStripVisible(flag: string | undefined): boolean {
  return flag === "true";
}

export const SHOW_COST_STRIP = isCostStripVisible(process.env.NEXT_PUBLIC_SHOW_COST_STRIP);
