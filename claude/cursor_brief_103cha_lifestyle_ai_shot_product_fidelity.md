# 103차 — AI 인물 사용샷: 제품이 통째로 다시 그려지는 문제 (크기·라벨 왜곡)

생성: 2026-09-03
전제: 102차와 같은 실비용 생성 건(상품 `a4e33e41-2348-40b6-b6b8-2536ce17ac3e`, glowiest 35mL 미스트, 실제 제품 사진 9장 업로드, 인물 사진 미업로드)의 결과물을 사용자가 보고 지적: **"사람이 든 화장품 사이즈가 저런 사이즈가 아닌데 너무 이상하게 크게 나온다."**

원인을 코드로 추적한 결과, **크기보다 더 근본적인 문제**가 확인됐습니다.

## 확인된 사실 — 사용샷의 제품은 실제 제품이 아닙니다

`…-lifestyle-ai-1.png` 파일명이 제품 이미지 UUID로 시작해 "합성"처럼 보이지만, 실제 경로는 **img2img 재생성**입니다.

1. `lib/generate-lifestyle-shots.ts:150-160` — `router.generateImage({ taskType: PRODUCT_LIFESTYLE_EDIT, productImages: [{url: heroRef}], ... })`
2. `lib/image-router/routing/premium-routing.ts:103-110` — quality=`standard` + productImageCount=1 → **kontext**로 라우팅
3. `lib/image-router/providers/kontext-replicate-client.ts:65-87` —
   ```ts
   const replicateInput = { prompt, aspect_ratio: "match_input_image", output_format: "png" };
   if (sourceUrl) replicateInput.input_image = sourceUrl;
   await replicate.run("black-forest-labs/flux-kontext-pro", { input: replicateInput, ... });
   ```

즉 참조 이미지 1장 + 프롬프트를 주고 **확산모델이 장면 전체를 새로 그립니다.** 마스크도, 원본 픽셀을 잘라 붙이는 코드도 이 경로에 없습니다. `kontext-prompts.ts:4-9`의 "Preserve the product exactly"는 문구일 뿐 강제력이 없습니다.

**결과적으로 이미지 속 병의 크기뿐 아니라 라벨 문자·캡 형태·병목 비율·유리 질감이 전부 모델이 재해석한 것입니다.** 판매 상세페이지에 실제와 다른 제품 이미지가 실리는 것이므로, 크기 문제보다 우선순위가 높습니다. 97차에서 잡았던 라벨 환각과 같은 계열의 문제가 이 경로로 다시 들어온 셈입니다.

**파일명이 착시를 만든 이유**: `generate-lifestyle-shots.ts:38-44` `deriveBasePath()`가 hero의 storage path에서 접미사만 갈아끼웁니다(176행).

**진짜 픽셀 합성 경로는 따로 있고 이번엔 실행되지 않았습니다.** `photo-pipeline-client.ts:618` `if (params.lifestyleImageUrl)` — 사용자가 인물 사진을 올렸을 때만 `/api/lifestyle-composite`가 돌고, 손 영역 검출과 크기 가드(`detect-held-object-placement.ts:267-271`, wPct 3~75%)도 거기에만 있습니다.

## 크기가 특히 크게 틀어진 이유

1. **물리 크기 정보가 파이프라인에 아예 없습니다.** `planLifestyleShots` 파라미터(`lifestyle-shot-planner.ts:106-113`)에 치수·용량 필드가 없고, `buildHumanShots`의 프롬프트 3종(72-101행)에 mL·cm·handheld 같은 단어가 전혀 없습니다. **폼에도 용량 입력란이 없습니다**(`CreateProductForm.tsx:524-530` 전송 필드에 용량 없음). 모델은 "미스트 병"의 일반적 사전확률(200~300mL 대용량)로 그립니다.
2. **참조 이미지가 스케일 단서를 지운 컷입니다.** `photo-pipeline-client.ts:697`이 `heroRef = finalImages[0]`, 즉 누끼를 따서 생성 배경에 올리고 장식까지 얹은 enhanced hero를 넘깁니다. 주변 사물도 손도 없어 크기 추정 단서가 0입니다.
3. **후처리 검증이 없습니다.** `generate-lifestyle-shots.ts:162-192`은 status와 URL 존재만 확인합니다. `lib/image-router/quality/kontext-quality-eval.ts`는 만들어져 있으나 리포 어디에서도 import되지 않습니다.

**부수 버그**: `kontext-replicate-client.ts:69`의 `aspect_ratio: "match_input_image"` 하드코딩 때문에 플래너가 지정한 3:4 / 2:3(`lifestyle-shot-planner.ts:74, 81, 96`)이 전부 무시됩니다.

## 작업 A — 스케일 정보 주입 (즉시 실효, 난이도 중)

