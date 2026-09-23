# 223차 브리프 — export HTML에서 사라진 "부품/기능 주석 오버레이" (Vision 유료 결과물 소실)

생성: 2026-09-18 · 유료 API 0건 (신규 생성 없음 — 이미 존재하는 `section.annotations` 데이터를 export에 렌더링만 추가) · 코드 전용

## 0. 배경 — 어떻게 발견했나

222차(반려동물·패션·생활용품 컴플라이언스) 실행·독립 검증이 완료·확정되어 §3이 다시
비었고, 사용자가 "새 축 자체 발굴"을 다시 선택했습니다. `lib/`·`components/` 디렉토리를
재검토하던 중 `image_text` 섹션의 다이어그램류(`PackageContentsDiagram`/
`FoodRatioDiagram`/`IngredientRingDiagram`)가 라이브(`DetailSectionRenderer.tsx`)와
export(`lib/export-detail-html.ts`) 양쪽에서 호출 횟수가 다른 것(라이브 쪽이 더 많음)을
발견해 원인을 추적했습니다.

결론: 다이어그램 자체는 **버그가 아니었습니다** — 라이브는 `layout:"annotated"` 전용
분기(`isAnnotated`)와 일반 분기(split-layout) 두 곳에 같은 로직이 중복 작성돼 있고,
export는 이 둘을 `shouldUseSplitLayout()` 한 분기로 통합 처리하는데 이 함수가 `annotated`
레이아웃을 배제하지 않아 실제로는 두 경우 모두 다이어그램이 정상적으로 그려집니다(구조
차이일 뿐, 결과물 차이 아님 — 코드 대조로 재확인 완료).

**하지만 그 추적 과정에서 진짜 문제를 발견했습니다**: `layout:"annotated"` 섹션에는
다이어그램 말고 **`AnnotatedImageOverlay`(부품/기능 포인트 라벨 — 이미지 위에 점 + 인출선
+ 말풍선 라벨로 "이 부분은 방수 지퍼" 같은 설명을 붙이는 오버레이)**가 있는데, 이게
`export-detail-html.ts`에는 **아예 구현 자체가 없습니다** (`grep -n "Annotated\|annotations"
lib/export-detail-html.ts` → 0건).

이 오버레이는 장식이 아니라 **유료 Vision API 호출로 생성된 실제 콘텐츠**입니다:

- `lib/apply-electronics-annotations.ts` — 전자제품 `feature_detail` 슬롯 1곳에
  `analyzeProductAnnotations()`(Vision) 호출로 부품 라벨 생성
- `lib/apply-cosmetics-annotations.ts` — 화장품/뷰티 `packaging_design`/`texture_feel`/
  `feature_detail`/`size_options` 중 최대 2곳에 동일 방식으로 생성 (`filterPhysicalCosmeticAnnotations`로
  효능 주장 없는 "물리적 특징"만 필터링해 컴플라이언스까지 이미 처리된 라벨)
- 데이터 타입: `lib/types/generate.ts:199` — `annotations?: { label: string; xPct: number; yPct: number }[]`

즉 **사용자가 이미 비용을 지불해 생성된 콘텐츠**가 라이브 미리보기(에디터 화면)에는
정상적으로 보이지만, 실제로 마켓에 올릴 때 쓰는 **export한 정적 HTML에는 통째로
빠져 있습니다.** 전자제품 또는 화장품/뷰티 카테고리에서 `annotated` 레이아웃이 적용된
상품은 전부 해당됩니다 — 219/221차가 다뤘던 "긴 텍스트 엣지 케이스"보다 훨씬 흔하고
영향이 큰 문제입니다.

## 1. 원본 구현 (라이브) — `components/AnnotatedImageOverlay.tsx`

이 파일 전체를 참고용으로 그대로 두고, export용으로 기하 로직만 1:1 이식합니다.

