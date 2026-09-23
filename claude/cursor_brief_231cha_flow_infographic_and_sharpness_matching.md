# 231차 — 흐름·인포그래픽 강화 (2트랙) + 컷아웃 선명도 양방향 매칭 (1트랙), 코드 전용

생성: 2026-09-22

## 배경

사용자 요청(원문 2줄, 요약): "① 상세페이지 흐름과 인포그래픽 부분이 부실해 보이니 확실하게 잡아달라 / ②
사진합성 부분이 아직 미약한 것 같으니 코딩으로 해결하자." 230차까지 벤치마크 축(디자이너·후커블
레퍼런스 대조)을 계속 썼지만, 이번엔 벤치마크가 아니라 **기존 코드를 직접 감사**해 "실제로 도달
가능한데 빠진 것"을 찾았습니다. 3개 트랙 모두 코드 대조로 재현성을 확인했고, 유료 생성 API 호출은
0건입니다(사진합성 트랙도 순수 결정론적 이미지 처리 함수만 수정 — 라이브 검증 없이 코드 검증만).

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 3개 트랙 모두
기존 렌더링·이미지 후처리 로직 확장/배선일 뿐, 새 카피·새 이미지 생성 없음.

---

## 트랙 A — 반려동물 카테고리, "주요 성분·원료" 원형 다이어그램이 구조적으로 렌더 불가능 (버그)

### 근거

`lib/ingredient-ring-diagram.ts`(185차)의 `isIngredientRingCategory()`는 명시적으로 화장품/뷰티
**와 반려동물** 둘 다 허용합니다:

```ts
/** 화장품·반려동물 등 성분/소재 링이 의미 있는 카테고리 */
export function isIngredientRingCategory(category: string): boolean {
  return category === "화장품/뷰티" || category === "반려동물";
}
```

같은 파일의 성분 라벨 필터(`NOISE` 정규식, 8~13행)에는 `조단백질|조지방|조회분`이 포함돼 있는데,
이건 사료 영양성분표의 표준 표기입니다 — 즉 **185차가 반려동물 사료 성분표를 염두에 두고 이 필터를
직접 만들었다**는 뜻입니다. 반려동물 카테고리 지원은 우연이 아니라 원래 설계 의도입니다.

그런데 실제 렌더 게이트는 슬롯 이름을 리터럴로 검사합니다:

```tsx
// components/DetailSectionRenderer.tsx:1728-1729, 1971-1972 (image_text의 "split" 분기)
// lib/export-detail-html.ts:550 (동일 분기의 export 버전)
section.slot === "ingredient_highlight" && isIngredientRingCategory(category)
```

`lib/section-templates.ts`에서 `"ingredient_highlight"`라는 슬롯은 **화장품(BEAUTY, 62행)과
식품(FOOD, 372행)에만** 존재합니다. 반려동물 템플릿(PET, 637~777행)은 같은 의미의 슬롯을
`"material_feature"`(669행, note: `"주요 성분·원료 (1:1). 없는 영양·함량 % 지어내지 말 것"`)로
부릅니다 — 슬롯 이름이 달라 `section.slot === "ingredient_highlight"` 조건이 반려동물에서는
**절대 참이 될 수 없습니다**. `isIngredientRingCategory`가 반려동물을 허용해도 도달할 방법이
없는, 순수 이름 불일치로 죽어있는 기능입니다.

**게다가 더 깊은 이유가 하나 더 있습니다.** `material_feature`는
`lib/designer-detail-patterns.ts`의 `EDITORIAL_BLEED_SLOTS`(195차, 10개 슬롯 중 하나)에 포함돼
있어서, `image_text` 섹션 중 `shouldUseEditorialBleed(section)` 분기(전체폭 이미지+하단 텍스트,
라이브 `DetailSectionRenderer.tsx:1821~1867`·export `lib/export-detail-html.ts:496~511`)로
렌더링됩니다. 이 분기 자체가 `ingredient_highlight`/`package_contents`/`sourcing_story` 다이어그램
호출을 **전혀 갖고 있지 않습니다**(다이어그램은 `isAnnotated`/기본 split 분기 2곳에만 있음). 즉
슬롯 이름만 고쳐도 소용없고, 에디토리얼 블리드 분기 자체에 다이어그램 호출을 새로 추가해야
합니다.

