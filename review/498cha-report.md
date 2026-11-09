# 498차 보고서

## 확인하지 못한 항목
- Vercel Hobby 실제 413(플랫폼) 응답 본문·상태 — **배포 후 확인 필요**.
- 암호 걸린 PDF 합성 시험 — qpdf/pdf-lib 없어 **미실시**(손상·UNREADABLE 경로만 검증).
- 인메모리 레이트 리밋의 멀티 인스턴스 우회 — 한계만 notes(수정 금지).

## 한도 표
| 계층 | 수정 전 | 수정 후 |
|------|---------|---------|
| 서버 `MAX_PDF_BYTES_483` | 10MB | **4MB** (< ~4.5MB 플랫폼) |
| 클라이언트 사전 검사 | 10MB 문구 | 동일 상수 + `ERR_TOO_LARGE_485` |
| 플랫폼(Hobby) | ~4.5MB | 변경 없음 |
| 쪽수 | 10 | 10 |
| 추출 타임아웃 | 20s → 408 | 동일 |
| `maxDuration` | 없음 | **30** (리터럴) |

## 오류 code 표
| code | HTTP | 화면 문구 출처 |
|------|------|----------------|
| NO_FILE | 400 | PDF 파일이 필요합니다 |
| TOO_LARGE | 400 / 클라·413폴백 | `ERR_TOO_LARGE_485` |
| NOT_PDF | 400 | `ERR_NOT_PDF_485` |
| TOO_MANY_PAGES | 400 | `ERR_TOO_MANY_PAGES_485` |
| UNREADABLE | 400 | `ERR_UNREADABLE_PDF_485` |
| TIMEOUT | 408 | `ERR_TIMEOUT_485` |
| RATE_LIMIT | 429 | `ERR_RATE_485` |
| LOGIN | 401 | 로그인 만료 |
| NOT_FOUND | 404 | 결과 없음 |
| SERVER | 500 | 서버 오류 |

비JSON(413 HTML 등) → `readLabelCheckApiFailure`가 TOO_LARGE 안내로 통일.

## B 비교 요약
클라 pdfjs 추출 vs 임시 스토리지 — notes 표. 권장 메모: 단기 4MB+안내, 중기 클라 추출(저장 약속 유지), 스토리지는 문구 개정 후.

## 검증
- tsc / build / 회귀 498·483·497·495 OK
- push: cloud-work only

## 커밋
- (targets / 구현 / notes·report — push 후 해시)