```ts
export type ImageAnnotation = { label: string; xPct: number; yPct: number };

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function leaderEnd(xPct: number, yPct: number): { x: number; y: number; side: "left" | "right" } {
  const toLeft = xPct;
  const toRight = 100 - xPct;
  if (toLeft >= toRight) {
    return { x: clampPct(xPct - Math.min(18, toLeft * 0.35)), y: yPct, side: "left" };
  }
  return { x: clampPct(xPct + Math.min(18, toRight * 0.35)), y: yPct, side: "right" };
}
```

라이브는 `viewBox="0 0 100 100" preserveAspectRatio="none"` SVG 위에 점(원 2개 — 작은
채움원 + 큰 테두리원) + 인출선을 그리고, 별도로 절대좌표 `<span>` 라벨(둥근 배지, 텍스트
`text-paper`, 배경 `theme.deepAccent`)을 좌/우 방향에 따라 `translate(-100%,-50%)` 또는
`translate(0,-50%)`로 배치합니다. 자세한 렌더 코드는 `components/AnnotatedImageOverlay.tsx`
27~88행 참고.

## 2. 신규 파일 — `lib/annotated-image-overlay-svg.ts`

export(`lib/export-detail-html.ts`)는 React 컴포넌트가 아니라 순수 HTML 문자열을
조립하는 방식이라(예: `lib/package-contents-diagram.ts`의 `buildPackageContentsDiagramSvg`
패턴을 그대로 따름), 같은 컨벤션으로 새 파일을 만듭니다.

```ts
/**
 * 223차 — export HTML에서 layout:"annotated" 섹션의 부품/기능 포인트 라벨
 * (components/AnnotatedImageOverlay.tsx, Vision API 생성 유료 콘텐츠)이 완전히
 * 누락돼 있던 것을 발견·추가. 기하 로직(clampPct/leaderEnd)은 원본과 100% 동일.
 */

export type ExportImageAnnotation = { label: string; xPct: number; yPct: number };

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function leaderEnd(
  xPct: number,
  yPct: number,
): { x: number; y: number; side: "left" | "right" } {
  const toLeft = xPct;
  const toRight = 100 - xPct;
  if (toLeft >= toRight) {
    return { x: clampPct(xPct - Math.min(18, toLeft * 0.35)), y: yPct, side: "left" };
  }
  return { x: clampPct(xPct + Math.min(18, toRight * 0.35)), y: yPct, side: "right" };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** layout:"annotated" 섹션의 이미지 위 부품/기능 포인트 라벨 오버레이 (export용 정적 버전) */
export function buildAnnotatedImageOverlaySvg(
  annotations: ExportImageAnnotation[],
  strokeColor: string,
): string {
  if (!Array.isArray(annotations) || annotations.length === 0) return "";

  const dots = annotations
    .map((ann) => {
      const end = leaderEnd(ann.xPct, ann.yPct);
      return `<g>
        <circle cx="${ann.xPct}" cy="${ann.yPct}" r="1.1" fill="${strokeColor}" opacity="0.9"/>
        <circle cx="${ann.xPct}" cy="${ann.yPct}" r="2.2" fill="none" stroke="${strokeColor}" stroke-width="0.35" opacity="0.55"/>
        <line x1="${ann.xPct}" y1="${ann.yPct}" x2="${end.x}" y2="${end.y}" stroke="${strokeColor}" stroke-width="0.35" opacity="0.75"/>
      </g>`;
    })
    .join("");

  const labels = annotations
    .map((ann) => {
      const end = leaderEnd(ann.xPct, ann.yPct);
      const labelX = end.side === "left" ? end.x - 1 : end.x + 1;
      const transform = end.side === "left" ? "translate(-100%, -50%)" : "translate(0, -50%)";
      return `<span style="position:absolute;left:${labelX}%;top:${end.y}%;transform:${transform};max-width:38%;border-radius:9999px;padding:5px 10px;font-size:11px;font-weight:600;line-height:1.25;color:#FAF8F3;background:${strokeColor};box-shadow:0 1px 3px rgba(0,0,0,.15);white-space:normal">${escapeXml(ann.label)}</span>`;
    })
    .join("");

  return `<div style="position:absolute;inset:0;pointer-events:none" aria-hidden="true">
    <svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="제품 부품 주석">
      ${dots}
    </svg>
    ${labels}
  </div>`;
}
```

