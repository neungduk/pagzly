/**
 * 503 — 표시사항 회귀용 PDF 픽스처 생성(Playwright). 회귀 폴더에서는 실행하지 않음.
 * 출력: review/data/samples/regression-503/
 * 실행: npx tsx scripts/label-check-make-fixtures-492.ts
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry(
  "label-check-make-fixtures-492",
  typeof require !== "undefined" && typeof module !== "undefined"
    ? require.main === module
    : Boolean(process.argv[1]?.includes("label-check-make-fixtures-492")),
);

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  BASE_FIELDS_FOR_TEST,
  buildMutationCases,
  htmlFromFieldsForTest,
} from "./label-check-mutation-492";

const OUT = path.join("review", "data", "samples", "regression-503");

async function pdfFromHtml(html: string, outFile: string): Promise<number> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: outFile, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
  return fs.statSync(outFile).size;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sizes: Array<{ file: string; bytes: number }> = [];

  const write = async (name: string, html: string) => {
    const p = path.join(OUT, name);
    const bytes = await pdfFromHtml(html, p);
    sizes.push({ file: name, bytes });
    console.log(`${name}\t${bytes}`);
  };

  await write("font-4_9.pdf", htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { ingredientPt: 4.9 }));
  await write("font-5.pdf", htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { ingredientPt: 5.0 }));
  await write(
    "layout-twocol.pdf",
    htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST, { twoCol: true, shuffle: true }),
  );
  await write("base.pdf", htmlFromFieldsForTest(BASE_FIELDS_FOR_TEST));

  const need = buildMutationCases().filter(
    (c) => c.id.startsWith("ad-") || c.id === "inject-forbidden",
  );
  for (const c of need) {
    await write(
      `${c.id}.pdf`,
      htmlFromFieldsForTest(c.fields, { ingredientPt: c.ingredientPt }),
    );
  }

  const total = sizes.reduce((a, s) => a + s.bytes, 0);
  console.log(`total_bytes\t${total}`);
  if (total > 5 * 1024 * 1024) {
    console.error("총 용량 5MB 초과");
    process.exit(1);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
