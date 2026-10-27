# 459차 보고 — 이미지 저장소 R2 전환 계층 (코딩 전용, 기본 꺼짐)

## 맨 위 요약
- **push**: 항목마다 `cloud-work`에 push 완료(403 없음, main push 없음). 시작 전 `git pull --no-rebase origin cloud-work` = Already up to date(458차 완료 상태).
- **기본 동작 불변**: `STORAGE_PROVIDER` 미설정 = Supabase. 서버·브라우저 모두 `upload(path, body, { contentType, upsert })` → `getPublicUrl` 호출이 이전과 같은 형태이고 오류도 `.message`로 같다(회귀가 가짜 Supabase 클라이언트로 인자까지 확인). cacheControl 힌트는 R2 전용이라 Supabase 모드에서는 무시한다.
- 이번 차수 실행: `npx tsc --noEmit` 통과, **새 회귀 `storage-provider-459`만 단독 실행 → 통과**(전체 회귀·빌드·캡처·퍼징·pc-verify·네트워크 접속 테스트는 하지 않았다). `predeploy-static.ts`로 `docs/required-env-names.md`만 갱신(네트워크·env 파일 없음).
- 패키지: `@aws-sdk/client-s3`·`@aws-sdk/s3-request-presigner`를 `npm install`로 추가해 **`package.json`·`package-lock.json` 모두 갱신됨**(레지스트리 설치 성공, 29패키지).
- 결제 코드·`cta_price`·`data-pz-buy`·스티키 바·렌더 출력·편집 UI·마이그레이션은 건드리지 않았다. 새 문구: 아래 「새로 필요해진 문구」 1건.

## 만든 것
| 파일 | 내용 |
|---|---|
| `lib/storage/types.ts`·`policy.ts`·`public-url.ts`·`validate.ts` | 인터페이스, 공통 정책(버킷·10MB·허용 형식·5분·캐시 두 종류·접두사 검증), 클라이언트 공용 공개 주소 계산(`publicUrlFor`·`storageRemotePattern`·`isStoragePublicUrl`), 요청 검증 순수 함수 |
| `lib/storage/supabase-provider.ts` | 기존 호출을 그대로 감쌈(서명 대상은 `null`) |
| `lib/storage/r2-provider.ts` | S3 호환(엔드포인트 `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`·리전 `auto`·경로 스타일 미사용·체크섬 `WHEN_REQUIRED`), 서명 PUT(Content-Type·Content-Length 서명에 묶음, 5분), 공개 주소 `R2_PUBLIC_BASE_URL`+path |
| `lib/storage/index.ts` | `getStorage(supabase)`: `STORAGE_PROVIDER` 선택, **r2인데 `R2_*` 누락·잘못된 provider 값이면 조용히 Supabase로 떨어지지 않고 이름만 담은 `StorageConfigError`**(값 비출력) |
| `lib/storage/client-upload.ts` | `uploadImage`·`removeUploaded`: `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` 없으면 기존 Supabase 호출, 있으면 서명 PUT |
| `app/api/storage/upload-url/route.ts`·`remove/route.ts` | 로그인 필수·본인 접두사·형식·크기 검증 후 서명 발급 / 롤백 삭제 |
| `docs/r2-setup.md` | 사용자가 직접 할 일(가입→버킷→공개 접근→버킷 한정 토큰→CORS→환경변수→점검표→확인→롤백) |
| `review/459-verify/call-sites.md`·`url-assumptions.md` | 호출 지점 전수·주소 가정 코드 표 |

## 호출 지점 교체(전수, 자세한 표는 `call-sites.md`)
서버 7곳(`enhance-image`·`generate-social`·`scene-images`·`info-backdrops`·`generate-backdrop`·`section-backdrops`·`generate` 아이콘) + `lib/upload-png.ts`(사용처 5곳은 코드 변경 없음) → `getStorage()`. 브라우저 5곳(`CreateProductForm` 2·`result/page` 2·`social/page` 1) → `uploadImage`/`removeUploaded`. 캐시: 보정 이미지 2곳(원본 경로에서 파생해 덮어씀)과 `uploadPngBuffer`(경로를 호출부가 정함)는 **짧게(1시간)**, 타임스탬프로 고유한 5곳은 **1년 immutable**. 서버에는 `remove`·`list` 호출이 없다.

