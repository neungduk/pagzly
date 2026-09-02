# 43차 Cursor 브리프 — 구독 갱신 스케줄러

생성: 2026-08-31
근거: `claude/pagzly-billing-architecture-2026.md` §4, 39차(완료, 구독/빌링키)
전제: 테스트 키로 진행. Vercel 배포 기준으로 설계합니다(Vercel Cron Jobs 사용).

---

## 1. 배경

39차에서 만든 구독은 **최초 1회 결제**만 처리합니다. `subscriptions.next_billing_at`이 지나도 아무 일도 일어나지 않아서, 실제로는 한 달 후 자동으로 재청구되지 않습니다. 이번 라운드는 매일 한 번 도는 배치가 갱신 대상 구독을 찾아서 빌링키로 재청구하고, 크레딧을 다시 지급합니다.

## 2. 트리거 방식 — Vercel Cron Jobs

Vercel Cron은 **GET 요청**으로 지정한 경로를 호출합니다(POST 아님 — `pagzly-billing-architecture-2026.md`의 표에는 POST로 적혀 있었는데, 이 부분은 제 문서 오기입니다. GET이 맞습니다).

### 2-1. `vercel.json` (레포 루트에 신규 생성 — 아직 없음)

```json
{
  "crons": [
    { "path": "/api/billing/renew", "schedule": "0 1 * * *" }
  ]
}
```

`0 1 * * *`는 매일 UTC 01:00(한국시간 오전 10시)입니다.

### 2-2. 인증

Vercel Cron이 호출할 때 `Authorization: Bearer $CRON_SECRET` 헤더를 자동으로 붙여줍니다(Vercel 프로젝트 환경변수에 `CRON_SECRET`을 설정해두면). 라우트에서 이 값을 직접 검증합니다 — 이 라우트는 로그인 세션이 없는 서버-투-서버 호출이라 `supabase.auth.getUser()`를 쓸 수 없고, 대신 이 시크릿 하나로 인증합니다.

`.env.local`에도 로컬 테스트용으로 `CRON_SECRET` 값을 하나 추가해 주세요 (아무 랜덤 문자열이면 됩니다). **Vercel 프로젝트 환경변수에도 배포 전 같은 값을 등록해야 합니다** — 이건 코드가 아니라 사업자님이 Vercel 대시보드에서 직접 하셔야 하는 설정이라, 완료 보고에 "로컬 `.env.local`에는 추가했고, Vercel 대시보드 설정은 배포 시 별도 필요"라고 남겨주세요.

