-- 106차: 이미지 출처 플래그 (ai-lifestyle / composite / enhanced / original …)
alter table public.products
  add column if not exists image_origins jsonb;

comment on column public.products.image_origins is
  'image_urls와 동일 길이의 출처 배열: original|enhanced|ai-lifestyle|composite|fx|compare|other';
