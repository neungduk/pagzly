# PC 원커맨드 검증 (`npm run pc-verify`)

**PC 첫 실행 순서**: `npm ci` → `npm run pc-verify`. `tsx`는 `devDependencies`에 있어 `npm ci`가 설치하고 `npm run`이 로컬 `tsx`를 쓴다(전역 설치·`npx --yes tsx` 불필요). `pc-verify`가 단계마다 부르는 `npx tsx …`도 로컬 `tsx`가 있으면 그것을 쓴다.

PC(`.env.local`·네트워크·사진 파일이 있는 곳)에서 한 번에 돌려 결과를 `review/pc-verify-<날짜>/summary.md`에 모은다.
도구는 `.env*` 파일을 열지 않고 환경값을 읽어 출력하지 않는다(존재 여부만 표시). 결제·AI·생성 호출은 하지 않는다.

```
npm ci                                  # 처음 한 번
npx playwright install chromium        # 회귀·캡처용 브라우저(리비전 불일치 안내가 나오면 이 명령)
npm run pc-verify                       # 전체
npm run pc-verify -- --dry-run          # 단계 목록만 출력(아무것도 실행하지 않음)
npm run pc-verify -- --skip-capture     # 눈 검수 캡처만 생략
npm run pc-verify -- --only=tsc,regression
```

옵션: `--dry-run` · `--full`(오래 걸리는 단계 포함) · `--skip-capture` · `--skip-build` · `--skip-smoke` · `--only=id,id` · `--out=경로` · `--date=YYYY-MM-DD`.

## 단계
| id | 내용 | 비고 |
|---|---|---|
| env | node·폰트·환경값 존재 여부 | 값은 읽지도 출력하지도 않음 |
| tsc | `npx tsc --noEmit` | |
| regression | `scripts/regression/run-all.ts` | 브라우저 리비전 안내 포함 |
| off-export / off-live | v4 off 동일(`check-v4-off`, `check-v4-off-live`) | 기준 스냅샷이 없으면 건너뜀 |
| off-section | v4 off 동일(섹션 단독 렌더, `check-v4-off-section`) | 기준 스냅샷 `review/454-verify/snap-section`이 없으면 건너뜀(만드는 명령은 요약에 출력) |
| build | `npx next build` | PC의 환경값을 그대로 이어받음 |
| sessions | 저장 세션 6종: 섹션 수 패리티·428 DOM 지표·750폭 가로 넘침·린트(R7·R16·R17·R18) | `review/*-live/**/session.json`, `review/pexels-*/session.json` 자동 탐색, 없으면 건너뜀 |
| smoke | `next start -p 3199`로 띄워 `launch-smoke` 호출 후 종료 | build 합격 필요 |
| capture | 저장 세션 + 합성 21종을 390·750폭으로 844px 시트 + 첫 화면 접촉 시트 | `--skip-capture` |
| legibility · exposure | 극단 합성 사진 × 픽스처의 글자 대비(픽셀 기준)와 사진 노출(가림 면적비·휘도 보존율) | 기본은 빠른 부분집합, `--full`이면 전체 |
| a11y · size · dedupe | 접근성·구조 린트 R19~R23, export 크기 예산(150/220KB), 반복 style 묶기 계산 스타일 동일 | |
| predeploy | 배포 전 정적 점검 `scripts/predeploy-static.ts` — 마이그레이션 4개 존재·순서, 429 사전 점검 SQL 존재, 환경변수 이름 목록(`docs/required-env-names.md`), 비밀값 패턴(파일·줄만), main 대비 변경·결제/인증 경로 변경 0, 플래그 기본값 ↔ `docs/v4-overview.md`. 환경 파일은 열지 않고 값은 출력하지 않는다. 사용법 `docs/predeploy-static.md` | 빠른 부분집합에 포함 |
| fuzz | 입력 퍼징(export): 기본 30개 · `--full` 200개, 320·360·390·750폭 | |
| dev | **`--full`에서만** — `next dev -p 3188`을 띄워 PNG 다운로드 대조(png-compare) + 라이브 퍼징(fuzz-live) 후 끈다 | 환경 파일은 읽지 않는다(PC의 환경값 그대로 이어받음) |

한 단계가 실패해도 서로 독립인 뒤 단계는 계속 돈다(build 실패 시 smoke만 건너뜀). 단계마다 명령·시간·종료 코드·로그 경로(`logs/<id>.log`)가 요약 표에 남는다.

## 기준 스냅샷 만들기
off 동일 검사는 438차 커밋 기준 스냅샷이 필요하다. 없으면 건너뛰고 안내를 낸다.
```
npm run pc-verify -- --make-baseline <커밋>                  # 임시 worktree에서 npm ci 후 기준 저장
npm run pc-verify -- --make-baseline <커밋> --skip-install   # 설치를 생략(이미 설치된 환경 경로를 재사용할 때만)
```
node_modules를 링크하지 않는다(Turbopack이 거부). 임시 worktree에서 `npm ci`를 하거나, 설치가 끝난 폴더 경로를 그대로 재사용한다.

## 눈으로 볼 것
요약 맨 아래 체크리스트를 따른다. 합격이 아닌 단계가 있으면 434차 배포 점검으로 가지 않는다.

## 섹션 패리티 판정 (454차)
`sessions` 단계의 섹션 수 패리티는 예전 근사(export 전체 `<section>` 수 vs 계획 ±2)를 버리고 정확한 비교로 바뀌었다. 계획 = 라이브(`data-section-index` 번호 기준) = export 최상위(`.pagzly-wrap` 직계 `<section>`)이고, 검색용 평문 블록 등 안쪽에 중첩된 `<section>`은 "내부 중첩"으로 따로 센다(옛 오탐: 계획 29·export 34). 한 계획 섹션이 export에서 둘로 나뉘는 경우(예: 지표 3개짜리 `stat_infographic`)는 단독 렌더로 확인해 차이가 정확히 설명될 때만 허용한다.
```
npx tsx scripts/section-parity-table.ts            # 저장 세션 + 합성 픽스처 전부, review/454-verify/section-parity.md 에 표
npx tsx scripts/section-parity-table.ts --only=s411,s418
```
불일치가 있으면 표 아래에 계획 종류 목록·라이브 번호·export 최상위 종류 목록을 붙여 어느 쪽에만 있는지 지목하고 종료 코드 1을 낸다.
