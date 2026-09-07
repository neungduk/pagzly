# 133차 — 정보 밀도·근거 강화 3건 (신규 유료 API 호출 없음)

생성: 2026-09-07
전제: 9/7 마켓플레이스 실물 크롤링(`claude/marketplace_crawl_findings_2026-09-07.md`, 지마켓/옥션/후커블
실제 상세페이지 확인)에서 나온 미착수 항목 3건을 이번 라운드에서 묶어 처리합니다. 132차와 마찬가지로
**모두 결정론적이거나 기존 호출의 프롬프트/노트 텍스트만 보강** — 신규 API 호출·모델 전환 없음.

---

## A. 전자제품 `spec_table`에 인증정보(KC 등) 노출

### 배경
옥션 실제 무선청소기 상세페이지의 법정 고시 표에는 **KC 인증정보·정격전압**이 명시돼 있었습니다
(`marketplace_crawl_findings_2026-09-07.md` §2). Pagzly `lib/section-templates.ts`의 `ELECTRONICS`
`spec_table` 슬롯 note는 현재 `"전체 스펙 표 — 규격/전력/호환성. 입력 데이터에 없는 수치는 공란
처리"`로만 돼 있어, 판매자가 `certifications` 필드에 KC 인증번호를 입력해도 spec_table에 그대로
노출되는지 명시적으로 지시하고 있지 않습니다. 식품 카테고리는 `FOOD_SLOT_FACT_PROMPT`로 이미 같은
패턴(입력·고시 근거만, 없으면 "판매자 확인 필요")이 있는데 전자제품만 비어 있습니다.

### 할 것
`lib/section-templates.ts`의 `ELECTRONICS` 배열 `spec_table` 슬롯 note에 한 문장만 추가:

```ts
note: "전체 스펙 표 — 규격/전력/호환성. 입력 데이터에 없는 수치는 공란 처리. certifications 필드에 KC/전자파적합성 등 인증정보가 있으면 별도 행으로 그대로 노출(예: '인증' 행에 입력값 그대로). 입력에 없는 인증번호를 지어내지 말 것 — 없으면 행 자체를 생략.",
```

문구는 자유롭게 다듬어도 되나 취지(입력에 있으면 노출/없으면 생략, 지어내기 금지)는 유지하세요.
`FASHION`/`HOME_FALLBACK` 등 다른 카테고리 spec_table은 건드리지 않습니다 — 이번 라운드는 전자제품만.

### 검증
- `certifications` 필드에 임의 텍스트(예: "KC인증 12345")를 넣은 더미 상품으로 TEST_MODE 생성 1회 →
  spec_table 행에 그대로 노출되는지 확인.
- `certifications` 필드가 비어있는 더미 상품으로 1회 → 인증 행이 아예 없는지(공란 아님, 행 자체 생략)
  확인.

---

## B. 헤드라인 카피 — 문제→해결 대비 톤 보강 (입력 근거만)

### 배경
옥션 상세페이지는 풀블리드 사진 위에 큼직한 두 줄 대비 타이포("귀찮고, 힘들었던 / 물걸레 청소까지")로
불편함→해결을 헤드라인에서부터 박아 넣습니다. Pagzly는 이미 `DetailPageCopy`에 `problemStatement`/
`solutionStatement` 필드가 있어 구조적으로 문제→해결을 다루지만, `lib/copy-orchestrator/deepseek-copy.ts`의
`buildStyleRubricBlock()`은 `mainHeadline`에 대해 "25자 내외, 개념 하나만" 규율만 있고 문제→해결 대비를
헤드라인 자체에 반영하라는 지시는 없습니다.

### 할 것
`buildStyleRubricBlock()`의 문체 루브릭에 아래 한 단락만 추가 (기존 규칙 유지, 삭제 없음):

```
- mainHeadline은 가능하면 problemStatement와 대구를 이루게: "불편함(문제) → 해결" 구조를 한 문장 또는
  줄바꿈된 두 구절로. 예: "매번 반복되던 OOO / 이제 한 번이면 끝" 형태. 단, problemStatement/solutionStatement가
  입력 keyFeatures/description에서 뽑아낼 근거가 없으면 억지로 문제를 지어내지 말고 기존처럼 담백한
  설명형 헤드라인으로 두세요 (문제 있는 제품만 대비형, 없으면 강제 금지).
```

**중요 — 하지 말 것과 명확히 구분**: 후커블처럼 "타 제품엔 위험 성분이 있다"는 식으로 근거 없는 불안을
조성하는 패턴은 절대 금지(`marketplace_crawl_findings_2026-09-07.md` §3.2, §5-2). 이번 지시는 입력된
제품 자체의 불편함(사용 전)→해결(사용 후) 대비만 허용하며, 경쟁사·타 제품을 언급하거나 폄훼하는 문구는
`detectCopyHallucinations`/기존 검증 로직이 걸러야 합니다 — 새 검증 룰이 필요하면 리포트에만 남기고
이번엔 프롬프트 문구만.

