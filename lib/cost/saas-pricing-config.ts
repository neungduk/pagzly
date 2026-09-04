// Pagzly 요금제 SSOT (Single Source of Truth).
// 근거: claude/pagzly-pricing-cost-model-2026.md (2026-08-31 설계안)
// 46차: 크레딧 → 토큰 단위(×100 세분화)

/**
 * 설계 기준 원가 — 완성된 상세페이지 1건당 계획값(원).
 * 실측 확정치가 아니라 계획값이다. `products.generation_cost`에 쌓이는
 * 실데이터로 분기별로 재검증해야 한다.
 */
export const PLANNED_COST_PER_TOKEN_KRW = 2.5;

export type PricingTierId = "starter" | "growth" | "pro";

export type PricingTier = {
  id: PricingTierId;
  label: string;
  monthlyPriceKrw: number;
  monthlyTokens: number;
  /** 카드 제목 아래 한 줄 설명 */
  tagline: string;
  /** "OO의 모든 기능 포함" 표시용 (starter는 없음) */
  inheritsFrom?: PricingTierId;
};

/** 모든 유료 플랜에서 동일하게 제공되는 핵심 기능 — 표시용 */
export const PAGZLY_CORE_FEATURES = [
  "AI 상세페이지 자동 생성 (사진 보정 + 카피 + 배경 합성)",
  "레퍼런스 이미지로 초안 자동입력",
  "섹션별 AI 채팅 수정",
  "자유 캔버스 에디터 (텍스트 · 이미지 · 도형 · 표)",
  "GIF 자동 생성",
  "인스타그램 피드 · 블로그 미니 생성",
  "무제한 다운로드",
] as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    label: "스타터",
    monthlyPriceKrw: 29000,
    monthlyTokens: 1000,
    tagline: "이제 막 상세페이지 제작을 시작하는 셀러에게",
  },
  {
    id: "growth",
    label: "그로스",
    monthlyPriceKrw: 79000,
    monthlyTokens: 3000,
    tagline: "여러 상품을 함께 운영하는 셀러에게",
    inheritsFrom: "starter",
  },
  {
    id: "pro",
    label: "프로",
    monthlyPriceKrw: 149000,
    monthlyTokens: 5500,
    tagline: "상세페이지 제작을 본격적으로 늘리는 셀러에게",
    inheritsFrom: "growth",
  },
];

export type CreditPack = {
  id: string;
  label: string;
  priceKrw: number;
  tokens: number;
};

/**
 * 구독 없이도 단독 구매 가능한 추가 토큰 팩.
 * 구독 토큰보다 토큰당 단가를 일부러 높게 잡아 구독 유인을 유지한다.
 */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", label: "500토큰 팩", priceKrw: 16900, tokens: 500 },
  { id: "pack_15", label: "1,500토큰 팩", priceKrw: 44900, tokens: 1500 },
];

/** 가입 시 무료 지급 토큰 수 */
export const SIGNUP_FREE_TOKENS = 500;

/** 완성(승인 후 최종 저장) 1건 차감 토큰 — 짧은/긴 구성 차등 */
export const TOKEN_COST_PER_COMPLETION = {
  short: 80,
  long: 100,
} as const;

/**
 * 같은 draftToken(=같은 상품) 안에서 무료로 허용하는 재시도 횟수.
 * 이 한도를 넘기면 RETRY_OVERAGE_TOKEN_COST가 회당 차감된다 (다음 라운드 연결 예정).
 */
export const FREE_RETRY_LIMITS = {
  /** draft 재생성(카피·배경 후보 다시 뽑기) 무료 허용 횟수 */
  draftRegeneration: 3,
  /** 사진 재보정 무료 허용 횟수 */
  photoReEnhance: 2,
} as const;

/** 무료 한도를 넘긴 재시도 1회당 차감 토큰 (다음 라운드 연결 예정) */
export const RETRY_OVERAGE_TOKEN_COST = 20;

export function getPricingTier(id: PricingTierId): PricingTier {
  return PRICING_TIERS.find((t) => t.id === id) ?? PRICING_TIERS[0]!;
}

export type BillingCycle = "monthly" | "annual";

/** 연간 결제 시 무료로 제공되는 개월 수 (연간가 = 월가 × (12 - ANNUAL_FREE_MONTHS)) */
export const ANNUAL_FREE_MONTHS = 2;

export function getAnnualPriceKrw(tier: PricingTier): number {
  return tier.monthlyPriceKrw * (12 - ANNUAL_FREE_MONTHS);
}

/** 결제 주기별 청구 금액 */
export function getPriceForCycle(tier: PricingTier, cycle: BillingCycle): number {
  return cycle === "annual" ? getAnnualPriceKrw(tier) : tier.monthlyPriceKrw;
}

/** 결제 주기별 이번 청구로 지급할 토큰 수 (연간은 12개월치 선지급) */
export function getTokensForCycle(tier: PricingTier, cycle: BillingCycle): number {
  return cycle === "annual" ? tier.monthlyTokens * 12 : tier.monthlyTokens;
}

export function getCreditPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/** 구성 길이에 따른 완성 1건 토큰 비용 (기본: 긴 구성) */
export function getCompletionTokenCost(length?: string | null): number {
  return length === "short"
    ? TOKEN_COST_PER_COMPLETION.short
    : TOKEN_COST_PER_COMPLETION.long;
}

/** 인스타 피드·블로그 전용 미니 생성 — 완성 1건당 토큰 (최소 사진 5장) */
export const TOKEN_COST_SOCIAL_MINI = 60;

/** 캔버스 AI 이미지 1장 생성 */
export const TOKEN_COST_CANVAS_AI_IMAGE = 20;

/** 미니 생성 최소/최대 사진 장수 */
export const SOCIAL_MINI_MIN_PHOTOS = 5;
export const SOCIAL_MINI_MAX_PHOTOS = 10;
