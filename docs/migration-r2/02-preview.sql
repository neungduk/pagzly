-- 460차 02-preview — SELECT 만. 아무것도 바꾸지 않는다.
-- 선행 조건: (1) scripts/migrate-storage-to-r2.ts --verify 가 이상 0으로 끝났다  (2) R2 공개 주소(img)가 브라우저에서 열린다  (3) 이 파일은 Supabase 대시보드 SQL Editor에서 사용자가 직접 실행한다(자동 실행·마이그레이션 아님).
-- 치환 두 곳(편집기에서 "모두 바꾸기"): __OLD_PREFIX__ → https://<프로젝트>.supabase.co/storage/v1/object/public/images/   __NEW_PREFIX__ → https://img.pagzly.com/   (둘 다 끝 슬래시 포함, 코드에 호스트를 박지 않는다)

-- ① 컬럼별 옛 주소 행 수
select 'product_images.image_url' as col, count(*) from public.product_images where image_url like '%__OLD_PREFIX__%'
union all select 'products.image_urls', count(*) from public.products where array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%'
union all select 'products.logo_url', count(*) from public.products where logo_url like '%__OLD_PREFIX__%'
union all select 'products.sections', count(*) from public.products where sections::text like '%__OLD_PREFIX__%'
union all select 'products.photo_cost_breakdown', count(*) from public.products where photo_cost_breakdown::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs.input_images', count(*) from public.image_generation_jobs where input_images::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs.output_images', count(*) from public.image_generation_jobs where output_images::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs.output_urls', count(*) from public.image_generation_jobs where output_urls::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs.input_metadata', count(*) from public.image_generation_jobs where input_metadata::text like '%__OLD_PREFIX__%';

-- ② 전/후 예시 5건
select id, image_url as before, replace(image_url, '__OLD_PREFIX__', '__NEW_PREFIX__') as after
from public.product_images where image_url like '%__OLD_PREFIX__%' limit 5;
select id, logo_url as before, replace(logo_url, '__OLD_PREFIX__', '__NEW_PREFIX__') as after
from public.products where logo_url like '%__OLD_PREFIX__%' limit 5;
select id, image_urls[1] as before, replace(image_urls[1], '__OLD_PREFIX__', '__NEW_PREFIX__') as after
from public.products where array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%' limit 5;

-- ③ 발견 쿼리: 위 표에 없는 컬럼에 Supabase Storage 주소가 들어 있는지(스키마 전체 text/jsonb/text[] 컬럼). 결과가 나오면 03-apply 에 추가해야 한다.
--    아래 문자열은 호스트와 무관하게 "/storage/v1/object/public/" 로 찾는다.
do $$
declare r record; n bigint;
begin
  for r in
    select table_schema, table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type in ('text', 'jsonb', 'json', 'ARRAY', 'character varying')
      and table_name not like '%\_bak\_r2'
  loop
    execute format('select count(*) from %I.%I where %I::text like %L', r.table_schema, r.table_name, r.column_name, '%/storage/v1/object/public/%') into n;
    if n > 0 then raise notice '% .% .% : % rows', r.table_schema, r.table_name, r.column_name, n; end if;
  end loop;
end $$;
-- NOTICE 탭에 (테이블.컬럼: 행 수)가 나온다. 이 문서의 대상 컬럼 외 항목이 있으면 멈추고 알려 주세요.

-- ④ 호스트별 건수(옛 프로젝트 주소가 섞여 있는지)
select substring(image_url from 'https://([^/]+)/') as host, count(*) from public.product_images where image_url like 'http%' group by 1 order by 2 desc;
