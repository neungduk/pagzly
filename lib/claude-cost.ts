/** Anthropic 공식 단가(USD / 1M tokens). 모델 페이지 기준 — 변경 시 이 상수만 갱신 */
const CLAUDE_COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

function resolvePricing(model: string): { input: number; output: number } {
  if (CLAUDE_COST_PER_MILLION[model]) {
    return CLAUDE_COST_PER_MILLION[model];
  }
  if (model.includes("haiku")) {
    return { input: 1, output: 5 };
  }
  if (model.includes("sonnet")) {
    return { input: 3, output: 15 };
  }
  return { input: 3, output: 15 };
}

export function calculateClaudeCost(
  model: string,
  usage: { input_tokens?: number; output_tokens?: number } | null | undefined,
): number {
  if (!usage) return 0;
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const pricing = resolvePricing(model);
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

export function logClaudeCost(label: string, model: string, cost: number): void {
  if (cost <= 0) return;
  console.log(`[cost] claude/${label} (${model}): $${cost.toFixed(4)}`);
}
