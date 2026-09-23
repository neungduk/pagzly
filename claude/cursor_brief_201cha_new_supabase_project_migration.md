# 201차 — 새 Supabase 프로젝트(`pagzly-v2`)로 전환: env 교체 + 스키마 마이그레이션 + 검증 (API 0)

생성: 2026-09-16

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지.

## 배경 — 왜 새 프로젝트인가

기존 프로젝트(`sblnthhayvrfkvaksest`, 조직 "PagePick")가 스토리지 쿼터 초과(402)로 조직
전체가 잠겼습니다. Storage API(`list`/`remove` 둘 다)와 PostgREST를 통한
`storage.objects` 조회까지 전부 막혀서, 기존 프로젝트에서는 정리조차 불가능한 상태입니다.
Supabase Support에 문의는 넣었지만(응답 대기 중, SLA 없음), 기다리지 않고 **완전히 새
무료 조직/프로젝트로 전환**하기로 사용자와 합의했습니다.

**사용자 확인 사항** (원문 답변): "DB(제품/이미지 기록, 크레딧·구독, 온보딩 테이블 등)도
전부 테스트 데이터라 비워도 된다" — 즉 기존 DB의 행(데이터) 마이그레이션은 필요 없고,
**스키마만 마이그레이션 파일로 재구성**하면 됩니다. 스토리지의 이미지 파일들도 전부 로컬
백업이 있어 옮길 필요 없습니다.

## 제가 이미 완료한 부분 (Supabase 대시보드에서 직접 처리)

- 새 조직 `PagePick-2` (Free 플랜) 생성 완료
- 새 프로젝트 `pagzly-v2` 생성 완료 — **project ref: `qnstsrplqzoqlndojuyw`**, 리전
  `ap-southeast-1` (Singapore, 기존 프로젝트와 동일 리전으로 맞춤)
- Storage 버킷 `images` 생성 완료 — 기존 버킷과 동일 설정으로 맞춤 확인함
  (`public = true`, `file_size_limit = NULL`, `allowed_mime_types = NULL`)
- 기존 프로젝트의 `storage.objects` RLS 정책(`allow-uploads`, `bucket_id = 'images'`
  조건의 SELECT/INSERT/UPDATE/DELETE 4개)을 새 프로젝트에 동일하게 재생성 완료
- 새 프로젝트 API 키 발급 완료 (아래 "새 자격증명" 참고)
- DB 비밀번호 재설정 및 확보 완료 (아래 참고)

## 새 자격증명 — `.env.local`에 반영

기존 `.env.local`에서 **아래 3개 값만 교체**하고, 나머지 줄(`ANTHROPIC_API_KEY`,
`DEEPSEEK_API_KEY`, `REPLICATE_API_TOKEN`, `PEXELS_API_KEY`, `TOSS_*`, `CRON_SECRET`
등)은 절대 건드리지 마세요:

```
NEXT_PUBLIC_SUPABASE_URL=https://qnstsrplqzoqlndojuyw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<REDACTED — use local .env.local, never commit>
SUPABASE_SECRET_KEY=<REDACTED — use local .env.local, never commit>
```

(기존 코드가 `SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_SECRET_KEY` 순서로 읽으므로,
`SUPABASE_SECRET_KEY` 키 이름 그대로 교체하면 됩니다 — `lib/supabase/service-role.ts`
참고.)

**DB 직접 연결용 비밀번호** (Supabase CLI `link`/`db push`에서만 필요, `.env.local`에는
넣지 마세요 — CLI가 프롬프트로 물어보면 로컬 보관 값을 입력):

```
<REDACTED — never commit DB password>
```

**이 비밀번호와 시크릿 키를 절대 로그, 커밋 메시지, 보고서에 출력하지 마세요.** 콘솔
출력이나 `git diff`에 노출되지 않게 주의해서 다루세요.
(254차: 위 값은 푸시 보호에 걸려 플레이스홀더로 치환됨 — 실값은 `.env.local`만.)

## 작업

### 1. `.env.local` 교체

위 3개 값으로 교체. `.env.local.127cha-bak` 같은 백업 파일은 건드리지 않음.

### 2. Supabase CLI로 새 프로젝트 연결 + 스키마 마이그레이션 적용

