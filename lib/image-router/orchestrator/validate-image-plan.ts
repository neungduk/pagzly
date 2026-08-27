import type { ImageAspectRatio, ImageQualityLevel, ImageTaskType } from "@/lib/image-router/types";
import {
  IMAGE_PLAN_ASPECT_RATIOS,
  IMAGE_PLAN_MAX_ITEMS,
  IMAGE_PLAN_MIN_ITEMS,
  IMAGE_PLAN_QUALITY_LEVELS,
  IMAGE_PLAN_TASK_TYPES,
  type ImagePlan,
  type ImagePlanAspectRatio,
  type ImagePlanItem,
  type ImagePlanQualityLevel,
  type ImagePlanTaskType,
} from "@/lib/image-router/orchestrator/image-plan-types";

export class ImagePlanValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid imagePlan: ${issues.join("; ")}`);
    this.name = "ImagePlanValidationError";
    this.issues = issues;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function normalizeQuality(raw: string): ImagePlanQualityLevel | null {
  const upper = raw.trim().toUpperCase();
  if (upper === "PREMIUM" || upper === "STANDARD") return upper;
  const lower = raw.trim().toLowerCase();
  if (lower === "premium") return "PREMIUM";
  if (lower === "standard") return "STANDARD";
  return null;
}

function normalizeAspect(raw: string): ImagePlanAspectRatio | null {
  const t = raw.trim().replace(/\s/g, "");
  if ((IMAGE_PLAN_ASPECT_RATIOS as readonly string[]).includes(t)) {
    return t as ImagePlanAspectRatio;
  }
  // common aliases
  if (t === "4x5" || t === "0.8") return "4:5";
  if (t === "square") return "1:1";
  return null;
}

function normalizeTaskType(raw: string): ImagePlanTaskType | null {
  const t = raw.trim().toUpperCase();
  if ((IMAGE_PLAN_TASK_TYPES as readonly string[]).includes(t)) {
    return t as ImagePlanTaskType;
  }
  return null;
}

/**
 * JSON Schema–style validation for Claude imagePlan.
 * Rejects unknown taskType / quality / aspectRatio; clamps length 5–10.
 */
export function validateImagePlan(raw: unknown): ImagePlan {
  const issues: string[] = [];

  if (!isPlainObject(raw)) {
    throw new ImagePlanValidationError(["root must be an object"]);
  }

  const list = raw.imagePlan;
  if (!Array.isArray(list)) {
    throw new ImagePlanValidationError(["imagePlan must be an array"]);
  }

  if (list.length < IMAGE_PLAN_MIN_ITEMS) {
    issues.push(`imagePlan length ${list.length} < ${IMAGE_PLAN_MIN_ITEMS}`);
  }
  if (list.length > IMAGE_PLAN_MAX_ITEMS) {
    issues.push(`imagePlan length ${list.length} > ${IMAGE_PLAN_MAX_ITEMS}`);
  }

  const items: ImagePlanItem[] = [];

  list.forEach((entry, index) => {
    const path = `imagePlan[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(`${path} must be an object`);
      return;
    }

    const orderRaw = entry.order;
    const order =
      typeof orderRaw === "number" && Number.isFinite(orderRaw)
        ? Math.round(orderRaw)
        : index + 1;

    const taskType = normalizeTaskType(asString(entry.taskType) ?? "");
    if (!taskType) {
      issues.push(
        `${path}.taskType invalid "${String(entry.taskType)}" — allowed: ${IMAGE_PLAN_TASK_TYPES.join(", ")}`,
      );
    }

    const purpose = asString(entry.purpose);
    if (!purpose) issues.push(`${path}.purpose required string`);

    const prompt = asString(entry.prompt);
    if (!prompt) issues.push(`${path}.prompt required string`);

    const qualityLevel = normalizeQuality(asString(entry.qualityLevel) ?? "");
    if (!qualityLevel) {
      issues.push(
        `${path}.qualityLevel invalid "${String(entry.qualityLevel)}" — allowed: ${IMAGE_PLAN_QUALITY_LEVELS.join(", ")}`,
      );
    }

    const aspectRatio = normalizeAspect(asString(entry.aspectRatio) ?? "");
    if (!aspectRatio) {
      issues.push(
        `${path}.aspectRatio invalid "${String(entry.aspectRatio)}" — allowed: ${IMAGE_PLAN_ASPECT_RATIOS.join(", ")}`,
      );
    }

    if (taskType && purpose && prompt && qualityLevel && aspectRatio) {
      items.push({
        order,
        taskType,
        purpose,
        prompt,
        qualityLevel,
        aspectRatio,
      });
    }
  });

  if (issues.length > 0) {
    throw new ImagePlanValidationError(issues);
  }

  items.sort((a, b) => a.order - b.order);
  // re-number sequentially after sort
  const normalized = items.map((item, i) => ({ ...item, order: i + 1 }));

  return { imagePlan: normalized };
}

/** Parse Claude text that may include ```json fences */
export function parseImagePlanJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fence ? fence[1]!.trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    candidate = candidate.slice(start, end + 1);
  }

  // common LLM JSON fixes: trailing commas
  const cleaned = candidate.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new ImagePlanValidationError([
      `Claude response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    ]);
  }
}

export function toRouterQualityLevel(level: ImagePlanQualityLevel): ImageQualityLevel {
  return level === "PREMIUM" ? "premium" : "standard";
}

export function toRouterAspectRatio(ratio: ImagePlanAspectRatio): ImageAspectRatio {
  if (ratio === "4:5") return "3:4"; // closest supported portrait
  return ratio;
}

export function toRouterTaskType(taskType: ImagePlanTaskType): ImageTaskType {
  return taskType;
}

/** JSON Schema document (documentation / tooling) */
export const IMAGE_PLAN_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["imagePlan"],
  additionalProperties: false,
  properties: {
    imagePlan: {
      type: "array",
      minItems: IMAGE_PLAN_MIN_ITEMS,
      maxItems: IMAGE_PLAN_MAX_ITEMS,
      items: {
        type: "object",
        required: ["order", "taskType", "purpose", "prompt", "qualityLevel", "aspectRatio"],
        additionalProperties: false,
        properties: {
          order: { type: "integer", minimum: 1 },
          taskType: { type: "string", enum: [...IMAGE_PLAN_TASK_TYPES] },
          purpose: { type: "string", minLength: 1 },
          prompt: { type: "string", minLength: 1 },
          qualityLevel: { type: "string", enum: [...IMAGE_PLAN_QUALITY_LEVELS] },
          aspectRatio: { type: "string", enum: [...IMAGE_PLAN_ASPECT_RATIOS] },
        },
      },
    },
  },
} as const;
