# 500차 — 미국 광고 표현 데이터 연결 + 공개 준비 점검표

## 0. 규칙
- 유료 호출 금지. Production·main 금지. 코드 삭제 금지. 규칙 데이터 수정 금지(수정 필요하면 보고). "위반" 단정·"완벽/보장" 금지. 새 판정 신설 금지(데이터에 있는 것만).
- `review/500-targets.md`에 코드 전 기재. 마무리 전 `npx tsc --noEmit`, `npm run build`. 커밋 최대 3개. 보고서 `review/500cha-report.md`.

## 1. 미국 광고 표현 연결
- `review/data/us-ad-phrases_draft_v0.1.json`(6개 항목)을 로드해 미국 모드에서 항목 제목 단위로 "확인 필요" 한 건씩 표시(493차 한국 방식과 동일 구조: 같은 항목 다중 일치는 한 건, 찾은 표현 최대 3개). 현재 US-013에 하드코딩된 영어 패턴이 있으면 **데이터 파일 방식으로 교체**하고 중복 표시를 없앤다. 교체 전/후 us2_missing 결과를 표로 비교.
- 수정 제안: 항목의 `fix_ko`, `fix_example_en`을 494차 수정 제안 영역에 표시(예시 동반 문구 재사용). `needs_evidence`는 한국과 같은 "근거 자료 필요" 한 줄.
- 오탐: 단어 경계/굴절 처리(497) 유지. `treat`→`Treatment`, `heal`→`healthy`, `prevent`→`preventive`/`prevention`은 별도 판단(굴절만 허용이므로 `prevention`은 미일치가 맞는지 확인하고 notes에 기록), 성분 목록 영역 제외, `permanently`가 `permanently sealed cap` 같은 포장 문구에 쓰인 경우, `Growth factor`가 성분명인 경우를 시험. 데이터 수정이 필요하면 바꾸지 말고 보고.
- 시험: 합성 문장 주입으로 6개 항목 각각 일치/미일치 1개 이상, us1_ok 오탐 0, us2_missing에서 disease·structure_function·stem_exosome·evidence 항목 확인 필요. `label-check-500.ts`로 고정.

## 2. 공개 준비 점검표 (코드 점검, 문서화)
`review/500-release-checklist.md`를 만든다. 코드를 읽고 사실만 표로:
- 환경변수 목록(필수/선택, 없을 때 동작: 문의 이메일 등), 플래그 기본값, 로그에 PDF 원문·텍스트가 남는지(console 호출 전수 점검 결과), noindex 상태, 레이트 리밋 값, 결과 저장 항목, 에러 code 표, 사용 라이브러리 라이선스 확인 필요 항목(pdfjs-dist, pdf-parse 등: 라이선스 이름만 기재).
- 확인할 수 없는 것은 "미확인"으로 기재(추정 금지).

## 3. 보고서
맨 위 "확인하지 못한 항목", 미국 광고 교체 전/후 표, 오탐 시험 결과, 점검표 위치, 커밋 해시와 push 확인.
