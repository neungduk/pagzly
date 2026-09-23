# 201차 — pagzly-v2 전환 (env + schema + 검증, API 0)

생성: 2026-09-16

## 요약

PagePick-2 / `pagzly-v2` (`qnstsrplqzoqlndojuyw`)로 전환 완료. `.env.local` Supabase 3키 교체, `db push` 마이그레이션 **16/16** 성공, Edge Function `cleanup-expired-images` 배포 성공, 업로드 왕복(200) + `products` count=0 확인. 생성 API 0. 시크릿/DB 비밀번호 미출력.

## 결과

| 항목 | 결과 |
|------|------|
| `.env.local` | URL/ANON/`SUPABASE_SECRET_KEY` 3개만 교체 (기타 키 미변경) |
| `supabase link` | `qnstsrplqzoqlndojuyw` |
| `supabase db push` | **16 migrations applied, 0 errors** |
| functions deploy | `cleanup-expired-images` Deployed |
| cron (`config.toml` `0 0 * * *`) | 로컬 설정 유지·배포됨. 대시보드 cron 등록 여부는 MCP가 다른 org 프로젝트만 보여 미확인 — 대시보드 Edge Functions에서 육안 확인 권장 |
| upload roundtrip | upload → public fetch **200** → remove ok |
| `products` count | **0** |
| `npx tsc --noEmit` | **0** |
| 생성 API | **0** |

### db push 적용 목록 (16)

`20260812150000` … `20260904103000` (products/product_images/onboarding/jobs/billing/subscriptions/theme/logo 등 전부)

## grep `sblnthhayvrfkvaksest`

### 수정함 (런타임)

- `next.config.ts` `images.remotePatterns.hostname` → `qnstsrplqzoqlndojuyw.supabase.co`

### 잔존 (과거 QA/문서 — 사용자 기준 정상 또는 비런타임)

- `app/`, `lib/`, `components/`, `supabase/config.toml`, `supabase/.temp/` → **0**
- `scripts/*cha*-lifestyle*.ts` 등 구 하드코딩 URL 다수 (과거 QA 픽스처)
- `scripts/auth-state.json` — 구 프로젝트 auth 쿠키 이름 (Playwright 재로그인 필요 시 갱신)
- `review/`, `claude/` 과거 기록

## 산출물

- 검증 스크립트: `scripts/_201cha-verify-roundtrip.ts` (재실행 가능, 시크릿 미출력)
- 원샷 마이그레이션 헬퍼는 삭제함 (시크릿 포함이었음)
