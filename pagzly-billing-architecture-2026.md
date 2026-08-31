# Pagzly 결제·구독·크레딧 시스템 아키텍처 (2026-08-31)

전제: PG는 **토스페이먼츠**로 확정. 사업자등록은 아직 없음. 이 문서는 "**기능은 전부 만들어 놓고, 사업자등록만 받으면 바로 실행**"이라는 목표를 위한 전체 설계도입니다.

## 0. 핵심 전제 — 테스트 키로 사업자등록 없이 전부 만들 수 있다

토스페이먼츠 공식 문서 확인 결과: **테스트 API 키는 전자결제 신청(사업자등록 필요한 가맹점 심사) 완료 전에도 발급·사용 가능**합니다. 실제 카드 승인 없이(가상 승인) 결제창·빌링키 발급·정기결제·웹훅까지 전체 플로우를 지금 다 구현하고 테스트할 수 있습니다. 라이브 전환 시 필요한 건 §6의 체크리스트뿐이고, **코드 변경은 없습니다** (환경변수만 test_ → live_ 로 교체).

---

## 1. 기존 스키마 확인 결과

`profiles` 테이블은 존재하지 않습니다. 사용자 식별은 전부 `auth.users(id)`를 직접 참조하는 패턴입니다 (`public.user_onboarding`, `public.products`가 이 패턴). 새 테이블도 동일하게 `auth.users`를 직접 참조합니다.

---

## 2. 신규 테이블 (Supabase 마이그레이션)

| 테이블 | 역할 |
|---|---|
| `user_credits` | 크레딧 잔액 캐시 (빠른 조회용, `balance`) |
| `credit_ledger` | 모든 지급/차감 내역 감사 로그 (source of truth) |
| `subscriptions` | 구독 상태 + 토스 빌링키 |
| `payments` | 토스 결제 시도 기록 (멱등성·감사용) |
| `draft_usage_counters` | draftToken별 재시도 횟수 (36차/브리프 §3 재시도 규칙) |

`user_credits.balance`는 캐시일 뿐 진짜 원장은 `credit_ledger`입니다 — 불일치 발생 시 `credit_ledger` 합산값이 항상 맞는 값입니다.

## 3. 크레딧 지급/차감은 반드시 RPC 함수로만

`grant_credits()` / `deduct_credits()`라는 두 개의 Postgres 함수(`security definer`)를 만들어, 잔액 확인→차감→원장 기록을 **하나의 DB 트랜잭션**으로 묶습니다. 이유:
- 동시 요청(같은 사용자가 탭 두 개로 동시에 "최종 생성" 클릭)에서도 잔액이 음수로 내려가지 않도록 행 잠금(`for update`) 필요
- **두 함수 모두 `authenticated` 롤에는 EXECUTE 권한을 주지 않습니다.** 클라이언트가 직접 호출하면 안 되는 함수라, `service_role`에만 권한을 주고 Next.js API 라우트(서버) 안에서 Supabase service-role 클라이언트로만 호출합니다. 이걸 어기면 사용자가 자기 크레딧을 마음대로 조작할 수 있는 구멍이 생깁니다.

가입 시 무료 5크레딧은 `auth.users`에 신규 행이 생기면 자동으로 `grant_credits`를 호출하는 DB 트리거로 처리합니다 — 구글·카카오·이메일 등 로그인 경로가 여러 개(코드에 `GoogleLoginButton`/`KakaoLoginButton` 확인됨)라, 각 로그인 콜백마다 지급 로직을 넣는 것보다 트리거 하나로 처리하는 게 누락 위험이 없습니다.

⚠️ 트리거 안의 무료 크레딧 수(5)는 SQL에 상수로 박히기 때문에 `lib/cost/saas-pricing-config.ts`의 `SIGNUP_FREE_CREDITS`와 별도로 관리됩니다. 나중에 무료 크레딧 수를 바꾸면 **TS 상수 + 새 마이그레이션 둘 다** 고쳐야 합니다 (SQL 마이그레이션은 적용 후 수정 불가, 새 마이그레이션으로 함수를 갱신).

