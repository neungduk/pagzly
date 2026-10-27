-- 460차 99-rollback — 03 을 COMMIT 한 뒤 되돌려야 할 때만. 백업 테이블(*_bak_r2)의 값으로 같은 컬럼을 복원한다.
-- 선행 조건: 01-backup.sql 로 만든 *_bak_r2 테이블이 남아 있다. 이 파일은 사용자가 직접, 한 트랜잭션으로 실행한다. (치환 토큰 없음)
-- 되돌린 뒤: 프로덕션 STORAGE_PROVIDER 를 supabase 로 두거나 되돌리면 옛 주소가 다시 쓰인다(옛 Supabase 객체는 이전 뒤에도 지우지 않는다).

begin;
update public.product_images p set image_url = b.image_url from public.product_images_bak_r2 b where p.id = b.id;
update public.products p set image_urls = b.image_urls, logo_url = b.logo_url, sections = b.sections, photo_cost_breakdown = b.photo_cost_breakdown from public.products_bak_r2 b where p.id = b.id;
update public.image_generation_jobs p set input_images = b.input_images, output_images = b.output_images, output_urls = b.output_urls, input_metadata = b.input_metadata from public.image_generation_jobs_bak_r2 b where p.id = b.id;
-- 복원 행 수가 01 의 백업 행 수와 같은지 확인 후 COMMIT; (아니면 ROLLBACK;)
-- 백업 테이블은 안정이 확인될 때까지 두고, 정리는 사용자가 판단해 직접 한다(이 폴더의 파일은 DROP 을 쓰지 않는다).
