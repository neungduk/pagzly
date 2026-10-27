# 466차 진행 현황
| Phase | 상태 |
|---|---|
| 0 원인 지도 | 완료 (`docs/v5-macro-466.md`, 도구 `scripts/variety-metrics-466.ts`) — 변형 선택은 강도 정렬이 prefer를 덮음, 히어로는 아키타입 입력 없음, 진한 면 주입점 = boldBlock/faceCycle/히어로, 빈 사진 면 = 불확실(가짜 현상 가능성 높음) |
| 1 면 전략 | 완료 (`lib/face-strategy-v5.ts`, `scripts/contrast-audit-466.ts`, 회귀 `v5-466`) — 밝은 6종 진한 면 2.2~2.7%, impact 28.5%, pop 33.3% (목표 달성). 진한 덩어리 최대 8(428 예산 초과 가능, 공개) |
| 2 변형 확정 선호 | 완료 — 계열별 합집합 benefits7·concern6·story6·spec6·phototext7·faq5, story 100% pullband·faq 100% chat 해소, 접점·띠도 선호, 합성 입력 회귀(rows2·big3·iconlist·chapter·letter) |
| 3 히어로 | 완료 — `pickHeroV5`, 아키타입별 히어로 선호(기존 A~E), lightOnly 3종 히어로 전부 밝음, 8종이 A~E 5종 사용 |
| 4 타이포·정렬 | 부분 완료 — 중앙 정렬 평균 0.325(≤0.33)·각 ≤0.40·연속 ≤4 달성, 제목 굵기 534~895로 갈림(`typographyV5`, `planAlignV5`). **평탄 구간 48~71(목표 ≤37) 미달** — 시도 3종 효과 없어 되돌림, 원인 보고 |
| 5 빈 사진 면 | 완료(조치: 갤러리 `--localize-blocked`, pc-todo 확인 한 줄) — 분류 "불확실, 가짜 현상 가능성 높음", 앱 출력 변경 없음 |
| 6 안전망 | 완료 — `v5-466`: 진한 면 대비 전수·진한 면 비율·변형 합집합·선택 조건·히어로·정렬/타이포·28쌍×7축(≥3)·실제 페이지 대비 0, `v5-465` 재통과. 실제 대비 위반 5건 수정 |
| 7 문서·보고서 | 남음 |

## 막힘
(없음)
