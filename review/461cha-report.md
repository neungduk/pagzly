# 461차 보고서 — 코딩 전용 가드 · 이전 순서 수정 · 배포 전 정적 점검 (코딩 전용)

## 1. Push 결과
`cloud-work`와 `claude/task-443-regression-8hculb`에 항목마다 커밋·push 성공(지시서 저장 → 1 가드 → 2 순서 문서 + 3 스크립트 보강 → 4 순서표 → 보고서). main에는 push하지 않았다. 시작 전 `git pull --no-rebase origin cloud-work`는 "Already up to date".
**실행한 것**: `npx tsc --noEmit`(오류 0), 새/고친 정적 회귀 단독 실행(heavy-guard-461, migration-order-461, env-names-461, migrate-storage-460) 전부 통과. **실행하지 않은 것**: 캡처·PNG 대조·퍼징·pc-verify·launch-smoke·next build/dev·전체 회귀·Playwright 전부, Supabase·R2·외부 네트워크, 사진 다운로드·업로드. (이 세션에서 `CLAUDE_CODE_REMOTE=true`임을 확인했다 — 가드가 이 환경에서 무거운 도구를 거부하는 조건과 일치.)

## 2. 변경 파일
- 신규: `docs/phone-session-rules.md` · `scripts/lib/heavy-guard.ts` · `scripts/regression/{heavy-guard,migration-order,env-names}-461.ts` · `docs/predeploy-checklist.md` · `review/TASK_461.md` · 이 보고서
- 수정: `CLAUDE.md`(링크 한 줄 추가, 기존 내용 불변) · `docs/migration-r2/README.md`(14단계) · `docs/r2-setup.md`(§6·§7 순서 원본 링크) · `lib/storage/migrate-core.ts` · `scripts/migrate-storage-to-r2.ts` · `scripts/regression/migrate-storage-460.ts` · `scripts/regression/run-all.ts`(SUITES 끝에 3개 덧붙임) · 무거운 도구 208개(맨 위에 가드 2줄)
- 앱 본체(`app`·`components`)·렌더 출력·결제·`cta_price`·마이그레이션 변경 없음(`lib/storage/*`는 이전 도구 전용 파일만).

## 3. 가드 적용 도구 전수 (208개 추적 파일)
기준: `scripts/`·`scripts/lib/`에서 `playwright|chromium`을 쓰는 파일 **+ 그런 파일을 가져오는 파일의 닫힌 집합**(예: `section-sheet`·`pc-verify-eye`·`hero-fold-check`는 playwright 문자열이 없지만 `eye-lib`을 통해 브라우저를 쓰므로 포함). 회귀 폴더는 playwright를 직접 가져오지 않음을 회귀가 확인. 예외: `scripts/lib/heavy-guard.ts`(가드 자체) 1개.

| 묶음 | 파일 |
|---|---|
| 핵심 도구 | `pc-verify` `pc-verify-eye` `pc-verify-sessions` `launch-smoke` `png-compare` `fuzz-live` `fuzz-check` `fuzz-photo-fail` `fuzz-stability` `eye-capture` `eye-compare` `eye-sections` `live-capture` `live-audit` `live-one` `live-probe` `live-vs-export` `section-sheet` `section-floor` `typo-metrics` `typo-sheet` `design-lint` `design-metrics-dom` `a11y-lint` `photo-exposure` `photo-legibility` `banner-options` `banner-style-measure` `broken-photo-eye` `broken-photo-live` `color-budget` `contrast-sources` `contrast-sweep` `hero-compress-sheet` `hero-fold-check` `hero-fold-sheet` `scrim-sheet` `style-dedupe-check` |
| 라이브러리(진입 파일일 때만 검사) | `eye-lib` `live-lib` `capture-utils` `lib/neutralize-sticky` |
| 캡처/검증(차수별) | `capture-*` 36개 · `1xx~2xx cha-*` 80여 개(`117cha`~`288cha`) · `51cha`~`89cha` QA 16개 · `_196cha-check-computed` `_197cha-*` `_285cha-crawl` · `verify-411-capture` `verify-download-png` `verify-edit-save-db` `qa-visual-check` `recapture-after-fix` `save-login-state` `test-action-bar` `test-backdrop-once` `debug-capture` `color-curve-qa` `audit-session` `apply-concept-effects` `competitor-gap-scan` `competitor-landing-capture` `marketplace-pdp-scan` `experiment-bria-backdrop-capture` `generate-*-detail/showcase` |
전체 이름 목록은 `git grep -l assertHeavyEntry -- scripts`로 재현된다. 로컬에만 있는 gitignore된 `_*.tmp.ts` 11개에도 같은 처리를 했지만 추적되지 않는다.

**가드 동작**: `assertHeavyEntry(이름, require.main === module)` — 그 파일을 **직접 실행했을 때만** 검사(회귀가 순수 함수만 import하는 경우 영향 없음). `CLAUDE_CODE_REMOTE=true`·`CI=true`·`PZ_PHONE_SESSION=1` 중 하나가 있고 `PZ_ALLOW_HEAVY=1`이 없으면 이유 한 줄 + 종료 코드 2. 변수가 없으면 허용(집 PC 보호). `pc-verify`가 하위 도구를 띄우는 경우에도 각 도구가 직접 검사한다.
**한계/주의**: ① 새 무거운 도구를 만들면 가드를 넣어야 하며 회귀(heavy-guard-461)가 playwright/chromium 사용 파일 누락을 잡는다. 다만 playwright를 `require(변수)`처럼 숨겨 쓰는 경우는 못 잡는다. ② `tsconfig`가 `scripts/`를 제외하므로 가드 줄의 타입은 회귀가 가져오는 파일(tsc 통과)과 `heavy-guard.ts` 단위로만 확인했다 — 208개 파일을 일괄 실행 검증하지는 않았다(실행 금지). 삽입은 각 파일의 첫 `import` 줄 앞 2줄이다.

