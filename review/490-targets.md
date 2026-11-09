# 490차 목표 (코드 전)

## 성공 기준
1. **배포 절약**: `vercel.json` `ignoreCommand` — 변경이 `review/**`·`*.md`뿐이면 빌드 건너뜀(종료 0). `crons` 유지. `HEAD^` 없으면 빌드 진행(종료 1).
2. **사용자 할 일(B)**: pagelab Vercel Git 연결 해제/삭제 → 보고서·notes에 명시(코드 아님).
3. **결제 가드(C)**: `billing/subscribe`·`purchase-pack` 플래그 꺼짐 시 503(489 헬퍼). `billing/me`·`renew` 유지. 회귀에 2라우트 추가.
4. **커밋 ≤3**, `tsc`/`build` 통과. main/Production 금지.

## 비목표
- 코드 삭제, main 병합, pagelab 프로젝트 원격 삭제(사용자가 함), 기존 구독 강제 해지.
