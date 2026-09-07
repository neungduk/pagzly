# 131차 리포트 — review_highlight에 실제 후기 아쉬운 점(concerns) 노출

생성: 2026-09-07  
신규 유료 API: **0회** (기존 `extractReviewInsights` 결과 재사용만)  
`TEST_MODE=true`

## 요약

이미 계산되던 `commonComplaints`를 `ReviewHighlightSection.concerns`로 배선해 화면에 톤 다운 노출. AI 반박/안심 카피 없음. praises 없으면 섹션 생략(기존과 동일).

## 변경

| 파일 | 내용 |
|------|------|
| `lib/types/generate.ts` | `concerns?: string[]` |
| `lib/section-inserts.ts` | build/insert가 complaints 수신, max 3 |
| `app/api/generate/route.ts` | `commonComplaints` 전달 |
| `app/create/result/page.tsx` | result 경로도 complaints 전달 |
| `components/DetailSectionRenderer.tsx` | concerns 조건부 블록 |
| `lib/export-detail-html.ts` | export 동기화 |
| `app/dev/detail-preview/page.tsx` | 픽스처 3종 |
| `scripts/131cha-review-concerns-smoke.ts` | 단위+캡처 |

## 검증

### 픽스처 3케이스

| 케이스 | capture | rh | concerns | 스크린샷 |
|--------|---------|----|----------|----------|
| (a) praises만 | `131-praises-only` | 1 | 0 | `review/131cha-praises-only.png` |
| (b) praises+concerns | `131-with-concerns` | 1 | 1 | `review/131cha-with-concerns.png` |
| (c) 리뷰 없음 | `131-no-review` | 0 | 0 | `review/131cha-no-review.png` |

노트: `review/131cha-capture-notes.txt` — SMOKE_EXIT=0

### tsc

`review/131cha-tsc-output.txt` → `EXIT_CODE=0`

### git diff --stat (이번 라운드 관련)

원문: `review/131cha-git-diff-stat.txt`

```
 app/api/generate/route.ts            |  13 +-
 app/create/result/page.tsx           |   4 +-
 app/dev/detail-preview/page.tsx      | 217 ++++++++++++++++++
 components/DetailSectionRenderer.tsx | 422 +++++++++++++++++++++++++----------
 lib/export-detail-html.ts            |  16 ++
 lib/section-inserts.ts               |  11 +-
 lib/types/generate.ts                |   3 +
```

참고: `DetailSectionRenderer.tsx` / `detail-preview` 큰 diff에는 **미커밋 128~129차** 변경이 포함됨. 131 핵심은 `review_highlight` concerns 분기·픽스처·export·insert·route.

### 유료 API / extractReviewInsights 호출 불변

호출부 원문: `review/131cha-extract-call-sites.txt`

```
lib/review-insights.ts — 정의 + [cost] 로그
app/api/generate/route.ts:642 — 기존 단일 await (reviewFileUrl 있을 때만)
```

이번 스모크는 detail-preview fixture만 사용 → 서버 로그에 `[cost] extractReviewInsights` **0회** (신규 생성·추출 없음).

## 체크리스트

- [x] `concerns?: string[]` 타입
- [x] build/insert complaints 확장
- [x] route.ts commonComplaints 전달 (신규 API 없음)
- [x] 렌더러 조건부·톤 다운·반박 없음
- [x] export-detail-html 동기화
- [x] 픽스처 3케이스 스크린샷
- [x] tsc EXIT_CODE=0
- [x] git diff --stat 첨부
- [x] extractReviewInsights 호출 횟수 불변 증거
