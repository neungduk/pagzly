import {
  planPageStructureWithClaude,
  type ClaudeStructureResult,
} from "@/lib/copy-orchestrator/claude-structure";
import {
  generateDetailCopyWithDeepSeek,
  type DeepSeekCopyResult,
} from "@/lib/copy-orchestrator/deepseek-copy";
import type { CopyProductInput, DetailPageCopy, PageStructurePlan } from "@/lib/copy-orchestrator/types";

export type DetailCopyPipelineResult = {
  structure: PageStructurePlan;
  copy: DetailPageCopy;
  claude: Pick<ClaudeStructureResult, "model" | "claudeCostUsd">;
  deepseek: Pick<DeepSeekCopyResult, "model" | "deepSeekCostUsd" | "hallucinationWarnings">;
  totalCostUsd: number;
};

/**
 * Claude 구조 → DeepSeek 카피.
 * HTML/상세페이지 조립은 하지 않는다.
 */
export async function runDetailCopyPipeline(
  product: CopyProductInput,
): Promise<DetailCopyPipelineResult> {
  const claude = await planPageStructureWithClaude(product);
  const deepseek = await generateDetailCopyWithDeepSeek(product, claude.structure);

  return {
    structure: claude.structure,
    copy: deepseek.copy,
    claude: { model: claude.model, claudeCostUsd: claude.claudeCostUsd },
    deepseek: {
      model: deepseek.model,
      deepSeekCostUsd: deepseek.deepSeekCostUsd,
      hallucinationWarnings: deepseek.hallucinationWarnings,
    },
    totalCostUsd:
      Math.round((claude.claudeCostUsd + deepseek.deepSeekCostUsd) * 1_000_000) / 1_000_000,
  };
}
