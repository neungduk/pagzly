# 99차 — 상세페이지 이미지 1장 30회 반복 (다양성)

생성: 2026-09-03

## 근본 원인 확정

| 갈래 | 판정 | 근거 |
|------|------|------|
| (1) enhance 실패 → 풀에서 사진 삭제 | **현재 코드 경로 아님** | `lib/photo-pipeline-client.ts` `enhanceImages`가 이미 `results.push(enhanced ?? item)` / catch 시 원본 push. 실패해도 슬롯 길이는 유지됨. |
| (2) 배정/인덱스 폴백이 0번으로 수렴 | **증상과 일치 (주원인)** | DOM에 상품컷 고유 1장(`…-fx-moisture`)만 30회 → 섹션 `imageIndex`가 사실상 동일 슬롯. `assignDistinctSectionImages`는 `imageCount === 1`이면 조기 반환(재분산 없음). parse 단계 `clampIndex`는 범위 밖을 **0**. HTML export·`ColorVariationInteractive`는 `?? imageUrls[0]`. 렌더러 `resolveImage`는 빈 문자열 반환(0 폴백 아님). |

**DB 실측:** Supabase MCP `execute_sql`은 `28P01 password authentication failed`로 실패. 로컬 `.env` 프로젝트(`sblnthhayvrfkvaksest`) anon REST는 RLS로 `49f8192b-…` 행 조회 `[]`. service role 키 없음 → **enhanced 행 개수는 DB로 확정 못 함**. 교체 패널 5장 vs DOM 상품컷 1장은 “풀에 URL이 있어도 배정이 한 인덱스에 몰린” (2) 패턴과 맞음. moisture FX는 그 인덱스 URL을 덮어쓴 결과로 파일명이 `-fx-moisture`로 보임.

## 작업 내용

### A — 원인 대응
- enhance: 원본 폴백 유지 + `fallbackOriginals=N` 요약 로그 강화 (`[enhance-image] done …`).
- assign: 잘못된 prefer/폴백이 **항상 0**이 되지 않도록 least-used/`resolveIndexPreferUnused`.
- export HTML / ColorVariation: `?? imageUrls[0]` 제거.

### B — 반복 상한 + 연속 회피
- `maxUses = min(ceil(slots/N), floor(slots/2))` (N≥2).
- round-robin 미사용 우선, 연속 동일 컷 hard avoid, image_text 인접 후처리.
- 로그: `[assign-images] unique=… slots=… maxRepeat=… imageCount=… freq=…`

### C — 사용자 안내
- 결과 페이지: 고유 상품 사진 ≤3장이고 슬롯이 많으면  
  `사용 가능한 사진이 N장뿐이라…` 한 줄 노출.
- `shouldWarnSparseProductImages` / `countPlacements` export.

## 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 errors |
| `npx tsx scripts/99cha-assign-images-smoke.ts` | 5장: unique=5 maxRepeat=4 adj=0 / 2장: max=8(=half) adj=0 / sparse warn OK |
| `verify-54cha-quick-points.ts` | PASS (회귀 없음) |
| 글로위스트 v3 재생성 DOM 실측 | **미실행** — 비용·인증 제약. 코드 배포 후 사용자가 재생성해 스니펫으로 unique≥5 확인 필요 |
| 히알루론 회귀 | 로직 재생성 없음(소급 금지). 배정 스모크·54차 패스로 회귀 리스크 낮음 |

## 변경 파일
- `lib/assign-section-images.ts`
- `lib/photo-pipeline-client.ts`
- `lib/export-detail-html.ts`
- `components/ColorVariationInteractive.tsx`
- `app/create/result/page.tsx`
- `app/api/generate/route.ts` (로그 주석)
- `scripts/99cha-assign-images-smoke.ts`
- `review/99cha-report.md`
