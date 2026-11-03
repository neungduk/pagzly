# 481차 보고

## 실제 사진·실제 생성으로 다시 확인하지 못한 항목
- **프리뷰 재배포 후** 동일 product `e8c1c270-dc6a-435d-a915-efab06ab6dd1` 결과 화면을 브라우저에서 다시 열어 본 확인(이번 차수는 유료 재생성·Production/main push 금지).
- 가로 넘침 0의 **Playwright 실측**(320/390/750) — 회귀는 문자열·고정폭 휴리스틱. 픽셀 대비 전수(contrast-render-479)는 장시간이라 별도.
- AI 사진 **픽셀 안** 파스텔 배경 자체를 V5 면색으로 재합성하는 것(읽기 전용·유료 금지).

## 원인 표 (B)
| # | 결론 |
|---|------|
| 1 아키타입 | 뷰티+clinic+시드로 editorial 확정. 항상은 아님. → accent·mood 보너스 강화 후 이 상품은 **catalog** |
| 2 제목 서체 | 라이브에서 fontPairCss가 type-system **뒤**에 와 display-headline을 Noto로 덮음 → 순서 교체 |
| 3 hero-stack | 미적용 아님. AI baseNeutral 면과 충돌 → `--pz-surface`로 사진 주변 통일 |
| 4 섹션 종류 | SLOT_LABELS·킥커 폴백이 slug 노출 → 한글/PROOF |
| 5 배경 | backdrop 파스텔 ≠ color-roles → 사진 래퍼 면색 정렬 |

## 수정 요약
- `pickArchetype`: 팔레트 accent·mood 보너스, 뷰티 후보 확대 → 실사 JSON 자동 **catalog**
- 라이브 폰트 CSS 순서 수정; 사진 주변 `var(--pz-surface)`
- SLOT_LABELS·`slotDisplayLabel`·`getSectionKicker` slug 차단
- 빈 페르소나 사진 → 텍스트 알약; 시계 일러스트 매칭 강화
- 회귀 `scripts/regression/live-481.ts` + run-all 등록

## 남은 문제
- 프리뷰에 아직 미반영(재배포 필요). 배포 전 라이브는 480 editorial 그대로.
- catalog 제목 서체는 Noto(설계) — “서체가 바뀌었다” 체감은 softlife/impact 등과 비교할 때 큼.
- 사진 파일 내부 AI 배경색은 그대로.

## 변경 파일
- `lib/page-archetype-v5.ts`, `lib/display-sections.ts`, `lib/export-detail-html.ts`, `lib/hero-stack-v5.ts`, `lib/illustration-map.ts`, `lib/highlight-family-v5.ts`, `lib/detail-visual-rhythm.ts`
- `components/DetailSectionRenderer.tsx`, `components/GeneratingOverlay.tsx`
- `scripts/capture-live-fixture-481.ts`, `scripts/render-live-481.ts`, `scripts/fixtures/live-481.json`
- `scripts/regression/live-481.ts`, `scripts/regression/run-all.ts`, `scripts/regression/v5-465.ts`
- `review/TASK_481.md`, `481-targets.md`, `481-notes.md`, `481-review.md`, `481cha-report.md`
- `.gitignore` (481-captures/gallery)

## 켜는 법 / 프리뷰에서 확인하는 법
1. Vercel Preview에 `cloud-work` 배포(기존처럼 `NEXT_PUBLIC_DESIGN_V4=on`, `NEXT_PUBLIC_DESIGN_V5=on`).
2. **새 생성 없이** 결과 URL 열기:  
   `/create/result?id=e8c1c270-dc6a-435d-a915-efab06ab6dd1`
3. DOM에서 `data-pz-bsig` / `data-pz-vsig`가 **catalog**(또는 동일 시드·accent 규칙 결과)인지, 사이드바에 `seller_trust` 영문이 없는지, 제목에 V5 서체 링크가 로드되는지 확인.
4. 로컬 재현:  
   `npx tsx scripts/capture-live-fixture-481.ts`  
   `npx tsx scripts/render-live-481.ts`  
   `npx tsx scripts/regression/live-481.ts`

## Push 확인
```
21dc77d test(481): add live-481 regression and eye-review notes
(최종 보고 커밋 해시로 갱신)
branch: cloud-work (main 미푸시)
```
