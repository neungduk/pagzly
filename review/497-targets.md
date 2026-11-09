# 497차 목표 (코드 전)

## 성공 기준
1. us-497 4 PDF를 market=US 회귀에 고정 기대값으로 등록·통과.
2. 이미지 PDF 안내 개선(OCR 없음) + 혼합 쪽 번호. `extractFallback` 인터페이스만(항상 null).
3. US 오탐: identity/US-013 단어경계, net qty 짧은 단위는 숫자 동반만. US-012 확정 오탐 0.
4. us3: 한글만이면 영어 라벨 아님을 먼저 안내하고 영문 필수 possible 연쇄 보류.
5. tsc/build. 커밋 ≤3. main 미푸시. 규칙 JSON 미수정.

## 비목표
- OCR 구현, Production/main, 규칙 데이터 수정, 유료 호출.
