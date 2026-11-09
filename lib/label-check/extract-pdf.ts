/**
 * 483 — PDF 텍스트 추출(무료). 본문은 로그에 남기지 않음.
 * pdf-parse + 샘플 PDF UTF-8 마커 병합.
 */
import { MIN_CHARS_483 } from "@/lib/label-check/types";

const BEGIN = "%LABELCHECK_TEXT_BEGIN%";
const END = "%LABELCHECK_TEXT_END%";

export type ExtractedPdf = {
  text: string;
  charCount: number;
  readable: boolean;
  /** 폰트 크기(pt) 샘플 — 없으면 null */
  fontSizesPt: number[] | null;
};

function markerText(buffer: Buffer): string {
  const raw = buffer.toString("utf8");
  const a = raw.indexOf(BEGIN);
  const b = raw.indexOf(END);
  if (a < 0 || b < 0 || b <= a) return "";
  return raw.slice(a + BEGIN.length, b).replace(/^\n+|\n+$/g, "").trim();
}

async function pdfParseText(buffer: Buffer): Promise<string> {
  try {
    // index.js 디버그 분기 회피 (pdf-parse 패키지 내부 경로)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text?: string }>;
    const result = await pdfParse(buffer);
    return typeof result.text === "string" ? result.text : "";
  } catch {
    return "";
  }
}

/** 스트림에서 /Tf 앞 숫자로 폰트 크기 추정(가능할 때만) */
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
  const fromParse = (await pdfParseText(buffer)).replace(/\u0000/g, " ").trim();
  const fromMarker = markerText(buffer);
  // 마커(한글 안정)를 우선, 파서 결과는 보조
  const text = [fromMarker, fromParse].filter(Boolean).join("\n").trim();
  const charCount = [...text.replace(/\s+/g, "")].length;
  const fontSizesPt = guessFontSizesPt(buffer);
  return {
    text,
    charCount,
    readable: charCount >= MIN_CHARS_483,
    fontSizesPt,
  };
}
