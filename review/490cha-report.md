# 490차 보고 — 배포 절약(ignoreCommand) · 닫힌 상품 결제 차단

## 확인하지 못한 항목
- **Vercel ignoreCommand 실배포 skip**: pathspec 종료코드만 로컬 확인. 프리뷰 skip 로그는 기획 담당.
- **pagelab Git 연결 해제**: 사용자 할 일(아래 B). 에이전트가 Vercel 대시보드를 조작하지 않음.
- **기존 유료 구독자 유무**: 모름. 있으면 유지/해지/환불은 **사용자 결정**.

## ignoreCommand 실측
| 경우 | 기대 | 실측 (`git diff --quiet` + 동일 exclude) |
|------|------|------------------------------------------|
| 문서만 `448dfe9` / `1730083` / `da697f5` | 0 skip | **0** |
| 코드 `106bb70` | 1 build | **1** |
| `HEAD^` 없음 | 1 build | script가 exit 1로 진행 |

설정: `vercel.json` → `ignoreCommand: bash scripts/vercel-ignore-docs.sh`, `crons` 유지.

## 결제 가드 처리표
| 라우트 | 꺼짐 시 | 비고 |
|--------|---------|------|
| `billing/subscribe` | 503 (489 헬퍼) | Toss `issueBillingKey`/`chargeBillingKey` 전 |
| `billing/purchase-pack` | 503 | Toss `confirmPayment` 전 |
| `billing/me` | 유지 | 조회만 |
| `billing/renew` | 유지 | 기존 구독 cron |

## 사용자 할 일 (B)
- Vercel에서 **pagelab** 프로젝트 Git 연결 해제(또는 프로젝트 삭제).
- **pagzly**만 유지 → 커밋당 배포 2회(한도 2배 소모) 방지.
- Hobby 일일 한도 리셋 전 489 프리뷰는 못 볼 수 있음(배포 rate limit은 코드 오류 아님).

## 빌드·회귀
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 (55 routes) |
| `feature-flag-489` (결제 2라우트 포함) | 통과 |

## 변경 파일
- `vercel.json`, `scripts/vercel-ignore-docs.sh`
- `app/api/billing/subscribe/route.ts`, `purchase-pack/route.ts`
- `scripts/regression/feature-flag-489.ts`
- `review/490-targets.md`, `490-notes.md`, `490cha-report.md`

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: (본 보고서 커밋 — push 후 `git log -1`)
- 커밋 3개: A·B `e01b90b` → C `68f1252` → 보고 (본 커밋)
