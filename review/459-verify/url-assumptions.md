# Supabase 주소 형태를 가정하는 코드 (459차)

`rg "storage/v1|/object/public|supabase\.co|NEXT_PUBLIC_SUPABASE_URL"` 결과를 앱 코드(`app`·`lib`·`components`)와 스크립트로 나눠 정리. 기본(`STORAGE_PROVIDER` 미설정)에서는 아무것도 바뀌지 않는다.

## 앱 코드
| 위치 | 가정 | R2 모드 처리 |
|---|---|---|
| `next.config.ts` `images.remotePatterns` | `qnstsrplqzoqlndojuyw.supabase.co/storage/v1/object/public/**` | **유지** + `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`이 있으면 R2 호스트(경로 접두 포함) 추가(`storageRemotePattern`). 이전 전 기존 이미지가 계속 보인다 |
| `lib/proxy-image-policy.ts` 허용 호스트 | 자기 Supabase 호스트 + `*.replicate.delivery` | **유지** + R2 공개 호스트(포트 포함) 추가. 기존 허용·거절 케이스 불변 |
| `app/api/scene-images/route.ts` `isOwnStorageUrl` | 참조 사진 주소가 자기 Supabase 호스트·`/storage/` 경로 | **유지** + `isStoragePublicUrl`(R2 공개 주소 아래)도 허용. 설정 없으면 false라 기존 동작 |
| `lib/fetch-file-buffer.ts` `allowlistedHostOnly` | `isAllowedProxyUrl` 경유 | 위 proxy 정책을 따르므로 R2 호스트가 자동 허용 |
| `lib/image-router/jobs/job-store-config.ts` | `IMAGE_JOB_STORE=supabase`일 때 `NEXT_PUBLIC_SUPABASE_URL` 필요 | **무관**(작업 큐는 DB, 이미지 저장소와 별개) |
| `lib/supabase.ts`·`lib/supabase/*` | DB·로그인 클라이언트 | **무관**(그대로 Supabase) |
| DB 저장 값 `product_images.image_url`·세션의 이미지 주소 | 공개 URL 문자열을 그대로 저장 | 신규 업로드는 R2 주소가 저장된다. **기존 행의 Supabase 주소는 460차에서 교체**(그 전까지 Supabase 주소가 동작). 코드가 주소에서 경로를 뽑아 쓰는 곳은 찾지 못했다(경로는 `storage_path` 컬럼·응답의 `path`로 따로 전달) |
| `supabase/functions/cleanup-expired-images/index.ts` (Deno 엣지 함수) | `product_images` 행 기준으로 `supabase.storage.from("images").remove(paths)` 후 행 삭제 | **R2에서는 객체가 지워지지 않는다**(Supabase 버킷에 없음)·행만 지워져 R2 객체가 고아가 된다. 아래 「만료 정리」 참고 |
| `supabase/migrations/20260916120000_cron_cleanup_expired_images.sql` | 위 함수를 매일 호출 | 마이그레이션은 수정하지 않았다 |

## 스크립트(앱 동작과 무관)
`scripts/*cha-*qa.ts`·`verify-*`·`capture-*`의 Supabase 주소 상수는 과거 QA용 고정 값이라 손대지 않았다. `scripts/200cha-storage-cleanup-dryrun.ts`는 Supabase 버킷 목록 전용(R2 목록 아님). `scripts/test-generation-persistence-step35.ts`는 `/storage/v1/object/public/images/` 주소를 단언한다(Supabase 모드 전용 테스트).

## 만료 정리(cleanup-expired-images)
- 정리 대상은 `product_id`가 null이고 3일 지난·보호 기간 끝난 이미지뿐이다. **완성된 상품의 이미지는 영구 보존**이라 R2 버킷에 「나이 N일 후 삭제」 수명 주기 규칙을 거는 것은 **위험하다**(영구 이미지까지 지워진다). 이 규칙을 전체 버킷에 걸지 말 것.
- 안전한 대안: ① 460차에서 엣지 함수가 R2에 S3 API로 같은 삭제를 하게 하거나 앱 서버 라우트(`getStorage().removeObjects`)를 호출 ② 그때까지는 고아 객체를 둔다(R2 저장 비용만 발생, 임시 이미지 양은 사용자 2명 규모에서 작다 — 실제 용량은 R2 대시보드에서 확인).
- 이 차수는 엣지 함수·마이그레이션을 수정하지 않았다(지시: 마이그레이션 변경 금지).
