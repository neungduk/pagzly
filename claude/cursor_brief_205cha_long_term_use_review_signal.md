# 205차 — 뷰티·전자·생활용품 장기 사용 후기 언급 신호 (192/203/204차 패턴 확장, API 0)

생성: 2026-09-16 — 사용자 지정("남은 카테고리에 review-signal 계속")

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.
(정규식 매칭만 추가 — DeepSeek 호출 증가 없음, 192/203/204차와 동일)

## 배경

192(반려동물 나이·체중) → 203(식품 재구매) → 204(패션 사이즈/핏)에 이은 네 번째
review-signal 축이자, 마지막으로 남은 3개 카테고리(화장품/뷰티, 전자제품, 생활용품)를
한 번에 커버합니다. "기타"는 카테고리 특성이 불분명해 제외합니다.

이번 신호는 "N일/주/개월/년째 사용" 같은 **장기 사용 후기 언급**입니다 — 화장품(효과
지속성), 전자제품(내구성), 생활용품(변형·마모 여부) 공통으로 "오래 써봐도 괜찮다"는
후기가 구매 전환에 중요한 신호이면서, 세 카테고리가 정확히 동일한 정규식으로 커버됩니다
(카테고리별로 다른 정규식을 만들 필요 없음).

### 오탐 방지 설계 (203/204차와 동일 원칙)

숫자 + 기간 단위 + 사용 동사가 **모두 붙어 있는** 경우만 매칭합니다. "한 달째"처럼
한글 숫자(고유어)로 쓴 표현은 의도적으로 제외합니다(안전한 쪽 과소집계 — 192차와 동일
원칙). "10개월 전에 상했어요"처럼 기간 뒤에 사용 동사가 안 붙은 문장도 매칭 안 되도록
설계했습니다.

## 작업 — 192/203/204차와 동일한 배선 순서 (신규 아키텍처 없음, 필드 1개 추가만)

### 1. `lib/review-insights.ts`

`SIZE_FIT_PATTERN`/`countSizeFitMentions()`(85~88번 줄) 바로 아래에 병렬 추가:

```ts
/** 205차 — 뷰티·전자·생활용품 리뷰 원문에서 장기 사용 언급 라인 수. LLM 호출 없음 —
 *  countSizeFitMentions과 동일하게 순수 정규식 매칭. 숫자+기간 단위+사용 동사가 모두
 *  붙어 있는 경우만 다룬다 — 한글 고유어 숫자("한 달째")는 의도적으로 제외(과소집계는
 *  안전한 쪽 오차, anti-fabrication). */
const LONG_TERM_USE_PATTERN =
  /\d+\s*(일|주|개월|년)\s*째?\s*(사용|써|쓰고|쓴|사용중|사용해)/;

export function countLongTermUseMentions(lines: string[]): number {
  return lines.filter((line) => LONG_TERM_USE_PATTERN.test(line)).length;
}
```

`ReviewInsights` 타입(32번 줄 `sizeFitMentionCount: number;` 바로 아래)에
`longTermUseMentionCount: number;` 필드 추가, 동일한 JSDoc 스타일.

`extractReviewInsights()` 안에서 `sizeFitMentionCount` 계산하는 자리(279번 줄) 바로
아래에 `const longTermUseMentionCount = countLongTermUseMentions(lines);` 추가하고,
`empty` 객체(286번 줄 근처)·조기 리턴(299번 줄 근처)·최종 반환(369번 줄 근처) 3곳 전부에
필드를 포함시키세요 — 204차 diff와 정확히 같은 자리 수.

### 2. `lib/types/generate.ts`

`ReviewInsightsInput`(37번 줄 `sizeFitMentionCount?: number;` 바로 아래)에:

```ts
/** 205차 — 장기 사용 언급 라인 수(정규식) */
longTermUseMentionCount?: number;
```

