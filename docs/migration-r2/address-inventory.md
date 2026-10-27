# DB·저장 데이터의 이미지 주소 전수 조사 (460차, 읽기 전용)

스키마(`supabase/migrations/*`)와 코드(`rg "image_url|image_urls|imageUrls|storage_path|logo_url|publicUrl|output_images"`)를 읽어 정리했다. 마이그레이션 파일에 없는 컬럼(앱이 쓰는데 이 저장소의 SQL에는 없는 것)이 있을 수 있어 `02-preview.sql`에 **모든 text·jsonb·배열 컬럼을 훑는 발견 쿼리**를 넣었다(실제 DB에서 이 표에 없는 컬럼이 나오면 `03-apply.sql`에 추가해야 한다 — 미검증).

옛 주소 형식: `https://<프로젝트>.supabase.co/storage/v1/object/public/images/<경로>`. 새 주소: `https://img.pagzly.com/<경로>`(경로는 그대로). **저장소에는 프로젝트가 둘 보인다**(현재 `qnstsrplqzoqlndojuyw`, 옛 QA 스크립트에 `sblnthhayvrfkvaksest`) — 옛 호스트로 저장된 행이 있으면 발견 쿼리가 호스트별로 센다.

## DB(서버에서 이전 대상)
| 테이블 | 컬럼 | 형식 | 이 컬럼을 쓰는 코드 | 교체 방법 |
|---|---|---|---|---|
| `public.product_images` | `image_url` | 단일 URL(text) | `enhance-image`·`generate-social`·`CreateProductForm`·`social/page`가 업로드 시 insert, 정리 엣지 함수·`protect-product-images`가 읽음 | `replace(image_url, 옛접두, 새접두)` |
| `public.product_images` | `storage_path` | 경로(주소 아님) | 같은 곳 | **교체 불필요**(경로는 R2에서도 같다) |
| `public.products` | `image_urls` | `text[]`(상품 이미지 주소 배열) | `app/api/generate/route.ts` 저장·`products/[id]` 갱신·history·result 읽기 | `array(select replace(u, …) from unnest(image_urls) u)` — 순서 유지(`with ordinality`) |
| `public.products` | `logo_url` | 단일 URL(text, null 가능) | `generate` 저장, result 읽기 | replace |
| `public.products` | `sections` | **jsonb**(섹션 배열; 안에 이미지 주소 문자열이 키 이름 상관없이 들어간다: `imageUrl`·`illustrationUrl`·`gifUrl`·배경·비교·임팩트 사진 등) | `generate`·`products/[id]`·렌더러 | `replace(sections::text, 옛접두, 새접두)::jsonb` (`/`는 jsonb 텍스트에서 이스케이프되지 않아 접두 문자열이 그대로 일치) |
| `public.products` | `photo_cost_breakdown` | jsonb(비용·표시 상태 `display` 안에 장면 이미지·배경 주소가 들어갈 수 있음 — 미검증) | `generate`·`products/[id]` | 같은 text 치환(발견 쿼리가 0이면 건너뜀) |
| `public.products` | `image_roles`·`image_origins`·`theme`·`replacements` | jsonb(역할·출처·색 — 주소 없음이 기대값) | — | 발견 쿼리로 0 확인만 |
| `public.image_generation_jobs` | `input_images`(`[{url,path?}]`)·`output_images`(`[{url,width,height,storagePath?}]`)·`output_urls`(url 배열) | jsonb | `lib/image-router/jobs/*` | 같은 text 치환. 생성 작업 기록이라 필수는 아니나 화면에서 읽으면 옛 주소로 egress가 난다 |
| `public.image_generation_attempts` | (비용 기록 — URL 컬럼 없음) | — | — | 대상 아님 |

## DB가 아닌 곳
| 위치 | 내용 | 영향·처리 |
|---|---|---|
| 브라우저 `sessionStorage`: `pagzly-create-result`·`pagzly-create-draft`·`pagzly-retry-photo-only`·`pagzly-dev-preview-session` | 생성 직후 세션(이미지 주소 포함) | 탭을 닫으면 사라진다. 이전 직후 열려 있던 탭은 옛 주소로 계속 보여 egress가 조금 더 난다(옛 객체를 지우지 않으므로 깨지지는 않음). DB 폴백이 있어(`create/draft/page.tsx`) 새 로드에서는 새 주소 |
| 사용자가 내려받은 **export HTML·PNG** | 주소가 HTML에 박힌 파일 | 이전 대상 아님. HTML이 옛 Supabase 주소를 참조하면 그 파일을 쓰는 동안 egress가 난다 → **옛 객체를 최소 90일 유지** 권고(README) |
| Supabase Storage 객체 자체 | 경로 `<userId>/…` | 이전 스크립트가 복사(`scripts/migrate-storage-to-r2.ts`) |
| `supabase/functions/cleanup-expired-images`·cron | `product_images.storage_path` 기준 삭제 | `app/api/cron/cleanup-expired-images`가 R2를 지움(460차 §4) |

## 예상 건수 쿼리
`docs/migration-r2/02-preview.sql`의 ① 컬럼별 건수 ② 호스트별 건수 ③ 전체 컬럼 발견 쿼리를 실행하면 된다(읽기 전용).
