# 468차 진행 현황
467차 완료(`review/467cha-report.md`, `4d60110`) 후 시작.
| Phase | 상태 |
|---|---|
| 0 지표 재정의·목표 | 완료 (`docs/dynamics-audit-468.md`, `scripts/dynamics-metrics-468.ts`, `scripts/dynamics-report-468.ts`) |
| 1 배너 아키타입화 | 완료 — `lib/banner-v5.ts`(토큰 `banner:[첫,다음]` 번갈아), 섹션 `v5Banner`→두 렌더러 한 줄 주입. 밝은 6종 전면 스크림 0.71→0.00/페이지, 진한 면 평균 5→2.5~4.5%. 회귀 `dynamics-468`(run-all 등록) |
| 2 읽히는 제목 스케일 | 완료 — 토큰 `type.title/display`, `fitTitlePx`(가장 긴 어절·전체 폭 기준 단계 선택, 기존 크기 미만 없음), 읽히는 초점 중앙값 8종 전부 목표 달성(editorial 2.86·impact 3.14 등). export 크기 +35% 여유 확보를 위해 dots-grid 장식 SVG를 `<g fill>`로 축약(135.1%→132.9%). 회귀 `dynamics-468` |
| 3 구도 깨기 | 대기 |
| 4 빈 사진 틀 | 완료 — V5 켜짐 한정 `noPhotoCssV5`(폴백 틀 max-height 280px, 밝은/어두운 사선 대비 ≥1.25, 안쪽 테두리)를 `archetypeCssV5`에 추가(라이브·export 공통). 사진 URL이 비는 경우는 파이프라인이 이미 틀을 만들지 않음(none 모드 틀 0개)을 확인. 런타임 실패(export=문서 머리 error 리스너, 라이브=watchNoPhotoFrames)는 CSS 상한으로 처리. 기준(꺼짐)의 같은 결함은 기존 결함·꺼짐 수정은 별도 결정. `exportHtmlPhotos`(none/partial/all) 추가 |
| 5 일반 섹션 확대 | 대기 |
| 6 구도 계획기 | 대기 |
| 7 안전망·갤러리 | 대기 |
| 8 문서·보고서 | 대기 |

## 막힘
(없음)
