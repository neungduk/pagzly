# 225차 브리프 — export HTML에서 `layout:"compact"` 섹션이 완전히 다른 레이아웃으로 나옴

생성: 2026-09-18 · 유료 API 0건 · 코드 전용

## 0. 배경 — 어떻게 발견했나

224차(POINT 카운터 패리티) 실행·독립 검증이 끝난 뒤 §3이 다시 비어 사용자가 "새 축
자체 발굴"을 선택했습니다. 이번엔 라이브(`components/DetailSectionRenderer.tsx`)와
export(`lib/export-detail-html.ts`)가 각각 `@/lib/*`에서 무엇을 import하는지 목록을
비교하는 방식으로 조사했고, 라이브에만 있고 export엔 없는 import 2개 중
`compact-image-shape`(`resolveCompactImageShape`)를 추적한 결과, **`layout:"compact"`
섹션 전체가 export에서 처리되지 않는다는 것**을 발견했습니다.

`case "image_text":` 안에서 라이브가 분기하는 레이아웃은 circle-solo/circle-pair →
**compact** → annotated → callout → editorial-bleed → 기본(split). export도 같은
레이아웃들을 분기하는데(`grep -n 'section.layout ===' lib/export-detail-html.ts` →
circle-pair·circle-solo·annotated만 나옴), **`compact`에 대한 분기가 아예 없습니다.**

## 1. 영향 — 왜 흔한 케이스인가

`compact`는 드문 옵션이 아니라 **템플릿이 강제하는 필수 레이아웃**입니다:

- `lib/section-templates.ts:959` — "quick_points: layout 반드시 'compact'."
- `app/api/generate/route.ts:978` — "quick_points 슬롯은 layout:'compact'로 2~4개
  채우세요." (2~4개의 별도 `image_text` 섹션이 각각 `layout:"compact"`로 생성됨)
- `route.ts:1067~1071`에서도 quick_points 관련 섹션에 `"compact"` 레이아웃을 명시적으로
  부여하는 로직이 있습니다.

즉 **거의 모든 생성 상품에 quick_points 슬롯이 있다면(흔함), 작은 썸네일 2~4개가 나란히
나오는 라이브 미리보기와 달리, export한 HTML에서는 그 섹션들이 어떤 분기에도 안 걸려
맨 아래 기본(fallback) 분기로 떨어져** — 100% 너비 정사각형 이미지 + 그 아래 텍스트
패널이라는, 라이브와 전혀 다른 레이아웃으로 2~4번 연속 나옵니다. 223/224차보다 더
자주, 더 크게 눈에 띄는 라이브·export 불일치입니다.

## 2. 원본 구현 — `components/DetailSectionRenderer.tsx:1609~1660`

