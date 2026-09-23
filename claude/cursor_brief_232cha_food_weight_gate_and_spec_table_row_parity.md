# 232차 — FOOD 무게 비교 게이트 복구 + spec_table 라이브/익스포트 행 필터링 동기화

## 배경

231차(같은 발굴 기법 — `case "image_text":`의 다이어그램 게이트 도달 가능성 감사)가 3건의
실제 버그를 찾은 뒤, 같은 기법을 `case "spec_table":`(`components/DetailSectionRenderer.tsx`
1992행, `lib/export-detail-html.ts` 600행)에 재적용했다. 두 건의 구조적 문제를 발견·검증·수정했다.

이번 라운드는 순수 코드/결정론적 로직 수정이며 유료 생성 API 호출은 0건이다
(사용자의 "코딩으로 해결" 지시를 그대로 따름).

---

## Finding 1 — WeightComparisonDiagram이 FOOD 카테고리에서 구조적으로 도달 불가

`lib/weight-comparison-diagram.ts` 헤더 주석(162차, 원문):

> "무게는 전자/가전·식품·반려동물·생활용품 스펙 표에 가장 흔하게 등장하는 값인데도
> 이 패턴이 아직 없었음"

즉 식품(FOOD) 커버리지가 명시적 설계 의도였다. 그런데 게이트 조건은:

```ts
const weightMatch =
  section.slot === "spec_table" && !isFashionCategory(category)
    ? matchWeightComparisonRow(visibleRows)
    : null;
```

`lib/section-templates.ts`의 6개 카테고리 스펙성 슬롯 이름을 전수 확인(grep으로 각
`type: "spec_table"` 매치 직전 객체의 `slot:` 필드 추출):

| 카테고리 | 실제 spec 슬롯 이름 |
|---|---|
| BEAUTY | `spec_table` |
| FASHION | `size_table` |
| **FOOD** | **`nutrition_table`** |
| ELECTRONICS | `spec_table` |
| PET | `spec_table` |
| HOME_FALLBACK(생활·리빙) | `spec_table` |

FOOD는 `nutrition_table`이지 `spec_table`이 아니다. 따라서 `section.slot === "spec_table"`
조건은 FOOD에서 단 한 번도 참이 될 수 없다 — 실측 무게(예: "중량 450g")가 입력에 있어도
무게 비교 다이어그램은 절대 렌더되지 않는다. `WEIGHT_REFERENCE_POINTS`는 조사값이 아닌
고정 공개 기준값이므로(헤더 주석: "지어내기 아님") 이 확장은 데이터 조작이 아니다.

**분류**: 버그(코드만으로 수정 가능, 도달 가능성 확인 완료).
**범위 제한**: `noiseMatch`/`waterproofMatch`/`powerMatch`/`sizeComparisonDims`는 FOOD로
확장하지 않는다 — 이들은 카테고리 무관 설계(소음/방수)이거나 FOOD는 이미
`FoodRatioDiagram`(다른 케이스)으로 커버되고 있어, FOOD 헤더 주석이 명시적으로 대상을
밝힌 `weightMatch`만 좁게 확장한다(억지 구현 방지).

### 수정 1a — `components/DetailSectionRenderer.tsx` (라이브)

```diff
       // 162차 — 무게(g/kg)도 같은 패턴으로 확장. 전자/식품/반려동물/생활용품 스펙에
       // 가장 흔하지만 이 패턴이 없었음(신용카드·사과 등 체감 기준으로 비교).
+      // 232차 — FOOD는 스펙성 슬롯 이름이 spec_table이 아니라 nutrition_table이라
+      // 위 조건이 한 번도 매칭되지 않았음(162차 주석이 명시한 "식품" 대상이 실제로는
+      // 도달 불가였던 구조적 누락). nutrition_table을 FOOD 한정으로 추가.
       const weightMatch =
-        section.slot === "spec_table" && !isFashionCategory(category)
+        (section.slot === "spec_table" ||
+          (isFoodCategory(category) && section.slot === "nutrition_table")) &&
+        !isFashionCategory(category)
           ? matchWeightComparisonRow(visibleRows)
           : null;
```

`isFoodCategory`는 이미 이 파일에서 import되어 사용 중(`sourcing_story` 게이트).

### 수정 1b — `lib/export-detail-html.ts` (익스포트)

동일한 확장(Finding 2의 `visibleRows` 필터링과 결합됨 — 아래 참고):

```diff
       // 162차 — 무게(g/kg) 공개 기준표. 소음/방수와 같은 패밀리, 카테고리 무관.
+      // 232차 — FOOD는 스펙성 슬롯이 spec_table이 아니라 nutrition_table이라 이 게이트가
+      // 한 번도 매칭되지 않았음(162차 주석이 명시한 대상에 식품 포함). FOOD 한정으로 추가.
       const weightMatch =
-        section.slot === "spec_table" && !isFashionCategory(category)
-          ? matchWeightComparisonRow(section.rows)
+        (section.slot === "spec_table" ||
+          (isFoodCategory(category) && section.slot === "nutrition_table")) &&
+        !isFashionCategory(category)
+          ? matchWeightComparisonRow(visibleRows)
           : null;
```

