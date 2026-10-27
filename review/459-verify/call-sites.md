# 이미지 저장소 호출 지점 전수 (459차)

`rg "supabase\.storage|\.storage\.from|getPublicUrl|\.upload\("` 결과 전부. 기본(`STORAGE_PROVIDER` 미설정 = supabase)에서는 **같은 호출·같은 주소·같은 오류 문구**(provider가 `upload(path, body, { contentType, upsert })`만 넘기고 cacheControl 힌트는 R2 전용이라 무시). 오류 객체는 `{ error: { message } }`로 맞춰 기존 `uploadError.message` 사용부가 그대로 동작한다.

## 서버 측 (getStorage(supabase) 경유)
| 호출 지점 | 전 | 후 | upsert | 경로 성격 | cacheControl(r2) |
|---|---|---|---|---|---|
| `app/api/enhance-image/route.ts` | `storage.from("images").upload(enhancedPath, buf, {image/png, upsert:true})` + getPublicUrl | `getStorage(supabase).putObject` + `getPublicUrl` | true | 원본 경로에서 파생(`…-enhanced.png`) → **덮어씀** | 짧게(1시간) |
| `app/api/generate-social/route.ts` | 동일 | 동일 | true | 원본 경로 파생(`…-social-enhanced.png`) → **덮어씀** | 짧게 |
| `app/api/scene-images/route.ts` | 동일 | 동일 | true | `…/scene-images/<stamp>-<slot>.png` 요청마다 고유(upsert는 재시도용) | 1년 immutable |
| `app/api/info-backdrops/route.ts` | 동일 | 동일 | true | `…/section-backdrops/<stamp>-info-<zone>.png` 고유 | 1년 immutable |
| `app/api/generate-backdrop/route.ts` | 동일 | 동일 | true | `…/backdrop-candidates/<stamp>-<i>.png` 고유 | 1년 immutable |
| `app/api/section-backdrops/route.ts` | 동일 | 동일 | true | `…/section-backdrops/<stamp>-<kind>.png` 고유 | 1년 immutable |
| `app/api/generate/route.ts` (아이콘) | 동일(버킷 상수 `ICON_STORAGE_BUCKET="images"`) | 동일 | true | `…/icons/<Date.now>-<suffix>.png` 고유(재시도는 같은 경로) | 1년 immutable |
| `lib/upload-png.ts` `uploadPngBuffer` | 동일, 반환 `{ publicUrl, path }`·오류 `{ error }` 유지 | 동일 | true | 호출부가 정함 → **덮어쓸 수 있다고 보고 짧게** | 짧게 |
| └ 사용처: `app/api/canvas-ai-image`, `generate-lifestyle-shots`, `lifestyle-composite`, `generate/route.ts`, `lib/image-router/jobs/generation-worker.ts` | `uploadPngBuffer(supabase, …)` | **코드 변경 없음**(시그니처 유지, 내부만 provider) | | | |

서버에는 `remove`·`list` 호출이 없다(정리는 DB cron·스크립트 쪽 — `url-assumptions.md`).

## 브라우저 직접 업로드 (lib/storage/client-upload.ts 경유)
| 호출 지점 | 전 | 후 | upsert |
|---|---|---|---|
| `components/CreateProductForm.tsx` 상품 사진(1) | `supabase.storage.from("images").upload(path, file, {file.type, upsert:false})` + getPublicUrl, DB 실패 시 `remove([path])` | `uploadImage(supabase, file, {path, contentType, upsert:false})`, 롤백 `removeUploaded` | false |
| `components/CreateProductForm.tsx` 보조 파일(2: 참조·로고·후기·기획서) | 동일(`file.type || undefined`) | 동일 | false |
| `app/create/result/page.tsx` GIF | `upload(path, file, {image/gif, upsert:false})` | `uploadImage` | false |
| `app/create/result/page.tsx` 사진 교체 | `upload(path, cleaned, {cleaned.type, upsert:false})` | `uploadImage` | false |
| `app/create/social/page.tsx` | `upload(path, file, {file.type, upsert:false})`, 실패 롤백 `remove([path])` | `uploadImage` / `removeUploaded` | false |

브라우저 경로는 공개 주소 변수(`NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`)가 **없으면 예전과 같은 Supabase 호출**, 있으면 `/api/storage/upload-url` 서명 PUT.