## 3. 신규 파일: `app/api/billing/renew/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { chargeBillingKey } from "@/lib/toss/client";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const now = new Date();

  const { data: dueSubscriptions, error: listError } = await serviceClient
    .from("subscriptions")
    .select(
      "user_id, tier_id, toss_customer_key, toss_billing_key, current_period_end, failed_charge_count",
    )
    .eq("status", "active")
    .lte("next_billing_at", now.toISOString());

  if (listError) {
    console.error("[billing/renew] failed to list due subscriptions:", listError);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const summary = { processed: 0, succeeded: 0, failed: 0, suspended: 0 };

  for (const sub of dueSubscriptions ?? []) {
    summary.processed += 1;
    const tier = getPricingTier(sub.tier_id as PricingTierId);
    const periodEnd = new Date(sub.current_period_end ?? now);
    const orderId = `renew_${sub.user_id}_${periodEnd.getTime()}`;

    try {
      // 멱등성: 이 결제 주기에 대해 이미 성공 처리된 적이 있으면 건너뜀
      // (스케줄러가 하루에 두 번 돌거나 수동으로 겹쳐 실행된 경우 대비)
      const { data: existingPayment } = await serviceClient
        .from("payments")
        .select("status")
        .eq("order_id", orderId)
        .maybeSingle();
      if (existingPayment?.status === "done") continue;

      if (!sub.toss_billing_key) throw new Error("no_billing_key");

      const payment = await chargeBillingKey({
        billingKey: sub.toss_billing_key,
        customerKey: sub.toss_customer_key,
        orderId,
        orderName: `Pagzly ${tier.label} 구독 갱신`,
        amount: tier.monthlyPriceKrw,
      });

      const newPeriodEnd = new Date(now);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

      await serviceClient
        .from("subscriptions")
        .update({
          current_period_start: now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_billing_at: newPeriodEnd.toISOString(),
          failed_charge_count: 0,
          updated_at: now.toISOString(),
        })
        .eq("user_id", sub.user_id);

      await serviceClient.from("payments").insert({
        user_id: sub.user_id,
        toss_payment_key: payment.paymentKey,
        order_id: orderId,
        amount: tier.monthlyPriceKrw,
        status: "done",
        purchase_type: "subscription_renewal",
        item_id: sub.tier_id,
        credits_granted: tier.monthlyCredits,
        confirmed_at: now.toISOString(),
      });

      await serviceClient.rpc("grant_credits", {
        p_user_id: sub.user_id,
        p_amount: tier.monthlyCredits,
        p_reason: "subscription_grant",
        p_reference_id: orderId,
      });

      summary.succeeded += 1;
    } catch (err) {
      console.error(`[billing/renew] charge failed for user=${sub.user_id}:`, err);
      const newFailedCount = (sub.failed_charge_count ?? 0) + 1;
      const shouldSuspend = newFailedCount >= 3;

      await serviceClient
        .from("subscriptions")
        .update({
          failed_charge_count: newFailedCount,
          status: shouldSuspend ? "past_due" : "active",
          updated_at: now.toISOString(),
        })
        .eq("user_id", sub.user_id);

      // 실패 기록은 성공용 orderId와 겹치면 안 되므로(재시도 때마다 unique 충돌 방지)
      // 별도 타임스탬프를 붙인 id를 씁니다.
      await serviceClient.from("payments").insert({
        user_id: sub.user_id,
        order_id: `renew_fail_${sub.user_id}_${Date.now()}`,
        amount: tier.monthlyPriceKrw,
        status: "failed",
        purchase_type: "subscription_renewal",
        item_id: sub.tier_id,
      });

      summary.failed += 1;
      if (shouldSuspend) summary.suspended += 1;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
```

## 4. 하드 룰

1. 이 라우트는 **세션 인증이 아니라 `CRON_SECRET` 헤더 인증만** 씁니다 — 로그인한 사용자가 직접 호출할 수 있는 라우트가 아닙니다. `CRON_SECRET`이 설정 안 돼 있거나 헤더가 안 맞으면 무조건 401.
2. 성공 시 사용하는 `orderId`(`renew_${user_id}_${periodEnd}`)는 **결제 주기당 고정값**이라 멱등성 체크에 씁니다. 실패 로그용 `orderId`는 매 시도마다 달라야 하므로 별도로 타임스탬프를 붙입니다 — 이 둘을 섞으면 `payments.order_id` UNIQUE 제약에 걸립니다.
3. 3회 연속 실패하면 `status: 'past_due'`로 바꾸고, 이 라우트의 쿼리 조건(`status = 'active'`)에서 자연히 제외되어 **더 이상 자동 재시도하지 않습니다.** past_due가 된 구독을 되살리는 기능(재결제 유도, 카드 재등록)은 이번 범위 밖입니다 — 나중에 별도 브리프로 다룹니다.
4. 크레딧 지급·구독 갱신·결제 기록은 전부 `createServiceRoleClient()`로만 (기존 하드 룰 유지).
5. 39차의 `/api/billing/subscribe`, `app/billing/subscribe/**`는 이번에 건드리지 않습니다.

## 5. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `CRON_SECRET` 없이 또는 틀린 값으로 `GET /api/billing/renew` 호출 → 401 확인
- [ ] 올바른 `CRON_SECRET`으로 호출 → `{ ok: true, processed: 0, ... }` (지금 당장 갱신 대상이 없으면 0건 정상)
- [ ] **수동 갱신 테스트**: 테스트 계정의 `subscriptions.next_billing_at`을 SQL로 과거 시각으로 바꾼 뒤 다시 호출 → 실제로 토스 빌링키 재청구가 일어나고, `subscriptions.current_period_end`/`next_billing_at`이 한 달 뒤로 갱신되고, `payments`에 `purchase_type='subscription_renewal'` 행이 생기고, `credit_ledger`에 `reason='subscription_grant'` 행이 또 하나 생겨서 `user_credits.balance`가 해당 티어 크레딧만큼 증가하는지 확인
- [ ] 같은 호출을 즉시 한 번 더 실행 → `next_billing_at`이 이미 미래로 갱신됐으니 이번엔 처리 대상 0건(중복 갱신 안 됨) 확인
- [ ] (선택) `toss_billing_key`를 일부러 잘못된 값으로 바꾼 테스트 행으로 실패 케이스 유도 → `failed_charge_count` 증가, 3번째 실패에서 `status: 'past_due'`로 바뀌는지 확인

## 6. 완료 보고 형식

39~42차와 동일 — 변경/신규 파일, `tsc` 결과, `vercel.json` 생성 여부, `.env.local`에 `CRON_SECRET` 추가 여부, 위 체크리스트(특히 수동 갱신 테스트) 실제 결과를 포함해 주세요.
