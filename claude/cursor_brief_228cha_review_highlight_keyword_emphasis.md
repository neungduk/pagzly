# Cursor 실행 브리프 228차 — 리뷰 하이라이트 핵심 키워드 인라인 강조

생성: 2026-09-22 · 관련 조사: `claude/228cha-designer-hookable-benchmark-findings.md` §2(A)-1

## 절대 제약 (필독)

- **유료 API 호출 금지.** DeepSeek/Replicate/Claude 호출 신규 추가 없음. `/api/generate` 로직
  변경 없음. 이번 작업은 **이미 계산된 값을 다르게 표시**하는 것뿐입니다.
- 신규 입력 필드 없음. `ReviewHighlightSection` 타입에 필드 추가 없음(아래 구현은 기존
  `praises`/`concerns`/`praiseMatchCounts`/`complaintMatchCounts`만 사용).
- `lib/section-inserts.ts`, `app/api/generate/route.ts`, 컴플라이언스 모듈(`lib/*-compliance.ts`
  등), `lib/types/generate.ts` — **건드리지 않음.**
- anti-fabrication: 실제 리뷰 원문과 한 번도 매칭되지 않은 문구는 강조하지 않음
  (`matchCount === 0`인 praise/concern은 지금처럼 배지도 강조도 없이 평문 그대로).

## 배경

`lib/review-insights.ts`의 `extractCoreKeywords(text)`는 이미 각 praise/complaint 문장에서
핵심 키워드(2자 이상 토큰, 최대 4개)를 뽑아 실제 리뷰 원문 라인과 대조(`matchingLines` →
`countLineMatches`)하는 데 쓰이고 있습니다. 그 결과가 `praiseMatchCounts`/`complaintMatchCounts`로
섹션에 저장돼 있고, 지금은 렌더러에서 "N건 언급" 배지로만 노출됩니다. 실제 매칭이 있었던
문장인데도 어떤 단어 때문에 매칭됐는지는 시각적으로 전혀 드러나지 않습니다.

Behance 레퍼런스("주방 가전 상세페이지 디자인", OHMY SOOJIN)의 `#리얼후기` 섹션은 리뷰 문장
안에서 핵심 구절에 노란 형광펜 스타일 배경을 입혀 가독성과 신뢰감을 높입니다. Pagzly는
가짜 개인 리뷰(별점·사진·이름)를 절대 만들지 않는다는 원칙(226차 확정)은 그대로 유지하되,
**이미 집계된 요약 문장(`praises`)의 타이포그래피 표현만** 이 패턴을 따라갈 수 있습니다 —
신규 데이터도, 신규 AI 판단도 필요 없는 순수 표시 로직 변경입니다.

## 구현 상세

### 1) `lib/review-insights.ts` — 텍스트 분할 헬퍼 추가 (신규 함수만 추가, 기존 함수 변경 없음)

`extractCoreKeywords` 바로 아래에 다음을 추가합니다. 라이브 렌더러와 export HTML 렌더러가
동일한 로직을 각자 재구현하며 갈라지는 걸 막기 위해, "텍스트를 키워드 기준으로 조각내는" 순수
문자열 로직만 여기 하나로 공유합니다(JSX/HTML 생성은 각 렌더러가 각자의 방식으로 담당).

```ts
export type HighlightSegment = { text: string; isKeyword: boolean };

/** praise/complaint 텍스트를 extractCoreKeywords 기준으로 조각냄.
 *  matchCount > 0 인 항목에서만 렌더러가 이 결과로 강조 표시를 만든다 —
 *  실제 리뷰 원문과 매칭된 적 있는 문장에서만 사용해야 anti-fabrication 원칙과 충돌하지 않음.
 *  키워드 자체는 extractCoreKeywords와 동일(문장을 쪼갠 것) — 새로 짓지 않음. */
export function splitTextByKeywords(text: string): HighlightSegment[] {
  const keywords = extractCoreKeywords(text);
  if (keywords.length === 0) return [{ text, isKeyword: false }];
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, isKeyword: sorted.includes(part) }));
}
```

