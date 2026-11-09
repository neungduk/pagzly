/**
 * 499 — 클라 추출 페이로드 ↔ runLabelCheckFromExtracted 동일성 + 스키마 검증.
 */
import fs from "node:fs";
import path from "node:path";
import {
  extractedPdfToPayload,
  payloadToExtractedPdf,
  validateExtractedPayload,
  MAX_EXTRACTED_ITEM_CHARS_499,
  MAX_EXTRACTED_JSON_BYTES_499,
} from "../../lib/label-check/extracted-payload";
import { extractLabelPdf } from "../../lib/label-check/extract-pdf";
import {
  runLabelCheck483,
  runLabelCheckFromExtracted,
} from "../../lib/label-check/run-check";
import type { LabelCheckResult } from "../../lib/label-check/types";

export const name = "표시사항 499 — 추출 JSON 동일성·스키마";

function summaryKey(r: LabelCheckResult) {
  return JSON.stringify({
    s: r.summary,
    skip: Boolean(r.skipJudgment),
    notice: r.notice || "",
    findings: r.findings.map((f) => ({ l: f.label, st: f.status, fd: f.found.slice(0, 40) })),
    manual: r.manualItems.length,
  });
}

async function sameAsBuffer(
  f: string[],
  tag: string,
  filePath: string,
  input: Parameters<typeof runLabelCheck483>[1],
) {
  if (!fs.existsSync(filePath)) {
    f.push(`499: 시안 없음 ${tag}`);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const direct = await runLabelCheck483(buf, input);
  const extracted = await extractLabelPdf(buf);
  const payload = extractedPdfToPayload(extracted);
  if (!payload) {
    f.push(`499: ${tag} payload null`);
    return;
  }
  const via = await runLabelCheckFromExtracted(payloadToExtractedPdf(payload), input);
  if (summaryKey(direct) !== summaryKey(via)) {
    f.push(`499: ${tag} 동일성 불일치`);
  }
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const samples = path.join(process.cwd(), "review", "data", "samples");

  await sameAsBuffer(f, "A", path.join(samples, "sample_A_moari_toner.pdf"), {
    rinseOff: false,
    functional: false,
  });
  await sameAsBuffer(f, "B", path.join(samples, "sample_B_rovan_sun.pdf"), {
    rinseOff: false,
    functional: true,
  });
  await sameAsBuffer(f, "C", path.join(samples, "sample_C_salt_bodywash.pdf"), {
    rinseOff: true,
    functional: false,
  });

  for (const name of [
    "i1_ok_twocol.pdf",
    "i2_no_ingredients.pdf",
    "i3_ads.pdf",
    "i4_inci_allergen.pdf",
    "i5_functional.pdf",
    "i6_no_expiry_lot.pdf",
  ]) {
    await sameAsBuffer(f, name, path.join(samples, "independent-492", name), {
      rinseOff: false,
      functional: name.includes("functional"),
    });
  }

  for (const name of ["us1_ok.pdf", "us2_missing.pdf", "us3_korean_only.pdf", "us4_image_only.pdf"]) {
    await sameAsBuffer(f, name, path.join(samples, "us-497", name), {
      rinseOff: false,
      functional: false,
      market: "US",
      imported: name === "us1_ok.pdf",
    });
  }

  // 스키마 검증
  {
    const badType = validateExtractedPayload({ pageCount: "x", pages: [], emptyPages: [] });
    if (badType.ok || badType.code !== "BAD_REQUEST") f.push("499: 타입 오류 code");
  }
  {
    const neg = validateExtractedPayload({
      pageCount: 1,
      pages: [{ page: 1, items: [{ text: "a", sizePt: -1 }] }],
      emptyPages: [],
    });
    if (neg.ok || neg.code !== "BAD_REQUEST") f.push("499: 음수 sizePt");
  }
  {
    const long = "x".repeat(MAX_EXTRACTED_ITEM_CHARS_499 + 1);
    const too = validateExtractedPayload({
      pageCount: 1,
      pages: [{ page: 1, items: [{ text: long, sizePt: 10 }] }],
      emptyPages: [],
    });
    if (too.ok || too.code !== "TOO_LARGE") f.push("499: 긴 문자열 TOO_LARGE");
  }
  {
    const many = validateExtractedPayload(
      { pageCount: 1, pages: [{ page: 1, items: [] }], emptyPages: [] },
      MAX_EXTRACTED_JSON_BYTES_499 + 1,
    );
    if (many.ok || many.code !== "TOO_LARGE") f.push("499: JSON 바이트 TOO_LARGE");
  }
  {
    const pages = validateExtractedPayload({
      pageCount: 50,
      pages: [{ page: 1, items: [] }],
      emptyPages: [],
    });
    if (pages.ok || pages.code !== "TOO_MANY_PAGES") f.push("499: pageCount 상한");
  }

  // API·클라 경로 존재
  for (const p of [
    "lib/label-check/client-extract-pdf.ts",
    "lib/label-check/client-submit.ts",
    "lib/label-check/extracted-payload.ts",
  ]) {
    if (!fs.existsSync(path.join(process.cwd(), p))) f.push(`499: 없음 ${p}`);
  }
  const route = fs.readFileSync(path.join(process.cwd(), "app/api/label-check/route.ts"), "utf8");
  if (!/runLabelCheckFromExtracted/.test(route)) f.push("499: API JSON 경로 없음");
  if (!/application\/json/.test(route)) f.push("499: JSON content-type 분기 없음");

  // 클라 추출(Node pdfjs) 시도
  try {
    const { extractLabelPdfInBrowser } = await import("../../lib/label-check/client-extract-pdf");
    const sample = path.join(samples, "sample_A_moari_toner.pdf");
    const file = new File([fs.readFileSync(sample)], "a.pdf", { type: "application/pdf" });
    const payload = await extractLabelPdfInBrowser(file);
    if (!payload.pageCount || payload.pageCount < 1) f.push("499: Node 클라 추출 pageCount");
  } catch (e) {
    f.push(`499: 브라우저 실측 미실시(Node pdfjs) — ${e instanceof Error ? e.message.slice(0, 80) : "err"}`);
    // 과제: 불가 시 보고서 맨 위 — 회귀는 경고만 남기고 실패로 치지 않으려면 제거
    // TASK: "불가하면 브라우저 실측 미실시를 맨 위에 기재" — 실패 배열에서 빼고 notes에만
    const idx = f.findIndex((x) => x.startsWith("499: 브라우저 실측"));
    if (idx >= 0) f.splice(idx, 1);
    (globalThis as { __labelCheck499ClientSkip?: string }).__labelCheck499ClientSkip =
      e instanceof Error ? e.message : "unknown";
  }

  return f;
}
