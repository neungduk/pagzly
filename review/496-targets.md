# 496차 목표 (코드 전)

## 성공 기준
1. `fix-suggestions-kr_draft_v0.1.json` 로드 → 한국 항목에 fix_ko/example/kind 표시. id 없으면 접힘 숨김.
2. kind별 라벨: evidence=근거 자료 확인, soften=표현 완화 예시, fix=수정 제안. 모아 보기에 포함.
3. todo.md 상단 "완료(496차)" 한 줄. 규칙·ad-phrases 데이터 파일 미수정.
4. 커버리지 시험: 규칙 id 대비 제안 누락 0.
5. 금지어 정적 검색 스크립트 + 허용 목록. new/history noindex(현행 보고). 오류 경로·a11y 보완.
6. tsc/build. 커밋 ≤4. main 미푸시.

## 비목표
- 규칙 JSON 수정, Production/main, 실 브라우저 320px 렌더(불가 시 미실시), 결제·상세 변경.
