# 50차 후속 핫픽스 — 패션 미니멀 배경이 export HTML엔 적용 안 됨

생성: 2026-09-01

## 문제

50차 완료 보고에서 D(패션 카테고리 배경 미니멀)를 `lib/export-detail-html.ts`까지 반영
완료로 보고했지만, 코드를 직접 확인한 결과 **정적 HTML 다운로드 파일에는 실제로 적용되지
않습니다.**

`lib/export-detail-html.ts`의 `sectionHtml()` 함수를 보면:

```ts
function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  baseTheme: CategoryTheme,
  productName: string,
  pointIndex?: number,
  bodyIndex?: number,
  extended?: ExtendedTheme,
): string {
  ...
  const surface =
    extended && !skipSurface.has(section.type)
      ? resolveSectionSurface(extended, section.type, bi)   // ← category 인자가 없음
      : null;
```

`resolveSectionSurface(extended, sectionType, bodyIndexZeroBased, category?)`는 `design-tokens.ts`에서
이미 4번째 `category` 인자를 받도록 50차에서 고쳤는데, `sectionHtml()`은 애초에 `category`
파라미터 자체가 없어서 호출부에서 넘길 방법이 없습니다.

호출부(`buildDetailExportHtml` 내부, 약 483행)를 보면:

```ts
const html = sectionHtml(
  section,
  opts.imageUrls,
  opts.theme,
  opts.productName,
  pointIndex,
  bodyIndex,
  extended,
);
```

`opts.category`가 바로 위 스코프에 있는데(다른 곳엔 `category: opts.category`로 잘
전달되고 있음, 예: `buildSeoTextBlockHtml` 호출부) `sectionHtml`에는 안 넘어갑니다. 결과:
`resolveSectionSurface` 안에서 `category`가 항상 `undefined`가 되고, `fashionMinimal =
category === "의류/패션"`이 절대 `true`가 될 수 없습니다.

**영향**: 미리보기 화면(`DetailSectionRenderer.tsx`)은 정상적으로 패션 미니멀 배경이
적용되지만, **판매자가 실제로 다운로드해서 마켓에 업로드하는 정적 HTML 파일은 패션
카테고리라도 항상 예전 진한 배경(알파값 원래대로)으로 나갑니다.** 실사용 산출물에
영향을 주는 부분이라 이번에 바로 고쳐주세요.

## 수정 방법

`sectionHtml()` 시그니처에 `category: string` 파라미터를 추가하고, `resolveSectionSurface`
호출에 그대로 넘기세요:

```ts
function sectionHtml(
  section: DetailSection,
  imageUrls: string[],
  baseTheme: CategoryTheme,
  productName: string,
  category: string,           // 추가
  pointIndex?: number,
  bodyIndex?: number,
  extended?: ExtendedTheme,
): string {
  ...
  const surface =
    extended && !skipSurface.has(section.type)
      ? resolveSectionSurface(extended, section.type, bi, category)   // category 전달
      : null;
```

호출부(약 483행)도 `opts.category`를 넘기도록 인자를 추가하세요:

```ts
const html = sectionHtml(
  section,
  opts.imageUrls,
  opts.theme,
  opts.productName,
  opts.category,   // 추가
  pointIndex,
  bodyIndex,
  extended,
);
```

(파라미터 순서는 자유롭게 조정해도 됩니다 — 다만 다른 호출부가 있으면 전부 같이 고쳐야
합니다. `sectionHtml`을 호출하는 곳이 이 한 곳뿐인지 먼저 확인하세요.)

## 검증 (실제 생성 없이)

`scripts/verify-50cha-static.ts`에 케이스를 하나 추가해서, `export-detail-html.ts`가
export하는 실제 HTML 문자열 안에서 패션 카테고리 섹션의 background 알파값이 다른
카테고리와 다르게 나오는지 직접 비교하세요. 예를 들어:

```ts
import { buildDetailExportHtml } from "../lib/export-detail-html"; // 실제 export 함수명 확인 후 사용
// 패션 카테고리로 export HTML 생성 → 배경 그라데이션 alpha 값이 0.21/0.05 등
// (기본값 0.42/0.1의 절반)로 나오는지 문자열에서 직접 확인
```

정확한 함수명·시그니처는 실제 파일 기준으로 맞춰서 작성하시고, 이전처럼 `npx tsx
scripts/verify-50cha-static.ts`로 콘솔 출력에서 눈으로 확인 가능하게 해주세요. 이번에도
실제 유료 생성은 필요 없습니다 — 함수를 직접 호출해서 나온 HTML 문자열만 검사하면
충분합니다.

## 완료 보고

이 파일 하나만 고치는 작은 핫픽스이니, 변경 diff + `tsc` 결과 + 위 검증 스크립트 출력만
간단히 보고해 주세요.
