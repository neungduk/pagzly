# 36차 Cursor 브리프 — "짧은 구성" 모드 슬롯 우선순위 압축

생성: 2026-08-31
승인: deok (AskUserQuestion — "required 슬롯에도 우선순위 부여" 선택, 35차 완료 직후)
규칙 근거: `review/upgrade-proposals.md` "슬롯 신설·템플릿 구조 변경은 승인 전 구현 금지" — **이 브리프는 그 승인을 받은 예외 건**입니다. 슬롯을 새로 만들거나 순서를 바꾸지 않고, 기존 required 슬롯에 "짧은 구성에서 보여줄지" 표시만 추가합니다.

---

## 1. 배경 — 왜 지금 이 항목인가

- `review/marketplace-pdp-learning-2026.md` §"디자이너·마켓 공통 원칙" 2번: **"8~12 스크롤 구간 — 너무 길면 이탈. 짧은 구성 모드 + AI 요약으로 길이 압축"**
- `review/designer-patterns-2026.md` §"4. 잔여 로드맵" 4번: **"페이지 길이 자동 압축 — short 모드 + AI 요약으로 8~12구간 맞추기"** (아직 미구현으로 명시된 항목)
- `competitor-gap-2026.md`(8/28)와 겹치지 않는, 리서치 문서 자체가 "다음 할 일"로 남겨둔 유일한 항목이라 이번 라운드에서 이걸 선택함.
- 실측: `lib/section-templates.ts`의 `applyShortTemplate()`은 지금 `required: true` 슬롯을 전부 남기는데, 카테고리별로 required 슬롯이 15~16개(반복 슬롯 포함 16~17행)라서 "짧은 구성"을 선택해도 목표(8~12)의 거의 두 배가 나옵니다.

| 카테고리 | 현재 short 모드 행 수 | 목표 | 비고 |
|---|---|---|---|
| 화장품/뷰티 (BEAUTY) | 17 | 8~12 | quick_points가 repeatable(minCount 2)이라 required 16개 → 17행 |
| 패션/의류 (FASHION) | 17 | 8~12 | required 16개 → quick_points 반복분 +1행 |
| 식품 (FOOD) | 17 | 8~12 | required 16개 → quick_points 반복분 +1행 |
| 전자/가전 (ELECTRONICS) | 16 | 8~12 | required 15개 → quick_points 반복분 +1행 |
| 반려동물 (PET) | 17 | 8~12 | required 16개 → quick_points 반복분 +1행 |
| 생활/리빙 (HOME_FALLBACK) | 16 | 8~12 | required 15개 → quick_points 반복분 +1행 |

"짧은 구성"을 고르는 셀러 입장에서는 지금 그 선택이 사실상 무의미합니다 — 다시 만들어도 여전히 16~17개짜리 페이지가 나옵니다.

---

## 2. 목표 / 비목표

**목표**
- "짧은 구성" 모드에서 카테고리별로 정확히 **10개 섹션**만 남긴다 (목표 범위 8~12의 중간값, 전 카테고리 통일).
- "긴 구성" 모드는 **1바이트도 바뀌지 않는다** — `getSlotTemplate(category, "long")`의 반환값·순서·개수 전부 기존과 동일.
- AI 비용 0원 — DeepSeek/Claude/Replicate 호출 방식 변경 없음. 순수 배열 필터링만 바뀜.

**비목표 (이번엔 하지 않음)**
- 슬롯 신설 없음 (`CATEGORY_SLOT_TEMPLATES`에 새 slot 항목 추가 안 함)
- 슬롯 순서 변경 없음 (배열 내 위치 그대로, 필터만 적용)
- optional(`required: false`) 슬롯의 동작 변경 없음 — 지금처럼 "긴 구성"에서 입력 근거 있으면 채움
- "AI 요약으로 길이 압축"(카피를 더 짧게 요약)은 이번 범위 밖 — 이건 슬롯 **개수** 압축만 다룸

---

## 3. 설계 — `SlotDefinition`에 표시 필드 추가

### 3-1. 타입 정의 (`lib/section-templates.ts` 9~17행)

**Before**
```ts
export type SlotDefinition = {
  slot: string;
  type: DetailSection["type"];
  required: boolean;
  note: string; // 프롬프트에 그대로 노출되는 한글 슬롯 설명
  minCount?: number; // gallery/repeatable 슬롯의 최소 이미지·항목 수
  maxCount?: number; // gallery/repeatable 슬롯의 최대 이미지·항목 수
  repeatable?: boolean; // true면 같은 slot을 여러 섹션(연속)으로 나눠 채울 수 있음
};
```

**After**
```ts
export type SlotDefinition = {
  slot: string;
  type: DetailSection["type"];
  required: boolean;
  note: string; // 프롬프트에 그대로 노출되는 한글 슬롯 설명
  minCount?: number; // gallery/repeatable 슬롯의 최소 이미지·항목 수
  maxCount?: number; // gallery/repeatable 슬롯의 최대 이미지·항목 수
  repeatable?: boolean; // true면 같은 slot을 여러 섹션(연속)으로 나눠 채울 수 있음
  // required 슬롯 중 "짧은 구성" 모드에서도 반드시 남길 전환 핵심만 core.
  // 미지정 시 기본값은 core (기존 동작과 동일하게 유지됨).
  // "extra"로 표시된 required 슬롯은 짧은 구성에서만 제외되고, 긴 구성에는 영향 없음.
  shortTier?: "core" | "extra";
};
```

