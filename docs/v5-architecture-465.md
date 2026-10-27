# V5 아키텍처 지도 (465차 Phase 0 — 코드 읽기, 변경 없음)

범위: 아래는 **읽은 만큼**의 지도다. 6천 줄 렌더러 전체를 한 줄씩 읽지 않고, 토큰·주입 지점·공유 함수를 검색해 확인했다. 확인하지 못한 칸은 "미확인"으로 둔다.

## 1. 토큰이 정의되는 곳 / 읽히는 곳
| 파일 | 정의하는 것 | 읽는 쪽 |
|---|---|---|
| `lib/design-v4.ts` | `DESIGN_V4_ENABLED`, `designV4On()`(+테스트 토글), UP1 플래그·`designUp1On()` | 거의 모든 v4 모듈 |
| `lib/design-tokens-v4.ts` | 제목 위계 3단·행간·여백 32/48/64·반경 3단·그림자 none/soft/float·헤어라인·구분선 알파·칩 테두리·`declStyle/declObject`(라이브·export 공용 선언) | 라이브·export 둘 다(`tokenStyle`/`tokenStyleObject`) |
| `lib/design-tokens.ts` (1363줄) | 색·타이포·간격 상수, `hexToRgba`/`mixHex`/`contrastRatioToken`, 팔레트 보조 | 전역 |
| `lib/twin-styles-v4.ts` | 섹션별 "쌍둥이" 선언(라이브 객체·export 문자열이 같은 `Decl`에서 나옴) | 일반 섹션 렌더러(FAQ·단계·주의·비교 셀 등) |
| `lib/palette-v4.ts` | `v4Palette()`: 톤 사다리(`tints[5]`)·면 역할(bgA·bgB·emphasis·invert·card)·`onFace`(글자색 대비 보장)·그라데이션·`depthShadow`/`hairline` | `layout-variants`의 모든 v4 부품 |
| `lib/palette-harmony.ts` | 색상군 ≤3 보조색 | 팔레트 |
| `lib/mood.ts` + `lib/archetype-recipes.ts` | **436차 mood 6종**(minimal-luxe·clinic·natural·playful·street·warm): `pad·r·sh·divider·titleWeight·titleTracking·illust` 배율. `applyMood(html, k)`가 **임팩트 마크업 문자열을 후처리**(첫 섹션 padding 스냅, border-radius 배율, box-shadow 알파 두 단) | `impactHtml` 끝(라이브·export 공용) |
| `lib/type-treatments.ts` | `typeCss(role)`·아이브로(`titleBlock` enlabel/number/pill)·`EYEBROW_LABEL`·키워드 강조·숫자 강조 | v4 부품 |
| `lib/typo-v4.ts`, `lib/font-pairs.ts` | 타이포 상한, 폰트 쌍(`pickFontPair`, V3 폰트 플래그) | 라이브·export 같은 함수 |
| `lib/dividers.ts` | 경계 구분선 6종(wave·slant·zigzag·dotted·double·fade), mood별 기본 2종 | v4 블록 `wrap()` |
| `lib/motifs/*` | 모티프 SVG·배치(`planMotifs`) | v4 블록 |
| `lib/rhythm-v4.ts` | 이웃 섹션 위/아래 여백 해석 → `topPads`/`bottomPads`(섹션 번호→px) | `display-sections` 결과 → 라이브·export가 같은 `data-pz-top/bot` 표식 + 같은 CSS |
| `lib/photo-fallback.ts` | 사진 실패 틀 표시(`data-pz-np`)·CSS | 어떤 `overflow:hidden` 사진 틀이든 자동 적용 |
| `lib/layout-variants.ts` | v4 변형·`planV4`·`v4Html` | `impactHtml`(라이브·export 공용) |
| `lib/display-sections.ts` | `applyDisplayRules`(예산·정책·순서·임팩트·v4 계획·히어로 계획·topPads) | 라이브·export 둘 다 호출. **`opts.editing`이면 v4 계획 전에 반환(386행)** |