**주의 (라이브와 100% 동일하게 맞출 것)**: 좌표계·계수(`Math.min(18, ... * 0.35)`,
`r=1.1`/`r=2.2`, `stroke-width=0.35`, opacity 값들)를 임의로 조정하지 말고 원본
`AnnotatedImageOverlay.tsx`와 정확히 같은 값을 쓸 것 — Claude가 이후 별도 샌드박스에서
동일 좌표 입력에 대해 두 함수의 출력이 일치하는지 독립 재검증할 예정입니다.

## 3. `lib/export-detail-html.ts` 배선

### 3-1. import 추가

파일 상단 다른 다이어그램 import들(`buildPackageContentsDiagramSvg` 등) 근처에 추가:

```ts
import { buildAnnotatedImageOverlaySvg } from "@/lib/annotated-image-overlay-svg";
```

### 3-2. `shouldUseSplitLayout` 분기 (484~528행 부근) 수정

**현재 (484~488행)**:

```ts
      if (shouldUseSplitLayout(section)) {
        const imageLeft = resolveSplitImageLeft(section, pointIndex);
        const columnRatio = resolveSplitFlexRatio(pointIndex);
        const pointLabel =
          pointIndex != null ? `POINT ${String(pointIndex + 1).padStart(2, "0")}` : "";
```

**변경 후**:

```ts
      if (shouldUseSplitLayout(section)) {
        const isAnnotatedSection =
          section.layout === "annotated" &&
          Array.isArray(section.annotations) &&
          section.annotations.length > 0;
        const imageLeft = resolveSplitImageLeft(section, pointIndex);
        // annotated 레이아웃은 라이브(DetailSectionRenderer.tsx의 isAnnotated 분기)가
        // 항상 고정 50/50(sm:grid-cols-2)을 쓰고 60/40 리듬을 적용하지 않음
        // (resolveSplitColumnRatio 주석 참고: "annotated/callout 등 다른 image_text
        // 레이아웃에는 적용하지 않고"). export도 동일하게 맞춘다.
        const columnRatio = isAnnotatedSection
          ? { image: 1, text: 1 }
          : resolveSplitFlexRatio(pointIndex);
        // 라이브의 isAnnotated 분기는 POINT 배지를 렌더링하지 않음(pointIndex는 계산되지만
        // 표시 안 함) — export도 annotated 섹션엔 POINT 배지를 숨긴다.
        const pointLabel =
          pointIndex != null && !isAnnotatedSection
            ? `POINT ${String(pointIndex + 1).padStart(2, "0")}`
            : "";
        const annotationOverlayHtml = isAnnotatedSection
          ? buildAnnotatedImageOverlaySvg(section.annotations!, deep)
          : "";
```

(이 아래 `kicker`/`pkgItems`/`pkgHtml`/`foodSlices`/`foodHtml`/`ringLabels`/`ringHtml`
선언은 전부 그대로 유지.)

### 3-3. 이미지 컨테이너 안에 오버레이 삽입 (513~516행 부근)

**현재**:

```ts
            <div style="flex:${columnRatio.image} 1 280px;order:${imageLeft ? 1 : 2};position:relative">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:${RADIUS.lg}px;box-shadow:${ELEVATION.imageLift(theme.deepAccent)}"/>` : ""}
              ${pointLabel ? `<span style="position:absolute;left:16px;top:16px;background:${hexToRgba(deepFill, 0.9)};color:#FAF8F3;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:${RADIUS.pill}px">${pointLabel}</span>` : ""}
            </div>
```

**변경 후** (오버레이 한 줄만 추가):

```ts
            <div style="flex:${columnRatio.image} 1 280px;order:${imageLeft ? 1 : 2};position:relative">
              ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:${RADIUS.lg}px;box-shadow:${ELEVATION.imageLift(theme.deepAccent)}"/>` : ""}
              ${annotationOverlayHtml}
              ${pointLabel ? `<span style="position:absolute;left:16px;top:16px;background:${hexToRgba(deepFill, 0.9)};color:#FAF8F3;font-size:${FONT_SIZE.label};font-weight:700;letter-spacing:.28em;padding:6px 12px;border-radius:${RADIUS.pill}px">${pointLabel}</span>` : ""}
            </div>
