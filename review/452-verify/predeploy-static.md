# 배포 전 정적 점검 (452차)

환경 파일은 열지 않았고 값은 출력하지 않는다.

| 항목 | 결과 |
|---|---|
| 마이그레이션 4개 존재·순서 | 합격 |
| 429 사전 점검 SQL | 건너뜀 |
| 환경변수 이름 목록·위험 이름 참조 | 합격 |
| 비밀값 패턴·env 추적 여부 | 합격 |
| origin/main...HEAD 변경 요약·결제/인증 경로 | 합격 |
| 플래그 기본값 ↔ docs/v4-overview.md | 합격 |

## 마이그레이션 4개 존재·순서 — 합격
- 20261022100000_usage_guard.sql — 8546B, 첫 줄 «-- 426차 R1 — 비용 남용 방어: 사용자 일일 사용량·전역 일일 비용·동시 생성 락»
- 20261022110000_storage_images_policies.sql — 3994B, 첫 줄 «-- 426차 W3·W6 — 스토리지 버킷 `images` 정책 초안 (★ 적용 금지: 사»
- 20261022120000_credit_ledger_completion_unique.sql — 1470B, 첫 줄 «-- 426차 W7 — 완성 차감 멱등성 최종 방어선 (★ 적용 금지: 사람이 중복 행 점»
- 20261022130000_signup_free_one_generation.sql — 1061B, 첫 줄 «-- 427차 — 가입 무료 혜택을 "첫 1회 생성"으로 축소 (★ 적용 금지: 사람이 검»

## 429 사전 점검 SQL — 건너뜀
- 원본 없음, 초안 있음 — 저장소에 `429-premigration-checks.sql`(원본)은 없다. 초안은 읽기 전용 SELECT만 있다(원본이 PC에 있으면 그것을 우선하고 초안과 비교).
- docs/premigration-checks-draft.sql
- scripts/regression/premigration-draft-453.ts

## 환경변수 이름 목록·위험 이름 참조 — 합격
- 읽는 이름 80개
- USAGE_GUARD_FAIL_MODE: 1개 파일에서 참조(lib/usage-guard.ts)
- NEXT_PUBLIC_SITE_URL: 4개 파일에서 참조(app/layout.tsx, app/robots.ts)
- NEXT_PUBLIC_CONTACT_EMAIL: 1개 파일에서 참조(lib/contact.ts)
- 목록 파일: docs/required-env-names.md

## 비밀값 패턴·env 추적 여부 — 합격
- 검사한 파일 1260개(리뷰·문서 제외), 패턴 9종

## origin/main...HEAD 변경 요약·결제/인증 경로 — 합격
- 얕은 클론: 두 커밋 트리 직접 비교(git diff base head)
- 파일 828개 — 828 files changed, 42230 insertions(+), 722 deletions(-)
- 상위 디렉터리: public/qa-fixtures 166 · scripts/regression 125 · review/445-verify 59 · review/449-verify 36 · review/453-verify 32 · review/446-verify 29 · scripts/fixtures 21 · review/448-verify 19 · review/452-verify 19 · .cursor/skills 18 · app/api 17 · public/_verify146 10 · review/444-verify 10 · review/450-verify 10 · review/451-verify 6 · (루트) 5 · lib/cost 4 · supabase/migrations 4 · app/create 3 · lib/illustrations 2
- 결제·인증 경로 변경 0개(app/api/billing·app/billing·lib/toss·app/auth·lib/billing*·components/Billing*)

## 플래그 기본값 ↔ docs/v4-overview.md — 합격
- NEXT_PUBLIC_DESIGN_V4: 코드 일치 · 문서(켬) 일치
- NEXT_PUBLIC_DESIGN_POLISH: 코드 일치 · 문서(켬) 일치
- NEXT_PUBLIC_HERO_V2: 코드 일치 · 문서(켬) 일치
- NEXT_PUBLIC_HERO_STAGE: 코드 일치 · 문서(끔) 일치