**분류: 버그(코드로만 수정 가능, 실사용 시 항상 재현)** — 반려동물 판매자가 사료 성분을
`material_feature`에 3~8개 입력하면 지금은 라이브·export 둘 다 어떤 카테고리에서도 원형
다이어그램을 볼 수 없습니다. 취향 문제가 아니라 "만든 기능이 한 카테고리에서 구조적으로 죽어있는"
경우입니다.

### 수정 — `components/DetailSectionRenderer.tsx`

`shouldUseEditorialBleed(section)` 분기(1821~1867행) 안에서, 본문 텍스트 `</div>`(1864행) 바로
뒤·`</section>`(1865행) 앞에 아래 블록을 추가하세요:

```tsx
            <div className={`${getCategoryRhythm(category).pointTextPadClass} mx-auto max-w-xl px-6 text-center sm:px-10`}>
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={`line-clamp-4 ${TYPO.body}`}
              />
            </div>
            {section.slot === "material_feature" && isIngredientRingCategory(category) ? (
              (() => {
                const ringLabels = prepareIngredientRingLabels(ingredients);
                return ringLabels ? (
                  <IngredientRingDiagram labels={ringLabels} theme={theme} />
                ) : null;
              })()
            ) : null}
          </section>
        );
      }
```

`isIngredientRingCategory`·`prepareIngredientRingLabels`·`IngredientRingDiagram`은 이미 이
파일 상단에 import돼 있습니다(1728행 등 다른 분기에서 이미 사용 중) — 새 import 불필요.
`ingredients`는 이 컴포넌트의 기존 prop이라 그대로 참조 가능합니다(1722행 등에서 이미 사용).

`section.slot === "material_feature"` 조건만으로 충분히 안전합니다 — `isIngredientRingCategory`가
화장품/뷰티·반려동물만 허용하는데, 화장품/뷰티 템플릿엔 애초에 `material_feature` 슬롯이 없으므로
(화장품은 `ingredient_highlight`를 씀) 이 조합은 반려동물에서만 참이 됩니다. 생활/리빙
(HOME_FALLBACK, 777행)도 `material_feature` 슬롯(809행, "소재/기능 강조")을 쓰지만
`isIngredientRingCategory`가 생활/리빙을 허용하지 않으므로 영향 없습니다.

### 수정 — `lib/export-detail-html.ts`

`shouldUseEditorialBleed(section)` 분기(496~511행)를 아래로 교체하세요:

```ts
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        const ringLabels =
          section.slot === "material_feature" && isIngredientRingCategory(category)
            ? prepareIngredientRingLabels(ingredients)
            : null;
        const ringHtml = ringLabels
          ? buildIngredientRingDiagramSvg(ringLabels, deep, "#1B1B18")
          : "";
        return `<section${sectionIdAttr} class="pagzly-editorial" style="padding:0;background:${sectionBg}">
          <div style="position:relative">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block"/>` : ""}
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,${hexToRgba(BRAND.ink, 0.82)} 0%,${hexToRgba(BRAND.ink, 0.4)} 24%,${hexToRgba(BRAND.ink, 0.08)} 42%,transparent 55%)"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:24px 24px 28px;text-align:center">
              ${kicker ? `<p style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;color:rgba(250,248,243,.85);margin:0 0 10px">${kicker}</p>` : ""}
              ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionXl};margin:0;line-height:1.2;color:#FAF8F3;text-shadow:0 2px 20px rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%`)}
            </div>
          </div>
          <div style="padding:24px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
            <p style="line-height:1.85;font-size:${FONT_SIZE.bodyLg};opacity:.85">${esc(section.body)}</p>
            ${ringHtml}
          </div>
        </section>`;
      }
```

`isIngredientRingCategory`·`prepareIngredientRingLabels`·`buildIngredientRingDiagramSvg`는 이미
이 파일 상단에 import돼 있습니다(60~64행, 550행 등에서 이미 사용 중). `deep`·`sectionBg`는 이
함수 앞부분(199~203행)에서 이미 정의된 변수라 그대로 참조 가능합니다.

### 검증