`isFoodCategory`는 이미 이 파일에서 import되어 있음(70행).

---

## Finding 2 — spec_table 라이브/익스포트 행 필터링 불일치 (유령 다이어그램 위험 + 표시 차이)

라이브(`DetailSectionRenderer.tsx` 1993-1994행)는 케이스 진입 즉시 빈 라벨 행을 걸러낸다:

```ts
const visibleRows = section.rows.filter((row) => row.label.trim());
if (visibleRows.length === 0) return null;
```

이후 6개 매처(`sizeComparisonDims`/`volumeEntries`/`noiseMatch`/`waterproofMatch`/
`weightMatch`/`powerMatch`)와 테이블 렌더링 모두 `visibleRows`만 사용한다.

`export-detail-html.ts`의 동일 케이스는 이 필터링이 전혀 없었다 — 6개 매처 호출부와
테이블 바디 생성부(`rowsHtml`, 718행)가 전부 원본 `section.rows`를 그대로 사용했다.

결과적으로 두 가지 문제:

1. **표시 차이**: 빈 라벨 행이 라이브 에디터에는 안 보이지만 내보낸 HTML 표에는
   빈 `<th>` 셀로 그대로 나타남.
2. **유령 다이어그램 위험**(더 심각): `rowLooksLikeWeight()`의 별칭 매칭은
   `alias.includes(n)` 방식이라, `n`(정규화된 라벨)이 빈 문자열이면 JS에서
   `alias.includes("")`가 **항상 true**다. 즉 빈 라벨 행은 "무게처럼 보이는 라벨"로
   항상 통과된다. 값(`value`) 필드가 우연히 무게로 파싱 가능한 텍스트를 담고 있으면
   (예: 라벨은 비었는데 값은 `"1개당 250g 소분 포장"`처럼 남아있는 경우) 익스포트에서만
   무게 비교 다이어그램이 뜨고 라이브 에디터에는 뜨지 않는 라이브/익스포트 불일치가
   발생한다.

샌드박스에서 실제 스테이징된 `weight-comparison-diagram.ts`(esbuild로 CJS 번들, 수정
없이 원본 그대로)를 불러와 재현:

```
rawRows = [{label:"", value:"1개당 250g 소분 포장"}, {label:"원산지", value:"국내산"}]

기존(필터 없음): matchWeightComparisonRow(rawRows)
  => { label: '', value: '1개당 250g 소분 포장', g: 250 }   ← 유령 다이어그램 발생 확인

수정 후(visibleRows 필터 적용): matchWeightComparisonRow(visibleRows)
  => null   ← 라이브와 일치
```

**분류**: 버그(라이브/익스포트 동등성 원칙 위반, 코드만으로 수정 가능).

### 수정 2 — `lib/export-detail-html.ts`

케이스 진입부에 라이브와 동일한 필터/가드 추가(파일 전체에서 이미 쓰이는
"내용 없으면 `return \"\";`" 관례를 그대로 따름 — 예: `highlight_box` 케이스 252행):

```diff
     case "spec_table": {
+      // 232차 — live는 빈 라벨 행을 매처/테이블에 넘기기 전에 걸러내는데(visibleRows)
+      // export에는 이 필터가 없었음. 빈 라벨 행은 별칭 매칭이 항상 참이 되는 구조라
+      // (rowLooksLikeWeight의 alias.includes("")) 라이브에는 안 뜨고 export에만 뜨는
+      // 유령 다이어그램 위험이 있었음. live와 동일하게 필터링.
+      const visibleRows = section.rows.filter((row) => row.label.trim());
+      if (visibleRows.length === 0) return "";
       const isShipping = section.slot === "shipping_info";
       const isSizeTable = section.slot === "size_table";
       const sizeMatches =
         isSizeTable && isFashionCategory(category)
-          ? matchSizeDiagramRows(section.rows)
+          ? matchSizeDiagramRows(visibleRows)
           : [];
       const comparisonDims =
         section.slot === "spec_table" && !isFashionCategory(category)
-          ? matchSizeComparisonRows(section.rows)
+          ? matchSizeComparisonRows(visibleRows)
           : [];
       const volumeEntries =
         section.slot === "spec_table" && isCosmeticsCategory(category)
-          ? buildVolumeComparisonEntries(matchProductVolumeMl(section.rows))
+          ? buildVolumeComparisonEntries(matchProductVolumeMl(visibleRows))
           : null;
       ...
       const noiseMatch =
         section.slot === "spec_table" && !isFashionCategory(category)
-          ? matchNoiseComparisonRow(section.rows)
+          ? matchNoiseComparisonRow(visibleRows)
           : null;
       ...
       const waterproofMatch =
         section.slot === "spec_table" && !isFashionCategory(category)
-          ? matchWaterproofIpRow(section.rows)
+          ? matchWaterproofIpRow(visibleRows)
           : null;
       ...
       const powerMatch =
         section.slot === "spec_table" && !isFashionCategory(category)
-          ? matchPowerComparisonRow(section.rows)
+          ? matchPowerComparisonRow(visibleRows)
           : null;
       ...
       const rowsHtml = section.rows
+      const rowsHtml = visibleRows
         .map((row, ri) => {
           ...
```

