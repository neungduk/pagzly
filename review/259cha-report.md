# 259차 — 실루엣 그림자 사각형 잘림 버그 수정

- 날짜: 2026-09-28
- 유료 API: **0건** (Replicate/DeepSeek/Vision/`/api/generate` 미호출, 로컬 sharp 연산만)
- 프로덕션 변경: `lib/photo-composite.ts`의 `buildSilhouetteShadowBuffer()` 내부 구현만. 시그니처·opacity·색·blend mode·블러 σ 불변
- 손대지 않음: `lib/lifestyle-product-composite.ts`, `lib/photo-enhance.ts`, `components/`, `matchCutoutGrain()` 2.2

## 결과

그림자가 이제 컷아웃 bbox에서 잘리지 않고 부드럽게 사라짐. 인접 픽셀 간 그림자 알파 최대 계단이 **18~49 → 2**로 떨어짐(14개 케이스 전부). 재조립 결과가 실제 `pasteCutoutOnScene()` 출력과 바이트 동일한 것도 수정 전·후 모두 14/14 유지.

## 수정 내용

- 실루엣 캔버스를 컷아웃 크기(w×h)가 아니라 사방 `pad = ceil(3σ)` 투명 여백을 둔 (w+2·pad)×(h+2·pad)로 만든 뒤 블러
- 합성 좌표에서 `pad`만큼 빼서 배치 위치 유지
- RGB는 여백까지 틴트 단색으로 채움 → 알파 0 영역 색이 블러로 번져 들어와도 162차 틴트 색조 유지 (sharp가 블러 시 알파를 premultiply하는지와 무관)
- **브리프와 다른 점 1건:** 브리프는 "캔버스 밖은 sharp composite가 알아서 클리핑"이라 했지만, sharp는 합성 입력이 베이스보다 크면 예외를 던짐. 히어로처럼 컷아웃이 캔버스에 꽉 차면 (w+2·pad)가 캔버스보다 커지므로, 캔버스와 겹치는 부분만 `extract`로 잘라 붙이도록 함. 완전히 캔버스 밖이면 빈 캔버스 반환.

### diff (`lib/photo-composite.ts`)

```diff
@@ -731,10 +731,18 @@ export async function buildSilhouetteShadowBuffer(
   const alpha = await sharp(cutoutResized).ensureAlpha().extractChannel(3).toBuffer();
   // 162차 — shadowTint가 있으면 순수 검정 대신 배경 색조를 옅게 유지한 그림자 색 사용.
   const tint = shadowTint ?? { r: 0, g: 0, b: 0 };
-  const blackRgb = await sharp({
+
+  const blurSigma = Math.max(6, Math.min(28, Math.min(w, h) * 0.055));
+  // 259차 — 컷아웃 크기 캔버스에서 블러하면 번짐이 가장자리에서 잘려 그림자가 사각형으로
+  // 끊긴다(호출부가 trimCutoutToOpaqueBounds로 6px만 남기고 잘라 넘김). 사방 3σ 투명 여백.
+  const pad = Math.ceil(blurSigma * 3);
+  const padW = w + pad * 2;
+  const padH = h + pad * 2;
+  // RGB는 여백까지 틴트 단색 — 알파 0 영역의 색이 블러로 번져 들어와도 색조가 유지됨.
+  const tintRgb = await sharp({
     create: {
-      width: w,
-      height: h,
+      width: padW,
+      height: padH,
       channels: 3,
       background: tint,
     },
@@ -747,14 +755,16 @@ export async function buildSilhouetteShadowBuffer(
   const { data: alphaRaw, info: aInfo } = await sharp(alpha)
     .raw()
     .toBuffer({ resolveWithObject: true });
-  const faded = Buffer.alloc(alphaRaw.length);
-  for (let i = 0; i < alphaRaw.length; i += 1) {
-    faded[i] = Math.round(alphaRaw[i] * opacity);
+  const faded = Buffer.alloc(padW * padH);
+  for (let y = 0; y < aInfo.height; y += 1) {
+    for (let x = 0; x < aInfo.width; x += 1) {
+      faded[(y + pad) * padW + x + pad] = Math.round(alphaRaw[y * aInfo.width + x] * opacity);
+    }
   }
-  const silhouette = await sharp(blackRgb)
+  const silhouette = await sharp(tintRgb)
     .joinChannel(
       await sharp(faded, {
-        raw: { width: aInfo.width, height: aInfo.height, channels: 1 },
+        raw: { width: padW, height: padH, channels: 1 },
       })
         .png()
         .toBuffer(),
@@ -762,12 +772,17 @@ export async function buildSilhouetteShadowBuffer(
     .png()
     .toBuffer();
 
-  const blurSigma = Math.max(6, Math.min(28, Math.min(w, h) * 0.055));
   const blurred = await sharp(silhouette).blur(blurSigma).png().toBuffer();
 
   const { ox, oy } = shadowOffsets(placement, shadow);
-  const left = Math.round(placement.left + ox);
-  const top = Math.round(placement.top + oy + h * 0.02);
+  const left = Math.round(placement.left + ox) - pad;
+  const top = Math.round(placement.top + oy + h * 0.02) - pad;
+
+  // sharp composite는 입력이 베이스보다 크면 예외를 던지므로 캔버스와 겹치는 부분만 잘라 붙인다.
+  const cropLeft = Math.max(0, -left);
+  const cropTop = Math.max(0, -top);
+  const cropRight = Math.min(padW, canvasWidth - left);
+  const cropBottom = Math.min(padH, canvasHeight - top);
 
   const empty = await sharp({
     create: {
@@ -780,8 +795,20 @@ export async function buildSilhouetteShadowBuffer(
     .png()
     .toBuffer();
 
+  if (cropRight <= cropLeft || cropBottom <= cropTop) return empty;
+
+  const visible = await sharp(blurred)
+    .extract({
+      left: cropLeft,
+      top: cropTop,
+      width: cropRight - cropLeft,
+      height: cropBottom - cropTop,
+    })
+    .png()
+    .toBuffer();
+
   return sharp(empty)
-    .composite([{ input: blurred, left, top }])
+    .composite([{ input: visible, left: left + cropLeft, top: top + cropTop }])
     .png()
     .toBuffer();
 }
```

