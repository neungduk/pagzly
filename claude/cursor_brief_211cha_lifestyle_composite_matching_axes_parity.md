# 211차 — 라이프스타일 합성(pasteCutoutOnScene) 매칭 축 3개 누락 보강

생성: 2026-09-17

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번 라운드도
코드 레벨 보강 + 결정론적 단위 테스트로만 검증하고, 실사 생성은 하지 않습니다(필요하면 기존
저장된 세션/이미지로 로컬 재검증).

## 배경 — 사용자 지시

사용자가 "화면 배치 구성 / 이미지 합성 / 인포그래픽 상향 / 뒷배경 제품 색상에 맞게" 4개 영역을
다시 점검해달라고 요청했습니다. 4개 영역을 전부 코드 대조한 결과, 3개 영역(레이아웃, 인포그래픽,
배경색 매칭 로직 자체)은 이미 여러 라운드에 걸쳐 성숙하게 구현돼 있어 새 코드 격차가 없었습니다.
**단 하나, "이미지 합성" 영역에서 실제 코드 격차를 하나 발견했습니다** — 지어낸 게 아니라
프로젝트 자체의 과거 라운드 문서들을 대조해서 나온 확인된 격차입니다.

### 무엇이 문제인가

Pagzly에는 "실제 상품 사진을 배경에 합성"하는 파이프라인이 두 개 있습니다:

1. **메인 히어로/배경 합성** (`lib/photo-enhance.ts`, 실루엣 경로 — AI가 만든 스튜디오 배경 위에
   실제 상품 컷아웃을 얹음): 162차(색상 화이트밸런스) → 163차(콘트라스트) → 164차(선명도) →
   187차(그레인/노이즈)까지 **4개 매칭 축**이 전부 배선돼 있습니다(`lib/photo-enhance.ts`
   1931~1936행 부근: `matchCutoutWhiteBalance` → `matchCutoutSharpness` → `matchCutoutGrain`
   순서로 호출, `lib/photo-composite.ts`에 정의).

