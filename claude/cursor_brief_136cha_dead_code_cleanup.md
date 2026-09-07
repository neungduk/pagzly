# 136차 — 안 쓰는 코드(데드 코드) 정리 (도구 기반 탐지 + 이중 확인, 유료 API 없음)

생성: 2026-09-07

## 배경 (사용자 원문)

> "너무 코드가 많아서 그런데 좀비코드 안쓰는 코드 이런거 싹 좀 정리 할 수 있을까?"

130차에서 이미 한 번 정리를 했었습니다(`review/130cha-report.md`) — 하지만 그때는 **`@deprecated` 태그가
명시적으로 붙은 export만** 대상이었고(5건 중 5건 삭제), 태그 없이 그냥 안 쓰이는 코드는 다루지 않았습니다.
이번엔 범위를 프로젝트 전체로 넓히되, **삭제 기준을 "느낌"이 아니라 "레퍼런스 0건"으로 엄격하게** 잡습니다.

## 방법론 — 반드시 이 순서로

1단계(도구) → 2단계(수동 재확인) → 3단계(화이트리스트 제외) → 4단계(삭제) → 5단계(빌드/스모크 검증).
어느 단계든 확신이 안 서면 **삭제하지 말고 후보로만 리포트에 남기세요.**

### 1단계 — `knip`으로 미사용 파일/export 탐지

```
npm i -D knip
npx knip > review/136cha-knip-report.txt
```

(devDependency 설치만, 런타임·API 비용 없음.) 리포트를 그대로 저장하세요 — 다듬지 마세요.

### 2단계 — knip 결과 각 항목을 grep으로 재확인

knip은 동적 import(`import(...)` 문자열, Next.js 라우트 파일 자동 로딩, 문자열로 참조되는 컴포넌트 이름
등)를 놓칠 수 있습니다. knip이 "미사용"이라고 한 파일/export 하나하나에 대해 실제로
`grep -rn "<파일명 또는 export명>"` 으로 프로젝트 전체(문자열 리터럴 포함)에서 다시 검색하세요. knip과
grep 둘 다 0건일 때만 3단계로 넘어갑니다.

### 3단계 — 화이트리스트 (knip이 unused라고 해도 삭제 금지)

- `app/**/page.tsx`, `app/**/route.ts`, `app/**/layout.tsx`, `middleware.ts` — Next.js가 파일
  경로로 자동 로딩하므로 코드 임포트가 없어도 정상입니다. `app/dev/detail-preview/page.tsx`(133차에서
  확인된 dev 전용 프리뷰 도구)도 포함.
- `supabase/functions/**` — 별도 배포되는 Edge Function, 앱 코드에서 import 안 해도 정상.
- `scripts/**` — 사람이 CLI로 수동 실행하는 스크립트(QA 캡처, 마이그레이션 등). 앱 코드에서 안 불러도
  삭제 대상 아님.
- 타입만 export하는 경우 — 다른 파일이 타입 추론용으로만 쓰면 knip이 오탐할 수 있으니 grep으로
  실제 0건인지 재확인.
- `review/`, `claude/`, `CLAUDE.md`, `AGENTS.md`, `CLAUDE_CODE_AUTO_LOOP.md` — **절대 건드리지
  않습니다.** 이번 정리 대상이 아닙니다(Cursor/Claude 작업 맥락·검증 기록 파일).

### 4단계 — 실제 삭제

1~3단계를 통과한 것만 삭제하세요. 삭제는 파일 그룹 단위로 나눠서 진행하세요(예: `lib/` 먼저 커밋,
`components/` 다음 커밋) — 한 번에 몰아서 지우면 문제가 생겼을 때 어디서 깨졌는지 찾기 어렵습니다.
로직을 "정리"하거나 "리팩터링"하지 마세요 — 순수하게 안 쓰는 파일/export를 지우는 것만입니다. 남기는
코드는 한 글자도 바꾸지 마세요.

