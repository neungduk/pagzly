# 475차 보고서

## 실제 사진으로 확인하지 못한 항목
- 상품 실사·유료 API·R2 이전·이미지 업데이트 검증 없음(ph2 SVG·네트워크 차단 캡처만).
- 포인트 면적 5~15%는 토큰·짧은 CSS 힌트 수준 — 픽셀 히스토그램 실측 없음.
- softlife↔luxe / catalog↔techsheet의 “체감 완전 분리”는 캡처상 개선이나 실사 톤에서는 미검증.
- 가로 넘침·fold는 문자열/기존 회귀 위주(이번 캡처에서 육안 넘침은 없음).

## 목표 / 실측

| # | 지표 | 목표 | 실측 |
|---|---|---|---|
| A1 | notes 전수 | `475-notes.md` | 완료(잠금 이유 포함) |
| A2 | 종류×8 쌍 시그니처 ≥3 | 자동 | `family-475` 통과 |
| B1–B3 | 색 4역할·hue·대비 | 토큰+시험 | `color-475` 통과, `--pz-s/a/i/p` |
| C1 | 어두운 면 질감·반전 | impact/pop/narrative | CSS 질감+`[data-pz-hl-c="0"]` 반전 |
| D1–D2 | softlife↔luxe ≥5 / catalog↔techsheet | BODY 6칸 + CSS | body-sig 6/6, 썸·패딩·tabular 분리 |
| E1 | 리뷰 ≥2회 | 점수 유지·상승 | 32→33/45 (474 27/35 대비 하락 없음) |
| F1 | export ≤140, living ≤135 | | worst 138.2%, living catalog **134.6%** |
| F2 | 463~474·V4 off | 통과 유지 | `regression-v5-475` 묶음 ok |
| F3 | run-all 실패 4건 | 미착수 | 미착수 |

## 리뷰 점수 변화
- 474 루프2: 27/35.
- 475 루프1: 32/45 → 루프2: **33/45**(아래 품질 3→4). 항목 2개 추가로 분모 변경; 평균 품질 하락 없음.

## 아직 비슷한 쌍
- softlife↔luxe: 아래 구간 크림 면·체크 리스트가 가까운 장면 잔존(반경·패딩만 분리).
- catalog↔techsheet: 시그니처·tabular 규칙은 갈라졌으나 이미지+글 compact 골격은 공유.

## 미달과 이유
- 일반 섹션 중 brand_story/gallery 등은 표식·짧은 CSS 1차(DOM 8모드 전면은 highlight 중심) — export 135% 여유 우선.
- 포인트 면적 픽셀 실측 미실시.
- run-all 기존 실패 4건 미착수(지시).

## 변경 파일(요지)
- `lib/section-family-v5.ts`, `lib/highlight-family-v5.ts` — A 패밀리
- `lib/color-roles-v5.ts` — B·C·D 토큰/CSS
- `lib/svg-sprite-v5.ts` — F `<use>` 재사용
- `lib/export-detail-html.ts`, `lib/page-archetype-v5.ts`, `components/DetailSectionRenderer.tsx`
- `scripts/regression/family-475.ts`, `color-475.ts`, `regression-v5-475.ts`, `run-all.ts`
- `review/TASK_475.md`, `475-targets.md`, `475-notes.md`, `475-review.md`

## 켜는 법
`NEXT_PUBLIC_DESIGN_V5=1` (기존 V5). V5 off는 바이트 동일(회귀).

## 다음 후보
1. brand_story/usage/spec DOM 8모드(highlight 수준) — export 여유 재측정 후.
2. softlife↔luxe 아래 구간 장면 단위 재배치(체크·스토리 골격).
3. 포인트 면적 픽셀 샘플러(자동).
4. run-all 실패 4건 별도 차수.

## Push 확인
`git status` → `cloud-work...origin/cloud-work` (동기). **main 미push**.

| 항목 | 커밋 |
|---|---|
| 지시서 | `a41f765` |
| 목표 | `3795a04` |
| A 패밀리 | `13eabf7` |
| B~D+F | `e844547` |
| E 리뷰 | `bd1a13f` |
| 보고서 본문 | `1116852` |
| tip(해시 표) | 이 커밋 — 추격 중단 |