2. **라이프스타일(AI 일상샷) 픽셀 페이스트** (`lib/lifestyle-product-composite.ts`의
   `pasteCutoutOnScene()`, 81차에서 도입 — 실제 사용자 업로드/생성된 "사람이 있는 사진" 위에
   실제 상품 컷아웃을 직접 붙임): **162차가 그림자 색조 매칭(`sampleBackdropAmbientColor`/
   `tintedShadowColor`)만 이 파일에도 동일하게 배선했다**는 기록이 `162cha-image-infographic-upgrade.md`에
   명시돼 있습니다 ("`lib/lifestyle-product-composite.ts` — 81차 픽셀 페이스트 파이프라인의
   `pasteCutoutOnScene`도 동일하게 배선. 여기는 실제 사용자 업로드 라이프스타일 사진이 배경이라
   ambient 매칭이 특히 더 직접적으로 자연스러움에 기여한다"). 하지만 그 이후 163/164/187차가
   `matchCutoutWhiteBalance`/`matchCutoutSharpness`/`matchCutoutGrain`을 만들고 배선할 때는
   전부 `lib/photo-enhance.ts`(메인 경로)만 대상으로 했고, **`lib/lifestyle-product-composite.ts`는
   세 라운드 모두 언급조차 되지 않았습니다** (187차 브리프의 "하지 않는 것"에도 이 파일은 없고,
   `import` 목록(`lib/lifestyle-product-composite.ts` 15~20행)에도 세 함수가 전혀 없음을 코드로
   직접 확인). 즉 두 합성 경로가 처음엔 나란히 갔다가(162차), 그 다음 3개 라운드 동안 한쪽만
   업그레이드되면서 조용히 벌어진 격차입니다 — 의도적으로 다르게 두기로 한 적이 없습니다.

162차 스스로도 "여기는 실제 사용자 업로드 라이프스타일 사진이 배경이라 ambient 매칭이 특히 더
직접적으로 자연스러움에 기여한다"고 적어뒀을 만큼, 이 경로의 매칭 품질을 메인 경로 이하로 방치할
이유가 없습니다. 그리고 세 함수 다 이미 존재하고 순수 함수라(파일 I/O·API 호출 없음, 배경 버퍼
측정 → 임계값 이하면 원본 그대로 반환하는 안전한 스킵 로직 내장) 재사용 리스크가 낮습니다 — 새
로직을 설계하는 게 아니라 이미 검증된 함수를 두 번째 호출부에 배선만 하면 됩니다.

## 작업

### 1. `lib/lifestyle-product-composite.ts`의 `pasteCutoutOnScene()` 수정

현재 (684~760행 부근) 흐름:

```ts
let cutoutPrepared = await sharp(rotated)
  .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
  .png()
  .toBuffer();

let cutMeta = await sharp(cutoutPrepared).metadata();
// ... (프레임 초과 시 한 번 더 축소하는 블록) ...

let pasteLeft = ...
let pasteTop = ...

const shadow = { ...DEFAULT_SHADOW };
// 162차 그림자 tint 블록
let sceneShadowTint: ... = await sampleBackdropAmbientColor(sceneBuffer) → tintedShadowColor(ambient)
const shadowSvg = buildSceneShadowSvg(...)
// ... shadow composite ...
return sharp(withShadow).composite([{ input: cutoutPrepared, left: pasteLeft, top: pasteTop }])...
```

크기/회전이 최종 확정된 직후, 그림자 계산 **이전에** 3개 매칭 축을 순서대로 적용하세요(메인
경로와 동일 순서 — 화이트밸런스 → 선명도 → 그레인):

```ts
// 211차 — 메인 히어로 경로(photo-enhance.ts)가 162/163/164/187차에 걸쳐 쌓은
// 컷아웃-배경 매칭 4축 중 그림자 색조(162차)만 이 파일에 배선돼 있었고 나머지
// 3축(화이트밸런스/선명도/그레인)은 누락돼 있었음 — 이번에 동일하게 보강.
// 세 함수 모두 (cutout, backdrop) => Promise<Buffer> 형태의 순수 함수이고,
// 배경이 이미 매끈하면 조용히 원본을 그대로 반환하는 스킵 로직이 내장돼 있어
// 안전합니다. backdrop 인자로는 sceneBuffer(실제 라이프스타일 사진)를 그대로 씁니다.
cutoutPrepared = await matchCutoutWhiteBalance(cutoutPrepared, sceneBuffer);
cutoutPrepared = await matchCutoutSharpness(cutoutPrepared, sceneBuffer);
cutoutPrepared = await matchCutoutGrain(cutoutPrepared, sceneBuffer);
```

정확한 삽입 위치: "극단 placement로도 씬보다 크면 한 번 더 축소" 블록이 끝나고 `cutMeta`가
최종 확정된 다음, `pasteLeft`/`pasteTop` 계산 이전이든 이후든 상관없습니다 — 다만 그림자 SVG를
만들기 **전에** 최종 `cutoutPrepared`가 매칭까지 끝난 상태여야 합니다(그림자는 별도 레이어라
순서 영향 없음). `import` 목록에 `matchCutoutWhiteBalance`, `matchCutoutSharpness`,
`matchCutoutGrain`을 `@/lib/photo-composite`에서 추가하세요(이미 같은 파일에서
`buildProductShadowSvg`, `defringeCutoutEdges`, `sampleBackdropAmbientColor`, `tintedShadowColor`를
import하고 있으니 같은 줄에 추가하면 됩니다).

### 2. 회귀 검증 (전부 무료 — 생성 API 불필요)

`scripts/211cha-lifestyle-matching-verify.ts` 같은 스크립트로:

1. 매끈한 단색/그라디언트 씬 버퍼 + 매끈한 컷아웃 → 매칭 3개 함수 각각 원본과 거의 동일(스킵
   임계값 이하)하게 반환되는지 확인 (163/164/187차가 이미 각자 이런 스킵 테스트를 갖고 있으니
   그 패턴을 그대로 재사용).
2. 색이 뚜렷이 다른 씬(예: 진한 파란 배경) + 중립 회색 컷아웃 → `matchCutoutWhiteBalance` 적용
   후 컷아웃 평균색이 원본보다 씬 쪽으로 유의미하게 이동했는지 확인.
3. 거친 텍스처 씬(노이즈 합성) → `matchCutoutGrain` 알파가 0.02~0.05 범위 안에서 적용되는지
   (187차 브리프의 검증 방식 그대로).
4. `pasteCutoutOnScene()`을 실제로 호출해서 반환된 버퍼가 여전히 유효한 PNG이고 크기가
   `sceneBuffer`와 같은지(회귀 방지 — 167차가 잡았던 캔버스 초과 버그가 재발하지 않는지도 같이
   확인).
5. `npx tsc --noEmit` — 0 에러.

QA 스크린샷은 필요 없습니다(코드 레벨 함수 배선이라 167차 방식대로 순수 함수 단위 테스트로
충분). 굳이 보고 싶다면 `review/`에 이미 저장된 라이프스타일 합성 결과 이미지가 있으면 그걸로
로컬 재렌더 정도만 — 신규 유료 생성은 하지 마세요.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 메인 경로(`lib/photo-enhance.ts`, `lib/photo-composite.ts`의 함수 본체)는 이번 라운드 대상이
  아닙니다 — 이미 완성돼 있으니 건드리지 마세요. 이번은 오직 `lib/lifestyle-product-composite.ts`
  한 파일의 배선 추가입니다.
- `pasteCutoutOnScene()`의 나머지 로직(리사이즈/회전/클램프/그림자 계산, 167차가 고친 부분)은
  변경하지 않습니다 — 매칭 함수 3줄만 추가합니다.
- `applyPhysicalScaleToPlacement()`, `detect-held-object-placement.ts` 등 배치 감지 로직은
  이번 범위 밖입니다.
- 174~198차가 끝낸 레이아웃/타이포/아이콘/elevation 관련 작업 재작업 없음(이번 조사에서
  레이아웃·인포그래픽·배경색-매칭-로직 3개 영역은 이미 충분함을 재확인했으니 그쪽은 손대지
  마세요).

## 완료 보고 형식

3~5줄 요약 + 코드 diff. 단위 테스트 5개 항목 통과 여부만 짧게. 스크린샷/표 불필요(187차와
동일한 저위험 배선 작업).

## 백로그 마스터 (참고만 — 이번엔 Cursor가 갱신하지 않음)

`claude/pagzly-backlog-master-2026-09-15.md`는 Claude(Cowork 세션)가 직접 갱신합니다. 이 항목이
완료되면 보고서(`review/211cha-report.md`)만 남겨주시면, 검증 후 제가 문서에 반영하겠습니다.
