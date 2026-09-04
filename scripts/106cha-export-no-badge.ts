/**
 * 106차 — export HTML에 판매자 배지 마크업 없는지
 *   npx tsx scripts/106cha-export-no-badge.ts
 */
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "테스트",
    imageIndex: 0,
  },
  {
    type: "gallery",
    slot: "gallery",
    heading: "갤러리",
    imageIndexes: [0, 1],
  },
  {
    type: "ai_disclosure",
    slot: "ai_disclosure",
    heading: "AI 생성 콘텐츠 안내",
    body: "일부 연출 컷은 AI가 생성한 이미지이며 실제 제품 및 사용 환경과 차이가 있을 수 있습니다.",
  },
];

const html = buildDetailPageHtml({
  productName: "테스트상품",
  category: "화장품/뷰티",
  sections,
  imageUrls: [
    "https://example.com/a-lifestyle-ai-1.png",
    "https://example.com/b.png",
  ],
  theme: getCategoryTheme("화장품/뷰티"),
});

assert(!html.includes("AI 연출 이미지"), "badge text must not appear in export");
assert(!html.includes("AI 연출 배경·인물"), "new badge text must not appear in export");
assert(!html.includes("data-seller-only-badge"), "seller badge attr must not appear");
assert(html.includes("AI 생성") || html.includes("연출"), "consumer disclosure ok");

console.log("106cha export-no-badge OK");
