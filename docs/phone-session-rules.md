# 폰/클라우드 세션 규칙 (461차)

**왜**: Supabase 무료 플랜 Cached Egress가 5GB 대비 754%로 초과됐고(원인 추정: 검증이 실사진을 반복해서 내려받음), Pro 결제는 사용자가 할 수 없다. R2 이전(`docs/migration-r2/README.md`)이 끝나기 전에는 **어디서도 실사진·이미지 업로드·원격 이미지 로드 검증을 하지 않는다.**

## 해도 되는 것
- 코드·문서 수정
- `npx tsc --noEmit`
- 파일만 읽는 정적 회귀를 **그 파일 하나씩 단독 실행**(브라우저·네트워크 없음) — 예: `npx tsx scripts/regression/heavy-guard-461.ts`

## 하면 안 되는 것
- 캡처, PNG 대조(`png-compare`), 퍼징(`fuzz-*`), `pc-verify`, `launch-smoke`, `eye-capture`·`live-capture`·`section-sheet` 등 Playwright를 쓰는 모든 도구
- `next build`, `next dev`, 전체 회귀(`run-all`)
- Supabase·R2·외부 호스트로의 네트워크 호출, 사진 다운로드·업로드
- 유료 API 호출, 실제 키·`.env*` 열람·생성·커밋

## 가드 (`scripts/lib/heavy-guard.ts`)
무거운 도구는 파일 맨 위에서 `assertHeavyEntry(이름, require.main === module)`을 호출한다(그 파일을 직접 실행했을 때만 검사하므로, 회귀가 순수 함수만 가져다 쓰는 경우에는 영향이 없다).
- **거부 조건**: `CLAUDE_CODE_REMOTE=true`, `CI=true`, `PZ_PHONE_SESSION=1` 중 하나가 있고 `PZ_ALLOW_HEAVY=1`이 없을 때 → 이유 한 줄을 출력하고 종료 코드 **2**.
- **설계 원칙**: 판단은 **환경변수만** 본다. 변수가 하나도 없거나 판단이 불확실하면 **허용**한다 — 집 PC를 막지 않는 방향이다(집 PC에는 이 변수들이 없다).
- 집 PC에서 일부러 CI 환경 등으로 돌려야 하면 `PZ_ALLOW_HEAVY=1`을 명시한다.
- 새 무거운 도구를 만들면 가드를 넣는다. 전수 여부는 `scripts/regression/heavy-guard-461.ts`가 검사한다(`playwright`/`chromium`을 쓰거나 그런 파일을 가져오는 `scripts/` 파일 전부).
