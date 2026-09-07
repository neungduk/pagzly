# 121차 — 카테고리별 QA 픽스처 도입 ("정보" 구조적 저평가 해소)

생성: 2026-09-07
전제: API 호출 없음. 기존에 이미 생성되어 있는 이미지 재사용(신규 이미지 생성 비용 0원). `/dev/detail-preview` QA 프리셋에만 영향 — 실제 상품 생성 파이프라인은 건드리지 않음.

---

## 0. 왜 필요한가 (118·119·120차에서 3번 연속 지적됨)

`app/dev/detail-preview/page.tsx`를 직접 열어봤습니다. 원인이 명확합니다:

1. **이미지**: `initialImageUrls`(`/iteration-fixtures/01~04.jpg` — 화장품 세스데르마 병 사진)가 프리셋과 무관하게 **모든 카테고리에 항상 고정**으로 쓰입니다(`useState(initialImageUrls)`, 프리셋은 `sections`만 바꿉니다). 그래서 식품/전자/패션도 카피는 맞는데 사진만 화장품 병입니다.
2. **카피**: `CAPTURE58_PRESETS`에서 `"58-living"`, `"58-pet"`은 아예 전용 섹션이 없고 **`sections: initialSections`를 그대로 재사용** — 즉 PLAIN HOME·PAW FRIEND인데 헤드라인이 "속건조, 오늘부터 덜 신경 쓰세요"(화장품 카피)입니다. `58-fashion`/`57-food`/`57-electronics`는 이미 전용 섹션(`capture56Sections`/`capture57FoodSections`/`capture57ElectronicsSections`)이 있어 카피는 맞습니다.

118차 진단, 119차·120차 재채점 모두 이걸 "정보" 항목이 4.0~3.5에 묶이는 원인으로 지목했고, 세 번 다 "이번엔 안 고침, QA 도구 한계로만 기록"하고 넘어갔습니다. 이제 실제 코드 결함(워드마크·식품 다이어그램·생활 패턴)을 다 고쳐서 나머지 4항목은 전 카테고리 4.5+에 근접했는데, **이 픽스처 문제 하나가 quality-log의 "4.5+ 3회 연속" 달성을 계속 막고 있습니다.** 고칠 시점이 됐다고 판단했습니다.

---

## 1. 할 것

### (a) 카테고리별 이미지 4장씩 확보 — 새로 만들지 말고 기존 자산 재사용

`review/` 폴더에 이미 카테고리별로 생성해둔 이미지가 있습니다(61차 전후 BRIA 배경 합성 작업 산출물):

- `review/bria-food-hero.png`, `bria-food-ingredient.png`, `bria-food-texture.png`
- `review/bria-electronics-hero.png`, `bria-electronics-ingredient.png`, `bria-electronics-texture.png`
- `review/bria-fashion-hero.png`, `bria-fashion-ingredient.png`, `bria-fashion-texture.png`
- `review/bria-home-hero.png`, `bria-home-ingredient.png`, `bria-home-texture.png` (생활용품)
- `review/bria-v2-pet-hero.png`, `bria-v2-pet-ingredient.png`, `bria-v2-pet-texture.png` (반려동물 — v2가 가장 최근/정상 버전인지 `bria-v4-pet-*`와 비교해서 더 나은 쪽 채택)
- 화장품은 기존 `public/iteration-fixtures/*`를 그대로 씁니다.

각 카테고리당 3장뿐이니 4번째는 같은 세트 안에서 하나를 재사용해도 됩니다(예: hero를 gallery 4번째 슬롯에도). **새로 이미지를 만들거나 API를 호출하지 마세요** — 이미 있는 파일을 `public/qa-fixtures/<category>/0{1..4}.jpg`(또는 `.png`, 확장자는 원본 그대로)로 복사만 하면 됩니다.

### (b) `58-living`, `58-pet` 전용 섹션 추가

