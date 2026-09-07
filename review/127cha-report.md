# 127차 — 라이프스타일 합성 실사진 유료 검증 (실제 폼 경로, 1회)

생성: 2026-09-07  
비용 승인: 직전 **A. 폼 E2E 1회 + Replicate 상한 $1** (재시도 없음).  
본 메시지에 “Replicate 1회”가 재기재되었으나, 직전 명시 승인 A($1)로 진행함.  
코드 수정: **없음**. 검증 후 `.env.local`의 `TEST_MODE`는 백업에서 **true로 복구**.

---

## 0. 체크리스트

- [x] 실제 폼(`/create/detail`) 브라우저 경로로 1회 테스트
- [x] 합성 결과(스킵) 원본 첨부 — 합성 미첨부(스킵)이므로 스킵 직전 라이프스타일 원본 + 결과 페이지 스크린샷
- [x] 콘솔 로그 원문 첨부 (`productHeightCm` / `shouldAttempt` / skip reason)
- [x] Replicate 호출 횟수·비용 명시
- [x] 손 대비 제품 크기 육안 판단 한 줄
- [x] 코드 수정 없음

---

## 1. 실행 요약

| 항목 | 결과 |
|------|------|
| 경로 | `/create/detail` → draft → **승인하고 최종 생성** 1회 → `/create/result?id=44fbc437-b309-4a05-9809-7cc3f80f056e` |
| 제품 사진 | 앰버 드롭퍼 세럼 (`84cha-labeled-serum-hands-input-product.png` ×7장, 폼 최소 7장) |
| 라이프스타일 | 손바닥 위로 펼친 빈손 씬 (`112cha-lifestyle-empty-scene.png`) |
| 제품 높이 | **9** (실측값 없음 → 지시값 9) |
| 합성 | **스킵** (`requirePixelPaste` 경로, nano-banana 폴백 없음) |
| 스킵 이유 | `safeguard-not-overlapping-hand-region` |
| UI 표시 총비용 | **$0.2250** ($1 상한 내) |
| 재시도 | 없음 |

---

## 2. 육안 판단 (필수 한 줄)

**합성 스킵으로 손 대비 제품 크기 판정 불가(제품이 붙여지지 않음).**

(이분법 “자연스러움 / 과대·과소함”은 합성본이 없어 적용 불가. 스킵은 실패로 보지 않음 — 게이트 정상 동작.)

---

## 3. 첨부 파일 (원본)

| 파일 | 설명 |
|------|------|
| `review/127cha-lifestyle-skip-source.png` | 스킵 직전(=합성 미적용) 라이프스타일 원본 — 손만 있고 제품 없음 |
| `review/127cha-product-source.png` | 업로드한 제품 원본 |
| `review/127cha-result-page.png` | 최종 결과 페이지 풀스크린 |
| `review/127cha-height-field.png` | 제출 전 높이 필드=9 |
| `review/127cha-form-before-submit.png` | 제출 직전 폼 뷰포트 |
| `review/127cha-console-evidence.log` | 클라이언트+서버 필터 로그 원문 |
| `review/127cha-client-console.log` | 브라우저 hooked 로그 |
| `review/127cha-server.log` / `127cha-server-err.log` | 서버 전체 로그 |

---

## 4. 콘솔 로그 원문 (`review/127cha-console-evidence.log`)

