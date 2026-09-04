# 104차 — 시각적 중복 제거 + 섹션 카피와 이미지 매칭

생성: 2026-09-03
전제: 102·103차와 같은 생성 건(상품 `a4e33e41-2348-40b6-b6b8-2536ce17ac3e`, glowiest 35mL 미스트)에 대한 사용자 지적 나머지 두 가지 — **"사진 중복이 너무 많다"**, **"글과 사진이 매치되지 않는다"**.

URL 기준 지표는 개선됐습니다(고유 20개 / 최다 반복 4회, 직전 4개 / 30회). 그런데도 체감 중복이 큰 이유와, 카피-이미지 불일치의 원인을 코드에서 확인했습니다.

---

## 문제 1 — "고유 20개"인데 눈에는 같아 보이는 이유

중복 판정 기준이 **인덱스 사용 빈도**뿐입니다. `lib/assign-section-images.ts:226-228`의 `freq[]` / `maxUses` / `softCap`, `266`의 `lastPicked` 인접 회피가 전부이고, 퍼셉추얼 해시나 임베딩 비교는 없습니다. 그래서 "URL은 다른데 그림은 같은" 케이스를 전혀 못 거릅니다. 결정적 원인 두 가지:

### (a) before/after 쌍이 같은 사진 2장입니다
`lib/photo-composite.ts:466-503` `makeComparisonPair`는 **hero 한 장**에 채도·밝기·광택만 다르게 적용해 before/after를 만듭니다. **구도가 100% 동일**합니다. 이걸 `imageUrls`에 push하고(`app/api/generate/route.ts:1428-1430`) gallery에 강제 배정합니다(1433-1437). 고유 URL 카운트만 2 늘고 시각적으로는 같은 사진입니다.

### (b) ingredient circle이 같은 인덱스를 재사용합니다
`applyIngredientCircleVisual`(`route.ts:973`, `lib/apply-ingredient-circle-pair.ts:47-60`)이 `ingredient_highlight`와 **같은 `imageIndex`** 로 circle 섹션을 추가 삽입합니다. 그런데 이 호출이 `assignDistinctSectionImages` **이후**라서 dedup 로직이 이 중복을 아예 보지 못합니다.

### (c) 구조적 요인
`computeStudioCompositeLimit(9) = 4`(`lib/lifestyle-shot-planner.ts:12-16`)이라 9장 중 앞 4장만 배경 합성되고 index 4~8은 원본 그대로 통과합니다(`photo-pipeline-client.ts:338-341`). 합성된 4장은 hero/ingredient/texture 3종 배경을 쓰지만 셋 다 같은 conceptBrief·theme·lightingLock으로 만든 같은 파스텔 톤이고(`photo-enhance.ts:1387-1417`) 올라가는 피사체도 같은 병 누끼라 결과가 서로 매우 비슷합니다. 크롭/줌 변형 코드는 없습니다(`compact-image-shape.ts`는 모서리 모양만, `detail-visual-rhythm.ts:31-38`은 좌우 배치만).

### 작업 A — 중복 제거

1. **`makeComparisonPair`의 gallery 강제 배정을 해제**하세요(`route.ts:1403-1437`). 같은 구도 2장을 "서로 다른 사진"으로 카운트하는 게 지표와 체감의 괴리를 만드는 주범입니다. before/after가 의미 있으려면 **실제로 다른 상태**(사용 전/후 피부, 흔들기 전/후 층 분리 등)여야 하는데 색보정만으로는 그게 안 됩니다. 이 상품처럼 "흔들면 두 층이 섞이는" 제품이라면 오히려 **원본 사진 중 층 분리 컷과 섞인 컷**을 쓰는 게 맞습니다. 우선은 강제 배정만 끄고, 대체 소스가 없으면 gallery를 다른 컷으로 채우세요. 난이도 하.
2. **`applyIngredientCircleVisual`을 `assignDistinctSectionImages` 앞으로 이동**하거나, 삽입되는 circle 섹션에 다른 인덱스를 배정하세요(`route.ts:973`). 난이도 하.
3. **시각 유사도 기반 dedup 도입**: 업로드 시 각 이미지의 aHash/dHash를 계산해 저장하고, `assign-section-images.ts:261-293`의 `pick()` 스코어에 "직전 배정 컷과의 해밍 거리" 페널티를 더하세요. sharp로 8×8 그레이스케일 축소 후 평균 대비 비트를 뽑으면 충분합니다. 이게 "URL은 다른데 눈에는 같은" 문제의 정공법입니다. 난이도 중, 리스크 하(순수 스코어 가산이라 기존 동작을 깨지 않음).
4. (선택) **크롭 파생본 생성**: sharp로 같은 원본에서 상단/중앙/하단 크롭을 만들어 quick_points 같은 소형 슬롯에 공급. 난이도 중. 저해상도 원본에서는 화질이 떨어지므로 원본 해상도 기준(예: 1500px 이상)을 두세요.

---

## 문제 2 — 카피와 이미지가 안 맞는 이유

**섹션 카피를 보고 이미지를 고르는 로직이 존재하지 않습니다.** `preferForSlot`(`assign-section-images.ts:67-186`)의 시그니처에 heading/body가 아예 없고, `assignDistinctSectionImages`도 `section.slot` / `section.type`만 읽습니다(296-341). "카멜리아 오일"이라는 단어가 이미지 선택에 영향을 주는 경로는 0입니다.

