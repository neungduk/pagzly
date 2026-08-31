// Pagzly 요금제 SSOT (Single Source of Truth).
// 근거: claude/pagzly-pricing-cost-model-2026.md (2026-08-31 설계안)

/**
 * 설계 기준 원가 — 완성된 상세페이지 1건당 계획값(원).
 * 실측 확정치가 아니라 계획값이다. `products.generation_cost`에 쌓이는
 * 실데이터로 분기별로 재검증해야 한다.
 */
export const PLANNED_COST_PER_CREDIT_KRW = 250;

export type PricingTierId = "starter" | "growth" | "pro";

export type PricingTier = {
  id: PricingTierId;
  label: string;
  monthlyPriceKrw: number;
  monthlyCredits: number;
};

export const PRICING_TIERS: PricingTier[] = [
  { id: "starter", label: "스타터", monthlyPriceKrw: 29000, monthlyCredits: 10 },
  { id: "growth", label: "그로스", monthlyPriceKrw: 79000, monthlyCredits: 30 },
  { id: "pro", label: "프로", monthlyPriceKrw: 149000, monthlyCredits: 55 },
];

export type CreditPack = {
  id: string;
  label: string;
  priceKrw: number;
  credits: number;
};

/**
 * 구독 없이도 단독 구매 가능한 추가 크레딧 팩.
 * 구독 크레딧보다 크레딧당 단가를 일부러 높게 잡아 구독 유인을 유지한다.
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", label: "5개 팩", priceKrw: 16900, credits: 5 },
  { id: "pack_15", label: "15개 팩", priceKrw: 44900, credits: 15 },
];

/** 가입 시 무료 지급 크레딧 수 */
export const SIGNUP_FREE_CREDITS = 5;

/** 완성(승인 후 최종 저장)된 상세페이지 1건당 차감 크레딧 */
export const CREDIT_COST_PER_COMPLETION = 1;

/**
 * 같은 draftToken(=같은 상품) 안에서 무료로 허용하는 재시도 횟수.
 * 이 한도를 넘기면 RETRY_OVERAGE_CREDIT_COST가 회당 차감된다.
 */
export const FREE_RETRY_LIMITS = {
  /** draft 재생성(카피·배경 후보 다시 뽑기) 무료 허용 횟수 */
  draftRegeneration: 3,
  /** 사진 재보정 무료 허용 횟수 */
  photoReEnhance: 2,
} as const;

/** 무료 한도를 넘긴 재시도 1회당 차감 크레딧 (완성 1건=1보다 훨씬 저렴) */
export const RETRY_OVERAGE_CREDIT_COST = 0.2;

export function getPricingTier(id: PricingTierId): PricingTier {
  return PRICING_TIERS.find((t) => t.id === id) ?? PRICING_TIERS[0]!;
}

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
