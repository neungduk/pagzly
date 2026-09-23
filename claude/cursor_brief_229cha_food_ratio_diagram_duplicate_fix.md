# Cursor 실행 브리프 229차 — 식품 원재료 비율 도넛 차트, spec_table에 오발생하는 중복 렌더 제거

생성: 2026-09-22 · 발굴: 228차실행검증 후 "새 축 자체 발굴" 재시도(사용자 지시 "다시발굴")

## 절대 제약 (필독)

- **유료 API 호출 금지.** DeepSeek/Replicate/Claude 호출, `/api/generate` 로직 변경 없음.
- 이번 작업은 **코드 삭제(정리) 1건뿐**입니다. 새 필드·새 함수·새 컴포넌트 없음.
- `lib/food-ratio-diagram.ts`(파서·SVG 빌더 자체), `lib/export-detail-html.ts`는 **전혀 건드리지
  않습니다** — 아래에서 설명하듯 export는 이미 올바르게 동작 중입니다.

## 배경 — 발견 경위

`components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts` 전체에서
`prepareFoodRatioSlices`/`FoodRatioDiagram`(식품 "원재료 구성 비율" 도넛 차트, 113차) 호출부를
grep한 결과 라이브 렌더러에 호출부가 **3곳** 있습니다:

1. `case "image_text":`의 image-left 레이아웃 분기 (1722행 부근)
2. `case "image_text":`의 image-right 레이아웃 분기 (1965행 부근)
3. `case "spec_table":"` (2100행 부근) ← **이번에 제거할 곳**

1·2번은 `section.slot === "sourcing_story"`(식품 카테고리의 "원산지/소싱 스토리" 슬롯,
`lib/section-templates.ts`의 FOOD 템플릿에 `type: "image_text"`로 정의됨) + `isFoodCategory(category)`로
정확히 게이팅돼 있고, `lib/export-detail-html.ts`(544행 부근, `case "image_text":`)에도 **완전히
동일한 조건**(`isFoodCategory(category) && section.slot === "sourcing_story"`)으로 이미 올바르게
구현돼 있습니다 — 여기는 라이브·export가 이미 일치하며 손댈 필요가 없습니다.

문제는 3번입니다. `case "spec_table":`의 코드를 보면:

```tsx
{isFoodCategory(category) ? (
  (() => {
    const slices = prepareFoodRatioSlices(ingredients, keyFeatures);
    return slices ? (
      <FoodRatioDiagram slices={slices} theme={theme} />
    ) : null;
  })()
) : null}
```

이 블록은 **`section.slot` 조건이 전혀 없이 `isFoodCategory(category)`만으로** 발동합니다. 그런데
`lib/section-templates.ts`의 FOOD 템플릿을 확인하면 `type: "spec_table"`인 슬롯이 **두 개**
있습니다 — `nutrition_table`(영양정보 고시표, required)과 `shipping_info`(배송정보 고시표,
required). 즉 식품 카테고리 상품을 만들면 spec_table 타입 섹션이 두 번 렌더링되는데, 이 블록은
슬롯을 가리지 않으므로 **두 섹션 모두에서** 조건을 만족하면 "원재료 구성 비율" 도넛 차트가 또
렌더링됩니다. 결과적으로 `ingredients` 또는 `keyFeatures`에 "귀리 40%, 견과 25%, 기타 35%"처럼
비율 텍스트가 있는 식품 상품(드물지 않은 입력 형태입니다)은 **같은 도넛 차트가 라이브 에디터
미리보기에 최대 3번**(원래 의도된 sourcing_story 1번 + nutrition_table + shipping_info) 나타납니다
— 영양정보/배송정보 표 옆에 뜬금없이 원재료 비율 차트가 뜨는 모양새입니다.

**이게 코드 결함이라는 근거 3가지:**

1. 같은 케이스 블록 안의 다른 6개 다이어그램(사이즈·용량·소음·방수·무게·소비전력)은 전부
   `section.slot === "spec_table"`(또는 `size_table`/`isSizeTable`) 조건을 명시적으로 갖고
   있는데, 식품 비율 다이어그램만 이 패턴에서 빠져 있습니다 — 일관성이 깨져 있습니다.
2. 바로 아래 표 위 여백(`mt-6` vs `mt-10`)을 결정하는 조건식
   (`sizeDiagramMatches.length > 0 || showSizeComparison || showVolumeDiagram || noiseMatch ||
   waterproofMatch || weightMatch || powerMatch`)에 식품 비율 다이어그램이 **포함돼 있지
   않습니다** — 이 블록이 실제로 렌더링되면 위쪽 다이어그램이 있는데도 표가 `mt-10`(다이어그램
   없을 때 여백)으로 붙어버리는 미세한 레이아웃 결함까지 동반합니다. 제대로 통합된 기능이라면
   이 조건에도 들어가 있어야 하는데 빠져 있다는 건 이 블록이 나중에 실수로 남은 코드라는 정황
   증거입니다.
