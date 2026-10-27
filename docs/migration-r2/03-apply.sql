-- 460차 03-apply — 옛 주소를 새 주소로 교체하는 UPDATE. 이 파일만 데이터를 바꾼다. **COMMIT 은 수동**(아래 안내).
-- 선행 조건: (1) scripts/migrate-storage-to-r2.ts --verify 가 이상 0으로 끝났다  (2) R2 공개 주소(img)가 브라우저에서 열린다  (3) 이 파일은 Supabase 대시보드 SQL Editor에서 사용자가 직접 실행한다(자동 실행·마이그레이션 아님).
-- 치환 두 곳(편집기에서 "모두 바꾸기"): __OLD_PREFIX__ → https://<프로젝트>.supabase.co/storage/v1/object/public/images/   __NEW_PREFIX__ → https://img.pagzly.com/   (둘 다 끝 슬래시 포함, 코드에 호스트를 박지 않는다)
-- 추가 선행: 01-backup.sql 을 실행했고, 02-preview.sql 의 건수·전/후 예시를 눈으로 확인했다.
-- 사용: 트랜잭션이 열린 채 끝난다. 결과 행 수가 02 의 건수와 같으면 마지막 줄의 COMMIT; 을 직접 실행, 이상하면 ROLLBACK; 을 실행한다.
-- (Supabase SQL Editor 가 문장마다 자동 커밋하지 않도록 이 파일 전체를 한 번에 실행하고, 마지막 COMMIT/ROLLBACK 만 따로 실행한다. 자동 커밋 환경이면 psql 로 실행하길 권한다.)

begin;

-- 단일 주소 컬럼
update public.product_images set image_url = replace(image_url, '__OLD_PREFIX__', '__NEW_PREFIX__') where image_url like '%__OLD_PREFIX__%';
update public.products set logo_url = replace(logo_url, '__OLD_PREFIX__', '__NEW_PREFIX__') where logo_url like '%__OLD_PREFIX__%';

-- text[] — 순서를 유지해 원소별로 교체
update public.products
set image_urls = array(select replace(u, '__OLD_PREFIX__', '__NEW_PREFIX__') from unnest(image_urls) with ordinality as t(u, i) order by i)
where array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%';

-- jsonb — 텍스트로 바꿔 치환하고 다시 jsonb 로(주소 안의 / 는 jsonb 텍스트에서 이스케이프되지 않아 그대로 일치한다. 구조는 그대로)
update public.products set sections = replace(sections::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where sections::text like '%__OLD_PREFIX__%';
update public.products set photo_cost_breakdown = replace(photo_cost_breakdown::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where photo_cost_breakdown::text like '%__OLD_PREFIX__%';

update public.image_generation_jobs set input_images = replace(input_images::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where input_images::text like '%__OLD_PREFIX__%';
update public.image_generation_jobs set output_images = replace(output_images::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where output_images::text like '%__OLD_PREFIX__%';
update public.image_generation_jobs set output_urls = replace(output_urls::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where output_urls::text like '%__OLD_PREFIX__%';
update public.image_generation_jobs set input_metadata = replace(input_metadata::text, '__OLD_PREFIX__', '__NEW_PREFIX__')::jsonb where input_metadata::text like '%__OLD_PREFIX__%';

-- 처리 결과 확인(트랜잭션 안): 남은 옛 주소 수는 모두 0 이어야 한다
select 'product_images' as t, count(*) as remaining from public.product_images where image_url like '%__OLD_PREFIX__%'
union all select 'products', count(*) from public.products where logo_url like '%__OLD_PREFIX__%' or array_to_string(image_urls, ' ') like '%__OLD_PREFIX__%' or sections::text like '%__OLD_PREFIX__%' or photo_cost_breakdown::text like '%__OLD_PREFIX__%'
union all select 'image_generation_jobs', count(*) from public.image_generation_jobs where input_images::text like '%__OLD_PREFIX__%' or output_images::text like '%__OLD_PREFIX__%' or output_urls::text like '%__OLD_PREFIX__%' or input_metadata::text like '%__OLD_PREFIX__%';

-- 각 UPDATE 의 "처리 행 수"는 SQL Editor 결과창의 "Success. N rows affected" (psql 은 UPDATE N) 로 본다. 01 의 백업 행 수와 비교.

-- ▼ 여기서 멈춘다. 이상 없으면 다음 줄만 따로 실행:   COMMIT;
-- ▼ 이상하면:                                               ROLLBACK;
