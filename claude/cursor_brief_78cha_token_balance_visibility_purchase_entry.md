# 78차 — 계정/토큰 상단 배지 (후커블 스타일) + 토큰 구매 접근 경로

생성: 2026-09-02 / 정정: 2026-09-02 (Task A 설계 변경 — 아래 "정정 안내" 참고)

## ⚠️ 정정 안내 (이 브리프로 작업 중이었다면 Task A부터 다시 보세요)

이 브리프의 최초 버전은 Task A를 "사이드바를 접었을 때도 숫자 pill이 보이게" 정도로 지시했습니다. 사용자가 후커블 실제 화면 스크린샷을 다시 보여주며 명확히 정정했습니다:

> "이런식으로 후커블 처럼 아이디 있고 왼쪽에 토큰이 얼마 남았나 첫페이지에서 바로 확인할 수 있게 만들어주라니까"

참고 이미지를 저장소에 넣어뒀습니다: **`claude/reference/hookable-reference-token-account-badge.png`** — 꼭 열어서 보고 작업하세요. 구성: 왼쪽에 알약(pill) 모양 "+ 16"(토큰 잔액), 그 오른쪽에 원형 아바타 + 2줄 텍스트("프로 버즈" 위, "FREE" 아래 — 표시 이름/아이디와 현재 요금제)가 나란히 붙어있는 한 덩어리 배지입니다. **이건 사이드바를 펼쳐야 보이는 hover 배지가 아니라, 로그인하면 화면 진입 즉시(hover 없이) 항상 보이는 상단 배지**입니다. 이번 라운드는 Task A를 이 방향으로 다시 구현합니다. Task B(구매 접근 경로)는 기존 내용 그대로 유효합니다.

## 배경

지금 `/create` 레이아웃(`app/create/layout.tsx`)에는 좌측 `AppSidebar`만 있고 상단 바가 아예 없습니다. 잔액 표시는 `AppSidebar` 하단의 `TokenBalanceBadge`뿐인데, 이건 사이드바를 마우스오버해야 텍스트가 보이는 구조라 사용자가 원하는 "로그인하면 첫 화면에서 바로 보이는" 요구를 충족하지 못합니다.

## 작업 A — 상단 계정/토큰 배지 (신규, 핵심 작업)

### 위치

`app/create/layout.tsx`를 수정해서, 사이드바 옆 콘텐츠 영역 상단에 얇은 헤더 바를 추가하고 그 안(보통 우측 정렬)에 이 배지를 둡니다. 지금 구조:

```tsx
<div className="flex min-h-screen bg-paper text-ink">
  <AppSidebar />
  <div className="min-w-0 flex-1">{children}</div>
</div>
```

를 아래처럼 헤더 바를 감싸는 구조로 바꿔주세요 (정확한 클래스/여백은 기존 디자인 톤에 맞게 판단):

```tsx
<div className="flex min-h-screen bg-paper text-ink">
  <AppSidebar />
  <div className="flex min-w-0 flex-1 flex-col">
    <header className="flex justify-end border-b border-line px-4 py-2.5">
      <AccountStatusBadge />
    </header>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
</div>
```

`/create` 하위 모든 페이지(만들기/결과/히스토리/소셜 등)가 이 레이아웃을 공유하므로, 이 한 곳만 고치면 로그인 후 어느 화면에 있든 상시 노출됩니다 — "첫페이지에서 바로 확인"이라는 요구사항이 실제로는 로그인 후 앱 전체에서 항상 보이는 것으로 해석하고 구현하는 게 맞습니다(후커블도 앱 전역 상단바입니다).

### 신규 컴포넌트 — `components/AccountStatusBadge.tsx`

레퍼런스 이미지와 동일한 순서로 좌→우 배치:

1. **토큰 pill**: `+` 아이콘 + 잔액 숫자(예: `16`), 둥근 pill 버튼. 클릭 시 `/billing/packs`로 이동(=작업 B의 진입 경로 역할도 겸함). `+`는 "충전/추가" 의미를 갖는 아이콘이면 됩니다(새 아이콘 라이브러리 도입 없이 인라인 SVG로 충분).
2. **계정 칩**: 원형 아바타 + 2줄 텍스트.
   - 아바타: `user.user_metadata?.avatar_url`(구글 로그인 시 프로필 사진)이 있으면 그 이미지, 없으면 단색 원(예: `bg-ink` 어두운 원 — 레퍼런스 이미지와 동일하게 이니셜 없이 단순 색상 원으로 충분, 이니셜 넣고 싶으면 넣어도 무방).
   - 1줄: 표시 이름 — `user.user_metadata?.full_name ?? user.user_metadata?.name`이 있으면 그 값, 없으면(이메일 가입) 이메일의 `@` 앞부분을 사용.
   - 2줄: 현재 요금제 — `/api/billing/me`의 `activeTierLabel`이 있으면 그 값(스타터/그로스/프로), 없으면 "무료"로 표시 (레퍼런스의 "FREE"에 대응).
   - 클릭 시 `/billing/subscribe`로 이동.

