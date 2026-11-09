# 504차 보고서

## 확인하지 못한 항목
- 브라우저에서 세부 유형 UI·예외 접힘 실측.
- v0.1 광고 전후를 동일 커밋에서 재실행한 A/B/C 수치(이전 EXPECT는 회귀 상수 기준).
- Playwright 픽스처 재생성(환경 chromium 미설치 — 광고 변이는 텍스트 경로로 유지).

## v0.1→v0.2 광고·시안 전/후 (요약 집계)
| 시안 | 이전 EXPECT(attention) | 후(504) attention | 비고 |
|---|---:|---:|---|
| A | 7 | 5 | v0.2·규칙 재집계 |
| B | 3 | 3 | 동일 |
| C | 4 | 5 | +주의(시트릭애씨드) 등 |

## 새 주의사항 판정 (시안)
| 시안 | 주의사항 finding |
|---|---|
| A | 없음 |
| B | 없음 |
| C | 성분 주의사항(시트릭애씨드) — AHA 계열 함량 안내 가능 |

합성 시험(회귀 504): 살리실릭 유/무, 알부틴 함량 안내, 카민, MFDS-011/E03 분리, 피부나이·30% 정규식 — OK.

## 별표4 보강 중복 정리
| id | 기존 규칙 | 조치 |
|---|---|---|
| KR-ADD-001 | KR-LBL-006 | 개봉후+제조연월일 없을 때 신규 attention |
| KR-ADD-002 | KR-LBL-005 | manual 카드 |
| KR-ADD-003 | KR-LBL-006 | 기존 finding fix 보강 |
| KR-ADD-004 | KR-LBL-003 | 비누 문구 시 soft 안내(입력 없음) |
| KR-ADD-005 | KR-LBL-002 | fix 보강 |
| KR-ADD-006 | 수입 제조국 | imported 시 fix 보강 |
| KR-ADD-007 | 전성분 5pt | fix 보강 |
| KR-ADD-008 | 알레르기 | fix 보강 |
| KR-ADD-009~011 | — | manual 카드 |

## 데이터 문제 보고
- 없음(규칙 JSON 미수정). validate:rules 오류 0·경고 0.
- 회귀 `required` 커버리지는 광고 MFDS를 제외(항목 `fix_ko` 사용).

## 검증
- tsc / build / `validate:rules` / `regression:label-check` 14/14 OK
- push: cloud-work only

## 커밋
- (push 직전)
