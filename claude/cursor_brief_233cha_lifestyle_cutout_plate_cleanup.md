# 233차 — 라이프스타일 픽셀 페이스트 컷아웃에 hero와 동일한 플레이트/프레임 잔여 제거 적용

## 배경

사용자 지시 "사진합성 부분이 아직 미약한거 같으니 코딩으로 해결하자"에 따라 231차(선명도
양방향 매칭)에 이어 합성 파이프라인 전체를 감사했다. 이번엔 `lib/photo-composite.ts`의
매칭/정리 함수들이 두 병렬 합성 경로(스튜디오 히어로 `lib/photo-enhance.ts` vs 라이프스타일
픽셀 페이스트 `lib/lifestyle-product-composite.ts`) 사이에서 실제로 대칭 배선돼 있는지 감사
(231차와 동일한 "구조적 도달 가능성" 감사 기법).

순수 코드/결정론적 로직 수정이며 유료 생성 API 호출은 0건이다.

---

## Finding — 라이프스타일 픽셀 페이스트 경로가 hero 경로와 동일한 rembg 모델을 쓰면서도 플레이트/프레임 잔여 제거 단계를 건너뜀

두 파이프라인 모두 정확히 같은 배경 제거 모델을 쓴다:

- `lib/photo-enhance.ts:1698` — `replicate.run(modelRef, ...)` (`851-labs/background-remover`)
- `lib/lifestyle-product-composite.ts:609-610` — 동일 모델 문자열

hero 경로(`photo-enhance.ts:1712-1718`, `runBackgroundRemove`)는 rembg 직후 이 순서로 정리한다:

```ts
buffer = await trimCutoutToOpaqueBounds(buffer);
buffer = await purgeDarkPlateFringe(buffer);
try {
  buffer = await defringeCutoutEdges(buffer);
} catch (error) { ... }
```

반면 라이프스타일 픽셀 페이스트 경로(`lib/lifestyle-product-composite.ts`, `removeProductBackground`
→ `compositeProductOnLifestylePhoto`)는 `trimCutoutToOpaqueBounds`/`purgeDarkPlateFringe`를
**import조차 하지 않고** `defringeCutoutEdges`만 적용한다(933-941행).

두 함수의 헤더 주석이 서로 다른 결함을 명시적으로 구분한다:

- `trimCutoutToOpaqueBounds`(114행): "rembg 직후 투명 여백을 제거해 제품 bbox만 남긴다.
  **원본 프레임/플레이트 여백 제거에 유효**."
- `purgeDarkPlateFringe`(136행): "컷아웃 가장자리의 **어두운 직사각 플레이트/원본 프레임
  잔여**를 알파로 제거. rembg가 RGB는 남기고 알파만 반투명 처리한 경우를 정리한다."
- `defringeCutoutEdges`(178행 주석, 165차): "`purgeDarkPlateFringe`(어두운 사각 플레이트
  잔여 전용)**와 달리** 색상 무관 일반 번짐을 다룬다" — 즉 defringe는 이 결함을 애초에
  다루지 않는다고 스스로 명시.

이 결함이 가장 자주 드러나는 경로는 "AI 일상샷"(`enableAiLifestyleShots`) 기능이다.
`lib/photo-pipeline-client.ts:788` 주석: "103차 A — enhanced 대신 원본 업로드 컷 (스케일·
라벨 단서 유지)" — 즉 이 경로는 **의도적으로** hero 보정을 거치지 않은 원본 판매자 업로드
사진을 그대로 rembg에 넣도록 설계돼 있다. 원본 판매자 사진은 제품이 테이블·박스·접시 위에
놓인 채로 찍힌 경우가 많아 어두운 프레임/플레이트 잔여가 남을 확률이 hero 경로보다 오히려
높은데, 정작 이 잔여를 제거하는 단계가 빠져 있다.

**재현 검증**(샌드박스, 실제 staged `photo-composite.ts` 원본 그대로 사용, 수정 없음):
합성 테스트 이미지(중앙 원형 제품 + 테두리에 반투명 어두운 사각 잔여, alpha 최대 140/255)로
- `defringeCutoutEdges` 단독(기존 라이프스타일 경로 동작) → 테두리 잔여 픽셀 23,100개 중
  **0개 제거**(완전히 그대로 남음, `maxBorderAlpha` 140 그대로).
- `trimCutoutToOpaqueBounds` + `purgeDarkPlateFringe`(hero 경로 동작, 신규 적용분) →
  23,100개 → **0개**(완전 제거, `maxBorderAlpha` 0).

즉 기존 라이프스타일 경로가 이 결함 클래스를 전혀 못 잡는다는 것과, hero 경로의 두 함수가
실제로 이 결함을 완전히 제거한다는 것을 둘 다 코드 실행으로 증명했다.

**분류**: 버그(코드만으로 수정 가능, 두 경로가 동일 모델을 쓰면서도 정리 단계만 비대칭).

---

## 수정 — `lib/lifestyle-product-composite.ts`

### import 추가

```diff
 import {
   buildProductShadowSvg,
   defringeCutoutEdges,
   matchCutoutGrain,
   matchCutoutSharpness,
   matchCutoutWhiteBalance,
+  purgeDarkPlateFringe,
   sampleBackdropAmbientColor,
   tintedShadowColor,
+  trimCutoutToOpaqueBounds,
 } from "@/lib/photo-composite";
```

### `compositeProductOnLifestylePhoto` 내부, defringe 직전에 hero와 동일한 순서로 삽입

