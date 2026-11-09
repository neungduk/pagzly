/**
 * 499 — 클라·서버 공용 타입·상수(Node 전용 모듈 import 금지).
 */
import { MAX_PDF_PAGES_485 } from "@/lib/label-check/types";

export type ExtractedLabelItem = { text: string; sizePt: number };
export type ExtractedLabelPage = { page: number; items: ExtractedLabelItem[] };

export type ExtractedLabelPayload = {
  pageCount: number;
  pages: ExtractedLabelPage[];
  emptyPages: number[];
};

/** 클라 파일 선택 상한(메모리 보호) */
export const MAX_CLIENT_PDF_BYTES_499 = 100 * 1024 * 1024;
/** 전송 JSON 상한 */
export const MAX_EXTRACTED_JSON_BYTES_499 = 300 * 1024;
export const MAX_EXTRACTED_ITEMS_499 = 20_000;
export const MAX_EXTRACTED_ITEM_CHARS_499 = 500;
export const MAX_EXTRACTED_TOTAL_CHARS_499 = 200_000;

export { MAX_PDF_PAGES_485 };
