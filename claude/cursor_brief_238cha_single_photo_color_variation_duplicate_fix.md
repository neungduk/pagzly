# 238차 브리프 — 사진 1장 업로드 시 패션 컬러 옵션 섹션이 서로 다른 색상인 척 같은 사진을 반복 노출

생성: 2026-09-22 · 예상 유료 API: **0건** (섹션 배열 필터링만, 신규 API 호출 없음)

## 배경

사용자 지시: "우리는 모든카테고리가 어떻게 사용자가 사진을 넣어도 다 디자이너 수준의
상세페이지가 나오도록 하고 있는거야 그렇게만들어야하고." 원 지시의 "사진합성 부분을
코딩으로 해결하자" 축을 "카테고리 무관 + 사용자가 넣는 사진이 어떻든" 관점으로 넓혀,
일반-목적 서브에이전트에게 사진 파이프라인 전반(카테고리별 조건문, 사진 장수·화질·비율
가정, 폴백 처리)을 감사하도록 위임하고, 보고받은 4건 후보를 Claude가 전부 직접 코드로
재확인했습니다.

## 조사 결과 — 4건 중 3건은 이번 스코프 제외(유료 API 증가 또는 가드레일 대상)

서브에이전트가 제시한 4건을 전부 실제 코드로 재확인한 결과:

1. **전자제품·화장품만 Vision 주석 오버레이(`applyElectronicsAnnotatedSections`/
   `applyCosmeticsAnnotatedSections`) 지원, 나머지 4개 카테고리는 없음**: 코드 확인 결과
   사실이나, `lib/analyze-product-annotations.ts`의 `AnnotationDomain`이 `"electronics" |
   "cosmetics"`로 타입부터 두 카테고리 전용이고 Claude Haiku Vision API를 실제로 호출함
   (`Anthropic` SDK). 나머지 4개 카테고리로 확장하려면 카테고리별 신규 프롬프트 작성 +
   **매 생성마다 신규 유료 Vision 호출 증가**가 필요 — "허가 없이 유료 API 호출 금지"
   원칙(235차 rembg 재시도 격차와 동일 클래스) 대상이라 §4로 등록, 이번엔 미착수.
2. **라이프스타일 AI 일상샷 생성이 `productSizeHint`에서 cm 높이 파싱 실패 시 전체 스킵,
   반려동물만 예외**(`lib/generate-lifestyle-shots.ts:109-117`): 코드 확인 결과 사실이나,
   `parseProductHeightCm()`(`lib/lifestyle-physical-scale.ts:27-30` 주석)가 "높이 단서가
   없으면 null(추정 합성 금지)"이라고 명시한 **의도적 안전장치**임을 확인. 이 게이트를
   느슨하게 하면(높이 정보 없이 추정 배치) 111차가 세운 "추정 합성 금지" 원칙을 정면으로
   위반 — anti-hallucination 완화는 절대 원칙상 금지 대상. 반려동물만 예외인 이유도
   불공평이 아니라 반려동물은 애초에 손-검출 픽셀 합성이 아닌 별도의 전체 AI 씬 생성
   경로(`usePixelComposite=false`)를 쓰기 때문(구조적으로 다른 기능). **버그 아님, 가드레일
   보호 대상 — §2 의도적 보류로 기록.**
3. **hero 컷아웃은 배경 제거 직후 Replicate `clarity-upscaler`로 화질 보정을 거치는데
   (`photo-enhance.ts:1484` `sharpenCutout()`), 라이프스타일 픽셀 페이스트 컷아웃은 이
   단계가 아예 없음**: 코드 확인 결과 사실이나, `sharpenCutout()`이 실제로 Replicate
   `philz1337x/clarity-upscaler`를 호출하는 유료 API($0.016/회, `REPLICATE_COST_USD.
   clarityUpscaler`)임을 확인 — 라이프스타일 경로로 확장하면 판매자가 라이프스타일
   합성을 쓸 때마다 프로덕션 유료 호출이 늘어나는 구조. 235차가 rembg 재시도 루프를
   같은 이유로 §4로 분리한 것과 정확히 같은 클래스 — §4로 등록, 이번엔 미착수.
