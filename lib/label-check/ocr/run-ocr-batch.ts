/**
 * 508 — OCR 배치 처리 코어(라우트·회귀에서 공유). fetch 주입 가능.
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
import {
  pickProvider508,
  type OcrProvider508,
  type OcrProviderId508,
} from "@/lib/label-check/ocr/provider";
import { consumeOcrUnits508, ocrPeriodKey508 } from "@/lib/label-check/ocr/usage";

export type OcrBatchInput508 = {
  imagesBase64: string[];
  tileOffsetY?: number[];
  market?: "KR" | "US";
};

export type OcrBatchOk508 = {
  ok: true;
  text: string;
  rawText: string;
  corrections: string[];
  avgConfidence: number;
  netContents: ReturnType<typeof normalizeOcrText508>["netContents"];
  netContentConflict: boolean;
  providerId: OcrProviderId508;
  fallbackFromClova?: boolean;
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
    fetchImpl?: typeof fetch;
    provider?: OcrProvider508;
    providerId?: OcrProviderId508;
    monthlyLimit?: number;
    skipConsume?: boolean;
  },
): Promise<OcrBatchOk508 | OcrBatchFail508> {
  const env = deps.env || process.env;
  const market = input.market === "US" ? "US" : "KR";
  const picked =
    deps.provider && deps.providerId
      ? {
          id: deps.providerId,
          provider: deps.provider,
          tileHeightPx: 2400,
          monthlyLimit: deps.monthlyLimit ?? 900,
          fallbackFromClova: false as boolean | undefined,
        }
      : pickProvider508(market, env, deps.fetchImpl);

  if (!picked) {
    return {
      ok: false,
      code: "OCR_OFF",
      error: "사진에서 글자 읽기가 꺼져 있어요. 문구 붙여넣기로 점검해 주세요.",
    };
  }

  const images = (input.imagesBase64 || []).filter((s) => typeof s === "string" && s.length > 0);
  if (!images.length) {
    return { ok: false, code: "BAD_REQUEST", error: "이미지가 없습니다." };
  }
  if (images.length > OCR_MAX_TILES_PER_JOB_508) {
    return { ok: false, code: "TOO_MANY", error: ERR_OCR_TOO_MANY_TILES_508 };
  }
  const approx = images.reduce((n, s) => n + s.length, 0);
  if (approx > OCR_REQUEST_BODY_MAX_508 * 1.4) {
    return { ok: false, code: "BAD_REQUEST", error: "요청이 너무 큽니다. 조각을 나눠 보내 주세요." };
  }

  if (!deps.skipConsume) {
    const allowed = await consumeOcrUnits508(deps.supabase, images.length, {
      period: ocrPeriodKey508(picked.id),
      limit: picked.monthlyLimit,
    });
    if (!allowed) {
      return { ok: false, code: "OCR_LIMIT", error: ERR_OCR_LIMIT_508 };
    }
  }

  const languageHints = market === "US" ? ["en", "ko"] : ["ko", "en"];

  try {
    const tiles = await picked.provider.annotateDocumentText({
      imagesBase64: images,
      languageHints,
    });
    const offsets =
      input.tileOffsetY && input.tileOffsetY.length === images.length
        ? input.tileOffsetY
        : images.map((_, i) => i * picked.tileHeightPx);
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
      providerId: picked.id,
      fallbackFromClova: picked.fallbackFromClova,
      conflictFinding,
    };
  } catch {
    console.warn("[label-ocr] provider-failed");
    return { ok: false, code: "VISION", error: ERR_OCR_UNAVAILABLE_508 };
  }
}
