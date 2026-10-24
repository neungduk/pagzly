# PC 원커맨드 검증 (`npm run pc-verify`)

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

옵션: `--dry-run` · `--skip-capture` · `--skip-build` · `--skip-smoke` · `--only=id,id` · `--out=경로` · `--date=YYYY-MM-DD`.

## 단계
| id | 내용 | 비고 |
|---|---|---|
| env | node·폰트·환경값 존재 여부 | 값은 읽지도 출력하지도 않음 |
| tsc | `npx tsc --noEmit` | |
| regression | `scripts/regression/run-all.ts` | 브라우저 리비전 안내 포함 |
| off-export / off-live | v4 off 동일(`check-v4-off`, `check-v4-off-live`) | 기준 스냅샷이 없으면 건너뜀 |
| build | `npx next build` | PC의 환경값을 그대로 이어받음 |
| sessions | 저장 세션 6종: 섹션 수 패리티·428 DOM 지표·750폭 가로 넘침·린트(R7·R16·R17·R18) | `review/*-live/**/session.json`, `review/pexels-*/session.json` 자동 탐색, 없으면 건너뜀 |
| smoke | `next start -p 3199`로 띄워 `launch-smoke` 호출 후 종료 | build 합격 필요 |
| capture | 저장 세션 + 합성 21종을 390·750폭으로 844px 시트 + 첫 화면 접촉 시트 | `--skip-capture` |

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
