# TASK 520 — 토스(앱인토스) 미니앱 대비 서버 준비

## 배경
- 점검 화면 `/label-check`은 브라우저에서 도는 클라이언트 화면이고, 서버와는 API 호출로만 연결된다. 토스 미니앱(WebView)은 **다른 도메인(`https://<앱이름>.apps.tossmini.com`)** 에서 우리 API(`pagzly.com/api/...`)를 부른다.
- 지금 코드의 걸림돌은 세 가지다.
  1. API 호출이 모두 **상대 주소**(`/api/label-check`)라서 다른 도메인에서는 자기 자신을 부른다.
  2. API에 **CORS 허용이 전혀 없다**.
  3. 토스 광고로 방문이 몰리면 **글자 읽기(OCR) 월 한도**(크레딧 기간 약 3000건)가 빨리 소진될 수 있다.
- 이번 차수는 **서버·호출 준비만** 한다. **웹 사이트의 동작과 화면은 달라지면 안 된다.** 토스용 화면 프로젝트는 하지 않는다(토스 쪽 답변 후 521차).

## 원칙
- 기본값에서는 **지금과 똑같이 동작**한다. 새 기능은 환경변수로 켜야만 작동한다(꺼진 상태가 기본).
- 판정 로직·규칙 JSON·UI·문구 수정 금지. 새 npm 패키지 금지.
- 사용자 파일·글자 원문을 로그에 남기지 않는다(기존 규칙 유지).

## A. API 주소 설정값
- 새 파일 `lib/label-check/api-base-520.ts`
  - `labelApiUrl(path: string): string` — `process.env.NEXT_PUBLIC_LABEL_API_BASE`가 있으면 끝의 `/`를 떼고 앞에 붙이고, 없으면 `path` 그대로 돌려준다.
  - `path`는 `/api/...`로 시작해야 한다. 아니면 그대로 돌려준다.
- `/api/`로 시작하는 `fetch` 호출 중 **점검 흐름이 쓰는 모든 곳**을 `labelApiUrl(...)`로 감싼다. 최소 대상:
  - `lib/label-check/client-submit.ts` (79, 100, 129행 근처)
  - `lib/label-check/client-ocr-submit.ts` (79, 183행 근처)
  - 법령 기준일을 부르는 `/api/law-watch/baseline` 호출
  - `/api/label-check/runs` 계열은 **로그인 전용**이라 이번에는 건드리지 않는다(토스에서는 쓰지 않음). 대신 보고서에 "미적용"이라고 적는다.
- 환경변수가 없을 때 URL이 이전과 **글자 그대로 같아야** 한다(테스트로 보장).
- PDF 읽기 도구 경로 `/label-check-pdfjs`(`client-ocr-prepare.ts`, `client-extract-pdf.ts`)는 이번에 바꾸지 않는다. 토스용 번들에 포함하는 방식은 521차에서 정한다. 보고서 "남은 일"에만 적는다.

