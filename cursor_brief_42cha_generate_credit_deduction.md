# 42차 Cursor 브리프 — `/api/generate` 크레딧 체크·차감 연동

생성: 2026-08-31
근거: `claude/pagzly-billing-architecture-2026.md` §5, `claude/pagzly-pricing-cost-model-2026.md` §2-4, 38차(완료, DB 스키마·RPC)
전제: 38~41차와 동일하게 **테스트 키/실제 DB 그대로 진행** (별도 테스트 환경 아님 — 이 라운드는 결제가 아니라 크레딧 소비 로직이라 라이브/테스트 구분 자체가 없음).

---

## 1. 범위 — 이번에 하는 것 / 안 하는 것

**한다:**
- `POST /api/generate`에서 `mode: "final"`일 때만 크레딧 체크(부족하면 402) + 성공 시 1크레딧 차감
- `mode: "draft"`는 지금처럼 완전 무료로 유지 (건드리지 않음)

**안 한다 (의도적으로 이번 범위 밖):**
- draft 재생성 3회·사진 재보정 2회 무료 캡 + 초과 시 0.2크레딧 차감(`draft_usage_counters` 활용) — **이건 다음 라운드로 미룹니다.** 이유: 지금 코드에서 `mode: "draft"` 호출마다 `draftToken`이 매번 새 `crypto.randomUUID()`로 생성돼서(`app/api/generate/route.ts` 1167~1170행), "같은 상품 시도를 몇 번째 재생성하는지" 서버가 구분할 방법이 없습니다. 프런트에서 재생성 버튼을 누를 때마다 같은 값을 유지하는 안정적인 식별자(예: `attemptId`)를 넘겨주도록 프런트 쪽도 같이 바꿔야 하는 작업이라, 별도 브리프로 설계하는 게 맞습니다. 지금은 draft 단계 전체를 무료로 두는 현재 동작을 유지합니다.
- `patch-section`, `enhance-image` 등 다른 라우트의 과금 연동 — 이번엔 `/api/generate`만.

## 2. 크레딧 체크 위치와 차감 시점

`app/api/generate/route.ts`의 `POST` 함수 기준:

1. **체크**: 1031~1043행(필수 필드·이미지 검증) 바로 다음, `mode === "final"`일 때만. AI 호출(이미지 분석·DeepSeek·사진 보정)이 시작되기 **전에** 잔액을 확인해서, 크레딧이 없는데 우리 쪽 AI 비용만 나가는 걸 막습니다.
2. **차감**: `products` insert/update가 성공한 직후(현재 1595행 `insertError` 체크를 통과한 다음, 1606행 `product_images` 링크 전). **insert든 update든(`body.productId` 유무와 무관하게) 둘 다 차감합니다** — 두 경로 모두 이미지 분석·DeepSeek 카피 생성·사진 보정 파이프라인을 처음부터 다시 돌리는 완전한 재생성이라 실제 비용이 동일하게 발생하기 때문입니다(부분 수정은 별도 라우트인 `patch-section`이 담당하므로 여기 영향 없음).

## 3. 코드 변경

### 3-1. import 추가 (파일 상단)

```ts
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CREDIT_COST_PER_COMPLETION } from "@/lib/cost/saas-pricing-config";
```

### 3-2. 잔액 체크 (1043행 이미지 검증 바로 다음에 삽입)

```ts
if (mode === "final") {
  const { data: creditRow } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = creditRow?.balance ?? 0;
  if (balance < CREDIT_COST_PER_COMPLETION) {
    return NextResponse.json(
      { error: "insufficient_credits", balance },
      { status: 402 },
    );
  }
}
```

- `supabase`는 이미 있는 인증된(RLS) 클라이언트 그대로 사용 — `user_credits`는 본인 행 select 정책이 이미 38차에서 열려 있어서 서비스 롤 없이도 조회 가능합니다.
- 크레딧 행이 아직 없는 극히 드문 경우(가입 트리거가 어떤 이유로 안 돈 경우) `balance = 0`으로 처리해서 안전하게 402를 반환합니다.

### 3-3. 차감 (products insert/update 성공 직후, `insertError` 체크 통과 다음 줄)

```ts
if (mode === "final") {
  const serviceClient = createServiceRoleClient();
  const { error: deductError } = await serviceClient.rpc("deduct_credits", {
    p_user_id: user.id,
    p_amount: CREDIT_COST_PER_COMPLETION,
    p_reason: "completion",
    p_reference_id: savedProduct.id,
  });

  if (deductError) {
    // 이미 AI 비용은 발생했고 결과물도 저장 완료된 상태라, 여기서 응답을 막지 않습니다.
    // (§2 체크에서 대부분 걸러지고, 여기 도달하는 건 매우 드문 동시 요청 경합 케이스입니다.)
    console.error(
      `[generate] deduct_credits failed for user=${user.id} product=${savedProduct.id}:`,
      deductError,
    );
  }
}
```

- **왜 실패해도 응답을 막지 않는가**: §2에서 이미 사전 체크를 했기 때문에 여기서 실패하는 경우는 사실상 "체크 이후 차감 사이에 다른 요청이 크레딧을 먼저 써버린" 경합 상황뿐입니다. 이 시점엔 이미 AI 비용이 실제로 발생했고 사용자 결과물도 DB에 저장 완료된 상태라, 완성된 상세페이지를 사용자에게 안 주는 건 더 나쁜 선택입니다. 대신 로그를 남겨서 나중에 `credit_ledger` 대사 시 발견할 수 있게 합니다.
- `deduct_credits`는 `security definer` + `service_role` 전용이라 반드시 `createServiceRoleClient()`로만 호출합니다(38차 하드 룰 유지).

## 4. 하드 룰

1. `mode === "draft"` 경로는 이번 변경으로 절대 건드리지 않습니다 (무료 유지).
2. 크레딧 차감(RPC 호출)은 반드시 service-role 클라이언트로만 — `authenticated` 롤로는 `deduct_credits` EXECUTE 권한이 없어서 애초에 실패합니다(의도된 설계).
3. 사전 체크(§2)에서 402로 막을 때 `balance`도 같이 내려줘서, 프런트가 "크레딧이 몇 개 남았는데 부족하다"는 걸 보여줄 수 있게 합니다.
4. 이번 라운드에서 `draft_usage_counters` 테이블은 건드리지 않습니다(§1 참고, 다음 라운드).

## 5. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 크레딧이 충분한 계정으로 `mode: final` 정상 생성 → 완료 후 `user_credits.balance`가 1 줄어들었는지 확인
- [ ] `credit_ledger`에 `reason='completion'`, `reference_id=<방금 생성된 product id>` 행이 정확히 하나 생겼는지 확인
- [ ] `user_credits.balance`를 SQL로 0으로 만든 테스트 계정으로 `mode: final` 시도 → 402 + `error: "insufficient_credits"` 응답 확인 (AI 파이프라인이 시작되지도 않았는지 서버 로그로 확인 — DeepSeek/이미지분석 호출 로그가 없어야 함)
- [ ] `mode: draft` 호출은 크레딧과 무관하게 계속 정상 동작하는지 확인 (잔액 0인 계정으로도 draft는 성공해야 함)
- [ ] 기존 `body.productId` 업데이트 경로(재생성)도 정상적으로 크레딧이 차감되는지 확인

## 6. 완료 보고 형식

39~41차와 동일 — 변경 파일, `tsc` 결과, 위 체크리스트 실제 결과(특히 402 케이스와 `credit_ledger` 행 확인 결과)를 포함해 주세요.
