/**
 * [AI COST] 구조화 로그 — provider / model / generation / attempt / costs
 */

export type AiCostLogInput = {
  provider: string;
  model: string;
  generationId: string;
  attempt: number;
  estimatedCost: number;
  actualCost: number;
  status?: string;
  pageId?: string | null;
  userId?: string;
};

export function logAiCost(input: AiCostLogInput): void {
  console.log(
    [
      "[AI COST]",
      `provider: ${input.provider}`,
      `model: ${input.model}`,
      `generationId: ${input.generationId}`,
      `attempt: ${input.attempt}`,
      `estimatedCost: $${input.estimatedCost.toFixed(4)}`,
      `actualCost: $${input.actualCost.toFixed(4)}`,
      input.status ? `status: ${input.status}` : null,
      input.pageId ? `pageId: ${input.pageId}` : null,
      input.userId ? `userId: ${input.userId}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
