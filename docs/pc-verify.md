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
| off-section | v4 off 동일(섹션 단독 렌더, `check-v4-off-section`) | 기준 스냅샷 `review/455-verify/snap-section-438`(**438차 커밋 `08c4e73` 코드로 만든 것**)이 없으면 건너뜀(만드는 명령은 요약에 출력) |
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

## PC에서 cloud-work 받는 법 (454차)
클라우드에서 만든 `cloud-work`를 PC에 받을 때 로컬에 따로 고친 `AGENTS.md`·`review/442cha-report.md` 같은 파일이 있으면 충돌한다(PC에서 실제로 발생). 순서: ① 충돌하는 로컬 파일을 다른 이름으로 백업(예: `copy AGENTS.md AGENTS.md.bak`) ② `git fetch origin` ③ 충돌 파일을 `git checkout -- <파일>`로 되돌리거나 `git stash` 한 뒤 `git merge --ff-only origin/cloud-work` ④ 백업과 비교해 필요한 줄만 다시 반영. `--ff-only`라 병합 커밋이 생기지 않고, 앞서 나갈 수 없으면 실패하니 그때는 멈추고 확인한다.
요약 상단의 "git" 표시는 추적 수정·삭제·미추적 개수로 나뉘어 나온다(미추적 폴더가 많아도 변경이 많은 것처럼 보이지 않게).

## 4c 기준은 438차 코드로 (455차)
454차의 4c 기준(`review/454-verify/snap-section`)은 453차 코드로 만들어져 "438차 기준 off 동일"을 보장하지 못했다. 455차에 438차 커밋(`08c4e73`) 코드로 다시 만들었고 경로를 `review/455-verify/snap-section-438`로 바꿨다(1298 섹션, 현재 코드 diff 0).
`npm run pc-verify -- --make-baseline 08c4e73`가 이제 4a·4b·4c 기준 셋을 한 번에 만든다(임시 worktree에서 `npm ci` 후 현재 `scripts/`를 덮어 그 커밋의 `lib`·`app`으로 `check-v4-off*.ts(x) --write` 실행, 끝나면 worktree 삭제).
직접 만들 때(저장 세션 `session.json`도 worktree의 같은 경로에 복사해야 6종이 포함된다):
```
git worktree add --detach ..\wt438 08c4e73 ; cd ..\wt438 ; npm ci
(현재 저장소의 scripts\ 를 wt438\scripts\ 로 덮어쓰기, review\4xx-live\...\session.json 6개도 같은 경로로 복사)
$env:NEXT_PUBLIC_DESIGN_V4="off"; $env:OUT="review/455-verify/snap-section-438"; npx tsx scripts/check-v4-off-section.tsx --write
(만든 폴더를 현재 저장소의 review/455-verify/snap-section-438 로 복사 → git worktree remove --force ..\wt438)
```

## 사진 로드 실패 검증 (455차)
사진 주소가 만료·삭제됐거나 네트워크가 끊긴 상태의 화면을 재현한다. 외부 호출은 없고(브라우저에서 사진 요청만 전부 실패시킨다) 결과는 보이는 깨진 `<img>`(대체 글자) · 빈 큰 틀 · 높이 0으로 무너진 틀 · 가로 넘침 개수다.
```
npx tsx scripts/broken-photo-eye.ts --out=review/455-verify/broken-after                 # export (저장 세션 + 합성 21종, 390·750 시트)
npx tsx scripts/broken-photo-live.ts --server=http://localhost:3200 --out=...            # 라이브 — 더미 환경 next dev 필요(스크립트 머리말에 명령)
```
정상 동작은 `lib/photo-fallback.ts`(v4): 실패한 사진의 틀(overflow:hidden)에 `data-pz-np`를 달아 면 톤 + 사선 무늬를 깔고, 틀에 비율이 없으면 사진 비율을 예약한다. 사진이 정상 로드되면 아무것도 붙지 않는다.
**캡처 도구 주의**: `scripts/eye-lib.ts`가 예전에 사진의 `onload/onerror` 속성을 덮어써, 실패한 사진의 alt 글자가 화면에 보이는 것처럼 찍혔다(442차의 "배경 사진 속 라벨 글자" 오진과 같은 계열). 455차에 `addEventListener`로 고쳤다 — 실제 브라우저의 export는 438차부터 실패한 사진을 숨겼다.