## 검증

### 1. 그림자 진단 전/후 (`scripts/258cha-shadow-visibility-diagnose.ts`)

- 스크립트 변경은 출력 폴더 인자 + 잘림 지표 2개(`maxAlphaStep` = 인접 픽셀 간 그림자 알파 최대 차이, `shadowAlphaMass` = 그림자 알파 총량) 추가뿐
- 수정 전: `lib/photo-composite.ts`만 `git stash`로 잠시 되돌려 `review/259cha-shadow-diagnosis-before/`에 실행 후 복원. 기존 지표는 258차 결과와 동일하게 재현됨
- 수정 후: `review/259cha-shadow-diagnosis-after/`

| 케이스 | 바이트 동일 (전/후) | 최대 알파 계단 | 그림자 알파 총량 | 그림자 픽셀 수 | 평균 ΔL* | 최대 ΔL* |
|---|---|---|---|---|---|---|
| 257 씬, 257 placement | ✓ / ✓ | 18 → **2** | 1081 → 1140 | 17662 → 20553 | 1.10 → 1.01 | 4.25 → 4.01 |
| 257 씬, 상단 검정 | ✓ / ✓ | 18 → **2** | 1081 → 1140 | 17662 → 20553 | 0.27 → 0.27 | 0.32 → 0.32 |
| 균일 회색 8~240 (8종) | ✓ / ✓ | 18 → **2** | 1081 → 1140 | 17662 → 20553 | (아래 참고) | 변화 없음 |
| 실사진 L=40 | ✓ / ✓ | 46 → **2** | 876 → 874 | 13419 → 16013 | 0.54 → 0.47 | 4.09 → 3.47 |
| 실사진 L=97 | ✓ / ✓ | 46 → **2** | 876 → 874 | 13419 → 16013 | 1.56 → 1.32 | 4.83 → 4.21 |
| 실사진 L=167 | ✓ / ✓ | 46 → **2** | 876 → 874 | 13419 → 16013 | 2.67 → 2.19 | 11.15 → 6.60 |
| 실사진 L=214 | ✓ / ✓ | 49 → **2** | 849 → 785 | 12542 → 14572 | 3.86 → 2.93 | 16.00 → 9.46 |

균일 회색의 평균 ΔL*: 16 0.45→0.42, 32 0.95→0.88, 64 1.50→1.38, 128 2.40→2.21, 240 3.74→3.41 (8은 0.27 동일).

