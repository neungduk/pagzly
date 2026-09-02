# 46차 Cursor 브리프 — "크레딧" → "토큰" 단위 전환 (100배 세분화) + 잔액/요금제 표시

생성: 2026-08-31
결정 근거: 사용자 확인 완료 — (1) 짧은 구성 80토큰 : 긴 구성 100토큰, (2) 재시도 초과 토큰화는 이번 라운드 제외(42차와 동일한 이유 유지)

## 배경 (사용자 원문)

> "토큰을 우리가 1토큰이라고 하는데 다른데 보면은 토큰을 충전 하고 사용량 만큼 제하잖아 우리도
> 짧은거 긴거 사용량에 따라서 토큰이 소모가 되는 구조로 바꿧으면 좋겠고 최소 단위를 100단위
> 이상으로 맞춘 다음에 토큰을 작업에 맞춰서 소모가 되게끔 했으면 좋겠어. 그리고 결제를 할때
> 내토큰이 지금 얼마인지 무슨 요금제인지 정확하게 다 나와줬으면 좋겠어"

시작 전에 실제 코드를 확인했습니다: **지금 앱 어디에도(사이드바·구독 페이지·팩 구매 페이지) 사용자
의 현재 크레딧 잔액이나 구독 상태가 보이지 않습니다.** `components/AppSidebar.tsx`,
`app/billing/subscribe/page.tsx`, `app/billing/packs/page.tsx`를 직접 열어 확인했는데
"이미 구독 중입니다" 안내만 있을 뿐 잔액 자체는 어디에도 표시가 없습니다. 두 번째 요청은 완전히
빈 구멍이었습니다.

또한 지난 요금제 설계(`claude/pagzly-pricing-cost-model-2026.md` §2-4)에서는 "짧은 구성/긴
구성은 크레딧 차감을 다르게 두지 않는다"고 **의도적으로** 결정했었습니다(실측 원가 대부분이
섹션 개수가 아니라 사진 장수에서 나온다는 이유). 이번에 사용자와 확인한 결과, 그 원가 논리를
알고도 **체감 차등을 위해 짧은 80 : 긴 100 비율로 바꾸기로 확정**했습니다 — 짧은 구성이 실제로
슬롯이 줄면서(36차 참고) 이미지 소요도 일부 줄어드는 부분이 있어 원가 논리와 완전히 무관하지도
않습니다.

## 이번 라운드 범위

**포함**: 요금제 SSOT 재설계(토큰 단위, ×100), DB 마이그레이션(기존 잔액 환산), `/api/generate`
차감 로직을 짧은/긴 차등으로 변경, 전체 UI "크레딧"→"토큰" 문구 교체, 잔액+요금제 상시 표시
컴포넌트 신규 추가.

**제외** (다음 라운드): 재시도 초과분 토큰화(`FREE_RETRY_LIMITS` 소진 후 과금) — `draftToken`이
매 호출마다 새로 발급되어 "몇 번째 재시도인지" 서버가 구분 못 하는 문제가 여전히 있고(42차와
동일), 이번 사용자 확인에서도 이번 라운드는 제외하기로 했습니다. 관련 상수(`RETRY_OVERAGE_...`)
값만 새 단위로 갱신해두고 로직 연결은 다음 라운드로 미룹니다.

---

## A. 요금제 SSOT 재설계 (`lib/cost/saas-pricing-config.ts`)

**테이블/컬럼/RPC 이름(`user_credits`, `credit_ledger`, `grant_credits`, `deduct_credits`)은
바꾸지 않습니다** — 이미 라이브로 운영 중인 스키마 이름을 바꾸는 건 불필요한 리스크입니다.
바뀌는 건 그 안에 들어가는 **숫자의 단위**와 **사용자에게 보이는 문구**뿐입니다.

