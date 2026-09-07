# 137차 — comparison_chart 리뷰 근거형 (막대 + 근거 보기)

## 요약
리뷰 파일이 있을 때 DeepSeek는 **축 라벨만** 제안하고, 서버가 `countLineMatches`로 언급 비율을 계산해 `basis:"measured"` comparison_chart를 삽입. 펼치면 실제 리뷰 원문. 신규 유료 호출 없음.

삽입 위치: **review_highlight 바로 앞** (없으면 ai_disclosure/cta_price 직전).

## 체크리스트
- [x] A: `reviewAxes` 프롬프트 필드 + 파싱(최대 3, 6자 트림)
- [x] B: `buildAxisComparison` / `matchingLines` — matchCount&lt;2 필터, 축&lt;2면 생략
- [x] C: `insertReviewAxisComparisonSection` + 기존 comparison_chart 있으면 스킵 + route 배선
- [x] D: `ComparisonChartSection.evidenceQuotes`
- [x] E: 웹·HTML `<details>` 근거 보기 (evidenceQuotes 없으면 미노출)
- [x] 손검산 + 스크린샷 3 + 중복 방지 테스트
- [x] tsc EXIT 0

## 손검산
`review/137cha-axis-match.txt` (fixture: `scripts/fixtures/cosmetics-reviews-axis.txt`, 10줄)

| 축 | count | 생존 |
|----|-------|------|
| 수분감 | 2 | ✓ ourValue=20 |
| 흡수 | 2 | ✓ 20 |
| 무향 | 2 | ✓ 20 |
| 자극 | 2 | ✓ 20 |
| 은하수 | 0 | 필터됨 |

## 스크린샷
- `review/qa-screenshots/137cha-axis-chart.png` — measured 차트
- `review/qa-screenshots/137cha-axis-evidence-open.png` — 근거 보기 펼침
- `review/qa-screenshots/137cha-no-review.png` — COMPARE 없음

## 중복 방지
기존 `self_assessed` comparison_chart가 있으면 서버 삽입 스킵 → 차트 1개 유지 ✓

## tsc
```
EXIT_CODE=0
```
(`review/137cha-tsc-output.txt`)

## git diff --stat (타깃 파일)
```
 app/api/generate/route.ts            |  46 +++-
 app/dev/detail-preview/page.tsx      | 445 ++++++++++++++++++++++++++++++
 components/DetailSectionRenderer.tsx | 509 ++++++++++++++++++++++++++---------
 lib/export-detail-html.ts            |  73 ++++-
 lib/review-insights.ts               | 155 ++++++++++-
 lib/section-inserts.ts               | 120 ++++++++-
 lib/types/generate.ts                |  24 ++
```
※ renderer/preview 대형 diff에는 131~136 미커밋 누적 포함. 137 핵심은 review-insights / section-inserts / types / route / comparison 렌더·export.

## 검증 스크립트
`scripts/137cha-axis-comparison-smoke.ts` (유료 generate 없음)
