-- ★ 초안(draft) — 원본 `429-premigration-checks.sql`이 아니다. 원본이 PC에 있으면 그것을 우선하고, 이 초안과 비교해 차이를 확인한다. ★
-- 453차 작성: supabase/migrations의 계획 파일 4개(20261022100000·110000·120000·130000)를 읽고 그 파일이 가정하는 데이터 조건만 점검한다.
-- 읽기 전용: SELECT/WITH만 있다. 테이블·함수·정책·데이터를 만들거나 바꾸거나 지우는 문장이 없다. 읽기 전용 계정으로 실행한다(적용 전).
-- 각 쿼리 위의 「기대」가 어긋나면 해당 마이그레이션을 적용하기 전에 사람이 판단한다.

-- =====================================================================================
-- [20261022100000] usage_guard — 새 테이블 3개·함수 4개·정책 1개
-- =====================================================================================

-- 1-1) 의도: 같은 이름의 테이블이 이미 있으면 `create table if not exists`가 건너뛰어 구조가 다른 채로 남는다.
--      기대: 0행(아직 없음). 행이 있으면 아래 1-2로 컬럼 구성을 비교한다.
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('user_daily_usage', 'global_daily_usage', 'generation_locks');

-- 1-2) 의도: 위 테이블이 이미 있다면 마이그레이션이 가정하는 컬럼이 다 있는지.
--      기대: 테이블이 없으면 0행. 있으면 user_daily_usage(user_id, day, draft_calls, photo_calls, text_calls, est_cost_usd, updated_at),
--            global_daily_usage(day, est_cost_usd, calls, updated_at), generation_locks(user_id, expires_at, acquired_at) 모두 나와야 한다.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('user_daily_usage', 'global_daily_usage', 'generation_locks')
order by table_name, ordinal_position;

-- 1-3) 의도: 같은 이름·인자의 함수가 이미 있으면 `create or replace`가 덮어쓴다(권한·본문이 바뀐다).
--      기대: 0행. 있으면 기존 본문을 따로 보관한 뒤 적용한다.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('usage_reserve', 'usage_release', 'generation_lock_acquire', 'generation_lock_release');

-- 1-4) 의도: 정책 이름 충돌 확인(마이그레이션은 이 이름의 정책을 먼저 drop 한다).
--      기대: 0행. 있으면 기존 정책의 조건이 의도한 것인지 확인한다.
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'user_daily_usage'
  and policyname = 'Users can view own daily usage';

-- 1-5) 의도: user_id가 참조하는 auth.users가 접근 가능한지(외래키 대상).
--      기대: 1행(true).
select to_regclass('auth.users') is not null as auth_users_exists;

-- =====================================================================================
-- [20261022110000] storage_images_policies — 버킷 제한·정책 4개
-- =====================================================================================

-- 2-1) 의도: images 버킷의 현재 설정을 적용 전에 기록한다(롤백 값).
--      기대: 1행. public 여부, file_size_limit, allowed_mime_types를 따로 저장해 둔다.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'images';

-- 2-2) 의도: storage.objects의 기존 정책 전체. 이름이 4개(images_*_own_folder)와 겹치거나, 조건이 `bucket_id = 'images'`뿐인
--      전체 허용 select 정책이 있으면 목록 조회가 열려 있다.
--      기대: 이름 충돌 없음. 전체 허용 select가 있으면 마이그레이션 주석대로 그 정책을 사람이 판단해 drop 한다.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 2-3) 의도: 정책 이름 충돌만 따로(2-2의 부분 집합).
--      기대: 0행.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname in ('images_insert_own_folder', 'images_update_own_folder', 'images_delete_own_folder', 'images_select_own_folder');

-- 2-4) 의도: 새 정책은 첫 경로 조각 = 사용자 id만 허용한다. 지금 images 버킷에 그 규칙을 따르지 않는 경로가 몇 개 있는지.
--      기대: 0행이 이상적. 행이 있으면(공용 폴더·옛 경로) 적용 후 브라우저 직접 업로드/삭제가 그 경로에서 막힌다.
select (storage.foldername(name))[1] as first_folder, count(*) as objects
from storage.objects
where bucket_id = 'images'
  and (storage.foldername(name))[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
group by 1
order by objects desc
limit 50;

-- 2-5) 의도: 버킷에 10MB(10485760B) 제한이 걸리면 그보다 큰 기존 파일이 이미 있는지.
--      기대: 0행(기존 파일은 지워지지 않지만 재업로드·교체가 막힌다).
select name, (metadata ->> 'size')::bigint as size_bytes
from storage.objects
where bucket_id = 'images'
  and (metadata ->> 'size') ~ '^[0-9]+$'
  and (metadata ->> 'size')::bigint > 10485760
