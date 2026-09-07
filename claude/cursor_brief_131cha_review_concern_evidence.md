# 131차 — review_highlight에 실제 후기 "아쉬운 점"도 투명하게 노출 (신규 유료 API 0회)

생성: 2026-09-07
전제: **기존에 이미 계산되고 버려지던 데이터를 배선(wiring)만 추가**하는 라운드입니다. 신규 유료
Replicate/DeepSeek/Claude 호출 **0회** — `extractReviewInsights()`가 이미 `commonComplaints`를 계산해
반환하지만, 지금은 카피 프롬프트 배경 텍스트로만 쓰이고 화면에는 전혀 노출되지 않습니다. 이번 라운드는
이미 나온 그 값을 `review_highlight` 섹션에 그대로 옮겨 렌더링만 추가합니다.

## 0. 배경 — 왜 지금 이걸 하는가

Claude(Cowork)가 이번 라운드에 지마켓·옥션 실제 판매 중인 상세페이지와 후커블(경쟁 AI 툴) 랜딩의 실제
생성 예시를 직접 방문해 확인했습니다 (근거: `claude/marketplace_crawl_findings_2026-09-07.md`).

후커블 랜딩에 노출된 실제 생성 예시 중 하나가 "1000명의 고객 목소리를 담은 단 하나의 문장"이라는 카피와
함께, 펼치면 실제 리뷰 인용문 + 안정성/효과/자극감 막대그래프가 나오는 "근거 보기" UI였습니다. 즉
경쟁 툴은 **AI가 지어낸 카피가 아니라 실제 후기에서 나온 근거**라는 걸 구매자에게 투명하게 보여주는 걸
신뢰 요소로 삼고 있습니다.

Pagzly 코드를 확인해보니 이미 비슷한 재료가 있습니다:
- `lib/review-insights.ts`의 `extractReviewInsights()`가 판매자가 올린 리뷰 파일에서
  `commonPraises`(자주 언급된 장점)와 `commonComplaints`(자주 언급된 아쉬운 점)를 **같은 DeepSeek 호출
  한 번**으로 함께 추출합니다 (`app/api/generate/route.ts:642-646`).
- 하지만 `commonPraises`만 `lib/section-inserts.ts`의 `buildReviewHighlightSection()`을 통해
  `review_highlight` 섹션에 실제로 들어가고(`route.ts:1585-1587`), `commonComplaints`는
  `formatReviewInsightsBlock()`을 거쳐 카피 프롬프트 배경 텍스트로만 쓰이고(`route.ts:755-756`) **화면에는
  한 번도 렌더링되지 않습니다.**

즉, 이미 계산되어 있는 실제 후기 기반 데이터를 그냥 버리고 있었던 것 — 신규 API 호출 없이 배선만 추가하면
후커블의 "근거 투명성" 방향을 지어내기 금지 원칙 안에서 따라잡을 수 있습니다.

**중요 — 후커블과 다르게 갈 부분**: 후커블 예시 중 하나는 "타사엔 위험 성분이 있다"는 식으로 익명의
경쟁사를 겨냥해 불안을 조성한 뒤 안심시키는 카피였습니다. Pagzly는 이 프레이밍을 **채택하지 않습니다.**
이번 라운드는 그냥 **실제 아쉬운 점을 있는 그대로 투명하게 보여주기만** 합니다 — 근거 없는 안심 카피를
새로 만들어 붙이지 않습니다. "우려 제기 → AI가 지어낸 반박"이 아니라 "장점도 있고 아쉬운 점도 있다,
이게 실제 후기입니다"라는 **정직한 톤**을 유지하세요.

## 1. 할 것

### A. 타입 확장 — `lib/types/generate.ts`

`ReviewHighlightSection`에 선택 필드 추가 (필드명은 예시, 기존 컨벤션에 맞게 조정 가능):

```ts
export type ReviewHighlightSection = {
  type: "review_highlight";
  slot: "review_highlight";
  heading: string;
  praises: string[];
  concerns?: string[]; // 131차 추가 — 실제 후기의 아쉬운 점, 없으면 생략
};
```

### B. 조립 로직 — `lib/section-inserts.ts`

`buildReviewHighlightSection()`이 `praises`뿐 아니라 `complaints`도 받도록 시그니처 확장:

```ts
export function buildReviewHighlightSection(
  praises: string[],
  complaints: string[] = [],
): ReviewHighlightSection {
  return {
    type: "review_highlight",
    slot: "review_highlight",
    heading: "실제 구매자들이 자주 남긴 이야기",
    praises: praises.filter(Boolean).slice(0, 6),
    concerns: complaints.filter(Boolean).slice(0, 3), // 과하지 않게 최대 3개
  };
}
```

