# 94차 — 연간 결제 실제 로직 구현 (80차 UI 후속)

생성: 2026-09-03
전제: 80차에서 `/billing/subscribe`에 "월별/연간" 토글 UI만 만들고 연간 클릭 시 "준비 중" 안내만 뜨게 해뒀습니다(`components/BillingCycleToggle.tsx`). 이번 라운드는 그 토글을 실제 연간 결제·크레딧 지급 로직으로 연결합니다.

## 결정 사항(이번 라운드에서 확정하고 진행) — 다르게 가야 하면 배포 전에 알려주세요

- **연간 가격 = 월 가격 × 10** (2개월 무료 혜택, 일반적인 SaaS 관행). 예: 스타터 29,000원/월 → 290,000원/년.
- **크레딧 지급 방식**: 연간 결제는 가입/갱신 시점에 **12개월치 토큰을 한 번에 선지급**합니다(월별 드립 방식이 아님). 지금 `renew` 크론이 "매월 도는 스케줄러 1개"뿐이라, 월별 드립을 하려면 별도 스케줄러가 하나 더 필요합니다 — 이번 라운드는 기존 스케줄러 하나로 끝낼 수 있는 선지급 방식을 택했습니다. `next_billing_at`도 +1년 뒤로 잡혀서 `renew` 크론은 연간 구독자에게 1년에 한 번만 반응합니다.
- 위 두 가지가 사업적으로 다르게 가야 한다면(예: 연간도 매월 드립) 이번 라운드 배포 후 별도 브리프로 조정 가능합니다 — 이번엔 위 가정으로 진행하세요.

## 작업 A — DB 마이그레이션

새 파일 `supabase/migrations/20260903100000_subscriptions_billing_cycle.sql`:

```sql
-- 연간 결제 지원 (94차, 2026-09-03)
alter table public.subscriptions
  add column billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual'));

comment on column public.subscriptions.billing_cycle is
  '94차 연간 결제. annual은 12개월치 토큰을 가입/갱신 시 선지급하고 next_billing_at을 +1년으로 잡는다.';
```

기존 `payments.purchase_type` check 제약(`'pack_purchase', 'subscription_initial', 'subscription_renewal'`)은 그대로 재사용합니다(연간이든 월간이든 같은 값 사용, 구분은 `subscriptions.billing_cycle`과 `payments.amount`로).

**프로덕션 배포 시**: 코드 배포만으로는 컬럼이 생기지 않습니다 — 프로덕션 Supabase에 이 마이그레이션 적용 필요(30차 R30-B와 동일 주의사항).

## 작업 B — `lib/cost/saas-pricing-config.ts`

```ts
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
```

`monthlyPriceKrw`를 직접 곱해서 쓰는 함수라 `PricingTier`/`PRICING_TIERS` 자체는 변경하지 않습니다(80차 원칙 유지 — 표시 방식만 추가).

## 작업 C — `components/BillingCycleToggle.tsx`를 controlled 컴포넌트로 전환

지금은 내부 `useState`로만 관리하고 연간 클릭 시 "준비 중" 안내만 뜹니다. 부모가 상태를 갖고 내려주는 방식으로 바꾸세요:

```tsx
"use client";

import type { BillingCycle } from "@/lib/cost/saas-pricing-config";

type BillingCycleToggleProps = {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
};

export default function BillingCycleToggle({ value, onChange }: BillingCycleToggleProps) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2" data-testid="billing-cycle-toggle">
      <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            value === "monthly" ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
          }`}
          data-testid="billing-cycle-monthly"
        >
          월별 결제
        </button>
        <button
          type="button"
          onClick={() => onChange("annual")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            value === "annual" ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
          }`}
          data-testid="billing-cycle-annual"
        >
          연간 결제
        </button>
      </div>
      {value === "annual" ? (
        <p
          className="text-xs font-medium text-registration-red"
          data-testid="billing-cycle-annual-badge"
        >
          2개월 무료 혜택 적용 중
        </p>
      ) : null}
    </div>
  );
}
```

"준비 중" 안내(`annualNotice` state)는 제거합니다 — 이제 실제로 동작하기 때문입니다.

## 작업 D — `app/billing/subscribe/page.tsx`

- `cycle` state 추가: `const [cycle, setCycle] = useState<BillingCycle>("monthly");` (import `BillingCycle`, `getPriceForCycle`, `getAnnualPriceKrw` from `@/lib/cost/saas-pricing-config`).
- `<BillingCycleToggle />` 호출을 `<BillingCycleToggle value={cycle} onChange={setCycle} />`로 교체.
- 카드 렌더링에서 가격 표시를 주기에 맞게 변경:
  ```tsx
  const price = getPriceForCycle(tier, cycle);
  const unitLabel = cycle === "annual" ? "원 / 년" : "원 / 월";
  ```
  기존 `{tier.monthlyPriceKrw.toLocaleString("ko-KR")}` / `"원 / 월"` 부분을 위 값으로 교체.
