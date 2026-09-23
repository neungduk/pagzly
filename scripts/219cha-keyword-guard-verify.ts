/**
 * 219차 — parseMegaKeywordHeading 숫자 토큰 가드 (API 0).
 *   npx tsx scripts/219cha-keyword-guard-verify.ts
 */
import { parseMegaKeywordHeading } from "../lib/detail-visual-enhancements";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function main() {
  const a = parseMegaKeywordHeading("210g/yd");
  assert(a.keyword === null, `210g/yd keyword null (got ${JSON.stringify(a.keyword)})`);
  assert(a.remainder === "210g/yd", `210g/yd remainder intact (got ${JSON.stringify(a.remainder)})`);

  const b = parseMegaKeywordHeading("코튼 100%");
  assert(b.keyword === "코튼", `코튼 100% keyword (got ${JSON.stringify(b.keyword)})`);
  assert(b.remainder === "100%", `코튼 100% remainder (got ${JSON.stringify(b.remainder)})`);

  const c = parseMegaKeywordHeading("수축 2%↓");
  assert(c.keyword === "수축", `수축 2%↓ keyword (got ${JSON.stringify(c.keyword)})`);

  const d = parseMegaKeywordHeading("AURA LAB");
  assert(d.keyword === "AURA", `AURA LAB latin keyword (got ${JSON.stringify(d.keyword)})`);

  const e = parseMegaKeywordHeading("단당 80kg");
  assert(e.keyword === "단당", `단당 80kg still promotes (got ${JSON.stringify(e.keyword)})`);

  console.log("API generate: 0");
  if (process.exitCode) {
    console.error("VERIFY FAILED");
    process.exit(1);
  }
  console.log("VERIFY:0");
}

main();
