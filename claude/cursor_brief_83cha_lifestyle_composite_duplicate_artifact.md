# 83차 — 82차 후속: "이중 컷아웃" 아티팩트 원인 확인 + 방지

생성: 2026-09-02

## 배경 — 82차 검증 중 직접 스크린샷을 보고 발견한 문제

82차(폴백 브랜드 창작 방지 + QA 픽스처 + 중앙 정렬)는 브리프대로 정확히 구현됐고, 특히 문제 1(가짜 브랜드 생성)은 스크린샷으로도 확실히 해소된 걸 확인했습니다. 그런데 82차 QA 스크린샷(`82cha-labeled-serum-hands-full-compare.png`, `82cha-labeled-jar-hands-full-compare.png`, `82cha-center-align-before-after.png`)을 직접 열어보니, 보고서가 "이중 컷아웃 아티팩트"라고 짧게만 언급한 문제가 생각보다 뚜렷합니다:

- 세럼 케이스: 손 근처에 정확히 붙은 앰버 드로퍼 병(진짜 컷아웃) 옆, 왼쪽 아래에 **똑같이 생긴 작은 병이 하나 더** 떠 있습니다.
- 튜브 케이스: 손에 쥔 큰 튜브 옆에 **같은 모양의 작은 튜브가 하나 더** 비스듬히 떠 있습니다.

두 케이스의 원본 상품 사진(`82cha-labeled-serum-hands-input-product.jpg`, `82cha-labeled-jar-hands-input-product.jpg`)을 직접 열어서 확인했는데, **둘 다 단일 제품 단독 컷 사진**입니다 — 콜라주나 여러 각도가 한 이미지에 들어있는 게 아닙니다. 그래서 "원본 상품 이미지 자체에 물체가 2개 있었다"는 가설은 배제됩니다.

## 원인 추정 (검증 필요 — 추측으로 고치지 말 것)

`lib/lifestyle-product-composite.ts`의 흐름을 보면:

1. `runNanoBanana({prompt: SILHOUETTE_PROMPT, ...})` — nano-banana가 "사람이 물체를 들고 있는" 장면을 **직접 그려서** `silhouetteUrl`을 반환합니다.
2. `pasteCutoutOnScene()`에서 이 `silhouetteUrl` 이미지를 그대로 `sceneBuffer`(합성 캔버스)로 사용하고, 그 위에 Vision이 감지한 위치에 진짜 컷아웃을 얹습니다(227행 부근 `sharp(withShadow).composite([{input: cutoutPrepared, left: pasteLeft, top: pasteTop}])`).
3. 즉 **최종 이미지 = nano-banana가 그린 실루엣 장면 원본 그대로 + 그 위에 얹은 진짜 컷아웃 1개**입니다. nano-banana가 그린 원래 실루엣 부분은 지우거나 가리는 과정이 없습니다.

이 구조를 보면, 만약 nano-banana가 1단계에서 "들고 있는 물체"를 장면 어딘가에 **이미 그려 넣었는데 그게 Vision이 감지한 주 위치와 다른 자리에 하나 더** 있거나(예: 손 위 물체 + 배경 어딘가의 작은 잔상/보조 형태), Vision이 그 중 하나만 감지해서 그 자리에 진짜 컷아웃을 얹으면, **AI가 그린 나머지 부분은 지워지지 않고 그대로 남아** "두 개로 보이는" 현상이 생길 수 있습니다. 이게 가장 유력한 가설이지만, 현재 파이프라인은 실루엣 원본 이미지를 저장하지 않고 바로 다음 단계로 넘기기 때문에 **직접 눈으로 확인한 적이 없습니다.** 확인 없이 프롬프트만 고치면 또 추측성 수정이 되니, 이번엔 먼저 원인을 눈으로 확인하고 그다음 고치는 순서로 진행해주세요.

## 지시 — 순서대로

### 1단계 — 진단: 실루엣 원본을 반드시 저장해서 직접 확인

