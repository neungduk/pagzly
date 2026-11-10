/**
 * 508 — OCR 배치 처리 코어(라우트·회귀에서 공유). Vision fetch 주입 가능.
 */
import {
  ERR_OCR_LIMIT_508,
  ERR_OCR_TOO_MANY_TILES_508,
  ERR_OCR_UNAVAILABLE_508,
  OCR_MAX_TILES_PER_JOB_508,
  OCR_REQUEST_BODY_MAX_508,
} from "@/lib/label-check/ocr/constants";
import {
  averageConfidence508,
  dedupeOverlappingLines508,
  joinLinesText508,
} from "@/lib/label-check/ocr/merge-lines";
import {
  normalizeOcrText508,
  NET_CONTENT_CONFLICT_LABEL_508,
  NET_CONTENT_CONFLICT_SUGGEST_508,
} from "@/lib/label-check/ocr/normalize-ocr";
import { isOcrConfigured508, type OcrProvider508 } from "@/lib/label-check/ocr/provider";
import { createVisionProvider508, type VisionFetch508 } from "@/lib/label-check/ocr/vision-provider";
import { consumeOcrUnits508 } from "@/lib/label-check/ocr/usage";

export type OcrBatchInput508 = {
  /** raw base64 (data-url prefix 없이) */
  imagesBase64: string[];
  /** 각 타일 상단 y(전역). 없으면 index*2400 */
  tileOffsetY?: number[];
};

export type OcrBatchOk508 = {
  ok: true;
  text: string;
  rawText: string;
  corrections: string[];
  avgConfidence: number;
  netContents: ReturnType<typeof normalizeOcrText508>["netContents"];
  netContentConflict: boolean;
  conflictFinding?: {
    label: string;
    suggest: string;
    status: "attention";
  };
};

export type OcrBatchFail508 = {
  ok: false;
  code: "OCR_OFF" | "OCR_LIMIT" | "TOO_MANY" | "BAD_REQUEST" | "VISION" | "SERVER";
  error: string;
};

export async function runOcrBatch508(
  input: OcrBatchInput508,
  deps: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: { rpc: Function };
    env?: NodeJS.ProcessEnv;
    fetchImpl?: VisionFetch508;
    provider?: OcrProvider508;
    skipConsume?: boolean;
  },
): Promise<OcrBatchOk508 | OcrBatchFail508> {
  const env = deps.env || process.env;
  if (!isOcrConfigured508(env) && !deps.provider) {
    return { ok: false, code: "OCR_OFF", error: "사진에서 글자 읽기가 꺼져 있어요. 문구 붙여넣기로 점검해 주세요." };
  }
  const images = (input.imagesBase64 || []).filter((s) => typeof s === "string" && s.length > 0);
  if (!images.length) {
    return { ok: false, code: "BAD_REQUEST", error: "이미지가 없습니다." };
  }
  if (images.length > OCR_MAX_TILES_PER_JOB_508) {
    return { ok: false, code: "TOO_MANY", error: ERR_OCR_TOO_MANY_TILES_508 };
  }
  // 대략적 본문 크기(base64)
  const approx = images.reduce((n, s) => n + s.length, 0);
  if (approx > OCR_REQUEST_BODY_MAX_508 * 1.4) {
    return { ok: false, code: "BAD_REQUEST", error: "요청이 너무 큽니다. 조각을 나눠 보내 주세요." };
  }

  if (!deps.skipConsume) {
    const allowed = await consumeOcrUnits508(deps.supabase, images.length);
    if (!allowed) {
      return { ok: false, code: "OCR_LIMIT", error: ERR_OCR_LIMIT_508 };
    }
  }

  const key = (env.GOOGLE_VISION_API_KEY || "").trim();
  const provider =
    deps.provider ||
    createVisionProvider508({ apiKey: key, fetchImpl: deps.fetchImpl });

  try {
    const tiles = await provider.annotateDocumentText({
      imagesBase64: images,
      languageHints: ["ko", "en"],
    });
    const offsets =
      input.tileOffsetY && input.tileOffsetY.length === images.length
        ? input.tileOffsetY
        : images.map((_, i) => i * 2400);
    const lines = dedupeOverlappingLines508(tiles, offsets);
    const rawText = joinLinesText508(lines) || tiles.map((t) => t.fullText).filter(Boolean).join("\n");
    const avgConfidence = averageConfidence508(lines);
    const norm = normalizeOcrText508(rawText);
    const conflictFinding = norm.netContentConflict
      ? {
          label: NET_CONTENT_CONFLICT_LABEL_508,
          suggest: NET_CONTENT_CONFLICT_SUGGEST_508,
          status: "attention" as const,
        }
      : undefined;
    return {
      ok: true,
      text: norm.text,
      rawText,
      corrections: norm.corrections,
      avgConfidence,
      netContents: norm.netContents,
      netContentConflict: norm.netContentConflict,
      conflictFinding,
    };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 429 || (status && status >= 500)) {
      return { ok: false, code: "VISION", error: ERR_OCR_UNAVAILABLE_508 };
    }
    console.warn("[label-ocr] vision-failed");
    return { ok: false, code: "VISION", error: ERR_OCR_UNAVAILABLE_508 };
  }
}
