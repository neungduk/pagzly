# 495차 보고서

## 확인하지 못한 항목
- 마이그레이션 실DB 적용·실로그인 E2E·타 계정 RLS 침투 시험 미실시.
- 결제·약관 페이지 반영 없음(초안은 notes).

## 화면
| 경로 | 내용 |
|------|------|
| `/label-check` | 비회원 즉시 점검 유지 + 로그인/검수신청/내결과 링크 |
| `/label-check/new` | 로그인 필요. 시장→옵션→제품명→업로드→진행→결과(ResultPanel) |
| `/label-check/history` | 목록(날짜·제품명·시장·요약4). 삭제 확인 |
| `/label-check/history/[id]` | 저장된 요약만 + 재분석 불가 안내 |

## 저장 항목
| 컬럼 | 내용 |
|------|------|
| market | KR/US |
| product_name | 사용자 입력(≤80, nullable). 파일명 아님 |
| options | 체크박스 jsonb |
| summary | possible/attention/unknown/pass/manual |
| findings | label/status/line(suggest만). found·PDF 원문 금지 |

## 마이그레이션
`supabase/migrations/20261109150000_label_check_runs.sql`

## 보관
사용자당 최근 200건 — 초과 시 오래된 행 삭제 후 insert.

## 검증
- tsc / build / 회귀 495(+483·493·494 유지 목표)
- push: cloud-work only
