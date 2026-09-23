# 235차 브리프 — 라이프스타일 픽셀 페이스트에 hero와 동일한 컷아웃 알파 페더링 적용

생성: 2026-09-22 · 예상 유료 API: **0건** (순수 sharp 픽셀 연산)

## 배경

"사진합성 부분이 아직 미약한거 같으니 코딩으로 해결하자" 원 지시를 계속 이어감.
231/233/234차가 hero(`photo-enhance.ts`)와 라이프스타일 픽셀 페이스트
(`lib/lifestyle-product-composite.ts`)의 비대칭 배선을 순차로 발견·수정해왔음
(233=플레이트/프레임 잔여 제거, 234=실루엣 그림자). 이번엔 `lib/photo-composite.ts`의
17개 export 함수 중 두 경로에서 호출 여부가 갈리는 나머지 함수들을 전수 grep 대조해
새 비대칭을 찾음.

## 발견

`featherCutout()`(`lib/photo-composite.ts:232`, 자체 doc comment: "알파 1px erode + 블러.
블러 반경은 컷아웃 크기 대비 캔버스 비율로 정규화")는 rembg가 만든 직후의 날카로운
알파 경계(0/255 이진에 가까움)를 살짝 침식(erode)+블러해 반투명 경계 픽셀을 만들어내는
함수 — 컷아웃을 배경에 "오려붙인 티"가 덜 나게 하는 순수 시각 품질 보정.

**hero 파이프라인**(`photo-enhance.ts:1930`)은 컷아웃을 배경에 합성하기 직전, WB/선명도/
그레인 매칭보다 먼저 반드시 이 함수를 거침:
```
const feathered = await featherCutout(cutoutResized, CANVAS_SIZE);
const whiteBalanced = await matchCutoutWhiteBalance(feathered, backdropWithDecor);
const sharpnessMatched = await matchCutoutSharpness(whiteBalanced, backdropWithDecor);
cutoutForComposite = await matchCutoutGrain(sharpnessMatched, backdropWithDecor);
```

**라이프스타일 픽셀 페이스트 경로**(`pasteCutoutOnScene`, `lib/lifestyle-product-composite.ts:690`)는
`featherCutout`를 아예 import조차 하지 않음(grep 0건) — WB/선명도/그레인 매칭(211차)은
똑같이 하지만 그 앞에 있어야 할 페더링 단계가 완전히 빠져 있어, 실사진 배경 위에 원본
rembg의 날카로운 경계가 그대로 픽셀 붙여넣기됨. 실사진 배경이라 AI 합성 배경보다 이 "오려낸
티"가 훨씬 잘 보이는 경로(165차 defringe 브리프의 동일 논리)인데, 오히려 이 경로에 페더링이
빠져 있었음.

**혼동 방지**: `defringeCutoutEdges`(165차, 라이프스타일 경로에 이미 적용됨)는 반투명 경계
픽셀의 "색"(RGB)만 이웃 평균으로 교체할 뿐 알파값 자체는 건드리지 않음 — `featherCutout`
(알파를 침식+블러해 경계를 반투명하게 "만드는" 함수)과는 역할이 다른 별개 단계. 233/234차가
다룬 플레이트 잔여 제거·그림자와도 무관한 세 번째 축.

## 검증한 것 (Claude, 코드 실행)

- `featherCutout` 시그니처는 `(input: Buffer, canvasSize = DEFAULT_CANVAS_SIZE)` — 234차와
  달리 시그니처 변경 불필요. `canvasSize`는 블러 강도 정규화용 스칼라 1개로만 쓰이므로
  `buildSceneShadowSvg`가 이미 쓰는 선례(`Math.max(sceneW, sceneH)`)를 그대로 재사용 가능.
- 실제 staged `photo-composite.ts`(수정 없음, 원본 그대로)를 esbuild로 번들해 별도 샌드박스에서
  직접 실행 — 하드엣지(anti-alias 없는 사각형) 합성 컷아웃에 `featherCutout(cutout,
  Math.max(1600,900))` 적용 시 반투명 경계 픽셀이 0개 → 3,964개로 발생(페더링 효과 실증),
  컷아웃 자체 치수(300×400)는 불변. 극단 비율(`Math.max(2400,600)`)에서도 예외 없이 동일
  결과(블러 시그마가 상한 4.8에서 클램프돼 포화).
- `pasteCutoutOnScene`을 포함한 실제 전이 의존성까지 esbuild로 번들해 `featherCutout`가
  export로 정상 노출됨을 확인, 함수 자체에 외부 I/O 없어(순수 픽셀 연산) 실패 가능성 낮음.

## 변경 (파일 1개만)

`lib/lifestyle-product-composite.ts`의 `pasteCutoutOnScene()` 내부, 기존 211차 주석
(`// 211차 — 메인 히어로 경로가...`) **바로 앞**(즉 "극단 placement로도 씬보다 크면 한 번
더 축소" 블록 직후, WB 매칭 호출 직전)에 삽입:

```ts
// 235차 — hero 파이프라인(photo-enhance.ts)은 WB/선명도/그레인 매칭 전에 반드시
// featherCutout(알파 1px erode+블러)로 rembg의 날카로운 경계를 반투명하게 만드는데,
// 이 라이프스타일 경로는 이 단계가 아예 빠져 있어 실사진 배경 위에 날카로운 경계가
// 그대로 붙여넣어지고 있었음. canvasSize 인자는 buildSceneShadowSvg와 동일한 선례로
// Math.max(sceneW, sceneH) 사용(시그니처 변경 불필요, 스칼라 1개로만 쓰임).
try {
  cutoutPrepared = await featherCutout(cutoutPrepared, Math.max(sceneW, sceneH));
} catch (error) {
  console.warn("[lifestyle-composite] feather 실패, 컷아웃 그대로 사용", error);
}
```

그리고 파일 상단 `@/lib/photo-composite` import 목록에 `featherCutout` 추가(알파벳 순서
유지 — 기존 목록: `buildProductShadowSvg, buildSilhouetteShadowBuffer, defringeCutoutEdges,
matchCutoutGrain, matchCutoutSharpness, matchCutoutWhiteBalance, purgeDarkPlateFringe,
sampleBackdropAmbientColor, tintedShadowColor, trimCutoutToOpaqueBounds` → `featherCutout`를
`defringeCutoutEdges`와 `matchCutoutGrain` 사이에 삽입).

**호출 순서 주의**: hero는 `feather → WB → sharpness → grain` 순서. 위 삽입 위치는 라이프스타일의
기존 WB 호출(`cutoutPrepared = await matchCutoutWhiteBalance(...)`) 바로 앞이므로 동일한 순서가
됩니다 — 다른 순서로 넣지 마세요(예: grain 매칭 뒤에 넣으면 페더링이 그레인 노이즈를 다시 블러해
버려 효과가 반감됨).

## 작업 파일

`lib/lifestyle-product-composite.ts` **1개만 수정**. `lib/photo-composite.ts`·
`lib/photo-enhance.ts`·`components/`는 전혀 건드리지 마세요(featherCutout 자체는 이미
존재하는 함수라 photo-composite.ts 수정 불필요).

## 검증 스크립트 요청

`scripts/235cha-lifestyle-feather-verify.ts` 신규 작성해 다음을 확인해주세요:

1. `npx esbuild lib/lifestyle-product-composite.ts --bundle=false --format=esm --outfile=NUL` 구문 통과
2. `rg -n "featherCutout" lib` — import 1곳 + 호출 1곳(정의는 `photo-composite.ts`에 있음)
3. 하드엣지 합성 테스트 이미지로 `pasteCutoutOnScene()` 호출 전/후 반투명 경계 픽셀 수 비교
   (수정 전 코드로는 이 스크립트 자체가 작성 불가하니, 수정 후 결과에서 "페더링을 켰을 때"와
   "featherCutout 호출을 임시로 주석 처리했을 때"를 비교하는 방식도 가능 — 또는 단순히
   `featherCutout` 단독 함수를 직접 호출해 전/후 반투명 픽셀 수 차이를 보여주는 것으로 충분)
4. 정사각형에 가까운 씬(예 1200×1200)과 매우 가로로 긴 씬(예 2000×500)에서 각각
   `pasteCutoutOnScene` 호출이 예외 없이 성공하고 결과 이미지가 씬 크기를 유지하는지
5. 기존 WB/선명도/그레인 매칭(211차)이 페더링 도입 후에도 정상 동작하는지(에러 없이 통과)

스크린샷 1~2장(페더링 적용 전/후 합성 이미지 경계 클로즈업 비교) 있으면 좋습니다 —
`review/235cha-lifestyle-feather/`에 저장.

## 포함하지 않는 것

- hero 파이프라인(`photo-enhance.ts`)의 `featherCutout` 호출부는 이미 정상이므로 무변경.
- `defringeCutoutEdges`(색 번짐 제거)·`trimCutoutToOpaqueBounds`+`purgeDarkPlateFringe`
  (233차, 플레이트 잔여 제거)·`buildSilhouetteShadowBuffer`(234차, 그림자)는 전부 이미
  올바르게 배선돼 있어 이번 스코프 밖.
- **정정**: 같은 grep 전수 대조에서 hero에만 있는 `measureTransparentRatio`/
  `measureCornerMeanAlpha`/`measureCutoutPlateRisk`를 처음엔 "QA/로깅 전용"으로 오판했으나,
  `photo-enhance.ts:1725~1787`(`evaluateCutout`/`scoreCutout`/`isCutoutAcceptable`)를 다시
  읽어보니 실제로는 **rembg 품질 재시도 루프**의 판정 기준임을 확인 — hero는 productName이
  있으면 preCrop 파라미터를 바꿔가며 최대 3번 rembg를 다시 호출(`cropAttempts`)해 점수가 가장
  높은 컷아웃을 채택하고, 전부 기준 미달(`isCutoutAcceptable` 거짓)이면 **AI 배경 합성 자체를
  포기하고 원본 세이프크롭 사진으로 폴백**함. 반면 라이프스타일 경로의 `removeProductBackground()`
  (`lib/lifestyle-product-composite.ts:600`)는 rembg를 **딱 1번만** 호출하고 품질 점수·재시도·
  손 오염 검사·폴백 없이 결과를 그대로 씀 — hero보다 훨씬 큰 구조적 격차. **다만 이 격차를
  메우려면 hero와 동일하게 rembg를 최대 3번까지 추가 호출하고 손-오염 검사(Claude vision)도
  새로 호출해야 해서, 실제 운영 중 매 라이프스타일 합성마다 유료 API 호출 횟수가 늘어나는
  프로덕션 비용 변경**임 — Claude 자신의 검증 API 호출이 아니라 판매자가 실제 사용할 때마다
  느는 비용이라 "허가 없이 유료 API 호출 금지" 하드 가드레일 대상. 이번 235차 스코프에서는
  제외하고 **`pagzly-backlog-master`의 §4(API 필요·허가 대기)에 등록**, 사용자가 비용 증가를
  감수할지 결정할 때 재검토. `buildSoftContactShadowSvg`(hero 전용 추가 컨택트 섀도우)·
  `unifyCompositeGrain`(합성 전체 이음매용, 187차 주석상 AI 생성 배경과 실사 컷아웃의 이음매를
  통일하는 목적이라 실사진 배경인 라이프스타일 경로엔 애초에 적용 대상이 불분명)·
  `makeComparisonPair`(양쪽 다 미사용, 다른 용도로 추정)는 다음 라운드 후보로만 기록, 이번엔
  손대지 않음.

유료 API 0건.
