# 137차 — "비교(comparison_chart)"를 후커블 수준 근거형으로 (신규 유료 API 호출 없음)

생성: 2026-09-07

## 배경 (사용자 원문)

> "상세페이지 업그레이드 할거 지시사항줘 비교는 진짜 후커블과 비슷하게 나오도록"

전제 문서: `claude/marketplace_crawl_findings_2026-09-07.md` §3.3 — 후커블은 "1000명의 고객 목소리"
문구를 펼치면 실제 리뷰 인용 + 막대그래프(안정성/효과/자극감 비율)가 나타나는 "근거 보기" 패턴을 씁니다.
Pagzly에는 이미 `comparison_chart` 슬롯(막대 비교, `basis: measured/self_assessed`)이 있지만, 지금은
AI(DeepSeek)가 스펙·입력 설명을 보고 주관적으로 추정한 수치(`self_assessed`, 30~85 범위)로만 채워집니다.
이번 라운드는 **리뷰 파일이 있을 때 그 수치를 AI 추정이 아니라 실제 업로드된 리뷰 텍스트에서 결정론적으로
계산한 값으로** 채우고, 후커블처럼 펼치면 근거(실제 리뷰 원문)가 보이는 토글을 추가합니다.

## 먼저 분명히 할 것 — "비슷하게"의 범위

**구조·UX 패턴만 참고합니다**: "막대 비교 + 펼치면 근거가 보인다"는 아이디어만 가져옵니다. 후커블의 실제
카피 문구, 색상·폰트·로고·정확한 레이아웃을 그대로 베끼지 않습니다. 실제 타사 브랜드명과 비교하지
않습니다(`baselineLabel`은 기존처럼 "일반 제품"만 화이트리스트로 허용, 그대로 유지). 그리고 이번 라운드의
핵심 차별점은 — 후커블의 막대그래프가 실제로 어떻게 산출되는지는 확인할 수 없었지만(§3.3의 결론이기도
함), Pagzly는 **LLM이 숫자를 하나도 만들지 않습니다.** DeepSeek는 "이 리뷰에서 실제로 반복되는 주제가
뭔지" 라벨만 제안하고, 그 라벨이 진짜 리뷰에 몇 번 나오는지는 서버가 문자열 매칭으로만 계산합니다 —
라벨이 근거 없이 지어낸 것이면 매칭이 0~1건이라 자동으로 버려지는 구조입니다(아래 B 참고).

---

## A. 리뷰 축 라벨 제안 (기존 DeepSeek 리뷰 요약 호출에 필드 1개 추가 — 신규 호출 없음)

`lib/review-insights.ts`의 `extractReviewInsights()`가 이미 호출하는 DeepSeek 프롬프트(리뷰 파일 있을
때만 1회 호출되는 그 호출)에 필드 하나를 추가 요청하세요:

```
"reviewAxes": ["리뷰에 실제로 반복 언급되는 속성 축 2~3개, 각 4자 이내(예: '흡수력','자극감','향','내구성'). 원문에 실제로 나타나는 주제만 뽑으세요. 숫자·퍼센트·순위는 쓰지 마세요 — 라벨 문자열만."]
```

`normalizeInsights()`가 `reviewAxes`를 배열로 파싱(문자열만, 최대 3개, 각 6자 초과분은 트림)하도록
확장하세요. `ReviewInsights` 타입에는 넣지 않아도 됩니다(서버 내부 계산에만 쓰고 밖으로 노출 안 해도
무방 — 아래 B에서 바로 소비).

## B. 축별 결정론적 매칭 비율 계산 (LLM 재호출 없음, 135차 `countLineMatches` 재사용)

같은 함수 안에서(이미 `lines` 배열을 갖고 있음) 아래 계산을 추가하세요:

```ts
const axisScores = reviewAxes
  .map((label) => {
    const matchCount = countLineMatches(lines, label);
    const pct = reviewLineCount > 0 ? Math.round((matchCount / reviewLineCount) * 100) : 0;
    return { label, matchCount, ourValue: Math.min(95, Math.max(20, pct || 20)) };
  })
  .filter((a) => a.matchCount >= 2); // 신호 약한(0~1건) 축은 버림 — 지어낸 라벨 자동 필터링
```

**살아남은 축이 2개 미만이면 이 기능 자체를 생략하세요** — 억지로 차트를 만들지 않습니다. 축별 실제
매칭 리뷰 라인도 최대 2개까지 원문 그대로 붙잡아 두세요(다음 단계에서 "근거 보기"에 씀) — `matchCount`를
셀 때 쓴 것과 같은 `lines.filter(...)` 결과를 재사용하면 됩니다.

`extractReviewInsights()`의 반환값에 `axisComparison?: { label: string; ourValue: number; quotes: string[] }[]`
형태로 포함시키세요(축이 2개 미만이면 `undefined`/빈 배열).

## C. 서버가 `comparison_chart` 섹션을 직접 삽입 (AI 아님 — `review_highlight`와 동일 패턴)

`lib/section-inserts.ts`에 `insertReviewHighlightSection()`과 같은 스타일로 새 함수를 추가하세요:

```ts
export function insertReviewAxisComparisonSection(
  sections: DetailSection[],
  axisComparison: { label: string; ourValue: number; quotes: string[] }[] | undefined,
  brandName?: string | null,
): DetailSection[]
```

