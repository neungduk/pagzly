# 82차 — 81차 후속: 폴백 브랜드 창작 방지 + QA 픽스처 결함 수정 + 붙여넣기 중앙 정렬

생성: 2026-09-02

## 배경 — 81차를 직접 코드/스크린샷으로 검증한 결과

81차(`lib/lifestyle-product-composite.ts`, `lib/detect-held-object-placement.ts`)는 브리프대로 정확히 구현됐고, Cursor의 완료 보고서(`review/81cha-report.md`)도 과장 없이 정직했습니다. 다만 제가 라이브 코드와 QA 스크린샷을 직접 다시 확인하면서, 보고서에는 없던 3가지 구체적 문제를 발견했습니다. 이번 라운드는 이 3가지를 고쳐서 "상세페이지 인물 합성 품질"을 실제로 검증 가능하고 더 안전한 상태로 만드는 게 목표입니다.

## 문제 1 (가장 시급 — 실제 운영 리스크) — 폴백 경로가 없는 라벨을 지어냄

`lib/lifestyle-product-composite.ts`의 `buildFallbackPrompt()` (114~136행 부근):

```ts
function buildFallbackPrompt(productName: string, category: string): string {
  return [
    `Edit the lifestyle photo so the person naturally holds or uses the ${productName} product from the reference cutout.`,
    "Do NOT redraw, redesign, or alter the product's packaging, label text, logo,",
    "or brand colors in any way — preserve the exact appearance of the reference",
    "product image pixel-for-pixel where visible. Only change the surrounding hand/pose/scene.",
    ...
  ].join(" ");
}
```

이 프롬프트는 "제품에 라벨/로고가 있으면 그대로 보존하라"고만 지시합니다. **제품에 애초에 라벨/로고가 없는 경우를 다루지 않습니다.** 실제로 81차 QA의 flatlay 케이스에서 이 구멍이 그대로 드러났습니다 — 원본 상품(`enhanced-fx-moisture.png`)은 라벨이 전혀 없는 무지 용기/텍스처 클로즈업인데, 폴백 결과에는 원본에 없던 "글로우 카밍 수분 크림"이라는 완전히 새로운 한글 브랜드명과 로고 마크가 생성되어 있었습니다(`review/qa-screenshots/81cha-cosmetics-flatlay-label-compare.png`에서 육안 확인). 이건 "라벨 재해석"이 아니라 **없는 브랜드를 처음부터 만들어낸 것**입니다 — 실제 판매자의 무라벨/저라벨 제품이 이 폴백을 타면 상세페이지에 가짜 브랜드명이 박힐 수 있다는 뜻이라 방치하면 안 됩니다.

### 지시

`buildFallbackPrompt()`에 아래 취지의 문장을 추가하세요 (정확한 워딩은 자유롭게 다듬어도 되지만 의미는 유지):

```
"If the reference product surface has no clearly visible text, logo, or brand
mark, keep the held object's surface plain and text-free — do NOT invent,
generate, or add any new brand name, logo, or text that is not visibly
present in the reference image."
```

가능하면 `productName`을 프롬프트에 넣을 때도 "이 이름의 실제 제품처럼 보이게 그려라"는 뉘앙스가 브랜드 창작을 유도하지 않는지 점검해주세요 — 현재 `Edit the lifestyle photo so the person naturally holds or uses the ${productName} product...` 문장 자체가 모델에게 "이 이름을 가진 그럴듯한 제품"을 상상해서 그리라는 신호로 읽힐 수 있습니다. 필요하면 `productName`을 프롬프트에서 빼거나 "just match the reference cutout's actual appearance, regardless of what the product is called" 같은 문장으로 보완하세요.

## 문제 2 — QA 스크립트의 테스트 픽스처가 애초에 라벨 검증이 불가능하게 짜여 있었음

`scripts/81cha-lifestyle-pixel-paste-qa.ts`의 `CASES` 배열(26~52행)을 다시 보면:

- `81cha-cosmetics-hands`와 `81cha-cosmetics-flatlay` 두 케이스가 **완전히 같은 `productUrl`**(`...enhanced-fx-moisture.png`)을 씁니다 — 라벨/로고가 없는 크림 텍스처 클로즈업입니다.
- 유일하게 라벨이 있을 법한 `81cha-beverage-hands` 케이스는 `optional: true`이고, `productUrl`이 `.../1770000000000-sample-beverage.png`인데 이 URL은 **존재하지 않아 HEAD 요청이 실패**합니다(보고서의 "3번째 optional beverage는 URL 404로 스킵"이 바로 이것). 즉 이 케이스는 애초에 한 번도 실행된 적이 없습니다.

결론적으로 81차 QA는 "라벨/로고가 뚜렷한 실제 제품에서 pixel-paste가 라벨을 잘 보존하는가"라는, 이번 라운드의 진짜 목표를 **단 한 번도 테스트하지 못했습니다.** hands 케이스가 "성공"으로 표시된 건 파이프라인이 안 죽었다는 뜻이지 라벨이 맞았다는 뜻이 아닙니다.

### 지시

