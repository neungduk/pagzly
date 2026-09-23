# 187차 — 컷아웃/배경 그레인(노이즈) 매칭 (코드 전용, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번엔
단일 트랙만 정확히 끝내는 데 집중하세요(185/186차 같은 다중 트랙 아님).

## 배경

162(색상)→163(콘트라스트)→164(선명도) 순서로 "컷아웃을 배경에 맞춰 측정 후 매칭"하는
축을 3개 쌓았는데, 164차 완료 보고서가 후보로 남긴 4번째 축이 아직 비어 있습니다:

> "이미지: 색상(162차)·콘트라스트(163차)·선명도(164차) 3축 매칭이 갖춰졌으니, 다음은
> 그레인/노이즈 레벨 매칭(이미 `unifyCompositeGrain()`이 있지만 배경별 노이즈 강도 차이까지
> 반영하는지는 미검토) 검토 여지"

제가 `lib/photo-composite.ts`를 직접 읽어 확인했습니다: `unifyCompositeGrain()`(716~734행)은
`feTurbulence`(`baseFrequency="0.85"`)로 만든 노이즈를 `feColorMatrix` 알파 **고정값 0.045**로
최종 합성 이미지 전체에 오버레이합니다 — 즉 배경이 원래 거친 사진(질감 있는 리넨, 우드
표면 등)이든 매끈한 그라디언트 배경이든 **완전히 동일한 강도**로 적용됩니다. 162~164차가
전부 "배경을 먼저 측정하고 그 값에 맞춰서만 보정 강도를 정한다"는 원칙으로 만들어진 것과
달리, 이 함수만 그 원칙을 안 따르고 있다는 게 확인된 실제 코드 격차입니다.

## 작업 — `matchCutoutGrain()` 신규, `matchCutoutSharpness()`와 동일한 아키텍처로

`lib/photo-composite.ts`의 `matchCutoutSharpness()`(489~542행)가 쓰는 패턴을 그대로
따르세요: **배경을 측정 → 임계값 이하면 조용히 원본 반환(스킵) → 임계값을 넘는 만큼만,
클램프된 좁은 범위 안에서만 보정**. 아래는 참고용 구현 스켈레톤입니다(그대로 써도 되고,
sharp/libvips 실측으로 상수를 조정해도 됩니다 — 164차도 그렇게 했습니다):

