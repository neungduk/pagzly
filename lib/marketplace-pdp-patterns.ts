/**
 * 2026 한국 이커머스·AI 상세페이지 공통 모듈 패턴.
 * 경쟁사 랜딩·마켓 가이드·디자이너 PDP 리서치를 프롬프트·후처리에 주입한다.
 * 근거: scripts/marketplace-pdp-scan.ts → review/marketplace-pdp-learning-2026.md
 */

/** Page Maker / 스마트스토어 / DTC에서 반복되는 모듈 (크롤 키워드 매칭용) */
export const MARKETPLACE_PDP_MODULES = [
  {
    id: "hero_hook",
    label: "히어로 훅",
    keywords: ["대표", "히어로", "첫 화면", "above the fold", "3초"],
    pagzly: "hero + badge",
  },
  {
    id: "benefit_ribbon",
    label: "혜택 요약 스트립",
    keywords: ["무료배송", "혜택", "쿠폰", "당일발송", "적립"],
    pagzly: "TrustStrip (배송·인증·CTA 배지)",
  },
  {
    id: "key_points",
    label: "핵심 포인트 3~4",
    keywords: ["핵심", "포인트", "checklist", "키워드"],
    pagzly: "checklist 4열",
  },
  {
    id: "editorial_scene",
    label: "풀폭 사용 장면",
    keywords: ["사용 장면", "코디", "착용", "lifestyle", "에디토리얼"],
    pagzly: "editorial bleed image_text",
  },
  {
    id: "step_howto",
    label: "사용법 스텝",
    keywords: ["사용법", "how to", "step", "단계"],
    pagzly: "step_card 3단",
  },
  {
    id: "social_proof",
    label: "리뷰·신뢰",
    keywords: ["리뷰", "후기", "평점", "구매자"],
    pagzly: "review_highlight (입력 리뷰만)",
  },
  {
    id: "spec_compliance",
    label: "고시·스펙 표",
    keywords: ["상품정보", "고시", "스펙", "info", "원산지"],
    pagzly: "spec_table + shipping_info",
  },
  {
    id: "faq_objection",
    label: "FAQ 이의 처리",
    keywords: ["faq", "자주 묻", "질문"],
    pagzly: "faq 카드형",
  },
  {
    id: "sticky_cta",
    label: "하단 고정 CTA",
    keywords: ["구매", "cta", "장바구니", "sticky"],
    pagzly: "cta_price sticky",
  },
  {
    id: "shortform_motion",
    label: "숏폼·GIF",
    keywords: ["gif", "동영상", "숏폼", "video", "모션"],
    pagzly: "custom_gif + GSAP reveal",
  },
] as const;

const BENEFIT_PATTERNS: Array<{ pattern: RegExp; chip: string }> = [
  { pattern: /무료\s*배송/i, chip: "무료배송" },
  { pattern: /당일\s*(발송|출고|배송)/i, chip: "당일발송" },
  { pattern: /새벽\s*배송/i, chip: "새벽배송" },
  { pattern: /무료\s*교환/i, chip: "무료교환" },
  { pattern: /무료\s*반품/i, chip: "무료반품" },
  { pattern: /적립/i, chip: "적립혜택" },
];

/** 크롤 텍스트에서 모듈 신호 히트 수 */
export function scoreMarketplaceModules(text: string): Array<{
  id: string;
  label: string;
  hits: number;
  pagzly: string;
}> {
  const lower = text.toLowerCase();
  return MARKETPLACE_PDP_MODULES.map((mod) => {
    const hits = mod.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    return { id: mod.id, label: mod.label, hits, pagzly: mod.pagzly };
  }).sort((a, b) => b.hits - a.hits);
}

/** AI 프롬프트용 — 마켓 PDP 6블록 + 2026 CRO */
export function buildMarketplacePatternGuide(category: string): string {
  return `

## 마켓플레이스 상세 구조 (2026 스마트스토어·쿠팡·DTC 공통)
- **6블록 흐름**: ①대표(히어로) → ②혜택·핵심 요약 → ③이미지 스토리 → ④신뢰(리뷰·고시) → ⑤FAQ·주의 → ⑥CTA.
- **첫 화면 3초**: hero headline은 질문·숫자·한 줄 훅. subheadline에 상품명 또는 타겟 한 줄.
- **혜택 스트립**: 무료배송·당일발송·인증·용량 등 **입력에 있는 사실만** cta_price badges·shipping_info·hero badge에 반영.
- **한 화면 한 메시지**: 스크롤 구간 8~12개. 비슷한 image_text 연속 시 각기 다른 각도·장면.
- **모바일 퍼스트**: headline 22자 이내, body 2~3문장, 카드형은 checklist·highlight_box만.
- **신뢰는 근거만**: 리뷰는 입력된 요약만. 가짜 평점·인증 마크·QC 그리드 금지.
- 카테고리: ${category}`;
}

/** 혜택 키워드 — keyFeatures·배송 행에서 추출 (가짜 혜택 생성 금지) */
export function extractBenefitKeywords(
  sources: Array<string | null | undefined>,
): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || t.length > 24) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    chips.push(t);
  };

  for (const src of sources) {
    if (!src?.trim()) continue;
    for (const { pattern, chip } of BENEFIT_PATTERNS) {
      if (pattern.test(src)) add(chip);
    }
    const commaParts = src.split(/[,/|·\n]/).map((s) => s.trim()).filter((s) => s.length <= 16);
    for (const part of commaParts) {
      if (/^(무료배송|당일발송|새벽배송|무료교환|무향|유기농|친환경)$/i.test(part)) add(part);
      else if (/^KC\s?인증$/i.test(part)) add(part);
      else if (/배송|발송|적립/i.test(part) && part.length <= 12) add(part);
    }
  }
  return chips.slice(0, 4);
}
