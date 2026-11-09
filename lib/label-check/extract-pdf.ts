/**
 * 484 — PDF 텍스트 추출(무료). 본문은 로그에 남기지 않음.
 * pdf-parse + (가능 시) pdfjs 텍스트 아이템 transform 글자 크기.
 * 483 UTF-8 마커는 보조(레거시 샘플) — 진짜 PDF는 파서/pdfjs 본문 우선.
 */
import { createRequire } from "node:module";
import { MIN_CHARS_483 } from "@/lib/label-check/types";

const require = createRequire(import.meta.url);

const BEGIN = "%LABELCHECK_TEXT_BEGIN%";
const END = "%LABELCHECK_TEXT_END%";

export type ExtractedPdf = {
  text: string;
  charCount: number;
  /** 한글(가–힣) 글자 수 */
  hangulCount: number;
  readable: boolean;
  /** 폰트 크기(pt) 샘플 — 없으면 null(확인 불가, 통과 금지) */
  fontSizesPt: number[] | null;
  /** 글자별(또는 조각별) 크기 — 알레르기 성분 등 부분 검사 */
  textItems: Array<{ text: string; sizePt: number }> | null;
  /** 497 — 텍스트가 비어 있는 쪽(1-based). 혼합 PDF 안내용 */
  emptyPages?: number[];
  pageCount?: number;
};

/** 497 — 향후 OCR 등 대체 추출. 지금은 미구현(항상 null). */
export type ExtractFallback = {
  name: string;
  extract: (buffer: Buffer) => Promise<string | null>;
};

export async function runExtractFallback(
  _buffer: Buffer,
  fallback: ExtractFallback | null,
): Promise<string | null> {
  if (!fallback) return null;
  try {
    return await fallback.extract(_buffer);
  } catch {
    return null;
  }
}

export function countHangulChars(text: string): number {
  const m = text.normalize("NFC").match(/[가-힣]/g);
  return m ? m.length : 0;
}

/** NFC + 공백·콜론 정규화(항목명 변형: "내 용 량", "내용량 :") */
export function normalizeLabelText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\u0000/g, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/[：﹕]/g, ":")
    .replace(/\s*:\s*/g, ":")
    .replace(/[\s\u00a0\u3000]+/g, "")
    .toLowerCase();
}

/** 표시용 가벼운 정리(스니펫) */
export function softNormalize(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\u0000/g, " ")
    .replace(/[ \t\u00a0\u3000]+/g, " ")
    .replace(/\r\n/g, "\n")
    .trim();
}

function markerText(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  const a = raw.indexOf(BEGIN);
  const b = raw.indexOf(END);
  if (a < 0 || b < 0 || b <= a) return "";
  return raw.slice(a + BEGIN.length, b).replace(/^\n+|\n+$/g, "").trim();
}

async function pdfParseText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
      buf: Buffer,
    ) => Promise<{ text?: string }>;
    const result = await pdfParse(buffer);
    return typeof result.text === "string" ? result.text : "";
  } catch {
    return "";
  }
}

type PdfJsTextItem = { str?: string; transform?: number[] };

async function pdfJsExtract(
  buffer: Buffer,
): Promise<{
  text: string;
  items: Array<{ text: string; sizePt: number }>;
  emptyPages: number[];
  pageCount: number;
} | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjs = require("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js") as {
      getDocument: (opts: { data: Uint8Array; disableFontFace?: boolean }) => {
        promise: Promise<{
          numPages: number;
          getPage: (n: number) => Promise<{
            getTextContent: () => Promise<{ items: PdfJsTextItem[] }>;
          }>;
          destroy?: () => Promise<void>;
        }>;
      };
      disableWorker?: boolean;
    };
    if (typeof pdfjs.disableWorker === "boolean") pdfjs.disableWorker = true;

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
    }).promise;

    try {
      const parts: string[] = [];
      const items: Array<{ text: string; sizePt: number }> = [];
      const emptyPages: number[] = [];

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        let line = "";
        for (const it of content.items) {
          const str = typeof it.str === "string" ? it.str : "";
          if (!str) continue;
          const t = it.transform;
          // Chromium/pdfjs: 렌더 크기는 transform 스케일 (hypot a,b 또는 c,d)
          const sizePt =
            t && t.length >= 4
              ? Math.max(Math.hypot(t[0], t[1]), Math.hypot(t[2], t[3]))
              : 0;
          if (sizePt > 0) {
            items.push({ text: str.normalize("NFC"), sizePt: Math.round(sizePt * 100) / 100 });
          }
          line += str;
        }
        if (line.trim()) parts.push(line);
        else emptyPages.push(p);
      }

      return {
        text: parts.join("\n").normalize("NFC"),
        items,
        emptyPages,
        pageCount: doc.numPages,
      };
    } finally {
      // 498 — 서버리스 메모리: 문서 핸들 해제
      if (typeof doc.destroy === "function") await doc.destroy().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

/** 레거시: 스트림 /Tf 추정 — Chromium에서는 부정확할 수 있어 보조만 */
export function guessFontSizesPt(buffer: Buffer): number[] | null {
  const raw = buffer.toString("latin1");
  const sizes: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s+Tf\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 200) sizes.push(n);
  }
  return sizes.length ? sizes : null;
}

export async function extractLabelPdf(buffer: Buffer): Promise<ExtractedPdf> {
  const fromParse = softNormalize(await pdfParseText(buffer));
  const fromMarker = softNormalize(markerText(buffer));
  const js = await pdfJsExtract(buffer);
  const fromJs = js ? softNormalize(js.text) : "";

  // 진짜 PDF: pdfjs ≈ pdf-parse 본문 우선. 마커는 레거시(한글 미임베드) 보조.
  const primary = fromJs || fromParse;
  const text = softNormalize([primary, fromMarker && !primary ? fromMarker : ""].filter(Boolean).join("\n"));
  // 마커만 있는 레거시: primary 비어 있으면 마커 사용
  let finalText = text || fromMarker || fromParse || fromJs;

  // 497 — OCR 등 fallback 자리(현재 null). 본문 0자일 때만 시도.
  if (![...softNormalize(finalText).replace(/\s+/g, "")].length) {
    const fb = await runExtractFallback(buffer, null);
    if (fb) finalText = softNormalize(fb);
  }

  const normalizedFinal = softNormalize(finalText);

  const charCount = [...normalizedFinal.replace(/\s+/g, "")].length;
  const hangulCount = countHangulChars(normalizedFinal);
  const textItems = js && js.items.length ? js.items : null;
  const fontSizesPt = textItems
    ? [...new Set(textItems.map((i) => i.sizePt))].sort((a, b) => a - b)
    : guessFontSizesPt(buffer);

  return {
    text: normalizedFinal,
    charCount,
    hangulCount,
    readable: charCount >= MIN_CHARS_483,
    fontSizesPt,
    textItems,
    emptyPages: js?.emptyPages,
    pageCount: js?.pageCount,
  };
}

/** 이미지·혼합 PDF 안내 부가(쪽 번호) */
export function emptyPagesNoticeSuffix(extracted: ExtractedPdf): string {
  const pages = extracted.emptyPages;
  const total = extracted.pageCount ?? 0;
  if (!pages?.length || total < 2) return "";
  // 전 쪽이 비면 쪽 나열 생략(전체 이미지 안내와 중복)
  if (pages.length >= total) return "";
  return ` 텍스트가 없는 쪽: ${pages.join(", ")}.`;
}