1. `npx esbuild components/DetailSectionRenderer.tsx --bundle=false --format=esm --loader:.tsx=tsx --outfile=/dev/null` / 동일하게 `lib/export-detail-html.ts` — 구문 오류 0.
2. 반려동물 카테고리, `material_feature` 슬롯 body에 성분 3~8개(예: "닭가슴살, 연어, 고구마, 현미,
   오메가3")가 들어간 픽스처/세션으로 `prepareIngredientRingLabels()`를 직접 호출해 라벨 배열이
   나오는지 확인(순수 함수 — API 불필요).
3. 같은 세션으로 라이브 렌더 결과와 export HTML을 만들어 `IngredientRingDiagram`/`ringHtml`이
   실제로 나오는지 스크린샷 1장 + export HTML에서 `data-diagram` 또는 SVG 출력 grep으로 확인.
4. 화장품/뷰티(`ingredient_highlight`, 기존 분기)와 생활/리빙(`material_feature`, 링 없어야 정상)
   두 카테고리는 이번 변경으로 **아무 영향 없어야** 합니다 — 각각 before/after 스크린샷 diff로
   "변화 0"을 증명하세요.
5. 라벨 개수가 3개 미만/8개 초과인 케이스(빈 결과 예상)도 1건 — 조용히 생략되는지 확인(환각 방지
   원칙).

---

## 트랙 B — 섹션 사이 "브리더"(시각적 호흡)가 export에 전혀 없음 (버그, live/export drift)

### 근거

`lib/detail-visual-rhythm.ts`의 `shouldInsertBreather()`는 특정 섹션 조합 사이에 얇은 구분선을
넣을지 판단하는 순수 함수입니다:

```ts
export function shouldInsertBreather(
  prev: DetailSection | undefined,
  current: DetailSection,
): boolean {
  if (!prev || prev.type === "hero" || current.type === "hero") return false;
  const breaksAfter = new Set<DetailSection["type"]>([
    "checklist", "highlight_box", "gallery", "step_card", "stat_infographic", "comparison_chart",
  ]);
  const breaksBefore = new Set<DetailSection["type"]>([
    "gallery", "brand_story", "target_persona", "faq", "spec_table",
  ]);
  return breaksAfter.has(prev.type) || breaksBefore.has(current.type);
}
```

`components/DetailSectionRenderer.tsx:3941~3944`에서 라이브 렌더러가 호출하고, 실제로 그리는
`SectionBreather`(813~831행)는 그라디언트 선 두 개 + 가운데 점 하나짜리 실질적인 시각 요소입니다
(장식적 비유가 아니라 진짜 렌더링되는 여백/구분 UI).

`shouldInsertBreather`/`SectionBreather`를 코드베이스 전체에서 grep하면 **`lib/export-detail-html.ts`에는
단 한 번도 등장하지 않습니다** — export(마켓에 실제로 올라가는 최종 HTML)에는 이 브리더 로직 자체가
없습니다. 판매자가 에디터에서 보는 섹션 사이 호흡감이, 실제로 다운로드해서 마켓에 올리는 결과물에는
빠져 있는 셈입니다.

**이건 180차(bento radius drift)·224차(포인트 카운터 drift)·225차(compact 레이아웃 export 누락)와
정확히 같은 계열의 live/export 불일치 버그**이고, `checklist`/`highlight_box`/`gallery`/`step_card`
같은 흔한 섹션 타입이 트리거라 사실상 **모든 카테고리·거의 모든 생성 결과에서 상시 재현**됩니다.
"흐름이 부실해 보인다"는 사용자 체감과 가장 직접적으로 맞닿는 항목이라 판단합니다.

**분류: 버그** — 판단·취향 문제가 아니라 한쪽(export)에만 구현이 통째로 빠진 경우입니다.

### 수정 — `lib/export-detail-html.ts`

1. import에 `shouldInsertBreather` 추가(5~12행):

```ts
import {
  formatSectionIndex,
  getSectionKicker,
  resolveSplitFlexRatio,
  resolveSplitImageLeft,
  shouldInsertBreather,
  shouldUseEditorialBleed,
  shouldUseSplitLayout,
} from "@/lib/detail-visual-rhythm";
```

2. 섹션 조립 루프(1084~1130행 부근)를 아래로 교체하세요. 핵심은 (a) `html`이 실제로 나온
   섹션만 "직전에 렌더된 섹션"으로 추적하고(라이브의 `lastRenderedSection` 갱신 위치와 동일 —
   `if (!content) return null` 이후에만 갱신하는 것과 동일한 원칙), (b) 그 섹션과 현재 섹션 사이에
   `shouldInsertBreather` 판정이 참이면 브리더 HTML을 **현재 섹션의 html보다 먼저** push하는
   것입니다(라이브가 `{breather}{content}` 순서로 렌더하는 것과 동일):

```ts
  const bodyParts: string[] = [];
  let imageTextCount = 0;
  let lastRenderedSection: DetailSection | undefined; // 231차 — shouldInsertBreather 추적용
  const totalCompactImageTextCount = visibleSections.filter(
    (s) => s.type === "image_text" && s.layout === "compact",
  ).length;
  for (let i = 0; i < visibleSections.length; i += 1) {
    const section = visibleSections[i]!;
    const isFullPoint = shouldUseSplitLayout(section);
    const pointIndex = isFullPoint ? imageTextCount++ : undefined;
    const bodyIndex = visibleSections.slice(0, i).filter((s) => s.type !== "hero").length;
    const compactImageTextIndex =
      section.type === "image_text" && section.layout === "compact"
        ? visibleSections
            .slice(0, i)
            .filter((s) => s.type === "image_text" && s.layout === "compact").length
        : undefined;
    const html = sectionHtml(
      section,
      opts.imageUrls,
      opts.theme,
      opts.productName,
      opts.category,
      pointIndex,
      bodyIndex,
      extended,
      opts.brandName,
      certTokens,
      anchorIdMap.get(i),
      quickFacts,
      opts.logoUrl,
      opts.ingredients,
      opts.keyFeatures,
      compactImageTextIndex,
      totalCompactImageTextCount,
    );
    if (html) {
      // 231차 — 라이브(DetailSectionRenderer.tsx:3941~3944, SectionBreather)와 동일한 브리더.
      // export엔 이 로직이 아예 없어 마켓 최종 HTML에서 섹션 사이 시각적 호흡이 통째로 빠져
      // 있었음(180/224/225차와 같은 live/export drift 계열).
      if (shouldInsertBreather(lastRenderedSection, section) && section.type !== "hero") {
        bodyParts.push(
          `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:20px 24px" aria-hidden="true">` +
            `<span style="height:1px;width:48px;background:linear-gradient(90deg,transparent,${hexToRgba(opts.theme.accent, 0.45)})"></span>` +
            `<span style="height:6px;width:6px;border-radius:9999px;background:${opts.theme.accent}"></span>` +
            `<span style="height:1px;width:48px;background:linear-gradient(90deg,${hexToRgba(opts.theme.accent, 0.45)},transparent)"></span>` +
            `</div>`,
        );
      }
      bodyParts.push(html);
      lastRenderedSection = section;
    }
    if (section.type === "hero") {
      const next = visibleSections[i + 1];
      if (next) {
        if (trustChips.length > 0) bodyParts.push(trustStripHtml(trustChips, opts.theme, certTokens));
        if (quickFacts.length > 0) bodyParts.push(buildSpecBentoGridHtml(quickFacts, opts.theme));
      }
    }
  }
  const body = bodyParts.join("\n");
