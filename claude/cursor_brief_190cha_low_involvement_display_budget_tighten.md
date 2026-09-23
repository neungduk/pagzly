# 190차 — 저관여 카테고리 표시 예산 추가 축소 (코드 전용, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 새 카피·
새 이미지 생성 없음 — **이미 생성된 섹션 데이터 중 무엇을 보여줄지만** 조정합니다(183차와
동일한 원칙). 단일 트랙만 정확히 끝내세요.

## 배경 — 이전 크롤링 데이터 vs 181차 실사 재비교 (신규 크롤링 없음, 기존 자료만 재검토)

사용자 요청으로 `claude/hookable_category_examples_2026-09-09.md`(기존 크롤링 자료)와
181차 실사 세션(`review/181cha-live/{cat}/summary.json`, 실제 토큰 써서 만든 마지막
생성물)을 다시 대조했습니다. 결론: **183차가 이미 이 격차의 대부분을 코드로 닫았고
(히어로 스크림/타이포 강화, 저관여 표시 예산 신설, 비교 그리드 3색 대비 강화), 188/189차가
그 위에 WCAG 대비까지 추가로 감사·수정**해서, 이번 재비교에서 새로 발견된 레이아웃 격차는
없습니다. 다만 **183차가 스스로 "더 aggressive 축소는 API 필요"라고 적어 둔 부분
(`review/183cha-report.md` 트랙 C)을 코드로 직접 확인해보니, 실제로는 그 판단이 틀렸습니다**
— 183차가 만든 표시 예산 메커니즘(`lib/section-display-budget.ts`) 자체가 이미 카피 재생성
없이 순수 개수 상한/데모트만으로 동작하므로, 그 상한값을 한 단계 더 낮추는 것도 똑같이
API 없이 가능합니다.

크롤링 근거 재확인(신규 크롤링 아님, 기존 문서 재인용):

- **생활용품**(지마켓 "투명 대형 리빙박스" 실사례): 대표이미지 1장 → 브랜드 인트로 배너 →
  라이프스타일 사진 1장 → (교차판매 그리드/프로모배너 — Pagzly는 애초에 미채택) — 의미 있는
  콘텐츠 블록은 사실상 2~3개.
- **반려동물**(지마켓 "도그존 후레쉬리아" 실사례): 패키지 사진 → (교차판매 그리드/무관 상품
  배너/브랜드 그래픽 배너 — 전부 Pagzly가 채택하지 않는 저품질 관행) — 의미 있는 콘텐츠
  블록은 사실상 1개 수준.

183차가 `review/181cha-live/{living,pet}/summary.json`(raw 28섹션)을 표시 예산으로
**20**까지 줄였는데, 위 실사례 대비로는 여전히 훨씬 많습니다. `lib/section-display-budget.ts`를
제가 직접 읽어 확인한 현재 상태:

```ts
const MAX_EVIDENCE_LOW = 2; // comparison_chart, stat_infographic, tradeoff_card, review_highlight 중 2개까지
...
const MAX_EXTRA_IMAGE_LOW = 1; // material_detail/packaging_design/care_tip/material_feature 중 1개까지
```

## 작업 — 기존 예산 메커니즘의 상한값만 한 단계 낮추기 (신규 로직 없음)

`lib/section-display-budget.ts`를 그대로 두고 **상수 2곳만** 조정하세요:

```ts
const MAX_EVIDENCE_LOW = 1; // 2 → 1: comparison_chart만 남기고 stat_infographic/tradeoff_card/review_highlight 데모트
...
const MAX_EXTRA_IMAGE_LOW = 0; // 1 → 0: material_detail/packaging_design/care_tip/material_feature 전부 데모트(저관여 한정)
```

`EVIDENCE_PRIORITY`(0=comparison_chart 유지 우선)는 이미 comparison_chart를 최우선으로
두고 있으니 그대로 재사용하면 됩니다 — comparison_chart 하나만 남기는 게 목적입니다(수치
비교가 저관여 카테고리에서도 가장 구매결정 기여도가 높다는 183차 판단 유지).

**추가로 판단이 필요한 부분(강제 아님, 실제 데이터 확인 후 결정)**: `step_card`가
`DEMOTE_SLOTS`에 없습니다. `review/181cha-live/{living,pet}/session.json`을 열어
`step_card` 섹션의 실제 내용이 (a) 사용법/설치 안내처럼 구매자에게 실질 정보인지, (b)
장식적 "이렇게 쓰세요" 수준의 반복인지 확인하세요. (b)라면 `DEMOTE_SLOTS`에 `"step_card"`도
추가해서 저관여 카테고리에서 데모트하고, (a)라면 그대로 두고 그 판단 근거를 보고서에
한 줄 남기세요 — 근거 없이 정보성 섹션을 지우지 않는다는 158/159차 원칙과 같은 결입니다.

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `computeDemotedSectionIndexes("생활용품", ...)`/`computeDemotedSectionIndexes("반려동물", ...)`를
   181차 저장 세션(`review/181cha-live/living/session.json`, `pet/session.json`)의 실제
   섹션 배열로 호출해 raw 28 → 표시 몇 개로 줄었는지 숫자로 보고하세요(183차 형식과 동일:
   raw/displayed/demoted slots 표).
3. `applySectionDisplayBudget`로 export HTML을 181차 세션 기준 재렌더링해 before(183차
   기준, 20섹션)/after 스크린샷 1장씩(생활용품 또는 반려동물 하나만)으로 비교.
4. 다른 4개 카테고리(뷰티/패션/식품/전자)는 `isLowInvolvementCategory`가 `false`를 반환해
   영향 없음을 grep/실행으로 확인.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 세션 JSON의 섹션 데이터 자체는 삭제/변경하지 않음 — 표시 시점 필터링만(183차 원칙 그대로).
- `EVIDENCE_TYPES`/`DEMOTE_SLOTS`/`EXTRA_IMAGE_SLOTS` 배열의 슬롯 종류 자체를 새로 발명하지
  않음 — `step_card`(조건부, 위 판단 참고) 외에는 기존 목록 그대로.
- 생활용품/반려동물 외 4개 카테고리는 전혀 건드리지 않음.
- anti-hallucination 게이팅, `comparison-chart-guard.ts`, `assign-section-images.ts` 미수정.
- 174~189차가 끝낸 아이콘/elevation/radius/font/hero/그레인/대비 로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + before/after 표(카테고리별 raw/183차 displayed/이번 displayed) + `step_card`
판단 근거 한 줄 + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/190cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다.
