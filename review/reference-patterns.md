# 상세페이지 시각 컨셉 레퍼런스 패턴

Claude Code / QA 루프가 상세페이지 품질을 판단할 때 참고하는 **시각 컨셉 패턴
가이드**입니다. `CHECKLIST.md`가 pass/fail 기준이라면, 이 문서는 "전문
상세페이지처럼 보이려면 어떤 시각 언어를 써야 하는가"에 대한 방향성 레퍼런스입니다.

생성 일: 2026-08-14  
업데이트: 2026-08-26 — 29차 전 카테고리 §10 확장 + 횡단 CRO 리서치  
파이프라인 버전: concept-brief v1 (컨셉 브리프 → 배경/장식/아이콘/카피 공통 주입)  
디자인 시스템 소스: `lib/design-tokens.ts` (`review/DESIGN_SYSTEM.md`는 저장소에 없음)

---

## 1. 핵심 원칙 — "하나의 세계관"

전문 상세페이지는 제품 사진을 배경에 올려놓는 수준이 아니라, **하나의 시각
컨셉**이 페이지 전체에 일관되게 적용됩니다.

| 레이어 | 역할 | 구현 위치 |
|--------|------|-----------|
| 컨셉 브리프 | theme / motif / mood 정의 | `lib/concept-brief.ts` |
| 배경 | 컨셉 + 상품 색상 반영 스튜디오 | `generateBackdrop()` — flux-fill-dev |
| 장식 그래픽 | 모티프 요소 (물방울, 잎, 빛번짐 등) | `generateDecorativeGraphic()` — flux-schnell, **히어로 필수** |
| 아이콘 | checklist / usage_steps 원형 배지 | `generateConceptIcons()` — flux-schnell |
| 카피 | 컨셉 톤과 같은 세계관 | DeepSeek + `formatConceptCopyBlock()` |
| 색상 | accentColor / baseNeutral / deepAccent 3색 | `lib/design-tokens.ts` + `lib/color-extract.ts` |

**FAIL 패턴 (피해야 할 것):**
- 섹션마다 배경 톤·장식·아이콘 스타일이 제각각
- 카테고리 고정색만 쓰고 상품 고유 색감 무시
- Lucide 범용 아이콘만 반복 (컨셉 아이콘 생성 실패 시 폴백은 허용)
- 장식이 상품 위를 가리거나 시선을 분산

---

## 2. 카테고리별 컨셉 패턴 예시

DeepSeek `generateConceptBrief()`가 상품 정보를 보고 아래와 유사한 컨셉을
생성합니다. 고정값이 아니라 **참고 레퍼런스**입니다.

### 화장품/뷰티

| 항목 | 예시 |
|------|------|
| theme | 수분/물방울, 클린 더마, 내추럴 원료 |
| motif_keywords | 물방울, 청량감, 촉촉함, 은은한 빛 |
| mood | 시원하고 맑은 / 부드럽고 고급스러운 |
| 배경 | 파스텔 마블, dewy studio, soft window light |
| 장식 | floating water droplets, gentle bokeh, moisture mist |
| 아이콘 | minimal water droplet badge, soft circular frame |
| 카피 톤 | 촉촉·산뜻, 피부 결 공감, 과장 없는 수분 케어 |

**레퍼런스 스크린샷:**
- Before (컨셉 전): `review/concept-before-화장품-1.png`
- After (컨셉 후): `review/concept-after-화장품-1.png`
- 테스트 상품: 히알루론 수분 크림 / ₩32,900

### 의류/패션

| 항목 | 예시 |
|------|------|
| theme | 에디토리얼 / 내추럴 라이프 |
| motif_keywords | 린넨 질감, 자연광, 미니멀 실루엣 |
| mood | 편안하고 세련된 |
| 배경 | neutral fabric texture, warm editorial light |
| 장식 | soft fabric folds, subtle light rays |
| 아이콘 | flat textile / fit badge icon |

### 식품/건강기능식품

| 항목 | 예시 |
|------|------|
| theme | 신선 원재료 / 홈메이드 |
| motif_keywords | 곡물, 허브, 따뜻한 빛 |
| mood | 정직하고 건강한 |
| 배경 | rustic wooden table, fresh ingredients blur |
| 장식 | scattered grains, herb leaves, warm steam |
| 아이콘 | simple ingredient circle badge |

