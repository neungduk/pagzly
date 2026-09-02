/**
 * 57차 B — 크기비교 다이어그램 정적 검증 (API 비용 없음)
 *   npx tsx scripts/verify-57cha-size-compare.ts
 */

import { matchSizeComparisonRows, parseDimensionCm } from "../lib/size-comparison-diagram";
import { isFashionCategory } from "../lib/fashion-size-diagram";

type Check = { name: string; ok: boolean; detail: string };

function main() {
  const checks: Check[] = [];

  checks.push({
    name: "parseDimensionCm — cm/mm",
    ok: parseDimensionCm("16.5cm") === 16.5 && parseDimensionCm("65mm") === 6.5,
    detail: "16.5cm, 65mm",
  });

  const foodRows = [
    { label: "가로", value: "16.5cm" },
    { label: "세로", value: "6.5cm" },
    { label: "중량", value: "200g" },
  ];
  const foodDims = matchSizeComparisonRows(foodRows);
  checks.push({
    name: "식품 — 가로/세로 매칭",
    ok: foodDims.length >= 2,
    detail: foodDims.map((d) => `${d.label}:${d.value}`).join(", "),
  });

  const elecRows = [
    { label: "가로", value: "5.8cm" },
    { label: "높이", value: "3.2cm" },
    { label: "지름", value: "4.1cm" },
  ];
  const elecDims = matchSizeComparisonRows(elecRows);
  checks.push({
    name: "전자 — 가로/높이/지름 매칭",
    ok: elecDims.length >= 2,
    detail: elecDims.map((d) => `${d.label}:${d.value}`).join(", "),
  });

  const placeholder = matchSizeComparisonRows([
    { label: "가로", value: "판매자 확인 필요" },
  ]);
  checks.push({
    name: "플레이스홀더 제외",
    ok: placeholder.length === 0,
    detail: `matched=${placeholder.length}`,
  });

  const fashionSize = matchSizeComparisonRows([
    { label: "어깨너비", value: "48cm" },
  ]);
  checks.push({
    name: "패션 size_table과 분리 — spec_table만 렌더(코드 조건)",
    ok: isFashionCategory("의류/패션") && fashionSize.length > 0,
    detail: "fashion category uses size_table diagram; comparison only when slot=spec_table && !fashion",
  });

  let fail = 0;
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
    console.log(`       ${c.detail}`);
    if (!c.ok) fail += 1;
  }
  if (fail > 0) process.exit(1);
}

main();