## B. CORS (꺼진 상태가 기본)
- 새 파일 `lib/label-check/cors-520.ts`
  - 환경변수 `LABEL_TOSS_ENABLED`가 `"1"`일 때만 동작한다. 아니면 모든 함수가 **아무 헤더도 붙이지 않는다**.
  - 허용 Origin 판단 `allowedOrigin520(origin: string | null): string | null`
    - 정규식: `^https://[a-z0-9-]+\.apps\.tossmini\.com$`
    - 추가로 환경변수 `LABEL_CORS_ORIGINS`(쉼표 구분)에 적힌 Origin과 **글자 그대로 같으면** 허용(샌드박스·테스트 주소를 코드 수정 없이 넣기 위함).
    - `*` 와일드카드는 절대 쓰지 않는다. 허용 Origin이면 그 값을 그대로 되돌려 준다.
  - `withCors520(req, res)` — 허용 Origin이면 응답에 `Access-Control-Allow-Origin: <origin>`, `Vary: Origin`을 붙인다. **에러 응답(400/429/503 등)에도** 붙인다(안 붙이면 브라우저가 에러 내용을 못 읽는다).
  - `preflight520(req)` — `OPTIONS` 요청에 `204`로 답한다.
    - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type`
    - `Access-Control-Max-Age: 86400`
    - 허용되지 않은 Origin이면 CORS 헤더 없이 `204`.
  - **`Access-Control-Allow-Credentials`는 절대 붙이지 않는다**(쿠키 전달 금지. 토스에서는 로그인 없는 사용만 한다).
- 적용 대상 라우트(각각 `OPTIONS` 핸들러 추가, 기존 응답을 `withCors520`로 감쌈):
  - `app/api/label-check/route.ts` (POST)
  - `app/api/label-check/ocr/route.ts` (GET, POST)
  - `app/api/law-watch/baseline/route.ts` (GET)
- `middleware.ts` / `lib/supabase/middleware.ts`: 위 세 경로의 `OPTIONS` 요청은 **세션 갱신 없이 바로 통과**하게 한다(불필요한 Supabase 호출 방지). 다른 경로·메서드의 동작은 그대로.
- `app/api/label-check/runs/**`는 CORS를 붙이지 않는다.

## C. 토스 트래픽 보호 (광고로 몰릴 때 대비)
- 요청의 Origin이 `allowedOrigin520`에 걸리는 **토스 요청**에만 아래를 적용한다. 일반 웹 요청에는 영향이 없어야 한다.
  1. **익명 사용자당 일일 한도**를 웹보다 낮게: 환경변수 `LABEL_TOSS_OCR_PER_IP_DAILY`(기본 5). 기존 `ocrDailyLimit508` 로직 옆에서 토스 요청일 때만 이 값을 쓴다.
  2. **토스 전체 일일 합계 상한**: 환경변수 `LABEL_TOSS_OCR_DAILY_MAX`(기본 300). 초과하면 기존 `OCR_LIMIT`(daily) 응답과 같은 형식으로 429.
     - 서버리스 메모리 카운터는 약하므로 **DB에 하루 단위 카운터**를 둔다.
     - 마이그레이션 `supabase/migrations/20261111130000_label_toss_daily.sql`
       - 테이블 `label_toss_daily(day date primary key, ocr_count integer not null default 0)`, RLS 켜고 정책 없음.
       - 함수 `label_toss_consume(p_max integer, p_add integer default 1) returns boolean` — 하루치 행을 `insert ... on conflict ... do update`로 원자적으로 올리고, 올린 뒤 값이 `p_max` 이하이면 `true`, 넘으면 올리지 않고 `false`. `security definer`, `search_path` 고정, `service_role`에만 실행 권한.
       - 마이그레이션 파일만 작성한다. **Supabase에는 적용하지 않는다**(검수자가 적용).
     - 호출은 기존 `createServiceRoleClient`로. 호출이 실패하면(마이그레이션 미적용 등) **글자 읽기를 막지 말고** 경고만 남기고 통과(실패해도 서비스가 멈추지 않게). 단 이 경우 보고서에 적는다.
  3. 조각 수(`OCR_MAX_TILES_PER_JOB_508`)만큼 합계에 더한다(요청 1건이 아니라 **읽는 조각 수** 기준). 조각 수를 알 수 없으면 1.
- 비상 끄기: `LABEL_TOSS_ENABLED`를 빼면 CORS가 사라져 토스 요청이 모두 막힌다. 이 동작을 `docs/toss-miniapp-notes.md`에 적는다.

## D. 문서
- `docs/toss-miniapp-notes.md` 새로 작성:
  - 환경변수 표: `NEXT_PUBLIC_LABEL_API_BASE`, `LABEL_TOSS_ENABLED`, `LABEL_CORS_ORIGINS`, `LABEL_TOSS_OCR_PER_IP_DAILY`, `LABEL_TOSS_OCR_DAILY_MAX` — 각 용도·기본값·켜는 법.
  - 토스 쪽 확인 대기 중인 질문 3개(정적 번들 여부 / 파일·사진·HEIC 올리기 / 서비스 정책·개인정보 항목).
  - 이번에 하지 않은 것: 토스용 화면 프로젝트, 토스 로그인, 인앱결제, PDF 도구 번들 포함, `/api/label-check/runs` 대응.

## E. 테스트
- `scripts/regression/label-check-520.ts` 작성 후 `regression:label-check`에 추가.
  1. `labelApiUrl`: 환경변수 없음 → 입력 그대로, 있음(끝에 `/` 포함 여부 둘 다) → 올바르게 이어 붙임, `/api/`로 시작하지 않으면 그대로.
  2. 점검 흐름 파일(`client-submit.ts`, `client-ocr-submit.ts`)에 **감싸지 않은** `fetch("/api/...` 호출이 남아 있지 않다(정적 검사. `runs` 제외).
  3. CORS: `LABEL_TOSS_ENABLED` 꺼짐 → 어떤 Origin이든 헤더 없음 / 켜짐 + `https://my-app.apps.tossmini.com` → 허용 / `https://evil.com`, `https://apps.tossmini.com.evil.com`, `http://my-app.apps.tossmini.com` → 거부 / `LABEL_CORS_ORIGINS`에 넣은 값만 추가 허용.
  4. `Access-Control-Allow-Origin`이 `*`이 되는 경로가 없고, `Access-Control-Allow-Credentials`가 어디에도 없다.
  5. 프리플라이트 응답 헤더 구성.
  6. 에러 응답(429/503)에도 CORS 헤더가 붙는 경로가 있다(정적 검사 또는 단위).
  7. 마이그레이션 SQL에 RLS·`security definer`·`search_path`가 있다(문자열 검사).
- `npx tsc --noEmit` 통과. 기존 회귀 31개 전부 통과.

## F. 보고서
- `review/520cha-report.md` — 맨 위에 **"확인하지 못한 항목"**(실제 토스 Origin 테스트, 마이그레이션 적용 후 동작, 프리플라이트 실측)을 먼저 적는다.
- 커밋 최대 3개. **마지막 커밋에 코드 변경이 들어가야 한다**(문서만이면 Vercel 빌드가 건너뛰어진다).
- cloud-work에만 push. main에는 push하지 않는다.
