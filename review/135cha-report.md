# 135차 — 리뷰 매칭 카운트 + 입력 기반 안심 카피

## 요약
- **A:** praise/complaint별 원문 키워드 매칭 건수를 결정론적으로 계산해 `N건 언급` 배지로 노출 (0건은 숨김). 신규 유료 API 없음.
- **B:** `buildStyleRubricBlock()`에 literal 안전/제외 표현이 있을 때만 안심 문장 허용 지시 추가. 경쟁사 폄훼 금지 유지.

## 체크리스트
- [x] A: `extractCoreKeywords` / `countLineMatches` + 타입 배선 + section-inserts 인덱스 정합 + 웹/HTML 렌더 + 0건 배지 숨김
- [x] B: 조건부 안심 지시 + hallu 0 + 무입력 강제 안심 없음 + 경쟁사 grep 0
- [x] `tsc --noEmit` EXIT_CODE=0
- [x] `git diff --stat` — 대규모/범위 외 파일은 아래 사유 명시

## A 손검산 (fixture)
`scripts/fixtures/cosmetics-reviews.txt` 6줄 기준 — 전문 `review/135cha-A-match-table.txt`

| praise/complaint | keywords | count | 매칭 라인 |
|---|---|---|---|
| 끈적임 없이 흡수돼요 | 끈적임, 없이, 흡수돼요 | 2 | L2(끈적임), L3(없이) |
| 무향이라 자극이 없어요 | 무향이라, 자극이, 없어요 | 2 | L2(없어요), L3(무향이라) |
| 은하수 성분으로 빛나요 | 은하수, 성분으로, 빛나요 | **0** | (없음 → 배지 숨김) |
| 용량이 조금 아쉬워요 | 용량이, 조금, 아쉬워요 | 1 | L4 |
| 경쟁사보다 별로예요 | 경쟁사보다, 별로예요 | 0 | (없음) |

인덱스 정합: `["끈적임…", "", "무향…"]` + counts `[2, 99, 2]` → 필터 후 praises 2개·counts `[2,2]`, 99 누수 없음 ✓

## B 카피 비교
`review/135cha-B-copy-compare.txt`

- **with-safety** (`파라벤 프리, 무첨가` / `무향`): FEATURE에 “향료를 넣지 않는… 불필요한 첨가물을 빼낸 무첨가” 등 입력 재진술. hallu=0, competitor=0
- **no-safety** (`히알루론산, 글리세린`만): 무첨가/파라벤/무향 언급 없음. hallu=0, competitor=0, 강제 안심 문장 없음

## 스크린샷
- `review/qa-screenshots/135cha-match-badges.png` — 배지 3개만 표시 (praise 0건·concern 0건은 숨김)

## tsc
```
EXIT_CODE=0
```
(`review/135cha-tsc-output.txt`)

## git diff --stat (핵심 135 파일)
```
 app/api/generate/route.ts              |  22 ++++++-
 lib/copy-orchestrator/deepseek-copy.ts |   7 +++
 lib/export-detail-html.ts              |  50 ++++++++++++++--
 lib/review-insights.ts                 | 101 +++++++++++++++++++++++++++++----
 lib/section-inserts.ts                 |  62 ++++++++++++++++++--
 lib/types/generate.ts                  |  16 ++++++
 6 files changed, 233 insertions(+), 25 deletions(-)
```

### 범위 외·대형 diff 사유
| 파일 | 사유 |
|---|---|
| `components/DetailSectionRenderer.tsx` | 131·133차 미커밋 변경 + 이번 match 배지 |
| `app/dev/detail-preview/page.tsx` | 131·133 캡처 픽스처 누적 + `135-match-badges` |
| `app/create/result/page.tsx` | 134차 UI(직접 편집 배지) 미커밋 + `withReviewSections`에 matchCounts 배선(필수). 직접 편집 토글 영역은 이번 라운드에서 추가 수정하지 않음 |
| `scripts/135cha-review-match-smoke.ts` | 검증용 (untracked) |

## 신규 유료 호출
없음. A는 로컬 문자열. B는 기존 DeepSeek/Claude 카피 파이프라인에 지시 1단락만 추가 (검증용 카피 2회는 기존 파이프라인).
