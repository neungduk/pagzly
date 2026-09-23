# 192차 — 반려동물 리뷰 나이·체중 언급 신호 노출 (결정론적 파싱, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. **이번
항목은 기존 DeepSeek 리뷰 추출 호출(`extractReviewInsights`)도 새로 늘리지 않습니다** —
이미 로드된 리뷰 원문 라인(`lines`)에 대한 순수 정규식 매칭만 추가합니다(아래 참고,
`countLineMatches`와 동일한 무-LLM 패턴). 단일 트랙만 정확히 끝내세요.

## 배경 — 152차 크롤링에서 발견했지만 지금까지 한 번도 실행되지 않은 항목

`claude/152cha-benchmark-crawl-footnote-system.md`(펫프렌즈 실사 크롤링, 2026-09-09)가
발견한 항목입니다:

> "펫프렌즈의 '리뷰에 반려동물 품종/나이/체중 병기'... 반려동물 리뷰 메타데이터는 입력
> 리뷰 파일에 실제로 그런 정보가 있을 때만 안전하게 뽑을 수 있는데, 이번 라운드에선 그
> 파싱 로직까지 새로 만들기엔 범위가 커서 다음 라운드 후보로만 남깁니다."

제가 백로그 마스터(185차 작성)와 이후 모든 완료 기록을 다시 확인했는데, 이 항목은 **152차
이후 지금까지 43라운드 동안 단 한 번도 다뤄지지 않았습니다** — 크롤링 근거가 있고, 코드로
구현 가능하고, API가 필요 없는데도 그냥 방치돼 있던 진짜 격차입니다.

152차가 우려했던 "파싱 로직 신규 필요"는 실제로는 작습니다 — `lib/review-insights.ts`가
이미 `lines`(리뷰 원문 라인 배열)를 갖고 있고, `countLineMatches()`/`matchingLines()`
(51~60행)라는 **LLM 없는 순수 문자열 매칭 패턴**이 이미 있습니다. 같은 패턴을 나이/체중
정규식에 적용하면 됩니다 — 품종(브랜드명처럼 다양해서 지어내기 위험이 있는 자유 텍스트)은
이번엔 제외하고, **숫자 패턴이 명확한 나이·체중만** 다룹니다(anti-fabrication 원칙 —
133차의 "순수 파싱 건수만" 원칙과 동일).

## 작업 — 순수 정규식 카운트, 카테고리 게이팅은 렌더 시점에

### 1. `lib/review-insights.ts` — 신규 카운트 함수

`countLineMatches`(51~53행) 바로 아래에 추가:

```ts
/** 192차 — 반려동물 리뷰 원문에서 나이/체중 언급 라인 수. LLM 호출 없음 —
 *  countLineMatches와 동일하게 순수 정규식 매칭. 숫자 패턴이 뚜렷한 나이·체중만
 *  다룬다(품종명은 자유 텍스트라 지어내기 위험 있어 제외 — anti-fabrication). */
const PET_AGE_WEIGHT_PATTERN =
  /\d+(\.\d+)?\s*(kg|킬로그램|킬로)|\d+\s*(개월|살|세)\b/i;

export function countPetAgeWeightMentions(lines: string[]): number {
  return lines.filter((line) => PET_AGE_WEIGHT_PATTERN.test(line)).length;
}
```

`ReviewInsights` 타입(22~33행)에 `petAgeWeightMentionCount: number` 필드 추가(`reviewLineCount`
바로 아래, 같은 스타일 주석 — "의미적 비율이 아닌 순수 파싱 건수").

`extractReviewInsights()`(229행~) 안에서, `lines`가 만들어지는 즉시(239~240행 부근,
DeepSeek 호출·API 키 유무와 무관하게) `const petAgeWeightMentionCount =
countPetAgeWeightMentions(lines);`를 계산하고, **모든 반환 경로**(`empty`, API 키 없음,
정상 성공 경로 3곳 전부 — 240행 근처 `empty` 객체, 252/257행의 조기 반환, 313행 근처의
최종 반환)에 `petAgeWeightMentionCount`를 포함시키세요. 정규식 매칭이라 DeepSeek 실패
여부와 무관하게 항상 계산 가능합니다.

### 2. `lib/types/generate.ts` — `ReviewHighlightSection`에 필드 추가

`sourceReviewCount?: number;`(436행) 바로 아래에:

