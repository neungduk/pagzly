# 501차 목표 (코드 전)

## 성공 기준
1. `docs/label-check-rules-update.md` — 5파일 위치·필드(코드 실독 기준)·갱신 순서·실수·revert.
2. `scripts/validate-label-rules.ts` + `npm run validate:rules` → run-all 포함. 깨진 사본 exit 1.
3. 결과 하단 한 줄: `점검 기준: 규칙표 v… (날짜|미표기)` 시장별. meta만(커밋 날짜 금지).
4. `npm run regression` + 소요 시간 표. tsc/build. 커밋 ≤3. main 미푸시. 규칙 JSON 내용 미수정.

## 비목표
- 규칙/광고 데이터 내용 변경, Production/main, 유료 호출.
