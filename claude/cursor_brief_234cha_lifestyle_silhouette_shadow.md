# 234차 — 라이프스타일 픽셀 페이스트에 hero와 동일한 실루엣 그림자 배선

## 배경

233차(라이프스타일 컷아웃 플레이트/프레임 잔여 제거)를 브리프 작성 시점에 "포함하지 않는 것"
으로 남겨뒀던 후보를 이번에 재조사했다. 233차 각주: "`buildSilhouetteShadowBuffer`는
`canvasSize: number`(정사각형 전용) 시그니처라 임의 종횡비 실사진에 그대로 못 쓴다"고
판단해 스코프에서 뺐는데, 실제로 함수 본문을 다시 읽어보니 `canvasSize`는 **최종 빈 캔버스의
width/height를 만드는 딱 한 곳(2줄)에서만** 쓰이고, 그 외 모든 계산(실루엣 알파 마스크·블러·
오프셋)은 컷아웃 자체의 실제 픽셀 크기(`meta.width`/`height`)와 `placement`만 참조한다.
즉 "정사각형 전용"이 아니라 "정사각형 값을 두 번 넘기는 호출부만 있었을 뿐"이었다 — 시그니처를
`canvasWidth`/`canvasHeight` 2개 파라미터로 분리하는 것만으로 임의 종횡비에 안전하게 쓸 수
있다는 것을 확인했다.

순수 코드/결정론적 로직 변경이며 유료 생성 API 호출은 0건이다.

---

## Finding — hero 경로는 실루엣 그림자를 기본으로 쓰는데 라이프스타일 경로는 타원 폴백만 씀

`lib/photo-composite.ts`의 두 그림자 함수:

- `buildSilhouetteShadowBuffer`(716행): "컷아웃 알파 마스크를 투영·블러한 실루엣 그림자.
  타원 블롭보다 제품 윤곽을 반영해 합성 티를 줄인다."
- `buildProductShadowSvg`(785행): "폴백용 타원 그림자 SVG **(실루엣 생성 실패 시)**"
  — 자기 자신의 주석이 스스로를 "실루엣 실패 시 폴백"으로 규정.

hero 경로(`lib/photo-enhance.ts:1953-1982`)는 이 관계를 정확히 구현한다: 실루엣을 먼저
시도(`try`), 실패하면 타원으로 폴백(`catch`).

반면 라이프스타일 픽셀 페이스트 경로(`lib/lifestyle-product-composite.ts`,
`pasteCutoutOnScene`)는 `buildSilhouetteShadowBuffer`를 import조차 하지 않고 처음부터
`buildSceneShadowSvg`(내부적으로 `buildProductShadowSvg`를 정사각형 SVG로 만든 뒤 문자열
치환으로 width/height 속성만 바꿔 실사진 씬 크기에 끼워 맞추는 우회 함수) — 즉 **폴백만
쓰고 본선(실루엣)은 아예 시도조차 안 하는 상태**였다.

**재확인**: `buildSilhouetteShadowBuffer`(수정 전)를 다시 읽어 `canvasSize` 파라미터의
실제 용도를 좁혀 확인 — 762~770행 최종 `empty` 캔버스 생성부에서만 쓰이고, 실루엣 알파
마스크·블러 반경·오프셋 계산은 전부 `meta.width/height`(컷아웃 자체 크기)와 `placement`
기반이라 canvasSize의 정사각형 여부와 무관. 즉 시그니처만 일반화하면 안전.

**분류**: 버그(233차에서 "포함하지 않는 것"으로 남겼던 판단을 재검토해 실제로는 작은
시그니처 일반화로 해결 가능함을 확인 — 버그가 아니라고 오판했던 것을 정정).

---

## 수정

### 1. `lib/photo-composite.ts` — `buildSilhouetteShadowBuffer` 시그니처 일반화

```diff
+/**
+ * 233차 — canvasSize(정사각형 전용) 대신 canvasWidth/canvasHeight로 분리해 임의
+ * 종횡비 캔버스(실사진 라이프스타일 씬 등)에도 쓸 수 있도록 일반화. 정사각형
+ * 호출부는 두 값에 같은 상수를 넘기면 기존과 완전히 동일하게 동작한다(회귀 없음).
+ */
 export async function buildSilhouetteShadowBuffer(
   cutoutResized: Buffer,
-  canvasSize: number,
+  canvasWidth: number,
+  canvasHeight: number,
   placement: { left: number; top: number; width: number; height: number },
   shadow: ShadowAnalysis,
   shadowTint?: { r: number; g: number; b: number },
 ): Promise<Buffer> {
   ...
   const empty = await sharp({
     create: {
-      width: canvasSize,
-      height: canvasSize,
+      width: canvasWidth,
+      height: canvasHeight,
       channels: 4,
       background: { r: 0, g: 0, b: 0, alpha: 0 },
     },
   })
```

함수 본문의 다른 부분(알파 마스크·블러·오프셋 계산)은 전혀 건드리지 않음 — 위 2곳만 변경.

### 2. `lib/photo-enhance.ts` — 기존 유일한 호출부, 인자 하나만 추가(동작 동일)

```diff
     shadowBuffer = await buildSilhouetteShadowBuffer(
       cutoutResized,
       CANVAS_SIZE,
+      CANVAS_SIZE,
       {
```

(`CANVAS_SIZE`를 두 번 넘기므로 정사각형 그대로, hero 경로 동작 완전 불변)