데이터는 기존 `/api/billing/me`(46차, `balance`/`activeTierLabel` 반환)를 그대로 재사용하세요. 사용자 표시 이름/아바타는 클라이언트에서 `supabase.auth.getUser()`로 얻은 `user.user_metadata`를 쓰면 됩니다(서버 컴포넌트인 `layout.tsx`가 이미 `user`를 갖고 있으니, `AccountStatusBadge`에 `user` prop으로 내려줘도 되고, 클라이언트 컴포넌트에서 직접 조회해도 됩니다 — 기존 코드 패턴 중 편한 쪽으로).

### 기존 `TokenBalanceBadge`(사이드바 hover 배지) 처리

이 상단 배지가 생기면 사이드바의 기존 `TokenBalanceBadge`는 기능이 겹칩니다. **사이드바에서는 제거**하고 상단 배지 하나로 통일하세요 — 같은 정보가 두 군데(하나는 hover해야 보이고, 하나는 항상 보이는) 다르게 표시되면 오히려 혼란스럽습니다. (컴포넌트 파일 자체를 지울지, 안 쓰이게만 둘지는 판단해서 진행 — 다른 곳에서 import하는 데가 없는지 확인 후 정리)

## 작업 B — 토큰 구매 접근 경로 (기존 내용 유지)

- 위 토큰 pill 클릭이 `/billing/packs`로 가는 주 진입 경로입니다 — 별도 추가 버튼 불필요.
- `app/billing/subscribe/page.tsx`와 `app/billing/packs/page.tsx`가 서로 링크가 없는 문제는 그대로 고쳐주세요 — 구독 페이지에 "토큰만 추가 구매 → 토큰 팩 구매" 링크, 팩 구매 페이지에 "구독으로 더 저렴하게 → 구독 보기" 링크.

## 하지 않는 것

- `/api/billing/me`, `deduct_credits`/`grant_credits` RPC, 결제(confirm/billingAuth) 로직 변경 없음 — 순수 UI/네비게이션.
- 새 프로필 편집 기능(닉네임 변경 등) 없음 — 표시 이름은 있는 값(OAuth 메타데이터 또는 이메일)을 그대로 보여주기만 함.
- `/billing/packs`, `/billing/subscribe`의 결제 플로우·가격·티어 구성 변경 없음.
- 아바타 업로드 기능 없음 — 있는 값(구글 프로필 사진)만 쓰고, 없으면 단색 원.

## 검증 방법

- 로그인 직후 `/create` 진입 시, hover 없이 상단에 "토큰 N개 pill + 아바타 + 이름/요금제"가 바로 보이는지 스크린샷.
- `/create/result`, `/create/history` 등 다른 `/create` 하위 페이지에서도 동일하게 보이는지 확인(레이아웃 공유 확인).
- 토큰 pill 클릭 → `/billing/packs` 이동 확인, 계정 칩 클릭 → `/billing/subscribe` 이동 확인.
- 구글 로그인 계정(아바타/이름 있음)과 이메일 가입 계정(둘 다 없음, fallback 표시) 두 경우 각각 스크린샷.
- 모바일 폭에서도 배지가 레이아웃 깨짐 없이 보이는지 확인.
- 기존 사이드바 나머지 기능(로그아웃, 네비게이션) 회귀 없음.
- `npx tsc --noEmit` 에러 0건.

## 완료 보고 체크리스트

- [ ] `components/AccountStatusBadge.tsx` 신규, `app/create/layout.tsx`에 상단 헤더로 연결
- [ ] 토큰 pill(+ 아이콘 + 잔액) → `/billing/packs`, 계정 칩(아바타+이름+요금제) → `/billing/subscribe`
- [ ] 표시 이름/아바타 fallback (OAuth 메타데이터 없을 때 이메일/단색 원) 처리
- [ ] 사이드바 기존 `TokenBalanceBadge` 정리(중복 제거)
- [ ] `/billing/subscribe` ↔ `/billing/packs` 상호 링크
- [ ] hover 없이 상시 노출 스크린샷 (데스크톱 + 모바일), 구글/이메일 계정 각각
- [ ] `npx tsc --noEmit` 에러 0건
