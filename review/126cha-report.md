# 126차 — 제품 높이(cm) 입력 필드 실제 구현 (원본 증거)

생성: 2026-09-07  
전제: TEST_MODE. 유료 Replicate **0회**.

## 0. 경로 주의 (125차 스크린샷 실패 원인)

`CreateProductForm`은 **`/create`가 아니라 `/create/detail`** 에 마운트됩니다 (`app/create/detail/page.tsx`).  
125차 캡처가 `/create`를 열어 필드를 못 찾은 것은 이 때문이었습니다.

로컬 워크스페이스: `C:\Users\GIF\Desktop\pagelab\pagelab\components\CreateProductForm.tsx`  
(리포가 `pagelab/pagelab` 중첩 — 상위 `Desktop/pagelab` 루트에는 해당 폼 파일이 없음)

## 1. grep 원문 (`productHeightCm`)

```
86:productHeightCm: string;
129:const [productHeightCm, setProductHeightCm] = useState("");
185:setProductHeightCm(snap.productHeightCm ?? "");
559:const raw = productHeightCm.trim().replace(/,/g, ".");
586:productHeightCm: productHeightCm.trim(),
611:`[126cha][create-form] submit ... productHeightCm=...
673:productHeightCm: productHeightCm.trim(),
1286:<label htmlFor="productHeightCm" ...
1290:id="productHeightCm"
1296:value={productHeightCm}
1297:onChange={(e) => setProductHeightCm(e.target.value)}
```

파일: `review/126cha-grep-height.txt`

`productSizeHint` / `enableAiLifestyleShots`는 **이미 HEAD(커밋)에 존재**했습니다. 이번 diff는 `productHeightCm` 추가 + restore/스냅샷 정합이 핵심입니다.

## 2. `git diff` 원문 — CreateProductForm.tsx

파일: `review/126cha-diff-components_CreateProductForm.tsx.patch`

```diff
diff --git a/components/CreateProductForm.tsx b/components/CreateProductForm.tsx
index 1e71d3a..9ebb693 100644
--- a/components/CreateProductForm.tsx
+++ b/components/CreateProductForm.tsx
@@ -82,6 +82,8 @@ export type DraftSessionPayload = {
     targetCustomer: string;
     keyFeatures: string;
     productSizeHint?: string;
+    /** 126차 — 라이프스타일 합성용 제품 높이(cm). 빈 문자열 허용 */
+    productHeightCm: string;
     enableAiLifestyleShots?: boolean;
     ingredients: string;
     certifications: string;
@@ -123,6 +125,8 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
   const [targetCustomer, setTargetCustomer] = useState("");
   const [keyFeatures, setKeyFeatures] = useState("");
   const [productSizeHint, setProductSizeHint] = useState("");
+  /** 라이프스타일 합성용 제품 높이(cm). 빈 문자열 = 미입력(합성 생략) */
+  const [productHeightCm, setProductHeightCm] = useState("");
   const [enableAiLifestyleShots, setEnableAiLifestyleShots] = useState(false);
   const [ingredients, setIngredients] = useState("");
   const [certifications, setCertifications] = useState("");
@@ -177,6 +181,9 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
       setPrice(snap.price ?? "");
       setTargetCustomer(snap.targetCustomer ?? "");
       setKeyFeatures(snap.keyFeatures ?? "");
+      setProductSizeHint(snap.productSizeHint ?? "");
+      setProductHeightCm(snap.productHeightCm ?? "");
+      setEnableAiLifestyleShots(snap.enableAiLifestyleShots === true);
       setIngredients(snap.ingredients ?? "");
       setCertifications(snap.certifications ?? "");
       setCompetitorUrl(snap.competitorUrl ?? "");
@@ -548,6 +555,14 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
         customGifUrl = await uploadAuxFile(customGif, "custom-gif");
       }
 
+      const parsedHeightCm = (() => {
+        const raw = productHeightCm.trim().replace(/,/g, ".");
+        if (!raw) return null;
+        const n = Number(raw);
+        if (!Number.isFinite(n) || n < 2 || n > 80) return null;
+        return n;
+      })();
+
       // 승인 전: 원본 업로드만으로 카피 draft 생성 (배경/보정 비용 스킵)
       const imageUrls = uploaded.map((item) => item.url);
       const imagePaths = uploaded.map((item) => item.path);
@@ -568,6 +583,7 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
         targetCustomer: targetCustomer || null,
         keyFeatures: keyFeatures.trim() || null,
         productSizeHint: productSizeHint.trim() || null,
+        productHeightCm: productHeightCm.trim(),
         enableAiLifestyleShots,
         ingredients: ingredients.trim() || null,
         certifications: certifications.trim() || null,
@@ -592,7 +608,7 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
       };
 
       console.log(
-        `[create-form] submit enableAiLifestyleShots=${enableAiLifestyleShots} productSizeHint=${Boolean(productSizeHint.trim())}`,
+        `[126cha][create-form] submit lifestyle=${Boolean(lifestyleImageUrl)} productHeightCm=${JSON.stringify(productHeightCm.trim())} parsed=${parsedHeightCm} productSizeHint=${JSON.stringify(productSizeHint.trim() || null)} enableAiLifestyleShots=${enableAiLifestyleShots}`,
       );
 
       setLoadingStage("generating");
@@ -654,6 +670,7 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
           targetCustomer,
           keyFeatures: keyFeatures.trim(),
           productSizeHint: productSizeHint.trim(),
