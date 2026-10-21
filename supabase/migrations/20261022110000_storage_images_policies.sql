-- 426차 W3·W6 — 스토리지 버킷 `images` 정책 초안 (★ 적용 금지: 사람이 현재 설정을 확인한 뒤 적용 ★)
--
-- 확인할 것(Supabase 대시보드 → Storage → images → Policies / Settings):
--   1) 버킷이 public 인지(현재 코드는 getPublicUrl 사용 → 공개 읽기 전제). 공개 버킷의 개별 파일 URL 읽기는 정책 없이도 가능.
--   2) 기존 정책 이름·내용(아래와 충돌하면 먼저 drop). `storage.objects`에 select 정책이 "전체 허용"이면 목록 조회(list)로 다른 사용자의 파일명이 노출된다.
--   3) 서버 라우트(service role)는 RLS를 우회하므로 이 정책의 영향이 없다. 브라우저 직접 업로드(CreateProductForm·결과 화면 교체)만 영향을 받는다.
--   4) 업로드 경로 규칙: images/{user_id}/... (코드의 업로드 경로가 맞는지 확인 후 적용)
--
-- 효과:
--   - 버킷 단위 제한: 크기 10MB, 허용 MIME(jpeg·png·webp·xlsx·txt·pdf·docx) — SVG·HTML 등 스크립트가 들어갈 수 있는 형식 차단
--   - 목록 조회(select on storage.objects) 금지: 공개 URL로 읽는 것은 그대로 가능, 파일 목록 열람만 막는다
--   - 쓰기·수정·삭제는 본인 폴더(첫 경로 조각 = auth.uid())만
--
-- 롤백:
--   drop policy if exists "images_insert_own_folder" on storage.objects;
--   drop policy if exists "images_update_own_folder" on storage.objects;
--   drop policy if exists "images_delete_own_folder" on storage.objects;
--   update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'images';
--   (기존에 있던 정책/제한은 적용 전에 기록해 두었다가 복구)

update storage.buckets
set file_size_limit = 10485760, -- 10MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- xlsx
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' -- docx
    ]
where id = 'images';

drop policy if exists "images_insert_own_folder" on storage.objects;
create policy "images_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "images_update_own_folder" on storage.objects;
create policy "images_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "images_delete_own_folder" on storage.objects;
create policy "images_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

-- select 정책은 만들지 않는다(목록 조회 금지). 기존에 "bucket_id = 'images'"만 조건인 select 정책이 있다면 그것을 drop 해야 목록 노출이 막힌다 → 사람이 확인.
