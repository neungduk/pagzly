# 480차 보고 — 원본 실사 유료검증

## 승인 / 유료 실행
- **승인 문구 있음:** `유료 승인 2026-11-03` (1차 + CORS 수정 후 2차)
- Cursor가 프리뷰에서 생성 **총 2회 시도**(각 승인 구간당 1회). 실패 후 자동 재시도 없음.
- Production / main 미작업.

## 실행한 항목
| 항목 | 상태 |
|------|------|
| A 사전 점검 | 완료 (`review/480-notes.md`) |
| B verify 스크립트 | 준비됨 — **미실행**(생성 미완료) |
| C 유료 생성 | **2회 모두 업로드 단계 실패 후 중단** |
| 캡처 750/390 | **미실행** |
| D 본 보고 | 갱신 |

## C 실행 요약
- 대상: `https://pagzly-h4zrcmwnv-pagzly.vercel.app/create/detail`
- 카테고리: 화장품/뷰티 (미스트). 사진 10장·테스트 가짜 입력 유지.
- **1차:** 사진 업로드 중 → `Failed to fetch` 중단.
- **2차 (CORS 수정 후, 본 메시지):** 동일 폼에서 생성 1회 → 다시 「사진 업로드 중…」 → **`Failed to fetch`** → 중단.

## 실제 나간 유료 호출 (가능한 범위, 2차 기준)
| 종류 | 횟수 | 비고 |
|------|------|------|
| Anthropic / DeepSeek / Replicate | **0** | generate 미진입 |
| `POST /api/storage/upload-url` | **1+** (응답 있음) | 프리사인 발급 |
| R2 presigned PUT | **실패** | host=`*.r2.cloudflarestorage.com`, transferSize 0·짧은 duration. UI `Failed to fetch` |

이미지 URL 접두사·섹션 배정·verify-480: **확인 불가**.

## 오류
- **메시지:** `Failed to fetch`
- **단계:** 상품 사진 R2 PUT (upload-url 이후). `/api/generate` 이전.
- CORS를 고친 뒤에도 동일 증상 → CORS만의 문제가 아니거나, 브라우저/프리사인/버킷 엔드포인트 추가 점검 필요(키·서명 URL은 기록하지 않음).

## 섹션별 눈 검수
- 결과 없음.

## 다음 후보
1. R2 PUT 실패를 브라우저 Network에서 status/CORS 헤더로 재확인(값 노출 없이).
2. `STORAGE_PROVIDER`/버킷/퍼블릭 베이스와 프리사인 호스트 일치 여부.
3. 업로드 성공 확인 후에만 다음 유료 1회.

## Git
- 브랜치: `cloud-work` (main 미push).
