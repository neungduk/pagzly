# 242차 — comparison_table 불린 셀 export 배지

생성: 2026-09-23 · 유료 API **0** · 파일 3개(신규 1 + 수정 2)

## 한줄 결론

`classifyBoolishCell`을 공유 모듈로 추출하고, export `comparison_table`에도 라이브와 동일 원형 ✓/✗ 배지를 배선.

---

## 1. 변경

| 파일 | 내용 |
|------|------|
| `lib/comparison-cell-classify.ts` | **신규** — 라이브 판정 함수 그대로 추출 |
| `components/DetailSectionRenderer.tsx` | 지역 정의 삭제 → import (동작 동일) |
| `lib/export-detail-html.ts` | `comparisonCellHtml` + 셀 2곳 교체 |

무변경: `comparison_chart` case, 표 레이아웃(헤더·스트라이프)

---

## 2. 검증

`npx tsx scripts/242cha-comparison-table-boolish-verify.ts` → **ALL PASS**

| 검사 | 결과 |
|------|------|
| classify 26케이스 | yes/no/null 일치 |
| 배지 6개 · ✓/✗ 각 3 | OK |
| 일반 텍스트(3.5kg) | 배지 없음 |
| 열2 alpha 0.2 | OK |
| comparison_chart 미접촉 | OK |
| 241/238/237 회귀 | ALL PASS |

샷: `review/242cha-comparison-table-boolish/comparison-table-badges-export.png`

API generate: 0
