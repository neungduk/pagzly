# 207차 — ingredient_circle_pair 폴백 완화 (후커블 퀄리티 격차 해소, API 0)

생성: 2026-09-16 — 사용자 지시("후커블과 똑같은 퀄리티가 나올때까지 업그레이드, 단 API 호출은
절대 금지")에 따라 Claude가 148차부터 59라운드째 미해결로 남아있던 후커블 격차를 코드
재검토로 재발굴

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.
(기존 함수(`pickAlternateIndex`) 재사용만 — 신규 로직·신규 이미지 생성 없음)

## 배경 — 59라운드째 미해결이던 실제 버그

148차(`148cha-hookable-parity-report.md`) 실사 검증에서 이런 기록이 남아있습니다:

> "ingredient_circle_pair의 실제 원형(circle) 비주얼 미확인 — 이번 실사에서 '주요 성분
> 4종' 섹션은 원형 그래픽이 아니라 제품 사진 + 텍스트의 image_text 레이아웃으로
> 렌더링됐습니다. 접근성 트리 상 섹션 타입은 `ingredient_circle_pair`로 찍혔지만, 실제
> 원형(circle-solo/circle-pair) 비주얼 대신 폴백 레이아웃이 쓰였을 가능성이 있어 다음
> 라운드에서 `apply-ingredient-circle-pair.ts`의 트리거 조건을 다시 확인할 필요가
> 있습니다."

이번에 사용자 지시("후커블과 똑같은 퀄리티까지 업그레이드, API 금지")를 받고 코드를 직접
재검토해서 **이게 실제 버그였다는 걸 확인했습니다**. 원인은 `lib/apply-ingredient-
circle-pair.ts`의 `applyIngredientCircleVisual()`에 있습니다:

- 원형 성분 크롭 2개(circle-pair)를 만들려면 성분 라벨이 2개 이상 있어야 하는데,
  이때 **반드시 `texture_feel` 슬롯(질감/사용감 사진)이 섹션 목록에 실제로 존재해야만**
  두 번째 원형 이미지를 채웁니다(129~156번 줄).
- 그런데 `lib/section-templates.ts` 62~73번 줄을 보면 `ingredient_highlight`는
  `required: true`인데 **`texture_feel`은 `required: false`(선택 슬롯)**입니다 — 긴
  구성이어도 DeepSeek가 입력에 질감 관련 근거가 마땅치 않으면 흔히 생략합니다.
- 즉 사용자가 성분을 2개 이상 입력해도(→ circle-pair 조건 충족) `texture_feel` 슬롯이
  생성되지 않으면 `applyIngredientCircleVisual()`이 조용히 `applied: false`를 반환하고
  **원형 성분 강조 비주얼 자체가 통째로 스킵**됩니다 — 148차가 실사로 목격한 정확히 그
  증상입니다.
- 대조적으로 성분 1개짜리 `circle-solo` 경로(93~119번 줄)는 이미 `pickAlternateIndex()`
  라는 폴백 함수를 씁니다 — `texture_feel` 이미지가 있으면 그걸 쓰고, 없으면 **성분
  사진과 다른 아무 상품 사진이나** 골라서 원형 비주얼을 만듭니다. 즉 이미 존재하는,
  이미 검증된 더 견고한 폴백 로직이 `circle-pair` 경로에만 적용이 안 돼 있는
  비대칭입니다.

이 성분 강조 원형 크롭은 애초에(65차, 159차 Behance 벤치마크) 후커블류 프리미엄 상세페이지의
핵심 시각 요소로 도입됐던 기능이라, 조용히 자주 스킵되고 있었다는 건 순수하게 후커블 대비
시각적 격차입니다. 렌더링 자체(`DetailSectionRenderer.tsx`/`export-detail-html.ts`)를
코드로 확인한 결과 `circlePair`는 라벨링된 원형 이미지 크롭 2장을 나란히 보여줄 뿐 —
"texture_feel 전용 매크로 클로즈업이어야 한다"는 하드코딩된 전제가 전혀 없습니다(라벨은
성분명, 이미지는 어떤 상품 사진이든 원형으로 크롭돼 렌더링됨). 그래서 `circle-solo`와
동일한 폴백을 `circle-pair`에도 적용하는 게 시각적으로 안전합니다.

## 작업 — `lib/apply-ingredient-circle-pair.ts` 단일 파일, 함수 1개만 수정

`applyIngredientCircleVisual()` 안의 `labels.length >= 2`(pair) 분기, 현재:

```ts
  const texSection = sections.find(
    (s): s is ImageTextSection => s.type === "image_text" && s.slot === "texture_feel",
  );
  if (!texSection) {
    return { sections, applied: false };
  }

  const texUrl = imageUrls[texSection.imageIndex];
  if (!texUrl || ingSection.imageIndex === texSection.imageIndex) {
    return { sections, applied: false };
  }

  const circleSection: ImageTextSection = {
    type: "image_text",
    slot: CIRCLE_PAIR_SLOT,
    layout: "circle-pair",
    heading: "",
    body: "",
    // pair는 두 URL을 circlePair에 담고, imageIndex는 ingredient와 다른 texture 쪽을 쓴다
    imageIndex: texSection.imageIndex,
    imagePosition: "left",
    circlePair: [
      { imageUrl: ingUrl, label: labels[0]! },
      { imageUrl: texUrl, label: labels[1]! },
    ],
  };
```

이걸 아래로 교체하세요:

```ts
  // 207차 — texture_feel은 선택 슬롯이라 자주 생략됨(section-templates.ts:69
  // required:false). 예전엔 texture_feel이 없으면 circle-pair 전체를 스킵했는데,
  // circle-solo(위 93~119번 줄)가 이미 쓰고 있는 `pickAlternateIndex`(34~56번 줄, texture_feel
  // 이미지를 우선 시도하고 없으면 ingredient와 다른 첫 번째 이미지로 폴백하는 기존 함수)를
  // 그대로 재사용하면 됨 — 신규 로직 없음. circlePair 렌더링은 라벨링된 원형 크롭일 뿐
  // texture 전용 크롭이어야 한다는 전제가 없어서(DetailSectionRenderer.tsx/
  // export-detail-html.ts 코드 확인 완료) 동일 폴백이 시각적으로 안전 — 148차부터
  // 미해결이던 "성분 2개 이상인데도 원형 비주얼이 조용히 스킵되는" 후커블 격차를 여기서
  // 해소.
  const pairImageIndex = pickAlternateIndex(
    sections,
    ingSection.imageIndex,
    imageUrls.length,
  );
  const pairUrl = imageUrls[pairImageIndex];
  if (!pairUrl || pairImageIndex === ingSection.imageIndex) {
    return { sections, applied: false };
  }

  const circleSection: ImageTextSection = {
    type: "image_text",
    slot: CIRCLE_PAIR_SLOT,
    layout: "circle-pair",
    heading: "",
    body: "",
    // pair는 두 URL을 circlePair에 담고, imageIndex는 pickAlternateIndex가 고른 이미지를
    // 쓴다(texture_feel이 있으면 그쪽 우선, 없으면 다른 상품 사진으로 폴백)
    imageIndex: pairImageIndex,
    imagePosition: "left",
    circlePair: [
      { imageUrl: ingUrl, label: labels[0]! },
      { imageUrl: pairUrl, label: labels[1]! },
    ],
  };
```

**`pickAlternateIndex`는 이미 같은 파일 34~56번 줄에 정의돼 있는 기존 함수입니다 — import나
신규 로직이 전혀 필요 없습니다.** 이 함수는 이미 `texture_feel` 이미지를 우선 시도하고,
없으면 `ingSection.imageIndex`와 다른 첫 번째 이미지를 반환하도록 구현돼 있습니다(35~56번
줄 확인) — `circle-solo` 경로가 이미 이 함수로 검증된 폴백을 쓰고 있으니, `circle-pair`도
직접 `texSection`을 조건 분기하는 대신 **똑같이 이 함수를 호출하기만 하면** 됩니다(코드
중복·불일치 위험 최소화).

로그 줄(153~155번 줄)도 `texSection.imageIndex` 대신 `pairImageIndex`를 쓰도록 그대로
변수명만 맞춰주세요:

```ts
  console.log(
    `[circle-pair] ${insertBefore} 직전 삽입 — "${labels[0]}" / "${labels[1]}" (img ${ingSection.imageIndex}, ${pairImageIndex})`,
  );
```

## 다른 파일은 손대지 않습니다

- `components/DetailSectionRenderer.tsx`, `lib/export-detail-html.ts` — `circlePair` 렌더링
  로직 자체는 이미 라벨+이미지 URL만 받아 원형으로 크롭할 뿐이라(코드 확인 완료) 수정
  불필요.
- `lib/section-templates.ts` — `texture_feel`의 `required: false` 자체는 바꾸지 않습니다
  (슬롯 정책 변경은 이번 스코프 밖 — 폴백만 보강하는 것).
- `lib/ingredient-labels.ts`, `lib/apply-cosmetics-annotations.ts` 등 — 무관, 미수정.

## 스모크 테스트

`scripts/`에 유사 픽스처가 있으면(`139cha-session-*.json` 계열 등) 참고해서
`scripts/207cha-circle-pair-texture-fallback-smoke.ts` 신규 작성:

1. **회귀 없음 확인**: `texture_feel` 슬롯이 있는 기존 케이스 — `pairImageIndex`가 여전히
   `texSection.imageIndex`와 동일한지(기존 동작 100% 유지) 확인.
2. **핵심 수정 확인**: 성분 라벨 2개(`ingredients`에 콤마 등으로 2개 이상) + `sections`에
   `texture_feel` 슬롯이 **없는** 픽스처 — 이전엔 `applied: false`였던 것이 이번엔
   `applied: true`이고 `circlePair`에 2개 이미지가 채워지는지 확인(핵심 회귀 테스트).
3. **가드 유지 확인**: `imageUrls`가 1장뿐인 픽스처(대체할 이미지 자체가 없음) — 여전히
   `applied: false`로 안전하게 스킵되는지(같은 이미지를 두 번 보여주지 않는지) 확인.
4. `hasCircleVisual()`이 이미 circle 섹션이 있으면 여전히 스킵하는지(기존 동작 불변)
   확인.
5. `npx tsc --noEmit` — 0.

## 검증

1. `npx tsc --noEmit` — 0.
2. 신규 스모크 스크립트 결과 — 위 4개 케이스 전부 명시.
3. `pickAlternateIndex`가 신규 함수가 아니라 기존 34~56번 줄 함수 그대로 재사용됐는지
   코드로 확인(새 함수 추가하지 않았는지).
4. `circlePair`/`circleSolo` 렌더링 컴포넌트(`DetailSectionRenderer.tsx`,
   `export-detail-html.ts`) 미수정 확인(diff에 이 두 파일이 없어야 함).
5. 기존 `texture_feel` 있는 케이스의 렌더링 결과물(스크린샷 또는 코드 추적)이 이번
   수정 전후로 동일한지(회귀 없음) 확인.

## 하지 않는 것

- `lib/section-templates.ts`의 슬롯 required 정책 변경 없음.
- `circle-solo` 경로(93~119번 줄) 수정 없음 — 이미 올바르게 동작 중.
- 신규 이미지 생성/합성/AI 판단 로직 추가 없음 — 기존 상품 사진 중에서 고르는 결정론적
  로직만 보강.
- 생성 API 호출 전부 금지(0회).

## 완료 보고 형식

3~5줄 요약 + 스모크 테스트 결과(회귀 없음 + 핵심 수정 확인 + 이미지 1장뿐 가드 확인
포함) + `tsc` 결과 + 렌더링 컴포넌트 미수정 확인 + 기존 texture_feel 케이스 회귀 없음
확인.

## 백로그 마스터

완료되면 §1에 한 줄 추가하고 §5(재작업 금지)에도 반영해주세요 — 제가 확인 후 마스터
문서를 갱신하겠습니다(187차 사용법 규칙에 따라 Claude가 갱신). 148차부터 59라운드째
"다음 라운드 후보"로만 남아있던 실제 버그를 이번에 해소했다는 점, 그리고 이 라운드는
사용자의 "후커블과 똑같은 퀄리티까지 업그레이드" 지시에 따른 것이라는 점을 마스터
요약에도 기록하겠습니다.
