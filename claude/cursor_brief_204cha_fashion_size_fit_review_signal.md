# 204차 — 패션 카테고리 사이즈/핏 리뷰 신호 (192/203차 패턴 확장, API 0)

생성: 2026-09-16 — 사용자가 직접 방향 선택("패션 사이즈/핏 리뷰 신호")

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.
(정규식 매칭만 추가 — DeepSeek 호출 증가 없음, 203차와 동일)

## 배경

192차(반려동물 나이·체중) → 203차(식품 재구매 의사)에 이은 세 번째 review-signal 축입니다.
패션 카테고리의 "사이즈/핏이 실제 표기와 맞는지"는 반품률에 직접 영향을 주는 리뷰 신호라
상업적 가치가 높지만, "크다/작다"만으로는 문맥 의존적이라(예: "가격이 크게 부담되진
않아요", "이 옷은 작다고 느낄 수도" 등) 오탐 위험이 큽니다. **이번엔 "사이즈"라는 명시
키워드가 반드시 동반되는 표현만 다룹니다** — 192/203차와 동일한 anti-fabrication 원칙.

### 203차 교훈 — 카테고리 문자열 주의

203차 브리프에서 제가 `body.category === "식품"`으로 잘못 적어 Cursor가 스스로 찾아
고쳤습니다(실제 폼 값은 `"식품/건강기능식품"`). 이번엔 직접 확인했습니다 —
`components/CreateProductForm.tsx`의 `CATEGORIES` 배열 기준 **패션 카테고리의 정확한
문자열은 `"의류/패션"`**입니다(`"패션"` 단독 아님). 아래 게이팅 코드에 그대로 반영하세요.

## 작업 — 192/203차와 동일한 배선 순서 (신규 아키텍처 없음, 필드 1개 추가만)

### 1. `lib/review-insights.ts`

`REPURCHASE_PATTERN`/`countRepurchaseMentions()` 바로 아래에 병렬 추가:

```ts
/** 204차 — 패션 리뷰 원문에서 사이즈/핏 언급 라인 수. LLM 호출 없음 —
 *  countRepurchaseMentions과 동일하게 순수 정규식 매칭. "사이즈" 키워드가 반드시
 *  동반되는 명시적 표현만 다룬다 — 문맥 의존적인 "크다/작다" 단독 표현은 제외
 *  (예: "가격이 크게 부담되진 않아요"류 오탐 방지, anti-fabrication). */
const SIZE_FIT_PATTERN = /정사이즈|사이즈\s*(업|다운|크게|작게)/;

export function countSizeFitMentions(lines: string[]): number {
  return lines.filter((line) => SIZE_FIT_PATTERN.test(line)).length;
}
```

`ReviewInsights` 타입에 `sizeFitMentionCount: number;` 필드 추가(`repurchaseMentionCount`
바로 아래, 동일한 JSDoc 스타일).

`extractReviewInsights()` 안에서 `repurchaseMentionCount` 계산하는 자리 바로 아래에
`const sizeFitMentionCount = countSizeFitMentions(lines);` 추가하고, `empty` 객체와 최종
반환 객체(성공/재시도 경로 전부) 양쪽에 필드를 포함시키세요 — 203차 diff와 정확히 같은
자리 수만큼 추가(총 3곳: empty, 조기 리턴, 성공 반환).

### 2. `lib/types/generate.ts`

`ReviewInsightsInput`(35번 줄 `repurchaseMentionCount?: number;` 바로 아래)에:

```ts
/** 204차 — 사이즈/핏 언급 라인 수(정규식) */
sizeFitMentionCount?: number;
```

`ReviewHighlightSection`(446번 줄 `repurchaseMentionCount?: number;` 바로 아래)에도
동일한 스타일로 `sizeFitMentionCount?: number;` 추가 (JSDoc: "패션 카테고리이고 0보다
클 때만 캡션 노출").

### 3. `app/api/generate/route.ts`

`repurchaseMentionCount` 게이팅(약 1640~1642번 줄) 바로 아래에 병렬 추가:

```ts
const sizeFitMentionCount =
  body.category === "의류/패션"
    ? enrichedBody.reviewInsights?.sizeFitMentionCount
    : undefined;
```

**주의**: `"패션"`이 아니라 `"의류/패션"`입니다(`CreateProductForm.tsx`의
`CATEGORIES` 배열 확인).

`insertReviewHighlightSection(...)` 호출 인자 목록 맨 끝(현재 마지막 인자가
`repurchaseMentionCount`인 자리) 다음에 `sizeFitMentionCount` 추가.

### 4. `lib/section-inserts.ts`

`buildReviewHighlightSection`(35번 줄 근처, `repurchaseMentionCount?: number,` 다음)과
`insertReviewHighlightSection`(98번 줄 근처) 둘 다 시그니처 마지막에
`sizeFitMentionCount?: number,` 파라미터 추가. `repurchaseCount` 계산(60~61번 줄)과
동일한 패턴으로 `sizeFitCount` 계산 후, 반환 객체(81번 줄 `repurchaseMentionCount`
스프레드 옆)에 `...(sizeFitCount != null ? { sizeFitMentionCount: sizeFitCount } : {})`
추가. `insertReviewHighlightSection`이 `buildReviewHighlightSection`을 호출하는 자리
(127번 줄 `repurchaseMentionCount,` 다음)에도 새 인자 전달.

### 5. `components/DetailSectionRenderer.tsx` (라이브 렌더러)

`repurchaseMentionCount` 캡션 블록(약 3232~3239번 줄) 바로 아래에 동일한 스타일로:

```tsx
{typeof section.sizeFitMentionCount === "number" &&
section.sizeFitMentionCount > 0 ? (
  <p
    data-testid="review-highlight-size-fit-signal"
    className="mx-auto mt-1 max-w-xl text-center text-[11px] text-ink/40 sm:text-xs"
  >
    사이즈·핏 언급 리뷰 {section.sizeFitMentionCount}건
  </p>
) : null}
```

### 6. `lib/export-detail-html.ts`

`repurchaseMentionCount` 캡션(약 897~899번 줄) 바로 아래에 동일한 조건부 `<p>` 추가,
문구는 "사이즈·핏 언급 리뷰 N건", 스타일은 기존 줄과 동일하게 복사.

### 7. 스모크 테스트

`scripts/203cha-food-repurchase-signal-smoke.ts`를 참고해 `scripts/204cha-fashion-size-
fit-signal-smoke.ts` 신규 작성:

- 정규식 자체: hit 케이스("정사이즈로 딱 맞아요", "사이즈업 추천드려요" 등 사이즈 관련
  2건 이상) / miss 케이스로 **"가격이 크게 부담되진 않아요"와 "이 옷은 작다고 느낄
  수도"를 반드시 포함**(사이즈 무관 "크다/작다" 오탐 안 되는지 확인 — 이게 이번
  라운드의 핵심 검증 포인트)
- `extractReviewInsights` 경유 `sizeFitMentionCount` 추출 확인, `deepseekCalls` 불변
  확인
- `buildReviewHighlightSection`에 카테고리 게이팅 — `"의류/패션"`일 때만 값 존재,
  `"화장품/뷰티"` 등 타 카테고리는 undefined

## 검증

1. `npx tsc --noEmit` — 0.
2. 신규 스모크 스크립트 실행 결과 — 특히 "가격이 크게"/"작다고 느낄 수도" 류가
   `sizeFitMentionCount`에 오카운트되지 않는지 (기대값 0) 반드시 결과에 명시.
3. `callDeepSeekReviewJson` 호출 횟수 불변 확인(신규 호출 추가 안 됐는지) — 코드로 확인.
4. 패션이 아닌 카테고리에서 "사이즈" 관련 리뷰가 있어도 `sizeFitMentionCount`가 섹션에
   노출되지 않는지 게이팅 확인.
5. 카테고리 문자열이 정확히 `"의류/패션"`인지 `CreateProductForm.tsx`의 `CATEGORIES`
   배열과 대조해 보고서에 명시(203차 재발 방지).

## 하지 않는 것

- "크다/작다" 단독(사이즈 키워드 미동반) 표현은 다루지 않음 — 오탐 위험.
- 다른 카테고리로 추가 확대 안 함 — 이번엔 패션 1개 축만.
- `commonPraises`/`commonComplaints`/`reviewAxes` 등 DeepSeek 추출 로직 변경 안 함.
- 생성 API 호출 전부 금지(0회).

## 완료 보고 형식

3~5줄 요약 + 스모크 테스트 결과(오탐 방지 케이스 결과 포함) + `tsc` 결과 + DeepSeek 호출
횟수 불변 확인 + 카테고리 문자열 대조 확인.

## 백로그 마스터

완료되면 §1에 한 줄 추가하고 §5(재작업 금지)에도 반영해주세요 — 제가 확인 후 마스터
문서를 갱신하겠습니다(187차 사용법 규칙에 따라 Claude가 갱신).
