# Cursor 지시서 — 22차: 인포 포맷 다양화(Part C 착수) + 색상 합성 개인화 + 배경 모델 기본값 전환

작성: Claude (Cowork). 대상: `pagelab/pagelab` 리포. 이 문서만 보고 그대로 구현 가능하도록
파일/줄 번호/코드까지 명시함. "핵심 원칙"은 타협 불가 — 반드시 지켜서 구현할 것.

## 배경

21차(배경/합성 색 다양성)를 라이브 검증까지 완료한 뒤, 사용자가 "인포나 색상 합성 그리고
전반적인 퀄리티를 다시 높이자"고 요청. 범위 확인(AskUserQuestion) 결과:

1. **인포 다양화** — 19차에서 "Part C: 다음에 할 일"로 명시적으로 보류했던 페이지메이커 스타일
   포맷 중 **"3열 하이라이트 박스"**(가운데 카드 강조)와 **"사진+태그 스텝 카드"** 둘 다 이번에
   추가하기로 결정.
2. **색상 합성** — 21차에서 이미 배관은 깔아뒀지만 실제로 연결은 안 된 지점: hero/섹션 배경에는
   상품별 추출 테마(`backdropResult.theme`)가 쓰이는데, 장식 그래픽(`generateDecorativeGraphic`)
   에는 여전히 **카테고리 고정 기본 테마**가 들어가고 있음 — 이걸 상품별 테마로 교체.
3. **전반적 퀄리티** — 18차에 구현·검증까지 끝내고 프로덕션 기본값 전환만 보류 중이던 배경 합성
   모델을 **flux-kontext-pro로 전환**하기로 결정.

이번 라운드는 **화장품/뷰티 카테고리만** 대상으로 인포 포맷을 확장한다(Part C를 전체 6개
카테고리에 한 번에 적용하면 검증 범위가 너무 커짐 — 19차 Part A도 3개 카테고리로 시작한 뒤
확대한 전례를 따름). Part 2(색상), Part 3(품질)는 카테고리 무관하게 전체 적용.

## 핵심 원칙 (타협 불가)

1. **기존 `usage_steps`/`checklist` 렌더링 케이스는 삭제하지 않는다.** 이미 생성돼 DB에 저장된
   과거 페이지들이 이 타입으로 저장돼 있으므로, 렌더러의 `case "usage_steps":`/`case "checklist":`
   는 그대로 유지하고 새 타입을 **추가**만 한다. 이번 변경은 화장품/뷰티의 "새로 생성되는" 페이지에만
   적용되고, 기존 페이지·다른 카테고리는 전혀 영향받지 않는다.
2. **컴플라이언스 커버리지 누락 금지.** `lib/cosmetics-compliance.ts`의 `sanitizeSection()`은
   타입별 화이트리스트 스위치라 새 타입을 추가하면 **반드시 case를 같이 추가**해야 한다 — 안
   하면 새 섹션의 카피가 식약처 표현 검수를 건너뛰고 그대로 노출된다(하단 2-2 참고, 필수).
3. 기존 3색(`accent`/`baseNeutral`/`deepAccent`) 밖의 새 색상을 추가하지 않는다 — 새 카드
   렌더링도 전부 기존 토큰만 사용.
4. `SECTION_TYPE_SHAPES: Record<DetailSection["type"], string>`는 `DetailSection` 유니온의
   모든 타입에 대해 키가 있어야 컴파일된다 — 새 타입을 추가하고 이 레코드에 항목을 빠뜨리면
   `tsc`가 바로 잡아낸다(유닛 테스트 대용, 1-4 참고).

---

# Part 1 — 인포 포맷 다양화 (화장품/뷰티 전용, 신규 섹션 타입 2종)

## 1-1. `lib/types/generate.ts` — 신규 타입 2종 추가

`ComparisonChartSection` 정의(165~197행) 바로 뒤, `ColorVariationSection`(199~205행) 앞에 삽입:

