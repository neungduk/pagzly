# 224차 브리프 — 라이브·export "POINT 번호/이미지 좌우/60:40 리듬" 카운터 어긋남

생성: 2026-09-18 · 유료 API 0건 · 코드 전용 (1줄 로직 교체 + import 1개)

## 0. 배경 — 어떻게 발견했나

223차(export "부품/기능 주석 오버레이" 복원) 실행·독립 검증이 끝난 뒤 §3이 다시 비어
사용자가 "포인트 카운터 검토"를 선택했습니다. 223차 브리프 §4(스코프 밖)에 각주로만
남겨뒀던 의심 사항 — 라이브의 `isFullPoint`와 export의 `shouldUseSplitLayout` 기반
카운터가 **에디토리얼 블리드 섹션**(`EDITORIAL_BLEED_SLOTS` — usage_scenario·coordination·
seasonal_styling·customer_scenario·serving_suggestion·install_scenario·material_feature·
lifestyle_shot·usage_scene·usage_scenario_extra, 10개 슬롯)을 카운트에 포함하는지
다르다 — 를 이번에 직접 재현해 실제로 어긋남을 확인했습니다.

## 1. 원인

`shouldUseSplitLayout()`(`lib/detail-visual-rhythm.ts:80~87`)는 이렇게 정의돼 있습니다:

```ts
export function shouldUseSplitLayout(section: DetailSection): boolean {
  if (section.type !== "image_text") return false;
  if (section.layout === "compact" || section.layout === "callout") return false;
  if (section.slot === "quick_points" || section.slot === "feature_callout") return false;
  if (shouldUseEditorialBleed(section)) return false;
  return true;
}
```

**export**(`lib/export-detail-html.ts:1024~1027`)는 이 함수를 그대로 재사용해 포인트
카운터를 셉니다:

```ts
const isFullPoint = shouldUseSplitLayout(section);
const pointIndex = isFullPoint ? imageTextCount++ : undefined;
```

**라이브**(`components/DetailSectionRenderer.tsx:3756~3762`)는 같은 조건을 공유 함수
호출 대신 **직접 풀어쓴 조건식**으로 중복 작성했는데, 이때 `shouldUseEditorialBleed`
제외를 빠뜨렸습니다:

```ts
const isFullPoint =
  section.type === "image_text" &&
  section.layout !== "compact" &&
  section.layout !== "callout" &&
  section.slot !== "quick_points" &&
  section.slot !== "feature_callout";
const pointIndex = isFullPoint ? imageTextCount++ : undefined;
```

결과: 에디토리얼 블리드 섹션(예: `usage_scenario`)을 만나면 **라이브는 카운터를
1 증가시키고(배지는 안 보이지만 다음 섹션들의 번호가 하나씩 밀림), export는 증가시키지
않습니다.** 에디토리얼 블리드 이후에 나오는 일반 split 섹션은:

1. `POINT NN` 배지 숫자가 라이브·export에서 서로 다르게 표시되고,
2. `resolveSplitColumnRatio`/`resolveSplitFlexRatio`의 60:40 리듬 주기(`pointIndex % 3`)가
   어긋나 이미지:텍스트 비율이 서로 다르게 나오고,
3. `resolveSplitImageLeft`의 좌우 교대(`pointIndex % 2`)까지 어긋나 **이미지가 왼쪽/오른쪽
   반대로 뒤집혀 나올 수 있습니다.**

## 2. 직접 재현한 수치 (Node 샌드박스, 두 파일의 실제 조건식 그대로 시뮬레이션)

섹션 순서: `hero → feature_detail(일반) → usage_scenario(에디토리얼 블리드) →
material_detail(일반) → checklist → quality_detail(일반)` — 패션/생활용품 등에서
실제로 흔한 배열입니다.

| 섹션 | 라이브 pointIndex | export pointIndex |
|------|---|---|
| feature_detail | 0 (POINT 01) | 0 (POINT 01) — 일치 |
| usage_scenario | 1 (배지 자체는 안 보임) | — (카운트 안 함) |
| **material_detail** | **2 → "POINT 03", 60:40 주기=2, 이미지 왼쪽** | **1 → "POINT 02", 주기=1, 이미지 오른쪽** |
| **quality_detail** | **3 → "POINT 04", 주기=0** | **2 → "POINT 03", 주기=2** |

`material_detail`는 **번호도 다르고 이미지가 좌우로 뒤집혀** 나옵니다 — 사용자가 에디터
화면에서 보고 확인한 레이아웃과, 실제로 마켓에 올리는 export HTML의 레이아웃이 다른
셈입니다. 에디토리얼 블리드 슬롯 10개가 상당히 흔한 슬롯이라(사용 장면/코디/설치 장면 등)
실제 상품에서도 자주 발생할 수 있는 패턴으로 보입니다.

## 3. 수정 — `components/DetailSectionRenderer.tsx`만 변경 (export는 이미 정답)

