# 504차 목표 (코드 전)

## 성공 기준
1. 광고 로더 → `ad-phrases-kr_draft_v0.2.json` (v0.1 파일 유지). regex_patterns·exception_note·fix_ko·non_functional 처리. 짧은 영문 단어경계·오탐 시험.
2. 주의사항: ingredient_cautions 전성분↔주의문구 매칭 + type_cautions는 UI 복수 유형 선택 시에만. 벤조페논-3 시행일 한 줄.
3. 별표4 addenda code 항목 기존 KR-LBL과 중복 없이 통합(중복 시 보강만). manual=확인 질문. ADD-004 낮춤.
4. validate:rules에 새 3파일. `label-check-504` 회귀. tsc/build/regression:label-check. 커밋 ≤4. main 미푸시. 규칙 JSON 내용 미수정.

## 비목표
- 규칙 데이터 내용 변경, Production/main, 유료 호출, 상세페이지 NG 수정, 임의 새 판정.
