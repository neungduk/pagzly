-- 516 — 법령 변경 감시 스냅샷·이벤트 (pagepick-3).
-- 적용은 사용자가 한다. RLS ON + 정책 없음(서비스 롤 전용).

create table if not exists public.law_watch_snapshots (
  key text primary key,
  name text not null,
  ident text not null,
  promulgated_at date,
  effective_at date,
  status text,
  revision_kind text,
  meta_hash text not null,
  last_checked_at timestamptz,
  last_changed_at timestamptz
);

comment on table public.law_watch_snapshots is
  '법제처 Open API 목록 메타 스냅샷. 규칙 JSON 자동 수정 금지 — 감지·기록만.';

create table if not exists public.law_watch_events (
  id bigserial primary key,
  key text not null,
  kind text not null check (kind in ('changed', 'upcoming', 'missing')),
  before jsonb,
  after jsonb,
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

comment on table public.law_watch_events is
  '법령 메타 변경 이벤트. kind=changed|upcoming|missing.';

create index if not exists law_watch_events_key_detected_idx
  on public.law_watch_events (key, detected_at desc);

alter table public.law_watch_snapshots enable row level security;
alter table public.law_watch_events enable row level security;

-- 정책 없음: anon/authenticated 접근 불가. service_role만 사용.