## 4. 이전 순서 문서·스크립트 (항목 2·3)
- `docs/migration-r2/README.md`를 지시서 14단계로 교체(켜기 4 → 2차 복사 5 → 검증 재실행 6 → 백업 7 → 미리보기 8 → 교체 9 → 확인 10 → 롤백 11 → 크론 12 → 3일 관찰 13 → 90일 보관 14). 단계마다 합격 기준·멈춤 조건·되돌리기·결과 붙여넣을 곳 표. `docs/r2-setup.md`는 순서표를 두지 않고 README(원본)를 링크, §7 크론 전환을 12단계(교체 뒤)로 맞춤. 회귀 `migration-order-461`이 14행·순서·핵심 문구·원본 한 곳을 검사.
- `scripts/migrate-storage-to-r2.ts`: `--only-missing`(HEAD만으로 R2에 없는/크기 다른 개수·크기 보고, 쓰기 없음) · 드라이런이 `<state>.plan`(개수·용량만)을 기록하고 **`--apply`는 `--state`와 이 기록이 없으면 거부** · 요약에 복사/건너뜀/실패/크기 합계 · 실패 원인 분류(402/403 Supabase 제한·권한, 404 원본 없음, 429/5xx/연결 재시도, 기타) 개수 출력.
- 추가 개선(2차 복사 egress 절감): 목록 API의 크기·eTag가 R2의 크기·ETag와 같으면 **다운로드 없이 건너뜀**(없으면 기존대로 내려받아 크기+MD5 비교). 460차 구현은 HEAD 전에 항상 내려받았기 때문에 2차 복사가 egress를 다시 썼을 것이다. 단 Supabase 목록 API가 `metadata.eTag`를 주는지와 R2 ETag=MD5는 문서 기준 가정으로 **실제 접속 검증 안 함**(eTag가 없으면 안전하게 내려받아 판정).
- `migrate-storage-460` 회귀 갱신(only-missing·plan 게이트·원인 분류·eTag 생략), 단독 통과.

## 5. 배포 전 순서표 (항목 4)
`docs/predeploy-checklist.md`: 마이그레이션 0(사전 점검 SQL)→4개 순서(120000은 사전 점검 통과 시에만) · 환경변수 표(필수 3 + R2 7, 이름만) · 도메인·CORS·Custom Domain · 롤백 3단계 링크(저장소 스위치 / DB 주소 / 디자인 v4·마이그레이션 머리 주석). 각 행에 누가·어디서·합격 기준. 원래 지시의 "434차 롤백 링크" 문서는 저장소에 없어 있는 문서(`r2-setup §5`, `migration-r2 99`, `v4-overview §3`)로 연결했다.
`env-names-461`(신규): 순서표의 환경변수 이름이 필수 10개를 포함하고, 코드(`app`·`lib`·`components`·`next.config`)가 실제로 읽는 이름과 일치하며(`process.env.X`·별칭 `env.X`·R2 이름 배열), R2 이름이 정확히 7개이고 순서표 밖의 `R2_*`를 코드가 읽지 않는지, 마이그레이션 4개 파일·순서를 검사. 값은 읽지 않는다.
**`predeploy-static`에 합치지 않은 이유**: 그 도구는 코드 쪽 이름을 모아 `docs/required-env-names.md`·`review/` 파일을 쓰고 git 비교를 하는 실행형이라 순수 정적 회귀 스위트에 넣기 부적합. 대조(체크리스트 ↔ 코드)만 별도 회귀로 두었고 중복은 없다.

## 6. 새 문구
없음(신규 문서·콘솔 메시지는 개발자용 안내이며 사용자 화면 문구 변경 없음).

## 7. 집 PC에서 나중에 할 명령
**이전(R2) 완료 전에는 실사진·이미지 업로드·원격 이미지 로드 검증(`pc-verify`, 캡처, 퍼징, launch-smoke)을 하지 않는다** — Supabase egress 초과를 더 키운다. 그동안은 아래 앞의 세 줄까지만 한다.
```
git pull origin cloud-work
npm ci
npx tsc --noEmit
npx tsx scripts/regression/run-all.ts        # 정적 회귀 전부(브라우저 없음)
# ↓ 이전(docs/migration-r2/README.md 1~14단계) 완료 후에만
npx tsx scripts/pc-verify.ts
```
이전 절차는 `docs/migration-r2/README.md`, 배포 순서는 `docs/predeploy-checklist.md`.

## 8. 못 한 것
- 208개 도구를 일괄 실행해 가드가 각각 동작하는지는 확인하지 못함(실행 금지) — 함수 단위 동작과 파일 적용 여부만 정적으로 확인. 집 PC에서 `CI=true npx tsx scripts/launch-smoke.ts http://x`처럼 한 개를 돌려 종료 코드 2·한 줄 출력을 확인하면 된다(네트워크 전에 종료됨).
- eTag 기반 건너뛰기·`--only-missing`·목록 API 응답 형식은 실제 Supabase/R2에서 검증 안 함.
- `run-all` 전체는 지시대로 돌리지 않았다(새 SUITES 항목 3개는 단독 통과).
