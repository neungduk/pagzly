# 255차 — 라이브 미리보기 ↔ export 불일치 5건 일괄 정정

- 날짜: 2026-09-28
- API generate: **0** (DeepSeek/Replicate/Vision 호출 0, 신규 상품 생성 0)
- 검증: `scripts/255cha-parity-verify.ts` (라이브 = `/dev/detail-preview?capture=…`, export = 같은 픽스처를 `buildDetailPageHtml()`에 넣어 렌더, 둘 다 430px)
  - `after` 결과: **34/34 PASS** (`review/255cha-parity-fix/results-after.json`)
  - `before` 캡처는 수정 전 export 코드(`cb92604`의 `lib/export-detail-html.ts`)를 임시로 되돌려 찍고 HEAD로 복구

## 결과 요약

| 항목 | 수정 | 파일:라인 (HEAD 기준) | 전/후 캡처 (`review/255cha-parity-fix/`) | 특이사항 |
|---|---|---|---|---|
| 1 line-clamp | 했음 | `lib/export-detail-html.ts` `lineClamp()` :186, hero 서브 :360, 메가키워드 :373/:397, callout 본문 :635, editorial 본문 :657, split 헤딩·본문 :720–721, 기본 분기 :737–738, caution 본문 :999 | `1-before.png` / `1-after.png` / `1-live.png`, 측정값 `1-clamp-probe-{before,after}.json` | **브리프 전제와 다름** — 아래 "항목 1 상세" 참고. 라이브에서 실제로 잘리는 요소에만 적용 |
| 2 text_only | 했음 | `lib/export-detail-html.ts` :574 | `2-before.png` / `2-after.png` / `2-live.png` | 브리프 설명보다 심각했음: textPanelWrap이 아니라 **split 분기로 떨어져 배정 단계가 뺀 사진 + POINT 배지가 다시 붙어** 나감 |
| 3 seller_trust_evidence | 했음 | `lib/export-detail-html.ts` :386~ | `3-before.png` / `3-after.png` / `3-live.png`, 헤딩 있는 변형 `3-*-with-heading.png` | 라이브 버그를 그대로 따라감 — 아래 "발견한 버그" 1번 (판매자 문구 첫 단어 누락) |
| 4 self_assessed 고지 | 했음 | `lib/export-detail-html.ts` :237 (`comparisonChartBodyHtml`), `lib/comparison-chart-guard.ts` `SELF_ASSESSED_DISCLAIMER` export, `components/DetailSectionRenderer.tsx` 하드코딩 → 상수 | `4-before.png` / `4-after.png` / `4-live.png` | 문구는 서버 가드가 이미 쓰던 상수를 공유 (중복 하드코딩 제거). 라이브의 회색 pill 스타일까지 맞춤 |
| 5 circle + chart 콤보 | 했음 | `lib/circle-comparison-combo.ts` (신규, 라이브에서 동일 코드 이동), `lib/export-detail-html.ts` :279 `circleComparisonComboHtml`, 루프 :1286/:1303 | `5-circle-then-chart-*`, `5-chart-then-circle-*`, `5-non-adjacent-*` (각 before/after/live) | 비인접(대조군)은 병합 안 됨 확인. 앵커 id는 라이브처럼 앞 인덱스 것만 사용 |

## 커밋 (main, 아직 push 안 함)

