# 490차 — 배포 횟수 줄이기(Vercel 일일 한도) + 닫힌 상품 결제 경로 막기

## 0. 규칙
- 유료 호출·Production·main 금지. 코드 삭제 금지. 목표는 `review/490-targets.md`에 코드 전에 기재. 파일은 Read 후에만 Write/Edit. 마무리 전 `npx tsc --noEmit`, `npm run build` 통과 필수.
- 이 차수의 커밋은 **최대 3개**로 묶는다(항목마다 커밋하되 A·B를 한 커밋, C를 한 커밋, 보고서를 한 커밋 정도). 이유: 아래 배경.

## 1. 배경 (기획 담당이 확인)
- `cloud-work` 489차 마지막 커밋들의 Vercel 배포가 전부 **"Deployment rate limited — retry in 24 hours"** 로 실패했다(Hobby 플랜 일일 배포 한도). 코드 오류가 아니다. 원인은 이번 며칠간 차수마다 커밋을 5~8개씩 push한 데다 같은 저장소에 Vercel 프로젝트가 2개(pagzly, pagelab)라 커밋 하나가 배포 2번으로 셈해진 것. 그 결과 489차 프리뷰를 24시간 동안 볼 수 없다.
- 489차 코드 자체는 읽어서 확인: 가드가 `generate`·`canvas-ai-image`·`enhance-image` 등 POST 최상단에 있다. 다만 `app/api/billing/{subscribe,purchase-pack}` 은 가드가 없어, 상세페이지 기능이 꺼진 상태에서도 결제 요청이 가능하다(닫힌 상품 결제).

## 2. 항목
### A. 문서 전용 커밋은 배포하지 않기
- `vercel.json`에 `ignoreCommand`를 추가: 변경 파일이 `review/**`(와 `*.md`)뿐이면 빌드 건너뜀. 예: `git diff --quiet HEAD^ HEAD -- . ':(exclude)review' ':(exclude)*.md'` (종료코드 0이면 건너뜀). 기존 `crons` 설정은 그대로 유지. 첫 커밋이거나 `HEAD^`가 없는 경우에도 안전하게 동작하는지 확인하고 `review/490-notes.md`에 기록.
- 이 변경이 `main`에는 영향 없도록 cloud-work에서만 작업(병합은 사용자가 결정). 로컬 검증은 명령을 직접 돌려 종료코드가 의도대로인지 확인(문서만 바꾼 커밋 → 0, 코드 바꾼 커밋 → 1).

### B. 사용자가 해야 할 일 안내 (코드 아님, 보고서에 그대로 적을 것)
- Vercel에서 **pagelab 프로젝트의 Git 연결 해제(또는 프로젝트 삭제)**: 같은 저장소 배포가 2배가 되는 것을 막는다. pagzly 프로젝트만 유지.

### C. 닫힌 상품 결제 경로 막기
- `app/api/billing/subscribe`, `app/api/billing/purchase-pack`: `DETAIL_PAGE_ENABLED` 꺼짐일 때 **외부 결제 호출 전에** 503(489와 같은 헬퍼/문구)로 거절. `billing/me`, `billing/renew`(기존 구독 갱신)는 건드리지 말 것 — 유지 근거를 notes에 기록하고, 기존 유료 구독자가 있는지는 모르므로 "있으면 어떻게 할지는 사용자 결정"이라고 보고서에 적는다.
- 회귀: `scripts/regression/feature-flag-489.ts`에 위 2개 라우트 거절 항목 추가(스텁으로 외부 결제 호출 0회 확인). 기존 회귀 변화 없음.

## 3. 마무리
- `review/490cha-report.md`: 맨 위에 "확인하지 못한 항목", `ignoreCommand` 실측(문서만/코드 변경 두 경우), 결제 가드 처리표, 사용자 할 일(B), `git log -1`/`git status`로 push 확인 후 커밋 해시. push 후 프리뷰 확인은 기획 담당이 한다.
