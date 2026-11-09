/**
 * 485 — 업로드 안전장치(시그니처·페이지·시간·IP 제한).
 * 파일명·본문은 로그하지 않음.
 */
import { createRequire } from "node:module";
import { SlidingWindowLimiter, clientIpOf } from "@/lib/rate-limit";
import {
  LABEL_CHECK_GUEST_RATE_RULES,
  LABEL_CHECK_MEMBER_RATE_RULES,
} from "@/lib/label-check/member-constants";
import {
  ERR_NOT_PDF_485,
  ERR_TIMEOUT_485,
  ERR_TOO_MANY_PAGES_485,
  ERR_UNREADABLE_PDF_485,
  EXTRACT_TIMEOUT_MS_485,
  MAX_PDF_PAGES_485,
} from "@/lib/label-check/types";

const require = createRequire(import.meta.url);

/** @deprecated 이름 유지 — 비회원 규칙과 동일 */
export const LABEL_CHECK_RATE_RULES = LABEL_CHECK_GUEST_RATE_RULES;

/** 인스턴스 메모리 — 서버리스에서는 인스턴스별·콜드스타트 시 초기화(1차 완충) */
export const labelCheckLimiter = new SlidingWindowLimiter(LABEL_CHECK_GUEST_RATE_RULES);
export const labelCheckMemberLimiter = new SlidingWindowLimiter(LABEL_CHECK_MEMBER_RATE_RULES);

export function labelCheckClientIp(headers: { get(name: string): string | null }): string {
  return clientIpOf(headers);
}

/** 확장자가 아니라 바이트 시그니처 `%PDF-` */
export function hasPdfSignature(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  // BOM/공백 허용 소폭
  const head = buffer.subarray(0, 16).toString("latin1");
  return head.includes("%PDF-");
}

export function assertPdfSignature(buffer: Buffer): string | null {
  return hasPdfSignature(buffer) ? null : ERR_NOT_PDF_485;
}

type PdfJsDoc = {
  numPages: number;
  destroy?: () => Promise<void>;
};

async function loadPdfJsDoc(buffer: Buffer): Promise<PdfJsDoc> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjs = require("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js") as {
    getDocument: (opts: {
      data: Uint8Array;
      disableFontFace?: boolean;
      password?: string;
    }) => { promise: Promise<PdfJsDoc> };
    disableWorker?: boolean;
  };
  if (typeof pdfjs.disableWorker === "boolean") pdfjs.disableWorker = true;
  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
  }).promise;
}

export async function countPdfPages(buffer: Buffer): Promise<{ pages: number } | { error: string }> {
  try {
    const doc = await loadPdfJsDoc(buffer);
    const pages = doc.numPages;
    if (typeof doc.destroy === "function") await doc.destroy().catch(() => undefined);
    if (!Number.isFinite(pages) || pages < 1) return { error: ERR_UNREADABLE_PDF_485 };
    return { pages };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 암호·손상 — 메시지에 경로 넣지 않음
    if (/password|encrypted|InvalidPDF|Missing PDF|FormatError/i.test(msg)) {
      return { error: ERR_UNREADABLE_PDF_485 };
    }
    return { error: ERR_UNREADABLE_PDF_485 };
  }
}

export function assertPageLimit(pages: number): string | null {
  if (pages > MAX_PDF_PAGES_485) return ERR_TOO_MANY_PAGES_485;
  return null;
}

export async function withExtractTimeout<T>(
  work: Promise<T>,
  ms: number = EXTRACT_TIMEOUT_MS_485,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("EXTRACT_TIMEOUT")), ms);
      }),
    ]);
    return { ok: true, value };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "EXTRACT_TIMEOUT" || /timeout/i.test(msg)) {
      return { ok: false, error: ERR_TIMEOUT_485 };
    }
    return { ok: false, error: ERR_UNREADABLE_PDF_485 };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 회귀·로컬: N쪽 최소 PDF(텍스트 거의 없음) */
export function buildMinimalPdfPages(pageCount: number): Buffer {
  const n = Math.max(1, Math.floor(pageCount));
  const objs: Buffer[] = [];
  const enc = (num: number, body: Buffer | string) => {
    const b = typeof body === "string" ? Buffer.from(body, "utf8") : body;
    objs[num] = Buffer.concat([
      Buffer.from(`${num} 0 obj\n`, "utf8"),
      b,
      Buffer.from("\nendobj\n", "utf8"),
    ]);
  };

  enc(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: n }, (_, i) => `${3 + i * 2} 0 R`).join(" ");
  enc(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);

  const streamBody = Buffer.from("BT /F1 12 Tf 40 700 Td (p) Tj ET\n", "utf8");
  for (let i = 0; i < n; i++) {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    enc(
      pageObj,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${3 + n * 2} 0 R >> >> >>`,
    );
    enc(
      contentObj,
      Buffer.concat([
        Buffer.from(`<< /Length ${streamBody.length} >>\nstream\n`, "utf8"),
        streamBody,
        Buffer.from("endstream", "utf8"),
      ]),
    );
  }
  const fontObj = 3 + n * 2;
  enc(fontObj, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets: number[] = [0];
  const last = fontObj;
  for (let num = 1; num <= last; num++) {
    offsets[num] = parts.reduce((a, b) => a + b.length, 0);
    parts.push(objs[num]);
  }
  const xrefStart = parts.reduce((a, b) => a + b.length, 0);
  let xref = `xref\n0 ${last + 1}\n0000000000 65535 f \n`;
  for (let num = 1; num <= last; num++) {
    xref += `${String(offsets[num]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${last + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "utf8"));
  return Buffer.concat(parts);
}
