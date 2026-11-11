/**
 * 508/509/518 — OCR API 호출(배치 순차) + 텍스트 점검(ocrFromPhoto).
 * 518: PDF 글자 레이어 충분 시 OCR 생략, 품질 메타·저신뢰 줄 전달.
 */
import { readLabelCheckApiFailure } from "@/lib/label-check/api-errors";
import {
  batchOcrTiles508,
  prepareOcrTilesFromFile508,
  type OcrTilePayload508,
  type OcrPrepareMeta518,
} from "@/lib/label-check/client-ocr-prepare";
import {
  ERR_OCR_DAILY_LIMIT_509,
  ERR_OCR_LIMIT_508,
  NOTICE_OCR_DETAIL_PAGE_518,
  NOTICE_OCR_SMALL_IMAGE_518,
  OCR_AVG_LOW_CONF_518,
  OCR_LINE_LOW_CONF_518,
  OCR_SMALL_IMAGE_WIDTH_518,
  PROGRESS_OCR_PREP_508,
  PROGRESS_OCR_READ_508,
} from "@/lib/label-check/ocr/constants";
import { maxTilesPerOcrRequest509 } from "@/lib/label-check/ocr/run-ocr-batch";
import type { OcrProviderId508 } from "@/lib/label-check/ocr/provider";
import type { ClientSubmitOptions, ClientSubmitOk, ClientSubmitFail } from "@/lib/label-check/client-submit";
import { submitLabelCheckTextClient } from "@/lib/label-check/client-submit";
import { decideTextLayer518 } from "@/lib/label-check/ocr/text-layer-518";
import {
  buildOcrQualityMeta518,
  markLowConfidenceLines518,
} from "@/lib/label-check/ocr/quality-518";
import { formatOcrQualityLabel518, looksLikeDetailPage518 } from "@/lib/label-check/ocr/reading-order-518";
import { NOTICE_OCR_MIXED_TEXT_518 } from "@/lib/label-check/ocr/constants";

export type OcrReviewLine518 = {
  text: string;
  confidence: number;
  lowConfidence?: boolean;
};

export type OcrReviewPayload508 = {
  text: string;
  rawText: string;
  corrections: string[];
  avgConfidence: number;
  netContentConflict: boolean;
  lines?: OcrReviewLine518[];
  notices?: string[];
  qualityLabel?: string;
  detailPageHint?: string | null;
  ocrQuality?: {
    avgConfidence: number;
    lowLineCount: number;
    lineCount: number;
    renderScale?: number;
    tiles?: number;
  };
  prepareMeta?: OcrPrepareMeta518;
  textLayerPreferred?: boolean;
  blockForLowQuality?: boolean;
};

export type OcrClientFail509 = {
  ok: false;
  error: string;
  code?: string;
  limitKind?: "monthly" | "daily";
};

export async function fetchOcrAvailable508(
  market: "KR" | "US" = "KR",
): Promise<{
  available: boolean;
  tileHeightPx: number;
  notice: string;
  provider: OcrProviderId508 | null;
}> {
  try {
    const res = await fetch(`/api/label-check/ocr?market=${market}`);
    if (!res.ok) return { available: false, tileHeightPx: 2400, notice: "", provider: null };
    const j = (await res.json()) as {
      available?: boolean;
      tileHeightPx?: number;
      notice?: string;
      provider?: OcrProviderId508 | null;
    };
    return {
      available: Boolean(j.available),
      tileHeightPx: j.tileHeightPx || 2400,
      notice: j.notice || "",
      provider: j.provider === "clova" || j.provider === "google" ? j.provider : null,
    };
  } catch {
    return { available: false, tileHeightPx: 2400, notice: "", provider: null };
  }
}

function isPdfFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = file.name.toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}

