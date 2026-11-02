# 473차 목표 (코드 전에 확정, 낮추지 않는다)

측정: 말뭉치 21 × 아키타입 8, V5+UP1 켜짐. 문자열 지표 + Playwright 캡처(네트워크 차단, `--ph2`·`--localize-blocked`). 도구 `scripts/hero-metrics-473.ts`·`scripts/body-sig-473.ts`·`scripts/regression/hero-473.ts`·`scripts/regression-v5-473.ts`. 기준선은 472차 tip(`6c9ad13`).

| # | 지표 | 기준선(472) | 목표 |
|---|---|---|---|
| A1 | V5 히어로·장면: `text-overflow:ellipsis` / `-webkit-line-clamp` / (고정높이+overflow:hidden으로 본문 글 잘림) | impact 제목 말줄임 발생 | **0건** (문자열 검사 실패) |
| A2 | 히어로 제목=부제(동일·거의 동일) 시각 중복 | 같은 상품명 3연속 | **렌더에서 중복 숨김**(데이터 유지, a11y 유지) |
| A3 | 한눈에 보기 칸: 항목 2→1×2 꽉, 3→3칸 또는 1+2, 4→2×2 꽉 | catalog 빈 칸·impact/editorial 세로 낭비 | **규칙 통과(단위 시험)** |
| A4 | 구분 띠(breather.rule): 의도 모양(사선/점선/도형/라벨) | softlife 빈 막대 | **빈 단색 막대 0**, 라벨은 기존 번호/종류만 |
| B1 | 본문 시각 시그니처 6칸(번호 표기·목록 모양·큰 수치·구분선 어휘·모서리·그림자) 쌍 차이 | 색만 다른 부품 | **모든 쌍 ≥ 3** (6칸 중, 완화 금지) |
| B2 | POINT/SPEC/CHECK/STORY 기능 섹션이 아키타입마다 확연히 다른 DOM/CSS | 동일 골격 | **눈 검수 + B1 자동** |
| C1 | 눈 검수: 첫 화면 + 중간(1500~4000) 대조 "같아 보이는" 쌍 | 중간 구간 유사 | **0** |
| D | checklist/comparison V5 DOM 분기 | 472 보류 | 가능분 구현, 불가는 `review/473-notes.md` |
| S1 | export 크기 최대 | catalog ~139.7% | **≤ 140%** (다이어트 병행) |
| S2 | 출력 잠금 | diff 0 | V5 off=472 바이트 동일, V4 off 4a/4b/4c |
| S3 | 가로 넘침(320/390/750)·fold·폴백·탭·가격/고지 보존·463~472 회귀 | 통과 | 통과 |
| S4 | run-all 기존 실패 4건(muted·픽셀대비·DB SQL·heavy guard) | 실패 | **미착수**(보고서에만 기록) |

캡처 산출물(커밋 안 함): `review/473-captures/` — 4픽스처 × 8종 전체 길이 + 첫화면 대조 + 중간(1500~4000) 대조.
