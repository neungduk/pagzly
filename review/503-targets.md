# 503차 목표 (코드 전)

## 성공 기준
1. `label-check-492/493` 회귀에서 playwright 제거. PDF는 레포 샘플만 읽음. 생성 로직은 `scripts/label-check-make-fixtures-492.ts`(assertHeavyEntry)로 보존. 필요 PDF는 `review/data/samples/regression-503/`에 커밋(총≤5MB).
2. `label-check-mutation-492.ts`에 assertHeavyEntry. chromium 사용 여부·가드 필요성 notes에 기록.
3. heavy-guard 재실행 → 우리가 추가한 실패 문구(회귀 playwright·mutation 가드없음) 소멸. 전/후 표.
4. docs에 회귀 실행 방법 3줄. tsc/build/`regression:label-check`. 커밋 ≤2. main 미푸시. 상세 신규깨짐 3건 미수정(기술부채).

## 비목표
- 상세페이지 NG 수정, 규칙 데이터 내용 변경, Production/main, 예외 목록(a).