- 연간일 때 카드에 절약 배지 한 줄 추가(가격 아래, tagline 위):
  ```tsx
  {cycle === "annual" ? (
    <p className="mt-1 text-xs text-registration-red">
      월 {Math.round(getAnnualPriceKrw(tier) / 12).toLocaleString("ko-KR")}원 상당 · 2개월 무료
    </p>
  ) : null}
  ```
- `successUrl`에 `&cycle=${cycle}` 쿼리를 추가하세요: `` `${origin}/billing/subscribe/success?tier=${tierId}&cycle=${cycle}` ``.
- **`app/billing/subscribe/success/page.tsx`를 먼저 열어서 실제로 어디서 `/api/billing/subscribe`를 호출하는지 확인하고, 그 호출부의 body에 `billingCycle: cycle`(쿼리에서 읽은 값)을 추가하세요.** 이 브리프 작성 시점엔 success 페이지 내용을 직접 확인하지 못했습니다 — 실제 흐름에 맞게 연결해 주세요.

## 작업 E — `app/api/billing/subscribe/route.ts`

- `body`에 `billingCycle?: string` 추가, 파싱 후 `"monthly" | "annual"`가 아니면 400 `invalid_billing_cycle`으로 거부. 값이 없으면 기본값 `"monthly"`(하위 호환).
- `pricingTier.monthlyPriceKrw` 대신 `getPriceForCycle(pricingTier, billingCycle)`을 결제 금액(`amount`)으로 사용.
- `periodEnd` 계산 분기:
  ```ts
  const periodEnd = new Date(now);
  if (billingCycle === "annual") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  ```
- `subscriptions` upsert에 `billing_cycle: billingCycle` 필드 추가.
- `payments` insert의 `amount`는 `getPriceForCycle(...)` 결과, `credits_granted`는 `getTokensForCycle(pricingTier, billingCycle)`.
- `grant_credits` RPC 호출의 `p_amount`도 `getTokensForCycle(pricingTier, billingCycle)`로 교체(현재 `pricingTier.monthlyTokens` 고정값 사용 중인 부분).

## 작업 F — `app/api/billing/renew/route.ts`

- `select(...)` 목록에 `billing_cycle` 추가.
- 갱신 금액/토큰/기간을 `sub.billing_cycle`에 따라 분기(작업 E와 동일한 `getPriceForCycle`/`getTokensForCycle`/기간 로직 재사용).
- `newPeriodEnd` 계산도 `billing_cycle === "annual"`이면 `setFullYear(+1)`, 아니면 기존 `setMonth(+1)` 유지.

## 하지 않는 것

- 연간→월간 또는 월간→연간 플랜 변경(전환) UI/API 없음 — 이번 범위는 최초 구독 시점에 주기를 고르는 것까지만.
- 연간 결제 중도 해지 시 일할 환불 로직 없음(기존 `cancel` 정책과 동일하게 "다음 갱신부터 중단, 받은 크레딧은 유지"로 처리 — 새 로직 불필요).
- `/billing/packs`(토큰 팩) 페이지는 이번 범위 밖 — 팩은 구독과 무관한 단건 결제라 연간 개념이 없습니다.
- `PRICING_TIERS`의 `monthlyPriceKrw`/`monthlyTokens` 자체 값 변경 없음.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 로컬 Supabase에 마이그레이션 적용 후 `subscriptions.billing_cycle` 컬럼 존재 확인.
- `/billing/subscribe`에서 연간 토글 클릭 시 "2개월 무료" 배지 + 가격이 ×10으로 바뀌는지 데스크톱/모바일 스크린샷.
- 테스트 결제로 연간 구독 1건 완주 → `subscriptions.billing_cycle='annual'`, `next_billing_at`이 +1년, `user_credits.balance`가 월 크레딧×12만큼 늘었는지 확인.
- 월간 구독 플로우(기존)는 회귀 없는지 재확인.

## 완료 보고 체크리스트

- [ ] `subscriptions.billing_cycle` 마이그레이션
- [ ] `getPriceForCycle`/`getTokensForCycle`/`getAnnualPriceKrw`/`ANNUAL_FREE_MONTHS` 추가
- [ ] `BillingCycleToggle` controlled 컴포넌트로 전환, "준비 중" 안내 제거
- [ ] `/billing/subscribe` 페이지 연간 가격·배지 표시
- [ ] `success` 페이지 → `/api/billing/subscribe` 호출부에 `billingCycle` 연결 확인
- [ ] `subscribe/route.ts` 연간 분기(금액/기간/크레딧)
- [ ] `renew/route.ts` 연간 분기(금액/기간/크레딧)
- [ ] 연간·월간 테스트 결제 각 1건 완주 확인
- [ ] `npx tsc --noEmit` 에러 0건
