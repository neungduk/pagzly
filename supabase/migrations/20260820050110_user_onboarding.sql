-- 가입 후 온보딩 설문. 본인 row만 읽고 쓸 수 있다.

create table public.user_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_type text not null,
  monthly_volume text not null,
  referral_source text not null,
  store_url text,
  completed_at timestamptz not null default now()
);

comment on table public.user_onboarding is
  '최초 로그인 온보딩 설문. completed_at이 있는 사용자만 /create에 접근한다.';

alter table public.user_onboarding enable row level security;

create policy "Users can view own onboarding"
  on public.user_onboarding
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own onboarding"
  on public.user_onboarding
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding"
  on public.user_onboarding
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
