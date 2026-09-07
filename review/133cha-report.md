# 133차 리포트 — 정보 밀도·근거 강화 3건

생성: 2026-09-07  
신규 이미지/모델 전환: **없음**  
B 검증만 기존 카피 파이프라인(Claude 구조 + DeepSeek 카피) 3회 — 텍스트. A/C는 로컬 결정론.

## A. 전자제품 KC 인증

- `ELECTRONICS` `spec_table` note에 인증 노출/지어내기 금지/없으면 행 생략 지시 추가
- `enrich-product-sections`: `KC 인증` 행에 certifications 매핑, **없으면 행 생략**

원문: `review/133cha-A-spec-rows.txt`  
스크린샷: `133cha-electronics-cert.png` / `133cha-electronics-nocert.png`

## B. 문제→해결 헤드라인 루브릭

`buildStyleRubricBlock()`에 대비형 규칙 + 억지 금지 + 경쟁사 불안 조성 금지 추가.

원문: `review/133cha-B-headlines.txt`

| 케이스 | mainHeadline | cliché | hallu |
|--------|--------------|--------|-------|
| cosmetics | 속이 당길 때, 가볍게 스며드는 수분 | 0 | 0 |
| electronics | 매번 선을 들고 다니던 청소, 무선으로 끝 | 0 | 0 |
| thin-problem (면티) | 매일 꺼내 입는 면 100% 화이트 | 0 | 0 |

전자는 입력 근거 대비형, 면티는 담백한 설명형 헤드라인 유지.

## C. sourceReviewCount

- `countReviewLines` / `reviewLineCount` → `sourceReviewCount` 배선
- 렌더/export: `실제 리뷰 N건 분석` (N>0일 때만)

`review/133cha-C-count.txt`: fixture 6줄 = sourceReviewCount 6  
UI: `133cha-review-count.png` / `133cha-review-no-count.png` (캡션 0)

## tsc / diff

`review/133cha-tsc-output.txt` → `EXIT_CODE=0`

`review/133cha-git-diff-stat.txt` (관련 파일; Renderer/preview에 미커밋 128~131 누적 포함)

## 체크리스트

- [x] A note + 있음/없음
- [x] B 루브릭 + 헤드라인 3건 + 경고 0
- [x] C count 배선 + 캡션 조건부
- [x] tsc 0
- [x] git diff --stat
