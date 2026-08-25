# Cursor 지시서 — 20차: 섹션별 보조 색조(다채로운 배경 리듬)

작성: Claude (Cowork). 대상: `pagelab/pagelab` 리포. 이 문서만 보고 그대로 구현 가능하도록
파일/줄 번호/코드까지 명시함. 아래 "핵심 원칙"은 타협 불가 — 반드시 지켜서 구현할 것.

## 배경

19차(개정) Part B로 "강조 색면 블록"(패턴 C, checklist 1곳)을 추가해 옅은 배경만 반복되던
문제를 일부 완화했지만, 사용자가 실제 생성 결과를 다시 보고 재차 피드백:

> "우리가 만든 상세페이지 보면 뒷 배경색이 너무 단조롭고 비슷한 흐름으로만 이어가서 너무 보기가
> 싫고 지루하거든? 아까 페이지메이커 상세페이지 견본들 봤잖아 정말로 화장품 아니면 전자제품
> 식품 등으로 카테고리별로 색상을 딱 정해서 이게 아니라 그 제품에 맞는 색상으로 하되 좀 일치감
> 있는 색상이 아니라 정말 색상을 다채롭게 꾸몄으면 좋겠어"

즉 (1) 카테고리 고정 팔레트가 아니라 상품 사진 기반 색상은 유지하되, (2) 그 색 하나로 전체를
우려내는 지금 방식이 아니라 페이지 안에서 색상 자체가 여러 갈래로 다채롭게 보였으면 한다는 요청.
범위 확인을 위해 AskUserQuestion으로 두 가지를 물었고, 사용자가 가장 화려한 쪽을 선택함:

1. 보조 색조 개수 — **"보조색 3개 이상 (더 화려하게)"** 선택.
2. 적용 범위 — **"전체 UI 요소"** 선택.

**코드로 확인한 근본 원인**: `lib/color-extract.ts`의 `extractProductTheme()`는 상품 사진에서
가장 비중이 큰 hue **딱 하나(`bestHue`)만** 골라 `accent`/`accentSoft`/`accentText`/
`baseNeutral`/`deepAccent`를 전부 그 하나의 hue에서 파생시킨다. `components/DetailSectionRenderer.tsx`의
약 22종 섹션·60곳 이상 스타일 호출부가 전부 이 5개 필드만 alpha/명도 변주로 재사용하고, hue를
바꾸는 곳은 단 한 곳도 없다 — 이게 "일치감은 있지만 단조롭다"는 정확한 원인이다. `카테고리별
고정 팔레트`(`lib/category-theme.ts`)는 사진 추출이 실패했을 때만 쓰이는 폴백이라 사용자가
말한 "카테고리별로 색상을 딱 정해서"라는 체감은 실제로는 이 폴백이 아니라, 사진에서 뽑은 단일
hue를 페이지 전체에 반복 사용하는 지금 구조 자체에서 온다.

**해결 방향**: 이미 있는 `hueShift(hex, degrees)`(현재는 `lib/concept-icons.ts`의 AI 이미지
프롬프트용 톤 설명에만 쓰이고 실제 렌더링 색에는 전혀 안 쓰이고 있었음)와 같은 수학(같은 채도/명도,
hue만 회전)으로 **"보조 팔레트" 3종**(warm/cool/bold)을 상품 고유 hue에서 파생시키고, 섹션이
스크롤에서 등장하는 순서에 따라 기본색↔보조색 3종을 순환시킨다. 상품 사진에서 뽑은(또는 카테고리
폴백) hue는 그대로 "브랜드 앵커"로 유지하면서, 페이지 전체를 그 hue 하나로 우려내지 않는 것이
핵심 — "제품에 맞는 색상"이라는 요구와 "다채롭게"라는 요구를 동시에 만족시킨다.

## 핵심 원칙 (타협 불가)

