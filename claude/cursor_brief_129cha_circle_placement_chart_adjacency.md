# 129차 — 성분서클 삽입 위치를 comparison_chart 인접 우선으로 (128차 병합 기능 실제 활성화) + 데드코드 정리

생성: 2026-09-07
전제: **코드 작업만. 유료 Replicate/DeepSeek/Claude 호출 0회.** DB 읽기 전용 조회는 허용(쓰기·생성 없음).

## 0. 배경 — 왜 이 브리프가 필요한가

128차에서 성분서클+comparison_chart 병합 렌더를 완성했지만, **두 섹션이 배열에서 우연히 인접해야만** 병합이 발동합니다. 그런데 직접 코드를 확인해보니 성분서클은 `lib/apply-ingredient-circle-pair.ts`의 `applyIngredientCircleVisual()`이 **항상 spec_table 바로 앞**에 결정적으로 삽입하고, comparison_chart는 모델이 만들 때 **어디든** 넣을 수 있습니다 — 즉 실제 상품에서는 둘이 인접할 확률이 낮아서 128차 병합 카드가 사실상 거의 발동 안 할 가능성이 큽니다.

`app/api/generate/route.ts`에서 `applyIngredientCircleVisual()`이 호출되는 두 지점(1116행, 1604행) 모두 **모델이 생성한 `sections` 배열이 이미 확정된 뒤**입니다 — 즉 이 시점에 comparison_chart가 이미 배열에 있다면 그 위치를 알고 인접 삽입으로 바꿀 수 있습니다.

## 1. 할 것

### A. 삽입 위치 로직 변경 (`lib/apply-ingredient-circle-pair.ts`)

`applyIngredientCircleVisual()` 안에서 현재:
```ts
const specIdx = specTableIndex(sections);
if (specIdx < 0) { return { sections, applied: false }; }
```
이 부분 **앞에** comparison_chart 탐색을 추가:
```ts
function comparisonChartIndex(sections: DetailSection[]): number {
  return sections.findIndex(
    (s) => s.type === "comparison_chart" && Array.isArray(s.metrics) && s.metrics.length > 0,
  );
}
```
- comparison_chart가 있으면 → **그 인덱스 바로 앞**에 삽입 (circle → chart 순서, 128차 combo가 이 순서를 정상 지원함을 이미 확인함).
- comparison_chart가 없으면 → **기존처럼** spec_table 앞에 삽입 (회귀 없음, 폴백 유지).
- `pickAlternateIndex` 등 이미지 인덱스 선택 로직은 건드리지 않음 — 삽입 **위치**(어디에 splice할지)만 바뀌는 것.
- solo/pair 분기, 이미지 URL 검증 로직 전부 그대로.

### B. 실제 배포 전 거리 확인 (읽기 전용, 생성 없음)

새 코드를 실제로 적용하기 전에, DB에서 **최근 상품 20~30건**의 저장된 `sections` JSON을 읽기 전용으로 조회해서:
- comparison_chart가 있는 상품에서, 원래 circle이 들어갔을 위치(spec_table 인덱스)와 comparison_chart 인덱스 사이 거리(섹션 개수)를 계산.
- 거리가 너무 멀면(예: 5개 섹션 이상 차이) circle을 그쪽으로 옮기는 게 오히려 어색할 수 있음 — 이 경우 발견 사실을 리포트에만 적고, 코드는 일단 이번 스펙대로 적용(더 정교한 "거리 임계값" 로직은 다음 라운드로 미뤄도 됨). 이 조사는 참고용이며 구현을 막는 조건은 아님.

### C. 데드코드 정리 (별건, 낮은 리스크)

`lib/apply-ingredient-circle-pair.ts` 134~135행:
```ts
/** @deprecated applyIngredientCircleVisual 사용 */
export const applyIngredientCirclePair = applyIngredientCircleVisual;
```
전체 코드베이스에서 `applyIngredientCirclePair`(별칭 쪽) 사용처를 검색했을 때 **실제 호출부가 0건**입니다(오래된 브리프 문서 안의 텍스트 언급만 있음). 사용처가 정말 없는 걸 다시 한번 확인한 뒤 이 별칭 export를 삭제해주세요. 확인 없이 지우면 안 되고, 반드시 `grep`/전체 검색 결과를 리포트에 첨부.

## 2. 검증 (전부 무료)

1. B의 DB 조회 결과(거리 분포) 원문 리포트에 첨부.
2. 128차와 동일한 fixture 방식으로: comparison_chart가 spec_table과 멀리 떨어진 fixture, 바로 옆인 fixture 둘 다 만들어서 `applyIngredientCircleVisual` 단위 테스트 — circle이 comparison_chart 바로 앞에 정확히 삽입되는지 배열 인덱스로 확인.
3. comparison_chart가 **없는** 기존 케이스 — circle이 여전히 spec_table 앞에 삽입되는지 회귀 확인 (69차 기존 스모크 재사용).
4. `applyIngredientCirclePair` 삭제 후 `tsc --noEmit` 0.
5. 위 3번 fixture로 128차 combo가 실제로 발동하는지(`data-testid=circle-comparison-combo`) 최종 확인 — 이번 브리프의 핵심 목적.

## 하지 않는 것

- 새 상품 생성(유료 API) — DB는 **기존 데이터 읽기만**
- comparison_chart 선택률 자체를 올리는 프롬프트 작업 (별도 라운드)
- "거리가 멀면 삽입 안 함" 같은 정교한 임계값 로직 — 이번엔 단순 "있으면 인접, 없으면 기존"만

## 완료 보고 체크리스트

- [ ] `comparisonChartIndex()` 추가, 있으면 그 앞에 삽입하도록 분기
- [ ] comparison_chart 없는 기존 경로 회귀 없음 확인
- [ ] DB 읽기 전용 거리 조사 결과 원문 첨부 (몇 건 중 몇 건이 인접/근접/멀리 떨어졌는지)
- [ ] 새 fixture로 128차 combo 실제 발동 확인 (`data-testid` 카운트)
- [ ] `applyIngredientCirclePair` 별칭 grep 결과 첨부 후 삭제
- [ ] `tsc --noEmit` 원본 출력
- [ ] 유료 API 호출 0회 (DB 읽기 제외)
