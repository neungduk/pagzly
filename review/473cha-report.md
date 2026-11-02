# 473차 보고 — 결함 정리 + 두 번째 화면 이후도 "눈으로 다르게"

문자열 지표 + Playwright 캡처(네트워크 차단, `--ph2`·`--localize-blocked`·`file:`/`data:`만). 모든 변경은 `NEXT_PUBLIC_DESIGN_V5` 켜짐에서만. V5 off·V4 off 락 통과. **main push 없음** — `cloud-work`만.

## 목표 대비 실측

| 항목 | 목표 | 실측 | 판정 |
|---|---|---|---|
| A1 말줄임 0 | V5 히어로/장면 ellipsis·line-clamp·고정높이 잘림 0 | `regression/hero-473` 통과 | 달성 |
| A2 중복 제목 | 렌더에서만 숨김(데이터·a11y 유지) | `data-hero-dup` + SR_ONLY | 달성 |
| A3 한눈에 보기 칸 | 2→1×2, 3→3/1+2, 4→2×2 | `data-pz-glance` + CSS 그리드 | 달성 |
| A4 구분 띠 의도 | 빈 단색 막대 0 | 사선·점선·SVG 도형(글자 없음, 471 락 준수) | 달성 |
| B1 본문 시그니처 쌍 ≥3 | 6칸 중 ≥3 | `regression/body-473` 통과 | 달성 |
| B2 POINT 등 분화 | 아키타입별 DOM | BODY_SIG.list 분기(stair/chip/rows/…) | 달성 |
| C1 눈 검수 같아 보이는 쌍 | 0 | 중간 구간 softlife↔luxe·catalog↔techsheet 일부 잔존 → **미달** | 미달 |
| D checklist/comparison | 가능분 / 불가 노트 | checklist V5 공유 모드 구현, comparison은 `473-notes.md` 보류 | 부분 |
| S1 export ≤140% | 최대 | catalog/living-storage **139.999%** | 달성 |
| S2 출력 잠금 | V4 off diff 0 | `check-v4-off` 통과(A차 hookHtml 인자 오염 복구) | 달성 |
| S3 463~472·가로·fold 등 | 통과 | `_473-safety`(463·470·471·472·473) 통과 | 달성 |
| S4 기존 실패 4건 | 미착수 | muted 대비·export 픽셀 대비·DB 교체 SQL·무거운 도구 가드 | **미착수** |

## 눈으로 본 판정 (`review/473-captures/`, 커밋 안 함)

경로: `strip-first__{fx}__{750|390}.png`, `strip-mid__…`, `full__…`.  
픽스처: keyboard / skincare / dress / snack × 8종 × 폭 2.

**첫 화면**: 472에서 이미 8종이 갈라진 상태 유지(분할/아치/틸트/풀블리드). impact 제목 말줄임·3연속 상품명·한눈에 보기 빈 칸·빈 구분 띠는 해소.

**중간(1500~4000)**: POINT 목록·큰 숫자·체크가 아키타입마다 다르게 보이기 시작(계단/칩/2열 카드/타임라인). 다만:
- **softlife ↔ luxe**: 둥근 면·여백·연한 톤이 겹쳐 “같은 부품 색만 바꾼” 느낌이 중간 구간에서 아직 남음.
- **catalog ↔ techsheet**: 격자·표형 SPEC/목록이 비슷한 밀도로 보일 때가 있음.

목표 “같아 보이는 쌍 0”에는 **미달**. 다음 후보에서 이 두 쌍의 본문 시그니처(목록·수치·구분선)를 더 벌릴 것.

## 미달과 이유

- C1: 중간 구간 softlife/luxe·catalog/techsheet가 아직 비슷해 보일 수 있음(자동 B1은 통과하나 눈 기준 0은 아님).
- D comparison: 라이브 React ↔ export 문자열 쌍둥이 추출이 comparison-policy·수치 게이트와 한 커밋에 묶여 회귀 면적이 커 `473-notes.md`에 보류.

## 변경 파일(요지)

- `lib/hero-spec.ts` — 말줄임 금지·중복 숨김·hookHtml `p.name` 인자 복구·V5에서만 overflow-wrap
- `lib/hero-stack-v5.ts` — glance 칸 규칙·export 다이어트
- `lib/v5-parts.ts` — POINT 목록 BODY_SIG 분기·의도 있는 구분 띠(무글자)
- `lib/body-sig-v5.ts` / `scripts/body-sig-473.ts` — 본문 시그니처 6칸·CSS 변수 추출
- `lib/checklist-layout-v5.ts` + export/live — checklist cards2/chips/stair/rows
- `lib/page-archetype-v5.ts` / `rhythm-break-v5.ts` — bsig 루트 1회·패딩 예산
- `scripts/regression/hero-473.ts`·`body-473.ts`·`checklist-473.ts`·`_473-capture.ts`
- `review/TASK_473.md`·`473-targets.md`·`473-notes.md`

## 켜는 법

`NEXT_PUBLIC_DESIGN_V5=on` (기본 꺼짐).  
갤러리: `npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`  
캡처: `npx tsx scripts/_473-capture.ts` → `review/473-captures/` (gitignore)

## 다음 후보

- softlife/luxe·catalog/techsheet 본문 쌍을 눈으로 더 벌리기(목록·수치·구분선)
- comparison 본문 공유 모듈 추출 + V5 좌우 분할(정책 회귀 분리 후)
- catalog export 여유 확보(139.999% 직전)

## 커밋·push

```
git log -1 --oneline
a80e80f 473차 보고서: 목표/실측·눈 판정·미달·push 해시

git status -sb
## cloud-work...origin/cloud-work
(캡처·임시 _473-* 는 미추적/gitignore)

push tip: a80e80f7d0e3331a9126cf5bac8e81f0f973d342
main 미push · 브랜치 cloud-work만
```

항목 커밋: 지시서 `ddd6d9e` → 목표 `dbbec75` → A `90c9992` → B `edf7269` → C `0d47019` → D `bfa5a01` → E `b88a45f` → 보고서 `a80e80f`.
