# 78차 리포트 — 상단 계정/토큰 배지 + 구매 경로

## 요약

후커블 스타일 **상단 `AccountStatusBadge`**를 `/create` 레이아웃에 추가했다. hover 없이 토큰 pill·계정 칩이 항상 보이고, 사이드바 `TokenBalanceBadge`는 제거했다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `components/AccountStatusBadge.tsx` | 토큰 pill → packs, 계정 칩 → subscribe |
| `app/create/layout.tsx` | sticky 상단 헤더 + user prop |
| `components/AppSidebar.tsx` | `TokenBalanceBadge` 제거 |
| `components/TokenBalanceBadge.tsx` | 삭제 |
| `app/billing/subscribe/page.tsx` | 토큰 팩 구매 링크 |
| `app/billing/packs/page.tsx` | 구독 보기 링크 |

## 동작

- **토큰 pill**: sparkle + 잔액(축약 `K`), 클릭 → `/billing/packs`
- **계정 칩**: 아바타(또는 단색 원) + 표시 이름 + 요금제(없으면 「무료」), 클릭 → `/billing/subscribe`
- `/api/billing/me` 실패 시 배지 숨김 (레이아웃 유지)

## QA

- `review/qa-screenshots/78cha-account-badge-desktop.png`
- `review/qa-screenshots/78cha-account-badge-history.png`
- `review/qa-screenshots/78cha-account-badge-mobile.png`

```bash
npx tsx scripts/capture-78cha-account-badge.ts
npx tsc --noEmit
```

레퍼런스: `claude/reference/hookable-reference-token-account-badge.png`