`insertReviewHighlightSection()`도 `complaints` 파라미터를 받아 그대로 전달하도록 확장. **praises가
0개면 지금처럼 섹션 자체를 생략** (동작 변경 금지 — complaints만 있고 praises가 없는 경우도 기존과
동일하게 생략).

### C. 호출부 — `app/api/generate/route.ts`

`route.ts:1585-1587` 근처:

```ts
const reviewPraises = enrichedBody.reviewInsights?.commonPraises ?? [];
const reviewComplaints = enrichedBody.reviewInsights?.commonComplaints ?? [];
if (reviewPraises.length > 0) {
  savedCopy.sections = insertReviewHighlightSection(savedCopy.sections, reviewPraises, reviewComplaints);
}
```

**신규 API 호출 없음** — `enrichedBody.reviewInsights`는 이미 `extractAuxiliaryData()`(또는 동등 함수,
`route.ts:615` 근처) 단계에서 한 번의 DeepSeek 호출로 계산되어 있던 값입니다. 그 값을 한 군데 더
전달하는 것뿐입니다.

### D. 렌더러 — `components/DetailSectionRenderer.tsx`

`review_highlight` 렌더 분기를 찾아 (기존 praises 리스트 렌더링 바로 아래) `concerns`가 있을 때만 짧은
보조 블록을 추가합니다. 톤 예시 (문구는 자유, 아래 원칙만 지킬 것):

- 소제목: "실제 후기에 나온 아쉬운 점" (또는 유사 — "위험", "문제", "반박" 같은 강한 단어 쓰지 말 것)
- 각 항목은 `praises`보다 **시각적으로 톤 다운** (더 작은 글자·중립색) — 페이지 전체 톤을 부정적으로
  끌지 않도록. 3색 규칙(`design-tokens.ts`) 안에서 처리.
- concerns 옆에 AI가 만든 반박/안심 카피를 **새로 생성해 붙이지 말 것**. 있는 그대로만 노출.
- `concerns`가 없거나 빈 배열이면 이 블록 자체를 렌더링하지 않음 (조건부 렌더).

### E. HTML export 동기화 — `lib/export-detail-html.ts`

`review_highlight` export 매핑을 찾아 `concerns` 필드도 반영 (기존 patterns: `65cha-report.md`에 이미
"draft/final ↔ export-detail-html 동기화" 관례가 있음 — 같은 방식으로).

## 2. 검증

1. 픽스처 케이스 3개: (a) praises만 있고 complaints 없음 → 기존과 동일 렌더 (회귀), (b) praises +
   complaints 둘 다 있음 → 새 블록 렌더, (c) 리뷰 파일 미업로드(reviewInsights 자체 없음) → 섹션 전체
   생략 (기존과 동일, 회귀).
2. `app/dev/detail-preview` 등 기존 프리뷰 경로로 (b) 케이스 스크린샷 캡처.
3. `tsc --noEmit` 0.
4. `git diff --stat` — 변경 파일이 `lib/types/generate.ts`, `lib/section-inserts.ts`,
   `app/api/generate/route.ts`, `components/DetailSectionRenderer.tsx`, `lib/export-detail-html.ts`
   범위 내인지 확인 (다른 파이프라인 파일 손대지 않았는지).
5. **유료 API 호출 로그 확인** — `[cost] extractReviewInsights` 로그가 이번 라운드 테스트에서 **기존과
   동일한 횟수**(테스트 시 1회, 이미 하던 호출)만 찍히는지 확인. 새 호출이 추가되지 않았음을 로그로
   증명.

## 하지 않는 것

- 신규 유료 API 호출 (DeepSeek/Replicate/Claude 전부 0회 — 기존 `extractReviewInsights` 결과 재사용만)
- "타사엔 문제가 있다"는 식의 익명 경쟁사 비교/불안 조성 카피 (후커블 3.2 패턴 — 채택 금지)
- concerns에 대한 AI 반박/안심 카피 새로 생성 (지어내기 금지 원칙)
- `section-templates` 슬롯 순서/종류 변경
- praises 없이 complaints만 있는 경우 섹션을 억지로 노출 (기존처럼 생략)

## 완료 보고 체크리스트

- [ ] `ReviewHighlightSection.concerns?: string[]` 타입 추가
- [ ] `buildReviewHighlightSection` / `insertReviewHighlightSection`이 complaints 받도록 확장
- [ ] `route.ts` 호출부에서 `commonComplaints` 전달 (신규 API 호출 없음 확인)
- [ ] 렌더러에 concerns 조건부 블록 추가 (톤 다운, 반박 카피 없음)
- [ ] `export-detail-html.ts` 동기화
- [ ] 픽스처 3케이스(있음/없음/파일 미업로드) 스크린샷·회귀 확인
- [ ] `tsc --noEmit` 원본 출력
- [ ] `git diff --stat` 원본 첨부
- [ ] `[cost] extractReviewInsights` 호출 횟수 불변 확인 (신규 유료 API 0회 증거)
