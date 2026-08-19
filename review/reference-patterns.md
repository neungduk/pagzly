# 상세페이지 시각 컨셉 레퍼런스 패턴

Claude Code / QA 루프가 상세페이지 품질을 판단할 때 참고하는 **시각 컨셉 패턴
가이드**입니다. `CHECKLIST.md`가 pass/fail 기준이라면, 이 문서는 "전문
상세페이지처럼 보이려면 어떤 시각 언어를 써야 하는가"에 대한 방향성 레퍼런스입니다.

생성 일: 2026-08-14  
업데이트: 2026-08-15 — 외부 상세페이지 4곳 스크린샷 분석 반영  
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

`lib/section-templates.ts`와 동기화. AI는 슬롯 **순서/종류를 바꾸지 않고**
콘텐츠만 채웁니다.

### 화장품/뷰티

```
hero → checklist → ingredient_highlight → texture_feel(선택)
  → usage_steps → gallery → spec_table → caution → cta_price
```

### 의류/패션

```
hero → checklist → detail_zoom → model_multicut → size_table(선택)
  → color_variation(선택) → care_guide → cta_price
```

### 식품

```
hero → checklist → origin_story → nutrition_highlight → usage_steps
  → gallery → spec_table → caution → cta_price
```

### 전자제품

```
hero → checklist → feature_highlight → spec_table → comparison_table(선택)
  → gallery → caution → cta_price
```

### 생활용품

```
hero → checklist → usage_scene → detail_zoom → usage_steps
  → spec_table → cta_price
```

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
| `lib/design-tokens.ts` | 3색 규칙 |
| `lib/section-templates.ts` | 슬롯 순서 |
| `review/CHECKLIST.md` | pass/fail 체크리스트 |
| `review/photo-sources.md` | 테스트용 스톡 사진 출처 |
| `lib/design-tokens.ts` | 토큰·3색·히어로-only 장식의 실제 소스 |

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

### 뷰티/스킨케어

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 두 컷 나란히 비교 | `gallery` 2열 + BEFORE/AFTER **레이블만** (구조). 임상 전후 연출·효능 단정 금지 | 특정 브랜드 B/A 카피 복제 |
| 성분·질감 매크로 | `ingredient_highlight` / `texture_feel`에 서로 다른 원본 배정. 성분 슬롯은 짧은 액센트 밴드 | 히어로 장식을 본문에 복제 |
| 수치 막대 | `spec_table` 값에 `%`가 **이미 있을 때만** 가로 바. 없는 수치는 만들지 않음 | 가짜 임상 데이터 |
| 단계 사용법 | `usage_steps`에 STEP 01/02/03 라벨 | 새 슬롯 신설 |
| 성분 하이라이트 밴드 | ingredient 텍스트 블록 위 짧은 accent 바 (3색 안) | 네이비 솔리드 풀폭 밴드 |

### 전자기기

| 구조 | 우리 슬롯·렌더러 | 하지 말 것 |
|------|-------------------|------------|
| 스펙 비교표 | `comparison_table` (COMPARE 라벨) + 필수 `spec_table` | 없는 스펙 날조 |
| 구성품 플랫레이 | `package_contents` 1:1 컷 | 브랜드 언박싱 박스 로고 |
| 숫자 강조 헤드라인 | 히어로 `tabular-nums` + feature 카피의 짧은 숫자 훅 | 타사 슬로건 복제 |
| 사용 시나리오 | `usage_scenario` 라이프스타일 컷 | 후기 모자이크 |
