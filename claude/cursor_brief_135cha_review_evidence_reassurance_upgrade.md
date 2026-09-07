# 135차 — 후커블 상회 목표: 리뷰 근거 결정론적 카운트 + 입력 기반 안심 카피 (신규 유료 API 호출 없음)

생성: 2026-09-07

## 배경 (사용자 원문)

> "다음 상세페이지 업그레이드 지시사항 알려줘 계속 후커블과 비슷한 수준이 아닌 더 나은 수준까지 발전시켜야해"

전제 문서: `claude/marketplace_crawl_findings_2026-09-07.md` (지마켓/옥션/후커블 실제 상세페이지 크롤링,
9/7 확보). 그 문서 §3.1/§3.2/§3.3에서 "조사만 하고 채택 판단만 기록, 구현은 다음 라운드"로 남겨둔
항목들을 이번에 안전한 범위로 구현합니다. 133차에서 §3.3(리뷰 건수 노출)의 절반(총 분석 건수)만
처리했는데, 이번이 그 나머지입니다.

## 왜 이게 "후커블과 비슷한 수준"이 아니라 "더 나은 수준"인가

후커블 랜딩페이지 캡처(§3.3)의 "1000명의 고객 목소리 → 근거 보기" 막대그래프는 산출 방식이 랜딩페이지
텍스트만으로는 확인되지 않습니다 — AI가 추정한 비율일 가능성이 있고, 검증할 방법이 없습니다.

Pagzly는 133차에서 `review_highlight`에 "총 분석 건수"까지는 노출했지만, praise/complaint 항목별
개별 근거는 아직 없었고, 133차 브리프 자체가 "N건 중 M건" 같은 표현을 **명시적으로 금지**해뒀습니다
(LLM이 숫자를 지어낼 위험 때문). 이번 135차는 그 금지를 위험 없이 풀 방법을 제공합니다: LLM이 숫자를
만드는 게 아니라, **파싱된 원문 리뷰 라인에 대한 순수 문자열 키워드 매칭**으로 praise/complaint별
실제 등장 횟수를 셉니다. 키워드가 원문에 없으면 카운트는 그냥 0입니다 — 구조적으로 지어낼 수 없습니다.
이게 후커블의 (검증 불가능한) 막대그래프보다 더 정직하고 더 검증 가능한 "근거"입니다.

---

## A. `review_highlight` — praise/complaint별 결정론적 매칭 카운트

### 배경

`lib/review-insights.ts`의 `extractReviewInsights()`는 이미 xlsx/txt를 파싱해서 리뷰 라인 배열을
만들고(`extractLinesFromXlsx`/`extractLinesFromTxt`), DeepSeek로 `commonPraises`/`commonComplaints`를
뽑습니다(원문 근거 없는 장점·단점 금지 지시 이미 있음). 이번엔 그 파싱된 라인 배열을 **재사용**해서
(새 API 호출 없이) 각 praise/complaint 문장이 원문 리뷰 몇 줄에서 실제로 매칭되는지 셉니다.

### 할 것

1. `lib/review-insights.ts`에 순수 함수 2개 추가:

```ts
/** praise/complaint 문장에서 핵심 키워드(2자 이상 토큰) 최대 4개 추출.
 *  이 키워드는 원문 매칭용이지 새로 지어내는 게 아님 — 문장 자체를 쪼갤 뿐. */
function extractCoreKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2),
    ),
  ).slice(0, 4);
}

/** 원문 리뷰 라인 중 text의 핵심 키워드를 하나라도 포함하는 라인 수.
 *  LLM 호출 없음 — 순수 문자열 포함 검사라 과대 집계가 구조적으로 불가능
 *  (키워드가 원문에 없으면 0). 과소 집계는 될 수 있음(동의어 미매칭) — 그건 안전한 쪽 오차. */
function countLineMatches(lines: string[], text: string): number {
  const keywords = extractCoreKeywords(text);
  if (keywords.length === 0) return 0;
  return lines.filter((line) => keywords.some((k) => line.includes(k))).length;
}
```

2. `ReviewInsights` 타입에 필드 추가 (praises/complaints와 **동일 인덱스·동일 길이**):

```ts
export type ReviewInsights = {
  commonPraises: string[];
  commonComplaints: string[];
  reviewLineCount: number;
  /** 135차 — 각 praise가 원문 리뷰 몇 줄에서 매칭됐는지 (키워드 문자열 매칭, LLM 아님) */
  praiseMatchCounts: number[];
  /** 135차 — 각 complaint 동일 */
  complaintMatchCounts: number[];
};
```

