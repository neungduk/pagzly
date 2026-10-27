# 배포 전 순서표 (461차) — 한 장

코드·문서만으로 정리한 순서표다. **여기 있는 어떤 것도 폰/클라우드 세션에서 실행하지 않는다**(`docs/phone-session-rules.md`). 환경변수는 **이름만** 적는다(값·키는 채팅·저장소에 쓰지 않고 Vercel 환경변수에만 입력). 코드가 읽는 이름 전체 목록은 `docs/required-env-names.md`(자동 생성), 정적 점검 도구는 `docs/predeploy-static.md`.

**이전(R2) 작업과의 관계**: 이미지 저장소 이전은 `docs/migration-r2/README.md`의 14단계가 원본이다. 이전이 끝나기 전에는 실사진·이미지 업로드·원격 이미지 로드 검증을 하지 않는다. 아래 순서는 그와 별개로 **서비스 배포(마이그레이션·환경변수·도메인)** 순서다.

## 1. 마이그레이션 (사용자, Supabase 대시보드 SQL Editor 또는 CLI, 위에서 아래 순서)
| 순서 | 파일 | 누가·어디서 | 합격 기준 |
|---|---|---|---|
| 0 | `docs/premigration-checks-draft.sql` (원본이 있으면 원본 먼저) | 사용자, SQL Editor(읽기 전용 계정) | 각 쿼리가 파일 주석의 「기대」와 같다. 다르면 해당 마이그레이션을 **적용하지 말고** 멈춘다 |
| 1 | `supabase/migrations/20261022100000_usage_guard.sql` | 사용자, SQL Editor | 오류 없이 끝남, `user_daily_usage`·`global_daily_usage`·`generation_locks` 테이블과 `usage_reserve` 등 함수 생성 확인 |
| 2 | `…20261022110000_storage_images_policies.sql` | 사용자, SQL Editor (파일 머리의 확인 4가지를 먼저 본다) | 오류 없음, 앱에서 사진 업로드·표시 정상 |
| 3 | `…20261022120000_credit_ledger_completion_unique.sql` | 사용자, SQL Editor — **0번 사전 점검 중 completion 원장 중복 쿼리가 0일 때만** | 오류 없음(중복이 있으면 유니크 인덱스 생성 실패 → 멈춤) |
| 4 | `…20261022130000_signup_free_one_generation.sql` | 사용자, SQL Editor | 오류 없음, 신규 가입 지급량이 코드·고지와 같음 |

각 단계가 끝날 때마다 앱 가입→초안 화면까지 정상인지 사용자가 확인한다. 이 문서·세션은 마이그레이션을 적용하지 않는다.

## 2. Vercel 환경변수 (사용자, Vercel 프로젝트 Settings → Environment Variables → Redeploy)
| 이름 | 용도 | 합격 기준 |
|---|---|---|
| `USAGE_GUARD_FAIL_MODE` | `closed` 로 둔다(마이그레이션 1 적용 뒤) | 사용량 보호 함수가 실패하면 요청이 차단됨 |
| `NEXT_PUBLIC_SITE_URL` | `https://<실제 도메인>`(끝 슬래시 없이). 빌드 시 반영되므로 재배포 필요 | `next build`에 metadataBase 경고가 없음 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 고객 문의 메일 표시 | 푸터·문의 화면에 표시 |
| `STORAGE_PROVIDER` | `r2` — **이전 14단계의 4단계에서만** 넣는다 | 새 업로드가 R2 주소로 저장 |
| `R2_ACCOUNT_ID` | R2 계정 | 업로드 성공 |
| `R2_ACCESS_KEY_ID` | R2 토큰(버킷 한정) | 업로드 성공 |
| `R2_SECRET_ACCESS_KEY` | R2 토큰 비밀(채팅·저장소 금지) | 업로드 성공 |
| `R2_BUCKET` | 버킷 이름 | 업로드 성공 |
| `R2_PUBLIC_BASE_URL` | 서버가 저장하는 공개 주소(예: 커스텀 도메인) | 저장된 주소가 열림 |
| `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` | 브라우저 업로드 모드 전환용 공개 주소(재배포 필요) | 브라우저 직접 업로드가 서명 경로로 동작 |

R2 변수 7개(`STORAGE_PROVIDER`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL`)는 모두 넣거나 모두 비워 둔다. 일부만 있으면 업로드가 이름만 담은 오류로 실패한다(조용히 Supabase로 떨어지지 않음). 이 순서표의 이름이 코드와 맞는지는 `scripts/regression/env-names-461.ts`가 정적으로 검사한다.

## 3. 도메인·CORS·Custom Domain (사용자, Cloudflare 대시보드 / Vercel)
| 항목 | 어디서 | 합격 기준 |
|---|---|---|
| R2 버킷 Custom Domain 연결(`img…` 도메인) | Cloudflare R2 → 버킷 → Settings → Custom Domains | 도메인의 객체 주소가 브라우저에서 열림(`docs/r2-setup.md` §1) |
| R2 CORS 규칙 | 같은 화면 → CORS Policy | 앱 도메인에서 PUT(서명 업로드)·GET(캡처/PNG의 crossOrigin)이 통과 |
| Vercel 도메인 | Vercel → Domains | `NEXT_PUBLIC_SITE_URL`과 같은 도메인, HTTPS 정상 |
| `next.config` 이미지 호스트 | 코드(자동) | R2 호스트가 환경변수에서 계산돼 허용됨 — 이전 4단계 후 화면에서 이미지가 보임 |

## 4. 롤백 3단계 (되돌리는 순서)
1. **저장소 스위치**: `STORAGE_PROVIDER`·`NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL` 삭제 후 재배포 → 다시 Supabase Storage 업로드. R2 버킷·공개 주소는 지우지 않는다 — `docs/r2-setup.md` §5.
2. **DB 주소**: 교체(이전 9단계)를 커밋했다면 `docs/migration-r2/99-rollback.sql`로 복원 — `docs/migration-r2/README.md` 11단계.
3. **디자인 v4 / 마이그레이션**: 디자인은 플래그 단계적 off — `docs/v4-overview.md` §3. 마이그레이션 1~4의 되돌리기 SQL은 각 파일의 머리 주석(롤백 항목)에 있다(적용 전에 기존 정책·제한을 기록해 둔다).

## 5. 정적 점검 (집 PC, 네트워크 없음)
`npx tsx scripts/predeploy-static.ts` → 불합격 0. 배포 후 스모크(`launch-smoke`)는 이전 완료 후 집 PC에서만 실행한다.