`capture56Sections`(패션)·`capture57FoodSections`(식품) 패턴을 그대로 따라, PLAIN HOME(생활용품)·PAW FRIEND(반려동물) 각각에 맞는 전용 `DetailSection[]`을 만드세요. 실제 헤드라인·바디 카피를 그 브랜드/제품에 맞게 새로 쓰세요(예: 생활용품 → "세라믹 식기 세트"에 맞는 헤드라인, 반려동물 → "저알러지 사료"에 맞는 헤드라인). 118~120차 `productName` 필드(`CAPTURE58_PRESETS`에 이미 있음)를 그대로 활용하면 됩니다. 섹션 개수·구성은 기존 `capture57FoodSections` 정도 분량(과도하게 길지 않게 — 118차가 지적한 "화장품용 긴 스택 재사용으로 인한 스크롤 과밀"도 이 참에 자연히 해소됩니다)으로 맞추세요.

### (c) 프리셋이 카테고리별 이미지를 쓰도록 배선

`CapturePreset` 타입에 `imageUrls?: string[]` 같은 필드를 추가하고, `CAPTURE58_PRESETS`의 6개 항목 각각에 (a)에서 만든 카테고리별 경로를 채우세요. `DetailPreviewPage`의 `useState(initialImageUrls)` 초기값을 `capturePreset?.imageUrls ?? initialImageUrls`로 바꾸면 됩니다. 캡처 모드가 아닌 일반 `/dev/detail-preview` 사용(수동 QA)은 지금처럼 화장품 이미지 그대로 유지하세요 — 이번 변경은 `capture=58-*` 프리셋 한정입니다.

---

## 2. 하지 않는 것

- 실제 상품 생성 파이프라인(`lib/copy-orchestrator/*`, `assign-section-images.ts` 등)은 **전혀 건드리지 마세요** — 이건 순수 QA 프리뷰용 픽스처 배선입니다.
- 새 이미지 생성(Replicate/BRIA/Claude Vision) 금지 — 기존 파일 복사만.
- `58-fashion`/`57-food`/`57-electronics` 카피는 이미 맞으니 굳이 다시 쓰지 마세요 — 이미지 배선만 추가하면 됩니다.
- 118차 §4-5(세리프×고딕 톤)는 계속 보류.

---

## 3. 검증 방법 (무비용)

1. `capture-58cha-preview.ts`로 6개 카테고리 재캡처 → `review/121cha-<카테고리>.png`.
2. **같은 `quality-log.md` 5항목 기준으로 재채점** — 특히 "정보" 항목이 실제로 오르는지 확인. 오르지 않으면 왜 안 올랐는지 설명하세요(억지로 점수 올리지 마세요).
3. `review/121cha-report.md`에 118→120→121 3라운드 비교표(사이클 요약 표, 지금까지와 같은 형식)를 남기세요. 이번에 **4.5+ 몇 개 카테고리인지**, quality-log 기준 "3회 연속" 중 몇 회차가 채워졌는지 명시하세요.
4. `npx tsc --noEmit` 0건, 기존 스모크 회귀 없음.
5. 캡처 중 `/api/generate`, `/api/enhance` 0건 확인(원래도 이 프리뷰는 호출 안 함).

## 4. 완료 보고 체크리스트

- [ ] 카테고리별 이미지 4장씩 `public/qa-fixtures/<category>/`에 배치 (기존 파일 재사용, 신규 생성 없음)
- [ ] `58-living`, `58-pet` 전용 섹션(카피) 추가
- [ ] `CapturePreset.imageUrls` 배선 — capture 모드에서만 카테고리별 이미지 적용, 일반 프리뷰는 기존 유지
- [ ] 6개 카테고리 재캡처 + 재채점, 118→120→121 비교표
- [ ] "정보" 항목 실제 개선 여부 (안 됐으면 이유 설명)
- [ ] `npx tsc --noEmit` 0건 + 회귀 없음 + API 호출 0건
