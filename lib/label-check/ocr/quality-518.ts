/**
 * 518 — OCR 신뢰도·품질 메타(화면 전용, 원문 저장 금지).
 */
import {
  NOTICE_OCR_DETAIL_PAGE_518,
  NOTICE_OCR_LOW_LINES_518,
  NOTICE_OCR_PARTIAL_FRONT_518,
  OCR_AVG_LOW_CONF_518,
  OCR_LINE_LOW_CONF_518,
  OCR_LOW_CONF_THRESHOLD_509,
} from "@/lib/label-check/ocr/constants";
import {
  formatOcrQualityLabel518,
  isAbnormalCharRatio518,
  looksLikeDetailPage518,
} from "@/lib/label-check/ocr/reading-order-518";
import type { OcrLine508 } from "@/lib/label-check/ocr/provider";

export type OcrQualityMeta518 = {
  avgConfidence: number;
  qualityLabel: string;
  lowLineCount: number;
  lineCount: number;
  renderScale?: number;
  tiles?: number;
  lowConfHints: string[];
  notices: string[];
  partialCoverage: boolean;
  targetWidthUsed?: number;
  pdfPageCount?: number;
  sourceKind?: "pdf" | "image";
  textLayerPreferred?: boolean;
  /** 평균 < 0.6 또는 비정상 글자 비율 → 기존 점검불가 흐름 */
  blockForLowQuality: boolean;
};

export function lineLooksLowConf518(line: OcrLine508): boolean {
  return (line.confidence ?? 1) < OCR_LINE_LOW_CONF_518;
}

export function markLowConfidenceLines518(lines: OcrLine508[]): OcrLine508[] {
  return lines.map((l) => ({
    ...l,
    lowConfidence: lineLooksLowConf518(l),
  }));
}

export function buildOcrQualityMeta518(input: {
  lines: OcrLine508[];
  fullText: string;
  partialCoverage?: boolean;
  partialPct?: number;
  targetWidthUsed?: number;
  tiles?: number;
  renderScale?: number;
  pdfPageCount?: number;
  sourceKind?: "pdf" | "image";
  textLayerPreferred?: boolean;
}): OcrQualityMeta518 {
  const lines = input.lines;
  const avg =
    lines.length === 0
      ? 0
      : lines.reduce((s, l) => s + (l.confidence ?? 0), 0) / lines.length;

  const lowLines = lines.filter(lineLooksLowConf518);
  const lowConfHints = lowLines
    .slice(0, 8)
    .map((l) => (l.text.length > 40 ? `${l.text.slice(0, 40)}…` : l.text));

  const notices: string[] = [];
  if (input.partialCoverage) {
    const pct =
      typeof input.partialPct === "number" && input.partialPct > 0
        ? Math.min(99, Math.round(input.partialPct))
        : 50;
    notices.push(NOTICE_OCR_PARTIAL_FRONT_518(pct));
  }
  if (lowLines.length > 0) notices.push(NOTICE_OCR_LOW_LINES_518);
  if (isAbnormalCharRatio518(input.fullText)) {
    notices.push("글자를 제대로 읽지 못했어요. 다시 찍거나 PDF로 올려 주세요");
  }
  if (looksLikeDetailPage518(input.fullText)) {
    notices.push(NOTICE_OCR_DETAIL_PAGE_518);
  }

  const blockForLowQuality =
    (avg > 0 && avg < OCR_AVG_LOW_CONF_518) ||
    (avg > 0 && avg < OCR_LOW_CONF_THRESHOLD_509 && isAbnormalCharRatio518(input.fullText)) ||
    isAbnormalCharRatio518(input.fullText);

  return {
    avgConfidence: Math.round(avg * 1000) / 1000,
    qualityLabel: formatOcrQualityLabel518(avg),
    lowLineCount: lowLines.length,
    lineCount: lines.length,
    renderScale: input.renderScale,
    tiles: input.tiles,
    lowConfHints,
    notices: [...new Set(notices)],
    partialCoverage: Boolean(input.partialCoverage),
    targetWidthUsed: input.targetWidthUsed,
    pdfPageCount: input.pdfPageCount,
    sourceKind: input.sourceKind,
    textLayerPreferred: input.textLayerPreferred,
    blockForLowQuality,
  };
}
