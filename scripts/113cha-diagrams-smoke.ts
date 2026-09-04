/**
 * 113차 — 식품 비율·전자 구성품 다이어그램 스모크
 * 실행: npx tsx scripts/113cha-diagrams-smoke.ts
 */
import assert from "node:assert/strict";
import {
  buildFoodRatioDiagramSvg,
  parseFoodRatioSlices,
  prepareFoodRatioSlices,
} from "../lib/food-ratio-diagram";
import {
  buildPackageContentsDiagramSvg,
  parsePackageContentsList,
  preparePackageContentsItems,
} from "../lib/package-contents-diagram";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";

function run() {
  // --- Food ratio: (a) 입력 충분 ---
  const slices = parseFoodRatioSlices("귀리 40%, 견과 25%, 기타 35%");
  assert.ok(slices && slices.length === 3);
  assert.equal(slices![0]!.percent, 40);
  const foodSvg = buildFoodRatioDiagramSvg(slices!, "#334", "#111");
  assert.match(foodSvg, /data-diagram="food-ratio"/);
  assert.match(foodSvg, /<svg /);
  assert.doesNotMatch(foodSvg, /src=["']https?:\/\//);
  assert.match(foodSvg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(foodSvg, /귀리/);

  // keyFeatures fallback
  assert.ok(prepareFoodRatioSlices(null, "쌀:50%, 보리:50%"));

  // --- Food: (b) 일부 누락 / (c) 없음 ---
  assert.equal(parseFoodRatioSlices("귀리 40%"), null); // 1개만
  assert.equal(parseFoodRatioSlices(""), null);
  assert.equal(parseFoodRatioSlices(null), null);
  assert.equal(prepareFoodRatioSlices(null, null), null);
  assert.equal(buildFoodRatioDiagramSvg([], "#000", "#000"), "");

  // 합이 비현실적
  assert.equal(parseFoodRatioSlices("A 10%, B 10%"), null);

  // 효능 라벨 스킵 → 2개 미만이면 null
  assert.equal(parseFoodRatioSlices("항암성분 40%, 견과 60%"), null);

  // --- Package contents: (a) 충분 ---
  const items = parsePackageContentsList("구성품: 본체, USB 케이블, 설명서");
  assert.ok(items && items.length === 3);
  const pkgSvg = buildPackageContentsDiagramSvg(items!, "#445", "#111");
  assert.match(pkgSvg, /data-diagram="package-contents"/);
  assert.match(pkgSvg, /<svg /);
  assert.doesNotMatch(pkgSvg, /src=["']https?:\/\//);
  assert.match(pkgSvg, /본체/);

  assert.ok(
    preparePackageContentsItems(null, "본체, 어댑터, 설명서")?.length === 3,
  );

  // --- Package: (b)/(c) ---
  assert.equal(parsePackageContentsList("본체만"), null);
  assert.equal(parsePackageContentsList(""), null);
  assert.equal(preparePackageContentsItems(null, null), null);
  assert.equal(buildPackageContentsDiagramSvg([], "#000", "#000"), "");
  assert.equal(parsePackageContentsList("구성품: 판매자 확인 필요, 미정"), null);

  // 모바일 viewBox 폭 ≤ 360 계열
  assert.match(foodSvg, /viewBox="0 0 360/);
  assert.match(pkgSvg, /max-width:360px/);

  // --- export-detail-html 인라인 SVG ---
  const foodSections: DetailSection[] = [
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "성분 정보",
      rows: [{ label: "원산지", value: "국내산" }],
    },
  ];
  const foodHtml = buildDetailPageHtml({
    productName: "귀리바",
    category: "식품/건강기능식품",
    sections: foodSections,
    imageUrls: [],
    theme: getCategoryTheme("식품/건강기능식품"),
    ingredients: "귀리 40%, 견과 25%, 기타 35%",
  });
  assert.match(foodHtml, /data-diagram="food-ratio"/);

  const elecSections: DetailSection[] = [
    {
      type: "image_text",
      slot: "package_contents",
      heading: "구성품",
      body: "본체, 케이블, 설명서",
      imageIndex: 0,
      imagePosition: "left",
    },
  ];
  const elecHtml = buildDetailPageHtml({
    productName: "무선이어폰",
    category: "전자/가전",
    sections: elecSections,
    imageUrls: ["https://example.com/a.png"],
    theme: getCategoryTheme("전자/가전"),
    keyFeatures: null,
  });
  assert.match(elecHtml, /data-diagram="package-contents"/);

  // 입력 없으면 export에도 미포함
  const emptyFood = buildDetailPageHtml({
    productName: "귀리바",
    category: "식품/건강기능식품",
    sections: foodSections,
    imageUrls: [],
    theme: getCategoryTheme("식품/건강기능식품"),
  });
  assert.doesNotMatch(emptyFood, /data-diagram="food-ratio"/);

  console.log("113cha-diagrams-smoke PASS");
}

run();
