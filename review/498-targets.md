# 498차 목표 (코드 전)

## 현재 한도 실측 (수정 전)
| 항목 | 값 | 위치 |
|------|-----|------|
| 서버 용량 | 10MB (`MAX_PDF_BYTES_483`) | `types.ts` / API |
| 클라이언트 용량 | 10MB (동일 상수·하드코딩 문구) | `page.tsx` / `new/page.tsx` |
| 플랫폼 본문(Hobby) | ~4.5MB | Vercel 문서(배포 후 413 확인) |
| 쪽수 | 10 (`MAX_PDF_PAGES_485`) | `safe-upload` |
| 추출 시간 | 20s (`EXTRACT_TIMEOUT_MS_485`) → 408 | `withExtractTimeout` |
| `maxDuration` | **미설정** (label-check route) | — |
| 오류 JSON | `{ error }` only (`code` 없음) | API |

## 성공 기준
1. 서버 한도 < 플랫폼(~4.5MB). 클라이언트 사전 검사 + 413/비JSON 파싱 방어. 동일 한글 안내.
2. 큰 파일 대안은 notes만(구현 금지).
3. 비정상 PDF 5종+ 회귀에 `code` 고정. 암호 PDF는 생성기 없으면 notes 미실시.
4. 인메모리 레이트 한계·pdfjs destroy notes/코드. 오류 `{error,code}` 통일.
5. tsc/build. 커밋 ≤3. main 미푸시. 규칙 JSON 미수정.

## 비목표
- OCR·클라이언트 pdfjs 추출 구현, 임시 스토리지 업로드, Production/main, 레이트 리밋 스토어 교체.