```diff
         let cutoutImage = await fetchImageBuffer(cutout.cutoutUrl);
+        // 233차 — hero 파이프라인(photo-enhance.ts)은 동일한 851-labs/background-remover
+        // 직후 trimCutoutToOpaqueBounds+purgeDarkPlateFringe를 적용하는데, 이 라이프스타일
+        // 픽셀 페이스트 경로는 두 함수를 아예 import하지 않아 원본 프레임/어두운 플레이트
+        // 잔여가 그대로 붙여넣어지고 있었음. 특히 AI 일상샷 경로(103차 A 주석 — "enhanced
+        // 대신 원본 업로드 컷")는 원본 업로드를 그대로 rembg에 넣도록 설계돼 있어 이 결함이
+        // 가장 잘 드러나는 경로. hero와 동일한 순서(trim → 어두운 플레이트 제거)로 적용.
+        try {
+          const trimmed = await trimCutoutToOpaqueBounds(cutoutImage.buffer);
+          const platePurged = await purgeDarkPlateFringe(trimmed);
+          cutoutImage = { ...cutoutImage, buffer: platePurged };
+        } catch (error) {
+          console.warn("[lifestyle-composite] trim/plate-fringe 정리 실패, 컷아웃 그대로 사용", error);
+        }
         // 165차 — 컷아웃 경계 색 번짐(fringe) 제거. 실사진 배경에 픽셀을 그대로
         // 붙여넣는 경로라 AI 배경 합성보다도 번짐이 훨씬 눈에 잘 띈다.
         try {
           const defringed = await defringeCutoutEdges(cutoutImage.buffer);
           cutoutImage = { ...cutoutImage, buffer: defringed };
         } catch (error) {
           console.warn("[lifestyle-composite] defringe 실패, 컷아웃 그대로 사용", error);
         }
```

`try/catch`로 감싸 실패 시 컷아웃을 그대로 쓰는 안전 폴백은 기존 defringe 블록과 동일한
패턴을 따른다(hero 경로도 동일하게 개별 try/catch).

`trimCutoutToOpaqueBounds`는 투명 여백을 제거하고 6px 마진을 다시 붙이므로 이미지 크기가
바뀐다 — 이후 `cutMeta`(반려/손 배치 감지용 메타데이터)는 이 블록보다 뒤(953행 부근)에서
`cutoutImage.buffer`를 다시 읽어 계산하므로 stale 크기 문제 없음(코드 확인 완료).

---

## 포함하지 않는 것 (이번 라운드 범위 밖, 억지 구현 방지)

- **실루엣 그림자(`buildSilhouetteShadowBuffer`)를 라이프스타일 경로에 배선하는 것**:
  hero 경로는 이 함수를 기본으로 쓰고 `buildProductShadowSvg`(폴백용 타원, 자체 주석
  "폴백용 타원 그림자 SVG(실루엣 생성 실패 시)")를 실패 시에만 쓴다. 라이프스타일 경로는
  반대로 타원 그림자만 쓴다. 다만 `buildSilhouetteShadowBuffer`는 시그니처가
  `canvasSize: number`(정사각형 전용, hero의 고정 `CANVAS_SIZE` 상수에 맞춰 설계됨)라
  임의 종횡비의 실사진(라이프스타일 씬)에 그대로 쓸 수 없음 — 폭/높이를 분리하는 시그니처
  변경이 필요한 더 큰 작업이라 이번엔 포함하지 않음(211차 코멘트도 WB/선명도/그레인 3축만
  명시적으로 언급, 그림자 형태는 언급 없음 — 당시에도 의도적으로 스코프 제외됐을 가능성).
  기록만 남기고 다음 라운드 후보로 남김.
- `lib/photo-enhance.ts`(hero 경로)는 무변경.
- 컴플라이언스·다이어그램 관련 파일 전부 무변경.

---

## 검증 절차 (Cursor 실행 후 필수)

1. **구문 검사**: `npx esbuild lib/lifestyle-product-composite.ts --bundle=false --format=esm --outfile=/dev/null`
2. **결정론적 단위 테스트**(유료 API 없음): `lib/photo-composite.ts`를 그대로 import(수정
   없이)해서, 중앙에 불투명 원형 "제품"을 그리고 테두리에 반투명 어두운 사각 잔여(alpha
   ~140/255)를 합성한 합성 테스트 이미지로:
   - 기존 방식(defringeCutoutEdges 단독) → 테두리 잔여가 그대로 남는지(회귀 확인용,
     "이 결함이 실재했다"는 증거).
   - 신규 방식(trimCutoutToOpaqueBounds + purgeDarkPlateFringe) → 테두리 잔여가 제거되는지.
   콘솔 로그/스크린샷 첨부.
3. **실사용 데이터로 스크린샷**: 기존 세션 픽스처 중 판매자 원본 사진에 테두리/플레이트가
   보이는 것으로 라이프스타일 합성(픽셀 페이스트 또는 AI 일상샷 경로 중 하나, 신규 생성 API
   호출 불필요 — 기존 픽스처 재사용) 전/후 비교 스크린샷 1쌍.
4. **회귀 확인**: 정상적인(플레이트 잔여 없는) 컷아웃에 이 두 함수를 적용해도 제품 자체가
   손상되지 않는지 확인(예: 알파 마스크의 제품 중심부 픽셀은 완전히 불변).
5. hero 경로(`lib/photo-enhance.ts`) 무변경 확인(mtime).
6. 유료 생성 API(Replicate/Claude/DeepSeek, `/api/generate`) 호출 0건.

작업 파일: `lib/lifestyle-product-composite.ts`만 수정. `lib/photo-composite.ts`(기존 함수
그대로 재사용, 수정 없음)·`lib/photo-enhance.ts`는 건드리지 말 것.