### 전자제품

| 항목 | 예시 |
|------|------|
| theme | 테크 미니멀 |
| motif_keywords | 기하학, 쿨 그레이, 정밀함 |
| mood | 깔끔하고 신뢰감 있는 |
| 배경 | cool gray gradient, subtle geometric shapes |
| 장식 | thin light lines, soft reflection arcs |
| 아이콘 | geometric tech badge icon |

### 생활용품

| 항목 | 예시 |
|------|------|
| theme | 홈 라이프 / 아늑함 |
| motif_keywords | 자연광, 따뜻한 인테리어, 일상 |
| mood | 밝고 실용적인 |
| 배경 | bright airy home interior |
| 장식 | soft window light, minimal home accents |
| 아이콘 | home utility circle badge |

---

## 3. 섹션 순서 템플릿 (카테고리별)

`lib/section-templates.ts`의 `CATEGORY_SLOT_TEMPLATES`와 동기화 (2026-08-26 재대조).
AI는 슬롯 **순서/종류를 바꾸지 않고** 콘텐츠만 채웁니다. 아래는 가독용 요약이며
선택 슬롯·반복 슬롯 세부 note는 소스 코드를 따른다.

### 화장품/뷰티

```
hero → brand_story? → checklist → quick_points(×2~4) → target_persona?
  → ingredient_highlight → texture_feel? → highlight_box → illustration_banner?
  → step_card → gallery → stat_infographic? → comparison_chart? → spec_table
  → faq? → caution → packaging_design → how_it_works → size_options
  → customer_scenario → shipping_info? → ai_disclosure → cta_price
```

### 의류/패션 → 템플릿 `패션/의류`

```
hero → brand_story? → checklist → quick_points → target_persona?
  → detail_zoom → model_multicut → size_table → faq?
  → color_variation? → coordination? → illustration_banner?
  → care_info → fabric_composition → fit_guide → packaging_design
  → seasonal_styling → shipping_info? → ai_disclosure → cta_price
```

### 식품/건강기능식품 → 템플릿 `식품`

```
hero → brand_story? → checklist → quick_points → target_persona?
  → ingredient_highlight → texture_closeup? → illustration_banner?
  → cooking_steps? → packaging(gallery) → stat_infographic? → comparison_chart?
  → nutrition_table → faq? → caution → sourcing_story → serving_suggestion
  → packaging_design → storage_tip → shipping_info? → ai_disclosure → cta_price
```

### 전자제품 → 템플릿 `전자/가전`

```
hero → brand_story? → checklist → quick_points → target_persona?
  → feature_detail(×1~3) → comparison_table? → usage_scenario?
  → stat_infographic? → comparison_chart? → spec_table → faq?
  → package_contents → illustration_banner? → warranty_caution
  → design_detail → connectivity → install_scenario
  → shipping_info? → ai_disclosure → cta_price
```

### 생활용품 / 반려동물 / 기타 → 템플릿 `생활/리빙` (HOME_FALLBACK)

```
hero → brand_story? → checklist → quick_points → target_persona?
  → material_feature → usage_scenario? → illustration_banner?
  → gallery → spec_table → faq? → caution?
  → material_detail → usage_scenario_extra → packaging_design → care_tip
  → shipping_info? → ai_disclosure → cta_price
```

> **반려동물:** 폼 카테고리 `"반려동물"`은 `CATEGORY_TO_TEMPLATE`에서
> `생활/리빙`으로 폴백된다. 전용 템플릿 신설 여부는
> `review/upgrade-proposals.md` P1 제안 — **이번 라운드에서 슬롯 신설 금지**.
---

## 4. 컨셉이 적용되는 섹션별 패턴

### hero (필수 — 장식 그래픽 적용)

- flux-fill-dev 배경 + **flux-schnell 장식 합성** (모티프)
- accentColor 그라데이션 오버레이 (hero만 예외 허용)
- 헤드라인 2줄 이내, 배경과 대비 확보
- 레이아웃: 카드가 아니라 풀폭. 제목은 하단·가운데 정렬에 가깝게

