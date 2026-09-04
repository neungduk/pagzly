# 97차 — 컨셉 효과(moisture/nourishing) 히어로 오배정 차단 (가짜 브랜드 라벨 환각 버그)

생성: 2026-09-03
전제: 96차 실사용 확인 중 발견 — "히알루론 딥 모이스처 세럼"(브랜드 페이즐리랩) 결과 페이지의 히어로 이미지 병 라벨에 실제와 전혀 무관한 가짜 브랜드명 **"BESOMA GLOW GODDESS"** 가 나타남. 이미지 URL 확인 결과 파일명이 `...-enhanced-fx-moisture.png` — `lib/concept-effects.ts`의 moisture 컨셉 효과가 히어로 이미지에 오버레이된 것으로 확인됨. `review/quality-log.md` (2026-08-17 "컨셉 효과 합성 — 뷰티-스킨케어 1카테고리 시험")에 이미 이 효과의 결함이 기록돼 있었음: "moisture / 물방울 — **미채택** — 효과 레이어 중앙에 가짜 문자(glyph)가 생성되어 크림 텍스처 위에 워터마크처럼 남음. 재사용 안 함." 같은 로그의 이후 세럼 테스트 항목은 "가짜 문자 없음. **히어로는 미적용**"으로 정리돼 있는데, 이번 케이스는 그 안전장치가 깨져 히어로에 적용된 것으로 보임.

## 배경

`lib/concept-effects.ts`의 `pickOverlayAssignments()`에서 `moisture`/`nourishing` 효과의 대상 이미지를 고를 때(약 208~216행), 페이지의 **모든 섹션(히어로 포함)** 의 heading/headline 텍스트를 `/수분|촉촉|물방울|보습|영양|오일|앰플/` 정규식으로 스캔해 첫 매치를 사용합니다:

```ts
if (id === "moisture" || id === "nourishing") {
  const match = sections.find((section) => {
    const text = `${section.heading ?? ""} ${section.headline ?? ""}`;
    return (
      /수분|촉촉|물방울|보습|영양|오일|앰플/.test(text) &&
      typeof section.imageIndex === "number"
    );
  });
  imageIndex = match?.imageIndex ?? fallbackPoint;
}
```

`sections.find()`는 배열의 첫 매치를 반환합니다. 히어로 섹션이 배열 첫 번째(index 0)이고 헤드라인이 이번 케이스처럼 "3중 히알루론, **촉촉**"이면 **히어로 자신이 매치돼** `imageIndex`가 히어로로 설정됩니다. 이 브랜치의 원래 의도는 "성분/텍스처 컷 중 카피가 맞는 곳"(`fallbackPoint` = ingredient ?? texture)에 오버레이를 배치하는 것으로 보이는데, 스캔 대상에서 히어로를 제외하지 않아 의도치 않게 히어로가 선택되는 경로가 열려 있습니다.

문제는 moisture/nourishing 오버레이 생성(overlayPrompt에 `NO_TEXT_PROMPT` 가드가 이미 있음에도) 가 quality-log.md에 기록된 대로 가끔 가짜 글자(glyph)를 만들어낸다는 것입니다. 텍스처/성분 컷에 나타나면 상대적으로 덜 눈에 띄지만, **히어로 = 제품 사진 자체**에 나타나면 라벨에 가짜 브랜드명이 찍힌 것처럼 보여 신뢰를 크게 해칩니다. 실제 관찰된 사례가 정확히 이 케이스입니다.

같은 함수의 `cooling`/`tech-glow`/`warm-light` 브랜치(약 223~225행)는 **의도적으로** 히어로를 타겟팅합니다만, quality-log는 cooling에 대해 "가짜 문자 없음, 다만 밝은 히어로에서 screen 블렌드가 잘 안 보임"이라고만 기록했고 텍스트 환각 이력은 없습니다. 따라서 이번 라운드는 **moisture/nourishing이 우연히 히어로를 타겟팅하는 경로만** 막는 것으로 범위를 좁힙니다.

## 작업 A — moisture/nourishing 히어로 제외

`lib/concept-effects.ts`의 `pickOverlayAssignments()`에서, 이미 계산돼 있는 `hero`(약 198행 `const hero = sections.find((s) => s.type === "hero")?.imageIndex ?? 0;`)를 이용해 moisture/nourishing 매치 후보에서 히어로를 제외하도록 수정:

