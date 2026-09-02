# 39차 Cursor 브리프 — 토스페이먼츠 구독(빌링키) 연동

생성: 2026-08-31
근거: `claude/pagzly-billing-architecture-2026.md`, 38차(완료, DB 스키마), `claude/cursor_brief_37cha_saas_pricing_config_ssot.md`(완료, 요금제 상수)
전제: **테스트 키로만 진행.** 사업자등록 전이라 라이브 키는 없음 — 이 라운드는 실제 카드가 아니라 토스 가상 승인으로 전부 동작·검증합니다.
범위: 구독 신청 → 카드 등록(빌링키 발급) → 첫 결제 → `subscriptions` 생성 → 크레딧 지급까지. **크레딧 팩 단건 구매(40차)와 `/api/generate` 연동(41차)은 이번에 하지 않습니다.**

---

## 0. 사전 준비 (프로님이 직접 하실 일 — Cursor 작업 범위 아님)

토스페이먼츠 개발자센터(https://developers.tosspayments.com)에서 무료 가입 → 테스트 키 발급 (전자결제 신청 완료 전에도 발급 가능함을 토스 공식 문서로 확인함). 발급받은 값을 `.env.local`(로컬)과 Vercel 환경변수(배포)에 등록:

```
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...
```

`NEXT_PUBLIC_` 접두사가 붙은 클라이언트 키만 브라우저에 노출됩니다. **`TOSS_SECRET_KEY`는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다** — 서버 API 라우트에서만 사용.

---

## 1. 확인된 사실 (문서 근거 — 아래 내용은 토스 공식 문서에서 직접 확인함)

- SDK는 스크립트 태그로 로드: `<script src="https://js.tosspayments.com/v2/standard"></script>` (실제 살아있는 파일 확인함, "Toss Payments standard javascript SDK v2")
- 빌링키 발급 흐름: 클라이언트에서 카드 등록 위젯 호출 → 성공 시 `successUrl`에 `customerKey`, `authKey` 쿼리 파라미터가 붙어 리다이렉트 → 서버가 이 두 값으로 빌링키 발급 API 호출
- **빌링키 발급**: `POST https://api.tosspayments.com/v1/billing/authorizations/issue` — body에 `authKey`, `customerKey`. 응답으로 `billingKey` 반환. **발급된 빌링키는 재조회 불가** — 반드시 그 자리에서 DB에 저장.
- **빌링키로 결제(자동결제) 승인**: `POST https://api.tosspayments.com/v1/billing/{billingKey}` — body에 주문 정보 + `customerKey`. 응답으로 Payment 객체.
- **인증 방식**: 모든 서버→토스 API 호출은 Basic 인증. `Authorization: Basic ' + base64(TOSS_SECRET_KEY + ':')` (시크릿 키 뒤에 콜론, 비밀번호 없음).
- **customerKey**는 우리가 만드는 고객 식별자 — Supabase `auth.users.id`(uuid)를 그대로 쓰면 됩니다 (이미 유일하고 안정적).

## 2. 확인이 필요한 부분 (구현 시 Cursor가 직접 확인)

토스 SDK의 정확한 클라이언트 메서드 시그니처(`requestBillingAuth`의 정확한 파라미터 이름 등)는 문서 페이지가 JS로 렌더링돼 있어 이번 리서치에서 100% 확정하지 못했습니다. **구현 전에 반드시 `https://docs.tosspayments.com/guides/v2/billing/integration` 페이지를 직접 열어 정확한 메서드/파라미터명을 확인하고 구현하세요.** 위 §1의 API 계약(엔드포인트·요청/응답 필드·리다이렉트 파라미터)은 확정된 사실이니 이건 그대로 따르되, 클라이언트 SDK 호출 코드 자체의 정확한 문법만 문서에서 재확인 바랍니다.

---

## 3. 신규 파일

### 3-1. `lib/toss/client.ts` — 서버 전용 토스 API 호출 헬퍼

```ts
// 서버 전용. 클라이언트 컴포넌트에서 절대 import하지 말 것 (TOSS_SECRET_KEY 노출 위험).
const TOSS_API_BASE = "https://api.tosspayments.com";

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function tossPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    // 토스 에러 응답은 보통 { code, message } 형태 — 그대로 던져서 호출부에서 처리
    throw new Error(`토스 API 오류 (${path}): ${data?.message ?? res.statusText}`);
  }
  return data as T;
}

export type TossBillingKeyResponse = {
  billingKey: string;
  customerKey: string;
  card?: { number?: string; company?: string };
};

export async function issueBillingKey(authKey: string, customerKey: string) {
  return tossPost<TossBillingKeyResponse>("/v1/billing/authorizations/issue", {
    authKey,
    customerKey,
  });
}

export type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
};

export async function chargeBillingKey(params: {
  billingKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
}) {
  const { billingKey, ...body } = params;
  return tossPost<TossPaymentResponse>(`/v1/billing/${billingKey}`, body);
}
```

### 3-2. `app/billing/subscribe/page.tsx` — 티어 선택 페이지

`lib/cost/saas-pricing-config.ts`의 `PRICING_TIERS`를 순회해 카드 3개(스타터/그로스/프로) 렌더링. 각 카드의 "구독하기" 클릭 시:

1. 로그인한 사용자의 `user.id`를 `customerKey`로 사용
2. 스크립트 태그로 로드한 토스 SDK를 `NEXT_PUBLIC_TOSS_CLIENT_KEY`로 초기화
3. 카드 등록 위젯 호출(§2 문서 확인 후 정확한 메서드 사용), `successUrl`에 `?tier=${tierId}` 포함, `failUrl` 지정

이미 `subscriptions` 행이 있고 `status = 'active'`인 사용자에게는 "이미 구독 중" 안내로 대체(중복 구독 방지) — `subscriptions` select는 RLS로 본인 것만 조회 가능.

### 3-3. `app/billing/subscribe/success/page.tsx`

쿼리 파라미터(`tier`, `customerKey`, `authKey`)를 읽어 `POST /api/billing/subscribe`에 전달. 로딩 상태 → 성공/실패 결과 표시.

### 3-4. `app/billing/subscribe/fail/page.tsx`

토스가 붙이는 에러 코드/메시지 쿼리 파라미터를 읽어 표시. "다시 시도" 버튼으로 `/billing/subscribe`로 복귀.

### 3-5. `app/api/billing/subscribe/route.ts` — 핵심 서버 로직

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { issueBillingKey, chargeBillingKey } from "@/lib/toss/client";
import { getPricingTier, type PricingTierId } from "@/lib/cost/saas-pricing-config";

// service-role 클라이언트 — 38차에서 authenticated에게 열어주지 않은
// subscriptions/payments 쓰기와 grant_credits RPC 호출은 이 클라이언트로만 한다.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // 1. 요청한 사용자 인증 확인 (일반 세션 기반 supabase 클라이언트로 auth.uid() 확인 —
  //    기존 다른 API 라우트가 인증을 확인하는 방식과 동일하게 맞출 것)
  // ... 인증 확인 로직은 기존 app/api/generate/route.ts 패턴을 참고해 동일하게 구현 ...

  const { tier, customerKey, authKey } = await req.json();

  // 2. tierId 화이트리스트 검증 — 클라이언트가 보낸 값을 절대 그대로 믿지 않는다.
  const tierIds: PricingTierId[] = ["starter", "growth", "pro"];
  if (!tierIds.includes(tier)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }
  const pricingTier = getPricingTier(tier);

  // 3. customerKey가 실제로 요청자 본인의 user.id와 일치하는지 검증
  //    (다른 사람의 customerKey로 빌링키를 훔쳐 붙이는 것 방지)
  // ... userId !== customerKey 이면 403 ...

  const supabase = getServiceClient();

  try {
    // 4. authKey → billingKey 발급 (재조회 불가하므로 실패하면 여기서 즉시 중단)
    const billing = await issueBillingKey(authKey, customerKey);

    // 5. 주문 ID는 서버가 생성 (멱등성 — payments.order_id UNIQUE 제약이 중복 처리 방지)
    const orderId = `sub_${customerKey}_${Date.now()}`;

    // 6. 첫 결제 청구
    const payment = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey,
      orderId,
      orderName: `Pagzly ${pricingTier.label} 구독`,
      amount: pricingTier.monthlyPriceKrw,
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // 7. subscriptions upsert (service-role — RLS 우회, 38차 정책상 authenticated는 못 씀)
    await supabase.from("subscriptions").upsert({
      user_id: customerKey,
      tier_id: tier,
      status: "active",
      toss_customer_key: customerKey,
      toss_billing_key: billing.billingKey,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
      failed_charge_count: 0,
      updated_at: now.toISOString(),
    });

    // 8. payments 기록
    await supabase.from("payments").insert({
      user_id: customerKey,
      toss_payment_key: payment.paymentKey,
      order_id: orderId,
      amount: pricingTier.monthlyPriceKrw,
      status: "done",
      purchase_type: "subscription_initial",
      item_id: tier,
      credits_granted: pricingTier.monthlyCredits,
      confirmed_at: now.toISOString(),
    });

    // 9. 크레딧 지급 — RPC로만 (38차 하드 룰)
    const { data: newBalance, error: grantError } = await supabase.rpc("grant_credits", {
      p_user_id: customerKey,
      p_amount: pricingTier.monthlyCredits,
      p_reason: "subscription_grant",
      p_reference_id: orderId,
    });
    if (grantError) throw grantError;

    return NextResponse.json({ ok: true, tier, balance: newBalance });
  } catch (err) {
    console.error("[billing/subscribe] failed:", err);
    return NextResponse.json({ error: "subscribe_failed" }, { status: 500 });
  }
}
```

이 코드는 뼈대입니다 — 인증 확인 부분은 기존 `app/api/generate/route.ts`가 사용자 인증을 확인하는 방식과 동일하게 맞춰서 채워 넣으세요 (일관성 유지).

---

## 4. 하드 룰

1. **`TOSS_SECRET_KEY`는 서버 코드(`app/api/**`, `lib/toss/client.ts`)에서만 참조.** 클라이언트 컴포넌트(`"use client"` 파일)에 절대 import하지 않는다.
2. **결제 금액은 항상 서버가 `lib/cost/saas-pricing-config.ts`에서 조회한 값을 사용.** 클라이언트가 금액을 보내더라도 무시하고 서버 값으로만 토스에 청구한다.
3. **`customerKey`가 요청자 본인의 인증된 user.id와 일치하는지 반드시 검증.** 안 하면 다른 사람 명의로 결제를 시도할 수 있는 구멍이 생긴다.
4. **`subscriptions`/`payments` 쓰기와 `grant_credits` 호출은 전부 service-role 클라이언트로만.** 38차에서 authenticated에게 이 권한을 안 준 이유가 무효화되지 않도록 한다.
5. **테스트 키만 사용.** 라이브 키 관련 분기(`if (isProduction)` 같은 것)를 만들지 않는다 — 환경변수 값만 바뀌면 되는 구조를 그대로 유지(아키텍처 문서 §6 목표).
6. 이번 라운드에서 크레딧 팩 단건 구매, `/api/generate` 크레딧 차감 연동, 정기 갱신 스케줄러는 만들지 않는다 (각각 40·41·42차).
7. `subscriptions.tier_id`는 NOT NULL 제약이 있으므로, 카드만 등록하고 구독은 안 하는 흐름은 만들지 않는다 — 이번 브리프는 "구독 신청 = 카드 등록 + 즉시 첫 결제"를 하나의 흐름으로 처리한다 (아키텍처 문서 초안의 register-card/subscribe 분리보다 단순화한 것 — 크레딧 팩만 사는 사용자는 40차에서 빌링키 없이 결제위젯으로 별도 처리하므로 이 단순화가 문제되지 않음).

---

## 5. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 테스트 키로 실제 구독 신청 1회 E2E: 티어 선택 → 카드 등록 위젯(토스 테스트 카드 BIN 사용) → success 리다이렉트 → `subscriptions` 행 생성 확인(`status='active'`, `toss_billing_key` 채워짐) → `payments` 행 생성 확인(`status='done'`) → `user_credits.balance`가 해당 티어 크레딧만큼 늘었는지 확인
- [ ] 실패 케이스: 위젯에서 취소/실패 시 `/billing/subscribe/fail`로 정상 이동하고 DB에 아무 것도 안 남는지 확인
- [ ] 존재하지 않는 tier 값("enterprise" 등)으로 `/api/billing/subscribe`를 직접 호출 시 400 거부되는지 확인
- [ ] 다른 사용자의 customerKey로 요청 시 403 거부되는지 확인
- [ ] `TOSS_SECRET_KEY`가 클라이언트 번들에 노출되지 않는지 확인 (브라우저 네트워크 탭/소스에서 검색해 안 보이는지)
- [ ] 이미 구독 중인 사용자가 다시 구독 페이지에 접근 시 중복 구독되지 않고 안내가 뜨는지 확인

---

## 6. 완료 보고 형식

변경/신규 파일 목록, `tsc` 결과, 위 E2E 테스트의 실제 결과(구독 신청 1회 전체 흐름과 DB 값), 그리고 §2에서 언급한 "직접 확인이 필요했던 SDK 메서드 시그니처"를 실제로 어떻게 구현했는지(문서에서 확인한 정확한 파라미터명) 꼭 포함해서 보고해 주세요 — 이 부분은 제가 확정하지 못하고 넘긴 부분이라 다음 재검증 때 특히 자세히 봐야 합니다.
