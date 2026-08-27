/**
 * Map STEP 9 DetailPageCopy → production DetailSection[] for existing renderer.
 * No HTML — data only.
 */

import type { DetailPageCopy } from "@/lib/copy-orchestrator/types";
import type { PageProductData } from "@/lib/page-pipeline/types";
import type { DetailSection } from "@/lib/types/generate";

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(i, len - 1));
}

/**
 * Build renderer-ready sections from structured copy + available image count.
 */
export function mapCopyToDetailSections(
  copy: DetailPageCopy,
  product: PageProductData,
  imageCount: number,
): DetailSection[] {
  const img = (i: number) => clampIndex(i, Math.max(imageCount, 1));
  const sections: DetailSection[] = [];

  sections.push({
    type: "hero",
    slot: "hero",
    headline: copy.mainHeadline,
    subheadline: copy.subHeadline || undefined,
    imageIndex: img(0),
  });

  const checklistItems = [
    copy.benefit,
    copy.feature,
    ...(product.keyFeatures
      ? product.keyFeatures.split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 2)
      : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (checklistItems.length > 0) {
    sections.push({
      type: "checklist",
      slot: "checklist",
      heading: "핵심 포인트",
      items: checklistItems,
    });
  }

  sections.push({
    type: "image_text",
    slot: "problem_block",
    heading: "이런 고민, 있으신가요?",
    body: copy.problemStatement,
    imageIndex: img(1),
    imagePosition: "right",
  });

  sections.push({
    type: "image_text",
    slot: "solution_block",
    heading: "이렇게 해결합니다",
    body: copy.solutionStatement,
    imageIndex: img(0),
    imagePosition: "left",
  });

  sections.push({
    type: "image_text",
    slot: "feature_highlight",
    heading: copy.feature,
    body: copy.featureDescription,
    imageIndex: img(Math.min(1, Math.max(0, imageCount - 1))),
    imagePosition: "right",
  });

  const highlightCards = copy.sections
    .filter((s) => s.type === "BENEFIT" || s.type === "FEATURE")
    .slice(0, 3)
    .map((s) => ({
      title: s.title.slice(0, 12),
      body: s.body.slice(0, 120),
    }));

  if (highlightCards.length >= 2) {
    sections.push({
      type: "highlight_box",
      slot: "highlight_box",
      heading: "한눈에 보는 포인트",
      cards: highlightCards,
    });
  }

  const usageSection = copy.sections.find((s) => s.type === "USAGE");
  if (usageSection) {
    const parts = usageSection.body
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)
      .slice(0, 3);
    if (parts.length >= 2) {
      sections.push({
        type: "step_card",
        slot: "step_card",
        heading: usageSection.title || "사용 방법",
        steps: parts.map((body, i) => ({
          title: `단계 ${i + 1}`,
          body,
          imageIndex: img(i % Math.max(imageCount, 1)),
        })),
      });
    }
  }

  if (copy.faq.length > 0) {
    sections.push({
      type: "faq",
      slot: "faq",
      heading: "자주 묻는 질문",
      items: copy.faq.map((f) => ({
        question: f.question,
        answer: f.answer,
      })),
    });
  }

  const caution = copy.sections.find((s) => s.type === "CAUTION");
  if (caution?.body) {
    sections.push({
      type: "caution",
      slot: "caution",
      heading: caution.title || "유의사항",
      body: caution.body,
    });
  }

  sections.push({
    type: "cta_price",
    slot: "cta_price",
    price: product.price ?? 0,
    targetCustomer: product.targetCustomer ?? null,
    badges: [copy.cta].filter(Boolean),
  });

  sections.push({
    type: "ai_disclosure",
    slot: "ai_disclosure",
    heading: "안내",
    body: "본 상세페이지의 일부 문구·이미지는 AI로 생성되었습니다. 효능·인증·후기 등 사실은 판매자 입력을 기준으로 합니다.",
  });

  return sections;
}
