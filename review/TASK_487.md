# 487차 — 프리뷰 빌드 실패(타입 오류) 복구

## 0. 규칙
- 유료 호출·Production·main 금지. **동작 변경 금지**: 타입 선언만 고친다. 상세페이지 출력(HTML/렌더)은 바이트 동일, label-check 변경 금지.
- 목표는 `review/487-targets.md`에 코드 전에 기재. 파일은 Read 후에만 Write/Edit.

## 1. 배경 (기획 담당이 Vercel 로그로 확인)
cloud-work 7a80322의 Vercel 프리뷰(pagzly 프로젝트) 빌드가 실패했다. 컴파일은 통과했고 `Running TypeScript` 단계에서 아래 2건:
- `components/DetailSectionRenderer.tsx(6524,67)`: `DetailSection[]` 인자가 `{ type: string; slot?; heading?; emphasis?; callout?; items?: string[]; cards?: {title?,body?}[] }[]` 매개변수에 맞지 않음. 원인: `FaqSection.items`가 `{ question: string; answer: string }[]`인데 매개변수 타입은 `string[]`.
- `lib/export-detail-html.ts(2322,52)`: 같은 오류.
즉 FAQ 섹션의 items 타입이 함수 매개변수 타입과 충돌한다. (로컬 dev에서는 타입 검사를 안 해서 지나갔고, 프리뷰 빌드에서 처음 드러난 것으로 보인다.)

## 2. 항목
### A. 원인 확인
- 두 호출 지점이 부르는 함수(매개변수에 위 모양의 인라인 타입을 쓰는 함수)를 찾아 이름·위치를 `review/487-notes.md`에 기록. 이 인라인 타입이 언제 생겼는지 `git log -S`로 최초 커밋(몇 차)을 기록.
- 그 함수가 `items`를 실제로 어떻게 쓰는지 확인(문자열 배열로만 쓰는지, FAQ 객체를 받는 경로가 실제로 있는지).

### B. 최소 수정
- 함수 매개변수 타입을 실제 `DetailSection` 유니온을 받는 타입(또는 `items?: (string | {question: string; answer: string})[]` 처럼 현재 데이터를 포함하는 타입)으로 넓힌다. **함수 본문 로직은 바꾸지 말 것.** 본문이 string만 가정하고 있어 타입을 넓히면 본문 오류가 나면, 바꾸지 말고 notes에 상황을 적고 멈춰서 보고.
- `as any`/`@ts-ignore`로 덮지 말 것.

### C. 빌드 게이트 (이번 차수의 핵심)
- 로컬에서 `npx tsc --noEmit` 와 `npm run build`를 **둘 다 끝까지** 실행해 통과를 확인(실패 시 첫 오류 5개를 notes에 기록하고 같은 방식으로 정리). 다른 파일의 새 타입 오류가 나오면 모두 같은 원칙으로 수정하되 개수·파일을 보고.
- 이후 모든 차수의 마무리 체크리스트에 `npx tsc --noEmit` 통과를 포함하도록 `review/` 하위 기존 체크리스트 문서(있다면)에 한 줄 추가. 없으면 `review/487-notes.md`에만 기록.

### D. 회귀
- 상세페이지 export 출력 바이트 동일(기존 회귀 중 해당 항목), `scripts/regression/label-check-483.ts` 통과, run-all 통과/실패 목록은 이전과 동일(실패 24건 변동 없음 확인).

## 3. 마무리
- `review/487cha-report.md`: 맨 위에 "확인하지 못한 항목", 오류 원인(최초 커밋 차수), 수정 내용, `tsc --noEmit`/`npm run build` 결과, 변경 파일. `git log -1`/`git status`로 push 확인 후 커밋 해시 기재. push 후 Vercel 프리뷰 빌드 성공 여부는 기획 담당이 확인한다.
