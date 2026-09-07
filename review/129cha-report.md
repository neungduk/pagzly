# 129차 리포트 — 성분서클 삽입: comparison_chart 인접 우선

생성: 2026-09-07  
유료 API: **0회** (DB 읽기 전용만)  
`TEST_MODE=true` 유지

## 요약

- `applyIngredientCircleVisual()`이 `comparison_chart`(metrics>0)가 있으면 **그 바로 앞**에 circle을 삽입 → 128차 병합 카드가 실제 생성 경로에서도 발동 가능.
- chart 없으면 기존처럼 `spec_table` 앞 삽입 (회귀 OK).
- `applyIngredientCirclePair` 별칭: **코드 호출 0건 확인 후 삭제**.

## A. 코드 변경

`lib/apply-ingredient-circle-pair.ts`

- `comparisonChartIndex()` / `circleInsertIndex()` 추가
- insert 분기: chart ≥ 0 → chart 앞, else → spec_table 앞
- `pickAlternateIndex`·solo/pair·URL 검증 로직 변경 없음
- deprecated alias `applyIngredientCirclePair` **삭제**

## B. DB 거리 조사 (읽기 전용, 최근 30건)

원문: `review/129cha-db-distance.txt`

| 항목 | 값 |
|------|-----|
| scanned | 30 |
| comparison_chart 있음 | **3** |
| adjacent (\|dist\|≤1) | **2** |
| near (2–4) | 0 |
| far (5+) | **0** |
| chart만 있고 spec 없음 | 1 |
| no chart | 27 |

관찰: 최근 샘플에서 chart가 있는 3건 중 2건은 이미 spec과 인접(거리 1). far(5+)는 이번 샘플에 없음. 거리 임계값 로직은 다음 라운드 후보로만 기록(이번 스펙대로 “있으면 인접” 적용).

## C. 별칭 grep (삭제 전·후)

### 코드 확장자 (`*.{ts,tsx,js,jsx}`) — 호출부 0건

```
(empty — applyIngredientCirclePair matches in source code: 0)
```

파일: `review/129cha-grep-alias-code.txt` (비어 있음)

### 전체 검색 — 문서 언급만

- `claude/cursor_brief_69cha_*.md`, `claude/cursor_brief_129cha_*.md` (브리프 텍스트)
- `review/65cha-report.md` (과거 리포트 문구)

`lib/apply-ingredient-circle-pair.ts`에서 alias export **ABSENT** 확인.

## D. 단위 테스트 (`scripts/129cha-circle-placement-smoke.ts`)

| 케이스 | 결과 |
|--------|------|
| far (chart↔spec dist=6) | circle 바로 앞 chart ✓ |
| near (chart 옆 spec) | circle 바로 앞 chart ✓ |
| no chart | circle 바로 앞 spec_table ✓ |

로그: `review/129cha-unit-db-run.txt`

## E. 128 combo 발동 캡처

| capture | combo | 파일 |
|---------|-------|------|
| `129-after-apply-far` | **1** | `review/129cha-combo-after-apply-far.png` |
| `69-circle-solo` (회귀) | **0** | `review/129cha-regression-circle-solo.png` |

노트: `review/129cha-capture-notes.txt`

## F. tsc

원본: `review/129cha-tsc-output.txt`

```
EXIT_CODE=0
```

## 체크리스트

- [x] `comparisonChartIndex()` 추가, 있으면 그 앞에 삽입
- [x] comparison_chart 없는 기존 경로 회귀
- [x] DB 읽기 전용 거리 조사 원문 첨부
- [x] fixture로 128 combo (`data-testid=circle-comparison-combo`) 발동 확인
- [x] `applyIngredientCirclePair` grep 첨부 후 삭제
- [x] `tsc --noEmit` EXIT_CODE=0
- [x] 유료 API 0회

## 변경 파일

- `lib/apply-ingredient-circle-pair.ts`
- `app/dev/detail-preview/page.tsx` (`129-after-apply-far`)
- `scripts/129cha-circle-placement-smoke.ts`
- `scripts/129cha-circle-combo-capture.ts`
- `review/129cha-*`