**핵심 판단**: export의 `shouldUseSplitLayout()` 재사용 방식이 원래 의도(에디토리얼
블리드는 배지·리듬에서 제외)에 맞고, 라이브가 그걸 중복 작성하면서 빠뜨린 쪽입니다.
export는 손대지 않고, 라이브를 공유 함수 재사용으로 고쳐 애초에 이런 중복·드리프트가
다시 생기지 않게 합니다.

### 3-1. import에 `shouldUseSplitLayout` 추가 (22~29행)

**현재**:

```ts
import {
  formatSectionIndex,
  getSectionKicker,
  resolveSplitColumnRatio,
  resolveSplitImageLeft,
  shouldInsertBreather,
  shouldUseEditorialBleed,
} from "@/lib/detail-visual-rhythm";
```

**변경 후**:

```ts
import {
  formatSectionIndex,
  getSectionKicker,
  resolveSplitColumnRatio,
  resolveSplitImageLeft,
  shouldInsertBreather,
  shouldUseEditorialBleed,
  shouldUseSplitLayout,
} from "@/lib/detail-visual-rhythm";
```

(`shouldUseEditorialBleed`는 1818행 등 다른 곳에서 계속 쓰이므로 그대로 유지.)

### 3-2. `isFullPoint` 계산부 교체 (3756~3762행)

**현재**:

```ts
        const isFullPoint =
          section.type === "image_text" &&
          section.layout !== "compact" &&
          section.layout !== "callout" &&
          section.slot !== "quick_points" &&
          section.slot !== "feature_callout";
        const pointIndex = isFullPoint ? imageTextCount++ : undefined;
```

**변경 후**:

```ts
        // 224차 — export(lib/export-detail-html.ts)와 동일하게 shouldUseSplitLayout()을
        // 공유 재사용. 이전에는 이 조건을 직접 풀어써서 에디토리얼 블리드
        // (shouldUseEditorialBleed) 섹션을 카운트에서 빼먹었고, 그 결과 라이브·export의
        // POINT 번호·60:40 리듬·이미지 좌우가 에디토리얼 블리드 섹션 이후로 어긋났음.
        const isFullPoint = shouldUseSplitLayout(section);
        const pointIndex = isFullPoint ? imageTextCount++ : undefined;
```

**주의**: `shouldUseSplitLayout(section)`은 `section.type !== "image_text"`부터 먼저
검사하므로 어떤 섹션 타입에 호출해도 안전합니다(기존 동작과 100% 동일한 안전성).
이 변경은 정확히 "에디토리얼 블리드 섹션을 카운트에서 제외"하는 효과만 추가하고,
그 외의 어떤 섹션 조합에서도 기존 pointIndex 값을 바꾸지 않습니다(§4의 시뮬레이션으로
증명됨 — `shouldUseSplitLayout`을 export/라이브 양쪽에 넣고 돌리면 결과가 100% 동일).

## 4. 스코프 밖 (이번엔 건드리지 않음)

- `isAnnotated`(223차가 export에서 이미 "POINT 배지 숨김 + 고정 50/50"으로 맞춘 부분)는
  이번 변경과 무관 — `shouldUseSplitLayout`은 `annotated` 레이아웃을 배제하지 않으므로
  카운팅 동작 자체는 이전과 같습니다. 라이브·export 둘 다 이미 일치.
- `compactImageTextIndex`/`totalCompactImageTextCount`(별도 카운터, compact 썸네일용)는
  이 버그와 무관, 미변경.

## 5. 검증 방법 (API 0)

1. `npx tsc --noEmit` — 0 에러 확인.
2. 스크립트 작성(`scripts/224cha-point-counter-parity-verify.ts` 등):
   - `hero → image_text(feature_detail) → image_text(usage_scenario, 에디토리얼 블리드)
     → image_text(material_detail) → checklist → image_text(quality_detail)` 같은
     합성 섹션 배열(및 가능하면 실제 픽스처에서 에디토리얼 블리드 슬롯이 낀 경우)에 대해
     라이브의 `isFullPoint`/`pointIndex` 계산 로직과 export의 동일 로직을 **각각 그대로
     재구현/호출**해 두 쪽의 pointIndex 수열이 모든 섹션에서 정확히 일치하는지 확인
     (수정 전에는 불일치, 수정 후 일치해야 함 — before/after 둘 다 스크립트에 남길 것).
   - 에디토리얼 블리드가 전혀 없는 기존 섹션 배열(대부분의 기존 픽스처)에서는 수정 전후
     `pointIndex` 수열이 **완전히 동일**한지(회귀 없음) 확인.
3. 가능하면 에디토리얼 블리드 슬롯을 포함한 실제 세션 1개로 라이브 미리보기와 export한
   HTML을 나란히 스크린샷 — 에디토리얼 블리드 다음 섹션의 POINT 번호·이미지 좌우가 이제
   일치하는지 육안 확인.

## 6. 완료 기준

- [ ] `components/DetailSectionRenderer.tsx` import + `isFullPoint` 교체 (2곳)
- [ ] `export-detail-html.ts`는 무변경 확인
- [ ] `tsc` 0, 유료 API 0건
- [ ] 검증 스크립트(수정 전 불일치 → 수정 후 일치 증명) + 회귀 없음 확인
