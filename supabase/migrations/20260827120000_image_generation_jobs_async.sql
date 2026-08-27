-- STEP 3: image_generation_jobs 비동기 generation job 확장 (신규 테이블 없음)

alter table public.image_generation_jobs
  add column if not exists prompt text,
  add column if not exists input_images jsonb,
  add column if not exists output_images jsonb,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists progress int not null default 0;

-- legacy lowercase status → API uppercase
update public.image_generation_jobs set status = 'QUEUED' where lower(status) = 'queued';
update public.image_generation_jobs set status = 'PROCESSING' where lower(status) in ('running', 'processing');
update public.image_generation_jobs set status = 'COMPLETED' where lower(status) in ('succeeded', 'completed');
update public.image_generation_jobs set status = 'FAILED' where lower(status) = 'failed';
update public.image_generation_jobs set status = 'BUDGET_EXCEEDED' where lower(status) = 'budget_exceeded';

alter table public.image_generation_jobs alter column status set default 'QUEUED';

comment on column public.image_generation_jobs.product_id is 'pageId — products.id FK';
comment on column public.image_generation_jobs.prompt is '이미지 생성 프롬프트';
comment on column public.image_generation_jobs.input_images is '[{url, path?}]';
comment on column public.image_generation_jobs.output_images is '[{url, width, height, storagePath?}]';
comment on column public.image_generation_jobs.progress is '0–100 job 진행률';
