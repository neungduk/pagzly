/**
 * 212차 — productSizeHint → spec_table 배선 검증 (API 0).
 *   npx tsx scripts/212cha-spec-table-size-hint-verify.ts
 */
import { enrichSectionsWithProductMetadata } from "../lib/enrich-product-sections";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function specSection(rows: { label: string; value: string }[]): DetailSection {
  return {
    type: "spec_table",
    slot: "spec_table",
    heading: "상품 정보",
    rows,
  };
}

function findRow(
  sections: DetailSection[],
  label: string,
): { label: string; value: string } | undefined {
  const sec = sections.find((s) => s.type === "spec_table" && s.slot === "spec_table");
  if (!sec || sec.type !== "spec_table") return undefined;
  return sec.rows.find((r) => r.label === label);
}

function main() {
  const HINT = "35mL, 높이 약 9cm";

  // 1) electronics — size row filled from hint
  {
    const out = enrichSectionsWithProductMetadata(
      [specSection([{ label: "브랜드", value: "아이닉" }])],
      {
        category: "전자제품",
        brandName: "아이닉",
        productSizeHint: HINT,
      },
    );
    const row = findRow(out, "크기·용량·형태");
    assert(!!row, "electronics: 크기·용량·형태 row exists");
    assert(row?.value === HINT, `electronics: value is hint (got ${row?.value})`);
    assert(!row?.value.includes("판매자"), "electronics: not placeholder");
  }

  // 2) beauty — 용량 from hint
  {
    const out = enrichSectionsWithProductMetadata(
      [specSection([{ label: "브랜드", value: "테스트" }])],
      {
        category: "화장품/뷰티",
        brandName: "테스트",
        productSizeHint: HINT,
      },
    );
    const row = findRow(out, "용량");
    assert(row?.value === HINT, `beauty: 용량 from hint (got ${row?.value})`);
  }

  // 3) regression — no hint → placeholder
  {
    const out = enrichSectionsWithProductMetadata(
      [specSection([{ label: "브랜드", value: "아이닉" }])],
      {
        category: "전자제품",
        brandName: "아이닉",
        productSizeHint: null,
      },
    );
    const row = findRow(out, "크기·용량·형태");
    assert(
      row?.value === "판매자 확인 필요",
      `no hint: placeholder (got ${row?.value})`,
    );
  }

  // 4) priority — existing value wins over hint
  {
    const out = enrichSectionsWithProductMetadata(
      [specSection([{ label: "용량", value: "500mL" }])],
      {
        category: "화장품/뷰티",
        brandName: "테스트",
        productSizeHint: HINT,
      },
    );
    const row = findRow(out, "용량");
    assert(row?.value === "500mL", `priority: existing kept (got ${row?.value})`);
  }

  // 5) KC skip when no certifications
  {
    const out = enrichSectionsWithProductMetadata(
      [specSection([{ label: "브랜드", value: "아이닉" }])],
      {
        category: "전자제품",
        brandName: "아이닉",
        certifications: null,
        productSizeHint: HINT,
      },
    );
    const sec = out.find((s) => s.type === "spec_table" && s.slot === "spec_table");
    const hasKc =
      sec?.type === "spec_table" && sec.rows.some((r) => r.label === "KC 인증");
    assert(!hasKc, "KC row omitted when certifications empty");
  }

  console.log("API generate: 0");
  if (process.exitCode) {
    console.error("VERIFY FAILED");
    process.exit(1);
  }
  console.log("VERIFY:0");
}

main();
