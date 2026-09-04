# 106차 — Vision 견고화 + AI 사용샷 옵트인·배지 + 105 잔여 확인

생성: 2026-09-04  
전제: `TEST_MODE=true`, 유료 생성 미실행.

## 작업 A — Vision 역할 견고화

- 프롬프트: JSON **첫 키 = `roles`**, 그다음 `analysis` (강화 문구).
- `max_tokens=4096` 유지 + `tokenBudget responseChars/stop/images` 로그.
- roles 비면 roles-only 재시도 후에도
  `console.warn('[image-roles] vision roles 비어있음 — 순서 기본값 폴백', { reason, rawLength, … })`
- `mergeImageRolesWithVision`에서도 empty / all-low-conf 시 동일 warn.

검증: `npx tsx scripts/106cha-vision-roles-smoke.ts` PASS.

## 작업 B — 옵트인 + 배지 (3안)

### B-1 옵트인
- 폼 체크박스 기본 **해제**, 문구: 「AI 연출 사용샷 생성 (선택)」 + 형태·크기·라벨 경고.
- `photo-pipeline-client` / `/api/generate-lifestyle-shots` 모두 `enableAiLifestyleShots === true`일 때만 진행.
- 인물 업로드 → `/api/lifestyle-composite`는 옵트인과 **무관**.

검증: `106cha-optin-dry-run.ts` PASS.

### B-2 배지 (판매자 전용)
- 결과 미리보기: `origin === "ai-lifestyle"` → **AI 연출 이미지** 배지.
- PNG/ZIP 캡처: `prepareCaptureRoot`가 `[data-seller-only-badge]` 숨김.
- `buildDetailPageHtml` 출력에 배지 문자열 없음 (`106cha-export-no-badge` PASS).
- 사이드바 사진 선택 옵션에 `· AI 연출 이미지` 표시.

### B-3 origin 플래그
- `ProductImageOrigin`: original | enhanced | ai-lifestyle | composite | fx | compare | other
- 파이프라인에서 부여 → `imageOrigins` 세션/API/DB(`products.image_origins`) 저장.
- 배지·고지·assign의 lifestyle/composite 선별은 **origin 우선** (path 접미사는 폴백만).
- migration: `supabase/migrations/20260904090000_products_image_origins.sql` (원격 적용 필요).

### ai_disclosure
- AI 사용샷 포함 시: 「일부 연출 컷은 AI가 생성한 이미지이며…」로 조건부 강화.

## 작업 C — 105차 잔여 5항목

| # | 항목 | 상태 | 무비용 검증 |
|---|------|------|-------------|
| 2 | before/after gallery 강제 배정 해제 | **완료** | route append-only 로그; replay gallery에 compare 강제 없음 |
| 3 | ingredient circle 인덱스 중복 제거 | **완료** | `applyIngredientCircleVisual` alternate; replay circle ≠ ingredient |
| 6 | aHash 시각 유사도 dedup | **완료** | `image-ahash` + assign penalty; `105cha-ahash-matrix` PASS |
| 7 | 사용샷 Vision 게이트 배선 | **완료** | `evaluateLifestyleShotGate` on 기존 lifestyle-ai URL (sim≈0.64 pass) |
| 8 | 역할 부족 경고 + text_only | **완료** | `detectRoleShortages` + assign; `105cha-role-shortage-smoke` PASS; replay texture=text_only |

## 검증

- `npx tsc --noEmit` → 0
- 54 / 99 / 102 / 105(prompt·shortage) / 106 smokes PASS

## 사용자 액션

1. migration `image_origins` 원격 적용
2. 유료 1회는 별도 지시 시
