-- 460차 04-verify — SELECT 만. 교체 후 남은 옛 주소가 0 인지, 새 주소가 생겼는지 확인한다.
-- 선행 조건: (1) scripts/migrate-storage-to-r2.ts --verify 가 이상 0으로 끝났다  (2) R2 공개 주소(img)가 브라우저에서 열린다  (3) 이 파일은 Supabase 대시보드 SQL Editor에서 사용자가 직접 실행한다(자동 실행·마이그레이션 아님).
-- 치환 두 곳(편집기에서 "모두 바꾸기"): __OLD_PREFIX__ → https://<프로젝트>.supabase.co/storage/v1/object/public/images/   __NEW_PREFIX__ → https://img.pagzly.com/   (둘 다 끝 슬래시 포함, 코드에 호스트를 박지 않는다)

select 'product_images' as t, count(*) as old_remaining from public.product_images where image_url like '%__OLD_PREFIX__%'
union all select 'products', count(*) from public.products where logo_url like '%__OLD_PREFIX__%' or array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%' or sections::text like '%__OLD_PREFIX__%' or photo_cost_breakdown::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs', count(*) from public.image_generation_jobs where input_images::text like '%__OLD_PREFIX__%' or output_images::text like '%__OLD_PREFIX__%' or output_urls::text like '%__OLD_PREFIX__%' or input_metadata::text like '%__OLD_PREFIX__%';
-- 위 old_remaining 이 전부 0 이어야 한다.

select 'product_images(new)' as t, count(*) from public.product_images where image_url like '__NEW_PREFIX__%'
union all select 'products.sections(new)', count(*) from public.products where sections::text like '%__NEW_PREFIX__%';

-- jsonb 가 여전히 유효한 배열/객체인지(구조 유지)
select count(*) as sections_not_array from public.products where sections is not null and jsonb_typeof(sections) <> 'array';

-- 백업과 비교: 바뀐 행 수(= 01 백업 행 수와 같아야 한다)
select 'product_images' as t, count(*) from public.product_images p join public.product_images_bak_r2 b using (id) where p.image_url is distinct from b.image_url;
