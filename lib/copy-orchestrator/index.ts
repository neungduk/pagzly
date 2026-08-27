export type {
  CopyFaqItem,
  CopyProductInput,
  CopySection,
  CopySectionType,
  CopyStructureSection,
  DetailPageCopy,
  PageStructurePlan,
} from "@/lib/copy-orchestrator/types";
export {
  COPY_SECTION_TYPES,
  PAGE_STRUCTURE_MAX_SECTIONS,
  PAGE_STRUCTURE_MIN_SECTIONS,
} from "@/lib/copy-orchestrator/types";

export {
  CopyValidationError,
  DETAIL_PAGE_COPY_JSON_SCHEMA,
  detectCopyHallucinations,
  parseJsonLoose,
  validateDetailPageCopy,
  validatePageStructurePlan,
} from "@/lib/copy-orchestrator/validate-copy";

export {
  planPageStructureWithClaude,
  type ClaudeStructureResult,
} from "@/lib/copy-orchestrator/claude-structure";

export {
  generateDetailCopyWithDeepSeek,
  type DeepSeekCopyResult,
} from "@/lib/copy-orchestrator/deepseek-copy";

export {
  runDetailCopyPipeline,
  type DetailCopyPipelineResult,
} from "@/lib/copy-orchestrator/pipeline";
