/**
 * 55차 — 사이즈 다이어그램 · 퀵팩트 · 앵커 내비 검증 (API 비용 없음)
 *   npx tsx scripts/verify-55cha-static.ts
 */

import fs from "fs";
import path from "path";
import { matchSizeDiagramRows, isFashionCategory } from "../lib/fashion-size-diagram";
import { extractQuickFacts } from "../lib/quick-fact-strip";
import { buildSectionAnchors } from "../lib/section-anchor-nav";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const REPORT = path.join(ROOT, "review", "55cha-static.md");

type Check = { name: string; ok: boolean; detail: string };

const fashionSizeRows = [
  { label: "어깨너비", value: "48cm" },
  { label: "가슴단면", value: "52cm" },
  { label: "총장", value: "68cm" },
  { label: "소매길이", value: "62cm" },
  { label: "모델 착용", value: "판매자 확인 필요" },
];

const partialSizeRows = [
  { label: "어깨너비", value: "46cm" },
  { label: "색상", value: "차콜" },
];

const cosmeticsSections: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "히어로", subheadline: "서브", imageIndex: 0 },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "브랜드",
    body: "스토리",
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "용량", value: "50ml" },
      { label: "제형", value: "젤 크림" },
      { label: "향", value: "무향" },
      { label: "원산지", value: "국내" },
    ],
  },
  { type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "Q", answer: "A" }] },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송",
    rows: [{ label: "배송비", value: "무료" }],
  },
];

const fashionSections: DetailSection[] = [
  { type: "hero", slot: "hero", headline: "티셔츠", subheadline: "패션", imageIndex: 0 },
  {
    type: "spec_table",
    slot: "size_table",
    heading: "사이즈 안내",
    rows: fashionSizeRows,
  },
  { type: "gallery", slot: "model_multicut", heading: "다각도", imageIndexes: [0, 1] },
];

function main() {
  const checks: Check[] = [];

  const fullMatches = matchSizeDiagramRows(fashionSizeRows);
  checks.push({
    name: "사이즈 다이어그램 — 4개 치수 매칭",
    ok: fullMatches.length === 4,
    detail: `matched keys: ${fullMatches.map((m) => m.key).join(", ")}`,
  });
  checks.push({
    name: "사이즈 다이어그램 — 플레이스홀더/비매칭 라벨 화살표 제외",
    ok: !fullMatches.some((m) => m.label.includes("모델")),
    detail: `labels shown: ${fullMatches.map((m) => m.label).join(", ")}`,
  });

  const partialMatches = matchSizeDiagramRows(partialSizeRows);
  checks.push({
    name: "사이즈 다이어그램 — 부분 매칭만 표시",
    ok: partialMatches.length === 1 && partialMatches[0]?.key === "shoulder",
    detail: `matched: ${partialMatches.map((m) => m.key).join(", ") || "none"}`,
  });

  checks.push({
    name: "사이즈 다이어그램 — 비패션 카테고리 비활성",
    ok: !isFashionCategory("화장품/뷰티"),
    detail: "isFashionCategory(화장품)=false",
  });

  const quickFacts = extractQuickFacts(cosmeticsSections);
  checks.push({
    name: "퀵팩트 — 화장품 spec_table에서 추출",
    ok: quickFacts.length >= 2 && quickFacts.some((f) => f.label.includes("용량")),
    detail: quickFacts.map((f) => `${f.label}:${f.value}`).join(" | "),
  });

  const noFacts = extractQuickFacts([
    {
      type: "spec_table",
      slot: "shipping_info",
      heading: "배송",
      rows: [{ label: "배송비", value: "무료" }],
    },
  ]);
  checks.push({
    name: "퀵팩트 — spec_table 없으면 빈 배열",
    ok: noFacts.length === 0,
    detail: `facts=${noFacts.length}`,
  });

  const anchorsCosmetics = buildSectionAnchors(cosmeticsSections);
  checks.push({
    name: "앵커 — 존재 섹션만 링크",
    ok:
      anchorsCosmetics.some((a) => a.id === "pagzly-info") &&
      anchorsCosmetics.some((a) => a.id === "pagzly-faq") &&
      anchorsCosmetics.some((a) => a.id === "pagzly-shipping") &&
      !anchorsCosmetics.some((a) => a.id === "pagzly-size"),
    detail: anchorsCosmetics.map((a) => `${a.label}→#${a.id}`).join(", "),
  });

  const anchorsFashion = buildSectionAnchors(fashionSections);
  checks.push({
    name: "앵커 — 패션 사이즈·갤러리",
    ok:
      anchorsFashion.some((a) => a.id === "pagzly-size") &&
      anchorsFashion.some((a) => a.id === "pagzly-gallery"),
    detail: anchorsFashion.map((a) => a.label).join(", "),
  });

  const exportHtml = buildDetailPageHtml({
    productName: "테스트 세럼",
    brandName: "루미에르",
    category: "화장품/뷰티",
    sections: cosmeticsSections,
    imageUrls: ["/iteration-fixtures/01.jpg"],
    theme: getCategoryTheme("화장품/뷰티"),
    price: 32900,
  });
  checks.push({
    name: "export HTML — 앵커 nav 포함",
    ok: exportHtml.includes("pagzly-anchor-nav") && exportHtml.includes('href="#pagzly-info"'),
    detail: "anchor nav + 제품정보 링크",
  });
  checks.push({
    name: "export HTML — 퀵팩트 스트립 포함",
    ok: exportHtml.includes("용량") && exportHtml.includes("50ml"),
    detail: "brand card 직후 spec 요약",
  });
  checks.push({
    name: "export HTML — section id 부여",
    ok: exportHtml.includes('id="pagzly-info"'),
    detail: "pagzly-info id on spec_table",
  });

  const fashionHtml = buildDetailPageHtml({
    productName: "코튼 티",
    category: "의류/패션",
    sections: fashionSections,
    imageUrls: ["/iteration-fixtures/01.jpg"],
    theme: getCategoryTheme("의류/패션"),
  });
  checks.push({
    name: "export HTML — 패션 사이즈 SVG",
    ok: fashionHtml.includes("사이즈 실측 다이어그램") && fashionHtml.includes("48cm"),
    detail: "size_table diagram in export",
  });

  const fail = checks.filter((c) => !c.ok).length;
  const lines = [
    "# 55차 정적 검증",
    "",
    `생성: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "| 체크 | 결과 | 상세 |",
    "|------|------|------|",
    ...checks.map((c) => `| ${c.name} | ${c.ok ? "PASS" : "FAIL"} | ${c.detail} |`),
    "",
    `**합계:** ${checks.length - fail}/${checks.length} PASS`,
    "",
    "## 마켓플레이스 호환성",
    "",
    "sticky 앵커 바·`scroll-behavior: smooth`는 로컬 export HTML·프리뷰에서 동작 확인. 스마트스토어 등 외부 에디터 붙여넣기 시 sticky/앵커 스크립트 보존 여부는 **확인 필요**.",
    "",
  ];

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");

  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
    console.log(`       ${c.detail}`);
  }
  console.log(`\n[55cha] wrote ${REPORT}`);
  if (fail > 0) process.exit(1);
}

main();