export async function runOcrFromFile508(
  file: File,
  onProgress?: (msg: string) => void,
  opts?: { market?: "KR" | "US"; tileHeightPx?: number; provider?: OcrProviderId508 | null },
): Promise<{ ok: true; review: OcrReviewPayload508 } | OcrClientFail509> {
  const market = opts?.market ?? "KR";
  let mixedNotice: string | undefined;

  // A-2: 글자 레이어가 충분하면 OCR 호출 없이 텍스트 우선
  if (isPdfFile(file)) {
    try {
      const { extractLabelPdfInBrowser } = await import("@/lib/label-check/client-extract-pdf");
      const extracted = await extractLabelPdfInBrowser(file);
      const decision = decideTextLayer518(extracted);
      if (decision.preferText && !decision.mixed) {
        onProgress?.(PROGRESS_OCR_READ_508);
        const lines = decision.text.split(/\n/).map((t) => ({
          text: t,
          confidence: 1,
          lowConfidence: false,
        }));
        return {
          ok: true,
          review: {
            text: decision.text,
            rawText: decision.text,
            corrections: [],
            avgConfidence: 1,
            netContentConflict: false,
            lines,
            notices: [],
            qualityLabel: formatOcrQualityLabel518(1),
            detailPageHint: looksLikeDetailPage518(decision.text)
              ? NOTICE_OCR_DETAIL_PAGE_518
              : null,
            ocrQuality: {
              avgConfidence: 1,
              lowLineCount: 0,
              lineCount: lines.length,
            },
            textLayerPreferred: true,
            blockForLowQuality: false,
          },
        };
      }
      if (decision.mixed) mixedNotice = NOTICE_OCR_MIXED_TEXT_518;
    } catch {
      /* 추출 실패 → OCR */
    }
  }

  const prepared = await prepareOcrTilesFromFile508(
    file,
    (n, N) => {
      onProgress?.(PROGRESS_OCR_PREP_508(n, N));
    },
    { tileHeightPx: opts?.tileHeightPx },
  );
  if (!prepared.ok) return prepared;

  onProgress?.(PROGRESS_OCR_READ_508);
  const providerId: OcrProviderId508 = opts?.provider === "clova" ? "clova" : "google";
  const batches = batchOcrTiles508(prepared.tiles, {
    maxTilesPerRequest: maxTilesPerOcrRequest509(providerId),
  });
  const texts: string[] = [];
  const raws: string[] = [];
  const corrections: string[] = [];
  const allLines: OcrReviewLine518[] = [];
  let confSum = 0;
  let confN = 0;
  let conflict = false;

  for (const batch of batches) {
    const body = JSON.stringify({
      imagesBase64: batch.map((t) => t.base64),
      tileOffsetY: batch.map((t) => t.offsetY),
      market,
    });
    const res = await fetch("/api/label-check/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      const raw = await res.text();
      let parsed: { error?: string; code?: string; limitKind?: string } | null = null;
      try {
        parsed = JSON.parse(raw) as { error?: string; code?: string; limitKind?: string };
      } catch {
        parsed = null;
      }
      if (parsed?.code === "OCR_LIMIT") {
        const daily =
          parsed.limitKind === "daily" ||
          parsed.error === ERR_OCR_DAILY_LIMIT_509 ||
          (parsed.error || "").includes("오늘");
        return {
          ok: false,
          error: daily ? ERR_OCR_DAILY_LIMIT_509 : ERR_OCR_LIMIT_508,
          code: "OCR_LIMIT",
          limitKind: daily ? "daily" : "monthly",
        };
      }
      if (parsed?.error) {
        return { ok: false, error: parsed.error, code: parsed.code };
      }
      const fail = await readLabelCheckApiFailure(
        new Response(raw, { status: res.status, headers: res.headers }),
      );
      return { ok: false, error: fail.error, code: fail.code };
    }
    const j = (await res.json()) as {
      text?: string;
      rawText?: string;
      corrections?: string[];
      avgConfidence?: number;
      netContentConflict?: boolean;
      lines?: Array<{ text: string; confidence: number; lowConfidence?: boolean }>;
    };
    if (j.text) texts.push(j.text);
    if (j.rawText) raws.push(j.rawText);
    if (j.corrections?.length) corrections.push(...j.corrections);
    if (typeof j.avgConfidence === "number") {
      confSum += j.avgConfidence;
      confN += 1;
    }
    if (j.netContentConflict) conflict = true;
    if (j.lines?.length) {
      for (const l of j.lines) {
        allLines.push({
          text: l.text,
          confidence: l.confidence,
          lowConfidence: l.lowConfidence ?? l.confidence < OCR_LINE_LOW_CONF_518,
        });
      }
    }
  }

  const fullText = texts.join("\n");
  const avgConfidence = confN ? confSum / confN : 0;
  let lines =
    allLines.length > 0
      ? markLowConfidenceLines518(
          allLines.map((l) => ({
            text: l.text,
            confidence: l.confidence,
            words: [],
          })),
        ).map((l) => ({
          text: l.text,
          confidence: l.confidence,
          lowConfidence: l.lowConfidence,
        }))
      : fullText.split(/\n/).map((t) => ({
          text: t,
          confidence: avgConfidence,
          lowConfidence: avgConfidence < OCR_LINE_LOW_CONF_518,
        }));

  const meta = prepared.meta;
  const quality = buildOcrQualityMeta518({
    lines: lines.map((l) => ({ text: l.text, confidence: l.confidence, words: [] })),
    fullText,
    partialCoverage: meta?.truncated,
    partialPct:
      meta?.truncated && meta.tiles > 0
        ? Math.round((meta.tiles / Math.max(meta.tiles + 1, 20)) * 100)
        : undefined,
    targetWidthUsed: meta?.targetWidth,
    tiles: meta?.tiles,
    renderScale: meta?.renderScale,
    sourceKind: isPdfFile(file) ? "pdf" : "image",
  });

  const notices = [...quality.notices];
  if (mixedNotice) notices.unshift(mixedNotice);
  if (meta && meta.sourceWidth > 0 && meta.sourceWidth < OCR_SMALL_IMAGE_WIDTH_518) {
    notices.unshift(NOTICE_OCR_SMALL_IMAGE_518);
  }

  return {
    ok: true,
    review: {
      text: fullText,
      rawText: raws.join("\n"),
      corrections: [...new Set(corrections)].slice(0, 20),
      avgConfidence,
      netContentConflict: conflict,
      lines,
      notices: [...new Set(notices)],
      qualityLabel: quality.qualityLabel,
      detailPageHint: looksLikeDetailPage518(fullText) ? NOTICE_OCR_DETAIL_PAGE_518 : null,
      ocrQuality: {
        avgConfidence: quality.avgConfidence,
        lowLineCount: quality.lowLineCount,
        lineCount: quality.lineCount,
        renderScale: quality.renderScale,
        tiles: quality.tiles,
      },
      prepareMeta: meta,
      textLayerPreferred: false,
      blockForLowQuality: quality.blockForLowQuality || avgConfidence < OCR_AVG_LOW_CONF_518,
    },
  };
}

export async function submitOcrReviewedText508(
  text: string,
  opts: ClientSubmitOptions & { avgOcrConfidence?: number },
): Promise<ClientSubmitOk | ClientSubmitFail> {
  return submitLabelCheckTextClient(text, {
    ...opts,
    scope: opts.scope ?? "full",
    ocrFromPhoto: true,
    avgOcrConfidence: opts.avgOcrConfidence,
  });
}

export type { OcrTilePayload508 };
