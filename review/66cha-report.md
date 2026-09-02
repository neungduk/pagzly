# 66차 완료 보고 — 라이프스타일 합성 파이프라인 배선 핫픽스

생성: 2026-09-02

---

## 배경 (검증 시 확인)

독립 검증에서 `draft/page.tsx`는 `lifestyleImageUrl`을 넘기지만, **합성 결과가 최종 페이지에 노출되지 않는** 문제가 있었습니다. 원인은 두 가지였습니다.

1. **파이프라인 push 조건 버그:** `composited && path`가 모두 있어야만 `finalImages`에 추가 → storage 업로드 실패 시 합성 성공해도 이미지 누락
2. **섹션 배정 누락:** `assign-section-images.ts`가 `lifestyle-composite` path 마커를 인식하지 않아, 추가된 합성 컷이 usage/gallery 슬롯에 우선 배정되지 않음

호출부 자체(`fetch("/api/lifestyle-composite")`)는 이미 `photo-pipeline-client.ts`에 존재했으나, 위 두 문제로 **실사용 효과가 없었습니다.**

---

## 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/photo-pipeline-client.ts` | `PhotoPipelineStage`에 `"lifestyle-composite"` 분리, push 조건 완화(`composited`+url), path 폴백 |
| `lib/lifestyle-shot-planner.ts` | `isLifestyleCompositePath()` / `LIFESTYLE_COMPOSITE_PATH_MARKER` 추가 |
| `lib/assign-section-images.ts` | 합성 컷 인덱스 우선 배정(usage_scenario·gallery 등) |
| `app/create/draft/page.tsx` | `lifestyle-composite` 스테이지 → enhancing 오버레이 매핑 |
| `scripts/66cha-lifestyle-e2e-qa.ts` | E2E 스크립트 (신규) |
| `scripts/66cha-verify-composite-assignment.ts` | 슬롯 배정 단위 검증 (신규) |

---

## grep 근거 (호출부 존재)

```
lib/photo-pipeline-client.ts
419:  lifestyleImageUrl?: string | null;
618:  if (params.lifestyleImageUrl) {
626:      const compositeRes = await fetch("/api/lifestyle-composite", {
630:          lifestyleImageUrl: params.lifestyleImageUrl,
```

---

## `npx tsc --noEmit`

66차 관련 **에러 0건** (저장소 전체 1건 — `review/pixabay-cosmetics-test/crawl-pixabay.mts` 기존 이슈).

---

## 검증 체크리스트

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` 에러 0건 (관련) | ✅ |
| `runPhotoEnhancementPipeline()` 파라미터에 `lifestyleImageUrl` | ✅ (419행) |
| 본문에서 `/api/lifestyle-composite` 호출 | ✅ (626행, grep 위) |
| E2E — 라이프스타일 업로드 → 파이프라인 합성 호출 | ✅ (서버 로그, 아래) |
| E2E — 최종 페이지 합성 이미지 노출 | ⚠️ `/api/generate` **402** (크레딧 부족)로 result 페이지 미도달 |
| 슬롯 배정 — `usage_scenario`에 composite 인덱스 | ✅ (단위 테스트) |
| 라이프스타일 미업로드 시 회귀 | ✅ (조건 분기 `if (params.lifestyleImageUrl)`) |
| `lifestyle` vs `lifestyle-composite` 스테이지 분리 | ✅ |

---

## E2E (유료 파이프라인 1회 시도)

**스크린샷**

| 파일 | 바이트 |
|------|-------:|
| `review/qa-screenshots/66cha-e2e-form-with-lifestyle.png` | (폼 + 라이프스타일 업로드 확인) |

**dev 서버 로그 (draft → final 생성 중)**

```
[lifestyle-composite] CALL nano-banana
[cost] lifestyle-composite: $0.0395
POST /api/lifestyle-composite 200 in 28.7s
POST /api/generate-lifestyle-shots 200 in 378ms  (IMAGE_ROUTER disabled — skip)
POST /api/generate 402 in 361ms  ← 크레딧 부족으로 최종 페이지 생성 중단
```

→ **파이프라인 배선은 동작 확인.** 합성 API 1회 성공($0.0395). 최종 상세페이지 스크린샷은 크레딧 충전 후 재검증 필요.

**슬롯 배정 단위 테스트**

```
npx tsx scripts/66cha-verify-composite-assignment.ts
[66cha] composite assignment ✓ usage_scenario→3, customer_scenario→1
```

---

## 비용

| 호출 | 횟수 | 비용 |
|------|------|------|
| `/api/lifestyle-composite` (E2E 중) | **1회** | **~$0.0395** |
| `/api/generate` final | 0회 (402) | $0 |

---

## 비고

- 64차 QA 스크립트는 `compositeProductOnLifestylePhoto()`를 **직접** 호출 — 파이프라인 E2E와 별개였음.
- 이번 핫픽스로 합성 컷이 `finalImages`에 들어가고 `usage_scenario` 등 라이프스타일 슬롯에 우선 배정됨.
- 최종 페이지 노출은 크레딧 충전 후 `npx tsx scripts/66cha-lifestyle-e2e-qa.ts` 재실행으로 완료 가능.