```

`hexToRgba`는 이미 85행에서 import돼 있습니다. `opts.theme.accent`는 페이지 전체에서 이미 여러
곳(126행 등)에서 쓰는 값이라 안전합니다 — 라이브처럼 섹션별 패턴 회전 테마(`sectionTheme`)까지는
재현하지 않고 페이지 대표 accent 하나로 통일합니다(export는 원래 섹션별 배경색 회전만 있고
브리더 같은 패턴-회전 장식 요소는 없었으므로, 신규로 패턴별 색상까지 배선하는 건 이번 스코프
밖입니다 — 과확장 금지).

### 검증

1. `npx esbuild lib/export-detail-html.ts --bundle=false --format=esm --outfile=/dev/null` — 구문 오류 0.
2. `checklist` → `image_text` 처럼 `breaksAfter`가 트리거되는 조합과, `gallery` 앞처럼
   `breaksBefore`가 트리거되는 조합을 포함한 세션으로 export HTML을 만들어, 브리더 `<div>` 개수가
   `computeDemotedSectionIndexes` 적용 후의 실제 섹션 배열로 `shouldInsertBreather`를 직접
   순회 계산한 기대값과 정확히 일치하는지 grep count로 확인.
3. 히어로 섹션 앞뒤(`section.type !== "hero"` 가드)에는 브리더가 안 나오는지 확인.
4. 6카테고리 export HTML 스크린샷(before: 브리더 없음 / after: 라이브와 같은 위치에 그라디언트선+점)
   비교 최소 2카테고리.
5. 라이브(`DetailSectionRenderer.tsx`)는 이번 라운드에서 **전혀 건드리지 않습니다** — mtime
   불변으로 확인.

---

## 트랙 C — 컷아웃 선명도 매칭이 "배경이 더 흐릴 때"만 동작 (218차가 지적하고 미룬 한계, 이번에 코드로 해결)

### 근거

`lib/photo-composite.ts`의 `matchCutoutSharpness()`(164차)는 배경과 컷아웃의 엣지 강도(선명도
근사치)를 비교해서, **배경이 컷아웃보다 뚜렷하게 흐릴 때만** 컷아웃에 약한 블러를 줘서 맞춥니다:

```ts
  if (cutoutSharpness < 2) return cutout;
  const threshold = 0.55;
  const ratio = backdropSharpness / cutoutSharpness;
  if (ratio >= threshold) return cutout; // 배경이 이미 충분히 선명 — 매칭 불필요
  const t = Math.min(1, Math.max(0, (threshold - ratio) / threshold));
  const sigma = 0.8 + t * 0.6;
  const rgb = await sharp(cutout).removeAlpha().blur(sigma).toBuffer();
  const alphaBuf = await sharp(cutout).ensureAlpha().extractChannel(3).toBuffer();
  return sharp(rgb).joinChannel(alphaBuf).png().toBuffer();