```
949aeac fix(export): 255차 항목5 — 인접 circle + comparison_chart 콤보 병합 (감지 로직 lib/circle-comparison-combo로 라이브와 공유, chart 본문 공용 함수화)
a8b6ad4 fix(export): 255차 항목3 — highlight_box slot:seller_trust_evidence 전용 분기 (1열 인용구 카드, 번호 pill·카드 키워드 없음, 헤딩 비면 헤더 생략 — 라이브와 동일)
7d38829 fix(export): 255차 항목2 — image_text layout:text_only 전용 분기 (사진·POINT 배지·카드 없이 좌측 정렬 텍스트, 라이브와 동일)
c6a3435 fix(export): 255차 항목4 — comparison_chart basis:self_assessed 고지 폴백 (basisNote 없어도 '자체 평가 기준' 노출, 문구는 comparison-chart-guard 상수 공유)
4efb357 fix(export): 255차 항목1 — 라이브에서 실제로 잘리는 요소에만 line-clamp 정렬 (…)
cb92604 chore(qa): 255차 라이브↔export 패리티 하네스 — 128 콤보 픽스처 분리 + 255-* 캡처 + 검증 스크립트
```

+ 이 보고서/스크립트 보정 커밋 1개. `.env*` 스테이징 없음, force-push 없음.
`pagzly-backlog-master-2026-09-15.md`, `claude/cursor_brief_255cha_export_live_parity_batch.md`의 기존 미커밋 변경(Claude 측)은 건드리지 않음.

## 항목 1 상세 — 브리프 전제 정정

브리프는 "`HEADLINE_CLAMP` + `TYPO.sectionTitle` 헤딩 12곳 이상이 라이브에서 2줄로 잘린다"고 봤지만, **`TYPO.sectionTitle` 문자열 자체에 `pagzly-ink-headline`이 들어 있음** (`components/DetailSectionRenderer.tsx` TYPO 정의).
`.pagzly-ink-headline{display:inline-block}`은 `app/globals.css`에서 `@media (prefers-reduced-motion: no-preference)` 안의 **레이어 없는(unlayered) CSS**라, `@layer utilities`에 있는 Tailwind `line-clamp-2`의 `display:-webkit-box`를 항상 이김 → clamp 무력화. 브리프가 예외로 든 SectionHeader·hero와 **같은 이유로** 아래 헤딩들도 라이브에서 실제로는 안 잘림:

comparison_table, comparison_chart, tradeoff_card, spec_table, color_variation, stat_infographic, usage_steps, step_card, gallery, caution(헤딩), review_highlight, before_after, ai_disclosure(헤딩), brand_story, faq, target_persona, annotated/callout 헤딩.

Playwright로 computed style을 직접 측정해 확인함 (`1-clamp-probe-before.json`: 해당 h3들은 `display: inline-block`, 자연 줄 수 그대로 3~7줄).
→ 이 헤딩들에 export clamp를 추가하면 역방향 불일치가 생기므로 **추가하지 않음**.

실제로 export에 넣은 clamp (라이브에서 잘림 확인된 것만):

| 라이브 요소 | 줄 수 | export 위치 |
|---|---|---|
| hero 서브헤드라인 | 2 | hero `<p>` |
| SectionHeader 메가키워드 `<p>` (ink 클래스 없음) | 2 | checklist·highlight_box 키워드 `<p>` |
| split(일반 image_text) 헤딩 — 219차에 ink 뺀 곳 | 5 | split 분기 dh2 (annotated 제외) |
| split 본문 | 7 | split 분기 `<p>` |
| annotated 본문 | 3 | split 분기 `<p>` (annotated일 때) |
| callout 본문 | 3 | callout 분기 + 기본 분기(callout인데 말풍선 문구 없는 경우) |
| editorial bleed 본문 | 4 | editorial 분기 `<p>` |
| editorial bleed 헤딩 | 1 | 기존 `nowrap+ellipsis` 유지 (동일 1줄 결과) |
| caution 본문 | 3 | caution `<p>` |