### checklist (컨셉 아이콘)

- 항목당 flux-schnell 원형 배지 아이콘
- 3색 규칙 내 accent / deepAccent 통일
- Lucide 폴백은 생성 실패 시만
- 레이아웃: 세로 리스트보다 **원형 배지 + 짧은 문구 가로/그리드**

### image_text / gallery

- 동일 배경 톤·촬영 톤 유지 (갤러리 슬롯 특히 중요)
- 장식 그래픽: 히어로 외 섹션은 **옵션** (현재 파이프라인: 히어로만 필수)
- 레이아웃: 2열 카드가 아니라 **위 풀폭 이미지 → 아래 짧은 가운데 카피**
  (한 섹션에 주장 하나. POINT 번호는 카피/라벨일 뿐 새 슬롯이 아님)

### usage_steps (컨셉 아이콘)

- 단계별 원형 배지 아이콘 (번호 폴백 허용)
- AIDA Desire 구간 — 구체적 사용 이득 서술

### cta_price

- AIDA Action — 명확한 행동 유도
- 가격 + 배지 (baseNeutral / deepAccent)
- 레이아웃: 가운데 정렬된 마감 블록. deepAccent 솔리드 풀폭 밴드는 쓰지 않음
  (3색 배경 규칙: A 단색 / B 12% 워시 / hero 그라데이션만)

---

## 5. 비용 로그 패턴 (서버 확인용)

정상 생성 시 아래 `[cost]` 로그가 순서대로 출력되어야 합니다.

```
[cost] generateConceptBrief: $0.00xx
[cost] generateBackdrop (flux-fill-dev x3): $0.0750
[cost] generateDecorativeGraphic (flux-schnell): $0.0030
[cost] enhanceProductImage total=... (enhance=... decor=...)
[cost] generateConceptIcons (N/M icons): $0.0xxx
[cost] generateCopyWithDeepSeek: $0.00xx
[cost] product="..." conceptBrief= backdrop= enhance= decor= icons= deepSeek= total=
```

---

## 6. 참고 브랜드 / 방향성

- **glowiest.co.kr** — 상품 고유 색감이 페이지 전반에 반영, 섹션 리듬감
- **아로마티카 / 토리든** — 수분·클린 뷰티 컨셉의 모티프·톤 참고
- **무신사 상세** — 패션 에디토리얼 레이아웃·사진 톤 통일

전문 촬영/일러스트 수준까지 동일하게 재현할 순 없으나, **컨셉 일관성 +
상품 색감 반영 + 장식/아이콘 통일**로 그 방향에 가깝게 가는 것이 목표입니다.

---

## 7. 관련 파일

| 파일 | 설명 |
|------|------|
| `lib/concept-brief.ts` | 컨셉 브리프 생성 |
| `lib/concept-icons.ts` | checklist/usage_steps 아이콘 |
| `lib/photo-enhance.ts` | 배경·장식·합성 |
| `lib/design-tokens.ts` | 3색 규칙·히어로-only 장식 |
| `lib/section-templates.ts` | 슬롯 순서·`buildSectionLengthGuide` |
| `lib/backdrop-prompt-templates.ts` | 카테고리별 촬영 템플릿 |
| `review/CHECKLIST.md` | pass/fail 체크리스트 |
| `review/backdrop-prompt-templates.md` | 배경 프롬프트 문서 미러 |
| `review/photo-sources.md` | 테스트용 스톡 사진 출처 |
| `review/upgrade-proposals.md` | 29차 코드 변경 제안 목록 (구현 대기) |
---

## 8. 외부 레퍼런스 상세페이지 (2026-08-15)

스크린샷 기준으로 분석. URL 직접 접속이 안 되면 첨부 캡처가 근거.

| 페이지 | URL |
|--------|-----|
| Shooter Official (히팅 속눈썹 고데기) | https://shooterofficial.co.kr/255 |
| Polo Ralph Lauren 브라 | https://pixelvibe.net/product/폴로-랄프로렌/576/category/84/display/1/ |
| 코슈마드 RDM | https://pixelvibe.net/product/코슈마드-rdm/554/category/84/display/1/ |
| 로이엘 내추럴 부분속눈썹 | https://pixelvibe.net/product/로이엘-내추럴-부분속눈썹/543/category/84/display/1/ |

