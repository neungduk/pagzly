-- =====================================================================
-- 목적
-- =====================================================================
-- 기존 public.products 테이블은 두 가지 서로 다른 용도로 쓰이도록
-- 뒤섞여 있었습니다.
--
--   1) 20260812140000_create_products_table.sql 의 정의
--      (storage_path/image_url/image_uploaded_at) → 원래는
--      "완성되기 전 업로드된 이미지를 3일 뒤 자동 삭제"하기 위한
--      임시 추적용 테이블이었습니다. cleanup-expired-images 엣지
--      함수와 CreateProductForm.tsx 의 이미지 업로드 코드가
--      이 스키마를 전제로 만들어져 있습니다.
--
--   2) 실제 원격 Supabase DB의 products 테이블
--      (category, product_name, brand, price, target, features,
--       image_urls, created_at) → "완성된 상품 정보"를 저장하려던
--      의도로 보이지만, 실제로 이 테이블에 insert하는 코드는
--      존재하지 않았습니다. (/api/generate 는 생성 결과를
--      sessionStorage에만 저장하고 DB에는 저장하지 않았습니다.)
--
-- 이 마이그레이션은 두 역할을 명확히 분리합니다.
--   - public.products       : 완성된 상품 + AI 생성 카피를 영구 저장
--   - public.product_images : 업로드 중인 이미지를 추적, 완성된
--                              상품에 연결되지 않은 이미지만 3일 뒤 삭제
--
-- ⚠️ 주의: 아래는 기존 public.products 테이블을 DROP 합니다.
--   원격 DB의 기존 products 테이블에 실제로 보존해야 할 데이터가
--   있다면 실행 전에 반드시 백업하세요.
--   (현재 코드 흐름상 이 테이블에 정상적으로 insert된 적이 없어
--    보관해야 할 실데이터는 없을 가능성이 높습니다.)
-- =====================================================================

-- 1) 기존 products 테이블 제거 (연결된 정책도 함께 제거됨)
drop table if exists public.products cascade;

-- 2) 완성된 상품 테이블 (입력값 + AI 생성 카피 영구 저장)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 상품 기본 정보 (CreateProductForm.tsx 입력값)
  category text not null,
  product_name text not null,
  brand_name text,
  price numeric(12, 2) not null check (price > 0),
  target_customer text,
  key_features text,
  ingredients text,
  certifications text,
  competitor_url text,
  wholesale_url text,
  image_urls text[] not null default '{}',

  -- AI 생성 결과 (/api/generate 응답)
  headlines text[] not null default '{}',
  description text,
  features text[] not null default '{}',
  how_to_use text,
  caution text,
  image_analysis text,
  mfds_reviewed boolean not null default false,
  replacements jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index products_user_id_idx on public.products (user_id);
create index products_created_at_idx on public.products (created_at desc);

alter table public.products enable row level security;

create policy "Users can insert own products"
  on public.products
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view own products"
  on public.products
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own products"
  on public.products
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.products
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3) 임시 이미지 업로드 추적 테이블
--    (20260812140000_create_products_table.sql 에서 잘못 products로
--     명명되었던 정의를 그대로 이어받되, product_id 컬럼을 추가해
--     완성된 상품에 연결된 이미지는 cleanup 대상에서 제외합니다.)
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  image_uploaded_at timestamptz not null default now(),
  product_id uuid references public.products (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_images_image_uploaded_at_idx
  on public.product_images (image_uploaded_at);

create index if not exists product_images_created_at_idx
  on public.product_images (created_at);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

alter table public.product_images enable row level security;

create policy "Users can insert own product images"
  on public.product_images
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view own product images"
  on public.product_images
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own product images"
  on public.product_images
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own product images"
  on public.product_images
  for delete
  to authenticated
  using (auth.uid() = user_id);