## 2. 라이브 ↔ export 공유 / 분리
- **공유(한 벌)**: `applyDisplayRules` 결과, `impactHtml`/`v4Html`(문자열 — 라이브는 `dangerouslySetInnerHTML`), `twin-styles-v4`·`design-tokens-v4`의 `Decl`, `topPads`/`bottomPads` CSS, 히어로 계획.
- **분리**: 일반 섹션(FAQ·사용 순서·비교·후기·스펙표·갤러리 등)은 라이브 `DetailSectionRenderer.tsx`(JSX)와 export `lib/export-detail-html.ts`(템플릿 문자열)가 각자 만든다. 같은 토큰 함수를 읽는 곳이 많지만 마크업은 두 벌이다.
- **섹션 래퍼 훅**(V5가 쓰는 주입 지점): 라이브는 섹션마다 `<div data-section-index data-pz-top data-pz-bot>` 래퍼(6335~6338행), export는 같은 번호를 섹션 태그에 `data-pz-top/bot`으로 붙인다(2336~2340행). 두 쪽 모두 `[data-pz-*] > section` / `section[data-pz-*]` 속성 선택자 CSS(`topPadCssV4`/`bottomPadCssV4`)를 같은 함수로 만들어 문서에 넣는다. **V5는 같은 방식으로 `data-pz-ax="<박자>.<강도>"` 표식과 `archetypeCssV5()` 한 벌을 둔다**(CSS는 속성 선택자·`!important`뿐, 금지 기법 없음).

## 3. 섹션 종류별 주입 지도
| 종류 | 경로 | 아키타입 주입 방법 |
|---|---|---|
| 임팩트·v4 블록(benefits·concern·story·spec·phototext·touch·breather·statement·steps + 임팩트 템플릿 전부) | `impactHtml` 한 벌 | **마크업 후처리 + 새 변형이 토큰을 직접 읽음**(반경·테두리·그림자·여백·번호/마커·사진 프레임·구분선) |
| hero | `hero-spec`/`hero-variants` 계획 | V5 1차에서는 불변(히어로 확장은 Phase 3 선택 항목) |
| gallery·image_text·checklist·target_persona·stat_infographic·comparison_chart·tradeoff_card·caution·ai_disclosure·illustration_banner·step_card·color_variation·review_highlight·faq·spec_table·usage_steps·cta_price | 일반 섹션 렌더러(라이브 JSX / export 문자열 두 벌) | **래퍼 CSS(`data-pz-ax` 표식)만**: 위아래 여백 척도·가는 위쪽 선·(밝은 면 한정) 배경 색조. 섹션 내부 마크업은 불변. cta_price·고지(`ai_disclosure`)·규정 박스는 **표식 자체를 붙이지 않는다** |
| 인터랙션이 있는 섹션(faq 접힘·색상 옵션) | 일반 렌더러 | 스타일만(래퍼 CSS), DOM 불변 |
| 편집 모드 | `applyDisplayRules`가 조기 반환 | V5 계획도 `editing`이면 만들지 않음 |

**주입할 수 없는 곳과 대안**: 일반 섹션 내부(카드 반경·제목 정렬·아이브로)는 두 벌 마크업이라 이번 차수에서 건드리지 않는다. 대안으로 V5에서 변환 가능한 종류를 v4 블록으로 늘린다(예: 단계·FAQ 카드·후기 인용 — Phase 3). FAQ는 접힘 인터랙션이 있어 변환하지 않고 래퍼 CSS만.

## 4. 지표·잠금 도구
- 출력 잠금 비교: 시작 시 HEAD에서 말뭉치 21개 export·섹션 단독 export·라이브 SSR을 scratchpad로 뽑아 두고 Phase마다 `lock.sh`(임시, 커밋 안 함)로 재비교.
- 지표: `scripts/variety-metrics-463.ts`(문자열 전용, `heavy-guard-461` 예외).
