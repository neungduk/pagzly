# 130차 리포트 — 코드 품질 감사 (로그 정리 + 데드코드)

생성: 2026-09-07  
유료 API: **0회**  
`TEST_MODE=true`  
비즈니스 로직 변경: **없음** (로그·데드 export만)

## A. 변경 전 인벤토리 (`\[\d+cha\]` in lib/app/components)

원문: `review/130cha-inventory-before.txt`

프로덕션 트리에 **5건만** 존재 (124/128/129cha 태그 로그 없음):

```
components\CreateProductForm.tsx:611:        `[126cha][create-form] submit ...`
app\api\lifestyle-composite\route.ts:54:      `[125cha][api/lifestyle-composite] ...`
lib\photo-pipeline-client.ts:686:        `[125cha][photo-pipeline] lifestyle scale ...`
lib\photo-pipeline-client.ts:700:          `[125cha][photo-pipeline] POST /api/lifestyle-composite ...`
app\create\draft\page.tsx:304:      `[126cha][draft] runPhotoEnhancementPipeline ...`
```

## B. 중복 통합

| 후보 | 판정 |
|------|------|
| `[photo-pipeline] uploaded=…enhanced=…` vs `[125cha][photo-pipeline] lifestyle scale…` | **합치지 않음** — 시점·필드가 다름 (최종 카운트 vs scale shouldAttempt). 브리프 예시는 실질 중복 아님. |
| 두 개의 `[125cha][photo-pipeline]` (scale / POST body) | **합치지 않음** — skip 경로에서는 첫 줄만, POST 시 body 검증용 둘째 줄. 애매하면 유지 정책. |

→ **이번 라운드에서 제거·통합한 [Ncha] 로그: 0건.**

## C. 태그-동작 감사

| 태그 | 내용 | 판정 |
|------|------|------|
| `[125cha]` lifestyle scale / API | 높이(cm)·shouldAttempt | 동작 일치. 126이 폼 배선만 추가 — 태그 유지. |
| `[126cha]` create-form / draft | productHeightCm 전달 | 동작 일치. |
| `[circle-solo/pair] ${insertBefore} 직전` | 129차 동적 삽입 (cha 태그 없음) | 문구가 insertBefore와 일치. |

태그-동작 불일치로 **수정한 항목: 0건.**

## D. per-image 집계 로그 (개별 줄 유지 + 배치 요약 추가)

신규: `lib/cost-log-tally.ts`

- `sharpenCutout` / `enhanceProductImage rembg` / `claude/*`(via `logClaudeCost`) → `addCostLogTally`
- `generate-backdrop` 시작 시 `resetCostLogTallies()`
- enhance 배치 종료 후 클라이언트 → `POST /api/enhance-image { flushCostTalliesOnly: true }` →  
  `[cost] sharpenCutout total: N회 $X.XXXX` 등 요약 후 리셋

개별 `[cost] sharpenCutout: …` / rembg / `claude/productRegionDetect` 줄은 **삭제하지 않음**.

## E. @deprecated export 스윕

### 삭제함 (호출부 0건 확인)

| export | 위치 |
|--------|------|
| `generateAutofillDraftFromPhotos` | `lib/autofill-draft.ts` |
| `PhotoPipelineProgress` (type alias) | `lib/photo-pipeline-client.ts` |
| `DETAIL_EXPORT_FONT_CSS` | `lib/detail-typography.ts` |
| `DEFAULT_ROUTER_RETRY_LIMIT` | `lib/image-router/pricing/config.ts` (+ index re-export) |
| `IMAGE_PRICING_CONFIG` (cost 쪽 deprecated 별칭) | `lib/cost/pricing-config.ts` |

### 유지함 (호출부 있음 또는 HTTP 표면)

| export | 이유 |
|--------|------|
| `DETAIL_FONT_STACK.heading` | `lib/blog-post.ts` 사용 |
| `jobRowToGenerateResult` | `lib/image-router/jobs/job-service.ts` 사용 |
| `GET /api/image-jobs/[id]` | 코드 호출 0이지만 **HTTP 라우트** — 이번 라운드에서 삭제 안 함 (후보만) |
| `IMAGE_PRICING_CONFIG` (image-router) | `@deprecated` 아님, index re-export 유지 |

잔여 `@deprecated`: `review/130cha-deprecated-remaining.txt`

## F. 변경 후 grep / inventory

원문: `review/130cha-inventory-after.txt`  
→ **동일 5건** (줄번호만 photo-pipeline에 flush 추가로 +8). `[Ncha]` 삭제 없음.

## G. QA 스모크 (동작 불변)

| 스모크 | 결과 |
|--------|------|
| `129cha-circle-placement-smoke` | EXIT 0 |
| `129cha-circle-combo-capture` | combo=1 / regression combo=0 |
| `128cha-circle-comparison-capture` | combo=1×2, regression 0, non-adjacent 0 |

로그: `review/130cha-combo-capture.txt`, `review/130cha-128-capture.txt`, `review/130cha-129-smoke.txt`

## H. tsc

원본: `review/130cha-tsc-output.txt`  
(중간 `.next/dev/types` 손상으로 1회 EXIT 2 → types 재생성 후)

```
EXIT_CODE=0
```

## I. git diff — 로직 파일

`lifestyle-product-composite.ts`: **130차 변경 없음**

`apply-ingredient-circle-pair.ts`: diff는 **129차 미커밋 작업** (삽입 위치 로직). 130차 로그 작업과 무관.

130 범위 파일만: `review/130cha-git-diff-stat-scoped.txt`

```
 app/api/enhance-image/route.ts     | 47 ++++++
 app/api/generate-backdrop/route.ts |  4 +
 lib/autofill-draft.ts              |  6 +-
 lib/claude-cost.ts                 |  3 +
 lib/cost/pricing-config.ts         |  3 -
 lib/detail-typography.ts           |  7 -
 lib/image-router/index.ts          |  1 -
 lib/image-router/pricing/config.ts |  3 -
 lib/photo-enhance.ts               |  4 +
 lib/photo-pipeline-client.ts       | 14 +-
 (+ untracked lib/cost-log-tally.ts)
```

## 체크리스트

- [x] 변경 전 라운드 태그 로그 전체 인벤토리
- [x] 진짜 중복만 통합 (해당 없음 — 명시)
- [x] 태그-동작 불일치 목록 (수정 0)
- [x] per-image 집계 로그 추가 (개별 유지)
- [x] @deprecated 전수 — 0건만 삭제
- [x] QA 스모크 재실행
- [x] git diff — 로직 의도치 않은 변경 없음 확인
- [x] tsc EXIT_CODE=0
- [x] 유료 API 0회
