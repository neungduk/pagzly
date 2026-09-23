# 236차 브리프 — 식품 카테고리 TOC 앵커 누락 + hero/CTA 북엔드 대각선 클립 export 누락

생성: 2026-09-22 · 예상 유료 API: **0건** (순수 CSS/문자열 조건 변경)

## 배경

233~235차가 3라운드 연속 "hero vs 라이프스타일 함수 호출 대조" 기법으로 사진합성 축을
팠으나 235차에서 이 기법이 소진됨(남은 3개 함수는 전부 무관한 별도 용도로 확인). 원 지시의
나머지 절반 "흐름과 인포그래픽 부분을 확실하게 잡아달라"로 축을 돌려 서브에이전트에 구조적
감사를 위임(`lib/section-templates.ts`로 실제 카테고리별 슬롯 진실을 먼저 확인한 뒤 흐름/
인포그래픽 관련 코드 추적)받고, Claude가 보고받은 모든 주장을 직접 코드로 재확인함. 2건
확정.

## 발견 A — 식품 카테고리에서 TOC "제품정보" 앵커가 영구 미노출

`lib/section-anchor-nav.ts:19-21`의 "제품정보" 규칙:
```ts
{
  id: "pagzly-info",
  label: "제품정보",
  match: (s) => s.type === "spec_table" && s.slot === "spec_table",
},
```
`s.slot === "spec_table"` 리터럴만 검사. 그런데 `lib/section-templates.ts:435-436`을 보면
FOOD 카테고리의 제품정보 슬롯은 `slot: "nutrition_table"`(영양정보표)로, 6개 카테고리 중
유일하게 이름이 다름(FASHION은 `size_table`이라 별도 "사이즈" 규칙이 이미 있음). 즉 FOOD
페이지는 이 조건이 단 한 번도 참이 될 수 없어 상단 스티키 앵커 내비게이션에서 "제품정보"
탭이 영구히 빠짐 — 232차가 이미 고친 "FOOD의 spec_table↔nutrition_table 슬롯명 불일치"와
정확히 같은 결함 계열이 여기 한 곳 더 남아 있던 것.

**공유 로직이라 live/export 둘 다 동일하게 영향받음**(개별 drift가 아니라 단일 버그):
`buildSectionAnchors()`가 `DetailSectionRenderer.tsx:3837`과 `export-detail-html.ts:1099`
양쪽에서 똑같이 호출됨 — 즉 이 파일 하나만 고치면 라이브·export 둘 다 동시에 해결.

### 수정

`lib/section-anchor-nav.ts`의 "pagzly-info" 규칙만 아래로 교체(다른 8개 규칙은 무변경):
```ts
{
  id: "pagzly-info",
  label: "제품정보",
  match: (s) =>
    s.type === "spec_table" &&
    (s.slot === "spec_table" || s.slot === "nutrition_table"),
},
```
`shipping_info`/`size_table`은 이미 자기 규칙이 따로 있으니 이 조건에 넣지 마세요(중복
매칭 시 먼저 등장하는 규칙이 우선이라 순서상 위험은 없지만, 의미상으로도 섞지 않는 게
맞습니다).

## 발견 B — hero 직후·CTA 밴드의 "북엔드"(bookend) 대각선 클립이 export에 전혀 없음

