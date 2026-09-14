# 172차 — review_highlight 신뢰성 안정화 + 패션 실사 1건

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A review_highlight 샘플링 안정화 | **완료** — temp=0 + 빈 praises 1회 재시도 |
| B 패션 실사 (tradeoff/chart/review) | **완료** — 28섹션, 세 섹션 모두 렌더 |
| DeepSeek 텍스트(프로브) | **10회** (before 5 + after 5, 재시도 0) |
| 이미지 생성 파이프라인 | **성공 세션 1건** (`generationCost` ≈ $0.71) |
| `npx tsc --noEmit` | **EXIT 0** |

---

## 트랙 A — review_highlight 근본 원인

### 원인 (코드 확정)

- `insertReviewHighlightSection()`은 **결정론적** — praises가 있으면 삽입, 예산/섹션 수와 무관.
- 삽입 게이트는 `reviewPraises.length > 0`뿐 (`app/api/generate/route.ts`).
- 따라서 148차 A/B 불일치는 섹션 예산이 아니라 **`extractReviewInsights()` DeepSeek 샘플링**이 `commonPraises=[]`를 돌려준 경우로 보는 게 맞음.

### 변경 파일

- `lib/review-insights.ts`
  - 기본 `temperature`: **0** (사실 추출; 다른 카피 호출은 미변경)
  - `ExtractReviewInsightsOptions` 추가
  - `reviewLineCount >= 3` 인데 praises가 비면 **1회만** 동일 프롬프트 재시도 (지어내기 없음)
- `scripts/172cha-review-insights-probe.ts` — 148차 동일 리뷰로 5회×2 프로브
- 결과: `review/172cha-review-probe.json`

### 검증 (5회 반복)

입력: `public/_verify146/reviews_148cha.txt`

| 위상 | temp / retry | empty praises | DeepSeek 호출 |
|------|----------------|---------------|---------------|
| before (높은 temp 근사) | 0.7 / off | **0 / 5** | 5 |
| after (172차) | 0 / on | **0 / 5** | 5 |

이 리뷰 파일에서는 수정 전에도 빈 결과가 재현되지 않았음(praise 신호가 뚜렷함). 수정은 **간헐적 샘플링 실패에 대한 안전망**(낮은 temp + 조건부 1회 재시도)이며, 빈 신호를 채우지 않음.

### complaints만 있는 경우

`lib/section-inserts.ts` 주석·동작 유지: **praises 0이면 complaints만 있어도 review_highlight 생략** — 의도한 동작으로 확인, **이번 라운드에서 변경 없음**.

---

## 트랙 B — 패션 실사 1건

### 입력 요지

- 카테고리: **의류/패션** — NEUTRAL LINE 에센셜 오버사이즈 코튼 티셔츠
- 근거 문구: 면 100% / 신축성 12% / 수축 2% 이내 / 오버사이즈 / 210g/yd, 추천·확인 후 구매(사이즈 다운·드라이클리닝), OEKO-TEX
- 리뷰: 148차와 동일 `reviews_148cha.txt` (트랙 A 경로 겸사 확인)

### 결과

| 항목 | 값 |
|------|-----|
| 섹션 수 | **28** |
| `tradeoff_card` | ✅ 추천/참고 = 입력 근거와 대응 |
| `comparison_chart` | ✅ checklist vs **일반 제품** (코튼/OEKO-TEX/수축) |
| `review_highlight` | ✅ 삽입됨 (praise 5) |
| 테마 | 뉴트럴 3색 토큰 범위 |

세션에서 확인한 tradeoff 문구:

- 추천: 루즈핏·데일리 / 매일 입을 기본 티 / 세탁 후 수축 부담
- 참고: 슬림핏→한 사이즈 다운 / 드라이클리닝 권장 / 실측은 판매자 확인

### 스크린샷

디렉터리: `review/172cha-live-fashion/`

| 파일 | 내용 |
|------|------|
| `02-result-full.png` | 결과 페이지 전체 |
| `03-comparison-chart.png` | comparison_chart (+ tradeoff 상단) |
| `03-tradeoff-card.png` | tradeoff_card (추천/참고) |
| `03-review-highlight.png` / `03-review-highlight-el.png` | review_highlight |
| `session.json` / `summary.json` / `export-full.html` | 원본 |

### 주의 (의도된 한계)

- 업로드 리뷰가 **뷰티 미스트** 원문이라 review_highlight 문구가 패션과 카테고리 불일치 — **섹션 누락이 아니라 픽스처 선택 이슈**. 파이프라인(추출→삽입)은 정상.
- `/api/generate` Playwright 카운트: 성공 세션에서 **POST 3회**(draft/final 등). 그 전 **429로 실패한 시도 1회** 있음. **의도한 상품 실사 성공은 1건**이며, 추가 카테고리 실사는 하지 않음.

### 스크립트

- `scripts/172cha-live-fashion.ts`
- `scripts/172cha-capture-fashion-sections.ts` / `172cha-recapture-sections.ts`

---

## 하지 않은 것

- `section-inserts.ts` / `comparison-chart-guard.ts` / `assign-section-images.ts` 핵심 로직 미수정
- 다른 카피 DeepSeek temperature 일괄 인하 없음
- 2건 이상 실사 생성 없음
- praise 없는 리뷰에 대한 날조 없음

## 비용·호출 집계

| 구분 | 횟수 / 비용 |
|------|-------------|
| DeepSeek 텍스트(프로브) | **10** (~$0.007) |
| DeepSeek 텍스트(실사 경로, review-insight) | 생성 1건에 포함(통상 1~2) |
| 이미지 생성 성공 세션 | **1** (`generationCost` ≈ **$0.708**, photo ≈ $0.229) |
| `tsc --noEmit` | **0** |
