# 473차 D — 일반 섹션 재검토

472 보류분을 V5 분기 관점에서 다시 본다. 새 글자 없음. 비교 정책·수치 게이트는 유지.

| 항목 | 판정 | 근거 |
|---|---|---|
| checklist 2열 카드/칩/계단 | **구현** | `lib/checklist-layout-v5.ts`에 모드 표·export HTML·라이브 힌트를 공용으로 두고, `export-detail-html` / `DetailSectionRenderer`의 hub·pain bubble 제외 기본 그리드만 `designV5On()`+아키타입 id로 분기. BODY_SIG.list에 맞춤(chip→chips, stair/timeline→stair, rows/bento→rows, 그 외→cards2). V5 off 경로는 기존 ul 그대로. |
| comparison 좌우 분할 / 공용 추출 | **불가(이번 차)** | `comparisonChartBodyHtml`(export 문자열)과 `renderComparisonChartBody`(라이브 React)가 쌍둥이이지만 표현형이 달라 한 모듈로 뽑으면 JSX·HTML 이중 API가 된다. 수치 막대·checklist presentation·versus 헤더·근거 details·`comparison-policy` 회귀가 한 커밋에 묶여, checklist DOM만 건드린 이번 범위에서 추출하면 회귀 면적이 과도하다. 머리글 대비는 기존 `generalCssV5` thead 규칙 유지. |
| spec_table 게이지 | **불가(유지)** | 472와 동일 — 구조화 max 없음, 환각 위험. |

## 다음 후보
- comparison 본문을 `lib/comparison-chart-body.ts`로 추출하되, 먼저 라이브·export 스냅샷 회귀를 분리한 뒤 V5 DOM(좌우 분할)만 가드.
- checklist hub/pain bubble도 BODY_SIG에 맞출지 별도 결정.