3. `extractReviewInsights()` 끝부분에서, `normalizeInsights()`가 반환한 `parsed.commonPraises`/
   `parsed.commonComplaints`가 확정된 **직후** (필터·slice(0,5) 적용된 이후 배열 기준으로) lines를
   재사용해 카운트 계산 후 반환값에 포함하세요. praises/complaints를 나중에 또 필터링하는 코드가
   있으면(`buildReviewHighlightSection`의 `.filter(Boolean).slice(0, 6)` 등) 카운트 배열도 **반드시
   같은 필터·순서로 함께** 잘라내서 인덱스가 어긋나지 않게 하세요 — 어긋나면 엉뚱한 카운트가 붙는
   버그가 됩니다. 가장 안전한 방법은 `{ text, matchCount }[]` 쌍으로 묶어서 함께 필터링한 뒤 마지막에
   분리하는 것입니다.

4. `lib/types/generate.ts`:
   - `ReviewInsightsInput`에 `praiseMatchCounts?: number[]` / `complaintMatchCounts?: number[]` 추가.
   - `ReviewHighlightSection`에도 동일 필드 추가 (praises/concerns와 인덱스 대응).

5. `lib/section-inserts.ts`의 `buildReviewHighlightSection()` / `insertReviewHighlightSection()`이
   `praiseMatchCounts`/`complaintMatchCounts` 파라미터를 받아 그대로 섹션에 실어 보내도록 시그니처
   확장 (praises를 필터링하는 지점과 카운트 배열을 짝지어 함께 필터링 — 위 3번과 동일 원칙).

6. `app/api/generate/route.ts` (또는 review insights를 호출하고 `insertReviewHighlightSection`에
   전달하는 실제 지점)에서 새 필드를 끝까지 배선하세요.

7. 렌더링 — `components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts`의
   `review_highlight` 케이스 둘 다: 각 praise 카드 하단에 `matchCount > 0`일 때만 작은 텍스트 배지
   "N건 언급" 추가 (기존 "실제 리뷰 N건 분석" 캡션과 같은 옅은 톤 — `opacity:.4~.5`, `font-size:11~12px`
   수준). `matchCount === 0`이면 배지 자체를 안 보이게 하세요(0건이라고 써서 오히려 신뢰를 깎지 말 것).
   concerns(complaints)에도 동일 패턴 적용.

### 중요 — 133차 금지 규칙과의 관계 (Cursor가 헷갈리지 않도록)

133차 브리프는 "per-item 백분율/비율 주장 금지(예: 'N건 중 M건')"를 명시했습니다. 그건 **LLM이 만든
숫자**를 금지한 것이었습니다. 이번 카운트는 LLM 출력이 아니라 이미 파싱된 원문 리뷰 라인에 대한 순수
문자열 매칭이라 지어낼 수 없는 구조라서 이번엔 안전하게 허용합니다. **LLM이 직접 만든 percent/비율/
"N명 중 M명" 문장은 여전히 전면 금지** — 이번에 허용하는 건 오직 코드가 계산한 매칭 카운트 배지뿐입니다.

### 검증

- fixture 리뷰 파일(`scripts/fixtures/cosmetics-reviews.txt` 등)로 praise 2~3개 각각의 매칭 카운트를
  손으로 검산해서 리포트에 "원문 라인 + 어떤 키워드가 매칭됐는지" 대조표로 첨부하세요.
- 매칭 0건인 praise가 있으면 배지가 실제로 안 보이는지 스크린샷.
- praises 필터링(예: 특정 praise가 빈 문자열이라 걸러지는 경우)이 있는 케이스를 하나 만들어서
  카운트 배열 인덱스가 어긋나지 않는지 직접 확인 — 이게 이번 항목의 가장 흔한 버그 지점입니다.
- `tsc --noEmit`.

---

## B. 입력 기반 "우려 → 안심" 리어슈어런스 카피 (안전 버전)

### 배경

후커블은 "타 제품엔 위험 성분이 있다"는 식으로 근거 없는 불안을 조성한 뒤 안심시키는 패턴을 씁니다
(`marketplace_crawl_findings_2026-09-07.md` §3.2) — 이건 Pagzly의 무근거 비교/타사 폄훼 금지 원칙과
정면 충돌이라 **그대로는 절대 금지**합니다. 하지만 판매자가 실제로 입력한 "무첨가/무향/프리" 같은
필드가 있으면, 그 사실 하나만 갖고 "불필요한 성분을 넣지 않았습니다" 식의 짧은 안심 문장을 붙이는 건
지어내기가 아니라 **입력된 사실의 재진술**입니다.

### 할 것

