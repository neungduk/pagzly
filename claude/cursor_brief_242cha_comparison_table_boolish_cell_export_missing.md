# 242차 — comparison_table의 "있음/없음"류 셀이 export에서 체크/X 배지가 아닌 맨 텍스트로 나오는 버그 수정

생성: 2026-09-23 · 유료 API **불필요** · 파일 3개(신규 1 + 수정 2)

## 한줄 결론

`comparison_table`(우리 제품 vs 비교 대상 2열 표) 셀 값이 "있음"/"없음"/"지원"/"O"/"X" 류 불린성 텍스트일 때, 라이브는 원형 체크(✓)/X 배지로 렌더링하지만 export는 이 판정 로직이 아예 없어 항상 맨 텍스트로 나옴. `comparison_table`은 코드 주석(`lib/types/generate.ts:260`)에 "불린/텍스트 2열"로 명시된 이 섹션의 **설계 의도 그 자체**인데 export만 그 핵심 표현을 놓치고 있음 — 241차와 같은 결함 계열(같은 날 React 컴포넌트 전수 대조 축에서 연속 발견).

---

## 1. 근거 (코드로 확인 완료)

- `lib/types/generate.ts:260` — "comparison_table(**불린/텍스트 2열** 비교) vs comparison_chart(수치 기반 바 차트)"로 두 섹션의 역할이 명시적으로 구분돼 있음. `comparison_table`의 셀 값이 "있음"/"없음"류 불린성 텍스트인 것은 예외가 아니라 이 섹션 타입의 핵심 용도.
- `components/DetailSectionRenderer.tsx:356-374` — `classifyBoolishCell(value)`가 정규식으로 `"o"|"ㅇ"|"예"|"있음"|"지원"|"가능"|"포함"|"✓"|"✔"|"yes"|"true"|"y"|"○"|"●"` → `"yes"`, `"x"|"ㄴ"|"아니오"|"없음"|"미지원"|"불가"|"미포함"|"✗"|"✘"|"no"|"false"|"n"|"×"|"✕"` → `"no"`, 그 외 `null`로 분류.
- `components/DetailSectionRenderer.tsx:376-408` — `ComparisonValueCell`이 `classifyBoolishCell` 결과에 따라 `"yes"`면 accent 틴트 원형 배지+체크 아이콘(`h-7 w-7`=28px, `emphasized`일 때 배경 0.2 vs 0.12 알파), `"no"`면 회색 원형 배지+X 아이콘, `null`이면 맨 텍스트. `comparison_table` case(2321·2329행)에서 두 값 열(`row.values[0]`/`row.values[1]`) 각각에 호출.
- `lib/export-detail-html.ts`의 `case "comparison_table":`(현재 880행대)는 `esc(row.values[0])`/`esc(row.values[1])`을 그대로 `<td>`에 꽂을 뿐 — `classifyBoolishCell` 상당 로직이 export 전체에 grep 0건. `classifyBoolishCell`은 `DetailSectionRenderer.tsx` 내부 비export 지역 함수 하나뿐이라 애초에 import도 불가능한 상태였음.
- 참고로 `comparison_chart`의 checklist 스타일(`presentationStyle:"checklist"`)은 이미 export에 ✓/✗ 표현이 있지만(`comparisonChecklistPresent(value:number)`, `lib/comparison-chart-guard.ts`), 그건 **숫자(0/100 플래그) 기반**의 완전히 다른 함수 — `comparison_table`의 **자유 텍스트** 판정과는 무관해 재사용 불가. 별도 구현 필요.

---

## 2. 수정 — 재사용 가능하게 공유 파일로 추출(240차와 동일 원칙: 새 로직 설계 대신 기존 로직 재사용)

### 신규 `lib/comparison-cell-classify.ts`

`DetailSectionRenderer.tsx`의 `classifyBoolishCell` 본문을 정확히 그대로 옮김(로직 무변경):

```ts
/** comparison_table 셀 값이 "있음/없음"류 불린성 텍스트인지 판정.
 * DetailSectionRenderer.tsx(라이브)·export-detail-html.ts(export) 공용 — 242차 추출. */
export function classifyBoolishCell(value: string): "yes" | "no" | null {
  const t = value.trim().toLowerCase();
  if (!t) return null;
  if (
    /^(o|ㅇ|예|있음|지원|가능|포함|✓|✔|yes|true|y)$/i.test(t) ||
    t === "○" ||
    t === "●"
  ) {
    return "yes";
  }
  if (
    /^(x|ㄴ|아니오|없음|미지원|불가|미포함|✗|✘|no|false|n)$/i.test(t) ||
    t === "×" ||
    t === "✕"
  ) {
    return "no";
  }
  return null;
}
```

### `components/DetailSectionRenderer.tsx` — 지역 함수 제거, import로 교체(동작 무변경)

356~374행의 `function classifyBoolishCell(...) {...}` 정의를 삭제하고, 파일 상단 import 목록에 추가:

```ts
import { classifyBoolishCell } from "@/lib/comparison-cell-classify";
```

`ComparisonValueCell`(376행~)은 이 함수를 그대로 호출하던 코드라 **본문은 한 글자도 안 바뀜** — 정의 위치만 옮겨졌을 뿐.

### `lib/export-detail-html.ts` — `case "comparison_table":`에 배지 렌더링 추가

파일 상단 import에 추가:

```ts
import { classifyBoolishCell } from "@/lib/comparison-cell-classify";
```

`case "comparison_table":` 블록 최상단(return 직전)에 헬퍼 추가:

