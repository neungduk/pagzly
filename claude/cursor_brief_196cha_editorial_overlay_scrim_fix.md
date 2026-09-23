# 196차 — 195차 에디토리얼 오버레이 스크림 색상 버그 수정 (API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번
라운드는 195차가 만든 그라데이션 값 하나만 교체합니다 — 구조/토큰 재사용 방식은 그대로
유지합니다.

## 배경 — 195차 검증 중 발견한 회귀 (스크린샷 직접 대조)

`review/195cha-report.md`는 "h2 오버레이·body 하단 확인"이라고 보고했지만, 첨부된
스크린샷(`195cha-before-food-editorial.png`, `195cha-after-food-editorial.png`,
`195cha-after-fashion-editorial.png`)을 직접 열어 before/after를 대조한 결과 **명백한
시각 회귀**를 발견했습니다:

- **food(`serving_suggestion`)**: after 스크린샷에서 사진 전체가 탁한 초록빛으로 뜨게
  물들어 있습니다. before(원본 사진 — 포도·파우치가 선명한 따뜻한 톤)과 비교하면 사진
  품질이 오히려 나빠졌습니다.
- **fashion(`coordination`)**: after 스크린샷에서는 사진이 사실상 안 보입니다 — 회색~검정
  그라데이션만 보이고, 그 위에 "FEATURE" 캡션만 떠 있습니다. 사진이 거의 완전히
  가려졌습니다.

**원인 진단** (코드 직접 확인): 195차가 재사용한 `getHeroGradient(theme)`
(`lib/design-tokens.ts:443~445`)는 `theme.accent`/`theme.deepAccent` — 즉 **카테고리
브랜드 색**(식품 카테고리는 머스타드/골드 계열)을 스크림 색으로 씁니다. 이 함수는 원래
**히어로처럼 아주 큰 박스**(`min-h-[70~85svh]`)에서 쓰도록 만들어진 것이라, 퍼센트 기준
정지점(`0%→42%→72%→88%`)이 큰 박스에서는 "위쪽 대부분은 선명, 아래쪽 일부만 톤 입힘"으로
보이지만, 이번 에디토리얼 섹션의 훨씬 짧은 `aspect-[4/5]` 박스에서는 **같은 비율이 박스
전체 높이의 절반 이상을 뒤덮어**, 사진 본연의 색과 브랜드 색(예: 식품의 머스타드/골드)이
섞여 탁하게 보입니다. 히어로는 이미지가 크고 밝아서 티가 덜 났지만, 이 섹션의 사진들처럼
어둡거나 그린 계열이 섞인 사진에서는 색이 심하게 오염됩니다. 즉 **박스 크기에 안 맞는
그라데이션을 그대로 재사용한 것이 원인**입니다 — "기존 토큰 재사용"이라는 원칙 자체는
맞았지만, 히어로 전용으로 튜닝된 값을 다른 크기 박스에 그대로 가져온 게 문제였습니다.

**수정 방향**: 실제 잡지·이커머스 사진 위 캡션은 보통 **브랜드 색이 아니라 중립
검정 계열** 스크림을 씁니다(그래야 어떤 사진 색과도 안 부딪힘). 이 코드베이스에도 이미
그런 중립 색(`BRAND.ink = "#1B1B18"`)이 있고, 콜아웃 말풍선(`isCallout` 분기,
`solidDeepOnPaper` 배경)도 짙은 중립색 계열을 씁니다. 이번엔 `getHeroGradient` 대신
**중립 검정 기반, 박스 아래쪽에만 집중된 새 그라데이션**으로 교체합니다.

## 작업 — 그라데이션 값만 교체 (구조·토큰 재사용 방식은 그대로)

### A. Live — `components/DetailSectionRenderer.tsx`

`EDITORIAL_BLEED_OVERLAY_CLASS` 상수 바로 위(193행 부근)에 전용 그라데이션 함수를
하나 추가하세요:

```ts
// 196차 — 195차가 재사용한 getHeroGradient(theme)는 브랜드색(accent/deepAccent) 기반이라
// 히어로처럼 아주 큰 박스에서는 괜찮지만, 이 섹션의 짧은 aspect-[4/5] 박스에서는 브랜드색이
// 사진 전체 톤을 오염시켰다(식품 스크린샷에서 탁한 초록빛, 패션은 사진이 거의 안 보일 정도).
// 중립 검정(BRAND.ink) 기반으로 바꾸고, 박스 아래 55%에만 집중시켜 사진이 덜 가려지게 한다.
function getEditorialBleedScrim(): string {
  return `linear-gradient(0deg, ${hexToRgba(BRAND.ink, 0.82)} 0%, ${hexToRgba(BRAND.ink, 0.4)} 24%, ${hexToRgba(BRAND.ink, 0.08)} 42%, transparent 55%)`;
}
```