3. `lib/export-detail-html.ts`의 `case "spec_table":`에도 겉보기엔 대응되는 코드가 있습니다
   (`foodSlices = section.slot === "spec_table" && isFoodCategory(category) ? ... : null`)만,
   식품 카테고리의 spec_table 타입 슬롯은 실제로는 `"nutrition_table"`/`"shipping_info"`라는
   이름이라 `=== "spec_table"` 비교가 **항상 거짓**이 되어 이 코드는 사실상 죽은 코드이고,
   결과적으로 export에는 이 중복이 나타나지 않습니다(우연히 안전한 쪽으로 막혀 있는 것). 즉
   **라이브 에디터에서 보이는 화면과 실제로 다운로드/발행되는 export HTML이 다릅니다** —
   판매자는 편집 화면에서 이상하게 겹쳐 보이는 걸 보고 당황하거나, 반대로 못 보고 넘어가면
   실제로는 export에 없으니 "왜 편집 화면과 다르지"라는 혼란을 겪을 수 있습니다.

## 수정 내용 — `components/DetailSectionRenderer.tsx` 딱 1곳만

`case "spec_table":` 블록(2100~2106행 부근)에서 아래 코드를 **통째로 삭제**하세요:

```tsx
          {isFoodCategory(category) ? (
            (() => {
              const slices = prepareFoodRatioSlices(ingredients, keyFeatures);
              return slices ? (
                <FoodRatioDiagram slices={slices} theme={theme} />
              ) : null;
            })()
          ) : null}
```

바로 위(`showSizeComparison` 블록)와 바로 아래(`noiseMatch` 블록)는 그대로 두고, 이 블록만
제거하면 됩니다. `sourcing_story`(`image_text` case) 쪽 2곳은 **절대 건드리지 마세요** — 거기는
이미 올바르고 export와 정확히 일치합니다.

`prepareFoodRatioSlices`/`FoodRatioDiagram` import는 `sourcing_story` 분기 2곳에서 여전히
사용하므로 **import 문은 그대로 유지**하세요(삭제하면 안 됨).

## 스코프 제외 (이번엔 손대지 않음)

- `lib/food-ratio-diagram.ts`(파서·SVG 빌더) — 로직 자체는 정상, 미변경.
- `lib/export-detail-html.ts` — 이미 올바름(우연히도 결과적으로 정확), 미변경. 단, 검증 단계에서
  export의 `foodSlices`(spec_table case, 591행 부근)가 죽은 코드라는 걸 확인만 하고, 정리 여부는
  이번 스코프 밖(다음 라운드에서 "죽은 코드 정리"로 별도 판단).
- `lib/section-templates.ts`, `app/api/generate/route.ts` — 미변경.

## 검증 요청 (완료 후 보고에 포함)

1. **재현 확인(수정 전)**: 무료 mock 데이터로 `ingredients` 또는 `keyFeatures`에 "귀리 40%,
   견과 25%, 기타 35%" 같은 비율 텍스트를 넣은 식품 카테고리 세션을 만들고(신규 `/api/generate`
   호출 없이 기존 세션 JSON을 직접 조작하거나 `/dev/detail-preview` 등 무료 프리뷰 경로 활용),
   수정 전 라이브 에디터에서 "원재료 구성 비율" 도넛 차트가 몇 번 나오는지(sourcing_story 1회 +
   nutrition_table/shipping_info에서 추가로 몇 회) 스크린샷으로 확인.
2. **수정 후 확인**: 같은 세션으로 라이브에서 도넛 차트가 `sourcing_story` 섹션 딱 1번만 나오고,
   `nutrition_table`/`shipping_info` 섹션에는 나오지 않는지 스크린샷 확인. 기존에 표시되던 다른
   6개 다이어그램(사이즈/용량/소음/방수/무게/소비전력) 중 이 세션에서 해당되는 게 있다면 그대로
   정상 표시되는지도 함께 확인(회귀 없음).
3. **export 비교**: 같은 세션의 export HTML을 생성해 수정 전/후 모두 도넛 차트가 `sourcing_story`
   섹션에만 1번 나오고 변화가 없는지 확인(export는 애초에 정상이었으므로 diff가 없어야 정상).
4. **비-식품 카테고리 회귀 없음**: 전자제품 또는 생활용품 등 비식품 세션 1개로 spec_table 렌더링에
   diff가 없는지 확인(`isFoodCategory` 분기 자체가 실행되지 않으므로 원칙적으로 영향 없음).
5. **`npx esbuild components/DetailSectionRenderer.tsx --bundle=false --format=esm
   --loader:.tsx=tsx --outfile=/dev/null`**로 구문 검증.
6. **git diff 확인**: 변경된 파일이 정확히 `components/DetailSectionRenderer.tsx` 1개뿐이고,
   diff가 위 7줄 삭제(+ 그로 인한 공백 정리) 외에 다른 변경이 없는지 최종 확인.

## 완료 기준

- `components/DetailSectionRenderer.tsx` 1개 파일만 변경, 정확히 저 블록만 삭제.
- 식품 카테고리에서 원재료 비율 도넛 차트가 `sourcing_story` 섹션에 정확히 1번만 표시(라이브·
  export 모두 동일).
- 다른 6개 spec_table 다이어그램·비식품 카테고리·`sourcing_story` 렌더링에 회귀 없음.
- 신규 API 호출 0건.