`ReviewHighlightSection`(451번 줄 `sizeFitMentionCount?: number;` 바로 아래)에도 동일한
스타일로 `longTermUseMentionCount?: number;` 추가 (JSDoc: "화장품/뷰티·전자제품·
생활용품 카테고리이고 0보다 클 때만 캡션 노출").

### 3. `app/api/generate/route.ts`

`sizeFitMentionCount` 게이팅(1645~1647번 줄) 바로 아래에 병렬 추가 — **이번엔 3개
카테고리 OR 조건**:

```ts
const longTermUseMentionCount =
  body.category === "화장품/뷰티" ||
  body.category === "전자제품" ||
  body.category === "생활용품"
    ? enrichedBody.reviewInsights?.longTermUseMentionCount
    : undefined;
```

`components/CreateProductForm.tsx`의 `CATEGORIES` 배열 기준 정확한 문자열입니다
(`"뷰티"`나 `"전자"` 단독이 아님 — 204차와 동일한 방식으로 미리 확인해뒀습니다).

`insertReviewHighlightSection(...)` 호출 인자 목록 맨 끝(현재 마지막 인자가
`sizeFitMentionCount`인 자리, 1661번 줄 근처) 다음에 `longTermUseMentionCount` 추가.

### 4. `lib/section-inserts.ts`

`buildReviewHighlightSection`(36번 줄 근처, `sizeFitMentionCount?: number,` 다음)과
`insertReviewHighlightSection`(105번 줄 근처) 둘 다 시그니처 마지막에
`longTermUseMentionCount?: number,` 파라미터 추가. `sizeFitCount` 계산(64~66번 줄)과
동일한 패턴으로 `longTermUseCount` 계산 후, 반환 객체(87번 줄 `sizeFitMentionCount`
스프레드 옆)에
`...(longTermUseCount != null ? { longTermUseMentionCount: longTermUseCount } : {})`
추가. `insertReviewHighlightSection`이 `buildReviewHighlightSection`을 호출하는 자리
(135번 줄 `sizeFitMentionCount,` 다음)에도 새 인자 전달.

### 5. `components/DetailSectionRenderer.tsx` (라이브 렌더러)

`sizeFitMentionCount` 캡션 블록(3241~3248번 줄) 바로 아래에 동일한 스타일로:

```tsx
{typeof section.longTermUseMentionCount === "number" &&
section.longTermUseMentionCount > 0 ? (
  <p
    data-testid="review-highlight-long-term-use-signal"
    className="mx-auto mt-1 max-w-xl text-center text-[11px] text-ink/40 sm:text-xs"
  >
    장기 사용 후기 {section.longTermUseMentionCount}건
  </p>
) : null}
```

### 6. `lib/export-detail-html.ts`

`sizeFitMentionCount` 캡션(902~904번 줄) 바로 아래에 동일한 조건부 `<p>` 추가, 문구는
"장기 사용 후기 N건", 스타일은 기존 줄과 동일하게 복사.

### 7. 스모크 테스트

`scripts/204cha-fashion-size-fit-signal-smoke.ts`를 참고해 `scripts/205cha-long-term-
use-signal-smoke.ts` 신규 작성:

- 정규식 자체: hit 케이스("3개월째 사용중이에요", "2주 사용해봤는데" 등 2건 이상) / miss
  케이스로 **"10개월 전에 상했어요"(기간+사용 동사 미동반)와 "가격이 10만원대"(기간
  단위 아닌 숫자)를 반드시 포함**(오탐 안 되는지 확인 — 이번 라운드 핵심 검증 포인트)
- `extractReviewInsights` 경유 `longTermUseMentionCount` 추출 확인, `deepseekCalls`
  불변 확인
- `buildReviewHighlightSection`에 카테고리 게이팅 — `"화장품/뷰티"`/`"전자제품"`/
  `"생활용품"` 3개 전부 값 존재, `"의류/패션"`/`"식품/건강기능식품"`/`"반려동물"`은
  undefined (교차 게이팅 누락 없는지 6개 카테고리 전부 테스트)

## 검증

1. `npx tsc --noEmit` — 0.
2. 신규 스모크 스크립트 실행 결과 — 특히 "10개월 전에 상했어요"/"가격이 10만원대" 류가
   `longTermUseMentionCount`에 오카운트되지 않는지(기대값 0) 반드시 결과에 명시.
3. `callDeepSeekReviewJson` 호출 횟수 불변 확인(신규 호출 추가 안 됐는지) — 코드로 확인.
4. 3개 게이팅 카테고리(화장품/뷰티, 전자제품, 생활용품) 전부에서 값이 노출되고, 나머지
   3개 카테고리(의류/패션, 식품/건강기능식품, 반려동물)에서는 노출되지 않는지 게이팅
   확인 — 6개 카테고리 전부 스모크 테스트에 포함.
5. 카테고리 문자열 3개가 `CreateProductForm.tsx`의 `CATEGORIES` 배열과 정확히 일치하는지
   보고서에 명시(203차 재발 방지 원칙 계속 적용).

## 하지 않는 것

- 한글 고유어 숫자("한 달째", "두 주") 표현은 다루지 않음 — 오탐/복잡도 트레이드오프.
- "기타" 카테고리는 다루지 않음 — 카테고리 특성 불분명.
- `commonPraises`/`commonComplaints`/`reviewAxes` 등 DeepSeek 추출 로직 변경 안 함.
- 생성 API 호출 전부 금지(0회).

## 완료 보고 형식

3~5줄 요약 + 스모크 테스트 결과(오탐 방지 케이스 + 6개 카테고리 게이팅 결과 포함) +
`tsc` 결과 + DeepSeek 호출 횟수 불변 확인 + 카테고리 문자열 3개 대조 확인.

## 백로그 마스터

완료되면 §1에 한 줄 추가하고 §5(재작업 금지)에도 반영해주세요 — 제가 확인 후 마스터
문서를 갱신하겠습니다(187차 사용법 규칙에 따라 Claude가 갱신). 이걸로 6개 실제 카테고리
전부 review-signal 롤아웃이 끝납니다("기타" 제외) — 완료되면 마스터 요약에도 그렇게
기록하겠습니다.