### 8.1 공통 섹션 리듬 (목표 연출 — 슬롯 순서는 §3 유지)

레퍼런스는 대략 아래 설득 흐름이다. **우리 슬롯 순서/종류는 바꾸지 않고**,
같은 흐름을 기존 슬롯 연출로만 흉내 낸다.

```
풀폭 히어로
  → 짧은 훅 (checklist)
  → POINT형 기능/품질 (image_text 반복)
  → 다각도/무드 (gallery)
  → 사용법 (usage_steps)
  → 스펙/주의 (spec_table, caution)
  → CTA (cta_price)
```

후기·인증·채팅형 리뷰는 레퍼런스에 있으나 **우리 슬롯에 없으므로 따라하지 않는다.**
뷰티 vs 비교표도 `comparison_table`이 전자제품 선택 슬롯일 때만 쓴다.

### 8.2 페이지별 톤·구성

**Shooter Official** — 메디컬-클린, 틸/라이트블루/화이트.
히어로(물 스플래시 풀블리드) → 실패 컷 그리드(Why) → 메커니즘 → 후기 →
구조 다이어그램 → 매크로 결과. 장식(물)은 히어로에만 있고 본문은 단색 블록.

**Polo Ralph Lauren** — 미니멀 프리미엄, 네이비/화이트/누드.
라이프스타일 히어로 → 스튜디오 단독컷 → 네이비 풀폭 USP → 앞/옆/뒤 갤러리 →
디테일 POINT 그리드 → 소재 → 스펙·사이즈표. 패션은 카피보다 다각도 사진이 본문.

**코슈마드 RDM** — 웜 미니멀, 크림/골드/차콜. 3색 규칙과 가장 가깝다.
히어로 → USP+원형 아이콘 행 → POINT 01·02 → 비교 → 사용법 → 갤러리 →
후기 → 스펙 → CTA. `POINT 01` 장식 숫자가 위계의 핵심.

**로이엘 부분속눈썹** — 소프트 뷰티, 라벤더/화이트/블랙.
히어로(박스+플로럴) → Before/After → POINT 01~03 매크로 → vs 표 →
변형 → 사용 3스텝 → 후기 모자이크 → 무드. 배경은 화이트↔연라벤더만 교차.

### 8.3 텍스트/이미지 배치 리듬

- 비율: 대략 텍스트 30~40% / 이미지 60~70%
- 풀블리드 사진과, 가운데 정렬된 짧은 텍스트 블록이 **한 섹션에 하나씩** 교차
- 카드 테두리·2열 그리드보다 **풀폭 단색 블록이 맞붙어** 스크롤됨
- 한 스크롤 깊이에 주장 하나 (One Big Point per Section)

### 8.4 타이포그래피 위계

| 위계 | 레퍼런스 | 우리 토큰/렌더러 |
|------|----------|------------------|
| 히어로 제목 | 화면을 가르는 초대형, 자주 가운데 | heading + `headlineMaxLines: 2` |
| 섹션 라벨 | POINT 01, 작은 트래킹/액센트색 | 새 슬롯 아님. image_text 라벨로만 |
| 섹션 제목 | 크고 짧음, 가운데 많음 | heading 2줄 |
| 본문 | 2~3줄, 넓은 line-height | `bodyMaxLines: 3` |

### 8.5 여백과 섹션 간 호흡

- 레퍼런스: 섹션 사이 빈 카드 갭이 아니라, 블록 내부 세로 패딩이 80~120px급
- 우리 토큰: `SECTION_GAP` = 모바일 48 / 데스크톱 80, `SECTION_PADDING` = 24 / 40
- 재현 방법: 블록을 맞붙이고, 내부 세로 패딩에 GAP 스케일(48/80)을 써서 호흡
- 가로: 텍스트는 중앙 컬럼, 이미지는 가장자리까지

### 8.6 톤앤매너

네 페이지 모두 **미니멀·프리미엄**. 장식을 쌓지 않고 상품 고유 색 1개로 묶는다.
화려함은 히어로 사진(스플래시, 플로럴, 라이프)에만 있고 본문은 기능적이다.

