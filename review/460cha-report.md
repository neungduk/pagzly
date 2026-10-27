# 460차 보고서 — 이미지 이전 스크립트·주소 교체 SQL·R2 만료 정리·업로드 제한 (코딩 전용)

## 1. Push 결과
`cloud-work`와 `claude/task-443-regression-8hculb`에 항목마다 커밋·push했다(1 `a874125` · 2 `1baa1f9` · 3 SQL · 4 정리 · 5 `480dfc6` · 6·7 문서/보고서). main에는 push하지 않았다. **실행·접속한 것 없음**: 이전 스크립트·SQL·cron 미실행, R2·Supabase 접속 0, 키 생성·저장·출력 0. 확인은 `npx tsc --noEmit`(0 오류)와 새 회귀 5개 단독 실행(전부 통과)만 했고, 기존 459차 회귀도 단독으로 통과를 확인했다. 전체 회귀·next build·pc-verify는 지시대로 돌리지 않았다.

## 2. 이미지 주소 전수 조사 (상세: `docs/migration-r2/address-inventory.md`)
| 위치 | 형식 | 교체 |
|---|---|---|
| `product_images.image_url` | URL | replace |
| `product_images.storage_path` | 경로 | 불필요 |
| `products.image_urls` | text[] | unnest 후 replace(순서 유지) |
| `products.logo_url` | URL | replace |
| `products.sections` | jsonb(안에 이미지 주소 문자열) | text 치환 후 ::jsonb |
| `products.photo_cost_breakdown` | jsonb(주소가 있을 수 있음 — 미검증) | 같은 방식 |
| `products.image_roles/image_origins/theme/replacements` | jsonb(주소 없음이 기대값) | 02의 발견 쿼리로 0 확인 |
| `image_generation_jobs.input_images/output_images/output_urls/input_metadata` | jsonb | text 치환 |
| 브라우저 sessionStorage(`pagzly-create-result` 등 4종) | 세션 | 이전 대상 아님(탭 종료 시 소멸) |
| 사용자가 내려받은 export HTML·PNG | 파일 | 대상 아님 → 옛 객체 90일 유지 |
마이그레이션에 없는 컬럼이 있을 수 있어 `02-preview.sql` ③이 모든 text/jsonb/배열 컬럼을 훑어 `/storage/v1/object/public/`을 찾는다(미검증: 실제 DB는 접속하지 않음).
`lib/storage/legacy-url.ts`: `legacyPathOf`(호스트 허용 목록 필수, https만, 다른 프로젝트·버킷·`..`·userinfo 거절, 쿼리/조각/중복 슬래시/퍼센트 인코딩 처리), `r2UrlOf`, `legacyToR2`, `replaceLegacyInText`.

## 3. 이전 스크립트 사용법 (`scripts/migrate-storage-to-r2.ts`, 실행은 PC에서)
```
# 드라이런(기본, 쓰기 없음): 개수·용량·이미 완료·예상 R2 쓰기(Class A) 요청 수와 무료 100만 대비 %
npx tsx scripts/migrate-storage-to-r2.ts --state state.jsonl
# 목록 파일(URL 또는 경로 한 줄씩)
npx tsx scripts/migrate-storage-to-r2.ts --from-urls urls.txt
# 실제 복사(이어하기 가능, 실패 목록)
npx tsx scripts/migrate-storage-to-r2.ts --apply --confirm "R2로 복사" --state state.jsonl --failures failed.txt
# 검증(읽기 전용): R2 HEAD 크기 전수 + 무작위 표본 해시 + 공개 주소 200·image/* content-type
npx tsx scripts/migrate-storage-to-r2.ts --verify --sample 30
```
옵션 `--concurrency`(기본 4·최대 16) `--retries 5` `--timeout-ms 30000` `--limit` `--prefix`. 환경변수는 `process.env`에서만(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(목록 API), `R2_*`), 값은 출력하지 않는다. 동작: 공개 주소로 다운로드 → R2 HEAD로 같은 크기+같은 MD5(ETag)면 건너뜀 → 459차 r2 provider `putObject`(contentType 유지, `CACHE_IMMUTABLE`). 지수 백오프(1s→30s), 402/403이면 원인(결제·한도/권한)을 출력하고 즉시 중단, 404는 `missing`으로 기록. 상태 파일은 경로·크기·상태만.
**한계/미검증**: 객체는 최대 10MB라 메모리에 올려 업로드한다(진짜 스트림 아님). cacheControl은 전부 `CACHE_IMMUTABLE`(덮어쓰기 경로용 `CACHE_SHORT`는 경로만으로 구분 불가 — enhance-image의 `-<suffix>.png` 경로는 재덮어쓰기 때 새 앱 업로드가 `CACHE_SHORT`로 다시 쓴다). 목록 API 응답 형식(`id===null`이 폴더)과 R2 HEAD/ETag=MD5는 문서 기준 가정이며 실제 접속 검증 안 함. Supabase 다운로드 egress ≈0.2GB 한 번.

