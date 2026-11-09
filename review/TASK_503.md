# 503차 — 회귀에서 playwright 제거(가드 준수) + 마무리 정리

## 0. 규칙
- 유료 호출 금지. Production·main 금지. 코드 삭제 금지(스크립트는 이동·교체만, 기존 PDF 생성 로직은 `scripts/` 하네스로 보존). 규칙 데이터 수정 금지. 상세페이지 로직 수정 금지.
- `review/503-targets.md`에 코드 전 기재. 마무리 전 `npx tsc --noEmit`, `npm run build`, `npm run regression:label-check`. 커밋 최대 2개. 보고서 `review/503cha-report.md`.

## 1. 판단 (기획 담당)
- 502차 제안 중 **(b)+(c)** 채택. 이 프로젝트의 규칙(CLAUDE.md의 폰/클라우드 세션 무거운 검증 금지)상 playwright가 회귀 폴더에서 직접 돌면 안 된다. 예외 목록(a)은 규칙을 약화시키므로 채택하지 않는다.
- 폰트·v4 off·463 등 상세페이지 신규 깨짐 3건은 상세페이지가 현재 숨김 상태이므로 **이번에는 수정하지 않는다.** 보고서의 "기술 부채" 항목으로만 유지하고 별도 지시 전까지 건드리지 말 것.

## 2. 항목
A. `scripts/regression/label-check-492.ts`·`493.ts`에서 `playwright` import 제거. PDF를 만들던 부분은 `scripts/` 아래 하네스(예: `scripts/label-check-make-fixtures-492.ts`, 가드 `assertHeavyEntry` 적용)로 옮기고, 회귀는 **이미 레포에 있는 PDF만 읽는다**(`review/data/samples/**`). 회귀가 필요로 하는 PDF가 레포에 없으면 하네스로 생성해 `review/data/samples/regression-503/`에 커밋(각 파일 크기 기재, 총 5MB 이하).
B. `scripts/label-check-mutation-492.ts`에 `assertHeavyEntry` 적용(다른 하네스와 같은 방식). 변이 시험이 chromium을 쓰지 않으면 가드가 필요한지 판단해 기록.
C. 무거운 도구 가드 시험을 다시 돌려 **우리 변경이 추가한 실패 문구가 사라졌는지** 확인(기존 이전부터의 실패 항목은 그대로여도 됨). 전/후 실패 문구를 표로.
D. `docs/label-check-rules-update.md` 맨 아래에 "회귀 실행 방법" 3줄(빠른 회귀 명령, 전체 회귀가 오래 걸리고 기존 상세페이지 시험이 섞여 있다는 사실, 어떤 NG가 알려진 것인지 `review/502cha-report.md` 참조)만 추가.

## 3. 보고서
맨 위 "확인하지 못한 항목", A·B 변경 요약, C 전/후 표, `regression:label-check` 결과, 기술 부채 목록(상세 신규 깨짐 3건), 커밋 해시와 push 확인.