1. **새 색상을 창작하지 않는다.** 모든 보조 팔레트는 기존 `accent`/`accentSoft`/`accentText`/
   `baseNeutral`/`deepAccent` 값에 `hueShift()`를 적용해서만 파생시킨다 — 채도/명도는 100% 유지,
   hue만 회전. 임의의 새 hex 상수를 추가하지 않는다.
2. **hero와 cta_price는 보조색 순환에서 제외하고 항상 base(원본) 팔레트만 쓴다.** hero는 실제
   상품 사진 위에 겹치는 그라데이션이라 사진과 다른 hue를 쓰면 부자연스럽고, cta_price(구매 버튼)는
   페이지 전체에서 일관된 신뢰색이어야 하는 지점이라 순환 대상에서 제외한다.
3. **섹션 내부(같은 위젯의 하위 요소끼리)에는 절대 hue를 섞지 않는다.** 색 변주는 섹션 단위로만
   적용 — 한 섹션에 넘겨주는 `theme` 객체 자체를 통째로 바꿔치기하는 방식으로 구현해서, 기존에
   `theme.accent`/`theme.deepAccent`/`theme.baseNeutral`을 참조하던 60곳 이상의 스타일 코드는
   **단 한 줄도 건드리지 않는다** — 호출부가 어떤 팔레트를 받았는지 몰라도 항상 올바르게 어울리는
   조합(같은 팔레트 안의 accent+deepAccent+baseNeutral)만 쓰게 되므로 개별 위젯이 깨질 위험이 없다.
4. **`lib/color-extract.ts`를 수정하거나 새로 import하지 않는다.** 그 파일은 `sharp`(Node 전용
   네이티브 모듈)에 의존하는데, `components/DetailSectionRenderer.tsx`와 `app/create/result/page.tsx`는
   `"use client"` 컴포넌트라 `sharp`가 클라이언트 번들에 끌려 들어가면 빌드가 깨지거나 번들이
   비대해진다. 따라서 `hueShift`와 그 하위 HSL 변환 로직은 **`lib/design-tokens.ts`에 별도로
   (의도적으로 중복) 구현**한다 — 아래 1번 항목 참고.

---

## 1. `lib/design-tokens.ts` — 보조 팔레트 파생 로직 추가

`getHeroGradient()` 함수(72~75행) 바로 뒤, `// 2. 장식 요소` 주석(77행) 바로 앞에 아래 블록을
통째로 삽입:

