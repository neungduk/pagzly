# 40차 Cursor 브리프 — 크레딧 팩 단건 구매

생성: 2026-08-31
근거: `claude/pagzly-billing-architecture-2026.md`, 38차(완료, DB 스키마), 39차(완료, 구독/빌링키 — diff 재검증 완료)
전제: 39차와 동일하게 **테스트 키로만 진행.**
범위: 크레딧 팩(구독 없이 단독 구매 가능) 결제창 → 결제 승인(confirm) → 크레딧 지급까지. `/api/generate` 연동(41차)은 이번에 하지 않습니다.

---

## 1. 배경 — 구독(39차)과 다른 점

39차의 구독 플로우는 **빌링키**(카드 정보를 저장해 매달 자동 청구)를 씁니다. 크레딧 팩은 **1회성 결제**라 빌링키가 필요 없고, 훨씬 단순한 "결제 승인(confirm)" API만 있으면 됩니다. 39차의 `requestBillingAuth()`(카드 등록) 대신 `requestPayment()`(즉시 결제창) 계열 메서드를 씁니다.

## 2. 확인된 사실

- **결제 승인 API**: `POST https://api.tosspayments.com/v1/payments/confirm` — body에 `paymentKey`, `orderId`, `amount`. 인증은 39차와 동일한 Basic 인증(`TOSS_SECRET_KEY`).
- 결제 성공 시 우리가 지정한 `successUrl`에 `paymentKey`, `orderId`, `amount`, `paymentType` 쿼리 파라미터가 붙어 리다이렉트됩니다.
- **금액 위변조 방지가 이번 라운드의 핵심 보안 포인트**: `amount`는 클라이언트가 결제창 열 때도 넣고 리다이렉트로도 돌아오지만, **둘 다 신뢰하지 않습니다.** 서버는 항상 `lib/cost/saas-pricing-config.ts`의 `getCreditPack(packId).priceKrw`로 조회한 값과 대조하고, 다르면 confirm 자체를 호출하지 않고 거부합니다. confirm 응답에 포함된 토스 측 `totalAmount`도 같은 값과 다시 한번 대조합니다(2중 검증).

## 3. 확인이 필요한 부분 (구현 시 Cursor가 직접 확인)

39차와 마찬가지로 클라이언트 SDK의 정확한 메서드가 `payment().requestPayment({...})` 형태인지, 아니면 별도 `widgets()` 초기화 후 `renderPaymentMethods()` + `renderAgreement()` + `requestPayment()` 순서로 결제수단 선택 UI를 직접 렌더링해야 하는 "결제위젯" 형태인지는 `https://docs.tosspayments.com/guides/v2/payment-window/integration`(또는 결제위젯 가이드) 문서에서 구현 전 직접 확인하세요. 39차에서 이미 같은 스크립트(`https://js.tosspayments.com/v2/standard`)를 로드해뒀으니 이번엔 새로 로드할 필요 없습니다. 어떤 방식이든 최종적으로 §2의 리다이렉트 파라미터 계약만 지키면 됩니다.

---

## 4. 신규/수정 파일

### 4-1. `lib/toss/client.ts` — `confirmPayment` 함수 추가 (기존 파일에 추가, 기존 함수는 그대로 둠)

```ts
export type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
};

export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  return tossPost<TossConfirmResponse>("/v1/payments/confirm", params);
}
```

### 4-2. `app/billing/packs/page.tsx` — 팩 목록 + 구매 버튼

`lib/cost/saas-pricing-config.ts`의 `CREDIT_PACKS`를 순회해 카드 렌더링. 구독 여부와 무관하게 로그인만 하면 접근 가능(39차의 "이미 구독 중" 같은 차단 로직 없음). 각 "구매하기" 클릭 시:

1. `orderId`를 **클라이언트에서** 생성 (`pack_${packId}_${userId}_${crypto.randomUUID()}`) — 이 결제는 서버가 먼저 시작하는 게 아니라 클라이언트가 결제창을 여는 시점에 즉시 필요하기 때문. `payments.order_id` UNIQUE 제약이 이후 중복 처리를 막아준다.
2. `tossPayments.payment({ customerKey: userId })`로 결제 요청 (39차와 동일한 초기화 방식 재사용). §3에서 확인한 정확한 메서드로 `amount`, `orderId`, `orderName`, `successUrl`(`?pack=${packId}&orderId=${orderId}` 포함), `failUrl` 전달.

### 4-3. `app/billing/packs/success/page.tsx`

쿼리에서 `pack`, `orderId`, `paymentKey`, `amount`를 읽어 `POST /api/billing/purchase-pack`로 전달. 39차의 success 페이지와 동일한 로딩/결과 UI 패턴 재사용.

### 4-4. `app/billing/packs/fail/page.tsx`

39차 fail 페이지와 동일한 패턴.

### 4-5. `app/api/billing/purchase-pack/route.ts` — 핵심 서버 로직

