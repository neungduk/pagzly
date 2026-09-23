-- 202차: daily cleanup-expired-images via pg_cron + pg_net
-- anon/publishable key only (never secret/service role)

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- idempotent: drop existing job with same name if present
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'cleanup-expired-images';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
exception
  when undefined_table then
    null; -- cron.job not ready yet before extension; ignore
end $$;

select cron.schedule(
  'cleanup-expired-images',
  '0 0 * * *',
  $cron$
  select net.http_post(
    url := 'https://qnstsrplqzoqlndojuyw.supabase.co/functions/v1/cleanup-expired-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_ovcKRx24k0GaVYhx068L8A_nJKXVuEf'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