그리고 슬롯별 prefer 규칙이 **자주 무시됩니다**. `pick()`이 prefer를 채택하려면 `freq[p] < softCap && p !== lastPicked && !blockedByImageText`를 전부 통과해야 하는데(241-258), image_text 슬롯은 모두 `uniqueAmongImageText: true`로 호출되므로(359행) **`ingredient_highlight` / `texture_feel` / `detail_zoom` / `macro_detail` / `ingredient_story`가 전부 같은 "detail" 인덱스를 prefer**하는 상황에서 첫 슬롯만 가져가고 나머지는 least-used 임의 배정으로 떨어집니다.

`packaging_design`은 `rolePrefer("package", 3)`(154-156)인데, 인덱스 3이 앞 슬롯에 먼저 소비되면 임의 컷이 옵니다 — **사용자가 본 "패키지 섹션에 병 사진"의 직접 원인**입니다. `feature_callout` / `how_it_works` / `size_options`는 preferForSlot에 규칙 자체가 없어 항상 순수 임의 배정입니다.

### 102차와의 관계

102차(Vision 역할 판정 미반영)를 고치면 **`packaging_design`은 해결됩니다** — 박스 동봉 컷이 실제로 2장 있으므로 package 역할만 제대로 붙으면 매칭됩니다. 그러나 **`ingredient_highlight` / `texture_feel`은 역할 판정이 완벽해져도 해결되지 않습니다.** 업로드 9장이 전부 "같은 병의 스튜디오 컷"이고 성분 매크로도 질감 스와치도 없기 때문입니다. BEAUTY 템플릿의 이미지 슬롯은 20개가 넘는데(`lib/section-templates.ts:30-166`) 실제 공급은 피사체 기준 2종(병, 박스)뿐입니다.

### 작업 B — prefer 경쟁 해소

`assign-section-images.ts:67-186`을 "슬롯별 단일 prefer"에서 **우선순위 큐**로 바꾸세요. detail 후보 리스트를 슬롯 우선순위대로 분배하고, 후보가 고갈되면 **임의 배정 대신 그 슬롯을 텍스트 전용 레이아웃으로 렌더**하는 편이 낫습니다. 안 맞는 병 사진을 넣는 것보다 카피만 있는 편이 결과물이 낫습니다. `feature_callout` / `how_it_works` / `size_options`에도 prefer 규칙을 추가하세요. 난이도 중, 리스크 하.

### 작업 C — 공급 부족을 생성 전에 알리기 (가장 실효성 높음)

`lib/image-roles.ts:42-54`에 이미 "병만 반복되면 성분이 안 살아납니다"라는 안내가 있지만 강제력이 없습니다. 다음을 추가하세요.

- 업로드된 사진 세트를 Vision으로 훑어(102차에서 고칠 역할 판정 결과를 재사용) **부족한 역할을 생성 전에 경고**: "성분·질감 매크로 컷이 없습니다. 성분/질감 섹션은 제품 사진으로 채워집니다."
- 그래도 진행하면 `ingredient_highlight` / `texture_feel` 슬롯을 **텍스트 + 일러스트 레이아웃으로 자동 대체**하세요. 이미 `illustration_banner` 계열 렌더가 있으므로 재사용할 수 있습니다.

난이도 중. 이게 "글과 사진이 안 맞는다"를 실제로 없애는 가장 확실한 방법입니다 — 없는 사진을 잘 고를 수는 없습니다.

### 하지 않는 것

**카피 임베딩 기반 이미지 선택**(섹션 body와 이미지 캡션의 유사도로 배정)은 이번 범위 밖입니다. LLM이 인덱스를 임의로 찍으면 오히려 악화되므로 서버측 검증 설계가 선행돼야 합니다. 작업 B·C를 먼저 적용하고 남는 불일치를 보고 판단하세요.

---

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 같은 9장으로 재생성 후, 결과 페이지 콘솔에서 고유 이미지 수 재측정(99차 스니펫). before/after 강제 배정 해제 후 **고유 수가 줄더라도** 체감 중복이 개선되는지가 기준입니다 — 숫자보다 육안이 우선입니다.
- 박스 동봉 컷이 `packaging_design` 섹션에 실제로 들어갔는지 확인(102차 수정 이후).
- 성분/질감 슬롯이 텍스트 전용 또는 일러스트로 대체됐는지 확인.
- 인접한 두 섹션에 시각적으로 거의 같은 컷이 연속으로 오지 않는지 육안 확인.

## 완료 보고 체크리스트

- [ ] `makeComparisonPair` gallery 강제 배정 해제
- [ ] `applyIngredientCircleVisual` 순서 이동 또는 인덱스 분리
- [ ] aHash/dHash 기반 시각 유사도 페널티 도입
- [ ] `preferForSlot` 우선순위 큐로 전환 + 미배정 슬롯 텍스트 전용 폴백
- [ ] `feature_callout` / `how_it_works` / `size_options` prefer 규칙 추가
- [ ] 부족 역할 생성 전 경고 + 성분/질감 슬롯 자동 대체
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 재생성 후 육안 확인 결과 기록
