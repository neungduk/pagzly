# 489차 보고 — 상세페이지 숨김(플래그), 검수만 노출

## 확인하지 못한 항목
- **Vercel 프리뷰 빌드·랜딩 육안**: push 후 기획 담당 확인. 로컬 `tsc`/`build`·회귀만 통과.
- **main 병합·Production**: 이번 차수에서 하지 않음(사용자 결정).

## 목표 / 실측
| 목표 | 실측 |
|------|------|
| `DETAIL_PAGE_ENABLED` 기본 꺼짐(`"1"`만 켜짐), 코드 삭제 없음 | `lib/feature-flags.ts` |
| UI: 검수 소개+CTA, `/create`·온보딩 리다이렉트, 메타 교체 | 랜딩·middleware·create/onboarding layout·root/OG 메타 |
| API: 유료 생성 계열 최상단 503, 외부 호출 전 거절 | `detailPageDisabledResponse` + `489-notes.md` 표 |
| 켜짐(`1`) 복원 경로 | 소스에 `/create`·상세 CTA 유지, 가드 통과 |
| 회귀·빌드 | `feature-flag-489`·`label-check-483` 통과, tsc/build 통과 |

## 켜는 법(복원)
환경변수 하나: `NEXT_PUBLIC_DETAIL_PAGE_ENABLED=1` 후 재빌드/재기동.

## API 처리 요약
- **거절(503)**: generate·backdrop·lifestyle·social·enhance·canvas·composite·patch·scene/section/info-backdrops·autofill·protect·image-jobs·products·generations·support-chat·proxy-image·storage/*
- **no-op**: cron/cleanup-expired-images
- **유지**: label-check, billing/*, auth·로그인·약관
- 상세: `review/489-notes.md`

## 변경 파일
- `lib/feature-flags.ts`, `lib/detail-page-api-guard.ts`
- `app/page.tsx`, `app/layout.tsx`, `app/opengraph-image.tsx`, `app/sitemap.ts`
- `app/create/layout.tsx`, `app/onboarding/layout.tsx`, `app/auth/callback/route.ts`
- `app/login/layout.tsx`, `app/signup/layout.tsx`, billing success/subscribe CTA
- `components/AppSidebar.tsx`, `lib/supabase/middleware.ts`
- `app/api/**` (생성·스토리지·proxy·cron)
- `scripts/regression/feature-flag-489.ts`, `run-all.ts`
- `review/489-targets.md`, `489-notes.md`, `489cha-report.md`

## 남은 문제
- 빌링 화면·요금제 카피는 최소 수정(상세 홍보 문장 일부 잔존 가능). 플래그 꺼진 랜딩에서는 요금제 섹션 자체 비노출.
- Production env에 `NEXT_PUBLIC_DETAIL_PAGE_ENABLED`를 넣지 않으면(또는 `1`이 아니면) 상세는 계속 숨김.

## 빌드
| 명령 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과 (55 routes) |
| `feature-flag-489` / `label-check-483` | 통과 |

## Push
- branch: `cloud-work` → `origin/cloud-work` (**main 미푸시**)
- tip: `(push 후 기재)`
- 항목: targets `04a6c32` → A `2d59e27` → B `83ebe1a` → C `106bb70` → D `4afc82f` → E `(본 커밋)`