`compositeProductOnLifestylePhoto()`에서 `silhouetteUrl`을 받은 직후, QA 스크립트(`scripts/83cha-*.ts`, 82차 스크립트를 참고해서 새로 작성)에서 **실루엣 단계의 원본 이미지를(픽셀 합성 이전 상태) 그대로 다운로드해서 `review/qa-screenshots/<case>-silhouette-raw.png`로 저장**하세요. 운영 코드(`compositeProductOnLifestylePhoto`) 자체에 저장 로직을 넣을 필요는 없고, QA 스크립트에서 `runNanoBanana` 호출 결과(또는 함수에 임시 디버그 콜백/옵션을 하나 추가)로 그 URL을 받아서 다운로드하면 됩니다 — 가장 간단한 방법을 쓰세요.

82차에서 이미 검증에 쓴 라벨 있는 실제 상품 2건(세럼/튜브, `scripts/82cha-lifestyle-composite-qa.ts`의 `productUrl`들 재사용)으로 이 실루엣 원본을 저장하고, **육안으로 실제 그 안에 물체가 몇 개 그려졌는지 확인**하세요.

### 2단계 — 확인된 원인에 따라 수정

**만약 실루엣 이미지 자체에 물체가 2개 이상 그려져 있다면** (가장 유력):

- `SILHOUETTE_PROMPT`(현재 114~123행)에 "정확히 하나의 물체만" 그리라는 제약을 명시적으로 추가하세요. 예시 취지:

```
"There must be exactly ONE held object in the entire image — do not add a
second copy, a smaller duplicate, a dropped/floating extra version, or any
other product-like shape anywhere else in the frame. Only the single object
in the person's hand(s)."
```

- 프롬프트 수정만으로 완전히 해결되지 않을 수 있으므로(지시 기반 이미지 모델의 고질적 한계 — 이 프로젝트에서 여러 번 확인됨), 안전장치로 `detectHeldObjectPlacement()`의 Vision 프롬프트에 "이 장면에 물체로 보이는 형태가 2개 이상 있는가?"를 함께 물어보는 필드를 추가하는 것도 검토하세요(예: `hasDuplicateArtifact: boolean` 같은 필드). 만약 true로 나오면 그 실루엣은 신뢰하지 말고 **바로 4단계 폴백으로 넘어가게** 하세요 — 어설프게 지우려고 시도하다 더 이상해지는 것보다, 차라리 폴백(64차 방식, 이미 라벨 보존+브랜드 창작 방지 문구 적용됨)으로 넘어가는 게 안전합니다.

**만약 실루엣 이미지 자체는 물체가 1개뿐인데 다른 단계(예: 그림자 SVG, sharp 합성 로직)에서 문제가 생긴 거라면** — 그 경우엔 추측하지 말고 정확히 어느 단계에서 두 번째 형태가 생기는지 로그/중간 이미지로 특정해서 보고서에 남기고, 그에 맞는 수정을 해주세요.

## 하지 않는 것

- 완전한 원근 변형, Vision bbox 정확도 개선(82차까지의 스코프) — 이번엔 "이중 아티팩트" 문제 하나에 집중.
- 라벨 문자 일치 QA(여전히 미해결 상태로 남아있는 게 맞음) — 이번 라운드의 목표가 아님. 다만 이번 QA에서 우연히 텍스트가 잘 보이면 있는 그대로 보고해주세요.

## 검증 방법

- 실루엣 원본 저장 스크린샷(2건, 세럼/튜브) — 물체가 몇 개 그려졌는지 명시.
- 수정 후 같은 2건으로 재QA, 전체 비교 스크린샷에서 이중 아티팩트가 사라졌는지 확인.
- 안전장치(폴백 전환)가 실제로 발동한 사례가 있으면 있는 그대로 보고 — 발동 빈도도 남겨주세요.
- `npx tsc --noEmit` 에러 0건.
- 비용 기록.

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, (1) 실루엣 원본 스크린샷과 거기서 확인된 실제 원인, (2) 수정 전/후 전체 비교 스크린샷, (3) 안전장치 발동 여부/빈도, 총 비용, 솔직한 결론(완전히 해결됐는지, 아니면 부분적으로만 개선됐는지와 남은 실패 모드).
