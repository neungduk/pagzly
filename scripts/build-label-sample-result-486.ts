/**
 * 486 — 가상 브랜드 샘플 A 결과를 정적 JSON으로 저장.
 * 사용: npx tsx scripts/build-label-sample-result-486.ts
 */
import fs from "node:fs";
import path from "node:path";
import { runLabelCheck483 } from "../lib/label-check/run-check";

async function main() {
  const pdfPath = path.join(process.cwd(), "review/data/samples/sample_A_moari_toner.pdf");
  const outPath = path.join(process.cwd(), "lib/label-check/sample-result-a.json");
  if (!fs.existsSync(pdfPath)) {
    console.error("missing sample A PDF");
    process.exit(1);
  }
  const result = await runLabelCheck483(fs.readFileSync(pdfPath), {
    rinseOff: false,
    functional: false,
  });
  const payload = {
    meta: {
      sample: "A",
      brand: "가상 브랜드",
      product: "모아리 수분 토너",
      note: "가상 브랜드 예시입니다. 실제 상품 데이터가 아닙니다.",
    },
    result,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log("wrote", outPath);
}

void main();
