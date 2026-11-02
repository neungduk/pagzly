# 472차 D — 남은 일반 섹션 재검토

471차 보류분을 V5 분기 관점에서 다시 본다. 새 글자 없음. 비교 정책·수치 게이트는 유지.

| 항목 | 판정 | 근거 |
|---|---|---|
| checklist 2열 카드 | **부분 가능 → 이번 차 보류(구현 범위)** | 공용 렌더는 `comparisonChartBodyHtml`(export)·라이브 쌍둥이. V5 가드 안에서 `presentationStyle==="checklist"`일 때 DOM을 카드 그리드로 바꾸는 분기는 가능하나, 라이브·export 양쪽·수치 게이트 산출물·기존 회귀(comparison-policy)를 한 번에 맞춰야 해서 A·C·캡처 우선 뒤 별 커밋이 안전하다. CSS만으로는 표→카드 불가(471과 동일). |
| comparison 좌우 분할 | **동일 사유로 보류** | 같은 공용 함수. 머리글 대비는 기존 `generalCssV5` thead 규칙 유지. |
| spec_table 게이지 | **불가(이번 차)** | 단일 출처 수치(값+최대)가 구조화돼 있는 항목이 말뭉치에 없다. 문장·단위 혼합("30g","5구")에서 막대 길이를 만들면 환각. 469 `specListCssV5` 범위만 유지. |

## 다음 후보
- `comparisonChartBodyHtml`을 라이브·export 공유 모듈로 추출한 뒤 `designV5On()` 분기에서 checklist→2열 카드, compare→좌우 분할.
- 입력 스키마에 `specRows: { label, value, max? }[]`가 생기면 게이지 허용.