### 검증
- 화장품 1 + 전자제품 1, TEST_MODE 카피 생성 전/후 `mainHeadline` 나란히 비교해 리포트에 원문 첨부.
- `detectCopyHallucinations`/`detectGenericCliches` 경고 0건(또는 기존 수준 유지) 확인.
- 억지 대비가 만들어지지 않는 케이스(problemStatement 근거 빈약한 상품)도 1건 테스트해 담백한 헤드라인으로
  남는지 확인.

---

## C. `review_highlight` — 실제 분석 리뷰 건수 노출 (결정론적, 신규 API 0회)

### 배경
후커블은 "1000명의 고객 목소리를 담은 단 하나의 문장" 프레이밍으로 리뷰 기반 카피에 신뢰를 더합니다
(`marketplace_crawl_findings_2026-09-07.md` §3.3). Pagzly `review_highlight`는 이미 입력된 실제 리뷰만
쓰지만, "몇 건을 분석했는지"는 화면에 안 보입니다. `lib/review-insights.ts`의 `extractReviewInsights`는
이미 xlsx/txt를 파싱해 리뷰 텍스트 라인 배열을 갖고 있으므로 **그 배열 길이(파싱된 리뷰 라인 수)를 그대로
카운트로 노출**하면 새 API 호출·집계 로직 없이 가능합니다. 퍼센트·비율 같은 파생 통계는 만들지 않습니다
(의미적 매칭 없이는 근거 없는 숫자가 되므로) — **순수 파싱 건수만**.

### 할 것
1. `lib/review-insights.ts`: `extractTextFromXlsx`/`extractTextFromTxt`가 만드는 라인 수(또는 xlsx라면
   유효 행 수)를 `extractReviewInsights` 반환값에 `reviewLineCount: number`로 추가.
2. `lib/types/generate.ts` `ReviewHighlightSection`에 `sourceReviewCount?: number` 옵셔널 필드 추가
   (스키마만, 기존 `concerns` 패턴과 동일하게 없으면 생략).
3. `app/api/generate/route.ts`와 `app/create/result/page.tsx`의 `insertReviewHighlightSection`/
   `buildReviewHighlightSection` 호출부에서 `reviewLineCount`를 `sourceReviewCount`로 전달.
4. `components/DetailSectionRenderer.tsx`와 `lib/export-detail-html.ts`의 `review_highlight` 렌더링에
   `sourceReviewCount`가 있을 때만 heading 근처에 작은 캡션으로 노출: 예) "실제 리뷰 128건 분석" —
   `concerns`와 같은 톤(작은 글자, 낮은 opacity)으로. 값이 없거나 0이면 캡션 자체를 렌더링하지 마세요.

**절대 하지 말 것**: "N건 중 M건이 언급"처럼 개별 praise/complaint 항목에 비율·퍼센트를 붙이는 것 —
그건 의미적 매칭이 필요해 지금 구조로는 근거 없는 숫자가 됩니다. 이번엔 **전체 분석 건수 하나만**.

### 검증
- 실제 리뷰 파일(xlsx 또는 txt) 하나로 스모크 실행 → `sourceReviewCount`가 실제 파싱된 라인 수와
  일치하는지 로그로 확인.
- 리뷰 파일 없이(또는 빈 파일로) 생성 → `review_highlight` 섹션 자체가 기존처럼 생략되거나, praises가
  있는 경우 캡션 없이 렌더링되는지 확인.
- `tsc --noEmit` 0.

---

## 하지 않는 것 (전체 공통)

- 신규 유료 API 호출, 모델 전환 (A/B/C 모두 기존 호출의 프롬프트·노트 텍스트 또는 순수 로컬 카운트만)
- `section-templates` 슬롯 순서/종류 변경, 새 슬롯 신설
- 경쟁사 카피/디자인 복제, 타사 폄훼·근거 없는 불안 조성 (특히 B)
- 개별 리뷰 항목 단위 비율·퍼센트 생성 (C — 전체 건수만)
- MD 캐릭터/손글씨 뱃지 등 마켓 UI 패턴 채택 (marketplace_crawl_findings §1 — 명시적 비권장 항목,
  이번 스코프 아님)
- 식품 외 카테고리 spec_table note 변경 (A — 전자제품만)

## 완료 보고 체크리스트

- [ ] A: ELECTRONICS `spec_table` note에 인증정보 노출 지시 추가
- [ ] A: 인증정보 있음/없음 두 케이스 스크린샷 또는 원문 비교
- [ ] B: `buildStyleRubricBlock`에 문제→해결 대비 헤드라인 규칙 추가 (억지 금지 조건 포함)
- [ ] B: 전/후 헤드라인 원문 비교 2건 + 클리셰/환각 경고 0건 확인
- [ ] C: `reviewLineCount` → `sourceReviewCount` 배선 (review-insights → types → route/result page →
      renderer/export)
- [ ] C: 실제 리뷰 파일로 건수 일치 확인 + 리뷰 없을 때 캡션 미노출 확인
- [ ] `npx tsc --noEmit` 원본 출력
- [ ] `git diff --stat` 원본 첨부