1. **폼에 용량/크기 입력란 추가**: `CreateProductForm.tsx`에 `productSizeHint`(예: "35mL, 높이 약 9cm") 필드를 추가하고 전송 body에 포함하세요. 화장품 카테고리는 특히 용량이 핵심 스펙이라 상세페이지 카피에도 재사용 가치가 있습니다.
2. **파이프라인 관통**: `photo-pipeline-client.ts:696-706` body → `app/api/generate-lifestyle-shots/route.ts:20-30` → `generateLifestyleShots` → `planLifestyleShots` → `buildHumanShots`까지 `productSizeHint`를 전달하세요.
3. **프롬프트에 스케일 문장 삽입** (`lifestyle-shot-planner.ts:63-104`). 값이 있으면 다음 취지의 문장을 반드시 포함:
   > "The product is a small 35mL glass bottle, approximately 9cm tall, fitting entirely within one palm. Render it at true handheld scale — the bottle must appear smaller than the person's hand span."

   값이 없으면 카테고리 기본 문구(화장품 미스트/세럼 = 손에 잡히는 소용량)라도 넣으세요.
4. **참조 이미지를 원본 업로드 컷으로 교체** (`photo-pipeline-client.ts:697`). enhanced hero 대신 원본을 넘기면 촬영 맥락이 남아 스케일 추정에 유리합니다.
5. `kontext-replicate-client.ts:69`의 `aspect_ratio` 하드코딩을 `input.request.aspectRatio`로 교체하세요(난이도 하).

## 작업 B — 생성 후 검증 게이트 (난이도 중)

`generate-lifestyle-shots.ts:162` 직후, 업로드 전에 Vision 검증을 넣고 **실패하면 그 컷을 버리세요**(재시도 1회 후에도 실패하면 사용샷 없이 진행).

판정 항목:
- 제품이 인물의 손 폭보다 크게 그려졌는가 (크기 이상)
- 병 형태·캡 색·라벨 배치가 원본과 확연히 다른가 (환각)
- 사람 손·손가락이 기형인가

이미 만들어져 있으나 배선되지 않은 `lib/image-router/quality/kontext-quality-eval.ts`를 이 자리에 연결하는 것을 우선 검토하세요. 폐기·재시도 건수는 로그로 남겨 주세요: `[lifestyle-ai] generated=N rejected=M reason=…`

## 작업 C — 사용자 고지 및 기본값 (난이도 하, 판단 필요)

현재 폼 문구는 100차에서 수정됐지만, **"AI가 제품 자체를 다시 그린다"는 사실**은 여전히 판매자에게 전달되지 않습니다. 최소한 다음 중 하나를 적용하세요.

- (권장) AI 인물 사용샷을 **옵트인**으로 바꾸고, 체크박스 옆에 "AI가 인물과 제품을 새로 그립니다. 실제 제품과 형태·크기가 다를 수 있으니 게시 전 확인해 주세요"를 명시.
- 또는 생성된 사용샷 위에 편집 화면에서 "AI 연출 컷" 배지를 표시하고, 결과 페이지의 AI 고지 섹션 문구를 이 경우에 맞게 강화.

**이 판단은 사용자(개발자) 확인이 필요합니다.** 경쟁 도구도 AI로 인물컷을 만들지만, 제품까지 재생성하는지는 확인되지 않았습니다. 무엇을 택할지 물어보고 진행하세요.

## 하지 않는 것 (별도 라운드에서 논의)

**근본 수정 — 픽셀 합성 전환**은 이번 범위 밖입니다. 방향만 기록합니다:
(a) Kontext로 **제품이 없는 빈 인물 씬**만 생성 → (b) `detectHeldObjectPlacement`로 손·grasp 영역 검출 → (c) 입력받은 실물 치수와 검출된 손 폭(픽셀)으로 **물리적으로 옳은 스케일 계수** 계산 → (d) 원본 누끼를 그 크기로 붙여넣기. 필요한 부품(`lifestyle-product-composite.ts`, `detect-held-object-placement.ts`)은 64~93차에 이미 만들어져 있습니다. 이 방식이라야 "35mL"가 스케일 계산에 실제로 쓰이고 라벨도 진짜가 됩니다.

중복·카피매칭 문제는 104차에서 다룹니다.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 35mL 미스트로 재생성 후 사용샷에서 **병이 손 안에 들어오는 크기**로 나오는지 육안 확인.
- `[lifestyle-ai]` 로그에 스케일 문구가 프롬프트에 포함됐는지, 검증 폐기 건수가 찍히는지 확인.
- `aspect_ratio` 수정 후 플래너가 지정한 3:4 / 2:3가 실제 출력에 반영되는지 확인.

## 완료 보고 체크리스트

- [ ] 폼에 용량/크기 입력란 추가
- [ ] `productSizeHint` 파이프라인 관통 (폼 → 프롬프트)
- [ ] `buildHumanShots` 프롬프트에 스케일 문장 삽입
- [ ] 참조 이미지를 원본 업로드 컷으로 교체
- [ ] `aspect_ratio` 하드코딩 제거
- [ ] 생성 후 Vision 검증 게이트 + 폐기/재시도 로그
- [ ] 사용자 고지 방식 결정 후 반영 (사용자 확인 필요)
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 재생성 육안 확인 결과 기록
