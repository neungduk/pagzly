-- 109차: 판매자 브랜드 로고 URL (히어로 표시용).
-- 123차: linked 원격에 db push로 적용 완료.
alter table public.products
  add column if not exists logo_url text;