- **조건**: `axisComparison`이 2개 이상 있고, `sections`에 **이미 `type === "comparison_chart"`인
  섹션이 없을 때만** 삽입하세요 — DeepSeek가 이미 자체적으로 comparison_chart를 만든 케이스라면 서버가
  또 만들지 않습니다(중복 COMPARE 섹션 방지). 이미 있으면 그냥 `sections` 그대로 반환.
- `ourLabel: brandName?.trim() || "우리 제품"`, `baselineLabel: "일반 제품"`(기존 화이트리스트 그대로),
  `unit: "%"`, `basis: "measured"`, `basisNote: "실제 업로드 리뷰 텍스트 기반 언급 비율(가정 기준선 50 대비)"`.
- `metrics`: `axisComparison`을 `{ label, ourValue, baselineValue: 50 }`로 매핑(50은 고정 중립
  기준선 — 실측 아님을 `basisNote`에 이미 명시했으므로 과장 아님).
- `evidenceQuotes`: `axisComparison`의 `quotes`를 `{ label, quotes }[]`로 그대로 실어 보내세요.
- 삽입 위치는 `review_highlight`와 동일하게 `ai_disclosure`/`cta_price` 직전(단, `review_highlight`가
  이미 삽입돼 있으면 그 바로 앞에 두는 것을 권장 — 순서는 자유, 리포트에 어디 뒀는지만 명시).

`app/api/generate/route.ts`에서 `insertReviewHighlightSection()` 호출 근처에 이어서
`insertReviewAxisComparisonSection()`도 호출하도록 배선하세요(리뷰 파일이 없으면 `axisComparison`이
없으니 자연히 스킵됩니다).

## D. 타입 배선

`lib/types/generate.ts`의 `ComparisonChartSection`에 필드 추가:

```ts
/** 137차 — basis:"measured"이고 리뷰 근거가 있을 때만. 축별 실제 매칭 리뷰 원문(최대 2개), 지어내지 않음 */
evidenceQuotes?: { label: string; quotes: string[] }[];
```

## E. "근거 보기" 렌더링

`components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts` 둘 다의 `comparison_chart`
케이스에서: `section.evidenceQuotes`가 있으면 차트 아래에 접이식 "근거 보기" 토글을 추가하세요. 펼치면
해당 축의 실제 리뷰 원문을 `review_highlight` 카드와 통일감 있는 스타일(따옴표, 옅은 톤)로 보여주세요.
`evidenceQuotes`가 없는 케이스(AI가 만든 기존 `self_assessed` 차트)는 토글 자체를 렌더링하지 않습니다 —
기존 동작 그대로 유지.

---

## 검증

- fixture 리뷰 파일로 축 후보·매칭 라인 손검산표를 `review/137cha-axis-match.txt`에 남기세요(135차
  B 손검산과 같은 형식 — 라벨/키워드/count/매칭라인).
- 리뷰 파일 있는 케이스(축 2개 이상 살아남는 것 확인) 스크린샷 1장, "근거 보기" 펼친 상태 스크린샷 1장,
  리뷰 파일 없는 케이스(이 섹션 자체가 안 생기는 것) 스크린샷 1장.
- DeepSeek가 이미 자체 `comparison_chart`를 만든 케이스에서 서버가 중복으로 또 삽입하지 않는지 1건
  테스트.
- `tsc --noEmit` EXIT_CODE=0, `git diff --stat`.

## 하지 않는 것

- 실제 타사 브랜드명과 비교 금지 — `baselineLabel` 화이트리스트("일반 제품") 그대로 유지.
- 후커블의 카피 문구·색상·로고·정확한 레이아웃을 그대로 베끼지 않습니다 — "막대 비교 + 근거 펼치기"라는
  구조 패턴만 참고.
- `baselineValue`(고정 50)를 실측치처럼 과장 표현 금지 — `basisNote`에 항상 "가정 기준선"임을 명시.
- 새 유료 API 호출 추가 금지 — 기존 리뷰 요약 DeepSeek 호출 1회 안에 필드만 추가.
- 134차가 만졌던 편집 패널 UI 파일(`SectionPatchChat.tsx` 등)은 이번에도 건드리지 않습니다.
- **136차(안 쓰는 코드 정리)가 아직 완료 보고 전이면, 137차 착수 전에 136차 작업분을 먼저 커밋해
  주세요** — 삭제 작업과 이번 신규 기능 작업이 같은 미커밋 상태로 섞이면 diff 검증이 어려워집니다.

## 완료 체크리스트

- [ ] A: `reviewAxes` 프롬프트 필드 추가 + 파싱
- [ ] B: `countLineMatches` 재사용 축 매칭 계산 + `matchCount < 2` 필터링 + `axisComparison` 반환
- [ ] C: `insertReviewAxisComparisonSection()` 추가 + 중복 방지(기존 comparison_chart 있으면 스킵) + route.ts 배선
- [ ] D: `ComparisonChartSection.evidenceQuotes` 타입 추가
- [ ] E: 웹 컴포넌트 + HTML export 양쪽 "근거 보기" 토글, `evidenceQuotes` 없으면 토글 미노출
- [ ] 손검산표 + 스크린샷 3장 + 중복 방지 테스트 1건
- [ ] `tsc --noEmit` EXIT_CODE=0, `git diff --stat`