```tsx
if (isCompact) {
  const imageFirst = section.imagePosition !== "right";
  const shape =
    compactImageTextIndex != null && totalCompactImageTextCount != null
      ? resolveCompactImageShape(section, compactImageTextIndex, totalCompactImageTextCount)
      : resolveCompactImageShape(section, 0, 1);
  const thumbRadius = shape === "circle" ? "rounded-full" : "rounded-xl";
  return (
    <section className="px-6 py-5 sm:px-10 sm:py-6" style={textSectionStyle(theme, pattern, category)}>
      <div className={`mx-auto flex max-w-xl items-center gap-4 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
        <div className="relative shrink-0">
          <SectionImage src={src} ... className={`h-24 w-24 object-cover sm:h-[7.5rem] sm:w-[7.5rem] ${thumbRadius}`} />
        </div>
        <div className={`min-w-0 flex-1 ${imageFirst ? "text-left" : "text-right"}`}>
          <EditableText as="h3" ... className={TYPO.compactTitle} />
          <EditableText as="p" multiline ... className={TYPO.compactBody} />
        </div>
      </div>
    </section>
  );
}
```

`resolveCompactImageShape()`(`lib/compact-image-shape.ts`)는 `section.imageShape`가
명시돼 있으면 그걸 쓰고, 아니면 같은 페이지 안의 compact 섹션이 2개 이상일 때
인덱스 짝/홀에 따라 정사각형/원형을 교대로 정합니다(`resolveCompactImageShape` — 이미
export에서 재사용 가능한 순수 함수, `lib/`에 이미 존재).

`TYPO.compactTitle`(`components/DetailSectionRenderer.tsx:222`):
`"font-heading text-base font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-lg"`
`TYPO.compactBody`(224행): `"mt-1.5 text-sm font-normal leading-relaxed text-ink/75"`

`compactImageTextIndex`/`totalCompactImageTextCount`는 라이브에서 각각 3763~3768행
(섹션 루프 안, 자기 앞의 compact 섹션 개수를 세는 인덱스)과 3721행
(`countCompactImageTextSections(sections)` — 전체 compact 섹션 개수)에서 계산됩니다.

## 3. export 수정 — `lib/export-detail-html.ts`

### 3-1. import 추가 (다른 lib import들 근처)

```ts
import { resolveCompactImageShape } from "@/lib/compact-image-shape";
```

### 3-2. `sectionHtml()` 함수 시그니처에 파라미터 2개 추가 (168~183행 부근)

**현재**:

```ts
function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  baseTheme: CategoryTheme,
  productName: string,
  category: string,
  pointIndex?: number,
  bodyIndex?: number,
  extended?: ExtendedTheme,
  brandName?: string | null,
  certTokens: string[] = [],
  anchorId?: string,
  quickFacts: { label: string; value: string }[] = [],
  logoUrl?: string | null,
  ingredients?: string | null,
  keyFeatures?: string | null,
): string {
```

**변경 후** (맨 끝에 2개 추가):

```ts
function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  baseTheme: CategoryTheme,
  productName: string,
  category: string,
  pointIndex?: number,
  bodyIndex?: number,
  extended?: ExtendedTheme,
  brandName?: string | null,
  certTokens: string[] = [],
  anchorId?: string,
  quickFacts: { label: string; value: string }[] = [],
  logoUrl?: string | null,
  ingredients?: string | null,
  keyFeatures?: string | null,
  compactImageTextIndex?: number,
  totalCompactImageTextCount?: number,
): string {
```

### 3-3. 호출부(메인 루프, 1022~1046행 부근)에서 카운트 계산 + 전달

**현재**:

```ts
  const bodyParts: string[] = [];
  let imageTextCount = 0;
  for (let i = 0; i < visibleSections.length; i += 1) {
    const section = visibleSections[i]!;
    const isFullPoint = shouldUseSplitLayout(section);
    const pointIndex = isFullPoint ? imageTextCount++ : undefined;
    const bodyIndex = visibleSections.slice(0, i).filter((s) => s.type !== "hero").length;
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
    );
```

**변경 후**:

```ts
  const bodyParts: string[] = [];
  let imageTextCount = 0;
  const totalCompactImageTextCount = visibleSections.filter(
    (s) => s.type === "image_text" && s.layout === "compact",
  ).length;
  for (let i = 0; i < visibleSections.length; i += 1) {
    const section = visibleSections[i]!;
    const isFullPoint = shouldUseSplitLayout(section);
    const pointIndex = isFullPoint ? imageTextCount++ : undefined;
    const bodyIndex = visibleSections.slice(0, i).filter((s) => s.type !== "hero").length;
    // 225차 — 라이브(DetailSectionRenderer.tsx:3763~3768)와 동일한 계산. compact
    // 섹션의 정사각형/원형 교대(resolveCompactImageShape)에 필요.
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
```

### 3-4. `case "image_text":` 안에 compact 분기 추가 (447행 부근 — `isCirclePair` 분기 뒤,
`isCallout` 분기 앞. 라이브의 분기 순서와 동일한 위치)

**현재**(447~458행 부근, `isCirclePair` 반환문 다음):

```ts
      if (isCirclePair) {
        const pairHtml = section.circlePair!
          .map(
            (item) =>
              `<div style="flex:1;min-width:0;text-align:center"><img src="${esc(item.imageUrl)}" alt="${esc(item.label)}" loading="lazy" decoding="async" style="width:96px;height:96px;border-radius:${RADIUS.pill}px;object-fit:cover;margin:0 auto;display:block;box-shadow:${ELEVATION.imageThumb}"/><p style="margin-top:12px;font-size:${FONT_SIZE.sm};font-weight:600;color:${deepText}">${esc(item.label)}</p></div>`,
          )
          .join("");
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="display:flex;justify-content:center;gap:32px;max-width:360px;margin:0 auto">${pairHtml}</div></section>`;
      }
      if (isCallout && section.callout) {
```

**변경 후** (`isCirclePair` 블록과 `isCallout` 블록 사이에 새 블록 삽입):

```ts
      if (isCirclePair) {
        const pairHtml = section.circlePair!
          .map(
            (item) =>
              `<div style="flex:1;min-width:0;text-align:center"><img src="${esc(item.imageUrl)}" alt="${esc(item.label)}" loading="lazy" decoding="async" style="width:96px;height:96px;border-radius:${RADIUS.pill}px;object-fit:cover;margin:0 auto;display:block;box-shadow:${ELEVATION.imageThumb}"/><p style="margin-top:12px;font-size:${FONT_SIZE.sm};font-weight:600;color:${deepText}">${esc(item.label)}</p></div>`,
          )
          .join("");
        return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}"><div style="display:flex;justify-content:center;gap:32px;max-width:360px;margin:0 auto">${pairHtml}</div></section>`;
      }
      // 225차 — layout:"compact"(quick_points 슬롯 등)가 export에 아예 없어 기본(split)
      // 분기로 떨어져 라이브와 완전히 다른 레이아웃(전체폭 정사각 이미지)으로 나오던 문제.
      // 라이브(DetailSectionRenderer.tsx:1609~1660)와 동일하게 작은 썸네일 + 한 줄 텍스트로 복원.
      if (section.layout === "compact") {
        const imageFirst = section.imagePosition !== "right";
        const shape =
          compactImageTextIndex != null && totalCompactImageTextCount != null
            ? resolveCompactImageShape(section, compactImageTextIndex, totalCompactImageTextCount)
            : resolveCompactImageShape(section, 0, 1);
        const thumbRadius = shape === "circle" ? RADIUS.pill : RADIUS.md;
        return `<section${sectionIdAttr} style="padding:20px 24px;${sectionInset}${bgCss}">
          <div style="max-width:576px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-direction:${imageFirst ? "row" : "row-reverse"}">
            <div style="flex-shrink:0">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:120px;height:120px;object-fit:cover;border-radius:${thumbRadius}px"/>` : ""}
            </div>
            <div style="min-width:0;flex:1;text-align:${imageFirst ? "left" : "right"}">
              <h3 style="margin:0;font-family:${DETAIL_FONT_STACK.heading};font-size:${FONT_SIZE.bodyLg};font-weight:600;line-height:1.35;letter-spacing:-0.02em;color:#1B1B18;overflow-wrap:anywhere">${esc(section.heading)}</h3>
              <p style="margin:6px 0 0;font-family:${DETAIL_FONT_STACK.sans};font-size:${FONT_SIZE.bodySm};font-weight:400;line-height:1.6;color:rgba(27,27,24,.75);overflow-wrap:anywhere">${esc(section.body)}</p>
            </div>
          </div>
        </section>`;
      }
      if (isCallout && section.callout) {
```

**주의**:
- `RADIUS.md`(12)가 라이브의 `rounded-xl`(12px)과 정확히 대응, `RADIUS.pill`(원형)은
  이미 다른 분기들이 쓰는 값 그대로 재사용.
- `FONT_SIZE.bodyLg`("16px")=Tailwind `text-base`, `FONT_SIZE.bodySm`("14px")=`text-sm` —
  이미 `design-tokens.ts`에 있는 값이라 새로 정의할 필요 없음.
- export는 반응형(`sm:` 브레이크포인트)이 없는 고정 단일 값 구조라(`pad = "padding:48px
  20px;"`처럼), 썸네일 120px은 라이브의 `sm:h-[7.5rem]`(데스크톱) 값을 택함 — 이미
  `isCircleSolo` 분기가 120px을 쓰고 있어 일관성 유지. 패딩 `20px 24px`는 라이브의
  모바일 값(`px-6 py-5`)에 대응 — 필요시 Cursor 판단으로 미세조정 가능하나, 핵심은
  "작은 썸네일+한 줄 텍스트" 레이아웃 자체가 살아나는 것.
- 219/221차에서 확립한 대로 `overflow-wrap:anywhere`를 heading/body에 추가해 긴
  텍스트 오버플로우를 예방(라이브의 `EditableText`는 자동으로 줄바꿈되지만 export는
  명시가 필요).

## 4. 검증 방법 (API 0)

1. `npx tsc --noEmit` — 0 에러.
2. 스크립트(`scripts/225cha-compact-layout-verify.ts` 등):
   - `layout:"compact"` 섹션 2~4개를 포함한 합성 섹션 배열로 `buildDetailHtml`(또는
     `sectionHtml`을 직접 호출 가능하면 그쪽)을 실행해, 결과 HTML에 `width:120px`,
     `text-align:left`/`right` 교대, `border-radius:999px`(원형 교대 2번째)와
     `border-radius:12px`(첫 번째) 등이 예상대로 나오는지 확인.
   - `resolveCompactImageShape`를 직접 호출해 홀/짝 인덱스에 따라 square/circle이
     번갈아 나오는지 재확인(이미 있는 순수 함수라 새 버그 유입 가능성 낮음, 카운터
     계산(`compactImageTextIndex`)이 실제 섹션 배열과 일치하는지가 핵심).
   - 회귀 확인: compact가 아닌 기존 image_text 분기(circle-solo/pair/callout/annotated/
     editorial-bleed/split)의 export HTML이 이번 변경으로 달라지지 않았는지 diff.
3. 가능하면 quick_points 슬롯이 있는 실제 세션 1개로 라이브 미리보기와 export한 HTML을
   나란히 스크린샷 — 작은 썸네일 2~4개 가로 배치가 이제 양쪽 다 나오는지 육안 확인.

## 5. 완료 기준

- [ ] `lib/compact-image-shape.ts`의 `resolveCompactImageShape` import
- [ ] `sectionHtml()` 파라미터 2개 추가 + 호출부에서 카운트 계산·전달
- [ ] `case "image_text":`에 compact 분기 추가 (circle-pair 뒤, callout 앞)
- [ ] `tsc` 0, 유료 API 0건
- [ ] 검증 스크립트 + 회귀 없음 확인 (+ 가능하면 스크린샷)
