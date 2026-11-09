# 499차 보고서

## 확인하지 못한 항목
- **브라우저 실측 미실시**(Chrome/Safari·모바일). Node에서는 public `<script>` 로드 불가.
- 실제 5~100MB 인쇄 PDF 대용량 시험 미실시.
- 워커 vs `disableWorker` 기기별 성능 미측정.

## 경로 분기(텍스트)
`선택(≤100MB)` → `클라 pdfjs 추출` → 성공 시 `JSON 전송` / 실패·≤4MB면 `FormData 업로드` / 실패·>4MB면 큰파일 안내.

## 상수 표
| 항목 | 값 |
|------|-----|
| 클라 파일 | 100MB |
| 서버 업로드 폴백 | 4MB |
| 쪽수 | 10 |
| JSON | 300KB |
| 아이템 수 | 20_000 |
| 아이템 문자 | 500 |
| 총 문자 | 200_000 |

## 번들
- 앱 JS에 pdfjs **미포함**(public 복사).
- public 산출: pdf.min ≈280KB + worker ≈1041KB ≈ **1.3MB**(gzip 전). 의존성 `pdfjs-dist@2.16.105`.

## 동일성 시험
A·B·C, i1–i6, us1–us4: `runLabelCheck483` ≡ `extract→payload→runLabelCheckFromExtracted` **통과**.

## 검증
- tsc / build / 회귀 499·498·483·497 OK
- push: cloud-work only

## 커밋
- (targets / core / client·API / docs·회귀 — push 후 해시)
