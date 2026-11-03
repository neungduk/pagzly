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
| `lib/block-chrome-v5.ts` | `chromeLabelRow` | 라벨을 `data-pz-chip` 불투명 칩으로 |
| `lib/hero-spec.ts` | `tagRow` 해시태그 | `data-pz-chip` |
| `lib/special-sections.ts` | timeline STEP·번호 | `data-pz-chip` |
| `lib/export-detail-html.ts` | usage STEP·step-tag | `data-pz-chip` |
| `lib/highlight-family-v5.ts` | 하이라이트 번호 | `data-pz-chip` |
| `lib/v5-parts.ts` | breather 라벨·번호 | `data-pz-chip` |
| `lib/detail-deco-v5.ts` | 라벨 문자열만 | 마크업 생성 없음 — 호출측 titleBlock/pointPill |
| `lib/zoom-bubble-v5.ts` | DETAIL 라벨 | `data-pz-chip` + 텍스트 종이 패드 `data-pz-on-light` |
| `lib/impact-templates.ts` | bleed 제목 | `data-pz-on-dark` 불투명 패드 |
| `lib/hero-stack-v5.ts` | impact strip dark | 배경 `#0A0A0A`(밝은 ink 변수 오용 금지) |

규칙: 어두운 부모 → 밝은 칩+어두운 글자 / 밝은 부모 → 어두운 칩+밝은 글자(+대비 약하면 얇은 밝은 테두리). CSS는 forceInk·밝은 섬보다 **뒤**.

## B. 장식 제외(`data-pz-deco`) 투명성

검사기(`contrast-render-478`)는 `e.closest('[data-pz-deco]')` 또는 속성 있으면 실패에서 제외.
`aria-hidden`·footer·nav·header도 제외(프로브).

| 실행 | deco 제외 수(근사) | 비고 |
|---|---|---|
| short 4×8×750 통과 직전 | 페이지당 대개 8~40(고스트·모티프·big 번호) | 과다 제외 아님 — 의미 라벨(STEP/POINT/DETAIL)은 칩으로 검사에 포함 |

## C. 측정 방식
- **기준**: 렌더 픽셀 검사기(글자 투명 재캡처 + WCAG).
- 기획 담당 DOM 근사와 숫자 차이 가능 — 보고는 검사기 기준.
