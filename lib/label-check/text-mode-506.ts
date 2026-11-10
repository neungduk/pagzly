/**
 * 506 — 문구 붙여넣기 → ExtractedPdf(1쪽, 크기 없음).
 */
import type { ExtractedPdf } from "@/lib/label-check/extract-pdf";
import { countHangulChars } from "@/lib/label-check/extract-pdf";
import {
  MAX_TEXT_MODE_CHARS_506,
  type LabelCheckScope506,
} from "@/lib/label-check/types";

export function parseTextModeScope506(raw: unknown): LabelCheckScope506 {
  return raw === "full" ? "full" : "ad_only";
}

export function textToExtractedPdf506(text: string): ExtractedPdf {
  const cleaned = text.replace(/\r\n/g, "\n");
  return {
    text: cleaned,
    charCount: cleaned.length,
    hangulCount: countHangulChars(cleaned),
    readable: cleaned.trim().length > 0,
    pageCount: 1,
    emptyPages: [],
    /** 텍스트 모드: 크기 정보 없음 → 글자 크기 판정 제외 */
    fontSizesPt: null,
    textItems: null,
  };
}

export function assertTextModeLength506(
  text: string,
): "ok" | "empty" | "too_large" {
  if (!text || !text.trim()) return "empty";
  if ([...text].length > MAX_TEXT_MODE_CHARS_506) return "too_large";
  return "ok";
}