- 키워드를 길이 내림차순으로 정렬 후 정규식 alternation을 구성하는 이유: 짧은 키워드가 긴
  키워드의 일부를 먼저 가로채 조각내는 걸 방지.
- 정규식 특수문자는 이스케이프 처리(키워드에 `.`, `(` 등이 섞여도 안전).
- 빈 문자열 조각은 필터링.
- 키워드가 하나도 없으면(이론상 거의 없음) 원문 그대로 단일 세그먼트 반환 — 호출부에서
  분기 없이 그대로 map 가능.

### 2) `components/DetailSectionRenderer.tsx` — 라이브 렌더러

`case "review_highlight":` 블록 상단에 import 추가:

```ts
import { splitTextByKeywords } from "@/lib/review-insights";
```

praise 카드(약 3296~3304행, `EditableText`로 `item.text`를 렌더하는 부분) 바로 아래 —
**편집 모드가 아닐 때만** 강조 버전을 추가로 보여주는 게 아니라, 강조는 **텍스트 표시 자체를
대체**합니다. `EditableText`는 plain string `value`를 받아 contentEditable을 다루므로, 커스텀
`<span>` 자식을 주입하면 편집 동작이 깨집니다. 따라서:

- **편집 모드(`edit?.enabled === true`)**: 기존 `EditableText` 그대로 유지(변경 없음) — 편집
  중에는 강조 표시를 하지 않음.
- **읽기 모드(`edit?.enabled` 가 falsy)이고 `item.matchCount > 0`**: `EditableText` 대신 아래
  방식으로 강조된 `<p>`를 렌더링.
- **읽기 모드이고 `matchCount === 0`**: 지금처럼 평문 `<p>` (강조 없음).

```tsx
{edit?.enabled ? (
  <EditableText
    as="p"
    multiline
    enabled={edit.enabled}
    value={item.text}
    onChange={(next) => {
      const nextPraises = [...section.praises];
      nextPraises[item.originalIndex] = next;
      edit?.onChange(index, { ...section, praises: nextPraises });
    }}
    className={`${TYPO.body} text-ink/80`}
  />
) : (
  <p className={`${TYPO.body} text-ink/80`}>
    {item.matchCount > 0
      ? splitTextByKeywords(item.text).map((seg, segIdx) =>
          seg.isKeyword ? (
            <span
              key={segIdx}
              style={{ backgroundColor: theme.accentSoft, borderRadius: 3, padding: "0 2px" }}
            >
              {seg.text}
            </span>
          ) : (
            <Fragment key={segIdx}>{seg.text}</Fragment>
          ),
        )
      : item.text}
  </p>
)}
```

- `theme.accentSoft`는 `CategoryTheme`에 이미 존재하는 카테고리별 옅은 배경 토큰(신규 색상
  아님) — `lib/category-theme.ts` 확인 완료, 이 렌더러 상단에서 이미 `theme` 변수로 접근 가능.
- `Fragment`는 파일 최상단에 이미 import돼 있음(1행 `import { Fragment, ... } from "react"`) —
  추가 import 불필요.
- concern(아쉬운 점) 목록도 동일 패턴 적용 — 약 3320행 이후 concern 카드의
  `EditableText`/`item.text` 부분에 동일하게 `edit?.enabled` 분기 + `item.matchCount > 0` 게이팅
  + `splitTextByKeywords` 적용.

### 3) `lib/export-detail-html.ts` — export 정적 HTML 렌더러

`case "review_highlight":` 블록 상단에 import 추가(다른 `@/lib/...` import들과 함께):

```ts
import { splitTextByKeywords } from "@/lib/review-insights";
```

praise 카드 템플릿(약 984~990행)의 `<p style="...">${esc(item.text)}</p>` 부분을 아래로 교체:

```ts
const praiseTextHtml = (text: string, matchCount: number): string =>
  matchCount > 0
    ? splitTextByKeywords(text)
        .map((seg) =>
          seg.isKeyword
            ? `<span style="background:${theme.accentSoft};border-radius:3px;padding:0 2px">${esc(seg.text)}</span>`
            : esc(seg.text),
        )
        .join("")
    : esc(text);
```