## 4. SQL 파일 (`docs/migration-r2/`, 적용 안 함)
`01-backup.sql`(`product_images_bak_r2`·`products_bak_r2`·`image_generation_jobs_bak_r2`, id+교체 대상 컬럼, 행 수 출력) · `02-preview.sql`(SELECT/DO 알림만: 컬럼별 건수·전후 5건·발견 쿼리·호스트별 건수) · `03-apply.sql`(begin 후 UPDATE 9개, 남은 건수 SELECT, **COMMIT/ROLLBACK은 수동**) · `04-verify.sql` · `99-rollback.sql`(백업에서 복원) · `README.md`. 호스트는 `__OLD_PREFIX__`/`__NEW_PREFIX__` 토큰(편집기에서 바꿈), 머리에 선행 조건. 회귀(`migration-sql-460`): DROP/TRUNCATE/DELETE FROM/ALTER 없음, UPDATE는 03과 99에만(**지시서는 "03 외 UPDATE 없음"이었으나 롤백은 복원 UPDATE가 필요해 99를 허용**), 01 백업이 03 대상 테이블·컬럼과 id를 모두 포괄, 99가 모든 컬럼 복원, 03·99에 자동 COMMIT 없음, 프로젝트 호스트 하드코딩 없음.

## 5. 만료 이미지 정리
기존 판정(엣지 함수): `product_id is null` + `image_uploaded_at` 3일 경과 + `protected_until` 없음/과거 → 저장소 삭제 + 행 삭제(엣지 함수는 저장소 삭제가 실패해도 행을 지웠음). 신규 `GET /api/cron/cleanup-expired-images`(`lib/storage/expired-cleanup.ts`가 판정·실행): 같은 조회 조건에 오래된 순 `limit 500`, `CRON_SECRET` Bearer(결제 갱신 라우트와 동일), 100개 묶음으로 `getStorage().removeObjects` → 성공한 묶음의 행만 삭제(**실패하면 행을 남겨 다음 실행이 재시도** — 유일한 판정 외 변경), 완성 상품 이미지는 재판정으로도 제외, 로그에는 개수만. `vercel.json`에는 **등록하지 않았다**(문서화만); 켜는 순서·엣지 cron 해제 순서·이중 실행 시 영향(멱등, 낭비뿐)은 `docs/r2-setup.md` §7.

## 6. 업로드 제한 (`lib/storage/policy.ts` `UPLOAD_URL_RULES`)
시간당 150회 · 일 600회(사용자별). 근거: 상세페이지 1회 제작에 사진 보통 5~10장(재시도·롤백 포함 30개 안팎) → 시간당 약 5회분, 일 약 20회분. `usage_guard`는 DB 함수 기반 비용 한도라 시간 창이 없고 확장하려면 마이그레이션이 필요(금지)해 쓰지 않고, 기존 `SlidingWindowLimiter`(인메모리)를 재사용했다. **한계**: 서버리스 인스턴스별이라 1차 완충(공유 저장소 제한은 Vercel WAF/Upstash 권장). 위치: 로그인·형식·크기 검증 뒤, supabase 모드 409 뒤(409는 횟수를 소모하지 않음), 서명 발급 앞. 초과 시 429 + `Retry-After` + 기존 문구.

## 7. 새 문구
없음(429는 support-chat의 기존 "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." 재사용).

## 8. 못 한 것 / 주의
- 실제 DB·R2·Supabase에 대해 아무것도 검증하지 못함(발견 쿼리 결과, 목록 API 응답, ETag, 서명 PUT의 R2 수락 모두 PC 확인 필요).
- 전체 회귀(`run-all`)는 지시대로 안 돌림 — 새 회귀 5개(legacy-url-460, migrate-storage-460, migration-sql-460, expired-cleanup-460, upload-rate-460)는 SUITES 끝에 등록했고 단독 통과.
- 열려 있던 탭의 세션과 export HTML은 옛 주소를 계속 쓴다(옛 객체 90일 유지로 대응).

## 9. PC에서 할 일 (순서대로, 기대 결과)
1. `git pull origin cloud-work` → `npm ci` → `npx tsc --noEmit`(0 오류) → `npx tsx scripts/regression/run-all.ts`(전체 통과; 새 5개 포함).
2. `docs/migration-r2/README.md` ① R2 환경변수·프리뷰 업로드 확인(업로드 성공, `img.pagzly.com` 주소).
3. ② 드라이런 → 개수·≈0.2GB·예상 쓰기 요청 수, "아무것도 쓰지 않았습니다".
4. ③ `--apply --confirm "R2로 복사"` → 실패 0(있으면 재실행). 402/403이면 메시지의 원인 확인.
5. ④ `--verify --sample 30` → 이상 전부 0.
6. ⑤ `01-backup` → 행 수 확인. ⑥ `02-preview`(건수·발견 쿼리) → `03-apply` → 남은 0·행 수 일치 시 `COMMIT;`. ⑦ `04-verify` 전부 0 + 앱에서 상품 몇 개 확인(깨지면 `99-rollback`).
7. ⑧ 프로덕션 `STORAGE_PROVIDER=r2` → 새 업로드 확인 → `docs/r2-setup.md` §7 순서로 정리 cron 전환. ⑨ Supabase Cached Egress 며칠 관찰. 옛 객체는 90일 뒤(위 조건 확인 후) 사용자가 직접 정리.
