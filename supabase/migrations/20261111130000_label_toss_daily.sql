-- 520 — 토스 미니앱 OCR 일일 합계. 검수자가 Supabase에 적용.
-- RLS 켜고 정책 없음 → service_role만. 원문·이미지 저장 금지.

create table if not exists public.label_toss_daily (
  day date primary key,
  ocr_count integer not null default 0
);

comment on table public.label_toss_daily is
  '토스 Origin OCR 일일 조각 합계. day = UTC 날짜. 원문·이미지 저장 금지.';

alter table public.label_toss_daily enable row level security;

create or replace function public.label_toss_consume(
  p_max integer,
  p_add integer default 1
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (timezone('utc', now()))::date;
  new_count integer;
begin
  if p_add is null or p_add < 1 then
    return true;
  end if;
  if p_max is null or p_max < 1 then
    return false;
  end if;

  insert into public.label_toss_daily as t (day, ocr_count)
  values (today, 0)
  on conflict (day) do nothing;

  update public.label_toss_daily as t
  set ocr_count = t.ocr_count + p_add
  where t.day = today
    and t.ocr_count + p_add <= p_max
  returning t.ocr_count into new_count;

  if new_count is null then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.label_toss_consume(integer, integer) from public, anon, authenticated;
grant execute on function public.label_toss_consume(integer, integer) to service_role;
