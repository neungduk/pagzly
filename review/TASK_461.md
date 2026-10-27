# TASK_461 — 폰 세션 코딩 전용 가드 · 이전 순서 문서 수정 · 배포 전 정적 점검 (코딩 전용, 유료 API 0회) — 지시서 요약본

시작 문장: "461차 시작: 코딩 전용 가드·이전 순서 수정·배포 전 정적 점검(코딩 전용)". 시작 전 `git pull --no-rebase origin cloud-work`.

## 배경
Supabase 무료 Cached Egress 초과(754%) 원인 추정 = PC 검증의 실사진 반복 다운로드. R2 이전 전에는 어디서도 실사진·업로드·원격 이미지 로드 검증 금지. 이번은 폰 세션에서 코드·문서만.

## 0. 규칙
실행 금지: 캡처, PNG 대조, 퍼징, pc-verify, next build/dev, launch-smoke, 전체 회귀, Playwright 전부, Supabase·R2·외부 네트워크, 사진 다운로드·업로드. 허용: `npx tsc --noEmit`, 새로 만든 정적 회귀 단독 실행. 유료 API 0, 키·`.env*` 금지, 새 문구·수치 금지, 고지·결제·`cta_price`·`data-pz-buy`·스티키 바·편집 UI·인터랙션 불변, 앱 본체 렌더 출력 변경 금지. 스크립트·정규식은 Write/Edit(heredoc 금지). run-all SUITES는 하나씩 덧붙임. `git add` 파일명 지정, main 금지.

## 1. 폰 세션 가드
`docs/phone-session-rules.md`(해도 되는 것/하면 안 되는 것/이유 한 줄), 루트 AGENTS.md 또는 CLAUDE.md에 링크 한 줄. `scripts/lib/heavy-guard.ts`: `CLAUDE_CODE_REMOTE=true`/`CI=true`/`PZ_PHONE_SESSION=1` 중 하나 있고 `PZ_ALLOW_HEAVY=1` 없으면 이유 한 줄 + 종료 코드 2. 변수 없으면 허용(집 PC 보호), 설계를 문서에. 전수 목록은 `rg "playwright|chromium" scripts`로. 정적 회귀 `heavy-guard-461.ts`(전수 적용·변수 검사·변수 없을 때 허용), run-all 등록.

## 2. 이전 순서 문서 수정(`docs/migration-r2/README.md`)
14단계: 1 드라이런 → 2 1차 복사 → 3 검증 → 4 프로덕션 `STORAGE_PROVIDER=r2` → 5 2차 복사 → 6 검증 재실행 → 7 DB 백업 → 8 미리보기 → 9 교체(건수 맞을 때만 COMMIT) → 10 04-verify → 11 롤백 기준 → 12 만료 정리 크론 전환 → 13 3일 egress·R2 사용량 확인 → 14 옛 객체 90일 보관 후 사용자 정리. 단계마다 멈춤 조건·되돌리기 표, 결과 붙여넣을 곳. `docs/r2-setup.md`와 순서 일치(원본 한 곳). 정적 회귀 `migration-order-461.ts`, run-all 등록.

## 3. 이전 스크립트 보강(코드만)
`--only-missing` 보고(R2에 없는 개수만, 쓰기 없음), 요약에 건너뜀/복사/실패/크기 합계. `--apply`는 `--state`의 드라이런 plan 기록이 없으면 거부. 원인 분류 출력(402/403·404·5xx). 단위 테스트는 모의 입력. `migrate-storage-460` 회귀 갱신(그 파일만 단독 실행).

## 4. 배포 전 정적 점검 문서
`docs/predeploy-checklist.md`: 마이그레이션 4개 순서(`20261022100000_usage_guard` → `…110000_storage_images_policies` → `…120000_credit_ledger_completion_unique`(사전 점검 SQL 먼저) → `…130000_signup_free_one_generation`), Vercel 환경변수(`USAGE_GUARD_FAIL_MODE=closed`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, R2 변수 이름 7개 — 값 없음), 도메인·CORS·Custom Domain, 롤백 3단계 링크를 한 장 순서표로(누가·어디서·합격 기준). 정적 회귀 `env-names-461.ts`(코드의 `process.env.*` 이름 vs 체크리스트, 값 안 읽음). 기존 `predeploy-static`과 중복이면 그쪽에 추가하고 이유를 보고서에.

## 5. 검증·보고서
tsc 통과, 새/고친 정적 회귀 단독 실행. `review/461cha-report.md` 맨 위: push 성공 여부, 변경 파일, 가드 적용 도구 전수 표, 실행하지 않은 검증, 집 PC 명령(`git pull origin cloud-work` → `npm ci` → `npx tsc --noEmit` → `npx tsx scripts/regression/run-all.ts` → `npx tsx scripts/pc-verify.ts`; 이전 전 실사진 검증 금지 문구), 못 한 것.

## 6. 하지 않는 것
§0 금지 실행, 유료 호출, 새 문구, main push, 마이그레이션 변경·적용, 결제·`cta_price`·편집 UI·인터랙션 변경, 비밀값·`.env*`, 사진 다운로드·업로드, 배너 기본값 변경, 앱 본체 렌더 출력 변경.
