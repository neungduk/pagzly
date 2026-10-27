# TASK_459 — 이미지 저장소를 Cloudflare R2로 옮길 수 있게 하는 추상화 계층 (코딩 전용, 플래그 기본 꺼짐) — 지시서 요약본

시작 문장: "459차 시작: 이미지 저장소 R2 전환 계층(기본 꺼짐)". **이번은 코딩만**: 캡처·PNG·퍼징 측정·pc-verify·next build·전체 회귀 실행 금지, R2·Supabase 네트워크 접속 테스트 금지(가짜 클라이언트 주입). 허용: `npx tsc --noEmit`, 새로 추가한 회귀 파일만 단독 실행. 검증은 사용자가 PC에서.

## 배경
Supabase 무료 Cached Egress 37.7GB/5GB 초과, Pro 불가 → 이미지(버킷 `images`)만 egress 무료인 Cloudflare R2로. DB·로그인은 Supabase 유지. 업로드는 서버 API·`lib/upload-png.ts`·`lib/image-router/jobs/generation-worker.ts` 등 + 브라우저 직접 업로드 3곳(`components/CreateProductForm.tsx`, `app/create/result/page.tsx`, `app/create/social/page.tsx`). 이번은 전환 계층만, 기본(`STORAGE_PROVIDER` 미설정)=supabase로 동작 불변. 기존 이미지 이전은 460차.

## 규칙(요약)
유료 API 0·실제 키·`.env*` 금지·네트워크 접속 테스트 금지·외부 사진 다운로드 금지·새 로그인 금지. 결제·`cta_price`·`data-pz-buy`·스티키 바·상세페이지 렌더 출력·편집 UI·인터랙션 불변. 새 문구 금지(필요하면 보고서 목록). 기본 동작 불변(같은 호출·주소·오류 형태), 회귀로 잠금. `run-all.ts` SUITES는 끝에 하나씩 추가. 항목마다 커밋·push, main 금지, `git add`는 파일명 지정.

## 1. `lib/storage/` 추상화
`types.ts`(StorageProvider: putObject/getPublicUrl/removeObjects/createUploadTarget), `supabase-provider.ts`(현재 호출 그대로 감쌈), `r2-provider.ts`(`@aws-sdk/client-s3`·`s3-request-presigner`, package.json만 추가·lock은 PC에서, 엔드포인트 `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, 리전 auto, 공개 주소 `R2_PUBLIC_BASE_URL`+`/`+path), `index.ts`(`getStorage()`가 `STORAGE_PROVIDER`로 선택, r2에서 필수 환경변수 누락이면 조용히 supabase로 떨어지지 말고 업로드 호출 시 이름만 담은 명확한 오류, `docs/required-env-names.md`에 이름 추가, 서버 전용 `server-only`). 클라이언트용 `publicUrlFor(path)`는 `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`을 읽는 별도 순수 함수.

## 2. 서버 업로드 호출 이전
`rg "supabase\.storage|\.storage\.from|getPublicUrl|\.upload\("` 서버 측 전부 `getStorage()`로 교체(반환·오류·upsert·contentType 동일 확인, 표 `review/459-verify/call-sites.md`). cacheControl은 고유 경로는 1년+immutable, upsert 덮어쓰기는 짧게(표시). 삭제도 provider 경유.

## 3. 브라우저 직접 업로드 서명 경로
`app/api/storage/upload-url/route.ts`(POST, 로그인 필수, `<userId>/` 접두사 강제, 형식 image/png|jpeg|webp|gif|avif, 크기 상한 10MB(정책 SQL과 같은 값), 사용량 보호 기존 패턴, 서명 PUT 5분·Content-Length 고정, 공개 URL 반환), `lib/storage/client-upload.ts`(`uploadImage`: supabase 모드는 기존과 정확히 같은 호출, r2는 서명 요청 후 PUT), 3곳을 이 함수로 교체(롤백은 `app/api/storage/remove/route.ts`: 로그인+본인 접두사만). 보안 검토 표를 보고서에.

## 4. 주소·정책
`next.config.ts` remotePatterns에 R2 호스트(설정 있을 때만, Supabase 호스트 유지), `lib/proxy-image-policy.ts` 허용 호스트 추가(환경변수에서, 기존 케이스 유지), Supabase 주소 형태 가정 코드 전수 조사 표 `review/459-verify/url-assumptions.md`, 만료 이미지 정리(cron)는 R2에서 동작 안 함 → `docs/r2-setup.md`에 수명 주기 규칙 대체안, 앱 쪽 정리 호출은 provider 경유. 캡처/PNG의 crossOrigin 때문에 R2 CORS 요건을 `docs/r2-setup.md`에.

## 5. 회귀
`scripts/regression/storage-provider-459.ts`: provider 선택·r2 환경변수 누락 오류(값 없음)·가짜 S3로 put/url/remove/서명 검증·supabase 호출 형태 유지·업로드 라우트(비로그인 401·접두사 강제·형식/크기 거절)·정적 검사(`supabase.storage` 잔존이 허용 목록뿐)·R2 비밀 이름이 `"use client"` 파일에 없음·proxy-image-policy/next.config 호스트 계산. `run-all.ts` 끝에 추가. tsc 통과.

## 6. 문서 `docs/r2-setup.md`
Cloudflare 가입(카드 없이 가능한지 직접 확인)→R2 활성화→버킷→공개 접근(자체 도메인 권장, r2.dev 한계)→버킷 한정 API 토큰→CORS→Vercel 환경변수(`STORAGE_PROVIDER=r2`, `R2_*`, `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`; 키는 채팅·저장소 금지)→켜기 전 점검표·켠 뒤 확인·롤백·460차 전까지 Supabase 주소 유지·임시 조치와 한계.

## 7. 보고서
`review/459cha-report.md` 맨 위: push 여부, 호출 지점 교체 표(전수), 보안 표, Supabase 주소 가정 코드와 처리, 새 문구(있다면), 못 한 것, PC 검증(`npm ci`→tsc→새 회귀→pc-verify→R2 변수 넣기 전 기본 동작 불변 확인), 460차 후보.

## 8. 하지 않는 것
기존 이미지 이전·DB 수정·마이그레이션 적용, R2·Supabase 실제 접속, 키 생성·저장, 유료 호출, 새 문구, push to main, 상세페이지 렌더 출력·결제·`cta_price`·편집 UI·인터랙션 변경, `STORAGE_PROVIDER` 기본값 변경.
