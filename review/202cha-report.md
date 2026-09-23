# 202차 — pagzly-v2 cron 등록 (pg_cron + pg_net, API 0)

생성: 2026-09-16

## 요약

`pg_cron`/`pg_net` 익스텐션 + `cleanup-expired-images` 일일 스케줄(`0 0 * * *`)을 새 마이그레이션으로 등록·푸시 완료. `cron.job`에 active 1행 확인. Edge Function 수동 POST **200** (`deleted:0`). 생성 API 0. secret/DB 비밀번호 미포함.

## 결과

| 항목 | 결과 |
|------|------|
| migration | `supabase/migrations/20260916120000_cron_cleanup_expired_images.sql` |
| `npx supabase db push` | **1 migration applied** (`20260916120000…`) |
| `cron.job` | jobid=1, jobname=`cleanup-expired-images`, schedule=`0 0 * * *`, **active=true** |
| curl POST cleanup | **200** `{"deleted":0,"message":"No expired images"}` |
| `npx tsc --noEmit` | **0** |
| migration에 secret/service role | **없음** (anon/publishable만) |
| 생성 API | **0** |

### cron.job 조회

```json
{
  "jobid": 1,
  "jobname": "cleanup-expired-images",
  "schedule": "0 0 * * *",
  "active": true
}
```

헬퍼: `scripts/_202cha-write-cron-migration.ts` (anon을 `.env.local`에서 읽어 SQL 생성), `scripts/_202cha-curl-cleanup.ts` (수동 트리거).
