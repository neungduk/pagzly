# 94차 — 연간 결제 실제 로직 구현

생성: 2026-09-03

## 요약

80차 UI 토글을 **실제 연간 결제**에 연결했습니다. 연간가 = 월가 × 10(2개월 무료), 가입/갱신 시 **12개월치 토큰 선지급**, `next_billing_at` +1년.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `supabase/migrations/20260903100000_subscriptions_billing_cycle.sql` | `billing_cycle` 컬럼 |
| `lib/cost/saas-pricing-config.ts` | `BillingCycle`, `getAnnualPriceKrw`, `getPriceForCycle`, `getTokensForCycle` |
| `components/BillingCycleToggle.tsx` | controlled, "준비 중" 제거 |
| `app/billing/subscribe/page.tsx` | cycle state, 연간 가격/배지, successUrl `cycle` |
| `app/billing/subscribe/success/page.tsx` | API body에 `billingCycle` |
| `app/api/billing/subscribe/route.ts` | 금액/기간/토큰/billing_cycle 분기 |
| `app/api/billing/renew/route.ts` | 동일 분기 |

## 프로덕션 마이그레이션

코드에 SQL 파일 포함. Supabase MCP `apply_migration`은 **DB 비밀번호 인증 실패**로 원격 적용되지 않음.

수동 적용:

```sql
-- supabase/migrations/20260903100000_subscriptions_billing_cycle.sql
alter table public.subscriptions
  add column if not exists billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual'));
```

Dashboard SQL Editor 또는 `supabase db push`로 적용 필요. **적용 전 연간 구독 upsert는 실패할 수 있음.**

## 완료 체크리스트

- [x] 마이그레이션 파일
- [x] pricing helpers
- [x] BillingCycleToggle controlled
- [x] subscribe UI
- [x] success → API billingCycle
- [x] subscribe/renew API
- [ ] 실결제 E2E (사용자 확인)
- [ ] tsc — 96과 함께
