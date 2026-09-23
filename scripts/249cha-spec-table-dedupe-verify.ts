/**
 * 249차 — shipping_info / mergeSpecRows 중복행 제거 검증 (API 0).
 *   npx tsx scripts/249cha-spec-table-dedupe-verify.ts
 */
import {
  enrichSpecTableSection,
  mergeSpecRows,
} from "../lib/enrich-product-sections";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

/** 248차 export에서 관측된 shipping_info AI 원본에 가까운 fixture */
const FIXTURE_248_SHIPPING: { label: string; value: string }[] = [
  { label: "배송비", value: "구매 금액·지역에 따라 달라질 수 있습니다" },
  { label: "배송 기간", value: "판매자 정책을 확인해주세요" },
  { label: "교환·반품", value: "판매자 정책을 확인해주세요" },
  { label: "환불", value: "판매자 정책을 확인해주세요" },
];

const SHIPPING_CANONICAL = ["배송비", "배송기간", "교환·환불"] as const;

/** 수정 전 로직 재현: 누락분 유지를 정확 라벨 비교로 수행 */
function simulateOldMerge(
  existing: { label: string; value: string }[],
): { label: string; value: string }[] {
  const skeleton = [
    { label: "배송비", match: /배송비|배송 요금/ },
    { label: "배송기간", match: /배송기간|출고|발송/ },
    { label: "교환·환불", match: /교환|환불|반품/ },
  ];
  const rowMatches = (row: { label: string }, skel: (typeof skeleton)[number]) => {
    if (row.label.trim() === skel.label) return true;
    return skel.match.test(row.label);
  };
  const PLACEHOLDER = "판매자 확인 필요";
  const merged: { label: string; value: string }[] = [];
  for (const skel of skeleton) {
    const found = existing.find((r) => rowMatches(r, skel));
    const trimmed = found?.value?.trim() ?? "";
    let value = PLACEHOLDER;
    if (trimmed && !trimmed.includes("판매자")) value = trimmed;
    else if (skel.label === "배송비") value = "구매 금액·지역에 따라 달라질 수 있습니다";
    merged.push({ label: skel.label, value });
  }
  for (const row of existing) {
    if (!merged.some((m) => m.label === row.label)) merged.push(row);
  }
  return merged;
}

function countMatches(
  rows: { label: string }[],
  pred: (label: string) => boolean,
): number {
  return rows.filter((r) => pred(r.label)).length;
}

function main() {
  console.log("=== BEFORE (old exact-label append) ===");
  const before = simulateOldMerge(FIXTURE_248_SHIPPING);
  console.log(`rows: ${before.length}`);
  for (const r of before) console.log(`  - ${r.label}: ${r.value}`);
  assert(before.length === 6, `old merge yields 6 rows (got ${before.length})`);

  console.log("\n=== AFTER (249cha mergeSpecRows / enrichSpecTableSection) ===");

  const section: DetailSection & { type: "spec_table" } = {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: FIXTURE_248_SHIPPING,
  };

  const enriched = enrichSpecTableSection(section, "화장품/뷰티", {
    price: 28000,
  });
  const rows = enriched.type === "spec_table" ? enriched.rows : [];

  console.log(`merged rows (${rows.length}):`);
  for (const r of rows) {
    console.log(`  - ${r.label}: ${r.value}`);
  }

  assert(rows.length === 3, `expected 3 rows after dedupe, got ${rows.length}`);
  assert(
    rows.every((r) =>
      SHIPPING_CANONICAL.includes(r.label as (typeof SHIPPING_CANONICAL)[number]),
    ),
    "all rows use SHIPPING_SKELETON canonical labels",
  );
  assert(
    countMatches(rows, (l) => /배송\s*기간|출고|발송/.test(l) || l === "배송기간") === 1,
    "exactly one shipping-period row",
  );
  assert(
    countMatches(rows, (l) => /교환|환불|반품/.test(l)) === 1,
    "exactly one exchange/refund row",
  );
  assert(countMatches(rows, (l) => /배송비/.test(l)) === 1, "exactly one shipping-fee row");

  const direct = mergeSpecRows(
    FIXTURE_248_SHIPPING,
    [
      { label: "배송비", match: /배송비|배송 요금/ },
      { label: "배송기간", match: /배송\s*기간|출고|발송/ },
      { label: "교환·환불", match: /교환|환불|반품/ },
    ],
    { price: 28000 },
  );
  assert(direct.length === 3, `mergeSpecRows direct length 3 (got ${direct.length})`);

  console.log("\n=== regression: beauty product spec_table ===");
  const product: DetailSection & { type: "spec_table" } = {
    type: "spec_table",
    slot: "spec_table",
    heading: "상품 정보",
    rows: [
      { label: "브랜드", value: "라이트 워터" },
      { label: "용량", value: "30mL" },
      { label: "주요 성분", value: "히알루론산" },
      { label: "인증·수상", value: "비건, 더마 테스트" },
    ],
  };
  const productOut = enrichSpecTableSection(product, "화장품/뷰티", {
    brandName: "라이트 워터",
    ingredients: "히알루론산",
    certifications: "비건, 더마 테스트",
  });
  const prows = productOut.type === "spec_table" ? productOut.rows : [];
  console.log(`product rows (${prows.length}):`);
  for (const r of prows) {
    console.log(`  - ${r.label}: ${r.value}`);
  }
  assert(prows.length >= 4, "product spec keeps skeleton coverage");
  assert(
    prows.find((r) => r.label === "브랜드")?.value === "라이트 워터",
    "brand value preserved",
  );
  assert(prows.find((r) => r.label === "용량")?.value === "30mL", "용량 value preserved");

  const withSynonym = enrichSpecTableSection(
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "상품 정보",
      rows: [
        { label: "브랜드", value: "라이트 워터" },
        { label: "내용량", value: "30mL" },
      ],
    },
    "화장품/뷰티",
    { brandName: "라이트 워터" },
  );
  const synRows = withSynonym.type === "spec_table" ? withSynonym.rows : [];
  const volumeish = synRows.filter((r) => /용량|내용량/.test(r.label));
  assert(
    volumeish.length === 1,
    `용량 synonym not duplicated (got ${volumeish.map((r) => r.label).join(",")})`,
  );

  if (process.exitCode) {
    console.error("\n249cha-spec-table-dedupe-verify FAILED");
    process.exit(1);
  }
  console.log("\n249cha-spec-table-dedupe-verify PASSED");
}

main();
