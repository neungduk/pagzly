# 491차 목표 (코드 전)

## 성공 기준
1. **A 감사**: PDF 저장·외부 전송·결과 저장 0, IP는 인메모리 일시만 — `491-notes.md`에 사실/근거. 저장·전송 있으면 문구 수정 중단.
2. **B 문서**: privacy/terms에 검수 항목 추가(코드 사실만). 플래그 꺼짐 시 상세·결제 문단 숨김, 켜짐 시 기존 유지. 날짜는 기존 체계, 자리표시자 금지. 문의는 `NEXT_PUBLIC_LABEL_CONTACT_EMAIL` 있을 때만.
3. **C**: `/label-check` 하단 privacy·terms 링크. sitemap/robots 변경 금지.
4. **D**: 회귀 추가. 커밋 ≤3. `tsc`/`build` 통과.

## 비목표
- 법률 자문·필수기재 충족 판단, 새 기능/검사 규칙, main/Production, 코드 삭제.
