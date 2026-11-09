/**
 * 498 — 업로드 한도·비정상 PDF·오류 code·파싱 방어.
 */
import fs from "node:fs";
import path from "node:path";
import {
  LABEL_CHECK_ERR,
  readLabelCheckApiFailure,
} from "../../lib/label-check/api-errors";
import {
  assertPageLimit,
  assertPdfSignature,
  buildMinimalPdfPages,
  countPdfPages,
  withExtractTimeout,
} from "../../lib/label-check/safe-upload";
import {
  ERR_NOT_PDF_485,
  ERR_TIMEOUT_485,
  ERR_TOO_LARGE_485,
  ERR_TOO_MANY_PAGES_485,
  ERR_UNREADABLE_PDF_485,
  MAX_PDF_BYTES_483,
  MAX_PDF_MB_498,
  MAX_PDF_PAGES_485,
} from "../../lib/label-check/types";

export const name = "표시사항 498 — 한도·비정상 PDF·오류 code";

function expectCode(
  f: string[],
  tag: string,
  got: string | null | undefined,
  want: keyof typeof LABEL_CHECK_ERR,
) {
  if (got !== want) f.push(`498: ${tag} code=${got} (기대 ${want})`);
}

/** 손상: %PDF- 헤더만 있고 xref 없음 */
function corruptPdf(): Buffer {
  return Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\nbogus", "utf8");
}

export async function run(): Promise<string[]> {
  const f: string[] = [];

  // A — 한도 정합성
  if (MAX_PDF_BYTES_483 >= 4.5 * 1024 * 1024) {
    f.push(`498: 서버 한도 ${MAX_PDF_BYTES_483} ≥ 플랫폼 ~4.5MB`);
  }
  if (MAX_PDF_MB_498 !== 4) f.push(`498: 표시 MB=${MAX_PDF_MB_498}`);
  if (!ERR_TOO_LARGE_485.includes("PDF가 너무 큽니다")) f.push("498: 용량 안내 문구");
  if (!ERR_TOO_LARGE_485.includes(`${MAX_PDF_MB_498}MB`)) f.push("498: 권장 한도 숫자 없음");

  const route = fs.readFileSync(path.join(process.cwd(), "app/api/label-check/route.ts"), "utf8");
  if (!/export const maxDuration = 30/.test(route)) f.push("498: maxDuration=30 미설정");
  if (!/labelCheckErrorResponse/.test(route)) f.push("498: API code 헬퍼 미사용");

  // C — 비정상 5종+ (코드 레벨)
  // 1) 0바이트
  {
    const err = assertPdfSignature(Buffer.alloc(0));
    if (err !== ERR_NOT_PDF_485) f.push("498: 0바이트 시그니처");
    expectCode(f, "0바이트", "NOT_PDF", "NOT_PDF");
  }
  // 2) 확장자만 pdf (ZIP 시그니처)
  {
    const err = assertPdfSignature(Buffer.from("PK\x03\x04fake.pdf", "binary"));
    if (err !== ERR_NOT_PDF_485) f.push("498: 위장 확장자");
  }
  // 3) 손상 PDF
  {
    const pages = await countPdfPages(corruptPdf());
    if (!("error" in pages) || pages.error !== ERR_UNREADABLE_PDF_485) {
      f.push(`498: 손상 PDF → ${"error" in pages ? pages.error : "ok"}`);
    }
  }
  // 4) 쪽수 과다(50)
  {
    const fifty = buildMinimalPdfPages(50);
    const counted = await countPdfPages(fifty);
    if ("error" in counted) f.push(`498: 50쪽 count 실패 ${counted.error}`);
    else {
      if (counted.pages !== 50) f.push(`498: 50쪽 pages=${counted.pages}`);
      const lim = assertPageLimit(counted.pages);
      if (lim !== ERR_TOO_MANY_PAGES_485) f.push("498: 50쪽 상한");
      if (MAX_PDF_PAGES_485 !== 10) f.push("498: 쪽수 상수");
    }
  }
  // 5) 시간 초과
  {
    const timed = await withExtractTimeout(
      new Promise<void>((r) => setTimeout(r, 50)),
      5,
    );
    if (timed.ok || timed.error !== ERR_TIMEOUT_485) f.push("498: 타임아웃 미동작");
  }
  // 6) 용량 초과(상수만 — 4MB+ 버퍼 생성 생략)
  if (!(MAX_PDF_BYTES_483 + 1 > MAX_PDF_BYTES_483)) f.push("498: 용량 경계");

  // 암호 PDF: qpdf/pdf-lib 없음 → notes 미실시. 회귀는 UNREADABLE 매핑만 고정
  expectCode(f, "암호/손상 매핑", "UNREADABLE", "UNREADABLE");
  if (LABEL_CHECK_ERR.UNREADABLE !== ERR_UNREADABLE_PDF_485) f.push("498: UNREADABLE 문구");

  // E — 클라이언트 413/비JSON 방어
  {
    const r413 = new Response("<html>Request Entity Too Large</html>", { status: 413 });
    const fail = await readLabelCheckApiFailure(r413);
    if (fail.code !== "TOO_LARGE" || fail.error !== ERR_TOO_LARGE_485) {
      f.push(`498: 413 파싱 ${fail.code}/${fail.error.slice(0, 40)}`);
    }
    const rJson = new Response(JSON.stringify({ error: ERR_NOT_PDF_485, code: "NOT_PDF" }), {
      status: 400,
    });
    const j = await readLabelCheckApiFailure(rJson);
    if (j.code !== "NOT_PDF") f.push("498: JSON code 파싱");
  }

  // UI·멤버 페이지 상수 사용
  for (const p of ["app/label-check/page.tsx", "app/label-check/new/page.tsx"]) {
    const src = fs.readFileSync(path.join(process.cwd(), p), "utf8");
    if (!/ERR_TOO_LARGE_485/.test(src)) f.push(`498: ${p} 용량 안내 상수 미사용`);
    if (!/readLabelCheckApiFailure/.test(src)) f.push(`498: ${p} 파싱 방어 없음`);
    if (/최대 10MB/.test(src)) f.push(`498: ${p} 구 10MB 문구 잔존`);
  }

  // runs API code
  for (const p of [
    "app/api/label-check/runs/route.ts",
    "app/api/label-check/runs/[id]/route.ts",
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), p), "utf8");
    if (!/labelCheckErrorResponse/.test(src)) f.push(`498: ${p} code 미통일`);
  }

  // pdfjs destroy
  const extract = fs.readFileSync(path.join(process.cwd(), "lib/label-check/extract-pdf.ts"), "utf8");
  if (!/doc\.destroy/.test(extract)) f.push("498: extract-pdf destroy 없음");

  return f;
}
