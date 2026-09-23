/**
 * 202차 — generate cron migration with anon key from .env.local (no secret logging).
 * Usage: npx tsx scripts/_202cha-write-cron-migration.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const OUT = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260916120000_cron_cleanup_expired_images.sql",
);
const PROJECT_HOST = "qnstsrplqzoqlndojuyw.supabase.co";
const FN_URL = `https://${PROJECT_HOST}/functions/v1/cleanup-expired-images`;

function readAnonKey(): string {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.trim().match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/);
    if (!m) continue;
    let v = m[1]!.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!v) throw new Error("empty NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return v;
  }
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local");
}

function sqlLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

function main() {
  const anon = readAnonKey();
  const auth = `Bearer ${anon}`;
  const sql = `-- 202차: daily cleanup-expired-images via pg_cron + pg_net
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
    url := '${FN_URL}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', '${sqlLiteral(auth)}'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
`;

  fs.writeFileSync(OUT, sql, "utf8");
  // verify file contains anon but do not print it
  const written = fs.readFileSync(OUT, "utf8");
  if (!written.includes(anon)) {
    throw new Error("migration missing anon key embed");
  }
  if (/sb_secret_|SERVICE_ROLE|6uBqo/.test(written)) {
    throw new Error("migration unexpectedly contains secret material");
  }
  console.log("wrote", path.relative(ROOT, OUT));
  console.log("anon embedded: len=", anon.length, "prefix=", anon.slice(0, 14) + "...");
  console.log("function url:", FN_URL);
}

main();
