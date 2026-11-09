/**
 * 484 — 같은 문구로 생성기별 PDF 비교용 샘플.
 * (a) Chromium Playwright page.pdf
 * (b) LibreOffice — 환경에 없으면 스킵·기록
 * (c) pdfkit + 시스템 맑은 고딕 TTF 임베드
 * (+) Helvetica-only 실패 샘플(확인 불가 경로)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);

const PHRASE =
  "내용량: 100mL / 제조번호: LOT484-TEST / 사용기한: 2028.12.31까지 / 전성분 정제수, 글리세린, 향료, 리모넨";

const outDir = path.join("review", "data", "samples", "generators-484");
fs.mkdirSync(outDir, { recursive: true });

const report = [];

async function buildChromium() {
  const out = path.join(outDir, "gen_chromium.pdf");
  try {
    const html = `<!doctype html><html><head><meta charset="utf-8">
  <style>body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;font-size:12pt;padding:24px;}</style>
  </head><body><p>${PHRASE}</p></body></html>`;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: out, format: "A4", printBackground: true });
    await browser.close();
    report.push({ gen: "chromium", path: out, ok: true });
  } catch (e) {
    // 브라우저 바이너리 없으면 사용자 제공 Chromium 샘플을 동일 문구 비교용으로 복제하지 않고 실패 기록
    report.push({
      gen: "chromium",
      ok: false,
      reason: String(e && e.message ? e.message : e).slice(0, 180),
      fallback: "review/data/samples/sample_A_moari_toner.pdf (사용자 Chromium 임베드 샘플)",
    });
  }
}

function buildPdfkit() {
  const fontPath = "C:\\Windows\\Fonts\\malgun.ttf";
  if (!fs.existsSync(fontPath)) {
    report.push({ gen: "pdfkit-malgun", ok: false, reason: "malgun.ttf 없음" });
    return Promise.resolve();
  }
  const out = path.join(outDir, "gen_pdfkit_malgun.pdf");
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(out);
    doc.pipe(stream);
    doc.font(fontPath).fontSize(12).text(PHRASE);
    doc.end();
    stream.on("finish", () => {
      report.push({ gen: "pdfkit-malgun", path: out, ok: true });
      resolve();
    });
    stream.on("error", reject);
  });
}

function buildLibreOffice() {
  const sofficeCandidates = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ];
  const which = spawnSync("where.exe", ["soffice"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) {
    sofficeCandidates.unshift(which.stdout.trim().split(/\r?\n/)[0]);
  }
  const soffice = sofficeCandidates.find((p) => fs.existsSync(p));
  if (!soffice) {
    report.push({ gen: "libreoffice", ok: false, reason: "LibreOffice 미설치" });
    return;
  }
  const htmlPath = path.join(outDir, "_phrase.html");
  fs.writeFileSync(
    htmlPath,
    `<html><meta charset="utf-8"><body><p>${PHRASE}</p></body></html>`,
    "utf8",
  );
  const r = spawnSync(
    soffice,
    ["--headless", "--convert-to", "pdf", "--outdir", outDir, htmlPath],
    { encoding: "utf8" },
  );
  const produced = path.join(outDir, "_phrase.pdf");
  const dest = path.join(outDir, "gen_libreoffice.pdf");
  if (r.status === 0 && fs.existsSync(produced)) {
    fs.renameSync(produced, dest);
    report.push({ gen: "libreoffice", path: dest, ok: true });
  } else {
    report.push({
      gen: "libreoffice",
      ok: false,
      reason: (r.stderr || r.stdout || "convert 실패").slice(0, 200),
    });
  }
}

function buildEmptyScanLike() {
  // 텍스트 스트림 없음 → 추출 실패 → 확인 불가 안내 검증
  const streamBody = Buffer.from("\n", "utf8");
  const objs = [];
  const enc = (n, body) => {
    objs[n] = Buffer.concat([
      Buffer.from(`${n} 0 obj\n`, "utf8"),
      body,
      Buffer.from("\nendobj\n", "utf8"),
    ]);
  };
  enc(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"));
  enc(2, Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "utf8"));
  enc(
    3,
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>",
      "utf8",
    ),
  );
  enc(
    4,
    Buffer.concat([
      Buffer.from(`<< /Length ${streamBody.length} >>\nstream\n`, "utf8"),
      streamBody,
      Buffer.from("endstream", "utf8"),
    ]),
  );
  const parts = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets = [0];
  for (let n = 1; n <= 4; n++) {
    offsets[n] = parts.reduce((a, b) => a + b.length, 0);
    parts.push(objs[n]);
  }
  const xrefStart = parts.reduce((a, b) => a + b.length, 0);
  let xref = `xref\n0 5\n0000000000 65535 f \n`;
  for (let n = 1; n <= 4; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "utf8"));
  const out = path.join(outDir, "gen_empty_notext.pdf");
  fs.writeFileSync(out, Buffer.concat(parts));
  report.push({ gen: "empty-notext", path: out, ok: true, note: "텍스트 없음→확인 불가" });
}

function buildHelveticaFail() {
  // ASCII-only Helvetica — 한글은 콘텐츠에 넣지 못해 추출 빈약 → 확인 불가 안내 검증용
  const lines = ["net content: 100mL", "LOT484-TEST", "expiry 2028-12-31", "(hangul omitted — no embed)"];
  const streamBody = Buffer.from(
    lines.map((l, i) => `BT /F1 12 Tf 40 ${720 - i * 18} Td (${l}) Tj ET`).join("\n") + "\n",
    "utf8",
  );
  const objs = [];
  const enc = (n, body) => {
    objs[n] = Buffer.concat([
      Buffer.from(`${n} 0 obj\n`, "utf8"),
      body,
      Buffer.from("\nendobj\n", "utf8"),
    ]);
  };
  enc(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "utf8"));
  enc(2, Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "utf8"));
  enc(
    3,
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
      "utf8",
    ),
  );
  enc(
    4,
    Buffer.concat([
      Buffer.from(`<< /Length ${streamBody.length} >>\nstream\n`, "utf8"),
      streamBody,
      Buffer.from("endstream", "utf8"),
    ]),
  );
  enc(5, Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "utf8"));
  const parts = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets = [0];
  for (let n = 1; n <= 5; n++) {
    offsets[n] = parts.reduce((a, b) => a + b.length, 0);
    parts.push(objs[n]);
  }
  const xrefStart = parts.reduce((a, b) => a + b.length, 0);
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let n = 1; n <= 5; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "utf8"));
  const out = path.join(outDir, "gen_helvetica_nohangul.pdf");
  fs.writeFileSync(out, Buffer.concat(parts));
  report.push({ gen: "helvetica-nohangul", path: out, ok: true, note: "한글 미임베드" });
}

await buildChromium();
await buildPdfkit();
buildLibreOffice();
buildHelveticaFail();
buildEmptyScanLike();

fs.writeFileSync(path.join(outDir, "build-report.json"), JSON.stringify({ phrase: PHRASE, report }, null, 2));
console.log(JSON.stringify(report, null, 2));
void require;
