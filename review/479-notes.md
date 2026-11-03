# 479차 노트 — 칩/알약/배지 전수 + 장식 제외

## A. 자기 배경 부품 목록 (`data-pz-chip` / `--pz-chip`·`--pz-on-chip`)

| 위치 | 부품 | 처리 |
|---|---|---|
| `lib/color-roles-v5.ts` | `chipPair()` + CSS `[data-pz-chip]` | 부모 면 대비 큰 칩 배경 + 칩 위 글자 한 쌍 |
| `lib/export-detail-html.ts` | `pointPillHtml` (POINT 알약) | `data-pz-chip` |
| `lib/type-treatments.ts` | `titleBlock` pill 프리셋 | `data-pz-chip` |
| `lib/v5-parts.ts` | story chip, list chip, tags, numberMark circle | `data-pz-chip` (+ 흰 칩은 `data-pz-on-light`) |
| `lib/v5-parts.ts` | badgeShape (SVG 체크) | 칩 변수 미적용 — seal만 `data-pz-on-light` |
| `lib/layout-variants.ts` | story chip | `data-pz-chip` |
| `lib/checklist-layout-v5.ts` | chips 모드 `li` | `data-pz-chip` |
| `lib/impact-boost.ts` | story chip | `data-pz-chip` |
| `lib/block-chrome-v5.ts` | `chromeLabelRow` | 자기 배경 없음(투명) — 면 잉크만, 칩 표식 없음 |
| `lib/detail-deco-v5.ts` | 라벨 문자열만 | 마크업 생성 없음 — 호출측 titleBlock/pointPill |

규칙: 어두운 부모 → 밝은 칩+어두운 글자 / 밝은 부모 → 어두운 칩+밝은 글자(+대비 약하면 얇은 밝은 테두리). CSS는 forceInk·밝은 섬보다 **뒤**.

## B. 장식 제외(`data-pz-deco`) 투명성

검사기(`contrast-render-478`)는 `e.closest('[data-pz-deco]')` 또는 속성 있으면 실패에서 제외.
`aria-hidden`·footer·nav도 제외(프로브).

재생성 갤러리 후 `--short` 실행 시 제외 수·샘플 목록을 아래에 갱신한다.

| 실행 | deco 제외 수 | 비고 |
|---|---|---|
| (대기) | — | 갤러리 재생성 후 기입 |

## C. 측정 방식
- **기준**: 렌더 픽셀 검사기(글자 투명 재캡처 + WCAG).
- 기획 담당 DOM 근사와 숫자 차이 가능 — 보고는 검사기 기준.
