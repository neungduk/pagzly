# 41차 Cursor 브리프 — 핫픽스: 크레딧 팩 orderId 길이 초과 버그

생성: 2026-08-31
근거: 40차(완료) E2E 테스트 중 실제 발견된 버그
범위: `app/billing/packs/page.tsx`의 `orderId` 생성 로직 한 줄만 수정. 다른 파일은 손대지 않습니다.

---

## 1. 증상

`/billing/packs`에서 "구매하기" 클릭 시 결제창이 열리지 않고 페이지 상단에 다음 에러가 표시됨:

> `orderId`는 영문 대소문자, 숫자, 특수문자(-, _) 만 허용합니다. 6자 이상 64자 이하여야 합니다.

## 2. 원인 (제 40차 브리프의 실수입니다)

40차 브리프 4-2절에서 제가 지정한 형식:

```ts
const orderId = `pack_${packId}_${userId}_${crypto.randomUUID()}`;
```

`packId` 값 자체가 이미 `"pack_5"` / `"pack_15"`라서 `"pack_"` 접두사가 중복으로 붙고, 여기에 `userId`(UUID, 36자) + `crypto.randomUUID()`(36자)까지 합치면 총 **85자**가 됩니다. 토스 결제창(`requestPayment`)은 `orderId`를 6~64자로 제한하는데 이를 초과해서 클라이언트 SDK 단에서 즉시 거부됩니다.

## 3. 수정 사항

`app/billing/packs/page.tsx`에서 `orderId` 생성 라인만 아래로 교체하세요 (다른 로직은 전부 그대로 유지):

```ts
// 변경 전
const orderId = `pack_${packId}_${userId}_${crypto.randomUUID()}`;

// 변경 후
const orderId = `${packId}_${userId}_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 8)}`;
```

- 길이 계산: `packId`(최대 7자, `"pack_15"`) + `_`(1) + `userId`(36자) + `_`(1) + `Date.now().toString(36)`(약 8자) + `randomUUID().slice(0,8)`(8자) ≈ **61자** — 64자 제한 안전하게 통과
- 문자 구성: 영문 소문자·숫자·하이픈·언더스코어만 사용 — 토스 허용 문자셋과 일치
- `orderId.includes(user.id)` 소유권 검증(40차 하드 룰 2번)에 영향 없음 — `userId`가 그대로 포함되어 있음
- 멱등성(`payments.order_id` UNIQUE)에도 영향 없음 — 매 요청마다 새 랜덤 suffix로 유일성 보장

## 4. 검증 체크리스트

- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `/billing/packs`에서 "5개 팩" 구매하기 클릭 → `orderId` 관련 에러 없이 결제창이 정상적으로 열리는지 확인
- [ ] 40차 체크리스트(금액 위변조, 멱등성, forbidden_order_id 등)는 이미 검증 완료된 상태이므로 재실행 불필요 — 이번 수정이 그 로직들을 건드리지 않았는지만 코드 diff로 확인

## 5. 완료 보고 형식

수정된 라인의 diff와 `tsc` 결과만 간단히 보고해 주시면 됩니다.