이 헬퍼를 `case "review_highlight":` 블록 내부(praiseItems.map 이전)에 선언하고, praise 카드
템플릿에서 `${esc(item.text)}` 대신 `${praiseTextHtml(item.text, item.matchCount)}`를 사용합니다.
concern 목록(약 961~968행, `${esc(c.text)}` 부분)도 동일하게 `praiseTextHtml(c.text,
c.matchCount)`로 교체(함수명은 praise/concern 공용이므로 그대로 재사용 가능).

- **이스케이프 순서 주의**: 원문을 통째로 `esc()`한 뒤 키워드로 split하면 안 됩니다(HTML 엔티티가
  깨진 위치에서 잘릴 수 있음). 반드시 **원문 문자열을 먼저 `splitTextByKeywords`로 자른 뒤, 각
  조각을 개별적으로 `esc()`**해야 합니다 — 위 헬퍼는 이 순서를 지키고 있습니다.
- `theme.accentSoft`는 이 함수 스코프에 이미 `theme: CategoryTheme` 파라미터로 들어와 있음
  (`accent`/`accentText`/`deepFill` 등을 이미 `theme.*`에서 꺼내 쓰는 것과 동일한 방식) —
  신규 변수 추출 불필요, `theme.accentSoft`로 바로 참조.

## 스코프 제외 (이번엔 손대지 않음)

- 별점/실사용자 사진 — 226차 확정대로 채택 안 함(변경 없음).
- 조리 가이드 캡션 박스, 실사진 치수선 오버레이, 레퍼런스 URL 입력 — 228차 조사 문서 §5에
  후보로만 기록, 이번 브리프 범위 아님.

## 검증 요청 (완료 후 보고에 포함)

1. **단위 테스트**(`splitTextByKeywords`): 아래 케이스를 포함한 독립 테스트 스크립트로 직접
   staging된 실파일을 import해서 검증(자체 재구현 금지 — 반드시 실제 `lib/review-insights.ts`를
   import):
   - 키워드가 문장 여러 곳에 흩어진 경우 세그먼트 순서/개수가 원문과 정확히 일치(전체 세그먼트
     text를 이어붙이면 원문과 동일해야 함 — 이 불변식이 가장 중요).
   - 키워드 0개(짧은 문장 등)일 때 단일 세그먼트로 원문 그대로 반환.
   - 정규식 특수문자가 포함된 키워드(예: 숫자+단위 "210g" 등)가 있어도 에러 없이 동작.
   - 긴 키워드와 그 부분 문자열인 짧은 키워드가 동시에 추출됐을 때 긴 쪽이 우선 매칭됨.
2. **`npx esbuild <file> --bundle=false --format=esm --loader:.tsx=tsx --outfile=/dev/null`**로
   3개 파일(`lib/review-insights.ts`, `components/DetailSectionRenderer.tsx`,
   `lib/export-detail-html.ts`) 문법 체크.
3. **편집 모드 확인**: `edit?.enabled === true`일 때 praise/concern 텍스트가 여전히
   `EditableText`로 정상 편집 가능한지(강조 span이 주입되지 않는지) 스크린샷 또는 수동 확인.
4. **라이브 + export 스크린샷 비교**: `matchCount > 0`인 praise가 있는 실제 상품(기존 세션
   데이터 재사용 가능, 신규 생성 호출 금지)으로 라이브 렌더와 export HTML을 각각 캡처해
   키워드 강조가 동일하게 보이는지, `matchCount === 0`인 항목은 강조 없이 그대로인지 확인.
5. **다른 섹션 타입에 영향 없음 확인**: `review_highlight` 외 섹션 렌더링에 diff가 없는지
   git diff로 최종 확인(변경 파일이 정확히 3개 — `lib/review-insights.ts`,
   `components/DetailSectionRenderer.tsx`, `lib/export-detail-html.ts` — 인지 확인).

## 완료 기준

- 위 3개 파일 외 변경 없음.
- 신규 API 호출 0건(코드 검색으로 `/api/generate`, `fetch(...deepseek...)`,
  `fetch(...replicate...)` 등 호출부에 diff 없음을 확인해 보고에 포함).
- `matchCount > 0`인 praise/concern만 강조, 나머지는 기존과 동일.
- 편집 모드 동작 불변.