- 브리프의 "annotated 계열 line-clamp-5/7"은 실제 코드상 **일반 split 분기**의 값이고, annotated는 헤딩 무제한(ink)/본문 3줄.
- 스킵: `ai_disclosure` 본문(라이브 3줄) — export는 `<strong>헤딩</strong> — 본문` 한 줄 구조라 구조 자체가 다름. 고지 문구를 자르는 것도 부담이라 이번엔 보류.
- 스킵: checklist `compactFollow` 헤딩 — 브리프대로 도달 불가 경로.
- 측정 메모: split 헤딩은 라이브 2rem vs export 1.75rem(`FONT_SIZE.sectionLg`)이라 같은 긴 문구가 라이브 5줄(잘림)/export 4줄(한도 미만). clamp 규칙은 동일(5줄), 줄 수 차이는 기존 폰트 크기 차이.

## 발견한 버그 / 남은 불일치 (이번엔 수정 안 함)

1. **[라이브 버그, 우선] seller_trust_evidence 카드에서 판매자 문구 첫 단어가 사라짐.** 라이브는 카드 제목에 `parseMegaKeywordHeading`을 적용해 `keyword ? remainder : title`을 쓰는데, trust 분기에선 키워드 `<p>`를 숨김 → "올리브영 수분크림 부문 3주 연속 판매 1위"가 "수분크림 부문 3주 연속 판매 1위"로 표시됨. 원칙(라이브=정답)대로 export도 같게 맞춰서, **수정 전 export는 전체 문구가 나갔는데 지금은 export도 첫 단어가 빠짐**. 권장: 다음 라운드에 라이브·export 둘 다 trust일 때 `card.title` 전체 사용 (한 줄 수정씩).
2. highlight_box 표준 분기: export 헤더에 kicker("KEY POINTS")가 없고, boldBlock 강조 카드 색이 라이브와 반전(export는 paper 배경). trust 헤더도 같은 export 헤더 마크업을 써서 kicker가 없음.
3. circle-pair/solo 단독 섹션: export 원 크기 96/120px vs 라이브(sm 이상) 120/150px.
4. 콤보에서 뒤쪽 섹션의 앵커 id는 라이브·export 모두 사라짐(앵커 내비 링크가 뒤쪽 섹션을 가리키면 이동 안 됨).
5. dev 미리보기 `?capture=` 모드는 `useState`에서 `window`를 읽어 hydration mismatch 경고가 뜸 (기존 이슈, 모든 capture 공통, QA엔 영향 없음).
6. `npx tsc --noEmit`: 기존 에러만 남음 (`lib/lifestyle-product-composite.ts` 3건, 228~243차 QA 스크립트 `execSync` 타입) — 이번 변경 파일에는 에러 없음.

## QA 인프라 변경

- `app/dev/detail-preview/parity-fixtures.ts` (신규): 128차 콤보 픽스처 3개를 page.tsx에서 **그대로 이동**(내용 변경 없음) + 255차 캡처 4개. page.tsx는 이 모듈을 import (tsx 스크립트가 "use client" 페이지를 직접 import할 수 없어서).
- 새 캡처: `255-clamp`, `255-text-only`, `255-trust-evidence`, `255-self-assessed`.
- 이 환경에 Playwright Chromium이 없어 `%LOCALAPPDATA%\ms-playwright`에 설치 후 `PLAYWRIGHT_BROWSERS_PATH`로 지정해 실행함.
- 캡처 폴더 `review/255cha-parity-fix/`는 이전 라운드 관례대로 커밋하지 않음(로컬 보관).

## 백로그 반영 대상 (Claude 실행검증 후 갱신)

- §1(해결): 255차 항목 1~5.
- §3(신규 후보): 위 "발견한 버그" 1(trust 첫 단어 누락, 라이브+export), 2(highlight_box kicker/강조색), 3(circle 크기), 4(콤보 앵커), `ai_disclosure` 본문 clamp 구조 차이.
- 참고: "HEADLINE_CLAMP이 붙은 sectionTitle 헤딩은 라이브에서 안 잘린다"는 사실 자체가 설계 의도와 다를 수 있음 — 헤딩을 실제로 2줄 제한하려면 라이브 CSS(ink 클래스 display)부터 바꿔야 하고, 그땐 export도 같이 바꿔야 함.