```ts
/**
 * 페이지메이커 리서치(19차 Part C) 기반 "3열 하이라이트 박스" — 가운데 카드를
 * 진하게 강조한 카드 그리드. checklist(아이콘+한 줄)보다 정보량이 많은 핵심
 * 효과/성분 요약용. 가운데 카드 강조는 AI가 정하지 않고 렌더러가 자동으로
 * deepAccent 솔리드 배경 + 텍스트 반전으로 처리한다(boldBlock과 동일한 원칙 —
 * 서버/렌더러가 결정, AI는 관여하지 않음).
 */
export type HighlightBoxSection = {
  type: "highlight_box";
  slot: string;
  heading: string;
  /** 2~4개 허용, 3개 권장. 가운데(중앙) 카드가 렌더러에 의해 자동 강조됨. */
  cards: { title: string; body: string }[];
};

/**
 * 페이지메이커 리서치(19차 Part C) 기반 "사진+태그 스텝 카드" — usage_steps
 * (아이콘+한 줄, 사진 없음)를 대체하는 포토 기반 포맷. 각 단계에 실제 상품
 * 사진(imageIndex)을 배정하고 사진 위에 STEP 태그를 오버레이한다. tag 문자열은
 * AI가 만들지 않고 렌더러가 "STEP 0N"으로 자동 생성한다.
 */
export type StepCardSection = {
  type: "step_card";
  slot: string;
  heading: string;
  /** 3단계 권장. */
  steps: { title: string; body: string; imageIndex: number }[];
};
```

`DetailSection` 유니온(294~313행)에 추가 — `ComparisonChartSection` 다음 줄:

```ts
export type DetailSection =
  | HeroSection
  | ChecklistSection
  | ImageTextSection
  | SpecTableSection
  | UsageStepsSection
  | GallerySection
  | CautionSection
  | CtaPriceSection
  | ComparisonTableSection
  | ComparisonChartSection
  | HighlightBoxSection   // ← 신규
  | StepCardSection        // ← 신규
  | ColorVariationSection
  | StatInfographicSection
  | IllustrationBannerSection
  | FaqSection
  | TargetPersonaSection
  | BrandStorySection
  | AiDisclosureSection
  | CustomGifSection
  | ReviewHighlightSection;
```

## 1-2. `lib/design-tokens.ts` — 이미지 비율 등록

`SLOT_IMAGE_RATIO`(366~398행)에 `step_card` 추가 — `usage_scenario_extra` 항목 다음 줄에:

```ts
  step_card: IMAGE_RATIO.square,
```

(`highlight_box`는 이미지가 없는 슬롯이라 등록 불필요 — 등록 안 하면 `resolveImageRatioClass`가
`"aspect-square"`로 폴백하지만 애초에 이미지를 렌더링하지 않으므로 무관.)

## 1-3. `lib/section-templates.ts` — BEAUTY 슬롯 교체/추가

**1-3-1. `texture_feel` 슬롯(56~61행) 바로 뒤에 `highlight_box` 신규 삽입** — `illustration_banner`
(62~67행) 앞:

```ts
  {
    slot: "highlight_box",
    type: "highlight_box",
    required: true,
    note: "핵심 효과/성분 3가지를 카드 3장으로 요약(각 title 6자 내외 + body 1~2문장). checklist(핵심 포인트 나열)와 달리 이 3가지는 서로 구분되는 효과/성분 축이어야 함(예: 진정/보습/장벽 강화). 가장 강조하고 싶은 내용을 2번째(가운데) 카드에 배치 — 가운데 카드는 서버가 자동으로 진하게 강조 처리함",
  },
```

**1-3-2. `usage_steps` 슬롯(68행)을 `step_card`로 교체**:

기존:
```ts
  { slot: "usage_steps", type: "usage_steps", required: true, note: "사용법 단계. STEP 01/02/03 구조로 3단계 권장" },
```
다음으로 교체:
```ts
  {
    slot: "step_card",
    type: "step_card",
    required: true,
    note: "사용법 단계(3단계 권장). 각 단계에 실제 상품 사진(imageIndex)을 배정하고 title(6자 내외)+body(1문장)로 구성. STEP 태그는 렌더러가 자동으로 붙이므로 title에 'STEP 01' 등을 직접 쓰지 말 것",
  },
```

**주의**: FASHION/FOOD/ELECTRONICS 등 다른 카테고리 템플릿의 `usage_steps`는 이번 라운드에서
**건드리지 않는다** — 화장품/뷰티만 교체(하단 "다음에 할 일" 참고).

## 1-4. `app/api/generate/route.ts` — 프롬프트 형식/정규화

**1-4-1. `SECTION_TYPE_SHAPES`(366~386행)에 추가** — `comparison_chart` 항목(376행) 바로 뒤:

