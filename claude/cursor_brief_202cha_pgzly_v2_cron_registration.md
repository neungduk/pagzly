# 202차 — `pagzly-v2` cron 등록 (pg_cron 미설치 확인됨, API 0)

생성: 2026-09-16

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.

## 배경 — 201차 보고서에서 flag된 항목을 직접 확인한 결과

201차 보고서(`review/201cha-report.md`)는 cron 등록 여부를 "대시보드에서 육안 확인 권장"으로
미확인 처리했습니다. 제가 새 프로젝트(`pagzly-v2`, ref `qnstsrplqzoqlndojuyw`) SQL Editor에서
직접 확인했습니다:

```sql
select jobid, schedule, jobname, active from cron.job;
-- ERROR: 42P01: relation "cron.job" does not exist

select extname, extversion from pg_extension where extname = 'pg_cron';
-- 0 rows
```

**결론: `pg_cron` 익스텐션 자체가 새 프로젝트에 설치되어 있지 않습니다.** Edge Function
`cleanup-expired-images`는 정상 배포됐지만(Functions 페이지에서 확인함, deployment 1개,
7분 전 배포), `supabase/config.toml`의 `[functions.cleanup-expired-images.cron]` 설정은
CLI `functions deploy`만으로는 실제 pg_cron 스케줄을 만들어주지 않는 것으로 보입니다 —
즉 이 cron은 프로젝트마다 별도로 등록해야 하는 항목입니다. (기존 프로젝트에 실제로 등록되어
있었는지는 기존 프로젝트 SQL Editor 탭이 응답 없음 상태가 되어 이번에 재확인하지 못했습니다 —
중요하지 않음: 어느 쪽이든 새 프로젝트에는 지금 없으므로 등록이 필요합니다.)

이 상태로 두면 만료된 이미지 정리(daily cleanup)가 전혀 실행되지 않아 스토리지가 다시
무한정 쌓입니다 — 이번 마이그레이션의 원인이 된 쿼터 초과 문제가 반복될 수 있는 항목이라
우선순위 높음.

## 작업

### 1. pg_cron / pg_net 익스텐션 활성화 + cron 등록

새 마이그레이션 파일을 추가하세요 (예: `supabase/migrations/20260916120000_cron_cleanup_expired_images.sql`):

```sql
-- pg_cron: 스케줄 실행
create extension if not exists pg_cron with schema pg_catalog;
-- pg_net: HTTP 호출 (edge function 트리거용)
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cleanup-expired-images',
  '0 0 * * *',
  $cron$
  select net.http_post(
    url := 'https://qnstsrplqzoqlndojuyw.supabase.co/functions/v1/cleanup-expired-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
```

`current_setting('app.settings.anon_key', true)`가 설정되어 있지 않을 가능성이 높습니다
(새 프로젝트라 커스텀 설정 없음). 그 경우 대신 **`.env.local`의
`NEXT_PUBLIC_SUPABASE_ANON_KEY` 값을 직접 헤더에 박아 넣는 표준 Supabase 패턴**을 쓰세요
(이 키는 publishable/anon 키라 클라이언트 코드에도 이미 노출되는 값이라 SQL에 직접 써도
비밀 유출이 아닙니다 — `SUPABASE_SECRET_KEY`는 여기 쓰면 안 됩니다):

```sql
select cron.schedule(
  'cleanup-expired-images',
  '0 0 * * *',
  $cron$
  select net.http_post(
    url := 'https://qnstsrplqzoqlndojuyw.supabase.co/functions/v1/cleanup-expired-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <.env.local의 NEXT_PUBLIC_SUPABASE_ANON_KEY 값>'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
```

`.env.local`에서 값을 읽어서 채워 넣으세요 (값을 보고서에는 출력하지 마세요 — anon 키
자체는 비밀은 아니지만 습관적으로 시크릿류는 로그에 남기지 않는 원칙 유지).

`npx supabase db push`로 적용.

### 2. 등록 확인

SQL Editor 또는 마이그레이션 적용 후 다음 쿼리로 확인 (결과를 보고서에 포함):

```sql
select jobid, schedule, jobname, active from cron.job;
```

`cleanup-expired-images` 1행, `schedule = '0 0 * * *'`, `active = true`가 나와야 합니다.

### 3. (선택, 안전하면) 1회 수동 트리거로 동작 확인

`select cron.schedule_in_database(...)`는 사용하지 말고, 대신 직접 edge function을
curl로 1회 호출해서 200이 오는지만 확인하세요 (cron 자체를 기다릴 필요 없음):

```bash
curl -i -X POST "https://qnstsrplqzoqlndojuyw.supabase.co/functions/v1/cleanup-expired-images" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

응답 코드와 본문 요약만 보고서에 남겨주세요 (실제 정리 로직이 돌아가는지 확인 목적 —
이건 생성 API 호출이 아니라 정리/삭제 로직이라 가드레일에 저촉되지 않습니다. 단, 이 시점에
지울 만료 이미지가 없으면 "0 deleted" 같은 정상 응답이면 충분합니다).

## 검증

1. `cron.job`에 `cleanup-expired-images` 항목 존재, `active = true`, `schedule = '0 0 * * *'`.
2. `npx supabase db push` 성공 (새 마이그레이션 1개 추가 적용).
3. edge function 수동 curl 호출 결과 코드/요약.
4. anon 키 외 다른 시크릿(서비스 롤 키, DB 비밀번호)이 이번 마이그레이션 파일이나 로그에
   노출되지 않았는지 확인.
5. 생성 API 호출 0회 확인.

## 하지 않는 것

- 기존 프로젝트(`sblnthhayvrfkvaksest`)는 계속 손대지 않음.
- `SUPABASE_SECRET_KEY`나 DB 비밀번호를 이 마이그레이션 SQL이나 커밋에 넣지 않음 — anon
  키만 사용.
- 생성 API 호출 전부 금지(0회).

## 완료 보고 형식

3~5줄 요약 + `cron.job` 조회 결과 + `db push` 결과 + curl 테스트 결과.

## 백로그 마스터

이 라운드도 인프라 후속 조치라 백로그 마스터에는 올리지 않습니다.
