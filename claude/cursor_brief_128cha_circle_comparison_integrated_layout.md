# 128차 — 성분서클 + comparison_chart 통합 레이아웃 (렌더 전용 병합, 타입 확장 없음, 유료 API 0회)

생성: 2026-09-07
전제: **코드 작업만 진행합니다. 유료 Replicate/DeepSeek/Claude 호출 0회.** 127차 라이브 검증(재파지 사진 재테스트)은 이 브리프 이후로 보류.

## 0. 배경

124차 리포트(`review/124cha-report.md`) Track B에서 "성분서클+차트 통합 레이아웃"이 "타입 확장 범위"를 이유로 125차 후보로 이월된 뒤 아직 착수되지 않았습니다. 후커블 참고 이미지("BIO SPRAY" 등)에서 확인했던 것처럼, 성분 원형 배지와 비교 차트가 **한 카드 안에** 붙어 있어야 정보 밀도가 후커블에 가깝게 보입니다. 지금은 둘이 완전히 분리된 섹션이라(각각 독립된 배경·패딩·구분선), 어쩌다 같은 상품에 둘 다 나와도(현재 표본 10~12.5%) 시각적으로 이어져 보이지 않습니다.

이번 라운드는 **데이터 타입은 건드리지 않고 렌더링 단계에서만 병합**하는 방식으로 그 리스크를 없앤 버전입니다.

## 1. 현재 구조 (직접 확인함)

- `components/DetailSectionRenderer.tsx`
  - 941행 `renderSection()` — 섹션 1개당 독립 호출, 각자 `<section>` 래퍼(배경/패딩) 생성.
  - 1193~1201행 — `isCirclePair` / `isCircleSolo` 판정 로직 (image_text 섹션, layout `circle-pair`/`circle-solo`).
  - 1204~1261행 — circle-solo/circle-pair 렌더 JSX (원형 이미지 + 라벨).
  - 1882~1927행 — `comparison_chart` 렌더 JSX (`COMPARE` 라벨 + heading + `ComparisonMetricRow` 목록 + self_assessed 디스클레이머).
  - 3089행 `sections.map((section, index) => { ... renderSection(...) ... })` — 최상위 반복. 각 인덱스가 **1:1로 배열 순서와 대응**하며, 이 인덱스는 `sectionAnchors`/`quickFacts`/앵커 내비 등에서도 그대로 쓰입니다.
- `lib/apply-ingredient-circle-pair.ts` — circle 섹션을 **spec_table 바로 앞**에 서버가 결정적으로 삽입 (모델 선택 아님, 성분 라벨 파싱만 되면 항상 삽입).
- `comparison_chart`는 모델이 `section-templates.ts`의 BEAUTY 슬롯 노트를 보고 **선택적으로** 생성 (서버가 강제 삽입하지 않음) — 위치는 모델이 정함.
- 즉 circle과 comparison_chart가 배열에서 **우연히 인접**할 수도, 멀리 떨어질 수도 있습니다.

## 2. 할 것

### A. 인접 판정 + 병합 렌더 (타입 변경 없음)

`DetailSectionRenderer.tsx`의 `export default function DetailSectionRenderer(...)` 본문, `sections.map(...)` 호출 **이전**에 순수 배열 스캔 함수를 하나 추가:

```ts
// sections 배열은 건드리지 않고, "병합 대상 인덱스 쌍"만 미리 계산
function findCircleComparisonComboIndices(sections: DetailSection[]): Map<number, number> {
  // key: circle 섹션의 index, value: 바로 다음(또는 바로 이전) comparison_chart의 index
  // 조건: 두 섹션이 배열에서 완전히 인접(사이에 다른 섹션 없음)해야 함.
  // circle 유효성: isCirclePair 또는 isCircleSolo 판정과 동일한 기준 재사용(중복 정의하지 말고 공용 함수로 추출).
  // comparison_chart 유효성: section.metrics?.length > 0.
  // 순서는 [circle, chart] 또는 [chart, circle] 둘 다 허용.
}
```

- `isCirclePair`/`isCircleSolo` 판정 로직(1193~1201행)은 지금 `renderSection` 내부에 있어 재사용이 안 됩니다 — 이 두 판정 함수를 **파일 상단으로 추출**해서 `findCircleComparisonComboIndices`와 `renderSection` 양쪽에서 같은 함수를 쓰게 해주세요 (판정 기준이 두 곳에서 어긋나면 병합 감지가 틀어집니다).

`sections.map(...)` 루프 안에서:
- 현재 인덱스가 콤보의 **선두**(먼저 나오는 쪽)면 → 새 함수 `renderCircleComparisonCombo(circleSection, chartSection, ...)`가 만든 **하나의 `<section>`**을 `content`로 사용.
- 현재 인덱스가 콤보의 **후미**(이미 위에서 같이 렌더된 쪽)면 → `content`를 `null`로 처리해 스킵 (기존에도 `renderSection`이 `null` 리턴하는 케이스가 있으니 — 예: 1938행 `highlight_box` cards 비었을 때 — 같은 패턴 따라가면 됩니다).
- `sectionAnchors`, `quickFacts`, `imageTextCount`, `bodyIndex`, breather 삽입 로직 등 인덱스 기반 부가 로직은 **배열 자체를 건드리지 않으므로 그대로 둬도 안전**합니다. 다만 후미 인덱스가 `null` content가 됐을 때 breather/hero-follow 로직이 이상하게 동작하지 않는지 확인해주세요 (기존에도 `content`가 `null`이면 `return null` 하는 경로가 있으니 그 경로를 그대로 타면 됩니다).

