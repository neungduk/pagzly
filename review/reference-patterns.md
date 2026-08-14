# 상세페이지 시각 컨셉 레퍼런스 패턴

Claude Code / QA 루프가 상세페이지 품질을 판단할 때 참고하는 **시각 컨셉 패턴
가이드**입니다. `CHECKLIST.md`가 pass/fail 기준이라면, 이 문서는 "전문
상세페이지처럼 보이려면 어떤 시각 언어를 써야 하는가"에 대한 방향성 레퍼런스입니다.

생성 일: 2026-08-14  
파이프라인 버전: concept-brief v1 (컨셉 브리프 → 배경/장식/아이콘/카피 공통 주입)

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

### checklist (컨셉 아이콘)

- 항목당 flux-schnell 원형 배지 아이콘
- 3색 규칙 내 accent / deepAccent 통일
- Lucide 폴백은 생성 실패 시만

### image_text / gallery

- 동일 배경 톤·촬영 톤 유지 (갤러리 슬롯 특히 중요)
- 장식 그래픽: 히어로 외 섹션은 **옵션** (현재 파이프라인: 히어로만 필수)

### usage_steps (컨셉 아이콘)

- 단계별 원형 배지 아이콘 (번호 폴백 허용)
- AIDA Desire 구간 — 구체적 사용 이득 서술

### cta_price

- AIDA Action — 명확한 행동 유도
- 가격 + 배지 (baseNeutral / deepAccent)

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
