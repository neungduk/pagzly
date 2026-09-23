# 203차 — 식품 카테고리 재구매 의사 리뷰 신호 (192차 패턴 확장, API 0)

생성: 2026-09-16 — 백로그 마스터 §3(현재 빈 상태)에서 자체 발굴, 코드 재검토로 축 확정

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.
(이번 라운드는 정규식 매칭만 추가하는 작업이라 원래도 DeepSeek 호출 증가 없음 — 아래
검증 항목에서 재확인.)

## 배경

192차에서 반려동물 카테고리에 "나이·체중 언급 리뷰 N건" 신호를 정규식으로 추가했습니다
(`petAgeWeightMentionCount`, `lib/review-insights.ts`). LLM 호출 없이 원문 리뷰 라인을
정규식으로 세어 캡션에만 노출하는 안전한 패턴이라 다른 카테고리에도 적용할 여지가
있었는데, 45~202차 어디에도 후속 적용이 없었습니다(코드 재검토로 확인).

식품 카테고리는 "재구매 의사"가 구매 전환에 가장 직접적으로 영향을 주는 리뷰 신호 중
하나입니다. "재구매", "또 시켰어요", "재주문" 같은 표현은 애매한 동의어 없이 뚜렷하게
식별 가능해서(예: 패션의 "크다/작다"처럼 문맥 의존적이지 않음) 192차와 동일한 원칙
(anti-fabrication: 숫자·확정 패턴만, 자유 텍스트 추출 없음)을 그대로 지킬 수 있습니다.

## 작업 — 192차와 동일한 배선 순서로 진행 (신규 아키텍처 없음, 필드 1개 추가만)

### 1. `lib/review-insights.ts`

`PET_AGE_WEIGHT_PATTERN`/`countPetAgeWeightMentions()` 바로 아래에 병렬 추가:

```ts
/** 203차 — 식품 리뷰 원문에서 재구매 의사 언급 라인 수. LLM 호출 없음 —
 *  countPetAgeWeightMentions과 동일하게 순수 정규식 매칭. 문맥 의존적인 애매한
 *  표현("크다/작다"류)은 제외하고 명시적 재구매 어휘만 다룬다(anti-fabrication). */
const REPURCHASE_PATTERN =
  /재구매|재주문|또\s*(구매|구입|주문)|계속\s*(구매|구입)/;

export function countRepurchaseMentions(lines: string[]): number {
  return lines.filter((line) => REPURCHASE_PATTERN.test(line)).length;
}
```

`ReviewInsights` 타입에 `repurchaseMentionCount: number;` 필드 추가(`petAgeWeightMentionCount`
바로 아래, 동일한 JSDoc 스타일).

`extractReviewInsights()` 안에서 `petAgeWeightMentionCount` 계산하는 자리 바로 아래에
`const repurchaseMentionCount = countRepurchaseMentions(lines);` 추가하고, `empty` 객체와
최종 반환 객체(성공/재시도 경로 전부) 양쪽에 필드를 포함시키세요 — 192차 diff와 정확히
같은 자리 수만큼 추가하면 됩니다(빈 리뷰 텍스트 조기 리턴 포함 총 3곳).

### 2. `lib/types/generate.ts`

`ReviewInsightsInput`에 `petAgeWeightMentionCount` 아래:

```ts
/** 203차 — 재구매 의사 언급 라인 수(정규식) */
repurchaseMentionCount?: number;
```

`ReviewHighlightSection`에도 `petAgeWeightMentionCount` 필드 바로 아래 동일한 스타일로
`repurchaseMentionCount?: number;` 추가 (JSDoc: "식품 카테고리이고 0보다 클 때만 캡션 노출").

### 3. `app/api/generate/route.ts`

`petAgeWeightMentionCount` 게이팅 바로 아래(약 1635~1637번 줄)에 병렬 추가:

```ts
const repurchaseMentionCount =
  body.category === "식품"
    ? enrichedBody.reviewInsights?.repurchaseMentionCount
    : undefined;
```