```ts
import { NextRequest, NextResponse } from "next/server";
import { getCreditPack } from "@/lib/cost/saas-pricing-config";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { confirmPayment } from "@/lib/toss/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json()) as {
    packId?: string;
    orderId?: string;
    paymentKey?: string;
    amount?: number;
  };
  const { packId, orderId, paymentKey, amount } = body;

  if (!packId || !orderId || !paymentKey || amount == null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const pack = getCreditPack(packId);
  if (!pack) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }

  // 클라이언트가 보낸 금액이 우리 설정값과 다르면 confirm 자체를 호출하지 않는다.
  if (amount !== pack.priceKrw) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  // orderId에 요청자 본인 user.id가 포함돼 있는지 확인 (다른 사람의 orderId 재사용 방지)
  if (!orderId.includes(user.id)) {
    return NextResponse.json({ error: "forbidden_order_id" }, { status: 403 });
  }

  const serviceClient = createServiceRoleClient();

  // 멱등성: 이미 처리된 orderId면 재처리하지 않는다 (새로고침/중복 제출 대비).
  const { data: existingPayment } = await serviceClient
    .from("payments")
    .select("status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingPayment?.status === "done") {
    return NextResponse.json({ error: "already_processed" }, { status: 409 });
  }

  try {
    const confirmed = await confirmPayment({ paymentKey, orderId, amount });

    // 토스 confirm 응답의 실제 결제 금액도 다시 한번 대조 (2중 검증).
    if (confirmed.totalAmount !== pack.priceKrw) {
      console.error(
        `[billing/purchase-pack] amount mismatch after confirm: expected ${pack.priceKrw}, got ${confirmed.totalAmount}`,
      );
      return NextResponse.json({ error: "amount_mismatch_after_confirm" }, { status: 500 });
    }

    const { error: paymentError } = await serviceClient.from("payments").insert({
      user_id: user.id,
      toss_payment_key: confirmed.paymentKey,
      order_id: orderId,
      amount: pack.priceKrw,
      status: "done",
      purchase_type: "pack_purchase",
      item_id: packId,
      credits_granted: pack.credits,
      confirmed_at: new Date().toISOString(),
    });

    if (paymentError) throw paymentError;

    const { data: newBalance, error: grantError } = await serviceClient.rpc("grant_credits", {
      p_user_id: user.id,
      p_amount: pack.credits,
      p_reason: "pack_purchase",
      p_reference_id: orderId,
    });

    if (grantError) throw grantError;

    return NextResponse.json({ ok: true, packId, balance: newBalance });
  } catch (err) {
    console.error("[billing/purchase-pack] failed:", err);
    return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
  }
}
```

---

## 5. 하드 룰

1. **금액은 2중으로 검증한다** — (1) 클라이언트가 보낸 `amount` vs `getCreditPack(packId).priceKrw`, (2) 토스 confirm 응답의 `totalAmount` vs 같은 값. 둘 중 하나라도 다르면 크레딧을 지급하지 않는다.
2. **`orderId`에 요청자 본인의 `user.id`가 포함되어 있는지 검증** — 39차의 customerKey 검증과 같은 목적(타인 명의 결제 가로채기 방지).
3. **멱등성 확인 필수** — 같은 `orderId`로 이미 `status='done'`인 `payments` 행이 있으면 재처리(크레딧 재지급)하지 않는다. 새로고침·중복 클릭으로 크레딧이 중복 지급되는 걸 막는 핵심 장치.
4. **`payments` 쓰기와 `grant_credits` 호출은 전부 service-role 클라이언트로만** (38차 하드 룰 유지).
5. **39차의 구독 관련 파일(`app/api/billing/subscribe/**`, `app/billing/subscribe/**`)은 손대지 않는다.**
6. 테스트 키만 사용, 라이브 분기 코드 추가 금지 (39차와 동일한 원칙).
7. `/api/generate` 크레딧 차감 연동은 이번에 하지 않는다 (41차).

---

## 6. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 테스트 키로 실제 팩 구매 1회 E2E: 팩 선택 → 결제창(토스 테스트 카드) → success 리다이렉트 → `payments` 행 생성 확인(`status='done'`, `purchase_type='pack_purchase'`) → `user_credits.balance`가 팩 크레딧만큼 늘었는지 확인
- [ ] 같은 `orderId`로 `/api/billing/purchase-pack`를 두 번 호출(새로고침 시뮬레이션) → 두 번째 호출은 `already_processed`로 거부되고 크레딧이 중복 지급되지 않는지 확인
- [ ] 클라이언트에서 `amount`를 실제 팩 가격과 다르게 조작해서 요청 → `amount_mismatch`로 거부되는지 확인
- [ ] 존재하지 않는 `packId`로 요청 → `invalid_pack` 거부 확인
- [ ] 다른 사용자의 `user.id`가 포함된 `orderId`로 요청 시도 → `forbidden_order_id` 거부 확인
- [ ] 39차 구독 플로우가 이번 변경으로 회귀하지 않았는지 간단히 재확인 (구독 페이지 정상 로드)

---

## 7. 완료 보고 형식

39차와 동일한 형식 — 변경/신규 파일, `tsc` 결과, E2E 결과, §3에서 확인한 정확한 SDK 메서드명, 그리고 위 체크리스트의 금액 위변조·멱등성 테스트 실제 결과를 포함해 주세요. 이 두 가지가 이번 라운드의 핵심 안전장치입니다.