```ts
/** 192차 — 반려동물 리뷰 원문에서 나이/체중 언급 라인 수(정규식, LLM 아님).
 *  반려동물 카테고리이고 0보다 클 때만 캡션 노출. */
petAgeWeightMentionCount?: number;
```

### 3. `lib/section-inserts.ts` — 배선

`buildReviewHighlightSection()`(28~71행)와 `insertReviewHighlightSection()`(78~115행)
둘 다 기존 `sourceReviewCount?: number` 파라미터 바로 다음에 `petAgeWeightMentionCount?:
number` 파라미터를 추가하고, `sourceReviewCount`와 동일한 `count != null` 패턴으로
반환 객체에 조건부 포함시키세요(69행 `...(count != null ? { sourceReviewCount: count } : {})`
바로 아래 같은 형태로 하나 더).

### 4. `app/api/generate/route.ts` — 호출부에서 카테고리 게이팅

1633행 `const reviewLineCount = ...` 바로 아래에:

```ts
const petAgeWeightMentionCount =
  body.category === "반려동물"
    ? enrichedBody.reviewInsights?.petAgeWeightMentionCount
    : undefined;
```

**여기서 카테고리 게이팅을 하는 이유**: `extractReviewInsights()` 자체는 카테고리를 모르고
항상 계산하지만(정규식이라 비용 0), 반려동물이 아닌 카테고리 리뷰에 우연히 "2kg", "3개월"
같은 표현(전자제품 무게, 가입 기간 등)이 섞이면 엉뚱하게 "반려동물 나이/체중 언급"으로
캡션이 뜰 수 있습니다 — 그래서 **표시는 반려동물 카테고리로만 한정**합니다. 1637~1644행의
`insertReviewHighlightSection(...)` 호출에 이 값을 추가 인자로 전달하세요.

### 5. 렌더링 — `sourceReviewCount` 캡션 바로 옆에 조건부로

`components/DetailSectionRenderer.tsx` 3199~3207행(`sourceReviewCount` 캡션)을 참고해,
**같은 자리에 조건부로 한 줄 더**:

```tsx
{typeof section.petAgeWeightMentionCount === "number" &&
section.petAgeWeightMentionCount > 0 ? (
  <p
    data-testid="review-highlight-pet-signal"
    className="mx-auto mt-1 max-w-xl text-center text-[11px] text-ink/40 sm:text-xs"
  >
    반려동물 나이·체중 언급 리뷰 {section.petAgeWeightMentionCount}건
  </p>
) : null}
```

`lib/export-detail-html.ts`의 `review_highlight` 케이스에서 `sourceReviewCount`를 렌더하는
자리(grep으로 찾아 동일 패턴)에도 정적 export용으로 동일하게 추가하세요.

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `countPetAgeWeightMentions()`를 `npx tsx`로 직접 호출: "우리 강아지 3살인데 체중 5kg라
   딱 맞아요" 같은 문장 → 1, "배송이 빨라요" 같은 무관 문장 → 0.
3. `review/181cha-live/pet/` 세션에 실제 첨부된 리뷰 파일이 있다면 그걸로, 없다면 위와
   같은 샘플 리뷰 텍스트로 `extractReviewInsights()` 호출 → `petAgeWeightMentionCount` 값
   확인.
4. 반려동물 카테고리로 렌더링했을 때만 캡션이 뜨고, 다른 카테고리(예: 전자제품, "2kg"가
   스펙에 있는 상품)는 `petAgeWeightMentionCount`가 있어도 캡션이 안 뜨는지(게이팅 확인).
5. `sourceReviewCount` 기존 캡션이 여전히 정상 렌더되는지(회귀 없음).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회) — 기존 DeepSeek 리뷰 추출 호출도 늘리지 않음.
- 품종(브랜드/견종명) 추출은 이번에 하지 않음 — 자유 텍스트라 지어내기 위험, 나이·체중
  숫자 패턴만.
- 반려동물 외 카테고리에 이 캡션이 뜨지 않도록 반드시 게이팅(위 4번 검증 필수).
- 퍼센트/비율 파생 통계 금지 — 순수 매칭 라인 수만(133차 원칙과 동일).
- `insertReviewAxisComparisonSection`, `extractReviewInsights`의 DeepSeek 프롬프트 자체는
  미수정.
- 174~191차가 끝낸 아이콘/elevation/radius/font/hero/그레인/대비/표시예산/lazy-loading
  로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + 정규식 매칭 테스트 결과(샘플 2~3건) + 카테고리 게이팅 확인 결과 + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/192cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다.