+          productHeightCm: productHeightCm.trim(),
           enableAiLifestyleShots,
           ingredients: ingredients.trim(),
           certifications: certifications.trim(),
@@ -1036,7 +1053,8 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
                   className={inputClass}
                 />
                 <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
-                  AI 연출 사용샷을 쓰려면 높이(cm)를 꼭 넣어 주세요. 예: 35mL, 높이 약 9cm
+                  용량(mL)과 높이(cm)를 함께 적어도 됩니다. 높이만으로도 됩니다. 예: 35mL, 높이 약
+                  9cm — 참고자료의 「제품 높이(cm)」 칸이 있으면 그쪽이 우선입니다.
                 </p>
               </div>
 
@@ -1264,6 +1282,27 @@ export default function CreateProductForm({ userId }: CreateProductFormProps) {
                     e.target.value = "";
                   }}
                 />
+                <div className="mt-4">
+                  <label htmlFor="productHeightCm" className={labelClass}>
+                    제품 높이 (선택, cm) — 입력하면 손 크기 대비 정확한 합성이 가능해요
+                  </label>
+                  <input
+                    id="productHeightCm"
+                    type="number"
+                    inputMode="decimal"
+                    min={2}
+                    max={80}
+                    step="0.1"
+                    value={productHeightCm}
+                    onChange={(e) => setProductHeightCm(e.target.value)}
+                    placeholder="예: 9"
+                    className={inputClass}
+                  />
+                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
+                    비우면 라이프스타일 합성은 안전하게 생략됩니다. (용량 mL만으로는 높이를
+                    추정하지 않습니다)
+                  </p>
+                </div>
               </div>
 
               <div>
```

## 3. `git diff` 원문 — draft/page.tsx

파일: `review/126cha-diff-app_create_draft_page.tsx.patch`

```diff
diff --git a/app/create/draft/page.tsx b/app/create/draft/page.tsx
index b6f2adb..a72adeb 100644
--- a/app/create/draft/page.tsx
+++ b/app/create/draft/page.tsx
@@ -288,6 +288,22 @@ export default function CreateDraftPage() {
     setLoadingStage("backdrop");
     setOverlayProgress(undefined);
 
+    const rawHeight =
+      typeof snap.productHeightCm === "string"
+        ? snap.productHeightCm.trim().replace(/,/g, ".")
+        : typeof snap.productHeightCm === "number"
+          ? String(snap.productHeightCm)
+          : "";
+    const snapHeight = (() => {
+      if (!rawHeight) return null;
+      const n = Number(rawHeight);
+      if (!Number.isFinite(n) || n < 2 || n > 80) return null;
+      return n;
+    })();
+    console.log(
+      `[126cha][draft] runPhotoEnhancementPipeline productHeightCmRaw=${JSON.stringify(snap.productHeightCm ?? null)} parsed=${snapHeight} productSizeHint=${JSON.stringify(snap.productSizeHint || null)} lifestyleImageUrl=${Boolean(currentDraft.payload.lifestyleImageUrl)}`,
+    );
+
     const photo = await runPhotoEnhancementPipeline({
       uploaded,
       category: snap.category,
@@ -296,6 +312,7 @@ export default function CreateDraftPage() {
       price: Number(snap.price) || Number(currentDraft.payload.price) || 0,
       keyFeatures: snap.keyFeatures || null,
       productSizeHint: snap.productSizeHint || null,
+      productHeightCm: snapHeight,
       enableAiLifestyleShots: snap.enableAiLifestyleShots === true,
       ingredients: snap.ingredients || null,
       targetCustomer: snap.targetCustomer || null,
```

문자열 `productHeightCm` → `Number()` 파싱 후 pipeline에 전달. (`productSizeHint` / `enableAiLifestyleShots`는 폼에 실제 필드 존재 — 유지)

## 4. `npx tsc --noEmit` 원본 출력

파일: `review/126cha-tsc-output.txt`

```
(no stdout)
EXIT_CODE=0
```

(성공 시 TypeScript는 stdout에 아무것도 안 찍고 exit 0)

## 5. 실제 스크린샷 (이번 라운드 촬영)

- URL: `http://localhost:3000/create/detail`
- 파일: `review/126cha-product-height-field.png`
- 필드 `#productHeightCm`에 값 `9` 입력된 상태, 라이프스타일 업로드 바로 아래

## 6. 콘솔/증거 로그 원문

파일: `review/126cha-console-evidence.log`

```
[126cha-evidence] url_after_goto=http://localhost:3000/create/detail
[126cha-evidence] url_ready=http://localhost:3000/create/detail
[126cha-evidence] html_has_productHeightCm=true
[126cha-evidence] html_has_lifestyleImage=true
[126cha-evidence] locator_count=1
[126cha-evidence] inputValue=9
[126cha-evidence] screenshot=C:\Users\GIF\Desktop\pagelab\pagelab\review\126cha-product-height-field.png
[126cha][evidence] formSnapshot.productHeightCm="9"
```

제출 시 런타임 로그 마커: `[126cha][create-form] ... productHeightCm=...` / `[126cha][draft] ...`

## 7. 체크리스트

- [x] CreateProductForm: state + `#productHeightCm` + formSnapshot 타입/리터럴 (`string`)
- [x] draft: 문자열 → Number 파싱, 타입 정합
- [x] tsc EXIT_CODE=0 원문
- [x] 실제 스크린샷 `126cha-product-height-field.png`
- [x] 유료 API 0회