```ts
// before → after (전체 값 ×100, 명칭 TOKEN으로 통일)

export const PLANNED_COST_PER_CREDIT_KRW = 250;
// →
export const PLANNED_COST_PER_TOKEN_KRW = 2.5; // 250 / 100

export const PRICING_TIERS: PricingTier[] = [
  { id: "starter", label: "스타터", monthlyPriceKrw: 29000, monthlyCredits: 10 },
  { id: "growth", label: "그로스", monthlyPriceKrw: 79000, monthlyCredits: 30 },
  { id: "pro", label: "프로", monthlyPriceKrw: 149000, monthlyCredits: 55 },
];
// →
export type PricingTier = {
  id: PricingTierId;
  label: string;
  monthlyPriceKrw: number;
  monthlyTokens: number; // 필드명 변경: monthlyCredits → monthlyTokens
};
export const PRICING_TIERS: PricingTier[] = [
  { id: "starter", label: "스타터", monthlyPriceKrw: 29000, monthlyTokens: 1000 },
  { id: "growth", label: "그로스", monthlyPriceKrw: 79000, monthlyTokens: 3000 },
  { id: "pro", label: "프로", monthlyPriceKrw: 149000, monthlyTokens: 5500 },
];

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", label: "5개 팩", priceKrw: 16900, credits: 5 },
  { id: "pack_15", label: "15개 팩", priceKrw: 44900, credits: 15 },
];
// →
export type CreditPack = {
  id: string;
  label: string;
  priceKrw: number;
  tokens: number; // 필드명 변경: credits → tokens
};
export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", label: "500토큰 팩", priceKrw: 16900, tokens: 500 },
  { id: "pack_15", label: "1,500토큰 팩", priceKrw: 44900, tokens: 1500 },
];

export const SIGNUP_FREE_CREDITS = 5;
// →
export const SIGNUP_FREE_TOKENS = 500;

export const CREDIT_COST_PER_COMPLETION = 1;
// →
// 완성 1건 차감 토큰 — "짧은 구성"/"긴 구성"에 따라 차등 (사용자 확정 비율)
export const TOKEN_COST_PER_COMPLETION = {
  short: 80,
  long: 100,
} as const;

export const RETRY_OVERAGE_CREDIT_COST = 0.2;
// →
// 다음 라운드에서 연결 예정 — 이번엔 값만 새 단위로 정의, 호출부 연결은 안 함
export const RETRY_OVERAGE_TOKEN_COST = 20; // 0.2 크레딧 × 100
```

`getCreditPack`/`getPricingTier` 함수 시그니처는 그대로 두되, 내부에서 참조하는 필드명만
위 변경에 맞춰 갱신하세요. **`pack_5`/`pack_15` id 문자열 자체는 절대 바꾸지 마세요** —
41차에서 이 id가 `orderId` 생성에 쓰이고, 기존 `payments` 테이블에 이 id로 기록된 결제 이력이
있습니다. `id`는 유지, `label`/`tokens` 필드만 위처럼 바뀝니다.

이 파일을 import하는 모든 곳(`grep -r "monthlyCredits\|SIGNUP_FREE_CREDITS\|CREDIT_COST_PER_COMPLETION\|pack.credits" `)을
찾아서 새 필드명으로 갱신하세요 — 특히 `app/billing/subscribe/route.ts`,
`app/billing/purchase-pack/route.ts`, `app/api/billing/renew/route.ts`, `app/page.tsx`,
`lib/landing-content.ts`.

---

## B. DB 마이그레이션 (신규 `supabase/migrations/2026083XXXXXX_credit_to_token_scale.sql`)

**순서가 중요합니다 — 이 마이그레이션이 프로덕션 Supabase에 적용된 "이후"에만 새 코드를
배포하세요.** 코드가 먼저 배포되면(새 코드는 잔액이 이미 ×100 단위라고 가정) 기존 DB 값은
아직 옛 단위라서, 사용자 잔액이 실제보다 100배 적게 보이거나 `deduct_credits` 호출 시 새
단위(80~100)를 옛 단위 잔액에서 빼서 잔액이 순식간에 마이너스로 튈 수 있습니다.

```sql
-- 1. 기존 잔액을 새 단위로 환산 (기존 사용자가 보유한 실제 가치를 그대로 유지)
update public.user_credits set balance = balance * 100;

-- 2. 원장(감사 로그) 히스토리도 동일 배율로 환산 — 과거 기록과 현재 잔액의 단위가
--    어긋나지 않도록 (감사 목적상 일관성 필수)
update public.credit_ledger set amount = amount * 100;

-- 3. 가입 시 무료 지급 트리거 함수 재정의 — 5 → 500
--    (38차 마이그레이션에서 만든 on_auth_user_created_grant_credits 함수를 CREATE OR REPLACE로
--    갱신. 정확한 함수명은 supabase/migrations/의 38차 파일에서 확인 후 그대로 사용할 것 —
--    이름을 추측해서 새로 만들지 말고 기존 함수를 CREATE OR REPLACE 하세요.)
```

