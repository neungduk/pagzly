-- 508 — OCR 월 사용량 카운터. 2026-11-10 Supabase에 적용 완료(anon/authenticated 실행 권한 회수 포함).
-- RLS 켜고 정책 없음 → service role만 접근.

create table if not exists public.label_ocr_usage (
  period text primary key,
  units int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.label_ocr_usage is
  '표시사항 OCR 월 단위 조각 수. period = YYYY-MM:google|YYYY-MM:clova. 원본 이미지·텍스트 저장 금지.';

alter table public.label_ocr_usage enable row level security;

create or replace function public.label_ocr_consume(
  p_period text,
  p_units int,
  p_limit int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_units int;
begin
  if p_units is null or p_units < 1 then
    return true;
  end if;
  if p_limit is null or p_limit < 1 then
    return false;
  end if;

  insert into public.label_ocr_usage as t (period, units, updated_at)
  values (p_period, 0, now())
  on conflict (period) do nothing;

  update public.label_ocr_usage as t
  set
    units = t.units + p_units,
    updated_at = now()
  where t.period = p_period
    and t.units + p_units <= p_limit
  returning t.units into new_units;

  if new_units is null then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.label_ocr_consume(text, int, int) from public, anon, authenticated;
grant execute on function public.label_ocr_consume(text, int, int) to service_role;