```
===== CLIENT (browser hooked console during approve→result) =====
[126cha][draft] runPhotoEnhancementPipeline productHeightCmRaw="9" parsed=9 productSizeHint=null lifestyleImageUrl=true
[photo-pipeline] studioLimit=3 uploaded=7 passthrough=4
[enhance] idx=0 backdrop=hero
[enhance] idx=1 backdrop=ingredient
[enhance] idx=2 backdrop=texture
[enhance] idx=3 skip studio composite — keep original (lifestyle pool)
[enhance] idx=4 skip studio composite — keep original (lifestyle pool)
[enhance] idx=5 skip studio composite — keep original (lifestyle pool)
[enhance] idx=6 skip studio composite — keep original (lifestyle pool)
[enhance-image] done uploaded=7 kept=7 extras=2 fallbackOriginals=0
[125cha][photo-pipeline] lifestyle scale shouldAttempt=true productHeightCm=9 hint=null
[125cha][photo-pipeline] POST /api/lifestyle-composite body.productHeightCm=9 body.productSizeHint=null
[photo-pipeline] enableAiLifestyleShots=false
[photo-pipeline] AI lifestyle shots skipped — enableAiLifestyleShots not opted in
[photo-pipeline] uploaded=7 enhanced=9 passthrough=4 finalUnique=9

===== SERVER (filtered) =====
[replicate] CALL flux-kontext-pro x2 (sequential)
[cost] generateBackdrop (flux-kontext-pro x2): $0.0800
[replicate] CALL flux-schnell (section-backdrop ingredient)
[replicate] CALL flux-schnell (section-backdrop texture)
[cost] generateSectionBackdropVariants: $0.0060
 POST /api/section-backdrops 200 in 11.0s
[cost] sharpenCutout: clarity-upscaler ON (TEST_MODE=false): $0.0160  (다수)
[cost] enhanceProductImage rembg: $0.00141  (다수)
[cost] generateDecorativeGraphic (flux-schnell): $0.0030
[125cha][api/lifestyle-composite] body.productHeightCm=9 parsed=9 shouldAttempt=true
[hand-placement-retry] ensembleEnabled=false
[hand-placement] confidence=high hands=true grip=true(log-only) handRegions=1 graspRegions=1 reliable=false reject=not-overlapping-hand-region box=(35.0,45.0,20.0x35.0) rot=15.0 face=null hands=#1=(28.0,40.0,18.0x25.0) grasps=g1=(38.0,50.0,8.0x15.0)
[hand-placement-retry] attempt=1/3 reliable=false reject=not-overlapping-hand-region graspOverlap=0.171
 POST /api/lifestyle-composite 200 in 11.5s
[lifestyle-composite] stage=direct-paste skipped, reason=safeguard-not-overlapping-hand-region
```

핵심 확인:
- `productHeightCm=9`가 draft → photo-pipeline → API body까지 그대로 전달됨.
- `shouldAttempt=true`.
- `requirePixelPaste` 경로에서 paste 스킵 (`safeguard-not-overlapping-hand-region`).

---

## 5. Replicate 호출 횟수·비용

### UI 표시 (결과 페이지)
- **총 $0.2250**
- 이미지 $0.1314 = 배경 $0.0800 · 섹션배경 $0.0060 · 보정 $0.0370
- 카피 $0.0516 · 조립 $0.0936

### 서버 로그 기준 Replicate (명시 CALL / cost 라인)

| 구분 | 로그 | 근사 단가×횟수 |
|------|------|----------------|
| 히어로 배경 | `CALL flux-kontext-pro x2` | $0.04×2 = **$0.0800** |
| 섹션 배경 | `CALL flux-schnell` ×2 (ingredient/texture) | $0.003×2 = **$0.0060** |
| 장식 | `generateDecorativeGraphic (flux-schnell)` | **$0.0030** |
| 보정 rembg | `enhanceProductImage rembg` ×4 슬롯 | ~$0.00141×4 ≈ **$0.0056** |
| clarity | `clarity-upscaler ON` 다수 (일부 HTTP 429 폴백) | 로그상 ON 다수, 실제 과금은 폴백으로 일부 미과금 가능 |
| 라이프스타일 | rembg 후 Vision → **paste 스킵** (nano-banana 폴백 없음) | rembg 소액 + Claude Vision(비-Replicate) |

**명시 `[replicate] CALL` 라인: 3줄 (kontext x2 포함 시 실행 횟수는 kontext 2 + schnell 2 = 최소 4회 배경 계열 + decor/enhance rembg·clarity 추가).**  
라이프스타일 합성 자체는 paste 스킵으로 nano-banana **0회**.

$1 상한 준수. **추가 재시도 없음.**

---

## 6. 발견 버그/이슈 (고치지 않음 — 리포트만)

1. **스케일 검증 미도달:** `productHeightCm=9`·`shouldAttempt=true`인데 Vision이 `reject=not-overlapping-hand-region` (graspOverlap=0.171) → `requirePixelPaste`로 paste 스킵. 손 대비 물리 스케일 육안 검증은 이번 1회에서 불가.
2. **빈손 컵 포즈 vs 박스:** 손이 보이는데도 placement box가 hand region과 겹침 판정 실패 — 게이트/세이프가드 민감도 이슈 가능 (다음 라운드).
3. **env 주의:** `BACKDROP_PROVIDER=flux-kontext-pro`는 후보 수를 `BRIA_BACKDROP_CANDIDATES`(기본 2)로 읽어, `BACKDROP_CANDIDATES=1` 설정과 무관하게 kontext **2회** 호출됨.
4. 폼 submit 시점 `[126cha][create-form]` 콘솔은 페이지 이동으로 유실 — draft 승인 시점 `[126cha][draft] … productHeightCmRaw="9"`로 대체 확인.

---

## 7. 코드 수정

**없음.** (검증 전용. `TEST_MODE=false`는 승인된 라이브 검증용 일시 설정 후 백업 복구.)