```

(`pointLabel`은 3-2에서 이미 `isAnnotatedSection`일 때 빈 문자열이 되므로 이 줄은 그대로
둬도 무해하지만, 조건을 명확히 하기 위해 위 diff대로 유지.)

## 4. 스코프 밖 (이번 라운드에서 건드리지 않음)

조사 중 라이브의 `isFullPoint` 카운터(`section.type==="image_text" && layout이
compact/callout/quick_points/feature_callout가 아니면 포인트 카운트`)와 export의
`isFullPoint = shouldUseSplitLayout(section)`가 **에디토리얼 블리드 섹션을 카운트에
포함시키는지 여부**에서 미묘하게 다를 수 있어 보입니다(export는 `shouldUseSplitLayout`
내부에서 `shouldUseEditorialBleed`면 false 처리해 카운트 제외, 라이브의 `isFullPoint`는
그런 제외가 없어 보임 — 코드만 훑어본 수준이라 실제로 POINT 번호나 60/40 리듬이
어긋나는지 아직 검증 안 됨). 이건 이번 브리프 스코프에 넣지 않습니다. 확실하지 않은
채로 손대면 오히려 새 회귀를 만들 위험이 있어, 이번엔 명확히 확인된 "오버레이 완전
누락" 문제만 고칩니다. (§3에 별도 후보로 남기지 않고 이 브리프 각주로만 기록 — 다음에
export/라이브 포인트 카운팅을 다룰 라운드가 있으면 재검토.)

## 5. 검증 방법 (API 0)

1. `npx tsc --noEmit` — 0 에러 확인.
2. 스크립트 작성 (`scripts/223cha-annotated-overlay-verify.ts` 등, 이름 자유):
   - `buildAnnotatedImageOverlaySvg([{label:"방수 지퍼", xPct:20, yPct:30}, {label:"인체공학 손잡이", xPct:80, yPct:60}], "#3B82F6")`
     호출 결과에 `<svg`, `viewBox="0 0 100 100"`, 두 라벨 텍스트, `cx="20" cy="30"`,
     `cx="80" cy="60"` 등이 전부 포함되는지 확인.
   - `leaderEnd`/`clampPct` 상당 로직을 별도로도 재구현해 원본 `AnnotatedImageOverlay.tsx`
     값과 좌표 단위까지 일치하는지 비교(예: xPct=95일 때 side가 "left"로 정확히
     꺾이는지 — toLeft=95 >= toRight=5).
3. 화면 캡처 1~2장: 기존 `181cha-live` 픽스처 중 전자제품 세션(`feature_detail`이
   `annotated`로 적용된 케이스가 있는지 먼저 확인 — 없으면 `analyzeProductAnnotations`
   결과를 흉내 낸 더미 `annotations` 배열을 세션 JSON에 임시로 주입해 스크린샷만 뜨고
   되돌리는 방식으로, 216/218차가 썼던 "QA 전용 코드 변경 후 되돌림" 패턴 준수) →
   export한 HTML을 브라우저로 열어 라이브 미리보기와 오버레이 위치·라벨이 일치하는지
   육안 대조.
4. 회귀 확인: `annotated`가 아닌 기존 image_text 섹션들(일반 split/callout/circle 등)의
   export HTML이 이번 변경으로 달라지지 않았는지 diff로 확인 — `annotationOverlayHtml`은
   `isAnnotatedSection`이 아니면 항상 빈 문자열이라 원칙적으로 영향 없어야 함.

## 6. 완료 기준

- [ ] `lib/annotated-image-overlay-svg.ts` 신규 (원본 기하 로직 1:1 이식)
- [ ] `lib/export-detail-html.ts` shouldUseSplitLayout 분기에 오버레이 렌더 + POINT 배지
      숨김 + 50/50 고정 비율 3가지 배선
- [ ] `tsc` 0, 유료 API 0건
- [ ] 검증 스크립트 + (가능하면) 스크린샷 리포트
