# 136차 — 데드 코드 정리 (knip + grep 이중 확인)

생성: 2026-09-07  
유료 API: **0**  
`TEST_MODE=true`  
비즈니스 로직 변경: **없음** (삭제만)

## 방법론 요약
1. `npm i -D knip` → `npx knip` → `review/136cha-knip-report.txt` (원문 저장)
2. 비화이트리스트 후보 grep 재확인
3. 화이트리스트 제외
4. 확정분만 그룹 커밋 삭제
5. tsc / `npm run build` / 결과 화면 스모크

## 1) knip 원문
`review/136cha-knip-report.txt`

요약 규모 (원문 기준):
- Unused files: **196** (대부분 `scripts/**`, `review/**`, `supabase/functions/**` + knip entry 오탐)
- Unused exports: **277**
- Unused exported types: **102**
- Unused devDependencies: `playwright` (오탐 — 캡처 스크립트가 사용)

### knip 오탐 사례 (삭제하지 않음)
| 항목 | 사유 |
|------|------|
| `lib/copy-orchestrator/*` 전체 파일 unused | 파이프라인·스크립트에서 사용. knip이 Next/스크립트 entry를 못 잡음 |
| `lib/page-pipeline/*` | `scripts/test-page-pipeline-step10.ts`가 import |
| `lib/canvas-section-fixture.ts` | canvas QA 스크립트들이 import |
| `lib/detail-export-score.ts` / `detail-page-score.ts` | `scripts/verify-detail-upgrade.ts` |
| `lib/cost/index.ts` | `scripts/test-*-step*.ts`에서 `@/lib/cost` import |
| `playwright` unused dep | scripts 캡처에서 사용 |
| 대량 `image-router/index.ts` re-export | barrel — 내부/테스트에서 사용 다수 |

## 2) 파일 후보 grep 재확인
`review/136cha-file-grep.csv`

| 파일 | 판정 |
|------|------|
| `components/HeroShowcaseVisual.tsx` | **삭제** — app/components/lib/scripts 참조 0 |
| `lib/copy-orchestrator/*` | 유지 (오탐) |
| `lib/page-pipeline/*` | 유지 (스크립트 전용, scripts 화이트리스트 의존) |
| `lib/canvas-section-fixture.ts` 등 | 유지 (scripts) |
| `scripts/**`, `review/**`, `supabase/functions/**` | 화이트리스트 — 삭제 금지 |

## 3) export 후보 분류
- outside-ref 0: `review/136cha-export-delete-candidates.csv` (71)
- 그중 파일 내부 사용 0 (완전 데드): `review/136cha-fully-dead-exports.csv` (15)
- 내부만 사용 (export만 unused): `review/136cha-internal-only-exports.csv` (56) → **유지** (export 키워드만 제거하는 리팩터 금지)

### 완전 데드 중 삭제하지 않고 후보만 남긴 것 (SSOT/예약)
| export | 사유 |
|--------|------|
| `SIGNUP_FREE_TOKENS` | 마이그레이션 주석·과금 SSOT, “다음 라운드 연결” 예약 |
| `FREE_RETRY_LIMITS` / `RETRY_OVERAGE_TOKEN_COST` | 동일 — 과금 설계 상수 |
| `PLANNED_COST_PER_TOKEN_KRW` | 가격 SSOT |
| `TOKEN_COST_PER_COMPLETION` | `getCompletionTokenCost` 내부 사용 (분류상 internal) |

## 4) 실제 삭제 목록 (커밋 단위)

### commit `b6bcaa0` — components
- `components/HeroShowcaseVisual.tsx` (파일 삭제)

### commit `7a31e48` — lib exports
- `countDistinctSectionImages` — `lib/assign-section-images.ts`
- `canvasFramePaddingBottom` — `lib/canvas-section-layout.ts`
- `lifestyleAiIndexesFromPaths` (+ 잔여 unused import) — `lib/generate-lifestyle-shots.ts`
- `INSTAGRAM_FEED_SIZE` — `lib/instagram-feed.ts`
- `resetKontextReplicateClientForTests` — `lib/image-router/providers/kontext-replicate-client.ts`
- `SECTION_BG_PATTERN_B_ALPHA`, `isBoldPattern`, `DECORATION_ALLOWED_SECTION_TYPES`, `SECTION_GAP_CLASS`, `SECTION_PADDING_CLASS`, `TYPOGRAPHY` — `lib/design-tokens.ts`

### commit `77d5e98` — tooling + root logs
- `knip` devDependency (`package.json` / lock)
- `git-stat-full.txt`
- `_git_diff_verbatim.txt`

### commit `69958c2` — root broken filename
- `how --stat HEAD <broken-char> git-stat-full.txt`

## 5) 검증

### tsc
| | EXIT |
|--|--|
| 삭제 전 `review/136cha-tsc-before.txt` | **0** |
| 삭제 후 `review/136cha-tsc-after.txt` | **0** |

### build
`npm run build` → `review/136cha-build-output.txt` → **EXIT_CODE=0**

### 스모크
`npx tsx scripts/136cha-deadcode-smoke.ts` → EXIT 0  
- 모듈 import (section-inserts / design-tokens / assign-section-images)  
- `/create/result` 세션 시드 로드 + `detail-preview` 표시  
- 스크린샷: `review/qa-screenshots/136cha-result-smoke.png`  
- 신규 유료 generate 호출 없음

### 오탐 롤백
이번 라운드에서 삭제한 뒤 빌드/스모크가 깨져 되돌린 건: **0**

## 6) (선택) 루트 정리

| 항목 | 결과 |
|------|------|
| `cursor_brief_20~47cha_*.md` | `claude/`에 **동명 파일 없음** (SHA 비교 불가) → **보존**, 삭제 안 함 |
| `.env.local.127cha-bak` | `.env.local`과 **1바이트 차이** (동일하지 않음) → **보존** |
| `git-stat-full.txt` / `_git_diff_verbatim.txt` / broken `how --stat…` | **삭제 완료** |
| `MERGE_SUMMARY.md` / `PROGRESS_LOG.md` / 과금 설계 md | 범위 밖 — 미변경 |

## 남긴 후보 (다음 라운드 검토용)
- knip unused export 중 internal-only 56건 (export 키워드만 남는 형태)
- 과금 SSOT 미사용 상수 (`SIGNUP_FREE_TOKENS` 등) — 의도적 예약으로 보임
- `lib/page-pipeline/*` — 프로덕션 generate 경로와 별도 e2e 실험 파이프라인 (스크립트 의존)
- knip unused types 102건 — 타입 전용, 이번엔 미삭제
