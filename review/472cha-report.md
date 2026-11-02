# 472차 보고 — 첫 화면 "눈으로 다름" + 캡처 자기 검수

문자열 지표 + Playwright 캡처(네트워크 차단, `--ph2`·`--localize-blocked`·`file:`/`data:`만). 모든 변경은 `NEXT_PUBLIC_DESIGN_V5` 켜짐에서만. V5 off는 471차와 동일(V4 off 락 통과). **main push 없음** — `cloud-work`만.

## 목표 대비 실측

| 항목 | 목표 | 실측 | 판정 |
|---|---|---|---|
| V1 시각 시그니처 쌍 ≥4 | 전 쌍 | `regression/hero-472` 통과 | 달성 |
| V2 히어로 색 계열 ≥5 | 8종 | 통과(상품 accent+hueShift, sat는 shift 고정) | 달성 |
| V3 눈 검수 "같아 보이는" 쌍 | 0 | 키보드 스트립 기준 catalog≠softlife≠pop≠impact | 달성 |
| F1 평탄 합 ≤37 | 8종 | editorial 35·catalog 24·softlife 7·impact 32·techsheet 19·narrative 33·luxe 27·pop 18 | 달성 |
| F2 단일 3연속 ≤0.5 | 8종 | 전부 0.00 | 달성 |
| H4b 높이 통일 | 계획=지표 | `V4_HEIGHT`/`breatherRuleHeight` 공유, 장면 쌍 짧은 구간 회귀 통과 | 달성 |
| D 일반 섹션 | 가능분/근거 | 보류·불가 — `review/472-notes.md` | 기록 |
| S1 export ≤140% | 최대 | 최악 catalog/living-storage **139.7%** | 달성 |
| S2 출력 잠금 | diff 0 | `check-v4-off` 통과 | 달성 |
| S3 가격·탭·폴백·하한 | 보존 | hero-472 보존 검사 통과 | 달성 |

## 눈으로 본 판정 (`review/472-captures/`, 커밋 안 함)

경로: `review/472-captures/strip__{fx}__{750|390}.png` 및 개별 `__{arch}__{W}.png`.  
픽스처: keyboard / skincare / dress / snack × 아키타입 8 × 폭 2.

키보드 750 스트립(최종 시각 수정 후):
- **catalog**: 흰 바탕 + 사진 좌/정보 우 분할 — 더 이상 파란 B면이 아님
- **softlife**: 파스텔(라벤더) + 아치/원형 사진 + 위쪽 제목·둥근 가격
- **pop**: 채도 높은 보라(상품 파랑에서 hueShift) + 기울인 카드 틀 + 스티커 가격
- **impact**: 어두운 풀블리드 + 오버레이 거대 제목 + 큰 가격/한눈에 숫자
- **techsheet**: 올리브/머스타드 포화 면 — pop과 색이 겹치지 않음
- softlife(원형 파스텔) vs luxe(원형 민트)는 틀은 비슷하나 색·제목 위치·면적이 달라 "같은 화면"으로 보이지 않음

같아 보이던 catalog/softlife/pop(+impact) 문제는 **해소**. 캡처는 `.gitignore`의 `review/472-captures/`.

## 미달과 이유

없음(목표 항목 기준). D항 checklist/comparison DOM·spec 게이지는 구조적 이유로 보류/불가(노트 참고).

## 변경 파일(요지)

- `lib/hero-stack-v5.ts` — 시각 시그니처·틀/면 CSS, catalog 분할, pop/techsheet hue
- `lib/hero-spec.ts` — `heroFaceForV5` sat에 hueShift 고정 반영
- `lib/page-archetype-v5.ts` — 히어로 선호·stackInk
- `lib/layout-variants.ts` — 구분 띠·장면 쌍·장면 높이
- `lib/v5-parts.ts` — breather thick/tilt/chip
- `lib/rhythm-break-v5.ts` — 평탄/단일 후처리(예산 가드)
- `lib/export-detail-html.ts` / `components/DetailSectionRenderer.tsx` — V5 면 색
- `lib/impact-templates.ts` / `scripts/dynamics-metrics-468.ts` — H4b 높이 통일
- `scripts/hero-metrics-472.ts`, `scripts/regression/hero-472.ts`, `scripts/regression-v5-472.ts`, run-all 등록
- `review/TASK_472.md`, `review/472-targets.md`, `review/472-notes.md`

## 켜는 법

`NEXT_PUBLIC_DESIGN_V5=on` (기본 꺼짐). 끄면 471차 출력.  
갤러리: `npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`  
캡처: `npx tsx scripts/_472-capture.ts` → `review/472-captures/`

## 다음 후보

- checklist/comparison 공용 렌더를 라이브·export 공유 모듈로 뽑아 V5 DOM 분기
- catalog export 본문 비대(진공 픽스처 ~141% 직전) 추가 다이어트
- 실사진·유료 API 없는 범위에서 가로 넘침 브라우저 실측 재확인(이번은 문자열·회귀 가드)

## 커밋·push

```
git log -1 --oneline
40b810d 472차 보고서: 목표/실측·눈 검수·해시

git status -sb
## cloud-work...origin/cloud-work
(작업 트리에 이번 차 추적 파일 없음; 캡처·임시 _472-* 는 미추적/gitignore)

HEAD = 40b810df6fa32f2b986ee84ffdf4142df087f1de
```

항목 커밋: 지시서 `ed150fc` → 목표 `d7e7409` → A `6bb4d7d` → C `08eec53` → D `4676c90` → B `6935e32` → E `54d913a` → 보고서 `40b810d`.
