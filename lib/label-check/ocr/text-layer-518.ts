/**
 * 518 — PDF 글자 레이어가 충분하면 OCR보다 텍스트 우선.
 * 기준: charCount >= 40 이고 hangulCount >= MIN_HANGUL_CHARS_485(10).
 * 일부 페이지만 비어 있으면 혼합(OCR 병행) 안내.
 */
import type { ExtractedLabelPayload } from "@/lib/label-check/extracted-payload-shared";
import { MIN_CHARS_483, MIN_HANGUL_CHARS_485 } from "@/lib/label-check/types";
import { NOTICE_OCR_MIXED_TEXT_518 } from "@/lib/label-check/ocr/constants";

export const TEXT_LAYER_MIN_CHARS_518 = MIN_CHARS_483; // 40
export const TEXT_LAYER_MIN_HANGUL_518 = MIN_HANGUL_CHARS_485; // 10

export type TextLayerDecision518 = {
  preferText: boolean;
  mixed: boolean;
  charCount: number;
  hangulCount: number;
  emptyPageCount: number;
  notice?: string;
  text: string;
};

function countHangul(s: string): number {
  return (s.match(/[\uAC00-\uD7A3]/g) || []).length;
}

export function pagesTextFromPayload518(payload: ExtractedLabelPayload): string {
  return payload.pages
    .map((p) => p.items.map((it) => it.text).join(""))
    .join("\n")
    .trim();
}

export function decideTextLayer518(payload: ExtractedLabelPayload): TextLayerDecision518 {
  const text = pagesTextFromPayload518(payload);
  const compact = text.replace(/\s+/g, "");
  const charCount = [...compact].length;
  const hangulCount = countHangul(text);
  const emptyPageCount = (payload.emptyPages || []).length;
  const hasEmpty = emptyPageCount > 0;
  const preferText =
    charCount >= TEXT_LAYER_MIN_CHARS_518 && hangulCount >= TEXT_LAYER_MIN_HANGUL_518;
  const mixed = preferText && hasEmpty && emptyPageCount < payload.pageCount;
  return {
    preferText,
    mixed,
    charCount,
    hangulCount,
    emptyPageCount,
    notice: mixed ? NOTICE_OCR_MIXED_TEXT_518 : undefined,
    text,
  };
}