### 5단계 — 검증 (가장 중요)

- `npx tsc --noEmit` — 삭제 전/후 EXIT_CODE 비교, 0 유지.
- **`npm run build`(프로덕션 빌드)** — dev 서버는 lazy-compile이라 안 쓰는 파일이 있어도 안 걸릴 수
  있습니다. 실제로 빌드가 깨지는지가 가장 확실한 검증입니다. 반드시 실행하고 EXIT_CODE를 리포트에
  남기세요.
- TEST_MODE 상세페이지 생성 1회 스모크(기존 방식대로) — 실제 파이프라인이 정상 동작하는지 확인.
- knip이 "미사용"이라 했는데 실제로는 동적으로 쓰이던 게 하나라도 발견되면 **즉시 그 삭제만 되돌리고**
  리포트에 "오탐" 사례로 명시하세요 (전체 작업을 롤백할 필요는 없습니다).

## 부수 항목 (선택, 매우 저위험) — 저장소 루트 정리

`review/`·`claude/`와 별개로, 프로젝트 **루트**에 초기 라운드(20~47차)의 `cursor_brief_NNcha_*.md`가
그대로 흩어져 있습니다. 이 중 상당수는 이미 `claude/` 폴더에도 같은 회차 브리프가 있습니다(예:
`claude/cursor_brief_45cha_competitor_research_v2_upgrade.md`). 루트 사본이 `claude/` 사본과 내용이
같으면(diff로 확인) 루트 쪽은 중복이니 삭제해도 됩니다 — 다르면 둘 다 보존하고 리포트에만 남기세요.
그 외 루트의 `git-stat-full.txt`, `_git_diff_verbatim.txt`, `how --stat HEAD  git-stat-full.txt`(파일명
자체가 깨진 흔적이 있는 1회성 로그 — 실수로 생성된 파일로 보임), `.env.local.127cha-bak`(현재
`.env.local`과 바이트 동일한 걸 이미 확인했음 — `claude/` 대화 기록에 근거 남아있으니 안전하게 삭제
가능)도 삭제 후보입니다. `MERGE_SUMMARY.md`/`PROGRESS_LOG.md`/`pagzly-billing-architecture-2026.md`/
`pagzly-pricing-cost-model-2026.md`는 **이번엔 건드리지 마세요** — 여전히 참고되는 문서인지 확신이
없으니 이번 라운드 범위 밖입니다.

## 하지 않는 것

- 비즈니스 로직 변경 금지 — 순수 삭제만, 리팩터링 금지.
- `review/`, `claude/`, `CLAUDE.md`, `AGENTS.md`, `CLAUDE_CODE_AUTO_LOOP.md` 삭제 금지.
- 화이트리스트(3단계)에 해당하는 파일 삭제 금지.
- knip 결과를 grep으로 재확인 없이 그대로 믿고 삭제 금지.
- 새 유료 API 호출 추가 금지.
- `MERGE_SUMMARY.md`/`PROGRESS_LOG.md`/가격·과금 설계 문서 삭제 금지(이번 범위 아님).

## 완료 체크리스트

- [ ] `review/136cha-knip-report.txt` 저장
- [ ] knip 후보 전체 grep 재확인 결과표(파일/export별 grep 히트 수) 리포트에 첨부
- [ ] 화이트리스트 제외 적용 확인
- [ ] 실제 삭제된 파일/export 목록 전체 (파일명 리스트, 커밋 단위별로)
- [ ] `tsc --noEmit` 삭제 전/후 EXIT_CODE 비교
- [ ] `npm run build` EXIT_CODE=0
- [ ] TEST_MODE 생성 스모크 1회 정상 동작
- [ ] 오탐 발견 시 해당 건만 롤백 + 리포트 명시
- [ ] (선택) 루트 중복 브리프/로그 파일 정리 — diff 근거와 함께