---

## 9. 토큰·슬롯·3색·히어로-only와 비교 (`lib/design-tokens.ts`)

### 재현 가능 (배치·크기·여백만)

- 상품 추출 3색(`accent` / `baseNeutral` / `deepAccent`)으로 페이지를 묶기
- 본문 A(baseNeutral 단색) / B(accent 12% 워시) 교차 — 로이엘·코슈마드와 동일
- 히어로에만 그라데이션·블러 장식 (`DECORATION_ALLOWED_SECTION_TYPES = hero`)
- image_text를 위 사진 / 아래 카피로 스택
- checklist를 원형 배지 그리드로
- gallery를 다각도·여백 적은 컷으로
- 헤드라인 2줄·본문 3줄
- 섹션 내부 호흡을 48/80px 토큰 스케일에 맞추기

### 흉내는 가능, 슬롯/토큰 밖이면 하지 말 것

| 레퍼런스 | 우리 시스템 |
|----------|-------------|
| 후기 / 채팅 버블 / 리얼후기 모자이크 | 슬롯 없음 → 신설 금지 |
| 인증·QC 그리드 | 슬롯 없음 |
| 뷰티 vs 비교표 | `comparison_table`은 전자제품 선택 슬롯만 |
| POINT 01 전용 섹션 타입 | `image_text` 라벨/카피로만 |
| 폴로의 네이비 솔리드 풀폭 USP 밴드 | 허용 배경은 A / B 12% / hero 그라데이션뿐 |
| 확대경 콜아웃, 히어로 밖 플로럴 | 히어로-only 장식 위반 |

### 렌더러 작업 시 지킬 것

1. 슬롯 순서·종류는 `lib/section-templates.ts`를 바꾸지 않는다.
2. 색은 `getSectionBackground` / `getHeroGradient` / `getDecorationColor`만.
3. 장식 도형은 hero 밖에서 추가하지 않는다.
4. 이미지 비율은 `SLOT_IMAGE_RATIO`를 유지한다.
5. 후기·인증 섹션을 새로 만들지 않는다.

배경·합성 촬영 용어(수분/쿨링/영양/클렌징)는 `review/backdrop-prompt-templates.md`와 `lib/backdrop-prompt-templates.ts`를 따른다. 최종 승인 배경 후보 수는 `BACKDROP_CANDIDATES`(기본 7).

---

## 10. 카테고리 구조 패턴 (카피·모델컷 비복제)

브랜드명·세일즈 문구·특정 모델 사진은 베끼지 않는다. **배치 구조만** 참고한다.
후기·채팅형 리뷰·인증 배지·QC 그리드는 레퍼런스에 있어도 **신설/모방 금지**.

### 10.1 뷰티/스킨케어 (보강 · 2026-08-26)

**레퍼런스 근거:** §8 Shooter / 코슈마드 / 로이엘 + 1분상세·쿠팡 뷰티 구성 가이드(2026).

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 두 컷 나란히 비교 | `gallery` 2열 + BEFORE/AFTER **레이블만**. 임상 전후·효능 단정 금지 | 특정 브랜드 B/A 카피 복제 |
| 성분·질감 매크로 | `ingredient_highlight` / `texture_feel`에 서로 다른 원본 | 히어로 장식을 본문에 복제 |
| 수치 막대 | 입력에 `%`가 **있을 때만** `stat_infographic`/`spec_table` | 가짜 임상 데이터 |
| 단계 사용법 | `step_card` (STEP 라벨은 렌더러) | 새 슬롯 신설 |
| 효과 3축 요약 | `highlight_box` 카드 3장, 강조는 2번째 | checklist와 동일 문구 반복 |
| 성분 하이라이트 밴드 | ingredient 위 짧은 accent 바 (3색 안) | 네이비 솔리드 풀폭 밴드 |
| 데일리 루틴 | `customer_scenario` 1장면 1주장 | 후기 모자이크 |

### 10.2 전자기기 (보강 · 2026-08-26)