### 3-2. 필터 로직 (`lib/section-templates.ts` 866~877행)

**Before**
```ts
/** 짧은 구성: required 슬롯만. repeatable은 minCount개 템플릿 행으로 펼침. */
function applyShortTemplate(template: SlotDefinition[]): SlotDefinition[] {
  const result: SlotDefinition[] = [];
  for (const def of template) {
    if (!def.required) continue;
    const rowCount = def.repeatable && def.minCount ? def.minCount : 1;
    for (let i = 0; i < rowCount; i++) {
      result.push({ ...def, repeatable: false });
    }
  }
  return result;
}
```

**After**
```ts
/**
 * 짧은 구성: required 슬롯 중 shortTier가 "extra"로 표시되지 않은 것만.
 * (shortTier 미지정 = core로 간주 — 기존 동작과 동일)
 * repeatable은 minCount개 템플릿 행으로 펼침.
 */
function applyShortTemplate(template: SlotDefinition[]): SlotDefinition[] {
  const result: SlotDefinition[] = [];
  for (const def of template) {
    if (!def.required) continue;
    if (def.shortTier === "extra") continue;
    const rowCount = def.repeatable && def.minCount ? def.minCount : 1;
    for (let i = 0; i < rowCount; i++) {
      result.push({ ...def, repeatable: false });
    }
  }
  return result;
}
```

`getSlotTemplate(category, "long")`은 `applyShortTemplate`을 아예 호출하지 않으므로(880~886행 그대로) 긴 구성은 자동으로 무영향입니다. 이 두 군데 외에는 코드를 건드릴 필요가 없습니다.

---

## 4. 카테고리별 태깅 — 이 슬롯들에 `shortTier: "extra",`를 추가

**작업 방법**: 아래 표의 slot 이름으로 각 카테고리 배열(`BEAUTY`/`FASHION`/`FOOD`/`ELECTRONICS`/`PET`/`HOME_FALLBACK`)에서 해당 객체를 찾아, 그 객체의 `required: true,` 줄 바로 다음에 `shortTier: "extra",`를 한 줄 추가하세요. (다른 required 슬롯은 전부 그대로 두면 자동으로 core — 아무것도 추가하지 않아도 됩니다.) 줄 번호는 참고용이며, 정확한 대상은 **slot 이름 필드**로 식별하세요.

### 4-1. BEAUTY (`화장품/뷰티`) — 16개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 36~44 | `shortTier: "extra"` 추가 (repeatable 2행이 통째로 빠짐) |
| `ingredient_highlight` | 57~62 | `shortTier: "extra"` 추가 |
| `packaging_design` | 127 | `shortTier: "extra"` 추가 |
| `how_it_works` | 128~133 | `shortTier: "extra"` 추가 |
| `size_options` | 134~139 | `shortTier: "extra"` 추가 |
| `customer_scenario` | 140~145 | `shortTier: "extra"` 추가 |

짧은 구성에 남는 10개(core): `hero`, `checklist`, `feature_callout`, `highlight_box`, `step_card`, `gallery`, `spec_table`, `caution`, `ai_disclosure`, `cta_price`

### 4-2. FASHION (`패션/의류`) — 16개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 170~178 | `shortTier: "extra"` |
| `detail_zoom` | 191~196 | `shortTier: "extra"` |
| `fabric_composition` | 261~266 | `shortTier: "extra"` |
| `fit_guide` | 267~272 | `shortTier: "extra"` |
| `packaging_design` | 273 | `shortTier: "extra"` |
| `seasonal_styling` | 274~279 | `shortTier: "extra"` |

core 10개: `hero`, `checklist`, `feature_callout`, `highlight_box`, `model_multicut`, `step_card`, `size_table`(반품 방지 핵심 — §10.3), `care_info`, `ai_disclosure`, `cta_price`

### 4-3. FOOD (`식품`) — 16개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 304~312 | `shortTier: "extra"` |
| `ingredient_highlight` | 325~330 | `shortTier: "extra"` |
| `sourcing_story` | 401~406 | `shortTier: "extra"` |
| `serving_suggestion` | 407~412 | `shortTier: "extra"` |
| `packaging_design` | 413 | `shortTier: "extra"` |
| `storage_tip` | 414 | `shortTier: "extra"` |

core 10개: `hero`, `checklist`, `feature_callout`, `highlight_box`, `step_card`, `packaging`, `nutrition_table`(고시 준수 핵심), `caution`(알레르기 경고 — 컴플라이언스 필수), `ai_disclosure`, `cta_price`

### 4-4. ELECTRONICS (`전자/가전`) — 15개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 440~447 | `shortTier: "extra"` |
| `feature_callout` | 455~459 | `shortTier: "extra"` (기능 확대인 `feature_detail`을 core로 남기고 중복되는 콜아웃은 제외) |
| `design_detail` | 537 | `shortTier: "extra"` |
| `connectivity` | 539~543 | `shortTier: "extra"` |
| `install_scenario` | 545~549 | `shortTier: "extra"` |

