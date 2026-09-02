# 78차 — 잔여 토큰 상시 노출 + 토큰 구매 접근 경로 추가

생성: 2026-09-02

## 배경

사용자 요청: "토큰 구매하는 창도 만들어야 하고 내 잔여 토큰이 얼마가 있는지 로그인하면 나와줬으면 해."

코드를 확인해보니 **두 기능 모두 46차/40차에서 이미 만들어져 있습니다**:

- 잔여 토큰 표시: `components/TokenBalanceBadge.tsx` — `AppSidebar.tsx` 하단에서 `/api/billing/me`를 호출해 "토큰 850개 · 그로스" 문구를 보여줌.
- 토큰 구매 창: `/billing/packs` 페이지 — 500토큰/1,500토큰 팩 카드 + 토스페이먼츠 결제.

문제는 **발견성(discoverability)**입니다. 사용자에게 직접 확인한 결과:

1. `AppSidebar`가 기본 폭 56px(아이콘만) → 마우스오버해야 208px로 펼쳐지며 `TokenBalanceBadge`의 텍스트 라벨(`opacity-0` → `opacity-100`)이 보이는 구조라서, **평소엔 잔여 토�큰 숫자가 전혀 안 보입니다.**
2. `/billing/packs`(토큰 구매)로 가는 링크가 사이드바 어디에도 없습니다 — `TokenBalanceBadge`는 `/billing/subscribe`(구독)로만 연결되고, `/billing/subscribe`와 `/billing/packs` 페이지끼리도 서로 링크가 없어서, 사용자가 URL을 직접 치지 않는 한 구매 창에 도달할 방법이 없습니다.

이번 라운드는 새 기능을 만드는 게 아니라 **이미 있는 두 화면의 진입 경로를 고치는 작업**입니다.

## 작업 A — 잔여 토큰, hover 없이 항상 보이게

`components/TokenBalanceBadge.tsx` + `components/AppSidebar.tsx` 대상.

- 사이드바가 접힌 기본 상태(w-14/56px)에서도 **최소한 숫자(예: "850")는 항상 보여야 합니다.** 지금처럼 라벨 전체가 `opacity-0`로 숨어있으면 안 됩니다.
- 구현 방식은 자유롭게 판단하되, 예시로: 아이콘 우측 하단에 작은 숫자 배지(뱃지 pill, 최대 4자리+"K" 축약 등 숫자가 길어질 때 처리도 고려)를 항상 표시하고, 사이드바를 hover로 펼쳤을 때는 지금처럼 전체 문구("토큰 850개 · 그로스")를 보여주는 2단계 표시로 가면 자연스러울 것 같습니다.
- 로딩 중(데이터 없음)이거나 API 실패 시 조용히 숨기는 기존 동작(`if (!data) return null`)은 유지 — 이 배지 때문에 사이드바가 깨지면 안 된다는 46차 원칙 그대로.
- 데스크톱 사이드바뿐 아니라, 모바일에서 이 사이드바가 보이는 화면이 있다면 거기서도 잔여 토큰이 hover 없이 확인 가능한지 확인해주세요 (지금 `AppSidebar`가 모바일에서 어떻게 쓰이고 있는지 실제 코드/화면 보고 판단).

## 작업 B — 토큰 구매(/billing/packs) 접근 경로 추가

- `AppSidebar.tsx`에 `TokenBalanceBadge`와는 별도로 "토큰 구매" 버튼/링크를 하나 추가해서 `/billing/packs`로 바로 이동할 수 있게 해주세요. (예: 배지 클릭 시 잔액/구독 관리 쪽으로, 그 옆이나 아래에 작은 "+" 아이콘 버튼이나 "충전" 링크로 구매 페이지 이동 — 정확한 배치는 기존 사이드바 톤에 맞게 판단)
- `app/billing/subscribe/page.tsx`와 `app/billing/packs/page.tsx`가 서로 링크가 전혀 없는 것도 이번에 고쳐주세요 — 구독 페이지에 "토큰만 추가로 구매하려면 → 토큰 팩 구매" 링크, 팩 구매 페이지에 "정기 구독으로 더 저렴하게 받으려면 → 구독 보기" 링크 정도로 상호 연결.

## 하지 않는 것

- `TokenBalanceBadge`가 호출하는 `/api/billing/me`, `deduct_credits`/`grant_credits` RPC, 결제(confirm/billingAuth) 로직은 전혀 건드리지 않습니다 — 이번은 순수 UI 노출/네비게이션 문제입니다.
- `/billing/packs`, `/billing/subscribe`의 결제 플로우 자체(팩 종류, 가격, 구독 티어)는 변경하지 않습니다.
- 새 페이지를 만들지 않습니다 — 기존 두 페이지의 상호 링크만 추가.

## 검증 방법

- 로그인 후 `/create` 영역 진입 시, 사이드바를 hover하지 않은 기본 상태에서도 잔여 토큰 숫자가 보이는지 스크린샷.
- 사이드바에서 "토큰 구매" 경로 클릭 → `/billing/packs`로 정상 이동하는지 확인.
- `/billing/subscribe` ↔ `/billing/packs` 상호 링크 클릭 시 정상 이동 확인.
- 기존 `TokenBalanceBadge` hover 확장 시 전체 문구 표시, 구독 링크 이동 등 기존 동작 회귀 없는지 확인.
- `npx tsc --noEmit` 에러 0건.

## 완료 보고 체크리스트

- [ ] 사이드바 기본(hover 없음) 상태에서 잔여 토큰 숫자 상시 노출 스크린샷
- [ ] 사이드바 → "토큰 구매" 진입 경로 추가 및 동작 확인
- [ ] `/billing/subscribe` ↔ `/billing/packs` 상호 링크 추가 및 동작 확인
- [ ] 기존 배지/구독 링크 회귀 없음 확인
- [ ] `npx tsc --noEmit` 에러 0건