```

`ratio = backdropSharpness / cutoutSharpness`가 threshold(0.55) 이상이면 — 즉 **배경이 컷아웃만큼
또는 그보다 훨씬 선명하면** — 아무것도 하지 않고 그대로 반환합니다. 반대 방향(배경이 컷아웃보다
훨씬 더 선명해서, 오히려 컷아웃 쪽이 상대적으로 흐릿해 보이는 경우 — 저해상도 원본 상품 사진을
업스케일했거나, `featherCutout()`의 알파 블러가 내부 텍스처까지 살짝 물들인 경우 등)에 컷아웃을
살짝 선명화(unsharp mask)하는 로직이 **아예 없습니다**. 이 함수는 구조적으로 단방향입니다 —
"배경 쪽으로 컷아웃을 흐리게" 방향만 있고, "컷아웃을 배경 쪽으로 선명하게" 방향이 없습니다.

이건 218차(매칭 강도 보강 라운드)가 이미 문서로 남긴 한계입니다: 218차는 `matchCutoutWhiteBalance()`·
`matchCutoutGrain()`은 상수를 보강했지만, `matchCutoutSharpness()`는 **의도적으로 스코프에서
제외**하면서 "구조적으로 배경이 더 흐릴 때만 흐리게 하는 단방향 함수... 별도 스코프로 다뤄야 함"이라고
남겨뒀습니다. 216차 전자제품 케이스에서 관찰된 "가장자리가 이질적으로 보임" 증상의 원인을 당시엔
배치/스케일 감지 쪽(`detect-held-object-placement.ts`)으로 돌렸지만, 이 구조적 단방향성 자체는
그 이후 한 번도 손대지 않은 채 남아 있습니다.

**분류: 버그(설계 결함에 가까움, 코드로만 수정 가능)** — 실사진 배경(특히 리빙/전자제품 카테고리의
질감 있는 나무/콘크리트/패브릭 배경)이 원본 상품 사진보다 더 선명하게 촬영·생성된 경우 상시
재현 가능하고, 이미 218차 시점에 명시적으로 인지됐던 잔여 항목입니다. 유료 생성 API와 무관한 순수
sharp/libvips 픽셀 연산이라 라이브 검증(사진 생성) 없이 결정론적 유닛 테스트로 검증 가능합니다 —
"코딩으로 해결"이라는 이번 요청과 정확히 맞습니다.

### 수정 — `lib/photo-composite.ts`

`matchCutoutSharpness()`(490~543행) 안의 조기 반환 지점을 아래로 교체하세요:

```ts
  if (cutoutSharpness < 2) return cutout; // 표본이 부족하거나(작은 컷아웃) 이미 평탄한 제품 — 판단 보류

  const threshold = 0.55;
  const ratio = backdropSharpness / cutoutSharpness;

  // 231차 — 반대 방향: 배경이 컷아웃보다 뚜렷하게 더 선명한 경우(예: 질감 있는 실사진 배경 vs
  // 저해상도/업스케일된 상품 원본, 또는 featherCutout의 알파 블러가 내부 텍스처를 살짝 흐리게 한
  // 경우), 컷아웃을 배경 쪽으로 살짝 선명화한다. 기존 블러 분기와 대칭이지만, 라벨 텍스트·각인
  // 등 제품 디테일에 링잉/헤일로가 생기지 않도록 sigma 상한을 블러 분기보다도 더 보수적으로 둔다
  // (unsharp mask는 sigma가 커질수록 아티팩트가 커지므로 "합성 티 제거"가 아니라 "과선명화"가
  // 되기 쉽다 — 목적은 여전히 배경과의 위화감 제거이지 아트적 선명화가 아니다).
  const upperThreshold = 1.8;
  if (ratio > upperThreshold) {
    const t2 = Math.min(1, (ratio - upperThreshold) / upperThreshold);
    const sharpenSigma = 0.6 + t2 * 0.7; // 0.6~1.3
    const rgb = await sharp(cutout)
      .removeAlpha()
      .sharpen({ sigma: sharpenSigma, m1: 0.4, m2: 0.4 })
      .toBuffer();
    const alphaBuf = await sharp(cutout).ensureAlpha().extractChannel(3).toBuffer();
    return sharp(rgb).joinChannel(alphaBuf).png().toBuffer();
  }

  if (ratio >= threshold) return cutout; // 상/하한 사이 — 매칭 불필요(이미 비슷한 선명도)

  const t = Math.min(1, Math.max(0, (threshold - ratio) / threshold));
  const sigma = 0.8 + t * 0.6;

  // 주의: ensureAlpha() 뒤에 removeAlpha()를 이어붙이면(sharp/libvips 실측 확인) 알파가
  // 파이프라인에 그대로 남는 경우가 있어, RGB만 뽑을 때는 removeAlpha()를 단독으로 쓴다.
  const rgb = await sharp(cutout).removeAlpha().blur(sigma).toBuffer();
  const alphaBuf = await sharp(cutout).ensureAlpha().extractChannel(3).toBuffer();
  return sharp(rgb).joinChannel(alphaBuf).png().toBuffer();
