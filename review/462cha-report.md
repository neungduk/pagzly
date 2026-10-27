# 462차 보고서 — 상세페이지 업그레이드 1차 (코딩 전용, 눈 검수 없음)

## 1. Push 결과
`cloud-work`와 `claude/task-443-regression-8hculb`에 항목마다 커밋·push 성공(`5d881dd` 지시서 → `a086826` 감사 → `6631cd3` 수정·변형 → `61ed13f` 문서 → 이 보고서). main push 없음. 시작 전 pull은 "Already up to date".

## 2. 실행한 것 / 하지 않은 것
- **실행**: `npx tsc --noEmit`(오류 0) · 새 회귀 `scripts/regression/robust-462.ts` 단독(통과) · `scripts/check-v4-off.ts`(4a, 438차 기준 export 문자열 비교) — 스크립트를 읽어 브라우저·서버·네트워크 없는 순수 문자열 렌더임을 확인(`design-corpus`는 파일만 읽음)하고 실행: **통과(diff 0)**.
- **추가 자체 검증(저장소 파일 아님, 임시 스크립트로 실행 후 삭제)**: 수정 전 코드를 `git stash`로 되돌려 말뭉치(export 21개 + 섹션 단독 export·라이브 SSR 문자열)를 뽑고, 수정 후와 비교 → **v4 켜짐·UP1 꺼짐에서 export·섹션 단독 export·섹션 단독 라이브 전부 이전과 문자열 동일**. UP1 켜짐은 의도한 곳만 달라짐(export는 `fx-food-snack` 1개, 섹션 라이브는 하이라이트/페르소나가 있는 입력들).
- **4c(`check-v4-off-section`)는 미실행**: 기준 폴더 `review/455-verify/snap-section-438`이 비어 있어(커밋 안 함) 비교 대상이 없다. 위 자체 비교로 대체했다. 4b(라이브 전체)도 지시서가 허용한 4a·4c가 아니라 돌리지 않았다.
- **실행하지 않음**: 캡처·PNG 대조·퍼징·pc-verify·launch-smoke·next build/dev·`run-all` 전체·Playwright·네트워크·사진 다운로드/업로드. 기존 라이브↔export 패리티 회귀(twin-sections 등)도 "새로/고친 파일만" 규칙에 따라 돌리지 않았다 — 집 PC `run-all`에서 확인 필요.

## 3. 감사 요약 (`docs/upgrade-backlog-462.md`)
표본 점검(위험 패턴 검색 + 해당 코드 읽기)으로 8행. 수정 3 · 변형 1 · 보류 4(글자 크기 10·11px 두 곳, 이미 쓰이는 `text-wrap:balance`, `baselineLabel`) — 보류 사유는 "정상 출력이 바뀌어 눈 검수가 필요". **미감사**: 항목 10개 이상의 FAQ·후기·스펙표, 극단 사진 비율, 리듬 쏠림, 스타일 중복 전수 대조, 폭별 오차(백로그 문서에 명시). 전수 감사라고 주장하지 않는다.

## 4. 수정 목록 (전/후)
| # | 무엇 | 입력별 동작 (UP1 꺼짐 기준) |
|---|---|---|
| R2 | 비교 막대 값 칸(export `comparisonChartBodyHtml`, 라이브 값 칸): 단위가 4자 초과면 `nowrap/shrink-0` 대신 `min-width:0;max-width:60%;text-align:right` | 단위 `%`·`개월` 등 4자 이하: **이전과 문자열 동일**. 단위 "개월 사용 기준"(7자): 이전에는 값 칸이 줄지 않아 라벨을 밀어내고 넘칠 수 있었고, 이후에는 값 칸이 60% 안에서 줄바꿈됨 |
| R3 | 통계 막대 값 칸: 값이 10자 초과면 같은 처리 | "98%"·"60%": 동일. "6개월 이상 꾸준히 사용 시"(14자): 이후 줄바꿈 허용 |
| R1 | 페르소나 줄 clamp 3→4: **UP1 뒤** (23자 문장이 말줄임으로 잘리던 것이 4줄까지 표시) | UP1 꺼짐: 항상 3줄(이전 동일 — 말뭉치 `fx-food-snack`의 23자 문장이 바뀌므로 처음엔 v4-off 비교가 실패해 UP1 뒤로 옮김). UP1 켜짐: 22자 이하 3줄, 23자 이상 4줄 |
각 변경 위치에 `lib/robust-462.ts` 주석(이유·경계 값)이 있다. 라이브·export는 같은 함수(`personaClampLines`·`isLongUnit`·`isLongStatValue`)를 읽는다.

## 5. 신규 변형 (UP1 뒤, `NEXT_PUBLIC_DESIGN_V4_UP1=on`)
하이라이트 카드 4장: 넓은 폭(≥640px)에서 4열 대신 **2×2 유지**(export `--pz-hl-wide:repeat(2,1fr)`, 라이브 `grid-cols-2`만). 기존 카드 필드만 사용, 새 문구·데이터 없음. 선택 규칙은 `cards.length === 4`뿐이라 같은 입력에서 항상 같은 결과(시드 불필요 — 무작위 요소 없음). **한계**: "변형"이라기보다 좁은 칸 문제의 레이아웃 보정이다. 감사에서 "섹션 변형이 적어 단조로운 곳"을 코드만으로 정량 판단하기 어려워 변형은 1개만 만들었다.

## 6. 회귀 `scripts/regression/robust-462.ts` (run-all 끝에 등록)
순수 함수 경계값, UP1 플래그 정의(v4 안에서 `"on"`일 때만), 실제 export 렌더로 긴 단위/긴 값 줄바꿈 허용·정상 값 불변·내용 보존·결정성, UP1 꺼짐 하이라이트 4열 유지, 라이브·export 양쪽에 분기 존재(패리티), 새 코드에 금지 CSS(`:has()`·container-type·`mix-blend-mode`·`clip-path`·`text-wrap`·`mask`·`-webkit-text-stroke`) 없음. 한계: UP1 켜짐 렌더는 플래그가 모듈 로드 때 읽혀 이 프로세스에서 못 돌려, 켜짐 쪽은 함수 인자와 소스 문자열로 검사했다. 막대형 비교는 `basis="measured"`일 때만 그려지고 비교 정책이 차트를 빼므로 테스트에서 `claimFacts`를 비워 렌더한다.

## 7. 문서
`docs/v4-overview.md` §9(UP1 설명·롤백 한 줄), `docs/pc-todo.md`(UP1 눈 검수 목록, 이전 완료 후에만·placeholder 먼저), `docs/upgrade-backlog-462.md`.

## 8. 집 PC에서 나중에 할 명령
이전(R2) 완료 전: `git pull origin cloud-work` → `npm ci` → `npx tsc --noEmit` → `npx tsx scripts/regression/run-all.ts`까지만(정적). 이전 완료 후: `docs/pc-todo.md`대로 UP1을 켜고 placeholder → 실사진 순으로 눈 검수.

## 9. 못 한 것 / 주의
- 눈으로 본 것이 없다. R1·R2·R3의 실제 화면은 미확인(특히 `max-width:60%` 값 칸이 라벨과 어떻게 배분되는지).
- 4c 기준 부재(위 참고), 패리티·전체 회귀는 집 PC에서.
- 감사 미완(위 "미감사"), 변형 1개.
- 플래그 기본값은 모두 끔 그대로, 마이그레이션·결제·`cta_price`·편집 UI 변경 없음.