order by size_bytes desc
limit 50;

-- 2-6) 의도: 허용 MIME 목록 밖의 기존 파일 형식 분포.
--      기대: 목록(jpeg·png·webp·gif·xlsx·txt·svg·xls·pdf·docx) 밖의 형식이 없다. 있으면 그 형식을 쓰는 기능이 깨질 수 있다.
select coalesce(metadata ->> 'mimetype', '(없음)') as mimetype, count(*) as objects
from storage.objects
where bucket_id = 'images'
  and coalesce(metadata ->> 'mimetype', '') not in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'image/svg+xml',
    'application/vnd.ms-excel', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
group by 1
order by objects desc;

-- =====================================================================================
-- [20261022120000] credit_ledger_completion_unique — 부분 유니크 인덱스
-- =====================================================================================

-- 3-1) 의도: 인덱스를 만들기 전 중복 확인(마이그레이션 주석의 점검 쿼리와 같다). 중복이 있으면 인덱스 생성이 실패한다.
--      기대: 0행. 행이 있으면 어느 행이 정당한지 사람이 판단한다(이 SQL은 데이터를 지우지 않는다).
select reference_id, count(*) as completion_rows
from public.credit_ledger
where reason = 'completion' and reference_id is not null
group by reference_id
having count(*) > 1
order by completion_rows desc
limit 100;

-- 3-2) 의도: 중복 행의 상세(어떤 사용자·시각·수량인지) — 3-1에 행이 있을 때만 의미가 있다.
--      기대: 0행.
with dup as (
  select reference_id
  from public.credit_ledger
  where reason = 'completion' and reference_id is not null
  group by reference_id
  having count(*) > 1
)
select l.*
from public.credit_ledger l
join dup d on d.reference_id = l.reference_id
where l.reason = 'completion'
order by l.reference_id, l.created_at
limit 200;

-- 3-3) 의도: 같은 이름의 인덱스가 이미 있는지(`create unique index if not exists`는 이름만 보고 건너뛴다).
--      기대: 0행. 있으면 정의(indexdef)가 마이그레이션과 같은지 확인한다.
select schemaname, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'credit_ledger' and indexname = 'credit_ledger_completion_ref_uniq';

-- 3-4) 의도: 인덱스가 가정하는 컬럼(reference_id, reason) 존재와 타입.
--      기대: 2행.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'credit_ledger' and column_name in ('reference_id', 'reason');

-- 3-5) 의도: 마이그레이션 주석이 확인하라고 한 deduct_credits가 있고 원장 insert와 잔액 차감을 한 함수(한 트랜잭션)에서 하는지 본문을 읽는다.
--      기대: 1행 이상. 본문에서 두 동작이 같은 함수 안에 있는지 사람이 확인한다.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'deduct_credits';

-- =====================================================================================
-- [20261022130000] signup_free_one_generation — handle_new_user_credits 교체
-- =====================================================================================

-- 4-1) 의도: 교체될 함수와 호출하는 grant_credits가 이미 있는지, 현재 본문(지급 수치)이 무엇인지 기록한다(롤백 값).
--      기대: 2행(handle_new_user_credits, grant_credits). 본문의 지급 수치가 500이면 마이그레이션으로 100이 된다.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('handle_new_user_credits', 'grant_credits');

-- 4-2) 의도: 신규 가입 트리거가 실제로 이 함수를 부르는지(auth.users의 트리거).
--      기대: 1행 이상(handle_new_user_credits를 부르는 트리거). 없으면 함수를 바꿔도 지급 경로가 달라지지 않는다.
select t.tgname, pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
  and pg_get_triggerdef(t.oid) ilike '%handle_new_user_credits%';

-- 4-3) 의도: 이미 100으로 바뀐 상태인지(중복 적용 방지). 본문에 grant_credits(new.id, 100 ...)가 있으면 이미 적용된 것이다.
--      기대: false(아직 500 또는 다른 값).
select exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'handle_new_user_credits'
    and pg_get_functiondef(p.oid) ~ 'grant_credits\(\s*new\.id\s*,\s*100\s*,'
) as already_100;