## 보안 표
| 점검 | 처리 |
|---|---|
| 인증 | 두 라우트 모두 `supabase.auth.getUser()` 로그인 필수(비로그인 401), 순수 함수 `planUpload`/`planRemove`로 단위 테스트 |
| 경로 접두사 | 클라이언트가 보낸 경로는 `<userId>/`로 시작해야 하고 `..`·`\`·빈 조각·제어문자·300자 초과 거절(403); 경로가 없으면 서버가 `<userId>/<시각>-<UUID>`로 생성 |
| 형식·크기 | 허용 MIME(정책 SQL 목록 + avif)만, 크기는 정수 1~10MB(`MAX_UPLOAD_BYTES` = 정책 SQL의 `10485760`) |
| 서명 | PUT 전용, `Content-Type`·`Content-Length`를 서명에 묶음(크기·형식 바꿔치기 시 거절), 5분 만료 |
| 비밀키 | R2 키는 서버 모듈(`r2-provider`·`index`)에만 있고 응답에는 서명된 주소·공개 주소만. 회귀가 `"use client"` 파일에 R2 이름·`@aws-sdk`·서버 전용 저장소 모듈 import가 없음을 정적으로 확인 |
| 남의 경로 삭제 | 삭제는 본인 접두사만, 하나라도 남의 경로면 전부 거절(403), 한 번에 20개 상한 |
| CORS | 버킷 CORS에 서비스 출처·`PUT`·`content-type`/`content-length` 허용 필요(`docs/r2-setup.md`) |
| 사용량 보호 | `usage_guard`는 유료 호출 한도용이라 걸지 않았다. 방어선은 인증·10MB·형식 제한 — **업로드 횟수 제한은 없다**(필요하면 460차 후보) |
| SVG | 로고 업로드가 쓰므로 허용(정책 SQL과 같음). R2 공개 도메인이 별도 출처라 앱 쿠키와 분리되지만 SVG 스크립트 위험은 남는다(정책 SQL 주석의 「오픈 후 svg 제거 검토」와 같은 과제) |

## Supabase 주소 가정 코드와 처리 (`url-assumptions.md`)
`next.config`·`proxy-image-policy`·`scene-images`의 주소 검사는 **R2 호스트를 추가**(설정이 있을 때만, Supabase 호스트 유지 — 이전 전 기존 이미지 계속 표시). 경로를 주소에서 뽑아 쓰는 코드는 찾지 못했다(경로는 `storage_path`·응답 `path`로 따로 전달). **만료 이미지 정리(`cleanup-expired-images` 엣지 함수·cron)는 R2 객체를 지우지 못한다**(행만 지워 고아가 된다) — 수정하지 않았고(마이그레이션 금지), **버킷 전체에 나이 기반 수명 주기 삭제를 걸면 완성된 상품의 영구 이미지까지 지워지므로 하지 말라고 문서에 명시**했다. 지시서가 제안한 「접두사별 N일 후 삭제」는 접두사가 임시/영구를 가르지 못해 안전하지 않다고 판단해 대안(460차: 엣지 함수 또는 서버 라우트가 provider로 삭제)으로 바꿨다.

## 새로 필요해진 문구(결정 대기)
- `lib/storage/index.ts` `StorageConfigError`: "이미지 저장소(R2) 설정이 없습니다: <이름 목록>" — 운영자용 서버 오류이며 R2 모드에서 설정이 빠졌을 때만 사용자에게 보일 수 있다. 그 외 라우트 오류는 기존 문구("로그인이 필요합니다."·"잘못된 요청 형식입니다.")만 재사용.

## 못 한 것·미검증
- **전체 회귀·빌드·pc-verify는 실행하지 않았다**(지시). `next.config.ts`가 `./lib/storage/public-url`을 상대 경로로 import — Next가 TS 설정의 상대 import를 지원한다고 알고 있으나 **`next build`로 확인 필요**(미검증).
- AWS SDK 최신판의 서명 PUT·`IfNoneMatch`(R2 지원 여부)·체크섬 설정은 로컬 서명 주소 형태까지만 확인했다(실제 R2 접속 없음). `upsert:false`에 붙이는 `If-None-Match: *`가 R2에서 거절되면 해당 줄을 빼야 한다 — **R2에서 첫 업로드로 확인**(미검증).
- 업로드 횟수 제한 없음, 만료 정리 R2 미대응, 라이브 이미지 `<img>`의 `crossOrigin` 영향은 R2 CORS 설정 전에는 캡처에서 실패할 수 있음.
- Cloudflare 가입 시 카드 필요 여부, `r2.dev` 제한, R2 요금은 직접 확인해야 한다(문서에 미검증으로 표시).

## PC에서 할 검증
1. `git pull origin cloud-work` → `npm ci` → `npx tsc --noEmit`
2. 새 회귀: `npx tsx scripts/regression/run-all.ts` (전체, `storage-provider-459` 포함 — 개별은 `npx tsx -e` 대신 전체 실행 권장)
3. `npx tsx scripts/pc-verify.ts` — **R2 환경변수를 넣기 전에는 기본 동작이 바뀌지 않는지** 확인(합격 기준: 불합격 0·smoke 53/53)
4. `next build` 성공(특히 `next.config.ts` import)
5. (선택) 프리뷰 배포에서 `docs/r2-setup.md` 순서대로 R2를 켜고 사진 1장 업로드 → 주소가 R2 공개 주소인지, PNG 다운로드가 되는지

## 460차 후보
기존 이미지 이전 스크립트(Supabase → R2 복사, 경로 유지·재시도·해시 검증, 읽기 전용 드라이런 먼저) · DB 주소 교체(`product_images.image_url`·세션/상품 JSON 안의 이미지 주소, 백업·롤백 포함) · 이전 후 검증(샘플 열기·개수 대조) · 만료 이미지 정리를 R2에서 하게 하는 엣지 함수/서버 라우트 · 업로드 횟수 제한 · SVG 허용 재검토.
