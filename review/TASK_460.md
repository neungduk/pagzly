# TASK_460 — 기존 이미지 이전(Supabase → R2)·DB 주소 교체·만료 정리 R2 대응·업로드 횟수 제한 (코딩 전용) — 지시서 요약본

시작 문장: "460차 시작: 이미지 이전 스크립트·주소 교체·R2 만료 정리·업로드 제한". 시작 전 `git pull --no-rebase origin cloud-work`로 `432d703` 이후 확인. **이번은 코딩만**: 캡처·PNG·퍼징·pc-verify·next build·전체 회귀 실행 금지, R2·Supabase 접속 테스트·실행 금지, 스크립트는 작성만(실행은 사용자 PC). 허용: `npx tsc --noEmit`, 새 회귀 파일만 단독 실행.

## 배경
459차로 신규 업로드는 `STORAGE_PROVIDER=r2`로 R2에 올릴 수 있다(기본 꺼짐). 기존 이미지는 Supabase 주소라 egress가 계속 쌓임(무료 5GB 대비 37.7GB). Storage 사용량 0.2GB라 전체 복사 비용 작음. R2 공개 주소 `https://img.pagzly.com`(버킷 `pagzly-images`). 459차 과제: 만료 정리(`cleanup-expired-images`)가 R2 객체를 못 지움, 업로드 횟수 제한 없음.

## 규칙(요약)
유료 API 0·실제 키·`.env*` 금지·R2·Supabase 접속 금지(가짜 클라이언트·고정 입력 단위 테스트)·외부 사진 다운로드 금지·새 로그인 금지. 결제·`cta_price`·`data-pz-buy`·스티키 바·렌더 출력·편집 UI·인터랙션 불변. 새 문구 금지(필요하면 보고서 목록). **마이그레이션 파일 추가 금지**, DB 변경은 사용자가 직접 실행하는 SQL(`docs/migration-r2/`)로 작성만. 스크립트 비밀은 `process.env`에서만 읽고 값 출력·로그·파일 저장 금지, 기본 드라이런·`--apply`+확인 문구일 때만 쓰기. `run-all.ts` SUITES 끝에 추가. 항목마다 커밋·push, main 금지, `git add`는 파일 이름 지정.

## 1. 이미지 주소 전수 조사(읽기 전용)
스키마·코드에서 DB가 이미지 주소를 저장하는 모든 테이블·컬럼·JSON 필드 표(`docs/migration-r2/address-inventory.md`: 테이블·컬럼·형식·예상 건수 쿼리; `product_images`·`products`(logo_url·세션 JSON·theme 안 imageUrls·sceneImages·infoBackdrops)·상세 세션 저장 컬럼·`image_generation_jobs` 결과). 클라이언트 sessionStorage·로컬 세션은 별도 표시. `lib/storage/legacy-url.ts`: Supabase 공개 주소에서 `<path>` 추출·R2 주소 변환 순수 함수+단위 테스트(쿼리스트링·인코딩·중복 슬래시·다른 프로젝트 호스트 거절).

## 2. 이전 스크립트 `scripts/migrate-storage-to-r2.ts`
Supabase `images` 버킷 전체를 같은 경로로 R2에 복사·검증. 목록은 Storage list API(서비스 키, process.env) 또는 `--from-urls` 목록 파일. 공개 주소로 다운로드 → 459차 r2 provider `putObject`(contentType 유지, cacheControl 규칙 재사용). 같은 크기·해시면 건너뜀(재개 가능), 상태 JSON 라인 파일 `--state`(경로·크기·상태만). **드라이런 기본**(개수·총 용량·건너뜀·예상 R2 쓰기 요청 수), `--apply` + `--confirm "R2로 복사"`일 때만 복사. 동시성·지수 백오프·타임아웃·스트리밍·실패 목록. `--verify`: 전 객체 R2 HEAD 크기 일치 + 무작위 샘플 해시 + 공개 주소 200·content-type. Supabase 다운로드 egress(0.2GB 한 번) 문서화, 402/403이면 중단·원인 출력.

## 3. DB 주소 교체 SQL(적용 금지)
`docs/migration-r2/`: `01-backup.sql`(`*_bak_r2` 백업, 행 수), `02-preview.sql`(SELECT만), `03-apply.sql`(트랜잭션 UPDATE replace, JSON은 jsonb/text 안전 처리, 처리 행 수, COMMIT 수동), `04-verify.sql`(남은 옛 주소 0), `99-rollback.sql`. 프로젝트 호스트는 변수 주석(하드코딩 금지), 선행 조건 머리 주석. 회귀: DROP·TRUNCATE·DELETE FROM 없음, 03 외 UPDATE 없음, 01 백업 대상이 03 교체 대상을 모두 덮음. `README.md`(순서·점검·롤백·소요 어림).

## 4. 만료 이미지 정리 R2 대응
엣지 함수·cron 판정(만료·삭제 대상) 정리. `app/api/cron/cleanup-expired-images/route.ts`(또는 관례에 맞는 쪽)가 만료 행 조회 → `getStorage().removeObjects` → 행 정리. `CRON_SECRET` 헤더(기존 방식 있으면 동일), 1회 처리 건수 상한, 삭제 실패 시 행 유지(재시도), 영구 이미지(완성 상품 참조)는 제외 — **기존 판정 그대로**. `vercel.json` cron 등록은 문서화만(기본 미등록), 엣지 cron과 이중 실행 방지 순서는 `docs/r2-setup.md`. 회귀: 판정 단위 테스트(만료·영구·상한·삭제 실패 시 행 유지, 가짜 provider).

## 5. 업로드 횟수 제한
`app/api/storage/upload-url`에 사용자별 시간당·일일 서명 발급 제한. 기존 `usage_guard` 패턴 재사용 가능하면 같은 방식, 아니면 DB 없는 간단한 보호. 한도는 `lib/storage/policy.ts` 상수(근거 보고서), 초과 429·기존 문구. 회귀: 초과 429·한도 내 통과(가짜).

## 6. 문서
`docs/migration-r2/README.md` 최종: ①R2 환경변수·프리뷰 업로드 확인 ②드라이런 ③`--apply` 복사 ④`--verify` ⑤DB 백업 ⑥교체 ⑦확인 ⑧프로덕션 `STORAGE_PROVIDER=r2` ⑨Supabase egress 모니터링, 단계별 중단 지점·되돌리기·시간·비용. 옛 Supabase 객체는 일정 기간 삭제하지 않는다(롤백 안전망), 삭제 시점 권고.

## 7. 보고서
`review/460cha-report.md` 맨 위: push 여부, 주소 인벤토리 전수, 스크립트 사용법(드라이런 예시), SQL 목록, 만료 정리 요약, 업로드 제한 값, 새 문구, 못 한 것, PC에서 할 일(드라이런부터 순서대로·각 단계 기대 결과).

## 8. 하지 않는 것
이전·SQL·cron 실제 실행, R2·Supabase 접속, 키 생성·저장·출력, 유료 호출, 새 문구, push to main, 렌더·결제·`cta_price`·편집 UI·인터랙션 변경, `STORAGE_PROVIDER` 기본값 변경, 마이그레이션 추가·적용, 옛 Supabase 객체 삭제.