`insertReviewHighlightSection(...)` 호출 인자 목록 맨 끝에 `repurchaseMentionCount` 추가
(현재 마지막 인자가 `petAgeWeightMentionCount`인 자리 다음).

### 4. `lib/section-inserts.ts`

`buildReviewHighlightSection`과 `insertReviewHighlightSection` 둘 다 시그니처 마지막에
`repurchaseMentionCount?: number,` 파라미터 추가, `petCount` 계산과 동일한 패턴으로
`repurchaseCount` 계산 후 반환 객체에 `...(repurchaseCount != null ? { repurchaseMentionCount: repurchaseCount } : {})` 추가.
`insertReviewHighlightSection`이 `buildReviewHighlightSection`을 호출하는 자리에도
새 인자 전달.

### 5. `components/DetailSectionRenderer.tsx` (라이브 렌더러)

`petAgeWeightMentionCount` 캡션 블록(약 3223~3231번 줄) 바로 아래에 동일한 스타일로:

```tsx
{typeof section.repurchaseMentionCount === "number" &&
section.repurchaseMentionCount > 0 ? (
  <p
    data-testid="review-highlight-repurchase-signal"
    className="mx-auto mt-1 max-w-xl text-center text-[11px] text-ink/40 sm:text-xs"
  >
    재구매 의사 언급 리뷰 {section.repurchaseMentionCount}건
  </p>
) : null}
```

### 6. `lib/export-detail-html.ts`

`petAgeWeightMentionCount` 캡션(약 892~894번 줄) 바로 아래에 동일한 조건부 `<p>` 추가,
문구는 "재구매 의사 언급 리뷰 N건", 스타일은 기존 줄과 동일하게 복사.

### 7. 스모크 테스트

`scripts/192cha-pet-review-signal-smoke.ts`를 참고해 `scripts/203cha-food-repurchase-
signal-smoke.ts` 신규 작성 — 식품 리뷰 샘플 텍스트(재구매 표현 2건 이상 포함)로
`countRepurchaseMentions` 직접 호출 + 카테고리 게이팅(식품일 때만 값 존재, 타 카테고리는
undefined) 검증. 192차 스모크와 동일한 구조로 작성하면 됩니다.

## 검증

1. `npx tsc --noEmit` — 0.
2. 신규 스모크 스크립트 실행 결과 (재구매 언급 라인 수 기대값과 일치, 카테고리 게이팅
   정상).
3. `countRepurchaseMentions` 자체는 정규식이라 DeepSeek 호출 0 — `extractReviewInsights`
   내 `callDeepSeekReviewJson` 호출 횟수가 192차 이전과 동일한지(신규 호출 추가 안 됐는지)
   코드로 확인해 보고서에 명시.
4. 식품이 아닌 카테고리(뷰티 등)에서 리뷰 텍스트에 "재구매" 문구가 있어도
   `repurchaseMentionCount`가 섹션에 노출되지 않는지 게이팅 확인 (스모크 테스트 2번째
   케이스로 커버 가능).

## 하지 않는 것

- 다른 카테고리(패션 사이즈/핏 등)로 확대 안 함 — 이번엔 식품 1개 축만. 문맥 의존적인
  표현(크다/작다류)은 애초에 다루지 않음.
- `commonPraises`/`commonComplaints`/`reviewAxes` 등 DeepSeek 추출 로직 변경 안 함.
- 정규식 패턴에 형태소 분석·유의어 확장 안 함 — 192차와 동일하게 명시적 어휘만.
- 생성 API 호출 전부 금지(0회).

## 완료 보고 형식

3~5줄 요약 + 스모크 테스트 결과 + `tsc` 결과 + DeepSeek 호출 횟수 불변 확인.

## 백로그 마스터

완료되면 §1에 한 줄 추가하고 §5(재작업 금지)에도 반영해주세요 — 제가 확인 후 마스터
문서를 갱신하겠습니다(187차 사용법 규칙에 따라 Claude가 갱신).