`lib/design-tokens.ts:772-788`(156차, 152차 다이슨코리아 등 벤치마크 근거로 "페이지 시작/
끝에 의도적인 각(角) 마감을 준다"는 패턴 도입 — 원문 주석: *"히어로 직후 대각선 컷(위)과
짝을 이루도록... cta_price 밴드 상단에도... '열고 닫는' 북엔드 느낌"*)의
`HERO_TRANSITION_CLIP_PATH`/`CTA_TRANSITION_CLIP_PATH`(+짝인 `_OVERLAP_CLASS` 마진)가
`components/DetailSectionRenderer.tsx`(hero 바로 다음 섹션을 감싸는 wrapper div, 3962~3981행 —
트러스트칩+스펙벤토그리드+본문 전부를 한 div 안에 포함; cta_price 섹션 자체, 3744~3752행)
양쪽에 배선돼 있는데, `lib/export-detail-html.ts`엔 `getCategoryRhythm`·`heroTransitionClip`·
`ctaTransitionClip`·`HERO_TRANSITION_CLIP_PATH`·`CTA_TRANSITION_CLIP_PATH` grep 결과 **0건**
— 완전히 빠짐. `hero`·`cta_price` 둘 다 6개 카테고리 전부에서 `required: true`(전수 확인,
`section-templates.ts` 31/183/341/493/638/778행 hero, 179/337/489/634/774/914행 cta_price)라
**생성되는 모든 페이지**에서 export만 이 시각적 "열고 닫는" 마감이 빠진 상태.

### 수정 B-1 (CTA 밴드, 간단) — `lib/export-detail-html.ts`의 `case "cta_price":`

기존(823행):
```ts
return `<section${sectionIdAttr} class="pagzly-cta" style="${pad}background:${deepFill};color:#FAF8F3;text-align:center">
```
다음으로 교체(clip-path + 겹침 마진만 추가, 나머지 전부 그대로):
```ts
return `<section${sectionIdAttr} class="pagzly-cta" style="${pad}background:${deepFill};color:#FAF8F3;text-align:center;clip-path:polygon(0 44px, 100% 0, 100% 100%, 0 100%);margin-top:-16px">
```
(`.pagzly-cta`가 이미 `position:sticky;bottom:0;z-index:20`을 가지고 있어 — export-detail-html.ts:1227
— 별도 position/z-index 추가 불필요. `-16px`는 라이브의 `-mt-4`(=-1rem) 모바일 값과 동일,
`sm:-mt-6` 반응형 변형은 export가 미디어쿼리 없이 고정값만 쓰는 기존 관례(109행
`margin-top:-28px` 참고)를 따라 생략합니다.)

### 수정 B-2 (hero 직후, 약간 더 큼) — `lib/export-detail-html.ts`의 `if (section.type === "hero")` 블록(1157~1164행)

기존:
```ts
if (section.type === "hero") {
  const next = visibleSections[i + 1];
  if (next) {
    if (trustChips.length > 0) bodyParts.push(trustStripHtml(trustChips, opts.theme, certTokens));
    if (quickFacts.length > 0) bodyParts.push(buildSpecBentoGridHtml(quickFacts, opts.theme));
  }
}
```
다음으로 교체 — 트러스트칩·스펙벤토그리드가 하나라도 있으면 그 둘을 클립된 wrapper div로
감싸기(둘 다 없으면 지금처럼 아무것도 안 함, 최소 변경):
```ts
if (section.type === "hero") {
  const next = visibleSections[i + 1];
  if (next) {
    const heroFollowParts: string[] = [];
    if (trustChips.length > 0) heroFollowParts.push(trustStripHtml(trustChips, opts.theme, certTokens));
    if (quickFacts.length > 0) heroFollowParts.push(buildSpecBentoGridHtml(quickFacts, opts.theme));
    if (heroFollowParts.length > 0) {
      bodyParts.push(
        `<div style="position:relative;z-index:1;clip-path:polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - 44px));margin-top:-16px">${heroFollowParts.join("\n")}</div>`,
      );
    }
  }
}
```

**중요 — 이 수정이 라이브와 100% 동일하지 않은 부분(의도적, 문서화)**: 라이브는 hero 직후
섹션의 본문 내용(`content`, 예: checklist/gallery 등 실제 다음 섹션 렌더 결과) 자체까지
같은 클립 wrapper 안에 포함시킵니다(트러스트칩+벤토그리드+본문을 한 div로 묶음). export의
메인 루프는 다음 섹션을 별도 반복(iteration)에서 렌더링하는 구조라, 본문까지 같은 wrapper에
넣으려면 `bodyIndex`/`pointIndex`/`compactImageTextIndex`/브리더 카운터 계산 순서를 건드려야
해서 회귀 위험이 커집니다 — 이번 브리프는 **트러스트칩+스펙벤토그리드만** 감싸는 것으로
스코프를 좁혔습니다. 시각적으로는 hero 바로 아래에 대각선 클립이 여전히 나타나 "열림" 느낌은
달성되지만, 트러스트칩과 퀵팩트가 둘 다 없는 극히 드문 케이스(입력에 인증·신뢰 배지도
없고 핵심 스펙도 없는 경우)에는 export에 클립이 안 나타날 수 있습니다 — 이 경우는 라이브도
사실상 거의 빈 wrapper라 시각적 손실이 미미합니다.

## 작업 파일

`lib/section-anchor-nav.ts`(발견 A) + `lib/export-detail-html.ts`(발견 B, 2곳)만. 라이브
쪽(`DetailSectionRenderer.tsx`)은 이미 정상이라 무변경.

## 검증 스크립트 요청

`scripts/236cha-anchor-and-bookend-verify.ts` 신규 작성:

1. `npx esbuild lib/section-anchor-nav.ts lib/export-detail-html.ts --bundle=false --format=esm --outfile=NUL` 구문 통과
2. `buildSectionAnchors()`를 6개 카테고리 각각의 실제 `section-templates.ts` 슬롯 배열(또는
   대표 샘플)로 직접 호출해 FOOD에서 "제품정보"(`pagzly-info`) 앵커가 이제 나타나는지, 나머지
   5개 카테고리는 회귀 없이 그대로인지 확인
3. `buildDetailPageHtml()`을 최소 픽스처(hero+cta_price 포함, quickFacts 있음/없음 두 케이스)로
   호출해 결과 HTML을 `clip-path:polygon(0 0` / `clip-path:polygon(0 44px`로 grep — 각각 1건씩
   존재 확인
4. 기존 231/232차 회귀 스크립트가 있다면 재실행해 브리더·행 필터링 등 무관 기능 회귀 없는지 확인

스크린샷 1~2장(export HTML을 브라우저로 렌더링해 hero 바로 아래·CTA 밴드 위쪽 대각선 클립이
보이는지) 있으면 좋습니다 — `review/236cha-food-anchor-and-bookend/`에 저장.

## 포함하지 않는 것

- hero-follow wrapper에 다음 섹션 본문까지 포함시키는 완전한 라이브 동일 구조(위 설명 참고,
  회귀 위험 대비 이득이 낮아 이번엔 제외 — 다음 라운드 후보로만 기록).
- `section-anchor-nav.ts`의 다른 8개 규칙은 `section-templates.ts` 전체 재대조 결과 전부
  정상(각 카테고리 실제 슬롯명과 일치)이라 무변경.
- `ScrollProgressBar.tsx`/`DetailScrollReveal.tsx`는 스크롤 애니메이션으로 정적 export에
  적용 대상 자체가 아니라 스코프 밖(서브에이전트 조사·Claude 재확인 완료).
- `resolveSplitFlexRatio`(export) vs `resolveSplitColumnRatio`(라이브)는 처음엔 좌우 반전
  버그로 의심했으나, flexbox `order`가 CSS Grid 트랙과 달리 시각적 위치로 `flex-grow`를
  재배정하지 않는 구조적 차이 때문에 export의 flex 버전이 실제로는 올바른 것으로 확인 —
  버그 아님, 제외.

유료 API 0건.