프로젝트 루트(`supabase/` 디렉터리가 있는 곳)에서:

```bash
npx supabase link --project-ref qnstsrplqzoqlndojuyw
```

DB 비밀번호를 물으면 위 값을 입력하세요 (이 명령은 기존 `supabase/.temp/linked-project.json`
등을 새 프로젝트로 덮어씁니다 — 정상입니다).

```bash
npx supabase db push
```

`supabase/migrations/` 안의 모든 마이그레이션 파일(2026-08-12 ~ 2026-09-04, 총 14개)이
순서대로 새 DB에 적용됩니다. 전부 성공해야 합니다 — 중간에 실패하면 에러 메시지를 그대로
보고서에 남겨주세요 (추측으로 스킵하지 말 것).

### 3. Edge Function 재배포

```bash
npx supabase functions deploy cleanup-expired-images
```

`supabase/config.toml`에 이미 `[functions.cleanup-expired-images.cron]` 스케줄
(`0 0 * * *`)이 정의돼 있으니 배포 시 같이 적용되는지 확인하세요. 안 되면 대시보드
Edge Functions 화면에서 cron이 등록됐는지 확인만 해주세요 (수동 설정은 하지 말고 상태만
보고).

### 4. 코드 내 하드코딩된 기존 project ref 잔존 여부 확인

```bash
grep -rn "sblnthhayvrfkvaksest" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules | grep -v ".next"
```

`.env.local.127cha-bak`, `review/`, `claude/` 안의 과거 브리프/보고서 문서에 남아있는 건
정상(과거 기록이라 안 지워도 됨) — **실행되는 코드(`app/`, `lib/`, `components/`,
`scripts/`)나 `supabase/.temp/`, `supabase/config.toml` 안에 남아있으면 문제**이니
그 경우만 보고해주세요.

## 검증

1. `npx tsc --noEmit` — 0.
2. `npx supabase db push` 전체 성공 (마이그레이션 14개 전부 적용, 에러 0).
3. **실제 업로드 왕복 테스트** — 새 프로젝트가 정상 동작하는지, 생성 API 호출 없이
   확인하세요. 예: 작은 스크립트로 `lib/upload-png.ts` 또는
   `createServiceRoleClient()`를 사용해 `scripts/test-assets/` 안의 로컬 테스트 이미지
   1장을 새 `images` 버킷에 업로드 → 반환된 public URL을 `fetch`로 조회해 200 확인 →
   테스트가 끝나면 그 1개 파일만 `remove()`로 정리. (198차 스크립트 패턴 참고 가능)
4. DB 연결 확인 — 새 프로젝트에서 `select count(*) from products;` 같은 간단한 쿼리가
   에러 없이 실행되는지 (0행이어야 정상 — 빈 DB이므로).
5. 3번 그레인의 `grep` 결과를 보고서에 포함.
6. 서비스 롤 키/DB 비밀번호가 로그·보고서 어디에도 노출되지 않았는지 최종 확인.
7. 생성 API 호출 0회 확인.

## 하지 않는 것

- 기존 프로젝트(`sblnthhayvrfkvaksest`)는 손대지 않음 — 그대로 방치(이미 막혀있고, 더 이상
  안 씀). 삭제도 하지 않음(나중에 사용자가 직접 정리하거나 그냥 둘 수 있음).
- 기존 DB의 데이터 행(products, billing_credits, subscriptions 등) 마이그레이션 안 함
  — 사용자 확인상 전부 테스트 데이터라 스키마만 새로 만듦.
- 기존 스토리지의 이미지 파일 이전 안 함 — 로컬 백업 존재.
- 생성 API 호출 전부 금지(0회).
- `.env.local`의 다른 키(Anthropic/DeepSeek/Replicate/Pexels/Toss/Cron) 일체 수정 안 함.

## 완료 보고 형식

4~6줄 요약 + `supabase db push` 결과(마이그레이션 몇 개 성공) + 업로드 왕복 테스트 결과
+ `grep` 잔존 결과 + `npx tsc --noEmit` 결과.

## 백로그 마스터

이 라운드는 인프라 전환이라 백로그 마스터에는 안 올립니다. 완료 확인되면 제가 별도로
운영 이슈 해결 기록만 남기겠습니다.
