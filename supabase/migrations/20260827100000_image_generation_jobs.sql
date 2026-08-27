-- Image Router: 생성 job + status + cost 추적

create table if not exists public.image_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  draft_token text,
  task_type text not null,
  provider text not null,
  model text not null,
  idempotency_key text,
  input_image_count int not null default 0,
  output_image_count int not null default 0,
  estimated_cost numeric(10, 6) not null default 0,
  actual_cost numeric(10, 6),
  generation_time_ms int,
  status text not null default 'queued',
  error_message text,
  input_metadata jsonb,
  output_urls jsonb,
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists image_generation_jobs_user_created_idx
  on public.image_generation_jobs (user_id, created_at desc);

create index if not exists image_generation_jobs_product_idx
  on public.image_generation_jobs (product_id)
  where product_id is not null;

create index if not exists image_generation_jobs_draft_token_idx
  on public.image_generation_jobs (draft_token)
  where draft_token is not null;

create unique index if not exists image_generation_jobs_idempotency_idx
  on public.image_generation_jobs (user_id, idempotency_key)
  where idempotency_key is not null;

alter table public.image_generation_jobs enable row level security;

create policy "Users read own image generation jobs"
  on public.image_generation_jobs for select
  using (auth.uid() = user_id);

create policy "Users insert own image generation jobs"
  on public.image_generation_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users update own image generation jobs"
  on public.image_generation_jobs for update
  using (auth.uid() = user_id);

comment on table public.image_generation_jobs is
  'Pagzly Image Router — per-call generation job, status, and cost audit trail.';