`shouldUseEditorialBleed` 분기 안의 그라데이션 `<div>`(195차가 추가한 자리, `getHeroGradient(theme)`
쓰던 곳)을 교체하세요:

```tsx
// before
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: getHeroGradient(theme) }}
                aria-hidden="true"
              />
```

```tsx
// after
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: getEditorialBleedScrim() }}
                aria-hidden="true"
              />
```

heading은 안전 마진으로 1줄로 고정하세요(이 슬롯들의 heading은 원래 4~8자 내외 매거진
캡션이라 실질적으로 항상 1줄이지만, 혹시 모를 줄바꿈으로 텍스트가 박스 아래쪽 경계에
너무 붙는 걸 방지):

```tsx
// before
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${HEADLINE_CLAMP} ${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
                />
```

```tsx
// after
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`line-clamp-1 ${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
                />
```

`hexToRgba`·`BRAND`는 이 파일에 이미 import돼 있어(다른 곳에서 다수 사용 중) 추가 import
불필요.

### B. Export — `lib/export-detail-html.ts`

`case "image_text"`의 `shouldUseEditorialBleed` 분기에서 스크림 색만 교체하세요:

```ts
// before
            <div style="position:absolute;inset:0;background:${getHeroGradient(theme)}"></div>
```

```ts
// after
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,${hexToRgba(BRAND.ink, 0.82)} 0%,${hexToRgba(BRAND.ink, 0.4)} 24%,${hexToRgba(BRAND.ink, 0.08)} 42%,transparent 55%)"></div>
```

`hexToRgba`·`BRAND`는 이 파일에도 이미 import돼 있습니다(`getHeroGradient` 바로 옆에서
import). `dh2()` 호출에 이미 `-webkit-line-clamp` 같은 별도 클램프가 없으니, heading이
길어질 경우를 대비해 `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`를
`dh2()`의 `extraStyle`에 추가해 1줄로 안전하게 맞추세요:

```ts
// before
              ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionXl};margin:0;line-height:1.2;color:#FAF8F3;text-shadow:0 2px 20px rgba(0,0,0,.4)`)}
```

```ts
// after
              ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionXl};margin:0;line-height:1.2;color:#FAF8F3;text-shadow:0 2px 20px rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%`)}
```

## 검증 (중요 — 195차가 스크린샷을 잘못 보고했으니 이번엔 더 꼼꼼히)

1. `npx tsc --noEmit` — 0.
2. `review/181cha-live/{food,fashion}/session.json` 세션으로 export HTML 재렌더링(API
   호출 없음). food `serving_suggestion`, fashion `coordination`·`seasonal_styling`
   **3곳 전부** before/after 스크린샷.
3. **스크린샷은 섹션 전체(이미지+오버레이+이미지 아래 body 문단)가 한 장에 다 들어오게
   찍으세요** — 195차 스크린샷은 고정 높이로 잘려서 body 문단이 실제로 보이는지 확인이
   안 됐습니다. body 문단(`아침 물 한 잔과 함께...` 등)이 실제로 이미지 아래 렌더링되고
   있는지 이번엔 스크린샷으로 명확히 보여주세요.
4. 사진 색이 탁해지지 않는지 육안 확인(특히 fashion coordination — 195차에서 사진이
   거의 안 보일 정도였던 곳). 사진의 원래 톤이 위쪽 40%+ 구간에서 그대로 보여야 합니다.
5. heading이 잘리거나(clip) 다음 섹션과 겹쳐 보이지 않는지 확인.
6. `grep -n "getEditorialBleedScrim\|getHeroGradient" components/DetailSectionRenderer.tsx`
   — 에디토리얼 분기에서 더 이상 `getHeroGradient`를 안 쓰는지 확인(히어로 자체
   `case "hero"`는 `getHeroGradient` 그대로 유지 — 그쪽은 원래도 문제 없었음, 건드리지
   않음).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 195차가 만든 구조(오버레이 위치, kicker/heading 이동, body 유지) 자체는 그대로 —
  이번엔 **그라데이션 색상값과 heading 줄 수 제한만** 수정합니다.
- `case "hero"`의 `getHeroGradient` 사용은 미수정(히어로는 원래도 문제 보고 없었음,
  박스가 훨씬 커서 같은 문제가 안 생김 — 괜히 같이 건드리지 않음).
- EDITORIAL_BLEED_SLOTS 목록, split/compact/annotated/callout 레이아웃 미수정.

## 완료 보고 형식 (짧게, 이번엔 스크린샷 3장 필수)

3~5줄 요약 + food/fashion 전체 섹션(이미지+오버레이+body) before/after 스크린샷 3장
(food 1 + fashion 2) + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/196cha-report.md`와 스크린샷을 남겨주시면
제가 직접 스크린샷을 열어 재확인한 뒤 195/196차를 합쳐 백로그 마스터에 반영하겠습니다.
