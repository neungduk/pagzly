# 490차 노트

## A. ignoreCommand
- `vercel.json` → `ignoreCommand`: `bash scripts/vercel-ignore-docs.sh`
- `crons`(`/api/billing/renew`) 유지.
- 의미: exit **0** = 빌드 건너뜀, exit **1** = 빌드 진행(Vercel 규약).
- `git diff --quiet HEAD^ HEAD -- .` + exclude `review`/`review/**`/`*.md`/`**/*.md`.
  - 제외 경로만 변경 → quiet 성공(0) → skip.
  - 코드 등 포함 변경 → quiet 실패(1) → build.
- `HEAD^` 없음(첫 커밋·shallow에서 부모 부재): script가 exit 1 → **빌드 진행**(안전).

### 로컬 실측 (PowerShell `$LASTEXITCODE`, `git diff --quiet` 동일 pathspec)
| 대상 | 기대 | 실측 |
|------|------|------|
| 문서만 `448dfe9` (TASK_490) | 0 skip | **0** |
| 문서만 `1730083` (489 tip hash) | 0 skip | **0** |
| 문서만 `da697f5` (cha-report) | 0 skip | **0** |
| 코드 `106bb70` (API 가드) | 1 build | **1** |

Windows에는 `bash`가 없어 스크립트 직접 실행은 못 했고, pathspec/`--quiet` 종료코드로 검증. Vercel 빌드 환경은 Linux+bash.

## B. 사용자 할 일 (코드 아님)
- Vercel에서 **pagelab** 프로젝트의 Git 연결 해제(또는 프로젝트 삭제).
- 같은 저장소가 pagzly+pagelab 두 프로젝트에 붙어 커밋 1회 = 배포 2회로 Hobby 일일 한도를 두 배로 소모함.
- **pagzly** 프로젝트만 유지.

## C. 결제 가드
| 라우트 | 플래그 꺼짐 | 근거 |
|--------|-------------|------|
| `/api/billing/subscribe` | 503 (detailPageDisabledResponse) | 닫힌 상세 상품 신규 구독 차단. Toss 호출 전 |
| `/api/billing/purchase-pack` | 503 | 토큰 팩 구매 차단. Toss 호출 전 |
| `/api/billing/me` | **유지** | 잔액·상태 조회. 결제 외부 호출 없음 |
| `/api/billing/renew` | **유지** | 기존 구독 cron 갱신. 이미 결제된 구독자 보호. 해지/환불 정책은 사용자 결정 |

기존 유료 구독자 존재 여부: 모름 → 보고서에 "있으면 어떻게 할지는 사용자 결정".
