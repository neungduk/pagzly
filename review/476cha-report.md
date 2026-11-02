# 476차 보고서

## 실제 사진으로 확인하지 못한 항목
- 상품 실사·유료 API·R2·이미지 업데이트 검증 없음(ph2 SVG·네트워크 차단 캡처만).
- 면 hue는 `--pz-s` 토큰·렌더 HTML 집계(섹션 픽셀 히스토그램 아님).
- softlife↔luxe / catalog↔techsheet의 “완전 다른 페이지” 체감은 캡처상 개선이나 실사·생성 이미지 톤에서는 미검증.
- 가로 넘침·fold는 문자열/기존 회귀 위주(이번 캡처 육안 넘침 없음).

## 목표 / 실측

| # | 지표 | 목표 | 실측 |
|---|---|---|---|
| A1 | 면 hue 동일 bin ≤3 | 렌더 CSS | `color-eye-476` 통과(상품 accent 다수 검증) |
| A2 | ±60~180°·대비 4.5 | | FACE+동적 shift·ensureInk 통과 |
| B1 | 순수 장식 ≤2 | | `deco-476` 통과 |
| B2 | repeating-linear-gradient 제거 | V5 | gallery/export rlg=0 |
| C1 | 마퀴 잘림 | mask+first/last | 구조 검사 통과 |
| D1 | 아랫부분 시그니처 ≥3 | 28쌍 | `assertBottomPairDiffs` 0실패 |
| E1–E2 | softlife↔luxe / catalog↔techsheet | 골격 | prefer+짧은 CSS·BOTTOM_RECIPE |
| F1 | 리뷰 ≥2회 | +3항목 | 44→**46/60** |
| F2 | export ≤140 · living ≤135 | | worst **139.2%**, living catalog **135.0%** |
| F3 | 463~475·V4 off | | `regression-v5-476` 통과 |
| F4 | run-all 실패 4건 | 미착수 | **미착수** |

## 리뷰 점수 변화
- 475 루프2: 33/45.
- 476 루프1: 44/60 → 루프2: **46/60**(분홍·색 역할 상승). 항목 3개 추가·품질 하락 없음.

## 아직 비슷한 쌍
- softlife↔luxe: 톤·패딩·목록 반경은 갈렸으나 체크/스펙 장면 구성은 내용 공유.
- catalog↔techsheet: 흰 격자 vs 쿨그레이·tabular은 갈렸으나 compact 이미지+글 골격 잔존.

## 미달과 이유
- 순수 장식 “연속 금지”는 대략 카운트(자동) — 연속 인접 DOM 전수 아님.
- 포인트 면적 픽셀 실측 없음.
- run-all 기존 실패 4건 미착수(지시).

## 변경 파일(요지)
- `lib/color-roles-v5.ts` — A·E·F 면 칠·info 덮개
- `lib/dividers.ts`, `lib/dynamics-v5.ts`, `lib/dynamics-layer-v5.ts`, `lib/v5-parts.ts`, `lib/page-archetype-v5.ts` — B·C·E
- `lib/page-recipe-v5.ts` — D BOTTOM_RECIPE
- `lib/export-detail-html.ts`, `components/DetailSectionRenderer.tsx`
- `scripts/regression/color-eye-476.ts`, `deco-476.ts`, `regression-v5-476.ts`, `run-all.ts`
- `review/TASK_476.md`, `476-targets.md`, `476-review.md`

## 켜는 법
`NEXT_PUBLIC_DESIGN_V5=1` (기존 V5). V5 off 바이트 안정(`regression-v5-476`).

## 다음 후보
1. softlife↔luxe 체크/스토리 DOM 장면 분리(카피 없이 블록 재배치만).
2. catalog 이미지 격자 vs techsheet 표 DOM을 highlight 수준으로.
3. run-all 실패 4건 별도 차수.
4. 면 hue 픽셀 샘플러(캡처 기반).

## Push 확인
`git status` → `cloud-work...origin/cloud-work` (동기 예정). **main 미push**.

| 항목 | 커밋 |
|---|---|
| 지시서 | `d8dd111` |
| 목표 | `dcf2443` |
| A 색눈 | `faaba0a` |
| B·C 장식·마퀴 | `892e126` |
| D 아랫 레시피 | `3a9dafa` |
| E 쌍 골격 | `93d189d` |
| F 루프2·회귀·리뷰 | (이 커밋) |
| 보고서 tip | (후속) |

## CSS/구조 분화로 더 얻을 수 있는 효과의 한계
아키타입 간 면 색·순서·짧은 CSS는 캡처에서 이미 갈라지지만, 같은 카피와 ph2 자리표시 이미지가 남는 한 “다른 브랜드 페이지”까지는 안 간다. 남은 격차는 실사·생성 이미지의 구도/톤과 문장 밀도에서 오고, CSS만으로 softlife↔luxe 체감을 더 벌리기는 한계에 가깝다. 다음 이득은 DOM 장면 종류를 늘리거나 이미지·카피 품질 쪽이다.