`grant_credits`/`deduct_credits` RPC 함수 자체는 `p_amount numeric` 파라미터를 그대로
받으므로 **함수 시그니처 변경은 필요 없습니다** — 호출부(TS 코드)가 넘기는 숫자만 달라집니다.

**하드 룰**: 이 SQL은 프로덕션 Supabase SQL 에디터에 직접 실행하기 전에, 먼저 로컬/스테이징에서
`select balance from user_credits limit 5;`로 현재 값을 확인하고, 마이그레이션 적용 후 다시
조회해서 정확히 ×100이 됐는지 확인하세요. 실행 시점을 완료 보고에 명시해 주시면 제가 Supabase
대시보드에서 직접 대조 확인하겠습니다(이전 라운드들과 동일한 방식).

---

## C. `/api/generate` 차감 로직 — 짧은/긴 차등 (42차 로직 확장)

42차에서 만든 `mode: "final"` 분기의 precheck·차감 부분을 찾아서, 고정값 `CREDIT_COST_PER_COMPLETION`
대신 `body.length`(값: `"short" | "long"`, `CreateProductForm.tsx`의 `compositionLength` state가
`length` 필드로 전송됨 — 이미 존재하는 필드, 새로 안 만들어도 됨)를 기준으로 비용을 결정하세요.

```ts
// import 변경
import { TOKEN_COST_PER_COMPLETION } from "@/lib/cost/saas-pricing-config";

// precheck (기존 위치 그대로, 비교값만 변경)
const tokenCost = body.length === "short" ? TOKEN_COST_PER_COMPLETION.short : TOKEN_COST_PER_COMPLETION.long;
if (mode === "final") {
  const { data: creditRow } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  const balance = creditRow?.balance ?? 0;
  if (balance < tokenCost) {
    return NextResponse.json({ error: "insufficient_credits", balance, required: tokenCost }, { status: 402 });
  }
}

// 차감 (기존 위치 그대로, p_amount만 변경)
const { error: deductError } = await serviceClient.rpc("deduct_credits", {
  p_user_id: user.id,
  p_amount: tokenCost,
  p_reason: "completion",
  p_reference_id: savedProduct.id,
});
```

`insufficient_credits` 응답에 `required` 필드를 추가했습니다 — 프론트에서 "토큰이 부족합니다
(필요 80 / 보유 30)" 같은 안내를 하려면 이 값이 필요합니다. 이 응답을 처리하는 프론트 쪽(에러
토스트 등)이 있다면 이 필드를 활용해 문구를 보강해 주세요(필수는 아님, 있으면 좋음).

---

## D. UI 전체 "크레딧" → "토큰" 문구 교체 + 값 ×100

아래 파일들에서 "크레딧"이라는 단어와 숫자를 전부 찾아 "토큰"/새 값으로 바꾸세요. grep으로
`크레딧`을 전체 검색하면 빠짐없이 찾을 수 있습니다.

- `lib/landing-content.ts` — `LANDING_PLANS`의 "월 10크레딧" 등 → "월 1,000토큰" 등, 44차에서
  추가한 하단 안내 문구("가입하면 무료 크레딧 5개를...")도 "무료 토큰 500개"로.
- `app/billing/subscribe/page.tsx` — "매월 {tier.monthlyCredits}크레딧 지급" →
  "매월 {tier.monthlyTokens.toLocaleString()}토큰 지급"
- `app/billing/packs/page.tsx` — "{pack.credits}크레딧" → "{pack.tokens.toLocaleString()}토큰",
  "크레딧당 약 N원" → "토큰당 약 N원"
- `app/billing/subscribe/success/page.tsx`, `app/billing/packs/success/page.tsx` — 완료 화면에
  "크레딧이 지급되었습니다" 류 문구가 있다면 "토큰이 지급되었습니다"로.

**숫자 표시는 전부 `toLocaleString("ko-KR")` 등으로 천 단위 콤마를 넣어주세요** — 1000, 3000,
5500 같은 4자리 숫자가 콤마 없이 나오면 가독성이 떨어집니다.

---

## E. 신규 — 잔액·요금제 상시 표시 (이번 요청의 핵심 2번째 항목)

