/**
 * 524 — 브라우저에서 PDF를 글자 층(text) / OCR 경로로 나눈다.
 * 서버 모듈 import 금지. 임계값은 decideTextLayer518·MIN_CHARS_483 재사용.
 */
import type { ExtractedLabelPayload } from "@/lib/label-check/extracted-payload-shared";
import {
  decideTextLayer518,
  TEXT_LAYER_MIN_CHARS_518,
} from "@/lib/label-check/ocr/text-layer-518";

export type PdfRoute524 = "text" | "ocr" | "unknown";

export type PdfRouteProbeMeta524 = {
  route: PdfRoute524;
  charCount: number;
  pageCount: number;
  hangulCount: number;
};

/** PDF MIME/확장자 (클라 판별) */
export function isPdfFile524(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t === "application/pdf" || n.endsWith(".pdf");
}

/**
 * 순수 판단 — 단위 테스트용.
 * - preferText && !mixed → text
 * - mixed → ocr
 * - charCount 0 또는 readable 불가(charCount < 40, run-check와 동일 의미) → ocr
 * - 그 외(한글 부족 등 preferText=false지만 글자 있음) → text(기존 글자 층 경로 유지)
 */
export function decidePdfRoute524(extracted: ExtractedLabelPayload): PdfRoute524 {
  const decision = decideTextLayer518(extracted);
  if (decision.preferText && !decision.mixed) return "text";
  if (decision.mixed) return "ocr";
  // run-check: !readable && charCount < 40  ≈ charCount < MIN_CHARS(40) (readable := charCount >= 40)
  if (decision.charCount === 0 || decision.charCount < TEXT_LAYER_MIN_CHARS_518) return "ocr";
  return "text";
}

function metaFromExtracted(extracted: ExtractedLabelPayload): PdfRouteProbeMeta524 {
  const decision = decideTextLayer518(extracted);
  return {
    route: decidePdfRoute524(extracted),
    charCount: decision.charCount,
    pageCount: extracted.pageCount,
    hangulCount: decision.hangulCount,
  };
}

/**
 * 쪽수 초과(TOO_MANY_PAGES)는 throw — 호출부가 ERR_TOO_MANY_PAGES_485 사용.
 * pdfjs 로드·파싱 실패는 "unknown"(기존 글자 층 경로로 폴백).
 */
export async function probePdfRoute524(file: File): Promise<PdfRoute524> {
  const meta = await probePdfRouteMeta524(file);
  return meta.route;
}

/** lab·진단용: 경로 + 글자 수·쪽수(원문 없음) */
export async function probePdfRouteMeta524(file: File): Promise<PdfRouteProbeMeta524> {
  try {
    const { extractLabelPdfInBrowser } = await import("@/lib/label-check/client-extract-pdf");
    const extracted = await extractLabelPdfInBrowser(file);
    return metaFromExtracted(extracted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "TOO_MANY_PAGES") throw e;
    return { route: "unknown", charCount: 0, pageCount: 0, hangulCount: 0 };
  }
}