**레퍼런스 근거:** §8 Shooter(뷰티지만 메커니즘·스펙 리듬 참고) + Amazon A+/DTC 스펙 모듈 관행 + 우리 ELECTRONICS 템플릿.

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 스펙 비교표 | `comparison_table` + 필수 `spec_table` | 없는 스펙 날조 |
| 숫자 훅 기능 컷 | `feature_detail` 반복(최대 3), 입력 숫자만 | 타사 슬로건 복제 |
| 구성품 플랫레이 | `package_contents` 1:1 | 브랜드 언박싱 로고 |
| 실사용/설치 | `usage_scenario` / `install_scenario` | 후기 모자이크 |
| 호환·연결 | `connectivity` — 입력 스펙만 | 미지원 규격 암시 |
| A/S·주의 | `warranty_caution` | 보증 기간 날조 |

### 10.3 의류/패션 (신규 · 2026-08-26)

**레퍼런스 근거 (구조만, 카피 비복제):**
| # | 출처 | URL / 근거 |
|---|------|------------|
| 1 | 1분상세 — 패션 상세 가이드 2026 | https://1minutesangse.com/guides/fashion-detail-page |
| 2 | LaonGEN — 착용·디테일·사이즈·코디 순서 | https://laongen.com/blog/ko/detail-page-images/ |
| 3 | GENCY 블로그 — 전면/후면/디테일/코디 배치 | https://blog.gency.ai/clothing-detail-page-design |
| 4 | 무신사 실측 사이즈 표기 관행 정리 | https://jdgwm.tistory.com/361 |
| 5 | §8 Polo Ralph Lauren (미니멀·다각도 갤러리) | pixelvibe 캡처 경로 §8 |

**시장 관측 구조 (흉내낼 배치):**
메인(착장) → 전/측/후 착용 멀티컷 → 디테일(원단·봉제) → **cm 실측 사이즈표** → 소재·세탁 → 색상 옵션 → 코디 제안 → CTA.  
핵심 설득축은 “예쁜 화보”가 아니라 **반품 불안 제거(사이즈·소재·색)**.

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 착장 히어로 | `hero` 4:5 착장/대표컷 | 타 브랜드 룩북 문구 |
| 다각도 착용 | `model_multicut` gallery (서로 다른 컷) | 같은 컷 반복 패딩 |
| 원단·봉제 매크로 | `detail_zoom` + `fabric_composition` | 히어로 장식 재사용 |
| cm 실측 사이즈 | `size_table` — **입력 실측만**, 없으면 "판매자 확인 필요" | S/M/L만으로 가짜 cm 생성 |
| 색상 옵션 | `color_variation` (선택) | 없는 컬러웨이 날조 |
| 코디 제안 | `coordination` / `seasonal_styling` 각 1장면 | 인플루언서 후기 그리드 |
| 핏 설명 | `fit_guide` 2문장 이내 | 체형별 후기 카드 |
| 세탁·관리 | `care_info` | 취급표시 없는 세탁법 단정 |

### 10.4 식품/건강기능식품 (신규 · 2026-08-26)

**레퍼런스 근거:**
| # | 출처 | URL / 근거 |
|---|------|------------|
| 1 | 마켓컬리 PDP — 원산지·알레르기·고시정보 블록 | https://www.kurly.com/goods/5063110 외 |
| 2 | 1분상세 — 식품 표시·표현 주의 2026 | https://1minutesangse.com/guides/food-detail-page |
| 3 | 쿠팡 상세 가이드 — 필수 표기·모바일 구성 | https://blog.gencystudio.com/coupang-detailpage-guide |
| 4 | 컬리 스크래퍼 필드 목록(원산지·보관·영양) | https://thunderbit.com/ko/template/market-kurly-scraper |

**시장 관측 구조:** 플레이팅 히어로 → 원재료/원산지 Why → 맛·식감 클로즈업 → 조리·섭취 → 영양/알레르기 표 → 보관·주의 → 서빙 제안 → CTA.  
설득은 **사실 표시(원산지·보관·알레르기)** 가 먼저이고, 스토리는 그 다음.

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 완성/플레이팅 히어로 | `hero` | 타사 레시피 카피 |
| 원재료·원산지 Why | `ingredient_highlight` + `sourcing_story` | 없는 산지·함량 날조 |
| 식감 매크로 | `texture_closeup` | 임상·효능 수치 |
| 조리/섭취 | `cooking_steps` (가공식품만) | 치료·예방 표현 (`food-compliance`) |
| 영양·알레르기 표 | `nutrition_table` — 입력값만 | 가짜 kcal/% |
| 보관·주의 | `caution` + `storage_tip` | 유통기한 임의 생성 |
| 서빙 장면 | `serving_suggestion` 1~2문장 | 후기·인증 배지 그리드 |