4. **(채택) 업로드 사진이 1장뿐일 때, 패션의 `color_variation`(컬러별 스와치) 섹션이
   모든 컬러 옵션에 똑같은 사진 1장을 강제 배정** — 아래 상세.

## 발견 (채택) — 사진 1장일 때 컬러 옵션 섹션이 "다른 색상"인 척 동일 사진을 반복

`lib/assign-section-images.ts`의 `assignDistinctSectionImages()` 함수, `imageCount === 1`
분기(409~434행):

```ts
if (imageCount === 1) {
  const mapped = sections.map((section) => {
    if (section.type === "hero" || section.type === "image_text") {
      return { ...section, imageIndex: 0 };
    }
    if (section.type === "gallery") { ... }
    if (section.type === "step_card") { ... }
    if (section.type === "color_variation") {
      return {
        ...section,
        options: section.options.map((option) => ({ ...option, imageIndex: 0 })),
      };
    }
    ...
```

`section-templates.ts`(280~284행)에서 `color_variation`은 패션/의류 카테고리에만 있는
슬롯이고(`grep` 결과 다른 5개 카테고리엔 아예 존재하지 않음), 각 옵션(`ColorVariationSection.
options`)은 `label`(예: "블랙"/"베이지"/"네이비")과 `colorHex` 스와치를 따로 가진 채
**서로 다른 사진을 보여주는 것**이 섹션의 존재 목적입니다. 업로드 사진이 1장뿐이면 DeepSeek가
텍스트 입력(색상 언급)만으로 이 섹션을 채워 넣을 수 있는데, 위 코드가 모든 옵션의
`imageIndex`를 무조건 0으로 강제해 — 최종 렌더링에서 "블랙"/"베이지"/"네이비" 라벨이
전부 **동일한 사진 1장**과 함께 나옵니다. `gallery`/`step_card`/`hero`도 같은 분기에서
사진을 반복하긴 하지만, 그 슬롯들은 "여러 각도/단계를 같은 제품 사진 1장으로 보여준다"는
게 시각적으로 자연스러운 반면, `color_variation`은 라벨 자체가 "이 사진은 다른 색상입니다"라고
명시적으로 주장하는 구조라 같은 사진 반복이 **직접적으로 오해를 유발**합니다(디자이너가
만든 페이지라면 애초에 사진이 1장뿐이면 이 섹션 자체를 넣지 않습니다).

## 수정

`lib/assign-section-images.ts`의 `imageCount === 1` 분기에서, 매핑 전에 `color_variation`
섹션을 배열에서 아예 제거(필터링)하고, 이제 도달 불가능해진 `color_variation` 매핑 브랜치는
삭제합니다:

```ts
  // 1장뿐이면 인덱스 재배정 여지는 없지만, 연속 배치·로그는 남긴다.
  if (imageCount === 1) {
    // 238차 — color_variation은 "옵션마다 다른 사진"이 슬롯의 존재 이유라, 사진이
    // 1장뿐이면 전부 같은 사진을 강제 배정하는 대신 섹션 자체를 생략한다(다른
    // 슬롯을 생략하는 기존 관례 — package_contents/stat_infographic 등 — 와 동일 결).
    const mapped = sections
      .filter((section) => section.type !== "color_variation")
      .map((section) => {
        if (section.type === "hero" || section.type === "image_text") {
          return { ...section, imageIndex: 0 };
        }
        if (section.type === "gallery") {
          return {
            ...section,
            imageIndexes: (section.imageIndexes?.length ? section.imageIndexes : [0, 0]).map(
              () => 0,
            ),
          };
        }
        if (section.type === "step_card") {
          return {
            ...section,
            steps: section.steps.map((step) => ({ ...step, imageIndex: 0 })),
          };
        }
        if (section.type === "spec_table" && section.slot === "spec_table") {
          return {
            ...section,
            imageIndexes: (section.imageIndexes ?? []).map(() => 0),
          };
        }
        return section;
      });
    logAssignResult(mapped, imageCount);
    return mapped;
  }
```