### 3. `lib/lifestyle-product-composite.ts` — hero와 동일한 try/실루엣→catch/타원 폴백 배선

import 추가:

```diff
 import {
   buildProductShadowSvg,
+  buildSilhouetteShadowBuffer,
   defringeCutoutEdges,
   ...
```

`pasteCutoutOnScene` 내부, 기존 무조건 `buildSceneShadowSvg` 호출부를 교체:

```diff
-  const shadowSvg = buildSceneShadowSvg(
-    sceneW,
-    sceneH,
-    { left: pasteLeft, top: pasteTop, width: cutW, height: cutH },
-    shadow,
-    sceneShadowTint,
-  );
-  const shadowBuf = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
+  // 234차 — hero 파이프라인은 실루엣 그림자를 기본으로 쓰고 타원(buildProductShadowSvg)은
+  // 실패 시 폴백으로만 쓰는데, 이 라이프스타일 경로는 반대로 타원만 썼음.
+  // buildSilhouetteShadowBuffer가 canvasWidth/canvasHeight를 받도록 일반화돼 있어
+  // 임의 종횡비 실사진 씬에도 그대로 쓸 수 있다. hero와 동일하게 실루엣 우선,
+  // 실패 시 기존 타원 폴백(buildSceneShadowSvg는 그대로 재사용).
+  let shadowBuf: Buffer;
+  try {
+    shadowBuf = await buildSilhouetteShadowBuffer(
+      cutoutPrepared,
+      sceneW,
+      sceneH,
+      { left: pasteLeft, top: pasteTop, width: cutW, height: cutH },
+      shadow,
+      sceneShadowTint,
+    );
+  } catch (error) {
+    console.warn("[lifestyle-composite] silhouette shadow 실패 — 타원 그림자로 폴백", error);
+    const shadowSvg = buildSceneShadowSvg(
+      sceneW,
+      sceneH,
+      { left: pasteLeft, top: pasteTop, width: cutW, height: cutH },
+      shadow,
+      sceneShadowTint,
+    );
+    shadowBuf = await sharp(Buffer.from(shadowSvg)).png().toBuffer();
+  }
```

`buildSceneShadowSvg` 함수 자체는 무변경(폴백 경로로 그대로 재사용). 이후의
`sharp(sceneBuffer).composite([{ input: shadowBuf, ..., blend: "multiply" }])`도 무변경
— 실사진에 자연스럽게 어울리도록 기존처럼 multiply 블렌드 유지(hero는 합성 배경이라
"over" 기본 블렌드를 쓰지만, 실사진 위에서는 기존 라이프스타일 경로의 multiply가 더
자연스러워 그대로 둠 — 취향 판단 아님, 기존 코드 그대로 보존).

---

## 검증 (실행, 실제 함수로 재현 — 샌드박스에서 확인 완료)

수정된 `photo-composite.ts`를 esbuild로 번들해 직접 실행:

1. **정사각형 캔버스 회귀 확인**: `canvasWidth=canvasHeight=1200`으로 호출 → 출력
   1200×1200(hero 경로와 동일 동작, 픽셀 왜곡 없음).
2. **직사각형 캔버스(라이프스타일 씬 모사)**: `canvasWidth=1600, canvasHeight=900`으로
   호출 → 출력 1600×900(정사각형으로 늘어나거나 클리핑되지 않음), 알파>0인 그림자 픽셀
   67,884개 확인(빈 버퍼 아님).
3. **극단 종횡비 + 가장자리 배치**: `canvasWidth=2400, canvasHeight=600`, placement가
   오른쪽 끝 근처 → 예외 없이 2400×600 정상 출력(프로덕션에서도 만일 예외가 나도
   try/catch 폴백이 잡아줌).

Cursor 실행 후 추가로 확인해야 할 것:

1. **구문 검사**: 3개 파일 전부 `npx esbuild ... --bundle=false --format=esm --outfile=NUL`.
2. **호출부 전수 확인**: `grep -rn "buildSilhouetteShadowBuffer(" .`로 정확히 정의 1곳 +
   호출 2곳(hero/lifestyle)만 있는지, 시그니처가 3개 파일 모두 일치하는지.
3. **hero 회귀 스크린샷**: 기존 hero 실루엣 그림자가 정사각형 캔버스에서 이전과 동일하게
   나오는지(신규 생성 API 호출 불필요 — 기존 픽스처 재사용 가능).
4. **라이프스타일 신규 스크린샷**: 실사진 씬(비정사각형)에 픽셀 페이스트 시 제품 윤곽을
   반영한 그림자가 실제로 보이는지(타원이 아니라 실루엣 형태인지 육안 확인).
5. 유료 생성 API 0건.

---

## 포함하지 않는 것

- `buildSceneShadowSvg`/`buildProductShadowSvg` 자체 로직은 무변경(폴백 경로 보존 목적).
- hero 경로의 블렌드 모드("over")를 라이프스타일에 맞추거나 그 반대로 통일하지 않음 —
  각각 합성 배경(hero)과 실사진(lifestyle)이라는 다른 소스 특성에 이미 맞춰진 기존 선택.
- `buildSilhouetteShadowBuffer` 내부의 블러 반경·오프셋 공식 등은 이번 스코프 밖(변경 없음).

작업 파일: `lib/photo-composite.ts`·`lib/photo-enhance.ts`·`lib/lifestyle-product-composite.ts`
3개만 수정.