```ts
// ---------------------------------------------------------------------------
// 1.5. 섹션별 보조 색조 — 20차. accent 하나로만 페이지 전체를 우려내던 단조로움을
//    깨기 위해, 섹션 타입/등장 순서에 따라 accent/accentSoft/accentText/baseNeutral/
//    deepAccent를 포함한 팔레트 전체를 hue만 다르게 재계산한 "보조 팔레트" 3종을
//    만든다. lib/color-extract.ts의 hueShift()와 수학적으로 동일한 로직(같은 s/l,
//    hue만 회전)이지만, 그 파일은 sharp(Node 전용 네이티브 모듈)에 의존하고
//    DetailSectionRenderer/result 페이지는 "use client"라 클라이언트 번들에
//    sharp를 끌어들이면 안 되므로 순수 색상 변환만 이 파일에 독립적으로 둔다.
// ---------------------------------------------------------------------------

function tokenRgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function tokenHslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

function tokenRgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// hex 색상의 hue만 degrees만큼 회전 (채도/명도는 유지). color-extract.ts의
// hueShift()와 동일한 로직 — 의도적으로 별도 구현(위 블록 설명 참고, sharp 의존성 회피).
function tokenHueShift(hex: string, degrees: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const { h, s, l } = tokenRgbToHsl(r, g, b);
  const shifted = (((h + degrees) % 360) + 360) % 360;
  const [nr, ng, nb] = tokenHslToRgb(shifted, s, l);
  return tokenRgbToHex(nr, ng, nb);
}

export type ThemeVariantKey = "base" | "warm" | "cool" | "bold";

// 보조색 3개(warm/cool/bold) + base. 서로 최소 40도 이상 떨어뜨려 실제로
// 다른 색상대로 보이게 하되, 완전 정반대색(180도)은 피해 상품 사진·다른
// UI 색과 과하게 충돌하지 않도록 함. 사용자가 "보조색 3개 이상 (더
// 화려하게)"를 선택해 정확히 3개로 구성.
const THEME_VARIANT_HUE_OFFSET: Record<Exclude<ThemeVariantKey, "base">, number> = {
  warm: 40,
  cool: -55,
  bold: 130,
};

export type ExtendedTheme = Record<ThemeVariantKey, CategoryTheme>;

function hueShiftTheme(base: CategoryTheme, degrees: number): CategoryTheme {
  return {
    ...base,
    accent: tokenHueShift(base.accent, degrees),
    accentSoft: tokenHueShift(base.accentSoft, degrees),
    accentText: tokenHueShift(base.accentText, degrees),
    baseNeutral: tokenHueShift(base.baseNeutral, degrees),
    deepAccent: tokenHueShift(base.deepAccent, degrees),
  };
}

/**
 * 페이지 진입 시 1회, 기본 테마(상품 사진 추출 or 카테고리 고정 폴백)로부터
 * 보조 팔레트 3종을 파생시킨다. heroScrimFrom/icon 필드는 base 값 그대로
 * 유지(hero는 항상 base 팔레트만 쓰므로 변형이 필요 없음 — 아래
 * getSectionTheme() 참고).
 */
export function extendTheme(base: CategoryTheme): ExtendedTheme {
  return {
    base,
    warm: hueShiftTheme(base, THEME_VARIANT_HUE_OFFSET.warm),
    cool: hueShiftTheme(base, THEME_VARIANT_HUE_OFFSET.cool),
    bold: hueShiftTheme(base, THEME_VARIANT_HUE_OFFSET.bold),
  };
}

// hero(상품 사진과 직접 겹치는 그라데이션)와 cta_price(구매 버튼 — 페이지
// 전체에서 신뢰감 있게 일관된 색이어야 하는 지점)는 보조색 순환에서 제외하고
// 항상 base 팔레트를 쓴다.
const THEME_VARIANT_LOCKED_SECTION_TYPES = new Set(["hero", "cta_price"]);
const THEME_VARIANT_CYCLE: ThemeVariantKey[] = ["base", "warm", "cool", "bold"];

/**
 * bodyIndex(0-based, hero 제외 본문 섹션 순번 — getSectionPattern()이 쓰는
 * 값과 동일한 값을 그대로 재사용)를 4단계로 순환시켜, 스크롤 흐름상 인접
 * 섹션끼리 색상이 눈에 띄게 달라지게 한다. 반환값은 기존 CategoryTheme과
 * 100% 동일한 모양이라, 호출부(렌더러)는 이 결과를 기존 theme 자리에 그대로
 * 꽂아 넣기만 하면 된다 — 개별 섹션 렌더링 코드는 변경 불필요.
 */
export function getSectionTheme(
  extended: ExtendedTheme,
  sectionType: string,
  bodyIndexZeroBased: number,
): CategoryTheme {
  if (THEME_VARIANT_LOCKED_SECTION_TYPES.has(sectionType)) return extended.base;
  const key = THEME_VARIANT_CYCLE[bodyIndexZeroBased % THEME_VARIANT_CYCLE.length];
  return extended[key];
}
```

**참고**: `baseNeutral`은 원래 채도가 낮은(거의 무채색) 값이라, 여기에 `tokenHueShift`를 적용해도
채도가 낮으므로 시각적으로는 "은은하게 다른 톤의 크림/아이보리"처럼 미묘하게만 바뀐다(예: 웜톤
크림 vs 쿨톤 페일그레이) — 사용자가 지적한 "뒷 배경색이 단조롭다"는 부분을 패턴 A(baseNeutral
단색) 배경에서도 직접 완화하는 효과가 있다. `accent`/`deepAccent`는 채도가 높아 hue 회전이 훨씬
뚜렷하게 드러난다.

