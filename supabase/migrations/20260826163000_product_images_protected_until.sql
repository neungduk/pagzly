-- 30차: 생성 파이프라인 중 orphan 원본이 cleanup에 지워지지 않도록
-- 업로드 직후 N시간 보호 윈도우(protected_until)를 둔다.
-- product_id가 연결된 행은 기존처럼 영구 보존.

alter table public.product_images
  add column if not exists protected_until timestamptz;

comment on column public.product_images.protected_until is
  'Orphan(product_id IS NULL)이라도 이 시각 이전에는 cleanup-expired-images 대상에서 제외. 업로드/생성 시작 시 now()+24h로 설정.';

create index if not exists product_images_protected_until_idx
  on public.product_images (protected_until);

-- 이미 올라간 orphan 행도 당장 한 번 보호 (배포 직후 진행 중 세션 구제)
update public.product_images
set protected_until = now() + interval '24 hours'
where product_id is null
  and (protected_until is null or protected_until < now());
