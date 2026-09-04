-- 109차: 판매자 브랜드 로고 URL (히어로 표시용). 적용은 수동.
alter table public.products
  add column if not exists logo_url text;
