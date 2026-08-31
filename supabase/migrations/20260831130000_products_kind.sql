-- 47차: products.kind — 상세페이지 vs 인스타·블로그 미니 생성 구분

alter table public.products
  add column if not exists kind text not null default 'detail_page'
  check (kind in ('detail_page', 'social_mini'));

comment on column public.products.kind is
  'detail_page=상세페이지 파이프라인, social_mini=인스타·블로그 미니 파이프라인';