---

## 2. `components/DetailSectionRenderer.tsx` — 섹션별로 다른 팔레트 적용

### 2-1. import에 `extendTheme`, `getSectionTheme` 추가 (19~33행)

기존:
```ts
import {
  BRAND,
  SLOT_IMAGE_RATIO,
  HERO_TRANSITION_OVERLAP_CLASS,
  INFO_BADGE,
  INFO_TABLE,
  getCtaBandBackground,
  getCategoryRhythm,
  getDecorationColor,
  getHeroGradient,
  getSectionBackground,
  getSectionPattern,
  hexToRgba,
  type SectionColorPattern,
} from "@/lib/design-tokens";
```
다음으로 교체:
```ts
import {
  BRAND,
  SLOT_IMAGE_RATIO,
  HERO_TRANSITION_OVERLAP_CLASS,
  INFO_BADGE,
  INFO_TABLE,
  getCtaBandBackground,
  getCategoryRhythm,
  getDecorationColor,
  getHeroGradient,
  getSectionBackground,
  getSectionPattern,
  hexToRgba,
  extendTheme,
  getSectionTheme,
  type SectionColorPattern,
} from "@/lib/design-tokens";
```

### 2-2. 컴포넌트 진입부에서 보조 팔레트 파생 (1670행)

기존:
```ts
  const theme = themeOverride ?? getCategoryTheme(category);
  let imageTextCount = 0;
```
다음으로 교체:
```ts
  const baseTheme = themeOverride ?? getCategoryTheme(category);
  const extendedTheme = extendTheme(baseTheme);
  let imageTextCount = 0;
```

### 2-3. `renderSection()` 호출부에서 섹션별 팔레트 주입 (1691~1702행)

기존:
```ts
        const content = renderSection(
          section,
          imageUrls,
          index,
          category,
          theme,
          pattern,
          conceptIcons,
          pointIndex,
          edit,
          followPattern,
        );
```
다음으로 교체:
```ts
        const content = renderSection(
          section,
          imageUrls,
          index,
          category,
          getSectionTheme(extendedTheme, section.type, bodyIndex),
          pattern,
          conceptIcons,
          pointIndex,
          edit,
          followPattern,
        );
```

**이게 전부다.** `renderSection()` 함수 본문(462행부터 시작, `theme: CategoryTheme` 파라미터를
그대로 씀)과 그 안에서 호출되는 `ThemeIcon`/`ConceptBadgeIcon`/`RadialGauge`/`ComparisonMetricRow`/
`MetricBar` 등 모든 하위 헬퍼, 그리고 `getSectionBackground(theme, pattern)`/`hexToRgba(theme.accent, ...)`
같은 60곳 이상의 호출부는 **단 한 글자도 수정하지 않는다** — 전부 자기가 넘겨받은 `theme` 객체가
base인지 보조 팔레트인지 모른 채 기존 로직 그대로 동작하고, 그 팔레트 안에서는 항상
accent/deepAccent/baseNeutral이 서로 어울리는 조합이라 개별 위젯이 깨질 위험이 없다.

`checklist`의 19차 Part B "강조 색면 블록"(패턴 C, `theme.deepAccent` 92% 알파)도 이 변경으로
자동으로 혜택을 받는다 — boldBlock이 걸리는 섹션의 `bodyIndex`가 몇 번째냐에 따라 base/warm/cool/bold
중 그 위치의 팔레트를 그대로 쓰게 되어, 페이지마다 강조 블록 색상도 조금씩 달라진다(원래도 딱
1곳만 고정 위치가 아니었으므로 부작용 없음).

---

## 검증 체크리스트

1. `tsc --noEmit` — 기존 베이스라인(24줄) 대비 신규 에러 0건. `ExtendedTheme`/`getSectionTheme`의
   반환 타입이 `CategoryTheme`과 정확히 일치하는지가 핵심 — 하나라도 필드가 빠지면 `renderSection`
   호출부에서 타입 에러가 나야 정상(이게 유닛 테스트 대용으로 작동).
