-- 상품 이미지 업로드 추적 (3일 후 자동 삭제용)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  image_uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists products_image_uploaded_at_idx
  on public.products (image_uploaded_at);

create index if not exists products_created_at_idx
  on public.products (created_at);

alter table public.products enable row level security;

create policy "Users can insert own product images"
  on public.products
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view own product images"
  on public.products
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own product images"
  on public.products
  for delete
  to authenticated
  using (auth.uid() = user_id);