### E-1. 데이터 소스

신규 API 라우트 `GET /api/billing/me`를 만들어, 로그인한 사용자의 `user_credits.balance`와
`subscriptions`(status='active'인 행이 있으면 그 `tier_id`, 없으면 null)를 함께 반환하세요.

```ts
// app/api/billing/me/route.ts (신규)
// 응답 예시: { balance: 850, activeTier: "growth" | null }
```

### E-2. 표시 위치 — 두 곳

1. **`components/AppSidebar.tsx`에 상시 배지 추가** — 로그인 상태일 때 사이드바 하단(로그아웃
   버튼 근처)에 "토큰 850개 · 그로스" 같은 한 줄 배지. 클릭하면 `/billing/subscribe`로 이동.
   `/api/billing/me`를 호출해 표시(로딩 중엔 스켈레톤 또는 생략, 실패 시 조용히 숨김 — 이 배지
   때문에 사이드바 전체가 깨지면 안 됨).
2. **`app/billing/subscribe/page.tsx`, `app/billing/packs/page.tsx` 상단에 카드로 노출** —
   "현재 보유 토큰: {balance}개 · 현재 요금제: {activeTier ? 티어 라벨 : "구독 없음"}"을 결제
   버튼들 위에 명확히 보여주세요. 이미 두 페이지 다 서버 컴포넌트에서 `subscriptions` 조회를
   하고 있으므로(예: "이미 구독 중입니다" 체크), 그 조회에 `user_credits.balance`를 같이
   가져와서 페이지 상단에 렌더링하면 됩니다 — 별도로 클라이언트에서 `/api/billing/me`를 또
   호출할 필요 없이, 서버 컴포넌트 데이터를 재사용하세요.

---

## 하드 룰

1. **B(DB 마이그레이션)는 반드시 코드 배포보다 먼저 프로덕션에 적용**하고, 적용 직후 잔액
   샘플을 조회해서 ×100이 정확한지 확인 후 완료 보고에 남기세요.
2. `CREDIT_PACKS`의 `id`(`pack_5`, `pack_15`)는 절대 변경 금지 — 기존 `orderId`·`payments`
   이력과의 연결이 깨집니다.
3. `grant_credits`/`deduct_credits` RPC 함수, `user_credits`/`credit_ledger` 테이블/컬럼명은
   변경하지 않습니다 — 넘기는 숫자 값만 바뀝니다.
4. 이번 라운드에서 재시도 초과 과금 로직은 연결하지 않습니다(상수만 정의). `FREE_RETRY_LIMITS`
   자체도 이번엔 손대지 않습니다.
5. `npx tsc --noEmit` 통과 필수 — 필드명이 여러 파일에 걸쳐 바뀌므로(`monthlyCredits`→
   `monthlyTokens`, `credits`→`tokens`) 빠뜨린 참조가 있으면 타입 에러로 바로 드러날 것입니다.

## 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 마이그레이션 적용 전/후 `user_credits.balance` 샘플 값 (몇 배 됐는지 직접 대조)
- [ ] `credit_ledger.amount` 히스토리도 동일 배율 확인
- [ ] 가입 트리거 재정의 후 신규 가입 테스트 계정이 정확히 500토큰 받는지 확인
- [ ] "짧은 구성"으로 완성 1건 → 80토큰 차감 확인 / "긴 구성"으로 완성 1건 → 100토큰 차감 확인
- [ ] 랜딩·구독·팩 페이지에서 "크레딧" 단어가 전혀 안 남아있는지 grep으로 재확인
- [ ] 사이드바 배지 + 구독/팩 페이지 상단에 "보유 토큰 · 현재 요금제"가 정확히 표시되는지
- [ ] `pack_5`/`pack_15`로 실제 결제 흐름(40~41차 로직)이 여전히 정상 동작하는지

## 완료 보고 형식

기존과 동일 — 변경/신규 파일, `tsc` 결과, 마이그레이션 적용 로그(적용 시각·전후 값), 위
체크리스트 결과를 포함해 주세요. **DB 마이그레이션은 제가 diff와 Supabase 데이터를 직접
대조 확인한 뒤에 다음 라운드로 넘어가겠습니다** — 실제 돈이 걸린 잔액 계산이라 이 부분만큼은
이전 어떤 라운드보다 꼼꼼히 볼 예정입니다.
