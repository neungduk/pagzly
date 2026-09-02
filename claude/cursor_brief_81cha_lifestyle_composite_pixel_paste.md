# 81차 — 라이프스타일 합성 2단계: 실제 상품 컷아웃 픽셀 합성 (68차 후속, 드디어 착수)

생성: 2026-09-02

## ⚠️ 먼저 알아야 할 것 — 68차가 지금까지 방치돼 있었습니다

68차(`cursor_brief_68cha_lifestyle_composite_fidelity.md`)에서 "인물 합성 시 라벨/로고가 재해석되는 문제"를 고치라고 지시했는데, 라이브 코드(`lib/lifestyle-product-composite.ts`)를 다시 확인해보니 **64차 때 프롬프트 그대로**이고, `review/` 폴더에도 `68cha-report.md`가 없습니다. 즉 68차는 지시만 나가고 한 번도 실행되지 않았습니다 — 그 사이 71~80차(캔버스 에디터·결제 UI)로 우선순위가 넘어가면서 방치된 것으로 보입니다. 사용자가 계속 이 문제를 겪고 있던 게 당연합니다.

68차는 "1단계(프롬프트 보강) 먼저, 부족하면 2단계(실제 컷아웃 재합성)"로 단계를 나눴는데, 사용자가 이미 여러 번 품질 문제를 겪었으니 **이번엔 1단계를 건너뛰고 바로 2단계로 갑니다.**

## 배경 — 왜 지금 방식은 라벨이 깨지는가

`compositeProductOnLifestylePhoto()`(`lib/lifestyle-product-composite.ts`)는 지금 `google/nano-banana`에게 "이 사람이 이 제품을 들고 있는 것처럼 장면 전체를 다시 그려라"고 지시합니다. 이 모델은 참조 이미지를 그대로 붙여넣는 게 아니라 이해하고 다시 그리기 때문에 라벨 텍스트·로고가 미묘하게 재해석됩니다.

반면 우리 히어로 배경 파이프라인(`lib/photo-enhance.ts`)은 전혀 다른 원칙입니다: AI는 **빈 배경만** 생성하고, 실제 상품 컷아웃 픽셀은 `sharp`로 그 위에 **그대로 오려 붙입니다**(`.composite()`) — 그래서 라벨이 100% 보존됩니다. `resolveShadowForBackdrop()`, contact-shadow SVG(`multiply` 블렌드) 같은 접지 그림자 처리도 이미 이 파일에 구현돼 있습니다(1930~1940행 부근). 이번 라운드는 이 원칙을 라이프스타일 합성에도 적용합니다.

## 새 파이프라인 (4단계)

`lib/lifestyle-product-composite.ts`의 `compositeProductOnLifestylePhoto()`를 아래 로직으로 교체하세요.

### 1단계 — nano-banana는 "실루엣만" 그리게 (라벨 재현 요구 안 함)

지금 프롬프트에서 제품명을 언급하며 "그 제품을 들고 있는 것처럼" 그리라고 하는 대신, **"참조 이미지 2번과 대략 비슷한 크기/형태의 물체를 자연스럽게 들고 있는 손"만 그리게** 프롬프트를 바꿔주세요. 정확한 라벨/텍스트/로고를 그리려고 시도하지 말라고 명시하세요:

```
"Edit the lifestyle photo so the person naturally holds an object matching
the approximate size and silhouette of the object in the second reference
image. Do NOT attempt to render any text, logo, label detail, or exact
surface pattern on the held object — keep it as a simple, roughly correct
shape and color-blocked form only, since the surface will be replaced
separately. Prefer hands and forearms visible, avoid extreme face close-up.
Match original scene lighting and shadows. no distorted fingers, no extra
limbs, no text, no watermark."
```

이렇게 하면 nano-banana의 임무가 "손·포즈·장면"만 자연스럽게 만드는 것으로 줄어들어서, 정확한 라벨 렌더링 부담 자체가 없어집니다.

### 2단계 — Claude Vision으로 "들고 있는 물체" 위치 감지

새 함수(예: `lib/detect-held-object-placement.ts`, `detectHeldObjectPlacement()`)를 만드세요. 패턴은 `lib/analyze-product-annotations.ts`의 `analyzeProductAnnotations()`를 거의 그대로 참고하면 됩니다(같은 Haiku Vision 모델, 같은 base64 이미지 + JSON 응답 프롬프트 방식):

- 입력: 1단계에서 나온 이미지(사람이 실루엣 물체를 들고 있는 장면).
- 출력 JSON: `{ xPct, yPct, wPct, hPct, rotationDeg, confidence: "high" | "low" }` — 들고 있는 물체의 바운딩 박스(좌상단 기준 %)와 대략적인 회전각.
- `confidence: "low"`이거나 파싱 실패 시 `reliable: false` 반환 — `analyzeProductAnnotations`와 동일한 안전 폴백 원칙.