## 4. API 라우트 (신규)

| 라우트 | 역할 | Toss API |
|---|---|---|
| `POST /api/billing/register-card` | 카드 등록 위젯 완료 후 authKey → 빌링키 발급 | 빌링키 발급 API |
| `POST /api/billing/subscribe` | 티어 선택 → 첫 결제(빌링키로 청구) → `subscriptions` 생성 → 크레딧 지급 | 빌링 승인 API |
| `POST /api/billing/renew` | (스케줄러 전용) 갱신 대상 구독 청구 → 기간 연장 → 크레딧 지급 | 빌링 승인 API |
| `POST /api/billing/purchase-pack` | 크레딧 팩 단건 결제 confirm | 결제 승인(confirm) API |
| `POST /api/billing/cancel` | 구독 해지 (다음 갱신부터 중단, 이미 받은 크레딧은 유지) | — |
| `POST /api/billing/webhook` | 토스 웹훅 수신 (결제 상태 변경 비동기 알림) | — |

**보안 필수 규칙**: `purchase-pack`에서 결제 금액은 **절대 클라이언트가 보낸 amount를 믿지 않고**, 서버가 `lib/cost/saas-pricing-config.ts`의 `CREDIT_PACKS`에서 pack id로 조회한 금액과 토스 confirm 응답 금액을 대조합니다. 안 맞으면 승인 거부. (금액 위변조 방지 — 결제 연동에서 가장 흔한 취약점.)

## 5. `/api/generate` 연동 지점

`mode: "final"` 분기, 사진 보정 파이프라인 시작 **직전**에 `user_credits.balance >= 1` 확인 → 부족하면 402 응답으로 UI에 "크레딧 부족" 안내. 파이프라인 성공 + `products` insert 성공 **직후** `deduct_credits(user, 1, 'completion', product.id)` 호출. 재시도 소프트 캡(draft 재생성 3회·재보정 2회 무료, 이후 0.2크레딧)은 `draft_usage_counters`를 읽고 갱신하는 로직으로 별도 브리프에서 연동합니다.

## 6. 사업자등록 이후 — 실행 체크리스트 (코드 변경 없음)

1. 사업자등록증 발급
2. 토스페이먼츠 가맹점 가입 + 전자결제 신청(사업자등록증 제출)
3. 심사 완료 → 개발자센터에서 상점 상태 "계약완료" 확인
4. 라이브 API 키(client key / secret key) 발급
5. Vercel 환경변수 `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY`를 `test_` → `live_` 값으로 교체
6. 결제위젯 프론트엔드에도 live client key 적용 확인
7. 소액 실결제 1건으로 실제 카드 청구·환불 테스트
8. (있다면) "테스트 모드" 안내 배너 제거

이 8단계가 끝나면 지금 만들어 둔 기능이 그대로 실결제로 동작합니다.

## 7. 브리프 순서 (앞으로 이어질 라운드)

| 순번 | 내용 | 외부 의존성 |
|---|---|---|
| 38차 | DB 마이그레이션 — 5개 테이블 + RPC 2개 + 가입 트리거 | 없음 (지금 바로 가능) |
| 39차 | 토스 SDK 연동 — 카드 등록 위젯 + 빌링키 발급 + 구독 첫 결제 | 토스 테스트 키만 있으면 됨 |
| 40차 | 크레딧 팩 단건 결제(위젯) + confirm 검증 | 〃 |
| 41차 | `/api/generate` 크레딧 체크·차감 + 재시도 카운터 연동 | 38차 완료 후 |
| 42차 | 구독 갱신 스케줄러 (Supabase Edge Function 또는 cron) | 39차 완료 후 |
| 43차 | 랜딩페이지 요금제 UI를 실제 결제 플로우로 교체 | 39·40차 완료 후 |

각 라운드는 이전과 같은 방식으로 좁은 범위 브리프 → Cursor 구현 → diff 재검증 순으로 진행합니다. 오늘은 38차부터 시작합니다.