```ts
/**
 * 187차 — 컷아웃과 배경의 그레인(노이즈) 레벨 매칭. 162(색상)/163(콘트라스트)/
 * 164(선명도)에 이은 네 번째 매칭 축. `unifyCompositeGrain()`은 고정 강도(0.045)를
 * 배경과 무관하게 전체 이미지에 오버레이했는데, 이 함수는 배경 자체가 원래 거친
 * 질감(리넨/우드/콘크리트 등)일 때만, 그 정도에 비례해서만 컷아웃에 미세한 노이즈를
 * 추가한다. 배경이 매끈하면(그라디언트/스튜디오 배경) 아무것도 하지 않는다.
 * 제품 상세(질감·각인·라벨 텍스트) 손상을 막기 위해 노이즈 알파 상한을 보수적으로
 * 둔다(0.02~0.05 — unifyCompositeGrain의 기존 0.045를 넘지 않음).
 */
function noiseLevelAverage(
  gray: Uint8Array,
  blurredGray: Uint8Array,
  width: number,
  height: number,
  isSamplable: (i: number) => boolean,
): number {
  // 원본과 약한 블러본의 절대차 평균 = 고주파 잔차(그레인/노이즈) 근사치.
  // matchCutoutSharpness의 edgeIntensityAverage(방향성 엣지)와 달리, 이건 국소
  // 텍스처 잔차라 매끈한 그라디언트 배경에서는 거의 0에 수렴한다.
  let sum = 0;
  let n = 0;
  for (let i = 0; i < width * height; i += 1) {
    if (!isSamplable(i)) continue;
    sum += Math.abs(gray[i] - blurredGray[i]);
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

export async function matchCutoutGrain(
  cutout: Buffer,
  backdrop: Buffer,
): Promise<Buffer> {
  const bgResized = sharp(backdrop).resize(256, 256, { fit: "cover" }).grayscale();
  const bgSharp = await bgResized.clone().raw().toBuffer({ resolveWithObject: true });
  const bgBlur = await bgResized.clone().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const backdropGrain = noiseLevelAverage(
    bgSharp.data,
    bgBlur.data,
    bgSharp.info.width,
    bgSharp.info.height,
    () => true,
  );

  // 배경 자체가 사실상 매끈함(그라디언트/스튜디오) — 매칭 불필요, 즉시 스킵.
  const skipThreshold = 2.2; // sharp/libvips 실측으로 조정 가능 — 164차와 동일 방식
  if (backdropGrain < skipThreshold) return cutout;

  // 그레인 정도에 비례해 알파를 0.02~0.05 사이에서만 스케일 (unifyCompositeGrain
  // 기존 0.045를 상한으로 삼아, 이 함수가 그보다 더 거칠어지지 않게 한다).
  const t = Math.min(1, (backdropGrain - skipThreshold) / 6); // 6 = 실측 후 조정
  const alpha = 0.02 + t * 0.03;

  const meta = await sharp(cutout).metadata();
  const size = meta.width ?? 1200;
  const noiseSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 ${alpha.toFixed(3)} 0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>`,
  );
  const noise = await sharp(noiseSvg).png().toBuffer();

  // 알파 채널은 그대로 보존 — RGB에만 노이즈 오버레이 (matchCutoutSharpness와 동일한
  // ensureAlpha().removeAlpha() 함정 주의: removeAlpha()는 단독으로 쓸 것).
  const rgb = await sharp(cutout)
    .removeAlpha()
    .composite([{ input: noise, blend: "overlay" }])
    .toBuffer();
  const alphaBuf = await sharp(cutout).ensureAlpha().extractChannel(3).toBuffer();
  return sharp(rgb).joinChannel(alphaBuf).png().toBuffer();
}
```

**배선**: `lib/photo-enhance.ts`에서 `matchCutoutSharpness(whiteBalanced, backdropWithDecor)`를
호출하는 바로 다음 줄(현재 1932행 부근, "163차 후보 4번" 각주 근처)에
`cutoutForComposite = await matchCutoutGrain(cutoutForComposite, backdropWithDecor)`처럼
이어붙이세요 — 컷아웃 단계에서 배경과 매칭된 채로 합성에 들어가게 하는 게 목적입니다.
**기존 `unifyCompositeGrain(finalBuffer, CANVAS_SIZE)` 호출 2곳(1630행·1989행 부근)은
그대로 두세요** — 그건 합성 전체의 이음매를 죽이는 별도 역할이라 이번 신규 함수와
목적이 다릅니다(컷아웃만 배경에 맞추는 것 vs 전체를 한 번 더 통일하는 것). 두 호출부가
각각 어떤 backdrop 버퍼 변수를 스코프에 갖고 있는지(관련 있는 `backdropWithDecor` 또는
동등한 변수)는 실제 코드를 보고 정확한 변수명으로 연결하세요 — 제가 파일 전체를 읽지
않고 그레인 매칭 함수 위치만 확인했으니, 호출부 변수명은 실제 구현 시점에 코드 기준으로
맞춰주세요.

## 검증 (терse — 3~5줄 요약 + diff면 충분, 스크린샷/표 불필요)

1. `npx tsc --noEmit` — 0.
2. `scripts/187cha-grain-verify.ts` 정도로: (a) 매끈한 그라디언트 배경 합성 이미지 →
   `matchCutoutGrain` 반환값이 원본과 동일(바이트 비교)한지, (b) 거친 텍스처(sharp로
   합성한 노이즈 배경) → 알파가 0.02~0.05 범위 안에서만 적용되는지, (c) 알파 채널(완전
   투명 영역) 보존되는지 — 3개 assertion이면 충분합니다(164차 8개보다 줄여도 됨 — 원리가
   163/164차와 동일해서 회귀 리스크가 낮습니다).
3. QA 스크린샷은 **카테고리 1개**(전자제품 또는 식품 — 거친 배경이 나올 확률이 상대적으로
   높은 카테고리)만 실사용 기존 저장 세션(`review/181cha-live/` 등)으로 로컬 재렌더 확인,
   전체 6개 카테고리 다 볼 필요 없습니다.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- `unifyCompositeGrain()` 자체의 로직/호출부는 건드리지 않음(위 "배선" 참고).
- `comparison-chart-guard.ts`, `assign-section-images.ts` 미수정.
- 174~186차가 끝낸 아이콘/elevation/radius/font/hero/display-budget/patch 로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약(뭘 했는지) + 코드 diff. 표/스크린샷 다장 불필요 — 그레인 알파 값이 실측으로
어떻게 조정됐는지(스켈레톤의 2.2/6 같은 상수를 실측 후 바꿨다면 최종값)만 한 줄 남겨주세요.

## 백로그 마스터 (참고만 — 이번엔 Cursor가 갱신하지 않음)

`claude/pagzly-backlog-master-2026-09-15.md`는 이번 라운드부터 Claude(Cowork 세션)가 직접
갱신합니다. 이 항목이 완료되면 보고서(`review/187cha-report.md`)만 남겨주시면, 검증 후 제가
문서에 반영하겠습니다.