### 10.5 생활용품 (신규 · 2026-08-26)

**레퍼런스 근거:**
| # | 출처 | URL / 근거 |
|---|------|------------|
| 1 | 1분상세 — 상세 구성 후킹→설득→신뢰 | https://1minutesangse.com/guides/detail-page-howto |
| 2 | 쿠팡 상세 성공 전략 — 생활용품 키워드·모바일 | https://oscsnm.com/coupang-detail-page-strategy/ |
| 3 | 쿠팡 상세 가이드 2026 — 사용법·구성품 | https://blog.gencystudio.com/coupang-detailpage-guide |
| 4 | §8 공통 리듬 (풀폭 컷 × 짧은 카피 교차) | 본 문서 §8.3 |

**시장 관측 구조:** 제품 히어로 → 핵심 혜택 3~4 → 소재/내구성 → **사용 시나리오 컷** → 다각도 갤러리 → 스펙·사이즈 → 관리/세척 → CTA.

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 혜택 훅 | `checklist` + `quick_points` compact | 한 섹션에 주장 여러 개 |
| 소재·내구성 | `material_feature` + `material_detail` | 미검증 내구 수치 |
| 사용 장면 | `usage_scenario` + `usage_scenario_extra` | 후기 UGC 모자이크 |
| 다각도 | `gallery` | 히어로 컷 전면 재사용 |
| 스펙 | `spec_table` 입력값만 | 치수 날조 |
| 관리 | `care_tip` 1문장 | 네이비 솔리드 USP 밴드 |

### 10.6 반려동물 (신규 · 판단 포함 · 2026-08-26)

**레퍼런스 근거:**
| # | 출처 | URL / 근거 |
|---|------|------------|
| 1 | moai category-pet — 이중 페르소나·급여 모듈 | https://github.com/modu-ai/moai-cowork/blob/main/plugins/moai-seller/skills/commerce-detail-page-planner/references/category-pet.md |
| 2 | 1분상세 — 식품형 표시·과장 금지 (펫푸드 인접) | https://1minutesangse.com/guides/food-detail-page |
| 3 | 쿠팡 상세 가이드 — 성분·주의 표기 | https://blog.gencystudio.com/coupang-detailpage-guide |

**시장 관측 구조:** 제품 히어로 → 보호자 페인(안전·성분) → 성분/원료 강조 → 기호·사용 장면 → (입력 있을 때) 체중별 급여 표 → 보관·주의 → CTA.  
카피는 **보호자 90% / 동물 반응 10%**. 치료·예방·수명 연장 단정 금지.

**전용 템플릿 필요 여부 (제안만, 미구현):**

| 판단 | 근거 |
|------|------|
| **당장 필수 아님** | HOME_FALLBACK의 material / usage_scenario / spec_table / care_tip / caution으로 성분·사용·보관 리듬을 거의 커버 |
| **중기 후보** | 체중별 급여표·종/연령 추천·기호성 클로즈업은 FOOD의 `nutrition_table`/`cooking_steps`와 더 가깝다. 펫 매출 비중이 커지면 `반려동물` → 전용 TemplateCategory 분기를 **별도 브리프**로 |
| **지금 하지 말 것** | 수의사 추천 배지·반응 후기 그리드·인증 슬롯 신설 |

| 구조 | 우리 슬롯·렌더러 (현행 폴백) | 하지 말 것 |
|------|------------------------------|------------|
| 성분·안전 | `material_feature` + 입력 `ingredients` | "100% 안전", 질병 치료 |
| 사용/급여 장면 | `usage_scenario(_extra)` | 가짜 급여량 표 |
| 스펙 | `spec_table` 입력만 | 단백질 % 날조 |
| 보관·주의 | `care_tip` / `caution` | 수의사 미검증 추천 배지 |