core 10개: `hero`, `checklist`, `feature_detail`, `highlight_box`, `spec_table`, `package_contents`(구성품 — 반품 사유 1순위), `step_card`, `warranty_caution`, `ai_disclosure`, `cta_price`

### 4-5. PET (`반려동물`) — 16개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 575~582 | `shortTier: "extra"` |
| `material_feature` | 596~600 | `shortTier: "extra"` |
| `gallery` | 613~620 | `shortTier: "extra"` |
| `material_detail` | 653 | `shortTier: "extra"` |
| `packaging_design` | 660 | `shortTier: "extra"` |
| `care_tip` | 661 | `shortTier: "extra"` |

core 10개: `hero`, `checklist`, `feature_callout`, `usage_scenario`(반려동물과 함께하는 장면 — 신뢰/공감 핵심), `highlight_box`, `step_card`, `spec_table`(급여량·적합 연령), `caution`(안전 경고 — 컴플라이언스 필수), `ai_disclosure`, `cta_price`

### 4-6. HOME_FALLBACK (`생활/리빙`) — 15개 → core 10개

| slot | 현재 줄(약) | 조치 |
|---|---|---|
| `quick_points` | 687~694 | `shortTier: "extra"` |
| `material_feature` | 708~712 | `shortTier: "extra"` |
| `material_detail` | 771 | `shortTier: "extra"` |
| `usage_scenario_extra` | 772~777 | `shortTier: "extra"` |
| `packaging_design` | 778 | `shortTier: "extra"` |

core 10개: `hero`, `checklist`, `feature_callout`, `highlight_box`, `gallery`, `step_card`, `spec_table`, `care_tip`, `ai_disclosure`, `cta_price`

---

## 5. 하드 룰

1. **긴 구성(long) 모드는 절대 변경 금지.** `getSlotTemplate(category, "long")`은 지금처럼 `CATEGORY_SLOT_TEMPLATES`를 그대로 반환해야 함 — `shortTier` 필드가 있어도 long 경로는 이 필드를 읽지 않으므로 자동으로 보장되지만, 구현 후 반드시 개수 불변을 확인할 것 (§6 검증 참고).
2. **슬롯 신설 금지.** 새 `slot`/`type` 객체를 추가하지 않는다 — 기존 객체에 `shortTier` 필드 한 줄만 추가.
3. **순서 변경 금지.** 배열 내 슬롯 위치를 옮기지 않는다. `applyShortTemplate`은 원래 순서를 유지한 채 필터링만 한다 (기존 로직 그대로).
4. **`required: false`(optional) 슬롯은 손대지 않는다.** `brand_story`, `target_persona`, `faq`, `stat_infographic` 등은 이미 짧은 구성에서 제외되므로 `shortTier` 필드 자체가 무의미 — 추가하지 말 것.
5. **AI 프롬프트·비용 변경 없음.** `app/api/generate/route.ts`의 `lengthGuide`(581~583행) 문구, DeepSeek 호출 방식 모두 그대로. 슬롯 목록 자체가 짧아질 뿐, "필수 슬롯만 포함" 안내 문구는 여전히 사실과 맞음 (수정 불필요).
6. **카테고리당 정확히 10개**가 되도록 위 표의 슬롯만 정확히 태깅한다 (더 빼거나 덜 빼지 말 것 — 이 배분은 6블록 CRO 구조: 대표→혜택요약→이미지스토리→신뢰→컴플라이언스→CTA를 기준으로 이미 계산된 값).

---

## 6. 검증 체크리스트 (완료 보고 전 필수)

- [ ] `npx tsc --noEmit` — 에러 0건
- [ ] 각 카테고리별로 `countSlotSections(category, "short")` 결과가 **정확히 10**인지 확인 (테스트 스크립트든 임시 콘솔 로그든 방법은 자유)
- [ ] 각 카테고리별로 `countSlotSections(category, "long")` 결과가 **이번 변경 전과 동일**한지 확인 (회귀 없음 — 변경 전 값 기록해두고 diff)
- [ ] "짧은 구성"으로 실제 draft 생성 1회(임의 카테고리) → 결과 섹션이 위 core 10개 슬롯과 정확히 일치하는지 확인
- [ ] "긴 구성"으로 동일 상품 재생성 → 기존과 동일한 슬롯 구성(개수·순서)인지 확인
- [ ] `applyShortTemplate` 필터 순서상 원래 배열 순서가 유지되는지(예: BEAUTY short 모드에서 hero → checklist → feature_callout → highlight_box → step_card → gallery → spec_table → caution → ai_disclosure → cta_price 순서) 확인

---

## 7. 완료 보고 형식

기존 방식대로: 변경 파일/라인, `tsc --noEmit` 결과, 카테고리별 short/long 섹션 개수 표(위 체크리스트 3번째 항목 결과)를 포함해 보고해 주세요. 커밋·푸시는 제가 diff 재검증한 뒤 안내드리겠습니다.
