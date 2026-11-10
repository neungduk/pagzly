/**
 * 508 — OCR 줄을 ExtractedPdf / payload 형태로 변환 (sizePt=0).
 */
import type { ExtractedPdf } from "@/lib/label-check/extract-pdf";
import { countHangulChars } from "@/lib/label-check/extract-pdf";
import type { ExtractedLabelPayload } from "@/lib/label-check/extracted-payload-shared";
import type { OcrLine508 } from "@/lib/label-check/ocr/provider";
import { MIN_CHARS_483 } from "@/lib/label-check/types";

export function ocrLinesToExtractedPdf508(
  lines: OcrLine508[],
  opts?: { avgConfidence?: number; pageCount?: number },
): ExtractedPdf {
  const text = lines.map((l) => l.text).join("\n");
  const charCount = [...text.replace(/\s+/g, "")].length;
  const hangulCount = countHangulChars(text);
  const items = lines.map((l) => ({ text: l.text, sizePt: 0 }));
  return {
    text,
    charCount,
    hangulCount,
    readable: charCount >= MIN_CHARS_483,
    fontSizesPt: null,
    textItems: items.length ? items : null,
    emptyPages: [],
    pageCount: opts?.pageCount ?? 1,
    pages: [{ page: 1, items }],
    avgOcrConfidence: opts?.avgConfidence ?? null,
    ocrSizeUnknown: true,
    extractSource: "ocr",
  };
}

export function ocrTextToPayload508(text: string): ExtractedLabelPayload {
  const lines = text.split(/\n/).filter((l) => l.trim());
  return {
    pageCount: 1,
    pages: [
      {
        page: 1,
        items: lines.map((t) => ({ text: t, sizePt: 0 })),
      },
    ],
    emptyPages: lines.length ? [] : [1],
  };
}