```ts
  highlight_box: `{ type: "highlight_box", slot, heading, cards: [{title, body}] } — 정확히 3개(2~4개 허용) 카드로 핵심 효과/성분을 요약. 각 title은 6자 내외, body는 1~2문장. checklist와 겹치지 않게 서로 다른 효과/성분 축으로 구성. 가장 강조하고 싶은 내용을 가운데(2번째) 카드에 배치 — 서버가 가운데 카드를 자동으로 진하게 강조 처리함`,
  step_card: `{ type: "step_card", slot, heading, steps: [{title, body, imageIndex}] } — 사용법 3단계 권장. 각 단계에 실제 상품 사진 imageIndex를 배정(가능하면 서로 다른 사진), title은 6자 내외, body는 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 "STEP 01" 등을 직접 쓰지 말 것`,
```

**1-4-2. `getAidaPhase()`(390~416행) 케이스 추가**:

기존:
```ts
    case "usage_steps":
      return "AIDA-D (Desire): 사용하면 얻는 구체적 이득·기대 결과";
```
다음으로 교체:
```ts
    case "usage_steps":
    case "step_card":
      return "AIDA-D (Desire): 사용하면 얻는 구체적 이득·기대 결과";
```
그리고 `case "checklist":`(394~395행) 바로 뒤에 추가:
```ts
    case "highlight_box":
      return "AIDA-I (Interest): 핵심 효과/성분 3가지를 한눈에 비교·요약";
```

**1-4-3. 화장품 카피 길이 가이드(649~662행 블록) 안, `usage_steps` 줄(655행) 교체**:

기존:
```
- usage_steps: 각 단계 1문장, 앞에 STEP 01/02/03.
```
다음으로 교체:
```
- step_card: 각 단계 title 6자 내외 + body 1문장. STEP 태그는 서버가 자동으로 붙이므로 title에 STEP 01 등을 쓰지 말 것.
- highlight_box: 카드 3장, title 6자 내외 + body 1~2문장. checklist와 다른 효과/성분 축으로 구성하고, 가장 강조하고 싶은 내용을 2번째 카드에.
```

**1-4-4. 섹션 정규화 블록(`parsed.sections.map`, 795~867행)에 추가** — `comparison_chart`
블록(848~850행) 바로 뒤:

```ts
    if (section.type === "step_card") {
      return {
        ...section,
        steps: section.steps.map((step) => ({
          ...step,
          imageIndex: clampIndex(step.imageIndex),
        })),
      };
    }
    if (section.type === "highlight_box") {
      return { ...section, cards: section.cards.slice(0, 4) };
    }
```

## 1-5. `lib/assign-section-images.ts` — step_card 이미지 다양성 배정 (권장, 낮은 리스크)

AI가 고른 imageIndex를 신뢰하지 않고 서버가 재배정하는 기존 원칙(`color_variation`과 동일 패턴)을
따라 `step_card`도 순환 배정한다. `assignDistinctSectionImages()`(11~70행) 안, `color_variation`
블록(56~66행) 바로 뒤에 추가:

```ts
    if (section.type === "step_card") {
      let stepCursor = 0;
      return {
        ...section,
        steps: section.steps.map((step) => {
          const imageIndex = (heroIndex + 1 + stepCursor) % imageCount;
          stepCursor += 1;
          return { ...step, imageIndex };
        }),
      };
    }
```

## 1-6. `lib/cosmetics-compliance.ts` — **필수**: 컴플라이언스 커버리지 추가

`sanitizeSection()`(79~175행) 스위치에 새 case 2개를 반드시 추가한다 — 빠뜨리면 새 섹션 카피가
식약처 표현 검수(과장 효능 표현 치환 등)를 건너뛰고 화면에 그대로 노출된다. `usage_steps`
case(117~122행) 바로 뒤에 추가:

```ts
    case "step_card":
      return {
        ...section,
        heading: clean(section.heading),
        steps: section.steps.map((step) => ({
          ...step,
          title: clean(step.title),
          body: clean(step.body),
        })),
      };
    case "highlight_box":
      return {
        ...section,
        heading: clean(section.heading),
        cards: section.cards.map((card) => ({
          ...card,
          title: clean(card.title),
          body: clean(card.body),
        })),
      };
```

## 1-7. `components/DetailSectionRenderer.tsx` — 렌더링