### B. 병합 카드 시각 구성

`renderCircleComparisonCombo`는 대략 이런 구조로 (정확한 클래스/여백은 기존 톤 참고해서 자유롭게):
1. 섹션 배경/패딩은 `comparison_chart`의 `textSectionStyle` 사용 (COMPARE 라벨이 있는 쪽이 더 "정보 섹션"다움).
2. 맨 위: circle-solo/circle-pair의 원형 이미지 + 라벨 (기존 1204~1261행 JSX 재사용, 다만 카드 안에 들어가므로 원 크기를 기존 `h-[7.5rem] w-[7.5rem]` 대신 한 단계 작게(`h-20 w-20` 정도) 조정 — 아래 차트와 한 화면에 들어와야 함).
3. 중간: `COMPARE` 라벨 + `section.heading` (기존 1889~1897행 그대로).
4. 아래: `ComparisonMetricRow` 목록 (기존 1898~1911행 그대로).
5. 맨 아래: self_assessed 디스클레이머 (기존 1912~1925행 그대로).

즉 기존 JSX 블록 3개(circle 이미지 줄 / COMPARE 헤더 / 메트릭 바 목록)를 **재사용 가능한 서브 컴포넌트로 살짝 추출**해서 새 조합 함수 안에서 순서대로 배치하는 정도면 됩니다. 완전히 새로 디자인할 필요 없음.

### C. 안전장치

- 인접하지 않으면(둘 사이에 다른 섹션이 끼어 있으면) 병합하지 않고 기존처럼 각자 독립 렌더 — 무리하게 재정렬하지 않기.
- circle만 있고 comparison_chart 없음(대부분, ~88~90%) → 기존 렌더 100% 동일하게 유지 (회귀 없음 필수).
- comparison_chart만 있고 circle 없음 → 기존 렌더 100% 동일하게 유지.
- `DetailSection`, `ComparisonChartSection`, `ImageTextSection` 등 **타입 정의는 한 글자도 변경하지 않기** — 이번 라운드의 핵심 제약입니다.

## 3. 검증 (전부 무료 — Replicate/DeepSeek/Claude 호출 없이 가능)

1. `public/qa-fixtures/` 또는 `app/dev/detail-preview` 경로에 이미 있는 방식대로, circle-pair(또는 circle-solo) 섹션 바로 다음에 comparison_chart 섹션이 오는 **합성 fixture JSON**을 하나 만들어서 `/dev/detail-preview`로 렌더 → 스크린샷.
2. 같은 fixture에서 순서를 반대로(comparison_chart 먼저, circle 다음)도 한 번 테스트.
3. 기존 69차 circle-solo/circle-pair 회귀 fixture를 comparison_chart 없이 그대로 다시 렌더 → 병합 전과 픽셀 단위로 동일한지 확인 (스크린샷 비교).
4. 기존 124차 `review/124cha-comparison-disclaimer.png`를 만들었던 fixture(comparison_chart만 있고 circle 없음)도 다시 렌더 → 역시 기존과 동일한지 확인.
5. `tsc --noEmit` 0.

리포트에 스크린샷 4장(병합 성공 케이스 2장 순서별 + 회귀 2장) 원본 첨부, 126~127차와 동일하게 **요약 없이 원문/원본**으로요.

## 하지 않는 것

- `DetailSection` 계열 타입 변경
- comparison_chart 선택률(현재 10~12.5%) 자체를 올리는 작업 — 이건 별도 라운드(실제 상품 재생성 샘플링이 필요해서 비용 발생함, 이번엔 범위 밖)
- 유료 API 호출 (Replicate/DeepSeek/Claude 전부)
- 127차에서 보류한 라이브 재파지 사진 테스트 (이 브리프 완료 후 별도로 다시 논의)

## 완료 보고 체크리스트

- [ ] `isCirclePair`/`isCircleSolo` 판정 공용 함수 추출 (중복 정의 제거)
- [ ] `findCircleComparisonComboIndices` 구현 — 인접 쌍만 정확히 감지
- [ ] `renderCircleComparisonCombo` 구현 — 기존 JSX 블록 재사용
- [ ] 순서 무관(circle→chart, chart→circle) 둘 다 병합 확인
- [ ] 인접하지 않은 경우 병합 안 함 확인
- [ ] circle만 있는 기존 케이스 — 픽셀 동일 회귀 확인 (스크린샷 비교)
- [ ] comparison_chart만 있는 기존 케이스 — 픽셀 동일 회귀 확인 (스크린샷 비교)
- [ ] 타입 파일 변경 없음 확인 (`git diff --stat`에 types/generate.ts 없어야 함)
- [ ] `tsc --noEmit` 원본 출력 첨부
- [ ] 스크린샷 4장 원본 첨부
- [ ] 유료 API 호출 0회