```

기존 하한(threshold=0.55) 분기·조기 반환·주석은 전혀 건드리지 않습니다 — 상한 분기만 그
위에 추가하는 구조입니다. `sharp`의 `.sharpen({sigma, m1, m2})`는 이미 이 파일이 다른 곳(없음 —
신규 API 사용)에서 안 써봤으므로, 로컬 sharp 버전이 객체 인자를 지원하는지 `node -e` 등으로
먼저 확인하세요(구버전 sharp는 `.sharpen(sigma, flat, jagged)` 3-인자 시그니처만 지원 — 만약
객체 인자가 타입 에러가 나면 그 시그니처로 `sharpen(sharpenSigma, 1, 2)` 형태로 교체).

### 검증 (전부 결정론적, API 0)

1. `npx tsc --noEmit` 또는 `npx esbuild lib/photo-composite.ts --bundle=false --format=esm --outfile=/dev/null`
   — 오류 0.
2. **합성 이미지로 유닛 검증**(로컬 스크립트, sharp만 사용 — 생성 API 없음):
   - 합성 "배경": `sharp({create:{width:256,height:256,channels:3,background:{r:120,g:120,b:120}}})`
     에 `feTurbulence` 고주파 노이즈 SVG를 composite해서 "뚜렷하게 선명한" 배경 만들기(또는 격자
     무늬 SVG로 고대비 엣지 다수 생성).
   - 합성 "컷아웃": 단색에 가까운 부드러운 그라디언트 PNG(알파 포함, 중앙 불투명)로 "흐릿한" 컷아웃
     시뮬레이션.
   - `matchCutoutSharpness(흐릿한컷아웃, 선명한배경)` 호출 → 반환된 버퍼의 `edgeIntensityAverage`가
     원본보다 **증가**했는지(선명화가 실제로 적용됐는지) 직접 재구현해 확인.
   - 반대 케이스(선명한 컷아웃 vs 흐릿한 배경)로 기존 블러 분기가 여전히 그대로 동작하는지
     회귀 확인(수정 전후 출력 픽셀이 동일해야 함 — 이 케이스의 코드 경로는 안 건드렸으므로).
   - 상/하한 사이(ratio 0.55~1.8) 케이스는 두 분기 다 안 타고 원본 그대로 반환되는지 확인.
3. 218차가 원래 관찰했던 216차 전자제품 케이스 소스 이미지가 `review/` 아래 남아있다면(재탐색),
   실제로 `matchCutoutSharpness`를 그 이미지 쌍에 돌려서 이번 상한 분기가 트리거되는지, 트리거된다면
   전/후 크롭 비교 스크린샷 1장 남기세요(있으면 좋고, 없으면 스킵 — 유료 재생성 금지이므로 새로
   만들지 마세요).
4. `matchCutoutWhiteBalance`·`matchCutoutGrain`·`featherCutout`·`defringeCutoutEdges` 등 이
   파일의 다른 함수는 전혀 건드리지 않습니다 — `git diff` 또는 diff 도구로 `matchCutoutSharpness`
   함수 범위 밖 라인이 0인지 확인.
5. 비용 기록: 생성 API 호출 0회.

---

## 포함하지 않는 것 (이번 스코프 밖, 이유 명시)

- **그립세이프가드 `minGraspOverlapFraction=0.4` 완화** — 211/214~216차가 이미 이 정확한 임계값을
  파고들었고, 9회 유료 생성($0.369)으로도 "0.4를 낮추면 진짜 그립 통과율은 올라가지만 비비기 오탐도
  같이 올라간다"는 트레이드오프를 명확히 확정하지 못했습니다(`evaluateHandPlacementReliability`
  주석: "0.15로 낮추면 true grip 통과↑ but rubbing 회귀"). 이건 Vision 모델의 실제 판단 분포에 대한
  경험적 질문이라 코드 추론만으로 안전하게 값을 바꿀 수 없고, 사용자가 이번에 명시한 "코딩으로
  해결"(=유료 라이브 검증 없이)이라는 제약과 정면으로 배치됩니다. 백로그 §4(API 필요·허가대기)에
  그대로 둡니다.
- **230차가 이미 검토·기각한 시계열 효능 꺾은선 그래프**(화장품/뷰티 등 3카테고리) — 이번에도
  재검토하지 않습니다.
- **`section-display-budget.ts`가 export에만 적용되고 라이브엔 없는 것** — 조사했으나 183/190차
  브리프 원문(`applySectionDisplayBudget`를 export HTML 재렌더링 검증에만 쓰도록 명시)에 따르면
  **의도적 설계**입니다(라이브 에디터는 판매자가 채운 것을 전부 보여주는 편집 뷰, export는 저관여
  카테고리에 한해 노출을 추려주는 최종 큐레이션 단계) — 버그 아님, 취향/설계 판단으로 재확인만
  하고 브리프에서 제외합니다.
- 174~230차가 이미 끝낸 색상/대비/radius/폰트/그레인 로직 재작업 없음.

## 완료 보고 형식

트랙별로 나눠 보고:
- 트랙 A: 반려동물 성분 링 다이어그램 렌더 스크린샷(before 없음/after 있음) + 화장품·생활리빙
  영향 0 확인.
- 트랙 B: 브리더 개수 grep count 기대값 대조 표 + export 스크린샷 2카테고리.
- 트랙 C: 유닛 검증 로그(엣지 강도 수치 전/후) + (있다면) 216차 이미지 재검증 스크린샷.
공통: `esbuild`/`tsc` 결과, 생성 API 호출 횟수(0 기대), 각 트랙이 서로의 파일을 침범하지 않았는지
(트랙 A/B는 `DetailSectionRenderer.tsx`+`export-detail-html.ts`, 트랙 C는 `photo-composite.ts`만 —
겹치는 파일 없음) diff로 확인.