```ts
if (id === "moisture" || id === "nourishing") {
  const match = sections.find((section) => {
    const text = `${section.heading ?? ""} ${section.headline ?? ""}`;
    return (
      section.imageIndex !== hero &&
      /수분|촉촉|물방울|보습|영양|오일|앰플/.test(text) &&
      typeof section.imageIndex === "number"
    );
  });
  imageIndex = match?.imageIndex ?? fallbackPoint;
}
```

`fallbackPoint`(ingredient ?? texture ?? 안전한 두 번째 이미지, 약 201~202행)도 히어로와 겹치지 않는지 확인해 주세요. 로직상 대부분 히어로가 아니겠지만, `imageCount`가 1~2장뿐인 극단 케이스에서 `fallbackPoint`가 히어로와 같아지는 경로가 있는지 확인하고, 있다면 그 경우엔 moisture/nourishing 오버레이 자체를 스킵하도록 처리해 주세요(히어로에 절대 이 효과가 안 붙게).

## 작업 B — 로그 보강

`pickOverlayAssignments` 반환 직전이나 호출부에서, moisture/nourishing이 원래 히어로로 배정될 뻔했다가 제외된 경우를 추적할 수 있게 한 줄 남깁니다:

```ts
if ((id === "moisture" || id === "nourishing")) {
  console.log(`[concept-effects] ${id} → image[${imageIndex}] (hero=${hero}, heroExcluded=${imageIndex !== hero})`);
}
```
(정확한 삽입 위치·포맷은 기존 로그 스타일에 맞춰 조정해도 됩니다.)

## 작업 C — quality-log.md 갱신

`review/quality-log.md` 맨 아래에 이번 회차 기록을 기존 포맷대로 추가해 주세요: 발견 경위(실사용 확인 중 히어로 라벨에 가짜 브랜드명 "BESOMA GLOW GODDESS" 관찰), 원인(moisture 효과의 헤드라인 키워드 매칭이 히어로 섹션까지 스캔해 오배정), 조치(히어로 제외), 상태.

## 하지 않는 것

- moisture/nourishing 오버레이 생성 자체(모델, 프롬프트)는 바꾸지 않습니다 — 이미 `NO_TEXT_PROMPT` 가드가 있고, 이번 수정은 "가짜 글자가 나와도 히어로에는 안 붙게" 배치 로직만 고칩니다.
- cooling/tech-glow/warm-light가 히어로를 타겟팅하는 기존 동작은 그대로 둡니다(이번 버그와 무관, quality-log상 텍스트 환각 이력 없음).
- 오버레이 생성 후 OCR/비전 기반 사후 검증(가짜 글자 감지 시 재시도) 같은 근본적 해결책은 이번 범위 밖 — 필요하면 별도 라운드로 제안합니다.
- 이미 생성·저장된 과거 이미지(이번에 발견된 "BESOMA GLOW GODDESS" 이미지 자체 포함)는 소급 재생성하지 않습니다 — 코드 수정 이후 신규 생성 건부터 적용됩니다. 기존 상품은 "재생성" 액션으로 사용자가 직접 갱신해야 함을 안내만 하면 됩니다.

## 검증 방법

- `npx tsc --noEmit` 에러 0건.
- 헤드라인에 "촉촉"/"수분" 등 키워드가 포함된 히어로를 가진 화장품 상품으로 재생성 테스트 → moisture 효과가 히어로가 아닌 ingredient/texture 컷에 배정되는지 로그(`[concept-effects] moisture → image[...] heroExcluded=true`)로 확인.
- 기존에 히어로가 아닌 곳에 정상 배정되던 케이스(8/17 세럼 테스트 등)는 회귀 없이 그대로 동작하는지 확인.
- 가능하면 문제의 상품(id `7dca0930-46dd-4ddd-91c5-c286af77c359`, "히알루론 딥 모이스처 세럼")을 실제로 재생성해 히어로에 더 이상 가짜 텍스트가 없는지 스크린샷으로 확인.

## 완료 보고 체크리스트

- [ ] moisture/nourishing 매치 로직에서 히어로 제외
- [ ] fallbackPoint가 히어로와 겹치는 극단 케이스 처리(또는 스킵)
- [ ] 로그 라인 추가
- [ ] quality-log.md 갱신
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] 실기기 재생성 스크린샷(수동, 히어로에 moisture 미적용 확인)
