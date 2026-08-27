-- STEP 3.5: image_generation_jobs 프로덕션 persistence 정리
-- page_id → product_id (products.id FK). 별도 page_id 컬럼은 중복이므로 추가하지 않음.

-- 누락 컬럼 보완 (이전 migration과 idempotent)
alter table public.image_generation_jobs
  add column if not exists prompt text,
  add column if not exists input_images jsonb,
  add column if not exists output_images jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists progress int not null default 0;

-- status 정규화
update public.image_generation_jobs set status = 'QUEUED' where lower(status) = 'queued';
update public.image_generation_jobs set status = 'PROCESSING' where lower(status) in ('running', 'processing');
update public.image_generation_jobs set status = 'COMPLETED' where lower(status) in ('succeeded', 'completed');
update public.image_generation_jobs set status = 'FAILED' where lower(status) = 'failed';
update public.image_generation_jobs set status = 'BUDGET_EXCEEDED' where lower(status) = 'budget_exceeded';

alter table public.image_generation_jobs alter column status set default 'QUEUED';

-- status CHECK (기존 row 정규화 후)
alter table public.image_generation_jobs drop constraint if exists image_generation_jobs_status_check;
alter table public.image_generation_jobs
  add constraint image_generation_jobs_status_check
  check (
    status in (
      'QUEUED',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'BUDGET_EXCEEDED'
    )
  );

-- updated_at 자동 갱신
create or replace function public.set_image_generation_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists image_generation_jobs_set_updated_at on public.image_generation_jobs;
create trigger image_generation_jobs_set_updated_at
  before update on public.image_generation_jobs
  for each row
  execute function public.set_image_generation_jobs_updated_at();

-- worker claim 조회용
create index if not exists image_generation_jobs_status_created_idx
  on public.image_generation_jobs (status, created_at)
  where status in ('QUEUED', 'PROCESSING');

comment on table public.image_generation_jobs is
  'Pagzly async image generation jobs. pageId = product_id (products.id).';
comment on column public.image_generation_jobs.product_id is
  'pageId — 완성 상세 products.id. draft 단계에서는 null + draft_token 사용.';
comment on column public.image_generation_jobs.input_images is
  'JSON array [{url, path?}]';
comment on column public.image_generation_jobs.output_images is
  'JSON array [{url, width, height, storagePath?}] — storage: images/{userId}/generations/{jobId}.png';
