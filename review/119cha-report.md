# 119차 — 118차 진단 수정 (워드마크·식품 다이어그램·생활 패턴)

생성: 2026-09-04  
전제: API 호출 없음. §4 3번(픽스처)·5번(세리프×고딕 톤) **미수정**.

## 1. 히어로 워드마크 대비 — (a) 로컬 스크림

97차 `getHeroGradient`는 **변경하지 않음**(상단을 밝게 두는 의도 유지).

| 파일 | 내용 |
|------|------|
| `lib/hero-brand-mark.ts` | `heroWordmarkWrapClassName` / `heroWordmarkWrapInlineStyle` — `rgba(0,0,0,0.45)` 라운드 pill + blur |
| `components/DetailSectionRenderer.tsx` | 워드마크 래퍼에 로컬 스크림, `data-wordmark-scrim="local"` |
| export | `buildHeroBrandMarkHtml` 동일 스크림 |

검증: `119cha-wordmark-bright-hero.png`(밝은 노란 픽스처) · `119cha-wordmark-dark-hero.png`(brightness 0.15 시뮬) — 양쪽 모두 흰 워드마크 가독.

## 2. 식품 크기비교 다이어그램 대비

| 파일 | 내용 |
|------|------|
| `components/SizeComparisonDiagram.tsx` | 스트로크/라벨 = **카테고리 기본** `accentText`(`#92400E`, hue-shift 없음). opacity·strokeWidth 상향 |
| `lib/size-comparison-diagram.ts` / `export-detail-html.ts` | export도 `baseTheme.accentText` |

캡처: `119cha-food-diagram.png` — DOM stroke `#92400E` (이전 deepAccent `#B8871F` + 낮은 opacity 대비 강화). 새 팔레트 없음.

## 3. 생활용품 `CATEGORY_PATTERN_SVG`

| 파일 | 내용 |
|------|------|
| `lib/design-tokens.ts` | `"생활용품"` 키 추가 — 둥근 사각(식기/타일 리듬), fill-opacity **0.04~0.05** |
| 동 파일 | `getCategoryPatternBackground` URL을 **단일 따옴표**로 감쌈 — 기존 `url("...xmlns="...")` 중첩 따옴표로 **패턴이 CSS에서 버려지던** 문제도 같이 수정(생활 키만 넣어도 안 보이던 원인) |

캡처: `119cha-living-pattern.png` — STORY 구간 배경에 사각 패턴 확인.

## 4. 하지 않은 것

- 픽스처 카테고리 정합성 (118 §4-3)
- 세리프×고딕 다이어그램 톤 (118 §4-5)
- 97차 히어로 전체 그라디언트 opacity 조정 (옵션 b 미채택)

## 5. 118차 hero 크롭 이슈 (확인만)

| 파일 | 픽셀 | bytes |
|------|------|-------|
| `118cha-cosmetics-hero.png` | **860×22336** | 5,252,321 |
| `118cha-cosmetics.png` (풀페이지) | 896×22528 | 5,316,641 |

**맞음 — 히어로 크롭이 아니었음.** 높이가 풀페이지와 거의 동일.  
118 facts 스크립트가 `section.first().screenshot()`에 의존했는데, 결과적으로 전체 스크롤 높이급 박스가 잡힘.  
**다음 QA 캡처 개선 시:** viewport `clip`(예: 이번 `119cha-wordmark-*-hero.png` = 856×840) 또는 워드마크/히어로 래퍼만 고정 높이로 찍기. **이번 차수에서는 캡처 인프라 대규모 수정 안 함**(브리프 4절).

## 6. 검증

- [x] `npx tsc --noEmit` 0건
- [x] `109cha-hero-brand-mark-smoke` PASS (scrim assert 추가)
- [x] `verify-51cha-static` PASS (`"생활용품"` 패턴 키)
- [x] `97cha-concept-effects-smoke` PASS (그라디언트 미변경)
- [x] `119cha-verify-capture` PASS · API 없음

## 산출물

- `review/119cha-wordmark-bright.png` / `…-bright-hero.png`
- `review/119cha-wordmark-dark.png` / `…-dark-hero.png`
- `review/119cha-food-diagram.png`
- `review/119cha-living-pattern.png`
- `scripts/119cha-verify-capture.ts`