2. `lib/color-extract.ts`에 어떤 import/수정도 없어야 한다 — `git diff`로 이 파일이 전혀 건드려지지
   않았는지 확인(클라이언트 번들에 `sharp`가 끌려 들어가지 않는지 확인하는 가장 확실한 방법).
3. TEST_MODE=true로 라이브 생성 후, sessionStorage의 `data.generated.theme`(base accent/deepAccent)
   값을 먼저 기록해 둔다. 그 다음 화면을 스크롤하며:
   - hero 섹션과 cta_price(마지막 구매 버튼) 섹션은 정확히 그 base accent/deepAccent 색과 일치하는지
     (변형되면 안 됨 — DevTools로 실제 렌더된 `background-color`/`color`를 찍어서 base 값과 hex
     비교, 육안 대조만으로는 근사값 착각 가능).
   - 그 외 본문 섹션들은 스크롤 순서대로 색상이 눈에 띄게 바뀌는지(패턴 A 배경의 은은한 톤 변화,
     패턴 B 배경의 파스텔 hue 변화 모두 포함).
   - 같은 섹션 **내부**에서는 절대 두 가지 hue가 섞이지 않는지(예: `spec_table` 한 섹션 안에서
     테두리색과 강조 배경색이 서로 다른 hue를 쓰고 있으면 버그).
4. `checklist` boldBlock(패턴 C, 진한 강조 블록) 섹션에서도 텍스트/아이콘 반전(19차 Part B)이
   여전히 정상 동작하는지 — hue가 바뀌어도 명도/채도는 유지되므로 반전 대비 자체는 깨지지 않아야
   정상이지만, 실제 화면에서 재확인.
5. 화장품/뷰티·전자제품·식품 최소 3개 카테고리로 각 1회 이상 생성해서, 카테고리 폴백 팔레트로
   떨어진 경우(사진 추출 실패)에도 보조색 3종이 정상적으로 파생되는지 확인(폴백 팔레트도
   `CategoryTheme` 모양이라 `extendTheme()`이 그대로 동작해야 함 — 별도 분기 없음).
6. 19차 Part A(원형 게이지, comparison_chart) 회귀 없는지 — `RadialGauge`/`ComparisonMetricRow`가
   받는 `theme`이 이제 섹션마다 다른 팔레트일 수 있지만, 여전히 유효한 accent/deepAccent 조합이라
   시각적으로 깨지지 않아야 정상.
7. 모바일 폭(375px)에서 색상 변화로 인한 레이아웃 영향은 없어야 함(hue만 바뀌고 값 자체 포맷은
   동일하므로 사실상 회귀 리스크 낮음, 스크린샷으로만 확인).

## 다음에 할 일 (이번 라운드 범위 밖)

- 보조색 오프셋(40/-55/130도)은 첫 구현 기준값 — 실제 생성 결과를 보고 사용자가 "여전히 부족"
  또는 "너무 튄다"고 피드백하면 오프셋 값만 조정(로직 변경 없이 상수만 수정하면 되므로 후속
  라운드 부담 적음).
- 지금은 섹션 등장 순서(`bodyIndex % 4`)로만 순환시키는 단순 규칙 — 섹션 "타입"에 맞는 의도적
  역할 배정(예: 비교/신뢰 계열 섹션은 항상 cool, 감성/라이프스타일 계열은 항상 warm)으로 고도화할지는
  이번 라운드 결과를 보고 판단.
- 19차 Part B에서 보류한 Part C(페이지메이커 스타일 3열 하이라이트 박스 등 인포 포맷 다양화)는
  여전히 범위 밖 — 이번 20차(색상 다양성)가 먼저 안정화된 뒤 별도 라운드로 진행.
- 커밋은 사용자가 요청하면 진행(이번 세션은 원격 PC에 파일만 반영하고 git 작업은 하지 않음).