```ts
    case "comparison_table": {
      // 242차 — 라이브 ComparisonValueCell과 동일 판정(공유 lib/comparison-cell-classify.ts)+
      // 동일 시각(28px 원형 배지, accent 틴트/회색, 체크·X)을 export에도 배선.
      const comparisonCellHtml = (value: string, emphasized: boolean) => {
        const kind = classifyBoolishCell(value);
        if (kind === "yes") {
          return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${hexToRgba(accent, emphasized ? 0.2 : 0.12)}" aria-label="${esc(value)}"><span aria-hidden="true" style="color:${deepText};font-size:14px;font-weight:700;line-height:1">&#10003;</span></span>`;
        }
        if (kind === "no") {
          return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:rgba(27,27,24,0.05)" aria-label="${esc(value)}"><span aria-hidden="true" style="color:rgba(27,27,24,0.35);font-size:13px;font-weight:600;line-height:1">&#10005;</span></span>`;
        }
        return esc(value);
      };
      return `<section${sectionIdAttr} style="${pad}${sectionInset}${bgCss}">
```

(이 아래 기존 `<p>COMPARE</p>`부터 `</section>` 템플릿 리터럴은 그대로 두되, 본문 안의 두 곳만 교체:)

```diff
-                    <td style="padding:12px">${esc(row.values[0])}</td>
-                    <td style="padding:12px;font-weight:600;background:${accent}14">${esc(row.values[1])}</td>
+                    <td style="padding:12px">${comparisonCellHtml(row.values[0], false)}</td>
+                    <td style="padding:12px;font-weight:600;background:${accent}14">${comparisonCellHtml(row.values[1], true)}</td>
```

`emphasized` 값(`false`/`true`)은 라이브가 열1/열2에 각각 넘기는 것과 동일 — 열2(우리 제품 열)만 배지 배경 알파가 0.12→0.2로 살짝 진해짐, 텍스트 폴백은 outer `<td>`의 기존 `font-weight:600`이 그대로 적용돼 라이브의 `emphasized`일 때 볼드 처리와 동일한 결과. 아이콘은 체크(`&#10003;` ✓)/X(`&#10005;` ✗) HTML 엔티티 — 기존 `comparison_chart` checklist 스타일이 이미 쓰던 유니코드 글리프 표현 관례(라이브 lucide 아이콘의 픽셀 재현이 아니라 export 전체가 일관되게 써온 "원형 배지+유니코드 글리프" 패턴)를 그대로 따름, 신규 시각 언어 도입 아님.

`accent`/`deepText`/`hexToRgba`/`esc`는 `sectionHtml` 함수 스코프에 이미 있는 기존 바인딩 — 추가 import 불필요.

---

## 3. 검증 스크립트 스펙 — `scripts/242cha-comparison-table-boolish-verify.ts`

유료 API 불필요. `npx tsx scripts/242cha-comparison-table-boolish-verify.ts`로 실행:

1. **유닛 — `classifyBoolishCell` 동일성**: 추출 전/후 동작이 완전히 같은지, "있음"/"없음"/"지원"/"미지원"/"O"/"X"/"예"/"아니오"/"✓"/"✗"/공백/일반 텍스트("3.5kg", "무료배송") 등 20+ 케이스로 확인 — `yes`/`no`/`null` 분류가 라이브 원본 정규식과 정확히 일치(추출은 복붙이라 당연히 일치해야 하나, 실수로 글자가 달라지지 않았는지 기계적으로 재확인).
2. **`buildDetailPageHtml()` 실제 호출 — 혼합 픽스처**: `comparison_table` rows에 `["있음","없음"]`/`["지원","미지원"]`/`["O","X"]`(불린성) + `["3.5kg","2.1kg"]`(일반 텍스트, 배지 없이 그대로) 섞어서 실제 export 함수 호출.
   - 불린성 행 3개 × 2열 = 배지(`border-radius:9999px`) 6개 존재, 일반 텍스트 행은 배지 없이 `esc()` 그대로(예: "3.5kg" 텍스트가 배지 없이 존재) 확인.
   - "있음"/"O"/"지원" 등 `"yes"`류는 체크 글리프(`&#10003;`), "없음"/"X"/"미지원" 등은 X 글리프(`&#10005;`) 정확히 매칭되는 개수로 존재.
   - 열2(emphasized) 배지의 `background` 알파가 열1보다 진한지(0.2 vs 0.12) 문자열 대조.
3. **회귀 — `comparison_chart`(같은 파일 다른 case)의 checklist ✓/✗ 표현 무변경** — 이번 수정과 무관한 영역이므로 출력 바이트 동일 확인.
4. **`components/DetailSectionRenderer.tsx` 회귀** — `classifyBoolishCell` 추출 후에도 `ComparisonValueCell`이 같은 결과를 내는지, `npx tsc --noEmit`(또는 esbuild 구문 검증)으로 타입 에러 없는지 확인. `npx esbuild`로 `lib/comparison-cell-classify.ts`·`lib/export-detail-html.ts` 둘 다 구문 검증.
5. Playwright로 export HTML을 렌더해 배지 스크린샷 1장(`comparison-table-badges-export.png`) — 합성 픽스처로 충분, 유료 API 불필요.

---

## 4. 회귀 확인 항목

- `comparison_chart`(체크리스트/바 스타일 둘 다)는 이번 수정과 무관한 별도 case — 영향 없음 재확인.
- `comparison_table`의 기존 헤더·행 스트라이프·`accent14` 배경 등 레이아웃은 무변경(셀 내용물만 교체).
- `ComparisonValueCell`을 호출하는 라이브 쪽 호출부 2곳(2321·2329행)이 추출 후에도 동일 import 경로로 정상 동작.

유료 API 0건(조사·수정·검증 스크립트 전부).