1. `CASES` 배열에서 라벨/로고가 뚜렷하게 보이는 실제 상품 이미지 2개를 새로 준비하세요 — 예: 텍스트 라벨이 있는 화장품 튜브/병, 로고가 인쇄된 음료 캔이나 박스. Pagzly 기존 테스트 계정에 이미 업로드된 상품 사진 중 라벨이 있는 것을 재사용하거나, Pixabay 등에서 라벨이 뚜렷한 제품 사진을 새로 찾아 써도 됩니다.
2. 존재하지 않는 `sample-beverage.png` URL은 실제 접근 가능한 이미지로 교체하거나(라벨 있는 걸로), 케이스 자체를 제거하세요. "URL 404라서 스킵"이 조용히 통과되지 않도록, HEAD 체크 실패 시 QA 스크립트가 **경고성 로그만 남기고 넘어가지 말고 최종 요약에 "실행되지 않음"으로 명시**되게 해주세요(이미 `results.push`가 안 되고 있어서 요약 JSON에는 안 잡히는데, 콘솔 로그 말고 `81cha-composite-summary.json`에도 스킵된 케이스가 기록되게 보완).
3. 이 새 케이스들로 QA를 다시 돌려서, 원본 라벨 확대 크롭과 합성 결과 라벨 확대 크롭을 나란히 놓고 실제로 텍스트/로고가 일치하는지 이번엔 제대로 판단하세요.

## 문제 3 — 픽셀 붙여넣기가 좌상단 기준으로 앵커링되어 있어 "붕 뜬" 느낌을 악화시킬 수 있음

`pasteCutoutOnScene()`(178~216행)에서:

```ts
const cutoutPrepared = await sharp(cutoutBuffer)
  .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
  .rotate(placement.rotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
...
return sharp(withShadow)
  .composite([{ input: cutoutPrepared, left, top }])
  .png()
  .toBuffer();
```

`fit: "inside"`는 종횡비를 유지하면서 박스 안에 맞추기 때문에, 컷아웃의 실제 가로/세로 비율이 Vision이 감지한 박스(`wPct`/`hPct`)의 비율과 다르면 리사이즈 후 실제 이미지 크기가 `targetW`/`targetH`보다 작아집니다. 그런데 합성 위치는 항상 박스의 **좌상단** `(left, top)`을 기준으로 붙이기 때문에, 컷아웃이 박스보다 작아진 만큼 박스의 오른쪽/아래쪽에 빈 공간이 남고 컷아웃은 왼쪽 위로 쏠려 붙습니다. 이게 hands 케이스에서 관찰된 "손 위에 붕 떠 보인다"는 현상의 원인 중 하나일 가능성이 높습니다(회전/원근 미반영 문제와는 별개로, 이건 간단히 고칠 수 있는 정렬 버그입니다).

### 지시

리사이즈된 컷아웃의 실제 크기(`cutMeta.width`/`height`, 이미 199~201행에서 구하고 있음)를 이용해서, 박스 안에서 **중앙 정렬**되도록 `left`/`top`을 보정하세요:

```ts
const pasteLeft = left + Math.round((targetW - cutW) / 2);
const pasteTop = top + Math.round((targetH - cutH) / 2);
```

그림자 SVG(`buildSceneShadowSvg`)에 넘기는 `placement`(228행 부근)도 이 보정된 `pasteLeft`/`pasteTop` 기준으로 맞춰서 그림자와 실제 붙여넣기 위치가 어긋나지 않게 해주세요.

## 하지 않는 것 (스코프 유지)

- 완전한 4점 원근 변형(perspective warp) — 여전히 다음 라운드로 미룸.
- Vision 프롬프트(`detectHeldObjectPlacement`)나 실루엣 프롬프트(`SILHOUETTE_PROMPT`) 자체는 이번엔 변경 안 함 — 문제 1~3에 해당하는 부분만 손댐.
- `runPhotoEnhancementPipeline()` 연동부 변경 없음.

## 검증 방법 — 솔직하게, 라벨 일치 여부로만 판단

- 문제 2에서 새로 준비한 라벨 있는 실제 제품 2개로 QA를 다시 돌리고, 원본 라벨 크롭 vs 합성 결과 라벨 크롭을 나란히 놓은 스크린샷을 남기세요. "이전보다 나아졌다"가 아니라 "텍스트/로고가 일치하는가 아닌가"로 판단해주세요.
- 문제 1 수정 후, 라벨이 없는 제품(기존 `enhanced-fx-moisture.png` 케이스 그대로 재사용 가능)으로 폴백 경로를 다시 트리거해서 이번엔 가짜 브랜드명/로고가 생성되지 않는지 확인하고 스크린샷으로 남기세요.
- 문제 3 수정 후, pixel-paste 성공 케이스의 전체 비교 스크린샷에서 컷아웃이 이전보다 자연스러운 위치에 붙는지 육안 확인.
- 여전히 실패하는 케이스(Vision confidence low, 폴백 발동 등)가 있으면 숨기지 말고 그대로 보고.
- `npx tsc --noEmit` 에러 0건.
- 비용 기록.

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, (1) 라벨 있는 새 테스트 케이스의 원본/합성 라벨 확대 비교 스크린샷, (2) 무라벨 제품 폴백 재테스트 스크린샷(가짜 브랜드 생성 여부), (3) 중앙 정렬 적용 전/후 비교 스크린샷, 총 비용, 그리고 **이번에도 어떤 실패 모드가 남아있는지 솔직한 결론**.
