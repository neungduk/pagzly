# 30차 브리프 — 생성 도중 원본 사진이 사라져 전체 파이프라인이 무보정으로 폴백되는 결함

## 배경 — 28차 라이브 검증 중 우연히 발견

28차(유령 사각형 수정) 코드 검증(diff 100% 일치, `tsc --noEmit` 클린)은 이미 통과했다. 이어서
라이브 E2E로 실제 생성 결과를 육안 확인하려고 동일 입력(화장품/뷰티, "히알루론 딥 모이스처
세럼", 테스트용 Pexels 사진 7장)으로 실제 생성(`TEST_MODE=false`)을 **두 번 연속** 돌렸는데,
**둘 다 28차와 무관한 새로운 원인으로 실패**했다. 결과 페이지 둘 다(`id=7e96ea82-...`,
`id=fd77dce7-...`) `-enhanced`/`-fx-` 합성 이미지가 **0장** — 업로드한 원본 사진 그대로만
노출됐다.

콘솔 로그(양쪽 다 동일):

```
[generate-backdrop] API error: flux-kontext-pro 배경 생성에 모두 실패했습니다. 원인:
Error: Prediction failed: 400 Client Error: Bad Request for url:
https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/
d13edd16-c92e-478b-a678-2e7d9641a866/1787725142442-2acefa47-d5da-450c-a34f-c96564f60079.jpg
[generate-backdrop] attempt 1/2 returned null
[generate-backdrop] attempt 2/2 returned null
[generate-backdrop] FALLBACK: all 2 attempts failed
```

해당 URL을 브라우저로 직접 열어보니 Replicate가 보고한 "400 Bad Request"의 실체는 **Supabase
Storage 자체의 404**였다:

```json
{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}
```

이 파일은 업로드 로그상 **2026-08-26 06:19:02 UTC**에 생성됐고, `flux-kontext-pro`가 이 URL을
가져오려 시도한 시각은 콘솔 타임스탬프 기준 **오후 4:08~4:09 (KST) ≈ 07:08~07:09 UTC** —
업로드 후 약 **49분 만에** 스토리지에서 사라진 것이다. "3일 뒤 자동 삭제"라는 기존 설계
의도(아래 참고)와 시간 단위가 3자리 정도 차이 난다.

## 코드로 확정한 구조

### 1) 원본 사진은 "완성된 상품과 연결되기 전"까지 정리 대상 임시 테이블에만 잡혀 있다

`components/CreateProductForm.tsx` `uploadImages()` (213~251행):

```ts
// product_images: 완성되기 전 업로드된 이미지를 추적하는 임시 테이블.
// 상품 저장이 완료되면 /api/generate 에서 product_id를 연결해
// 3일 자동 삭제 대상에서 제외한다.
```

`supabase/migrations/20260812150000_restructure_products_and_product_images.sql` 8~12행도
동일하게 "**cleanup-expired-images 엣지 함수**"가 `product_images`의 3일 지난 미연결(orphan)
행을 정리하는 걸 전제로 설계돼 있다고 명시한다.

**중요**: 이 저장소(`pagelab/pagelab`) 전체를 `cleanup`, `cron`, `expired-images`로 검색해도
그 엣지 함수 자체는 어디에도 없다 — Supabase 프로젝트 쪽에 별도로 배포돼 있어서 이 저장소
미러/이 세션에서는 존재 여부·정확한 삭제 주기·삭제 조건 쿼리를 확인할 방법이 없다. 이 부분은
Cursor가 회사 PC/Supabase 대시보드 접근 권한으로 직접 확인해야 한다(아래 "확인 필요" 참고).

### 2) `product_id` 연결(=삭제 대상 제외)은 전체 생성이 다 끝난 뒤에야 일어난다

`app/api/generate/route.ts` 1447~1457행:

```ts
if (body.imagePaths?.length) {
  const { error: linkError } = await supabase
    .from("product_images")
    .update({ product_id: savedProduct.id })
    .eq("user_id", user.id)
    .in("storage_path", body.imagePaths);
  ...
}
```

이 블록은 `products` 테이블 insert(1410행)가 성공한 **뒤**, 즉 배경 생성(`flux-kontext-pro`
등) → 섹션 배경 → 개별 사진 보정 → 데코 → 아이콘 → 일러스트 → 이펙트까지 **생성 파이프라인
전체가 이미 다 끝난 뒤**에만 실행된다. 즉 사용자가 사진을 올리고 "승인하고 최종 생성"을 누른
순간부터 생성이 끝날 때까지(수십 개의 순차 Replicate 호출 — 짧아도 몇 분) 원본 사진은 계속
"미연결" 상태로 정리 대상 노출 구간에 놓여 있다.

### 3) 사진 1장이 사라지면 그 상품의 이미지 8장 전부가 무보정으로 폴백된다 (연쇄 실패)

`lib/photo-pipeline-client.ts` `runPhotoEnhancementPipeline()` 353~363행:

```ts
if (!backdropResult) {
  console.error(
    "[photo-pipeline] FALLBACK: generateBackdrop 실패 — 상품 전체 이미지를 원본 그대로 반환 ($0)",
  );
  return {
    images: uploaded,
    photoProcessingCost: 0,
    photoCostBreakdown: {},
    testMode: false,
  };
}
```

배경 생성(`generateBackdrop`)은 오직 **히어로로 쓰일 첫 번째 이미지(`imageUrls[0]`) 하나**만
입력으로 쓰는데, 이게 실패하면 `runPhotoEnhancementPipeline()` 자체가 여기서 즉시 종료되고
나머지 7장을 포함한 **전체 이미지가 보정 없이 원본 그대로** 반환된다. 개별 사진 보정
(enhance/decor/이펙트)은 각자 별도 이미지를 쓰는데도 히어로 하나 때문에 전부 스킵되는 구조다.
그리고 이 폴백은 **사용자에게 어떤 에러도 보여주지 않는다** — `/create/result` 페이지는 정상
완료된 것처럼 보이지만 조용히 저화질/무보정 결과를 준다.

## 확인 필요 (이 세션 권한 밖)

1. Supabase 대시보드 → Edge Functions에 `cleanup-expired-images`(또는 유사 이름) 함수가 실제
   배포돼 있는지, 있다면 그 삭제 조건 쿼리(어떤 컬럼을 기준으로 몇 시간/일을 비교하는지)를 직접
   확인해달라. 이 세션은 `.env.local`도 못 읽고 대시보드 접근도 안 되므로 절대 확인 불가.
2. 위 함수가 pg_cron이나 Database Webhook으로 등록돼 있다면 그 스케줄(간격)도 함께 확인.
3. 오늘(2026-08-26) 이 세션이 진행한 여러 라이브 테스트가 같은 7~8장짜리 Pexels 테스트
   사진을 반복적으로 재업로드했다 — 혹시 수동으로 스토리지를 정리하는 스크립트/버튼을 최근에
   돌린 적이 있는지도 확인해달라(사람이 직접 지운 것이라면 이건 코드 버그가 아니라 운영 실수).

## 수정 지시

**절대 규칙**: 슬롯/템플릿 구조 변경 금지, 가짜 후기/인증 데이터 추가 금지 — 이번 브리프와
무관하지만 프로젝트 공통 하드룰이므로 재확인 차원에서 명시.

1. **삭제 대상에서 제외되는 시점을 앞당긴다.** `product_id` 연결을 생성 파이프라인 전체가 끝난
   뒤(`app/api/generate/route.ts` 1447행)가 아니라, 가능한 한 이르게 — 예를 들어 draft 생성
   요청이 성공한 직후, 혹은 최소한 `handleApproveAndFinalize()`가 실제 생성을 시작하기 전에
   `product_images` 행에 "보호" 표시를 남기는 방법을 검토해달라. 가장 단순한 방법은 완성된
   `products` row를 생성 시작 시점에 미리 만들어두고(카피 등은 비워두거나 나중에 update) 그
   즉시 `product_images.product_id`를 연결하는 것 — 다만 이건 `products` 스키마의
   `not null` 제약(브랜드/카테고리 등)과 충돌하지 않는 선에서 설계해야 한다. 스키마 변경이
   부담되면 대안으로 `product_images`에 `protected_until timestamptz` 같은 컬럼을 추가해
   업로드 직후 "지금부터 N시간은 정리 대상에서 제외"로 표시하는 방법도 가능 — 어느 쪽이든
   **큰 스키마 변경이라 반드시 먼저 제안으로 남기고 승인받은 뒤 구현할 것.**
2. **원본 사진이 없어졌을 때 조용히 무보정으로 폴백하지 말고, 사용자에게 명확히 알린다.**
   `app/api/generate-backdrop/route.ts`에서 `imageUrls?.[0]`을 쓰기 전에 (또는
   `generateBackdropViaFluxKontext` 진입 시) 소스 이미지가 실제로 접근 가능한지 가벼운 HEAD
   요청으로 먼저 확인하고, 404/사라짐이 확인되면 지금처럼 재시도 2번 후 통째로 폴백하는 대신
   `/api/generate-backdrop`이 명확한 에러 코드(예: `SOURCE_IMAGE_EXPIRED`)를 반환하도록 하고,
   클라이언트(`app/create/draft/page.tsx`)는 이 에러를 받으면 "사진 세션이 만료되었습니다.
   사진을 다시 업로드해 주세요" 같은 명확한 안내와 함께 사용자가 재업로드하거나 재시도할 수 있게
   해달라. 최소한 지금처럼 **성공한 것처럼 보이는 무보정 결과를 조용히 내보내는 것만은 반드시
   없애야 한다.**
3. **(선택, 우선순위 낮음)** 히어로 배경 생성 실패가 나머지 7장의 개별 보정까지 전부 막는 현재의
   "한 곳 실패 = 전체 폴백" 구조를 완화할 수 있는지 검토 — 배경 생성과 개별 사진 보정을
   독립적으로 만들어서, 배경 생성만 실패해도 최소한 나머지 사진들의 보정/이펙트는 살아있게
   하는 방향. 이건 구조 변경이라 이번 라운드에서 구현까지는 하지 말고 `review/upgrade-proposals.md`에
   제안으로만 남겨달라.

## 이번 라운드에서 하지 말아야 할 것

- Supabase 대시보드 설정 자체를 이 브리프만으로 임의로 바꾸지 말 것 — 위 "확인 필요" 항목에
  대한 답을 먼저 얻고, 실제 삭제 주기가 확인되면 그에 맞춰 위 1번 수정의 구체적 시간 값을
  정할 것.
- 1번(연결 시점 앞당기기)은 스키마/흐름 변경이 필요할 수 있으므로 구현 전 설계안만 먼저
  요약해서 보고해달라 — 승인 후 구현.
- 2번(사용자 에러 안내)은 작은 범위이므로 바로 구현해도 좋다.

## 검증 방법 (완료 보고 시 재확인할 것)

- `tsc --noEmit` 클린.
- 코드 대조: `app/api/generate-backdrop/route.ts`, `lib/photo-enhance.ts`
  (`generateBackdropViaFluxKontext` 등), `app/create/draft/page.tsx`.
- 라이브 E2E는 이번 결함 특성상 재현이 확률적(타이밍 의존적)이라 강제 재현이 어려울 수 있음 —
  코드 리뷰로 "소스 이미지 사라짐 → 명확한 에러 메시지" 경로가 실제로 존재하는지 확인하는 것으로
  충분. 다만 정상 케이스(사진이 멀쩡한 경우) 회귀는 반드시 실제 생성 1회로 확인.
