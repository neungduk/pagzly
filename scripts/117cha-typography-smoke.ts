/**
 * 117차 — 타이포 매핑·export CSS·폴백 스모크
 * 실행: npx tsx scripts/117cha-typography-smoke.ts
 */
import assert from "node:assert/strict";
import {
  buildDetailExportFontCss,
  DETAIL_FONT_STACK,
  DETAIL_GOOGLE_FONTS_URL,
  DETAIL_HEADLINE_FONT_KIND,
  displayHeadlineInlineCss,
  resolveHeadlineFontKind,
  resolveHeadlineFontStack,
} from "../lib/detail-typography";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";

function run() {
  assert.equal(resolveHeadlineFontKind("화장품/뷰티"), "serif");
  assert.equal(resolveHeadlineFontKind("의류/패션"), "serif");
  assert.equal(resolveHeadlineFontKind("식품/건강기능식품"), "serif");
  assert.equal(resolveHeadlineFontKind("전자제품"), "sans-display");
  assert.equal(resolveHeadlineFontKind("생활용품"), "sans-display");
  assert.equal(resolveHeadlineFontKind("반려동물"), "sans-display");

  // 도입 페이스 종류 ≤ 2
  const kinds = new Set(Object.values(DETAIL_HEADLINE_FONT_KIND));
  assert.ok(kinds.size <= 2);

  assert.match(DETAIL_GOOGLE_FONTS_URL, /Noto\+Serif\+KR/);
  assert.match(DETAIL_GOOGLE_FONTS_URL, /display=swap/);
  assert.match(resolveHeadlineFontStack("화장품/뷰티"), /Noto Serif KR/);
  assert.match(resolveHeadlineFontStack("화장품/뷰티"), /Noto Sans KR/); // 폴백
  assert.match(resolveHeadlineFontStack("전자제품"), /Noto Sans KR/);
  assert.doesNotMatch(resolveHeadlineFontStack("전자제품"), /Noto Serif KR/);

  // 본문 스택 불변
  assert.match(DETAIL_FONT_STACK.sans, /Noto Sans KR/);
  assert.match(DETAIL_FONT_STACK.label, /Noto Sans KR/);

  const cssBeauty = buildDetailExportFontCss("화장품/뷰티");
  assert.match(cssBeauty, /pagzly-display-headline/);
  assert.match(cssBeauty, /Noto Serif KR/);
  assert.match(cssBeauty, /body\{[^}]*Noto Sans KR/);

  const cssElec = buildDetailExportFontCss("전자제품");
  assert.match(cssElec, /font-weight:800/);

  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "산뜻한 미스트, 한 번의 분사",
      subheadline: "카멜리아 에센스",
      imageIndex: 0,
    },
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "카멜리아가 남기는 수분막",
      body: "가벼운 분사감.",
      imageIndex: 0,
      imagePosition: "left",
    },
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "스펙",
      rows: [{ label: "용량", value: "35mL" }],
    },
  ];

  const html = buildDetailPageHtml({
    productName: "테스트 미스트",
    category: "화장품/뷰티",
    sections,
    imageUrls: ["https://example.com/a.png"],
    theme: getCategoryTheme("화장품/뷰티"),
  });
  assert.match(html, /Noto\+Serif\+KR/);
  assert.match(html, /pagzly-display-headline/);
  assert.match(html, /Noto Serif KR/);
  // spec 표 라벨은 display 클래스 없이 sans body
  assert.match(html, /용량/);
  assert.match(displayHeadlineInlineCss("화장품/뷰티"), /Noto Serif KR/);

  console.log("117cha-typography-smoke PASS");
}

run();
