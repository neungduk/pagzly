# 492차 보고 — 검수 정확도 하네스(변이·표기 변형·커버리지)

## 확인하지 못한 항목
- **고객 실기 PDF 전수**: Chromium 생성 시안·샘플 A/B/C 기준. 스캔 이미지·복잡한 벡터 윤곽은 별도.
- **함량 임계(0.01%/0.001%) 자동 판정**: 규칙상 불가 → 확인 필요 유지.
- **제품명 전용 검출**: 문서 전체 한글 유무라 상호만으로도 통과(coverage 한계).
- **Vercel 프리뷰 육안**: 기획 담당. 로컬 tsc/build·회귀만 통과.

## 커버리지 요약
| 실효 구현 | 대략 |
|-----------|------|
| 자동 판정 | ~12 |
| 부분 판정 | ~12 (이번 보강 중심) |
| 수동 목록만 | ~10 |
| 미구현·잔여 | ~1–2 |

상세: `review/492-coverage.md`. code 오분류 **KR-LBL-019(소용량)** → `skip_info` 교정.

## 변이 시험 (전→후)
| | 누락(실패) | 오탐(번짐) |
|--|------------|------------|
| 수정 전(용량 g 오탐·5pt 경계 등) | 용량 제거 미검출 1 등 | — |
| 수정 후 | **0** | **0** |

기준 정상 PDF possible=0. 항목 제거·4pt·기능성 미표기·금지어 주입 검출. 표: `492-notes.md`.

## 표기 변형 통과율
- 텍스트 변형 **20/20** (사용기한·용량·LOT·영업자·전성분).
- 2단·셔플 PDF **PASS**.
- `Ingredients` 단독은 규칙 근거 부족 → 자동 통과 대상 아님(notes).

## 고친 점
- 소용량 규칙을 내용량 `presence`보다 먼저 `skip_info`.
- 용량: 단독 `g`/`ml` 제거, 숫자+단위 매칭.
- 사용기한: EXP·개봉 후 N개월/M·제조일로부터.
- 제조번호: L/N·Lot.No 등.
- 전성분 **영역** pt 측정, 불가 시 확인 불가. 4.9/5.0/5.1(반올림) 경계.
- 알레르기 향료만/성분만/둘 다 구분 유지.

## 남은 한계
- 바코드·가격 이미지/특수 케이스, 세트·조건부 규칙 다수 skip_info.
- 전성분 영역 휴리스틱(다음 라벨까지) — 레이아웃 극단에서 unknown.
- ADV 금지어는 examples·소수 고정 패턴(규칙 발명 없음).

## 변경 파일
- `lib/label-check/load-rules.ts`, `run-check.ts`
- `scripts/label-check-mutation-492.ts`
- `scripts/regression/label-check-492.ts`, `label-check-483.ts`(A/B/C pass −1), `run-all.ts`
- `review/492-targets.md`, `492-coverage.md`, `492-notes.md`, `492cha-report.md`

## 빌드·회귀
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 |
| `label-check-483` / `label-check-492` | 통과 |

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: (본 보고서 커밋)
- 커밋 ≤4: 커버리지 `d1772e4` → 판정·하네스 `3434fc5` → 회귀 `9de5c53` → 보고 (본 커밋)
