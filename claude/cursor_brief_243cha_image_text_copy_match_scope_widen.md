# 243차 — "사진 배치가 글과 안 맞는다": image_text 카피 매칭이 11개 슬롯에만 배선되고 나머지는 완전 무관 배정인 버그 수정

생성: 2026-09-23 · 유료 API **불필요** · 파일 1개 수정

## 배경 — 사용자 지시

"사진 배치도 글에 맞게 들어가야해." 코드 조사 결과, 이 증상의 구체적 원인을 특정함:
`lib/assign-section-images.ts`에 114차가 만든 카피 매칭 타이브레이커
(`scoreImageForCopy`/`sectionCopyText`, `lib/copy-image-match.ts`)가 실제로 존재하지만,
`image_text` 섹션 슬롯 **11개**(`DETAIL_SLOT_PRIORITY`: ingredient_highlight, texture_feel,
detail_zoom, macro_detail, ingredient_story, fabric_composition, material_detail,
design_detail, feature_callout, how_it_works, size_options)에만 배선돼 있고, 그 외
`image_text` 슬롯(quick_points, coordination, seasonal_styling, fit_guide, usage_scenario,
usage_scenario_extra, customer_scenario, serving_suggestion, model_multicut,
install_scenario, usage_scene, lifestyle_shot, packaging_design 등)은 `preferForSlot()`이
"그 역할(role) 태그를 가진 첫 번째/고정 오프셋 사진"을 **글 내용과 무관하게 기계적으로**
고른다. 즉 사용자 체감상 "사진 배치가 글에 안 맞는" 사례 대부분은 이 후자 그룹(실무에서
더 자주 쓰이는 슬롯들)에서 나올 수밖에 없는 구조 — 원인 특정 완료.

## 1. 근거 (코드로 확인 완료)

- `lib/copy-image-match.ts` — `scoreImageForCopy({sectionText, candidateTags, candidateReason})`.
  섹션 카피(heading/body/headline/subheadline, `sectionCopyText()`)와 이미지의 Vision
  태그/이유 텍스트를 겹침 점수로 비교하는 순수 함수. 자체 주석: "role 게이팅을 넘지 않음 —
  assign 쪽 후보 집합 안에서만 타이브레이커로 사용."