수치 읽는 법:
- **최대 알파 계단 → 2**: 사각형 경계(가장자리에서 알파가 한 번에 떨어지는 곳)가 사라짐. 블러된 그림자로서 정상 범위.
- **그림자 픽셀 수 증가 (약 +16~19%)**: 잘려 나가던 번짐 꼬리가 살아남.
- **평균 ΔL* 소폭 감소**: 그림자가 어두워진 게 아니라, 옅은 꼬리 픽셀이 측정 영역에 새로 들어와 평균이 내려간 것. 그림자 opacity·색은 불변.
- **실사진 최대 ΔL* 감소 (16 → 9.46 등)**: 수정 전 diff 이미지 하단에 보이던 밝은 띠(`review/258cha-shadow-diagnosis/real_L_214_02-pexels-6801218-diff-x8.png`)가 없어짐. 캔버스 경계에서 블러가 가장자리 값을 끌어와(edge 확장으로 추정) 경계에 그림자가 뭉쳐 있던 것으로 보이며, 여백을 두면서 그 뭉침이 사라짐. 실사진 케이스에서 총량이 거의 같거나(876→874) 줄어든(849→785) 것도 같은 이유로 보임.

육안 확인 (Claude 판단용): `*-diff-x8.png` 전/후 비교 — 수정 전은 직선 사각형 경계, 수정 후는 실루엣 모양 그대로 둥글게 페이드아웃.
- 전: `review/259cha-shadow-diagnosis-before/real_L_214_02-pexels-6801218-diff-x8.png`, `257-scene-A-placement_palm_case-diff-x8.png`
- 후: `review/259cha-shadow-diagnosis-after/` 같은 파일명

### 2. 기존 회귀 스크립트 (오프라인만)

| 스크립트 | 결과 |
|---|---|
| `162cha-shadow-tint-verify.ts` | 통과 (FAIL 0) |
| `167cha-canvas-overflow-verify.ts` | PASSED |
| `167cha-canvas-clamp-demo.ts` | exit 0 |
| `211cha-lifestyle-matching-verify.ts` | VERIFY:0 |
| `234cha-silhouette-shadow-verify.ts` | ALL PASS (정사각 1200×1200 = 히어로 호출 형태, 직사각, 극단 placement 포함) |
| `235cha-lifestyle-feather-verify.ts` | ALL PASS |
| `240cha-lifestyle-hero-parity-verify.ts` | `SKIP_LIVE=1`로 유닛만 — ALL PASS (라이브 2건은 유료라 미실행) |

- 231·232차 스크립트는 그림자와 무관해 제외. 236·237차는 verify 스크립트가 없음. 214·215차는 유료 라이브라 제외.
- 히어로 경로 자체를 바이트 동일로 재조립하는 도구는 없음(진단 스크립트는 라이프스타일 경로). 히어로 호출 형태(정사각 캔버스)는 234차 회귀로 확인.

### 3. 경계 케이스 (임시 스크립트, 실행 후 삭제)

- 캔버스 크기와 같은 컷아웃(여백 포함 그림자가 캔버스보다 큼) → 예외 없이 400×400 반환
- 캔버스 밖 placement(5000, 5000) → 빈 캔버스(알파 최대 0)
- 음수 placement(−300, −300) → 예외 없이 400×400 반환

### 4. 오프라인·변경 범위

- `rg -i "replicate|fetch\("`: `lib/photo-composite.ts` 0건, `scripts/258cha-shadow-visibility-diagnose.ts` 0건
- 작업 전 `lib/`·`components/` mtime 스냅샷 대비 바뀐 파일: `lib/photo-composite.ts` **하나뿐**. `git status -- lib components app`도 동일
- `npx tsc --noEmit`: 이번 변경 파일에 에러 없음

## 이번 수정으로 해결되지 않는 것 (258차 그대로)

- 어두운 씬에서 그림자가 안 보이는 문제: 257 씬 상단 검정 영역 ΔL* 0.27, 눈에 보이는 픽셀 0% — 수정 전과 동일. 어두운 픽셀에 어둡게 만들 여지가 없는 물리적 한계라 이 버그와 별개.
- `matchCutoutGrain()` 2.2 — 258차 결론대로 유지.
- "접촉부 미세 하이라이트"는 기록만, 구현 안 함.

## 산출물 (커밋 안 함, 로컬)

- `review/259cha-shadow-diagnosis-before/`, `review/259cha-shadow-diagnosis-after/` — 케이스별 with/no-shadow, diff-x8, `results.json`
- `review/259cha-before.log`, `review/259cha-after.log`