(`color_variation` 매핑 브랜치를 통째로 삭제 — filter로 이미 걸러져 도달 불가능해지므로
남겨두면 죽은 코드가 됩니다.)

**스코프 확인**: `imageCount >= 2`일 때 쓰이는 일반 배정 경로(694·925행,
"least-used 전역 배정" 알고리즘)는 손대지 않습니다 — 사진이 2장 이상이면 이미 옵션마다
가능한 한 서로 다른 사진을 배정하려 시도하는 별도 로직이 있어(placement 기반 최소-사용
배정), 이번 문제(1장일 때 무조건 전부 동일)와는 다른 코드 경로입니다.

## 작업 파일

`lib/assign-section-images.ts` 딱 1개. `color_variation` 자체 렌더링 코드
(`DetailSectionRenderer.tsx`/`export-detail-html.ts`의 `case "color_variation"`)는
무변경 — 섹션이 배열에서 아예 빠지면 두 렌더러 다 자동으로 안 그립니다.

## 검증 스크립트 요청

`scripts/238cha-single-photo-color-variation-verify.ts` 신규 작성:

1. `npx esbuild lib/assign-section-images.ts --bundle=false --format=esm --outfile=NUL`
   구문 통과
2. `assignDistinctSectionImages()`를 `color_variation` 섹션 포함 패션 픽스처 +
   `imageCount=1`로 직접 호출해, 반환 배열에 `color_variation` 타입 섹션이 **0개**임을
   확인(완전히 제거됐는지)
3. 같은 픽스처를 `imageCount=2`·`imageCount=3`으로 호출해 `color_variation` 섹션이
   **그대로 남아 있고**(회귀 없음), 각 옵션의 `imageIndex`가 무조건 0으로 고정되지
   않았음을 확인(2장 이상일 땐 기존 최소-사용 배정 로직이 정상 동작하는지)
4. `hero`/`gallery`/`step_card`/`spec_table` 섹션이 `imageCount=1`일 때 여전히
   `imageIndex`가 전부 0으로 채워지는지(이번 수정이 그 슬롯들엔 영향 없는지) 확인
5. `imageCount=1` + `color_variation` 섹션이 **없는** 패션 픽스처로도 호출해, 다른
   섹션 개수·순서가 원래와 동일하게 유지되는지(불필요하게 다른 섹션까지 걸러지지
   않는지) 확인
6. 기존 231/232/236/237차 회귀 스크립트가 있다면 재실행해 무관 기능 회귀 없는지 확인

## 포함하지 않는 것 (이번엔 손대지 않음, §2/§4로 기록)

- 전자제품·화장품 전용 Vision 주석 오버레이를 나머지 4개 카테고리로 확장 — 신규 유료
  Claude Vision 호출 필요, §4 등록.
- 라이프스타일 AI 일상샷의 `productSizeHint` cm 파싱 게이트 완화 — "추정 합성 금지"
  가드레일 보호 대상, §2 등록(버그 아님).
- 라이프스타일 픽셀 페이스트 컷아웃에 hero와 동일한 clarity-upscaler 화질 보정 추가 —
  신규 유료 Replicate 호출 필요, §4 등록.

## 절대 원칙 (재확인)

- anti-hallucination 완화 금지: 없는 색상 사진을 새로 만들거나 추정하지 않고, 표현
  불가능한 섹션은 생략(package_contents/stat_infographic 등 기존 관례와 동일)
- 입력 기근 함정 회피: 사진 1장이라는 "입력 부족" 상황 자체는 코드로 사진을 늘릴 수
  없으므로, 오해를 유발하는 표시를 막는 것이 이번 수정의 전부(새 사진 생성·합성 없음)

유료 API 0건.
