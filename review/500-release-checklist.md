# 500차 — 공개 준비 점검표 (코드 사실만)

## 환경변수
| 이름 | 필수 | 없을 때 |
|------|------|---------|
| `NEXT_PUBLIC_LABEL_CONTACT_EMAIL` | 선택 | 문의 이메일 UI 숨김(`labelContactEmail`→`""`) |
| `NEXT_PUBLIC_SUPABASE_URL` | 회원/저장 경로에 필요 | 게스트 PDF 점검은 가능. createClient 실패 시 서버 오류 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 회원/저장 경로에 필요 | 위와 동일 |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | label-check 경로 **미사용**(코드상 createClient=anon) | — |
| `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` | 선택(상세 이미지) | label-check 직접 의존 없음 |

## 플래그 기본값
| 항목 | 값 |
|------|-----|
| label-check 전용 기능 플래그 | 코드상 **없음**(미확인: 타 모듈 플래그가 간접 영향하는지는 미확인) |
| 시장 기본 | KR |
| robots | `index:false` / `follow:false` (`app/label-check/layout.tsx`, new/history layout 동일 계열) |

## 로그(PDF 원문·추출 텍스트)
| 위치 | 내용 |
|------|------|
| `app/api/label-check/route.ts` | `ok readable/skip/findings/saved` 메타만. **본문·파일명 없음** |
| 동 파일 | `extract-limit` / `save-failed` / `failed` warn — 본문 없음 |
| `runs/*` | list/get/delete-failed warn — 본문 없음 |
| `lib/label-check/*` | console 호출 **없음**(전수 grep) |

## noindex
- `/label-check` layout: robots noindex/nofollow.
- new/history layout: 495차 noindex 유지(코드 존재).

## 레이트 리밋
| 대상 | 규칙 |
|------|------|
| 게스트 | IP당 분당 10 (`LABEL_CHECK_GUEST_RATE_RULES`) |
| 회원 | 사용자당 분당 30 |
| 한계 | 인메모리·인스턴스별(498 notes). 수정 없음 |

## 결과 저장(회원)
- 테이블 `label_check_runs`: market, product_name(≤80), options, summary, findings(요약), created_at.
- **원문·파일명 저장 안 함**. 사용자당 최근 200건.

## 오류 code
| code | 용도 |
|------|------|
| NO_FILE | 파일 없음 |
| TOO_LARGE | 용량/JSON 상한 |
| NOT_PDF | 시그니처 |
| TOO_MANY_PAGES | 쪽수 |
| UNREADABLE | 암호·손상 등 |
| TIMEOUT | 추출 시간 |
| RATE_LIMIT | 429 |
| LOGIN | 401 |
| NOT_FOUND | 404 |
| BAD_REQUEST | JSON 스키마 |
| SERVER | 500 |

## 라이브러리 라이선스(이름만)
| 패키지 | license 필드 |
|--------|----------------|
| pdfjs-dist | Apache-2.0 |
| pdf-parse | MIT |
| next | MIT |

## 미확인
- Production 배포 환경변수 실값·Vercel 프로젝트 매핑.
- 실제 검색엔진 noindex 반영 여부.
- pdfkit 등 label-check 비의존 패키지의 공개 범위 영향.