---

## 11. 카테고리 횡단 리서치 (2026-08-26)

### 11.1 CRO / UX — One Big Point per Section은 여전히 유효

| 출처 | 요지 | 우리 문서 반영 |
|------|------|----------------|
| ezcommerce / Baymard PDP 2026 | above-the-fold는 핵심만; 모바일 sticky CTA; 스크롤 존마다 한 가지 불안 해소 | §8.3 유지·강화 |
| D2C Times PDP systems | 스크롤 존 = buyer objection 순서; mid-page trust cascade | AIDA 슬롯 리듬과 정합 |
| RevvUp Shopify PDP | 섹션당 사실 1개, AI/스캔 가독성 | `buildSectionLengthGuide` 글자수 규율과 정합 |

**업데이트 결론:** §8.3 "한 스크롤 깊이에 주장 하나"는 2026 자료에서도 유효. 변경보다 **전 카테고리 균등 적용**(27차 길이 규율 일반화)이 우선.

### 11.2 크라우드펀딩(와디즈형) / Shopify DTC / Amazon A+

- **정보 밀도:** 스펙·비교·주의가 하단 정보형 블록으로 몰림 → 우리 `spec_table` / `comparison_*` / `caution` / `faq` 배치와 맞음. 레이아웃은 풀폭 단색 + 짧은 표, 카드 숲 지양.
- **미니멀 프리미엄:** §8.6 유지. 여백은 토큰 48/80 스케일.
- **A+ Content:** 모듈형 “한 모듈=한 혜택” → quick_points / feature_detail과 동일 철학.

### 11.3 경쟁 AI 상세 툴 (베끼지 않고 실패 모드만)

| 툴 | 관찰 | Pagzly가 의식할 실패 모드 |
|----|------|---------------------------|
| GENCY | 패션 특화, 컷 자동 분류·배치 | 패션에서 사진 역할(착장/디테일/코디) 혼동 → 이미지 배정 다양성 |
| draph.art | 빠른 레이아웃+카피, 대화형 수정 | 범용 템플릿 카피 장황 → 길이 규율·섹션 AI 패치로 대응 |
| 1분상세 | 초안+자유 배치 | 법정 표시·사실 검수 누락 위험 → 우리 compliance/QA 유지 |

Pagzly 강점 후보: 컨셉 브리프 일관성, 식약처/식품 컴플라이언스, 업로드 실사 합성, 슬롯 고정(환각 섹션 억제).  
약점 후보: 패션 컷 역할 분류, 펫 전용 모듈, 경쟁 대비 “즉시 템플릿 교체” UX.

### 11.4 시스템 약점 재점검 (코드 대조 요약)

| 질문 | 판정 | 다음 액션 |
|------|------|-----------|
| 템플릿 5종이 시장 구조와 맞는가? | 대체로 맞음. §3 문서가 코드보다 낡았음 → **이번 라운드 §3 동기화** | 슬롯 순서 변경은 제안만 (`upgrade-proposals`) |
| 3색 규칙이 카테고리별 충분한가? | 충분. 카테고리 고정색이 아니라 상품 추출색이 핵심 (`CHECKLIST`) | 카테고리별 4~5색 확장 **비권장** |
| “화장품만 있던” 패턴 잔존? | 27차로 카피 길이 일반화됨. `concept-brief` FALLBACK은 화장품만 상세 → **소규모 보완** | 펫/생활/전자 길이 가이드 보강 |
| 반려동물 폴백 | 구조적으로 당장 OK, 카피 톤만 펫 인식 필요 | 전용 템플릿은 P1 제안 |

코드 변경 제안의 전체 목록·우선순위는 **`review/upgrade-proposals.md`**.

---

## 12. 절대 규칙 재확인 (리서치 확대해도 불변)

1. 브랜드 카피·슬로건 비복제 — 배치만.
2. 후기·인증·QC 그리드 신설 금지.
3. 없는 수치·스펙·임상 데이터 금지.
4. `section-templates` 슬롯 순서/종류는 승인 전 변경 금지.
5. 3색 + 히어로-only 장식 위반 연출 금지.