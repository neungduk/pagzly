# 495차 목표 (코드 전)

## 성공 기준
1. 비회원 `/label-check` 즉시 점검 유지(저장 없음). 상단 로그인·내 결과 링크.
2. 회원 `/label-check/new` 로그인 필수 → 검수 신청·결과·수정 제안. 결과 UI 재사용.
3. `/label-check/history` 목록·요약 상세·본인 삭제(확인). PDF 재분석 불가 안내.
4. `label_check_runs` 마이그레이션+RLS(본인 select/insert/delete). 저장=요약만(원문·파일명 금지). `save=true`+로그인 시만. 저장 실패≠점검 실패.
5. 회원 레이트 완화(상수). 보관: 사용자당 최근 200건(초과 시 오래된 행 삭제).
6. 결제 UI 0. 상세·Toss·크레딧 코드 변경 0. 약관 페이지 미수정(문구 초안 notes만).
7. 회귀 483/493/494 + 저장 payload 시험. tsc/build. 커밋 ≤4. main 미푸시.

## 비목표
- 실DB 적용, 결제, Production/main, 유료 호출, 약관 페이지 실반영.