### 3단계 — 실제 컷아웃을 감지된 위치에 합성

- 기존 `removeProductBackground()`로 이미 뽑아둔 실제 상품 컷아웃을 재사용.
- `sharp`로 감지된 `wPct`/`hPct`에 맞춰 `.resize()`, `rotationDeg`만큼 `.rotate()`(또는 회전이 크지 않으면 `.affine()`로 근사) 적용.
- **참고**: `sharp`는 4점 완전 원근 변형(perspective warp)을 기본 지원하지 않습니다. 이번 라운드는 완전한 원근 보정까지는 요구하지 않습니다 — `rotate`/`resize`로 각도·크기만 맞추는 근사로 충분합니다(대부분의 손에 든 제품 사진은 카메라와 거의 정면에 가까움). 완전한 원근 변형은 나중에 필요하면 별도 라운드에서 라이브러리 도입을 검토하세요.
- `.composite()`로 감지된 `xPct`/`yPct` 위치에 붙이고, `lib/photo-enhance.ts`의 contact-shadow(그림자 SVG + `multiply` 블렌드) 아이디어를 참고해서 경계가 붕 떠 보이지 않게 옅은 그림자를 하나 더해주세요(완전히 같은 함수를 재사용할 필요는 없고, 같은 원리로 이 파일 안에 작게 구현하면 됩니다).

### 4단계 — 폴백 체인 (안전장치, 반드시 구현)

1. 2단계 Vision이 `confidence: "low"`거나 바운딩 박스가 비합리적(너무 작음/화면 밖 등)이면 → **기존 64차 방식(현재 코드, 즉 nano-banana가 장면 전체를 한 번에 그리는 방식)으로 폴백**하되, 그 프롬프트에는 68차 1단계가 제안했던 라벨 보존 문구("Do NOT redraw, redesign, or alter the product's packaging, label text, logo...")를 추가해서 최소한의 안전판으로 삼으세요.
2. 그마저 실패(API 에러/타임아웃)하면 → 기존과 동일하게 **원본 라이프스타일 사진 그대로**(`composited: false`) 반환.
3. 어떤 단계에서 실패했는지 로그로 명확히 남겨주세요(`[lifestyle-composite] stage=pixel-paste failed, reason=...` 형태) — 나중에 어느 단계가 자주 실패하는지 파악할 수 있게.

## 하지 않는 것

- AI로 가짜 인물을 새로 생성하는 것 (64차와 동일 원칙, 여전히 범위 밖).
- 완전한 4점 원근 변형(perspective warp) 구현 — 이번엔 회전+크기 근사까지만.
- `runPhotoEnhancementPipeline()` 연동 부분(66차에서 이미 배선 완료) 변경 — 이번은 `compositeProductOnLifestylePhoto()` 내부 로직 교체만.
- 기존 히어로/배경 생성 파이프라인(`lib/photo-enhance.ts`) 자체 로직 변경 없음 — 참고만 하고 그대로 둠.

## 검증 방법 — 솔직하게, 라벨 일치 여부로만 판단

- 실제 상품 사진 2~3개(라벨/로고가 뚜렷한 것 — 예: 화장품 튜브, 음료 캔처럼 텍스트가 있는 제품)로 라이프스타일 합성을 각각 돌려서:
  - 원본 상품 사진의 라벨 부분을 확대한 크롭
  - 합성 결과의 같은 라벨 부분을 확대한 크롭
  - 이 둘을 나란히 놓고 "텍스트/로고가 일치하는가"를 육안으로 확인 — "이전보다 나아졌다"가 아니라 "일치하는가 아닌가"로 판단.
- Vision 바운딩 박스 감지가 `low`로 나와서 폴백이 발동한 사례도 있는 그대로 보고서에 남겨주세요(67차처럼 실패 사례를 숨기지 않는 것이 중요).
- 손가락에 물체가 가려지는 경우, 합성 결과가 부자연스러우면(경계가 뜨거나 그림자가 이상하면) 그것도 솔직하게 스크린샷과 함께 보고.
- `npx tsc --noEmit` 에러 0건.
- 비용 기록(배경 제거 + Vision 감지 + nano-banana, 실제 호출 횟수와 총액).

## 완료 보고 형식

기존과 동일 — 변경 파일, `tsc` 결과, 원본/합성 라벨 확대 비교 스크린샷(2~3개 상품), Vision 감지 신뢰도별 발생 빈도, 폴백이 발동한 사례 유무, 총 비용, **이 방식이 68차가 원했던 수준의 라벨 정확도를 실제로 달성했는지에 대한 솔직한 결론**(부분적으로만 개선됐다면 그렇게 말하고, 어떤 실패 모드가 남아있는지 구체적으로 적어주세요).