**1-7-1. import에 `SECTION_BG_PATTERN_C_ALPHA` 추가** — 19~35행의 `@/lib/design-tokens` import
목록에 추가:

```ts
import {
  BRAND,
  SLOT_IMAGE_RATIO,
  HERO_TRANSITION_OVERLAP_CLASS,
  INFO_BADGE,
  INFO_TABLE,
  SECTION_BG_PATTERN_C_ALPHA,
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

**1-7-2. `highlight_box` case 신규 추가** — `comparison_chart` case 바로 뒤(정확한 삽입 지점은
현재 파일에서 `case "comparison_chart":` 블록의 닫는 `);` 뒤를 찾아 그 다음 줄에 삽입):

```tsx
    case "highlight_box": {
      const cards = section.cards.slice(0, 4);
      if (cards.length === 0) return null;
      const centerIdx = Math.floor((cards.length - 1) / 2);
      const gridCols =
        cards.length <= 2
          ? "max-w-xl grid-cols-1 sm:grid-cols-2"
          : cards.length === 3
            ? "max-w-4xl grid-cols-1 sm:grid-cols-3"
            : "max-w-5xl grid-cols-2 sm:grid-cols-4";
      return (
        <section
          key={`highlight_box-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className={`mx-auto mt-12 grid gap-4 ${gridCols}`}>
            {cards.map((card, cardIndex) => {
              const emphasized = cardIndex === centerIdx;
              return (
                <div
                  key={cardIndex}
                  className={`flex flex-col gap-2 rounded-2xl px-6 py-8 text-center ${
                    emphasized ? "sm:-translate-y-2 sm:shadow-lg" : ""
                  }`}
                  style={{
                    backgroundColor: emphasized
                      ? hexToRgba(theme.deepAccent, SECTION_BG_PATTERN_C_ALPHA)
                      : hexToRgba(theme.accent, 0.08),
                    border: emphasized ? "none" : `1px solid ${hexToRgba(theme.accent, 0.18)}`,
                  }}
                >
                  <span
                    className="mx-auto font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: emphasized ? hexToRgba(BRAND.paper, 0.7) : theme.deepAccent }}
                    aria-hidden="true"
                  >
                    {String(cardIndex + 1).padStart(2, "0")}
                  </span>
                  <EditableText
                    as="p"
                    enabled={edit?.enabled}
                    value={card.title}
                    onChange={(title) => {
                      const nextCards = [...section.cards];
                      nextCards[cardIndex] = { ...nextCards[cardIndex], title };
                      edit?.onChange(index, { ...section, cards: nextCards });
                    }}
                    className="font-heading text-lg font-bold tracking-[-0.02em]"
                    style={emphasized ? { color: BRAND.paper } : undefined}
                  />
                  <EditableText
                    as="p"
                    multiline
                    enabled={edit?.enabled}
                    value={card.body}
                    onChange={(body) => {
                      const nextCards = [...section.cards];
                      nextCards[cardIndex] = { ...nextCards[cardIndex], body };
                      edit?.onChange(index, { ...section, cards: nextCards });
                    }}
                    className="text-sm leading-relaxed"
                    style={emphasized ? { color: hexToRgba(BRAND.paper, 0.9) } : { color: hexToRgba("#1B1B18", 0.68) }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      );
    }
```

**주의**: 마지막 `style={emphasized ? ... : { color: hexToRgba("#1B1B18", 0.68) }}` 부분은
`BRAND.ink`를 직접 문자열로 안 쓰고 `hexToRgba(BRAND.ink, 0.68)`로 바꿔도 동일 — 이미 `BRAND`가
import돼 있으므로 `hexToRgba(BRAND.ink, 0.68)`을 쓰는 쪽이 일관적이다. 구현 시 이렇게 정리할 것.

**1-7-3. `step_card` case 신규 추가** — `usage_steps` case(1205~1263행) 바로 뒤, `case "gallery":`
앞:

```tsx
    case "step_card": {
      const steps = section.steps;
      if (steps.length === 0) return null;
      const ratioClass = resolveImageRatioClass(section);
      return (
        <section
          key={`step_card-${index}`}
          className={getCategoryRhythm(category).generousPadClass}
          style={textSectionStyle(theme, pattern)}
        >
          <SectionAccentHairline theme={theme} />
          <EditableText
            as="h3"
            enabled={edit?.enabled}
            value={section.heading}
            onChange={(heading) => edit?.onChange(index, { ...section, heading })}
            className={`${HEADLINE_CLAMP} ${TEXT_COL_CLASS} ${TYPO.sectionTitle}`}
          />
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, stepIndex) => {
              const src = resolveImage(imageUrls, step.imageIndex);
              return (
                <div key={stepIndex} className="flex flex-col">
                  <div className={`relative overflow-hidden rounded-xl ${ratioClass}`}>
                    <SectionImage
                      src={src}
                      alt={step.title}
                      className="h-full w-full object-cover"
                    />
                    <span
                      className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-paper"
                      style={{ backgroundColor: theme.accent }}
                    >
                      STEP {String(stepIndex + 1).padStart(2, "0")}
                    </span>
                    <ImageReplaceHit
                      enabled={edit?.enabled}
                      onReplace={() => edit?.onReplaceImage?.(step.imageIndex)}
                    />
                  </div>
                  <EditableText
                    as="p"
                    enabled={edit?.enabled}
                    value={step.title}
                    onChange={(title) => {
                      const nextSteps = [...section.steps];
                      nextSteps[stepIndex] = { ...nextSteps[stepIndex], title };
                      edit?.onChange(index, { ...section, steps: nextSteps });
                    }}
                    className="mt-3 font-heading text-base font-bold tracking-[-0.02em] text-ink"
                  />
                  <EditableText
                    as="p"
                    multiline
                    enabled={edit?.enabled}
                    value={step.body}
                    onChange={(body) => {
                      const nextSteps = [...section.steps];
                      nextSteps[stepIndex] = { ...nextSteps[stepIndex], body };
                      edit?.onChange(index, { ...section, steps: nextSteps });
                    }}
                    className="mt-1 text-[11px] leading-relaxed text-ink/80 sm:text-sm"
                  />
                </div>
              );
            })}
          </div>
        </section>
      );
    }
```

---

# Part 2 — 색상 합성 개인화: 장식 그래픽에 상품별 테마 연결

## 배경 (코드로 확정한 원인)

`lib/photo-pipeline-client.ts`의 `enhanceImages()`(128행~)는 `themeColors`를 아래처럼 만든다
(154~161행):
```ts
const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
const themeColors = categoryTheme
  ? { accent: categoryTheme.accent, baseNeutral: categoryTheme.baseNeutral, deepAccent: categoryTheme.deepAccent }
  : undefined;
```
이건 **카테고리 고정 기본 팔레트**다. 이 값이 `/api/enhance-image` 호출 바디(191행 `theme: themeColors`)에
실려서 `lib/photo-enhance.ts`의 `enhanceProductImage()` → `generateDecorativeGraphic()`까지
그대로 전달되어, hero 위에 합성되는 장식(버블/스플래시 등)의 색이 **상품 사진과 무관하게 카테고리당
항상 똑같은 색**으로 나온다.

반면 hero/섹션 배경 자체는 21차부터 이미 `backdropResult.theme`(상품 사진에서 추출한 실제 테마)를
쓰고 있다 — 이 값은 `enhanceImages()`의 호출부(`photo-pipeline-client.ts` 411~420행)에서 이미
스코프 안에 있는데 `enhanceImages()`로 전달만 안 하고 있었을 뿐이다. 배관은 이미 있고 마지막
연결만 빠진 상태.

## 2-1. `lib/photo-pipeline-client.ts` — `theme` 파라미터 추가 및 우선 사용

**2-1-1. `enhanceImages()` 파라미터 타입에 `theme` 추가** (128~138행):

기존:
```ts
export async function enhanceImages(params: {
  uploaded: UploadedImage[];
  heroBackdrop: string;
  shadowAnalysis?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  category?: string;
  productName?: string;
  sectionBackdrops?: { ingredientUrl?: string | null; textureUrl?: string | null };
  /** heroBackdrop(및 폴백되는 section backdrop)에 상품이 이미 합성돼 있는지 (이중노출 방지용) */
  backdropAlreadyComposited?: boolean;
}): Promise<{ images: UploadedImage[]; cost: number; decorCost: number; claudeCost: number }> {
```
다음으로 교체:
```ts
export async function enhanceImages(params: {
  uploaded: UploadedImage[];
  heroBackdrop: string;
  shadowAnalysis?: ShadowAnalysis;
  conceptBrief?: ConceptBrief;
  category?: string;
  productName?: string;
  sectionBackdrops?: { ingredientUrl?: string | null; textureUrl?: string | null };
  /** heroBackdrop(및 폴백되는 section backdrop)에 상품이 이미 합성돼 있는지 (이중노출 방지용) */
  backdropAlreadyComposited?: boolean;
  /**
   * 상품 사진에서 추출한 실제 테마 (backdropResult.theme, 21차 신규). 있으면
   * 카테고리 고정 팔레트 대신 이 값을 장식 그래픽(generateDecorativeGraphic)에
   * 쓴다 — 22차: 배경은 이미 이 값을 쓰고 있었는데 장식만 카테고리 기본값에
   * 남아 있던 불일치를 해소.
   */
  theme?: Pick<CategoryTheme, "accent" | "baseNeutral" | "deepAccent"> | null;
}): Promise<{ images: UploadedImage[]; cost: number; decorCost: number; claudeCost: number }> {
```

**2-1-2. `themeColors` 계산 로직 교체** (139~161행 구간의 destructure + 계산부):

기존:
```ts
  const {
    uploaded,
    heroBackdrop,
    shadowAnalysis,
    conceptBrief,
    category: productCategory,
    productName,
    sectionBackdrops,
    backdropAlreadyComposited,
  } = params;

  let totalCost = 0;
  let decorCost = 0;
  let claudeCost = 0;
  let decorDataUrl: string | undefined;
  const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
  const themeColors = categoryTheme
    ? {
        accent: categoryTheme.accent,
        baseNeutral: categoryTheme.baseNeutral,
        deepAccent: categoryTheme.deepAccent,
      }
    : undefined;
```
다음으로 교체:
```ts
  const {
    uploaded,
    heroBackdrop,
    shadowAnalysis,
    conceptBrief,
    category: productCategory,
    productName,
    sectionBackdrops,
    backdropAlreadyComposited,
    theme: productTheme,
  } = params;

  let totalCost = 0;
  let decorCost = 0;
  let claudeCost = 0;
  let decorDataUrl: string | undefined;
  // 22차: 상품별 추출 테마(productTheme)를 우선 사용, 없으면(추출 실패 등) 기존처럼
  // 카테고리 고정 팔레트로 폴백 — hero/섹션 배경이 이미 쓰고 있는 값과 동일한 우선순위.
  const categoryTheme = productCategory ? getCategoryTheme(productCategory) : null;
  const themeColors = productTheme
    ? {
        accent: productTheme.accent,
        baseNeutral: productTheme.baseNeutral,
        deepAccent: productTheme.deepAccent,
      }
    : categoryTheme
      ? {
          accent: categoryTheme.accent,
          baseNeutral: categoryTheme.baseNeutral,
          deepAccent: categoryTheme.deepAccent,
        }
      : undefined;
```

**2-1-3. 호출부에서 `theme` 전달** — `enhanceImages({...})` 호출(411~420행):

기존:
```ts
  const enhanced = await enhanceImages({
    uploaded,
    heroBackdrop: chosenBackdrop,
    shadowAnalysis: backdropResult.shadowAnalysis,
    conceptBrief: backdropResult.conceptBrief,
    category: params.category,
    productName: params.productName,
    sectionBackdrops,
    backdropAlreadyComposited: backdropResult.productAlreadyComposited ?? false,
  });
```
다음으로 교체:
```ts
  const enhanced = await enhanceImages({
    uploaded,
    heroBackdrop: chosenBackdrop,
    shadowAnalysis: backdropResult.shadowAnalysis,
    conceptBrief: backdropResult.conceptBrief,
    category: params.category,
    productName: params.productName,
    sectionBackdrops,
    backdropAlreadyComposited: backdropResult.productAlreadyComposited ?? false,
    theme: backdropResult.theme,
  });
```

이게 전부다 — `/api/enhance-image` 라우트(`theme` → `enhanceProductImage()` → 
`generateDecorativeGraphic()`)는 이미 `theme` 인자를 그대로 전달하도록 21차 이전부터 구현돼
있으므로 추가 수정 불필요(구현 후 아래 검증 체크리스트 2번에서 실제로 그런지만 확인).

---

# Part 3 — 전반적 퀄리티: 배경 합성 모델 프로덕션 기본값을 flux-kontext-pro로 전환

## 배경

`lib/photo-enhance.ts`의 `getBackdropProvider()`는 `.env.local`의 `BACKDROP_PROVIDER`가 비어있거나
인식 못 할 값일 때 하드코딩된 문자열 `"flux"`로 폴백한다(133/136행) — 즉 **이 폴백값은 `.env.local`이
아니라 코드에 있는 리터럴**이라 이 세션이 직접 못 고치는 `.env.local`을 건드릴 필요 없이 여기만
바꾸면 된다. 18차에서 이미 `flux-kontext-pro` 경로(`generateBackdropViaFluxKontext`)를 구현·
라이브 검증까지 마쳤고, 사용자가 A/B 비교 후 이 모델을 프로덕션 기본값으로 선택.

**비용 영향**: 현재 기본값(flux)은 hero 배경 후보를 `getBackdropCandidateCount()`(기본 7개) ×
flux-schnell($0.003) ≈ **$0.021/상품**. flux-kontext-pro는 `getBriaBackdropCandidateCount()`
(기본 2개) × $0.04 ≈ **$0.08/상품** — hero 배경 생성 비용이 상품당 약 **+$0.06** 늘어난다(성분/
텍스처 섹션 배경은 이 전환과 무관 — `app/api/section-backdrops/route.ts`는 `getBackdropProvider()`를
호출하지 않고 항상 flux-schnell 경로만 씀, 영향 없음). 이 비용 증가를 감수하고 진행하는 것으로
확인됨(사용자가 A/B 테스트 후 직접 선택).

## 3-1. `lib/photo-enhance.ts` — `getBackdropProvider()` 기본값 교체

기존 (130~137행):
```ts
export function getBackdropProvider(category?: string): BackdropProvider {
  const raw = process.env.BACKDROP_PROVIDER;
  if (raw === "nano-banana" || raw === "flux-kontext-pro") return raw;
  if (raw !== "bria") return "flux";
  if (category && BRIA_GENFILL_CATEGORIES.has(category)) return "bria-genfill";
  if (category && BRIA_REPLACE_CATEGORIES.has(category)) return "bria-replace";
  return "flux";
}
```
다음으로 교체:
```ts
export function getBackdropProvider(category?: string): BackdropProvider {
  const raw = process.env.BACKDROP_PROVIDER;
  // 22차: 프로덕션 기본값을 flux → flux-kontext-pro로 전환(18차 A/B 검증 후 사용자 선택).
  // BACKDROP_PROVIDER=flux를 .env.local에 명시하면 언제든 이전 방식으로 즉시 롤백 가능.
  if (raw === "nano-banana" || raw === "flux-kontext-pro" || raw === "flux") return raw;
  if (raw === "bria") {
    if (category && BRIA_GENFILL_CATEGORIES.has(category)) return "bria-genfill";
    if (category && BRIA_REPLACE_CATEGORIES.has(category)) return "bria-replace";
    return "flux-kontext-pro";
  }
  return "flux-kontext-pro";
}
```

바로 위 함수 설명 주석(124~129행)도 새 기본값에 맞게 갱신:
```ts
/**
 * `.env.local` BACKDROP_PROVIDER:
 * - 미설정 / 그 외 → flux-kontext-pro (22차부터 기본값, 원본 사진 통째로 배경만 교체)
 * - flux → 이전 기본값(빈 배경 생성 후 앱 합성)으로 롤백
 * - bria → 카테고리별 bria-replace / bria-genfill (미지원 카테고리는 flux-kontext-pro)
 * - nano-banana → A/B용 직접 토글
 */
```

## 3-2. 사용자 확인 필요 사항 (이 세션은 `.env.local`을 읽거나 쓸 수 없음)

`.env.local`에 이미 `BACKDROP_PROVIDER=flux`가 명시돼 있다면 위 코드 변경과 무관하게 계속 flux로
동작한다(명시값이 항상 우선). **구현 후 사용자가 직접 `.env.local`을 열어 `BACKDROP_PROVIDER` 줄이
있는지 확인 — 있다면 지우거나 주석 처리해야 새 기본값(flux-kontext-pro)이 실제로 적용된다.** 값 자체가
없는 게 정상이라면 아무것도 안 해도 됨.

---

# 검증 체크리스트 (구현 완료 후 Cursor가 자체 확인 + Claude 재검증용)

1. `tsc --noEmit` — 기존 베이스라인(24줄, `photo-enhance.ts`/`concept-effects.ts` 등 Anthropic/
   Replicate 네임스페이스 에러 + gsap/mammoth/pdf-parse/@supabase 타입 선언 누락) 대비 신규 에러
   0건. 특히 `SECTION_TYPE_SHAPES`에 `highlight_box`/`step_card` 항목이 빠지면 즉시 타입 에러.
2. **(Part 1, 필수)** `lib/cosmetics-compliance.ts`의 `sanitizeSection()` 스위치에 `step_card`/
   `highlight_box` case가 실제로 추가됐는지 코드로 재확인 — 이게 빠지면 컴파일은 되지만 컴플라이언스
   검수를 조용히 건너뛰므로 `tsc`로는 못 잡음, 반드시 diff로 직접 확인.
3. **(Part 1)** TEST_MODE=true로 화장품/뷰티 카테고리 라이브 생성 — 화면에서:
   - `highlight_box`: 카드 3장 중 가운데 카드만 진한 배경(deepAccent)+흰 텍스트로 강조되는지,
     양옆 카드는 옅은 accent 틴트+테두리인지.
   - `step_card`: 각 카드에 실제 상품 사진이 서로 다르게 배정됐는지(전부 같은 사진이면
     `assignDistinctSectionImages` 로직 확인), STEP 01/02/03 태그가 사진 위에 오버레이되는지.
   - 두 섹션 다 모바일 폭(375px)에서 카드가 줄바꿈 없이 그리드로 잘 들어가는지.
   - 에디터 모드(edit.enabled)에서 카드 title/body를 직접 수정할 수 있는지, `highlight_box`
     가운데 카드는 반전된 배경 위에서도 편집 입력창이 읽히는지.
4. **(Part 2)** sessionStorage(`pagzly-create-result`)의 `generated.theme`와, hero 위 장식(버블/
   스플래시 등) 색을 육안 비교 — 이제 장식 색이 hero 배경과 같은 상품별 추출 팔레트를 따르는지.
   카테고리 기본 팔레트가 아닌 실제 상품 사진 톤에 맞게 바뀌는지 서로 다른 상품 사진 2~3개로
   비교할 것(21차 검증 때처럼 TEST_MODE 디스크 캐시가 없는 상태에서 테스트 — 캐시가 있으면 이전
   결과가 재사용돼 오검증 위험).
5. **(Part 3)** `.env.local`에서 `BACKDROP_PROVIDER` 줄을 확인/정리한 뒤 hero 배경 생성 —
   `photoCostBreakdown.backdrop`이 이전보다 커졌는지(대략 $0.02대 → $0.08대)로 실제 
   flux-kontext-pro 경로를 탔는지 확인(콘솔 로그 `[generate-backdrop] BACKDROP_PROVIDER=...`도
   함께 확인). 이중노출·라벨 뭉개짐 등 18차 검증 때 확인했던 항목도 프로덕션 기본값 상태에서
   한 번 더 스팟체크.
6. 기존 카테고리(전자제품/의류/식품 등)로 1회 이상 생성 — `usage_steps`/`checklist` 기존 렌더링에
   회귀가 없는지(이번 변경이 화장품/뷰티 신규 슬롯 2종에만 국소적으로 적용되는지) 확인.

---

# 다음에 할 일 (이번 라운드 범위 밖)

- **인포 포맷 확장**: `highlight_box`/`step_card`를 화장품/뷰티 외 카테고리(식품/전자제품/의류 등)
  로 확대할지 — 이번 라운드 화장품/뷰티 라이브 검증 통과 후 판단.
- 19차 리서치에서 확인했던 나머지 페이지메이커 포맷(필/리본 배지, 빨간 막대 그래프류, 말풍선
  콜아웃)은 여전히 범위 밖 — 이번 두 포맷이 정착된 뒤 필요성 재검토.
- `highlight_box`를 2/4장으로 응답했을 때의 실사용 빈도 확인 — 3장 고정을 프롬프트에서 더 강하게
  강제할지(현재는 "권장"), 서버가 3장 미만/초과를 자동 보정(패딩/드롭)할지는 실사용 데이터 보고
  결정.
- Part 3(flux-kontext-pro)이 프로덕션에서 안정화되면, `getBriaBackdropCandidateCount()` 기본값
  (2)을 늘려 후보 다양성을 높일지 여부 — 늘리면 비용도 비례 증가하므로 신중히 판단.
