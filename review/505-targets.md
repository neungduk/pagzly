# 505차 목표 (코드 전)

## 성공 기준
1. 알레르기 로더 → `allergens-kr-25_v1.json`(draft 유지). 국문 우선·공백/`이소`↔`아이소` 정규화, 화면은 고시 표기. thresholds 표시. CAS 보조는 가능하면.
2. `common_cautions` 4개 판정(구간/폴백), KR-LBL-009와 중복 없이 통합. 기능성 시 별표4 8. 한 줄.
3. evidence 접힘: `meta.evidence_requirements` 상위 3줄은 결과 하단 1회만(선택 사유 notes).
4. validate:rules에 allergens v1·cautions v0.2 common 검사. `label-check-505` 회귀. tsc/build/regression:label-check. 커밋 ≤3. main 미푸시. 규칙 JSON 미수정.

## 비목표
- 규칙 데이터 내용 변경, Production/main, 유료 호출, 506·507 범위.