- `lib/assign-section-images.ts:270`(`allocatePreferQueue`) — `DETAIL_SLOT_PRIORITY`(74행,
  11개 슬롯) 소속 `image_text` 섹션만 `detailCandidates`로 모아, `detailPool`(role="detail"
  이미지 풀) 안에서 `remaining.length > 1`일 때만(355행 주석: "114차 — role 후보 안에서
  카피 매칭 타이브레이커") `scoreImageForCopy`로 점수를 매겨 가장 잘 맞는 사진을 고른다.
  이게 카피 매칭이 실제로 작동하는 유일한 경로.
- `lib/assign-section-images.ts:137`(`preferForSlot`) — 위 11개 슬롯을 **제외한** 모든
  `image_text` 슬롯이 여기로 빠진다. 내부 헬퍼 `rolePrefer(role, fallback)`은
  `firstIndexWithRole(roles, role)`(role 배열에서 **가장 앞선** 인덱스 하나)만 반환,
  `preferLifestyleComposite()`/`preferLifestyleAi()`도 `lifestyleCompositeIndexes[0]`/
  `lifestyleAiIndexes[고정 오프셋]`처럼 **고정 인덱스**만 반환 — 후보가 여러 장이어도 그
  중 어느 것이 해당 섹션의 heading/body와 제일 잘 맞는지 전혀 비교하지 않음. 예:
  `usage_scenario`/`coordination`/`model_multicut`/`serving_suggestion` 등은 항상
  `preferLifestyleComposite() ?? preferLifestyleAi() ?? rolePrefer("lifestyle", ...)` 체인의
  **첫 후보**로 고정.
- `lib/assign-section-images.ts:661`(`assignDistinctSectionImages` 본문, `sections.forEach`) —
  `queued`(`allocatePreferQueue` 결과, 11개 슬롯 전용)가 없을 때만 `preferForSlot(...)` 호출.
  이 호출부는 `section`(heading/body 포함) 전체가 이미 클로저 스코프에 있고,
  `options?.imageTags`/`options?.imageReasons`(114차가 이미 계산해 넘기는 Vision 태그)도
  같은 함수 스코프에서 바로 접근 가능 — **새 데이터 수집 없이 기존 값만 추가로 넘기면 됨**.

## 2. 수정 — 재사용 우선(240/242차와 동일 원칙): 새 스코어링 로직 재설계 대신 `scoreImageForCopy` 재사용 범위만 확장

`lib/assign-section-images.ts`, `preferForSlot()` 시그니처에 3개 파라미터 추가:

```ts
function preferForSlot(
  slot: string,
  category: string | undefined,
  roles: ProductImageRole[],
  imageCount: number,
  lifestyleAiIndexes: number[],
  lifestyleCompositeIndexes: number[],
  sectionText: string,                       // 신규 — sectionCopyText(section)
  imageTags: string[][],                      // 신규 — options?.imageTags ?? []
  imageReasons: Array<string | undefined>,    // 신규 — options?.imageReasons ?? []
): number | undefined {
```

호출부(`sections.forEach` 안, 현재 661~671행)를 다음으로 교체:

```ts
      let prefer =
        typeof queued === "number"
          ? queued
          : preferForSlot(
              section.slot,
              category,
              roles,
              imageCount,
              lifestyleAiIndexes,
              lifestyleCompositeIndexes,
              sectionCopyText(section),
              options?.imageTags ?? [],
              options?.imageReasons ?? [],
            );
```

(`sectionCopyText`는 이미 `@/lib/copy-image-match`에서 import돼 있음 — `allocatePreferQueue`가
같은 파일 안에서 이미 쓰는 것과 동일 import 재사용.)

`preferForSlot()` 내부에 후보 풀 안에서 카피 점수로 고르는 공용 헬퍼 하나 추가하고,
기존 `rolePrefer`/`preferLifestyleComposite`/`preferLifestyleAi`가 이걸 거치도록 수정
(로직 대체가 아니라 "후보가 2장 이상일 때만 개입하는 래퍼" — 후보 0~1장이면 완전히 기존과
동일한 결과):

```ts
  const bestByCopy = (candidates: number[], fallback: number | undefined): number | undefined => {
    if (candidates.length === 0) return fallback;
    if (candidates.length === 1) return candidates[0];
    if (!sectionText.trim()) return candidates[0]; // 카피 없으면 기존 first-index 동작 유지
    let best = candidates[0];
    let bestScore = -1;
    for (const i of candidates) {
      const s = scoreImageForCopy({
        sectionText,
        candidateTags: imageTags[i] ?? [],
        candidateReason: imageReasons[i],
      });
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    // 전부 0점(무관)이면 임의 승자 대신 기존 first-index 동작으로 폴백 — 114차와 동일 규칙
    return bestScore > 0 ? best : candidates[0];
  };

  const rolePrefer = (role: ProductImageRole, fallback?: number) => {
    const candidates = indexesWithRole(roles, role);
    if (candidates.length > 0) return bestByCopy(candidates, candidates[0]);
    return fallback !== undefined && fallback < imageCount ? fallback : undefined;
  };

  const preferLifestyleComposite = () => {
    if (lifestyleCompositeIndexes.length === 0) return undefined;
    const picked = bestByCopy(
      lifestyleCompositeIndexes.filter((i) => i < imageCount),
      lifestyleCompositeIndexes[0],
    );
    return picked ?? lifestyleCompositeIndexes[0];
  };

  const preferLifestyleAi = () => {
    if (lifestyleAiIndexes.length === 0) return undefined;
    const picked = bestByCopy(
      lifestyleAiIndexes.filter((i) => i < imageCount),
      lifestyleAiIndexes[0],
    );
    return picked ?? lifestyleAiIndexes[0];
  };
```

**주의 — 기존 시그니처 보존 원칙**: `rolePrefer`의 두 번째 인자(`fallback`)는 "그 role 태그가
아예 0장일 때" 대체 인덱스라 의미가 다름 — `bestByCopy`의 `fallback` 인자와 헷갈리지 않게
`rolePrefer` 자체는 위처럼 "role 후보가 있으면 `bestByCopy`, 없으면 기존 `fallback`" 2단
분기 그대로 유지. `texture_feel`(174행대, `details.length > 1 ? details[1] : ...`)처럼
이미 인덱스를 직접 다루는 특수 분기는 이번 수정 대상에서 **제외** — role 후보가 이미
"1번째가 아니라 2번째를 의도적으로" 쓰는 케이스라 카피 매칭을 끼얹으면 기존 의도(예:
ingredient_highlight와 texture_feel이 서로 다른 detail 사진을 쓰게 하려는 분산 목적)를
해칠 수 있음 — `rolePrefer`/`preferLifestyleComposite`/`preferLifestyleAi`를 **그대로
호출**하는 슬롯 분기만 자동으로 개선 범위에 들어옴(대부분의 슬롯이 여기 해당).

## 3. 왜 안전한가 (114차와 동일 안전장치 그대로 상속)

- **role 게이팅을 넘지 않음**: `bestByCopy`는 이미 `indexesWithRole`/`lifestyleCompositeIndexes`/
  `lifestyleAiIndexes`로 걸러진 후보 집합 **안에서만** 승자를 고름 — 어떤 역할 태그도 없는
  사진을 새로 끌어오지 않음.
- **후보 1장 이하면 100% 기존 동작과 동일**: 대부분의 실제 생성(사진 4~8장, role별 1~2장)
  케이스에서 후보가 1장뿐인 슬롯은 이번 수정으로 전혀 영향받지 않음 — 회귀 위험 최소.
  카피 점수가 실제로 승자를 바꾸는 경우는 "같은 role 사진이 2장 이상 있고, 그중 하나가
  섹션 문구와 더 겹치는" 케이스로 한정.
  뒤이은 `pick()`(빈도·연속 회피·halfCap) 엔진은 이번 수정과 무관 — `prefer` 힌트 하나만
  달라질 뿐 최종 배정 로직 자체는 변경 없음.
- **전부 0점이면 기존 first-index로 폴백**: 114차가 이미 검증한 "억지 승자 만들지 않기"
  규칙 그대로 재사용 — 태그가 비어 있거나 우연의 일치가 없으면 지금과 똑같이 동작.
- 유료 API 신규 호출 없음 — `imageTags`/`imageReasons`는 이미 파이프라인 앞단(Vision 판정)에서
  계산돼 `options`로 넘어오는 기존 데이터, 114차가 이미 같은 파일 안에서 쓰고 있는 것과
  동일 소스.

## 4. 검증 스크립트 스펙 — `scripts/243cha-image-text-copy-match-verify.ts`

유료 API 불필요. `npx tsx scripts/243cha-image-text-copy-match-verify.ts`로 실행:

1. **유닛 — `bestByCopy` 동작**: (a) 후보 0장 → fallback 그대로, (b) 후보 1장 → 그 값 그대로,
   (c) 카피 텍스트 없음 → 첫 후보 그대로(기존 동작 불변 확인), (d) 후보 2장, 태그가
   섹션 카피와 겹치는 쪽이 이김(예: 섹션 heading "면 소재 디테일" vs 후보A tags=["가죽",
   "지퍼"], 후보B tags=["면", "직조", "텍스처"] → B가 이겨야 함), (e) 둘 다 0점 → 첫
   후보(기존 first-index) 그대로 폴백.
2. **`assignDistinctSectionImages()` 실제 호출 — 회귀**: `DETAIL_SLOT_PRIORITY` 11개 슬롯
   섹션이 포함된 기존 241/242차 등 과거 라운드 픽스처(또는 유사 구성)를 그대로 돌려서
   기존 `allocatePreferQueue` 경로(카피 매칭 이미 작동 중이던 슬롯들)가 이번 수정으로
   결과가 달라지지 않는지 확인 — `preferForSlot`은 `queued`가 있으면 아예 호출 안 되므로
   원래 영향 밖이지만, 그래도 스냅샷 대조로 명시 확인.
3. **`assignDistinctSectionImages()` 실제 호출 — 신규 동작**: `usage_scenario`/`coordination`/
   `quick_points` 등 `DETAIL_SLOT_PRIORITY` 밖 슬롯을 가진 섹션 2개 + role="lifestyle" 사진
   2장(태그가 각각 다르게 섹션 카피와 겹치도록 구성) 픽스처로 실제 호출, 두 섹션이 이제
   태그 겹침이 더 큰 쪽 사진을 각각 골랐는지 확인(단순 first-index면 두 섹션이 같은
   고정 사진을 고르는 게 fallback 배정 전이라 구분이 잘 됨).
4. **후보 1장뿐인 슬롯 무변경 확인**: role별 사진이 1장씩만 있는 소량 사진(4장 이하) 픽스처를
   기존 회귀 스냅샷(예: 238차 픽스처)과 diff 0 확인.
5. `npx tsc --noEmit`(또는 esbuild)로 타입 에러 없는지 확인.

## 5. 회귀 확인 항목

- `texture_feel`처럼 인덱스를 직접 다루는 특수 분기는 이번 수정 대상 아님 — 무변경 재확인.
- `DETAIL_SLOT_PRIORITY` 11개 슬롯(`allocatePreferQueue` 경로)은 `queued`가 항상 우선이라
  `preferForSlot`이 호출조차 안 됨 — 기존 카피 매칭 동작 완전 무변경.
- 사진 1~2장 소량 입력 케이스(role 후보 대부분 1장 이하) 무변경 재확인.
- `pick()` 엔진(빈도 캡·연속 회피·유사도 페널티) 자체는 이번 수정과 무관 — `prefer` 힌트
  산출 방식만 개선.

유료 API 0건(조사·수정·검증 스크립트 전부).
