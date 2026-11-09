/**
 * 499 — 서버 검증·ExtractedPdf 변환(클라 번들에 넣지 말 것).
 */
import {
  countHangulChars,
  softNormalize,
  type ExtractedPdf,
} from "@/lib/label-check/extract-pdf";
import type { LabelCheckErrorCode } from "@/lib/label-check/api-errors";
import { MIN_CHARS_483 } from "@/lib/label-check/types";
import {
  MAX_EXTRACTED_ITEM_CHARS_499,
  MAX_EXTRACTED_ITEMS_499,
  MAX_EXTRACTED_JSON_BYTES_499,
  MAX_EXTRACTED_TOTAL_CHARS_499,
  MAX_PDF_PAGES_485,
  type ExtractedLabelItem,
  type ExtractedLabelPage,
  type ExtractedLabelPayload,
} from "@/lib/label-check/extracted-payload-shared";

export type {
  ExtractedLabelItem,
  ExtractedLabelPage,
  ExtractedLabelPayload,
} from "@/lib/label-check/extracted-payload-shared";
export {
  MAX_CLIENT_PDF_BYTES_499,
  MAX_EXTRACTED_JSON_BYTES_499,
  MAX_EXTRACTED_ITEMS_499,
  MAX_EXTRACTED_ITEM_CHARS_499,
  MAX_EXTRACTED_TOTAL_CHARS_499,
} from "@/lib/label-check/extracted-payload-shared";

export function pagesTextFromPayload(payload: ExtractedLabelPayload): string {
  return softNormalize(
    payload.pages
      .map((p) => p.items.map((i) => i.text).join(""))
      .filter((t) => t.trim())
      .join("\n"),
  );
}

export function payloadToExtractedPdf(payload: ExtractedLabelPayload): ExtractedPdf {
  const text = pagesTextFromPayload(payload);
  const allItems = payload.pages.flatMap((p) =>
    p.items.map((i) => ({ text: i.text.normalize("NFC"), sizePt: i.sizePt })),
  );
  const textItems = allItems.filter((i) => i.sizePt > 0);
  const charCount = [...text.replace(/\s+/g, "")].length;
  const hangulCount = countHangulChars(text);
  const fontSizesPt = textItems.length
    ? [...new Set(textItems.map((i) => i.sizePt))].sort((a, b) => a - b)
    : null;
  return {
    text,
    charCount,
    hangulCount,
    readable: charCount >= MIN_CHARS_483,
    fontSizesPt: fontSizesPt && fontSizesPt.length ? fontSizesPt : null,
    textItems: textItems.length ? textItems : null,
    emptyPages: payload.emptyPages,
    pageCount: payload.pageCount,
    pages: payload.pages,
  };
}

export function extractedPdfToPayload(extracted: ExtractedPdf): ExtractedLabelPayload | null {
  const pageCount = extracted.pageCount ?? 1;
  if (extracted.pages?.length) {
    return {
      pageCount,
      pages: extracted.pages.map((p) => ({
        page: p.page,
        items: p.items.map((i) => ({ text: i.text, sizePt: i.sizePt })),
      })),
      emptyPages: extracted.emptyPages ?? [],
    };
  }
  if (extracted.textItems?.length && pageCount >= 1) {
    const pages: ExtractedLabelPage[] = Array.from({ length: pageCount }, (_, i) => ({
      page: i + 1,
      items: [] as ExtractedLabelItem[],
    }));
    pages[0].items = extracted.textItems.map((i) => ({ text: i.text, sizePt: i.sizePt }));
    return {
      pageCount,
      pages,
      emptyPages: extracted.emptyPages ?? [],
    };
  }
  if (extracted.text) {
    return {
      pageCount: Math.max(1, pageCount),
      pages: [{ page: 1, items: [{ text: extracted.text, sizePt: 0 }] }],
      emptyPages: extracted.emptyPages ?? [],
    };
  }
  return {
    pageCount: Math.max(1, pageCount),
    pages: Array.from({ length: Math.max(1, pageCount) }, (_, i) => ({
      page: i + 1,
      items: [] as ExtractedLabelItem[],
    })),
    emptyPages:
      extracted.emptyPages ??
      Array.from({ length: Math.max(1, pageCount) }, (_, i) => i + 1),
  };
}

export type PayloadValidation =
  | { ok: true; payload: ExtractedLabelPayload }
  | { ok: false; code: LabelCheckErrorCode; error: string };

export function validateExtractedPayload(
  raw: unknown,
  jsonBytes?: number,
): PayloadValidation {
  if (jsonBytes != null && jsonBytes > MAX_EXTRACTED_JSON_BYTES_499) {
    return { ok: false, code: "TOO_LARGE", error: "extracted_json_too_large" };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "BAD_REQUEST", error: "extracted_not_object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.pageCount !== "number" || !Number.isFinite(o.pageCount) || o.pageCount < 1) {
    return { ok: false, code: "BAD_REQUEST", error: "pageCount" };
  }
  if (o.pageCount > MAX_PDF_PAGES_485) {
    return { ok: false, code: "TOO_MANY_PAGES", error: "pageCount" };
  }
  if (!Array.isArray(o.pages) || !Array.isArray(o.emptyPages)) {
    return { ok: false, code: "BAD_REQUEST", error: "pages_or_emptyPages" };
  }
  if (o.pages.length > MAX_PDF_PAGES_485 + 2) {
    return { ok: false, code: "TOO_LARGE", error: "too_many_page_entries" };
  }

  let itemCount = 0;
  let totalChars = 0;
  const pages: ExtractedLabelPage[] = [];
  for (const p of o.pages) {
    if (!p || typeof p !== "object") {
      return { ok: false, code: "BAD_REQUEST", error: "page_entry" };
    }
    const page = p as Record<string, unknown>;
    if (typeof page.page !== "number" || page.page < 1 || !Number.isFinite(page.page)) {
      return { ok: false, code: "BAD_REQUEST", error: "page_number" };
    }
    if (!Array.isArray(page.items)) {
      return { ok: false, code: "BAD_REQUEST", error: "page_items" };
    }
    const items: ExtractedLabelItem[] = [];
    for (const it of page.items) {
      itemCount += 1;
      if (itemCount > MAX_EXTRACTED_ITEMS_499) {
        return { ok: false, code: "TOO_LARGE", error: "too_many_items" };
      }
      if (!it || typeof it !== "object") {
        return { ok: false, code: "BAD_REQUEST", error: "item" };
      }
      const item = it as Record<string, unknown>;
      if (typeof item.text !== "string") {
        return { ok: false, code: "BAD_REQUEST", error: "item_text" };
      }
      if (item.text.length > MAX_EXTRACTED_ITEM_CHARS_499) {
        return { ok: false, code: "TOO_LARGE", error: "item_too_long" };
      }
      if (typeof item.sizePt !== "number" || !Number.isFinite(item.sizePt) || item.sizePt < 0) {
        return { ok: false, code: "BAD_REQUEST", error: "sizePt" };
      }
      totalChars += item.text.length;
      if (totalChars > MAX_EXTRACTED_TOTAL_CHARS_499) {
        return { ok: false, code: "TOO_LARGE", error: "total_chars" };
      }
      items.push({ text: item.text, sizePt: item.sizePt });
    }
    pages.push({ page: page.page, items });
  }

  const emptyPages: number[] = [];
  for (const n of o.emptyPages) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 1) {
      return { ok: false, code: "BAD_REQUEST", error: "emptyPages" };
    }
    emptyPages.push(n);
  }

  return {
    ok: true,
    payload: {
      pageCount: o.pageCount,
      pages,
      emptyPages,
    },
  };
}
