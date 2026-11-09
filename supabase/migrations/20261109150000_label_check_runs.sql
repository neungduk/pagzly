-- 495 — 표시사항 검수 결과 요약 저장(원문 PDF·파일명 저장 금지).
-- 적용은 기획/사용자가 한다. 이 파일만 추가.

create table if not exists public.label_check_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  market text not null check (market in ('KR', 'US')),
  product_name text check (product_name is null or char_length(product_name) <= 80),
  options jsonb not null default '{}'::jsonb,
  summary jsonb not null,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.label_check_runs is
  '표시사항 검수 결과 요약. PDF 원문·파일명·추출 텍스트는 저장하지 않는다.';

comment on column public.label_check_runs.findings is
  '항목 제목·상태·한 줄 설명만. PDF 조각 문자열 금지.';

create index if not exists label_check_runs_user_created_idx
  on public.label_check_runs (user_id, created_at desc);

alter table public.label_check_runs enable row level security;

create policy "label_check_runs_select_own"
  on public.label_check_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "label_check_runs_insert_own"
  on public.label_check_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "label_check_runs_delete_own"
  on public.label_check_runs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- update 정책 없음(요약 불변)
