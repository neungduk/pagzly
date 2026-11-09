# 502차 목표 (코드 전)

## 성공 기준
1. `npm run regression:label-check` — 표시사항 스위트(483·488명=label-check-483, 489, 492~501, 규칙검증)만, 목록은 `scripts/regression/label-check-suites.ts`. 전체 `npm run regression` 유지. docs에 한 줄 구분.
2. 표시사항 전용 회귀 전체 재실행 → 전부 OK(496 포함). 금지어 검사는 주석 제외 최소 변경 여부 notes에 기록.
3. 501차 NG 25건을 baseline(`742cdd9` 상세 482 마지막 ≈ 표시사항 직전) worktree에서 해당 스위트만 재실행해 (1)신규깨짐 (2)이전부터 분류. 10분+는 미실시. 무거운가드·DB SQL·v4 off 우선.
4. `/api/label-check*`가 heavy-guard 전수 대상인지 사실만 보고. tsc/build. 커밋 ≤3. main 미푸시. 규칙 JSON·상세 로직 미수정.

## 비목표
- 상세페이지 NG 대규모 수정, Production/main, 유료 호출, 규칙 데이터 내용 변경.
