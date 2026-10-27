-- 460차 01-backup — 교체 전 백업. 대상 행의 id와 교체 대상 컬럼만 복사한다(새 테이블 *_bak_r2 만 만든다. 기존 테이블은 건드리지 않는다).
-- 선행 조건: (1) scripts/migrate-storage-to-r2.ts --verify 가 이상 0으로 끝났다  (2) R2 공개 주소(img)가 브라우저에서 열린다  (3) 이 파일은 Supabase 대시보드 SQL Editor에서 사용자가 직접 실행한다(자동 실행·마이그레이션 아님).
-- 치환 두 곳(편집기에서 "모두 바꾸기"): __OLD_PREFIX__ → https://<프로젝트>.supabase.co/storage/v1/object/public/images/   __NEW_PREFIX__ → https://img.pagzly.com/   (둘 다 끝 슬래시 포함, 코드에 호스트를 박지 않는다)
-- 이미 *_bak_r2 가 있으면 create 가 실패한다 = 이전 백업을 덮어쓰지 않는다(의도). 다시 하려면 99-rollback 이후 백업 테이블 정리 방법을 README에서 확인.

create table public.product_images_bak_r2 as
  select id, image_url from public.product_images where image_url like '%__OLD_PREFIX__%';

create table public.products_bak_r2 as
  select id, image_urls, logo_url, sections, photo_cost_breakdown from public.products
  where logo_url like '%__OLD_PREFIX__%' or array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%'
     or sections::text like '%__OLD_PREFIX__%' or photo_cost_breakdown::text like '%__OLD_PREFIX__%';

create table public.image_generation_jobs_bak_r2 as
  select id, input_images, output_images, output_urls, input_metadata from public.image_generation_jobs
  where input_images::text like '%__OLD_PREFIX__%' or output_images::text like '%__OLD_PREFIX__%'
     or output_urls::text like '%__OLD_PREFIX__%' or input_metadata::text like '%__OLD_PREFIX__%';

-- 백업 행 수(03 이 바꿀 행 수와 같아야 한다)
select 'product_images' as t, count(*) from public.product_images_bak_r2
union all select 'products', count(*) from public.products_bak_r2
union all select 'image_generation_jobs', count(*) from public.image_generation_jobs_bak_r2;
