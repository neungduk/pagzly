# 480차 보고 — 원본 실사 유료검증

## 승인 / 유료 실행
- **승인 문구 있음:** `유료 승인 2026-11-03`
- Cursor가 프리뷰에서 **생성 1회 시도**함. 재시도·재생성 없음.
- Production / main 미작업.

## 실행한 항목
| 항목 | 상태 |
|------|------|
| A 사전 점검 | 완료 (`review/480-notes.md`) |
| B verify 스크립트 | 준비됨 (`scripts/verify-480.ts`) — **미실행**(생성 미완료) |
| C 유료 1회 생성 | **시도 → 업로드 단계 실패 후 중단** |
| 캡처 750/390 | **미실행**(결과 페이지 없음) |
| D 본 보고 | 갱신 |

## C 실행 요약
- 대상: `https://pagzly-h4zrcmwnv-pagzly.vercel.app/create/detail`
- 카테고리: 화장품/뷰티 (미스트). 구성: 짧은 구성.
- 사진: `Desktop/연연` 미스트 실사 **10장** 업로드 표시(폼 최소 7장·최대 10장. 지시 2~4장보다 폼 한도로 맞춤).
- 입력: 상품명/브랜드/가격/타겟/특징/용량/성분/인증/높이/판매근거/비교 2행/경쟁사·도매 텍스트 모두 **테스트** 가짜 값.
- 생성 버튼 1회 클릭 → UI 「사진 업로드 중…」 → 빨간 오류 **`Failed to fetch`** → **여기서 중단(재시도 안 함)**.

## 실제 나간 유료 호출 (가능한 범위)
| 종류 | 횟수 | 비고 |
|------|------|------|
| Anthropic / DeepSeek / Replicate (생성·비전·합성) | **0** | `/api/generate` 진입 전 실패로 추정 |
| `POST /api/storage/upload-url` | **≥1** (성공 응답으로 보임) | 프리사인 URL 발급 |
| R2 직접 PUT (presigned) | **시도 후 실패** | `*.r2.cloudflarestorage.com` PutObject. Performance상 전송량 0·짧은 duration → 브라우저 `Failed to fetch`(CORS/네트워크/차단 가능) |
| 기타 페이지 API (`/api/billing/me` 등) | 다수 | 생성 유료 경로 아님 |

이미지 URL 접두사(`https://img.pagzly.com/`)·섹션 배정·verify-480: **생성 미완으로 확인 불가**.

## 오류
- **메시지:** `Failed to fetch` (키/서명 URL 값은 기록하지 않음)
- **단계:** 생성 직전 **상품 사진 업로드**(클라 → `upload-url` → R2 PUT). 버튼 문구 「사진 업로드 중…」 직후.
- **호출:** R2 프리사인 PUT(및 직전 `api/storage/upload-url`). `/api/generate` draft 유료 호출까지는 가지 못한 것으로 보임.

## 섹션별 눈 검수
- 결과 페이지 없음 → 해당 없음.

## 다음 후보
1. Preview R2 PUT `Failed to fetch` 원인(CORS, 버킷/퍼블릭 호스트, 브라우저 차단) 점검 — 값 노출 없이.
2. 업로드 성공 후 **1회만** 재승인·재생성 → verify-480 + 750/390 캡처.
3. 폼 최소 7장 vs 지시 2~4장 정책 정합.

## Git
- 브랜치: `cloud-work` (main 미push). tip은 본 보고 push 후 `git log -1`.