(`weightMatch`의 `section.rows` → `visibleRows` 치환은 Finding 1의 diff에 이미 포함됨.)

`foodSlices`(619-625행, FoodRatioDiagram)는 `section.rows`를 쓰지 않으므로 변경 대상 아님
— 229차부터 이미 죽은 코드로 플래그된 상태를 그대로 둔다(Finding 3, 아래 참고, 이번
라운드 범위 아님).

---

## Finding 3 (참고, 이번 라운드 수정 대상 아님)

`export-detail-html.ts` 619-625행의 `foodSlices`/`FoodRatioDiagram` 분기는 229차에서 이미
죽은 코드로 플래그되었고 아직 정리되지 않은 상태다. 이번 라운드의 Finding 1/2와 독립적인
이슈이며, 범위 확장을 피하기 위해 이번에는 건드리지 않는다.

---

## 포함하지 않는 것 (억지 구현 방지)

- `noiseMatch`/`waterproofMatch`/`powerMatch`/`sizeComparisonDims`를 FOOD로 확장하지
  않는다 — 이들은 카테고리 무관 설계이거나(소음/방수) FOOD는 이미 다른 다이어그램으로
  커버됨. `weightMatch`만 헤더 주석의 명시적 의도를 근거로 좁게 확장한다.
- `isMainSpecTable`(라이브)/`specTableBg`(익스포트) 등 `spec_table` 전용 배경 스타일링을
  `nutrition_table`로 확장하지 않는다 — 이는 취향 차이 영역이고 이번 두 버그와 무관하다.
- Finding 3(죽은 FOOD `foodSlices` 분기)은 정리하지 않는다 — 이번 라운드 범위 밖.
- FASHION은 `weightMatch` 확장 대상에서 명시적으로 제외 유지(`!isFashionCategory`).

---

## 검증 절차 (Cursor 실행 후 필수)

1. **구문 검사** (필수, 반드시 실행하고 결과 첨부):
   ```
   npx esbuild lib/export-detail-html.ts --bundle=false --format=esm --outfile=/dev/null
   npx esbuild components/DetailSectionRenderer.tsx --bundle=false --format=esm --loader:.tsx=tsx --outfile=/dev/null
   ```
2. **결정론적 단위 테스트** (유료 API 없음): `lib/weight-comparison-diagram.ts`를
   그대로 import(수정 없이)해서 아래 3가지를 스크립트로 확인, 콘솔 출력 스크린샷 또는
   로그 첨부:
   - FOOD 카테고리, slot=`nutrition_table`, 행 `[{label:"중량", value:"450g"}]` →
     새 게이트가 `matchWeightComparisonRow`를 호출해 `{g:450}` 매치가 나오는지.
   - 위와 동일하되 slot=`spec_table`(구 동작 유지 확인)도 여전히 매치되는지.
   - `[{label:"", value:"1개당 250g 소분 포장"}, {label:"원산지", value:"국내산"}]`를
     기존 코드(필터 없음)에 넣으면 유령 매치가 나고, `visibleRows` 필터 적용 후에는
     `null`이 되는지 — 라이브/익스포트 동등성 재현.
3. **실사용 데이터로 export HTML 스냅샷**: FOOD 카테고리 상품 1개를 실제로 생성(이미
   생성된 기존 상품 재사용 가능, 신규 생성 API 호출 불필요)해서 export HTML에
   `weight-comparison` 관련 SVG/텍스트(예: "무게 비교" 타이틀 문자열)가 나타나는지
   grep으로 확인. 스크린샷 1장 첨부.
4. **회귀 확인**: 기존에 `weightMatch`가 이미 동작하던 카테고리(전자/가전, PET,
   생활·리빙의 `spec_table`)의 export HTML에서 무게 비교 다이어그램이 이전과 동일하게
   나오는지(카운트 비교) 확인 — 이번 변경이 기존 동작을 깨지 않았음을 증명.
5. 유료 생성 API(Replicate/Claude/DeepSeek, `/api/generate`) 호출 0건 — 스크립트/로그에
   해당 엔드포인트 호출이 없음을 재확인.

작업 파일: `lib/export-detail-html.ts`, `components/DetailSectionRenderer.tsx`만 수정.
그 외 파일(특히 `lib/section-display-budget.ts`, `lib/weight-comparison-diagram.ts` 등)은
이번 라운드 범위 밖 — 수정하지 말 것.
