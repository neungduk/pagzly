# 32차 — 남은 작업 전체를 순서대로 한 번에 진행

아래 A→B→C→D 순서를 지켜서 진행해달라. 각 단계 끝에 있는 "보고"만 남기고, **중간에 멈춰서
승인 기다리지 말고 이어서 진행**해도 된다(이미 방향 승인된 항목들). 단, 각 단계 표시된
"승인 필요" 항목만 구현 전에 멈추고 보고할 것.

---

## A. 31차 마무리 — section-backdrop을 flux-schnell 고정으로

**결정**: `IMAGE_ROUTER_ENABLED=true`로 그냥 켜지 않는다. 이유: 지금 구조는
`DETAIL_PAGE_GRAPHIC`(성분/텍스처 배경)가 품질 신호와 무관하게 무조건 Gemini로 라우팅돼서
flux-schnell 대비 비용이 27~38배 뛴다(`premium-routing.ts`의 `COMPLEX_COMPOSITION_TASKS`에
무조건 포함돼 있기 때문 — 코드로 확인 완료).

1. `lib/image-router/routing/premium-routing.ts`의 `shouldRouteToGemini()`에서
   `COMPLEX_COMPOSITION_TASKS.has(taskType)` 무조건 true 처리를 `DETAIL_PAGE_GRAPHIC`만
   빼거나, `productImageCount`/`priorQualityScore` 같은 기존 품질 신호 조건과 결합해서
   **"처음엔 flux-schnell, 결과가 나쁠 때만(prior quality 낮음) Gemini로 재시도"** 흐름이
   되도록 조건을 좁혀달라. `COMPARISON`/`FEATURE_HIGHLIGHT`는 이번 범위 아님 — 건드리지
   않는다.
2. `lib/photo-enhance.ts`의 `generateSectionBackdropVariants()`가 `tryGenerateImageViaRouter`
   호출 시 위에서 좁힌 조건에 맞게 동작하는지 확인.
3. (승인 필요 — 구현 전 먼저 보고) `buildGeminiImagePrompt()`의 `DETAIL_PAGE_GRAPHIC` task
   hint("Complex detail-page graphic with clear layout and readable composition.")가 성분/
   텍스처처럼 "비어있고 흐릿한 배경"을 원하는 경우엔 안 맞을 수 있다는 게 이미 확인된
   사실이다. 이걸 section-backdrop 전용 hint로 분리할지, 아니면 1번 조건 좁히기로 충분해서
   안 해도 되는지 판단해서 먼저 보고. 분리가 필요하다고 판단되면 그때 구현.

**보고**: 1~2번 구현 결과 + 3번 판단 근거.

---

## B. Router ON/OFF 비교 재실행

지난번 `GOOGLE_AI_API_KEY loaded: false`로 스킵됐던 걸 마저 실행한다. 스크립트가 `.env.local`을
못 읽는 원인(쉘 환경변수 주입 방식 문제인지, env 로더 코드 문제인지)부터 고치고,
`scripts/test-output/section-backdrop-compare-31/`에 저장하던 것과 같은 구조로 Router ON
결과(화장품 필수, 전자제품 가능하면)를 생성한다.

**보고**: Router ON 결과 이미지 경로 + 비용 로그. (A에서 조건을 좁혔다면 이번엔 Gemini가 안
쓰이고 flux-schnell 그대로 나오는 게 정상이다 — 그것도 정상 결과로 보고할 것.)

---

## C. 배포 — git push + Supabase 마이그레이션/함수 재배포

**C1. 26~32차 전체 커밋 + 푸시** (사용자 요청 "항상 푸시까지"):

```
git add app/login/page.tsx app/forgot-password/page.tsx app/auth/callback/route.ts app/reset-password/page.tsx
git add lib/section-templates.ts app/api/generate/route.ts
git add lib/concept-effects.ts lib/photo-enhance.ts
git add lib/concept-brief.ts review/reference-patterns.md review/upgrade-proposals.md
git add supabase/migrations/20260826163000_product_images_protected_until.sql
git add supabase/functions/cleanup-expired-images/index.ts
git add lib/product-image-protection.ts
git add app/api/protect-product-images/route.ts
git add app/api/generate-backdrop/route.ts lib/photo-pipeline-client.ts app/create/draft/page.tsx
git add components/CreateProductForm.tsx app/api/enhance-image/route.ts
git add lib/image-router/ lib/cost/pricing-config.ts
git add scripts/test-output/section-backdrop-compare-31/
git add cursor_brief_26cha_password_reset.md cursor_brief_27cha_detail_page_quality.md cursor_brief_28cha_image_composite_ghost_fix.md cursor_brief_29cha_deep_research_directive.md cursor_brief_30cha_source_image_expiry.md cursor_brief_31cha_image_router_safe_integration.md cursor_brief_32cha_full_sequence.md

git commit -m "26~32차: 비밀번호 재설정, 카피 길이 규율, 유령 사각형 수정, 카테고리 리서치, 원본 사진 조기 보호, ImageRouter 안전 통합"

git push
```

**C2. Supabase DB 마이그레이션** — `product_images.protected_until` 컬럼은 대시보드에서 이미
확인됨(8 컬럼). 이미 적용된 것으로 보이니 **재적용 스킵 가능** — 다만 `supabase migration list`
같은 명령으로 로컬 마이그레이션 이력과 실제 적용 상태가 일치하는지만 한 번 확인해달라(대시보드
SQL Editor로 수동 적용했을 가능성이 있어 CLI 이력엔 안 잡혀있을 수 있음).

**C3. Supabase Edge Function 재배포** — `cleanup-expired-images`는 14일 전 배포된 옛날 버전이
아직 프로덕션에 떠 있다(`protected_until` 로직 미반영). 아래로 재배포:

```
supabase functions deploy cleanup-expired-images
```

배포 후 대시보드에서 `cleanup-expired-images` 함수의 Updated 시각이 방금으로 바뀌었는지,
Cron/Schedule이 "매일 자정"으로 등록돼 있는지 확인.

**보고**: git push 완료(커밋 해시), 마이그레이션 이력 확인 결과, 함수 재배포 완료 확인.

---

## D. 배포 후 최종 라이브 E2E (1회)

`/create`에서 실제로 화장품/뷰티 상품 하나 끝까지 생성(`TEST_MODE=false`, 사진은 손으로 든
구도 아닌 것, 문제였던 2-바틀 사진 제외). 아래를 한 번에 확인:

1. **30차 회귀**: 생성 도중 `SOURCE_IMAGE_EXPIRED` 에러 없이 정상 완료되는지 (원본 사진이
   중간에 사라지지 않는지).
2. **28차 확인**: 히어로/이펙트 오버레이 이미지에 유령 사각형·이중노출 없는지 육안 확인.
3. **31차 확인**: 성분/텍스처 배경에 유리컵·카드·UI 없는지, Router 조건을 좁혔다면 비용 로그가
   과도하게 뛰지 않는지(`photoCostBreakdown` 확인).
4. 결과 페이지 URL과 스크린샷(또는 이미지 파일) 남길 것 — Claude가 재검증할 때 필요.

**보고**: 위 4개 항목 + 결과 페이지 id.

---

전부 끝나면 A~D 보고 내용을 한 번에 정리해서 알려주면 된다.