`lib/copy-orchestrator/deepseek-copy.ts`의 `buildStyleRubricBlock()`에 아래 조건부 지시를 한 단락
추가 (기존 규칙 삭제 없이):

```
- ingredients/keyFeatures/certifications 중 "무첨가", "무향", "파라벤 프리", "알코올 프리",
  "free" 등 안전/제외 관련 표현이 입력에 literal하게 있으면, checklist 또는 feature_callout 중
  하나에 "불필요한 ○○을 넣지 않았습니다" 식의 짧은 안심 문장을 1개만 반영해도 됩니다.
  입력에 없는 성분·위험 요소를 언급하거나, 타 제품·경쟁사를 겨냥한 비교·폄훼·불안 조성은
  절대 금지합니다. 입력에 해당 표현이 literal하게 없으면 이 항목은 시도하지 마세요 — 억지로
  "무첨가일 것 같다"는 식으로 추정하지 마세요.
```

### 검증

- "무첨가" 또는 "파라벤 프리" 등이 `ingredients`에 포함된 더미 상품 1건, 그런 표현이 전혀 없는
  더미 상품 1건 각각 TEST_MODE 카피 생성 → 안심 문장이 조건대로만 나타나는지 리포트에 원문 비교.
- `detectCopyHallucinations` 경고 0건 확인 (기존 로직 그대로 재사용 — 새 검증 룰 추가 안 함).
- 생성된 카피에 경쟁사/타 제품 언급이 없는지 grep으로 재확인 (0건이어야 함).

---

## 하지 않는 것

- `section-templates.ts`의 슬롯 순서·종류 변경 금지.
- 새 유료 API 호출 추가 금지 — A는 순수 로컬 문자열 계산(기존 파싱 라인 재사용), B는 기존 DeepSeek
  카피 호출에 지시문 한 단락 추가일 뿐, 신규 호출 없음.
- **134차(편집 패널 UI 리디자인) 대상 파일은 이번 라운드에서 건드리지 않습니다**: `SectionPatchChat.tsx`,
  `DetailToolsAccordion.tsx`, `DetailStructureSidebar.tsx`, `app/create/result/page.tsx`의 "직접 편집"
  토글 영역(대략 1118~1141행). 134차가 아직 완료 보고 전이라 같은 파일을 동시에 건드리면 충돌
  위험이 있습니다 — 135차는 review_highlight/copy 관련 파일만 건드립니다.
- LLM이 직접 만든 percent/비율/"N명 중 M명" 문장은 여전히 금지 — 이번에 허용하는 건 A의 코드
  계산 매칭 카운트뿐입니다.
- 가짜 후기·인증 배지·QC 그리드·채팅형 후기 등 기존 비목표 유지.
- 후커블의 "반박 제거"(§3.2) 원문 프레이밍이나 카피 문구를 그대로 베끼지 않습니다 — 구조 아이디어만
  참고하고, 실제 문구는 위 안전 버전 규칙만 따릅니다.

## 다음 후보로 남겨둔 것 (이번 라운드 범위 아님)

`marketplace_crawl_findings_2026-09-07.md` §3.1 "페르수전 태그 시스템" — 후커블은 생성된 섹션마다
"인증/비교/요약/문제제기/반박 제거/소구점 구체화/사회적 증거/나열" 같은 라벨을 붙여서 "검증된 설득
프레임워크를 섹션마다 적용했다"는 걸 판매자에게 투명하게 보여줍니다. Pagzly도 각 섹션 슬롯이 왜 그
자리에 있는지 판매자에게 노출하면 좋은 차별화 포인트가 될 수 있는데, 이건 `DetailStructureSidebar.tsx`
등 134차가 만지고 있는 편집 패널 UI에 자연스럽게 들어갈 자리라서, **134차 완료·병합 이후 별도
라운드로 분리**하는 걸 권장합니다.

## 완료 체크리스트

- [ ] A: `extractCoreKeywords`/`countLineMatches` 추가 + 타입 배선(`ReviewInsights`/
      `ReviewInsightsInput`/`ReviewHighlightSection`) + `section-inserts.ts` 인덱스 정합 + 렌더링
      (웹 컴포넌트 + HTML export) + 매칭 0건일 때 배지 숨김
- [ ] B: 조건부 안심 카피 지시 추가 + hallucination 경고 0건 + 무입력 케이스 안심 카피 없음 확인
      + 경쟁사 언급 0건 grep
- [ ] `tsc --noEmit` EXIT_CODE=0
- [ ] `git diff --stat` — 예상 파일 목록 외 추가/대규모 변경이 있으면 사유를 리포트에 명시 (133차
      검증에서 브리프에 없던 파일이 나온 적이 있어 이번엔 미리 요청)
