# 37차 Cursor 브리프 — 요금제 상수 SSOT 파일 신규 생성

생성: 2026-08-31
근거: `claude/pagzly-pricing-cost-model-2026.md` (2026-08-31 설계안, deok 확정)
범위: **결제·구독·크레딧 잔액 로직 없음.** 순수 상수/타입 정의 파일 1개만 신규 생성.

---

## 1. 배경

요금제 숫자(티어 가격, 크레딧 팩, 무료 크레딧, 재시도 규칙)는 확정됐지만 PG사(결제대행사)가 아직 정해지지 않았습니다. PG 연동 로직을 짜기 전에, 확정된 숫자만 코드에 SSOT(Single Source of Truth)로 먼저 넣어두면:
- 나중에 결제 로직·랜딩페이지 UI·크레딧 차감 로직이 전부 이 파일 하나만 참조하면 됨
- PG 연동이 늦어져도 랜딩페이지 요금제 UI는 먼저 이 숫자로 교체 가능
- 아직 아무 데서도 이 파일을 import하지 않으므로 회귀 위험이 전혀 없음

---

## 2. 신규 파일 — `lib/cost/saas-pricing-config.ts`

기존 `lib/cost/pricing-config.ts`(API 단가/원가 계산용, 있음)와는 별도 파일입니다. 이름 그대로 새로 만드세요.

```ts
// Pagzly 요금제 SSOT (Single Source of Truth).
// 근거: claude/pagzly-pricing-cost-model-2026.md (2026-08-31 설계안)
//
// 주의: 이 파일은 순수 상수/타입 정의만 담는다. 결제·구독·크레딧 잔액
// 차감 로직은 PG(결제대행사) 확정 후 별도 브리프로 연동한다. 이 라운드에서는
// 이 파일을 어디에서도 import하지 않는다 (아직 소비하는 코드가 없음).

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
 * 짧은/긴 구성 모드는 이 규칙에 영향 없음 — 원가 대부분이 섹션 수가 아니라
 * 사진 보정 파이프라인(배경 생성 + 업로드 사진 장수)에서 나오기 때문.
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
```

---

## 3. 하드 룰

1. **이 파일 하나만 신규 생성.** 다른 파일을 수정하거나 이 파일을 import하는 코드를 추가하지 않는다 (랜딩 요금제 UI 교체, 크레딧 잔액 차감 로직 연동은 각각 별도 브리프).
2. **DB 마이그레이션 없음.** `profiles.credit_balance`, `credit_ledger` 같은 테이블/컬럼은 이번에 만들지 않는다.
3. **결제·PG 관련 코드 없음.** Stripe/토스페이먼츠/포트원 SDK를 설치하거나 import하지 않는다.
4. 숫자는 브리프에 적힌 값을 그대로 사용 — 임의로 반올림하거나 조정하지 않는다.

---

## 4. 검증 체크리스트

- [ ] `npx tsc --noEmit` — 에러 0건 (새 파일이 다른 파일에서 import되지 않으므로 사실상 이 파일 자체의 타입 오류만 체크하면 됨)
- [ ] 기존 `lib/cost/pricing-config.ts`를 건드리지 않았는지 확인 (git diff에 이 파일이 나오면 안 됨)
- [ ] 신규 파일 외 변경된 파일이 없는지 확인

---

## 5. 완료 보고 형식

변경 파일(신규 1개만 있어야 함), `tsc --noEmit` 결과만 간단히 보고해 주시면 됩니다. 이번 건은 로직 연동이 없어 재검증도 가볍게 끝날 예정입니다.
