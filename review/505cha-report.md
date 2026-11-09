# 505차 보고서

## 확인하지 못한 항목
- 브라우저에서 「근거 자료 확인」 하단 블록·공통 주의사항 문구 실측.
- 시안 B/C 주의사항 본문이 공통 4개 match_keys를 우연히 충족하는지 원문 전수 대조(요약 수는 EXPECT 유지).
- INCI 영문명 고시 원문 대조(`inci_verified: false` 유지).

## 알레르기 정정 전/후
| 항목 | 초안(draft) | v1(고시) | 매칭 |
|---|---|---|---|
| no.7 | 이소유제놀 | 아이소유제놀 | `이소`↔`아이소` 정규화로 둘 다 인식, 화면은 고시 |
| no.22 | 메틸2-옥티노에이트 | 메틸 2-옥티노에이트 | 공백 제거 정규화, 화면은 고시 |
| no.23 | 알파-이소메틸이오논 | 알파-아이소메틸아이오논 | 동일 |
| 임계값 | 하드코딩 문구 | `meta.thresholds` rinse_off/leave_on | suggest에 반영 |
| CAS | 없음 | 보조 매칭 | 라벨에 CAS가 있으면 포함 검색 |

`allergens-kr-25_draft.json`은 삭제하지 않음. 로더는 `allergens-kr-25_v1.json`.

## 공통 주의사항 판정 (시안별)
| 시안 | KR-LBL-009(통합) | 비고 |
|---|---|---|
| A | attention — 공통 누락 가능 | pass→attention(요약 attention+1/pass−1) |
| B | (기존 요약 유지) | finding 1건만(중복 없음) |
| C | (기존 요약 유지) | finding 1건만(중복 없음) |

합성: 공통4 통과 / 1개 누락 시 제목만 / 전부 누락 시 한 건 / 기능성 시 별표4 8. 한 줄 — OK.

## 실증 체크포인트
- `meta.evidence_requirements.points_ko` 상위 3줄을 결과 하단 「근거 자료 확인」에 **1회만** 표시.
- **선택 사유(notes):** 동일 3줄이 evidence 항목 접힘마다 반복되면 가독성·인쇄 분량이 늘고, `fix_ko`와 역할이 겹침. 항목 접힘에는 기존 수정 안내만 두고 체크포인트는 하단에 모음. 법적 충족 판정 없음.

## 통합 정리
- validate:rules — allergens v1(25·no 연속·ko·CAS 형식) + cautions v0.2 `common_cautions` 4개.
- 규칙 JSON 내용 미수정(기획 제공본 사용).

## 검증
- `npx tsc --noEmit` / `npm run build` / `npm run validate:rules`(오류 0·경고 0) / `npm run regression:label-check` 15/15 OK
- push: cloud-work only (main 미푸시)

## 커밋
- `6ecdb6c` feat(505): allergen v1 loader, common cautions, evidence footer
- `8ccad9b` test(505): label-check-505 suite and A summary for common cautions
- `f30cedc` docs(505): cha-report for allergen v1, common cautions, evidence notes
