# 80차 — 구독 페이지 리뉴얼 + 플랜별 기능 안내

생성: 2026-09-02  
참고: `claude/reference/hookable-reference-pricing-page.png`  
브리프: `claude/cursor_brief_80cha_subscribe_page_redesign_features.md`

## 요약

후커블 요금제 페이지 레이아웃(타이틀 + 월/연 토글 + 3열 카드 + 체크리스트)을 Pagzly 톤으로 적용했습니다. 거짓 기능 차별화 없이 **모든 플랜 동일 기능 + 토큰 수 차이**만 표시합니다.

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/cost/saas-pricing-config.ts` | `tagline`, `inheritsFrom`, `PAGZLY_CORE_FEATURES` 추가 |
| `components/BillingPlanFeatureList.tsx` | 플랜별 체크리스트 (신규) |
| `components/BillingCycleToggle.tsx` | 월별/연간 토글 UI (연간 → 준비 중 안내) |
| `components/BillingRecommendedBadge.tsx` | `label` prop 추가 (구독: "인기", 팩: 기본 "추천") |
| `app/billing/subscribe/page.tsx` | 카드 레이아웃 리뉴얼 |
| `scripts/capture-80cha-subscribe-ui.ts` | QA 캡처 스크립트 |

## 체크리스트

- [x] `PricingTier`에 `tagline`/`inheritsFrom` 필드 추가, `PAGZLY_CORE_FEATURES` 상수 추가
- [x] 스타터: 전체 기능 + 토큰 수 / 그로스·프로: "이전 플랜 포함" + 토큰 수
- [x] 월별/연간 토글 UI (연간 클릭 → "연간 결제는 준비 중입니다." 안내, 전환 없음)
- [x] 그로스 카드 "인기" 배지 + `border-registration-red`
- [x] 데스크톱/모바일 스크린샷
- [x] 결제 플로우·78차 상호 링크 미변경
- [x] `npx tsc --noEmit` 에러 0건

## 스크린샷

| 파일 | 설명 |
|------|------|
| `review/qa-screenshots/80cha-billing-subscribe-desktop.png` | 데스크톱 3열 레이아웃 |
| `review/qa-screenshots/80cha-billing-subscribe-mobile.png` | 모바일 1열 스택 |
| `review/qa-screenshots/80cha-billing-subscribe-annual-notice.png` | 연간 결제 클릭 → 준비 중 |

## 검증

```bash
npx tsc --noEmit
npx tsx scripts/capture-80cha-subscribe-ui.ts
```

## 하지 않은 것 (브리프 준수)

- 연간 결제 실제 로직/가격 변경 없음
- 플랜별 기능 접근 제어 코드 없음
- `/billing/packs` 변경 없음
- 가격·토큰 수치 변경 없음
