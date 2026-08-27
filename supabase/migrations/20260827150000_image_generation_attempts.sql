-- STEP 4: generation attempts — retry별 비용 추적

create table if not exists public.image_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.image_generation_jobs (id) on delete cascade,
  attempt_number int not null,
  provider text not null,
  model text not null,
  status text not null,
  estimated_cost_usd numeric(10, 6) not null default 0,
  actual_cost_usd numeric(10, 6) not null default 0,
  input_megapixels numeric(12, 6),
  output_megapixels numeric(12, 6),
  resolution text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (generation_id, attempt_number)
);

create index if not exists image_generation_attempts_generation_idx
  on public.image_generation_attempts (generation_id);

create index if not exists image_generation_attempts_created_idx
  on public.image_generation_attempts (created_at);

alter table public.image_generation_attempts enable row level security;

-- users read attempts for own jobs
create policy "Users read own generation attempts"
  on public.image_generation_attempts for select
  using (
    exists (
      select 1 from public.image_generation_jobs j
      where j.id = generation_id and j.user_id = auth.uid()
    )
  );

-- inserts/updates via service role (worker) or own insert through job owner
create policy "Users insert attempts for own jobs"
  on public.image_generation_attempts for insert
  with check (
    exists (
      select 1 from public.image_generation_jobs j
      where j.id = generation_id and j.user_id = auth.uid()
    )
  );

comment on table public.image_generation_attempts is
  'Per-attempt image generation cost audit. Sum actual_cost_usd for total job cost including retries.';

-- page-level cost budget on jobs (optional override)
alter table public.image_generation_jobs
  add column if not exists max_generation_cost_usd numeric(10, 6);

comment on column public.image_generation_jobs.max_generation_cost_usd is
  'Page/job cost budget USD. Null → DEFAULT_MAX_GENERATION_COST_USD (0.50).';
