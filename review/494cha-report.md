# 494차 보고서

## 확인하지 못한 항목
- 미국 실 PDF 픽스처(495차 제공 예정) — 이번 차는 합성 텍스트만.
- 701.13 하단·글자크기 세부, MoCRA 609 예외, 주(州)법, OTC Drug Facts — 데이터 `not_verified` 유지.
- 한국 규칙 `fix_ko` 필드 미작성(기획 대기).

## 한국 오탐 수정 전/후
| | 전 | 후 |
|--|----|----|
| i1 알레르기 | 주소 `향남읍` → 「향」 확인 필요 | 한 글자 경계로 미매칭(통과) |
| 향료 표기 | 검출 | 검출 유지 |

## 수정 제안 화면
- 항목별 `<details>` 「수정 제안」. 예시 동반 문구: `FIX_EXAMPLE_NOTE_494`.
- 광고: 완화 표현 예시 / 근거 자료 확인 구역(KR 예시 데이터 없으면 —).
- 하단 「수정 제안 모아 보기」+ 텍스트 복사. PDF 자동 수정 없음.
- 「완벽 검수」「자동 수정 보장」 미사용.

## 미국 판정 항목
| id | 방식 |
|----|------|
| US-001 | manual |
| US-002 identity | code |
| US-003 net qty | code |
| US-004 상호·ZIP | code |
| US-005 원산지 | code(수입 체크 시) |
| US-006 Ingredients(+pt) | code |
| US-007 영어/한글만 | code |
| US-008~009,011~012 | manual(조건부 입력) |
| US-010 연락처 | code |
| US-013 의약품 주장 | code |
| OTC 체크 | 판정 보류 + 안내 |

## 어댑터
- KR: `load-rules.ts` / `run-check.ts` / `ad-phrases.ts`
- US: `load-rules-us.ts` / `run-check-us.ts` / `normalize-us.ts`
- 분기: `runLabelCheck483` → `market==="US"`

## fix-suggestions-kr_todo.md
`review/data/fix-suggestions-kr_todo.md`

## 검증
- `npx tsc --noEmit` · `npm run build` 통과
- 회귀 483/493/494 통과
- push: `cloud-work` only (main 미푸시)
