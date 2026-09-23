# 195차 — 에디토리얼 풀블리드(image_text) 섹션에 "대형 타이포 오버레이" 적용 (API 0)

생성: 2026-09-15

## 하드 가드레일 (반복 — 이번에도 최우선)

Replicate/Claude/DeepSeek 등 **어떤 생성 API도 호출 금지**. `/api/generate` 실행 금지.
이번 작업은 **이미 생성된 이미지·카피를 재배치**만 합니다 — 새 이미지, 새 문구 전부
생성하지 않습니다. 기존에 이미 코드에 있는 함수/토큰(`getHeroGradient`, `TYPO.bannerTitle`,
`TYPO.heroCategory`, `dh2()`)만 재사용합니다.

## 배경 — 사용자 반복 요청 "후커블과 똑같은 퀄리티"

> "다음 지시사항 후커블과 똑같은 퀄리티가 나와야해" (194차 완료 보고 직후)

이 요청은 63~65/135/148/171/172/183차에 걸쳐 반복돼 왔습니다. 이번 라운드를 시작하기
전에 **이미 닫힌 후보를 다시 열지 않기 위해** 코드를 직접 대조해 두 개의 유력 후보를
먼저 기각했습니다(재작업 금지 확인, 시간 낭비 방지 목적으로 기록):

1. **154차가 미룬 "image_text 레이아웃 비대칭 확대"(60/40 등)** — `lib/detail-visual-rhythm.ts`의
   `resolveSplitColumnRatio()`를 직접 읽어 확인한 결과, **156차에서 이미 구현 완료**였습니다
   (POINT 순번 3주기로 50/50 → 60/40(이미지 강조) → 40/60(텍스트 강조) 순환, DOM order 버그까지
   고쳐서 반영됨). export도 `resolveSplitFlexRatio()`로 동일 로직 동기화 확인. **재작업 대상 아님.**
2. **183차 트랙B-1 "히어로 타이포 비중"(오버레이 구조 전환)** — `DetailSectionRenderer.tsx`의
   `case "hero"`(1340행)를 직접 읽어 확인한 결과, 히어로는 **이미 텍스트-오버레이 구조**입니다
   (이미지 `absolute inset-0` + `getHeroGradient()` 스크림 + 헤드라인이 이미지 위에 얹힘). 백로그
   마스터에도 183차는 "hero **대비**"(스크림 강화)만 크레딧돼 있고 "구조 전환"은 아예 필요
   없었던 것으로 확인됩니다. **재작업 대상 아님.**

이 과정에서 `claude/hookable_category_examples_2026-09-09.md`(기존 크롤링, 재크롤링 없음)의
핵심 특징을 다시 대조하다가, **아직 아무도 코드 레벨로 확인하지 않은 세 번째 항목**을
발견했습니다:

> "이미지 풀블리드 위주, **텍스트는 대형 타이포 오버레이**"(식품/패션 공통) / "**매거진풍
> 짧은 캡션**(예: 'Summer / Wide Linen Banding Pants')"

183차 트랙C는 이 항목을 "새 문구 생성이 필요할 가능성"으로 판단해 API 허가 대기 목록(§4)에
넣었는데, **실제로 확인해보니 판단이 틀렸습니다**(190차가 저관여 표시 예산에서 발견한 것과
같은 종류의 오판정). 이미 `applyDesignerLayoutRhythm()`(`lib/designer-detail-patterns.ts`)이
usage_scenario/coordination/seasonal_styling 등 "장면" 계열 슬롯에는 `layout: "full"`을 부여해
`shouldUseEditorialBleed()`가 이미 이 섹션들을 "풀블리드"로 분기하고 있습니다. 그런데 실제
렌더링(`DetailSectionRenderer.tsx` 1799~1848행, `lib/export-detail-html.ts` 467~477행)을
읽어보면, **이미지는 풀블리드인데 텍스트(kicker+heading+body)는 이미지 아래 별도 블록으로
분리**돼 있습니다 — 이미지 위에 아무 텍스트도 얹혀 있지 않습니다. 즉 "이미지 풀블리드"는 이미
있지만 "대형 타이포 오버레이"는 없는 상태입니다.

**더 중요한 발견**: 181차 저장 세션(`review/181cha-live/food/session.json`,
`review/181cha-live/fashion/session.json`)을 직접 열어 실제 데이터를 확인했더니, 이 슬롯들의
`heading`은 이미 "이렇게 챙겨요"(food/serving_suggestion), "데님과 함께"(fashion/coordination),
"사계절 활용"(fashion/seasonal_styling)처럼 **이미 후커블의 매거진 캡션과 동일한 길이·톤**입니다
(designer-detail-patterns.ts 자체 원칙 "headline은 15자 내외"가 이미 이 슬롯에도 적용돼 있음).
즉 **새 카피를 생성할 필요가 전혀 없습니다** — 이미 있는 heading을 이미지 위로 "옮기기만"
하면 후커블이 보여주는 "풀블리드 사진 + 대형 타이포 오버레이 + 짧은 캡션"을 그대로 재현할 수
있습니다. body(2문장 상세 설명)는 그대로 이미지 아래에 유지해 정보량은 전혀 줄이지 않습니다
(183차 트랙B-2가 지켰던 "정보량은 포기하지 않고 배치만 조정" 원칙과 동일).

**재사용 근거(신규 기법 없음)** — 이 "이미지 위 대형 타이포 오버레이 + 스크림" 패턴은 이미
이 코드베이스에 두 번 존재합니다:
- `case "hero"`(`DetailSectionRenderer.tsx` 1340행): `getHeroGradient(theme)` + 이미지 위
  절대배치 텍스트.
- `case "illustration_banner"`/`custom_gif`(2810~2908행): `BANNER_OVERLAY_CLASS` +
  `TYPO.bannerTitle`/`TYPO.bannerSub` + `getHeroGradient(theme)` — 정확히 지금 필요한 "히어로보다
  작은 중간 섹션용 이미지 오버레이" 스타일이 이미 토큰화돼 있습니다.
- export 쪽은 `case "illustration_banner"`(856~866행)에 동일 패턴이 인라인 스타일로 이미 있습니다.

**적용 범위**: `EDITORIAL_BLEED_SLOTS`(`lib/designer-detail-patterns.ts` 11~22행) — 총 10개
슬롯(usage_scenario/usage_scenario_extra/coordination/seasonal_styling/customer_scenario/
serving_suggestion/install_scenario/material_feature/lifestyle_shot/usage_scene)에만
한정됩니다. 다른 image_text 레이아웃(split/compact/annotated/callout/circle)은 전혀 건드리지
않습니다.

## 작업 — 기존 토큰만 재배치 (신규 시스템 없음)

### A. Live — `components/DetailSectionRenderer.tsx`

1. `BANNER_OVERLAY_CLASS` 바로 아래(188행 부근)에 상수 하나만 추가하세요(히어로용
   `heroOverlayClass`는 카테고리별로 풀뷰포트 히어로에 맞춰 튜닝된 큰 패딩이라 이 짧은
   `aspect-[4/5]` 박스에는 과합니다 — 그래서 별도 상수):

```ts
// 195차 — 에디토리얼 풀블리드(image_text)용 오버레이. BANNER_OVERLAY_CLASS와 같은
// 기법(이미지 위 absolute 텍스트)이지만, 히어로보다 훨씬 작은 aspect-[4/5] 박스에
// 맞춰 하단 패딩을 줄인 버전.
const EDITORIAL_BLEED_OVERLAY_CLASS =
  "absolute inset-0 z-10 flex flex-col items-center justify-end px-6 pb-6 text-center sm:px-8 sm:pb-8";
```

2. `case "image_text"` 안의 `shouldUseEditorialBleed(section)` 분기(1799~1848행)를 통째로
   교체하세요:

```tsx
// before (1799~1848행)
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return (
          <section
            key={`image_text-${index}`}
            className="relative overflow-hidden"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div className="relative w-full">
              <SectionImage
                src={src}
                alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                className={`${ratioClass} w-full object-cover`}
              />
              <ImageReplaceHit
                enabled={edit?.enabled}
                onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                style={{
                  background: `linear-gradient(0deg, ${hexToRgba(theme.deepAccent, 0.55)} 0%, transparent 100%)`,
                }}
                aria-hidden="true"
              />
            </div>
            <div className={`${getCategoryRhythm(category).pointTextPadClass} mx-auto max-w-xl px-6 text-center sm:px-10`}>
              {kicker ? (
                <p className={`mb-3 ${TYPO.sectionLabel}`} style={{ color: readableTextDeep(theme) }}>
                  {kicker}
                </p>
              ) : null}
              <EditableText
                as="h3"
                enabled={edit?.enabled}
                value={section.heading}
                onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                className={`${HEADLINE_CLAMP} ${TYPO.sectionTitle}`}
              />
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={`mt-4 line-clamp-4 ${TYPO.body}`}
              />
            </div>
          </section>
        );
      }
```

```tsx
// after — kicker+heading을 이미지 위 오버레이로 이동(getHeroGradient·BANNER 계열과
// 동일 기법 재사용), body는 그대로 이미지 아래 유지(정보량 변화 없음)
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return (
          <section
            key={`image_text-${index}`}
            className="relative overflow-hidden"
            style={textSectionStyle(theme, pattern, category)}
          >
            <div className="relative w-full">
              <SectionImage
                src={src}
                alt={buildSectionImageAlt(productName ?? "", section.heading, section.slot)}
                className={`${ratioClass} w-full object-cover`}
              />
              <ImageReplaceHit
                enabled={edit?.enabled}
                onReplace={() => edit?.onReplaceImage?.(section.imageIndex)}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: getHeroGradient(theme) }}
                aria-hidden="true"
              />
              <div className={EDITORIAL_BLEED_OVERLAY_CLASS}>
                {kicker ? <p className={TYPO.heroCategory}>{kicker}</p> : null}
                <EditableText
                  as="h3"
                  enabled={edit?.enabled}
                  value={section.heading}
                  onChange={(heading) => edit?.onChange(index, { ...section, heading })}
                  className={`${HEADLINE_CLAMP} ${TYPO.bannerTitle} ${getCategoryRhythm(category).heroTitleExtra}`}
                />
              </div>
            </div>
            <div className={`${getCategoryRhythm(category).pointTextPadClass} mx-auto max-w-xl px-6 text-center sm:px-10`}>
              <EditableText
                as="p"
                multiline
                enabled={edit?.enabled}
                value={section.body}
                onChange={(body) => edit?.onChange(index, { ...section, body })}
                className={`line-clamp-4 ${TYPO.body}`}
              />
            </div>
          </section>
        );
      }
```

`getHeroGradient`는 이미 이 파일에서 `case "hero"`가 쓰고 있어 import 추가 불필요.
`TYPO.heroCategory`/`TYPO.bannerTitle`/`getCategoryRhythm(...).heroTitleExtra`도 전부
기존 토큰 재사용(신규 정의 없음).

### B. Export — `lib/export-detail-html.ts`

`case "image_text"` 안의 `shouldUseEditorialBleed(section)` 분기(467~477행)를 교체하세요:

```ts
// before (467~477행)
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return `<section${sectionIdAttr} class="pagzly-editorial" style="padding:0;background:${sectionBg}">
          ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block"/>` : ""}
          <div style="padding:40px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
            ${kicker ? `<p style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;color:${deepText};margin:0 0 12px">${kicker}</p>` : ""}
            ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionXl};margin:0;line-height:1.2`)}
            <p style="line-height:1.85;font-size:${FONT_SIZE.bodyLg};opacity:.85;margin-top:16px">${esc(section.body)}</p>
          </div>
        </section>`;
      }
```

```ts
// after — case "illustration_banner"(856~866행)와 동일 기법(position:absolute 오버레이 +
// getHeroGradient) 재사용. body는 이미지 아래 그대로 유지.
      if (shouldUseEditorialBleed(section)) {
        const kicker = getSectionKicker(section);
        return `<section${sectionIdAttr} class="pagzly-editorial" style="padding:0;background:${sectionBg}">
          <div style="position:relative">
            ${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block"/>` : ""}
            <div style="position:absolute;inset:0;background:${getHeroGradient(theme)}"></div>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:24px 24px 28px;text-align:center">
              ${kicker ? `<p style="font-size:${FONT_SIZE.caption};letter-spacing:.36em;color:rgba(250,248,243,.85);margin:0 0 10px">${kicker}</p>` : ""}
              ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionXl};margin:0;line-height:1.2;color:#FAF8F3;text-shadow:0 2px 20px rgba(0,0,0,.4)`)}
            </div>
          </div>
          <div style="padding:24px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
            <p style="line-height:1.85;font-size:${FONT_SIZE.bodyLg};opacity:.85">${esc(section.body)}</p>
          </div>
        </section>`;
      }
```

`getHeroGradient`는 이 파일 79행에서 이미 import돼 있고 `case "hero"`가 이미 쓰고 있어
추가 import 불필요. `dh2()`의 `extraStyle` 인자에 `color`를 넣으면 `displayHeadlineInlineCss(category)`
뒤에 이어붙는 같은 style 속성이라 마지막 선언이 우선 적용되어 흰색으로 정상 렌더됩니다
(`case "hero"`의 216행이 이미 같은 방식으로 헤드라인 색을 `#FAF8F3`로 강제하고 있어 검증된
패턴).

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `review/181cha-live/{food,fashion}/session.json` 저장 세션으로 export HTML을 재렌더링
   (API 호출 없음, 로컬 렌더링만) — `serving_suggestion`(food)·`coordination`/`seasonal_styling`
   (fashion) 섹션에서 이미지 위에 heading이 흰 글씨로 오버레이되는지, body는 이미지 아래
   그대로 남아있는지 전/후 스크린샷으로 비교.
3. 라이브 프리뷰도 같은 세션으로 열어 동일하게 확인(live/export 시각적 동등성).
4. `grep -n "EDITORIAL_BLEED_OVERLAY_CLASS" components/DetailSectionRenderer.tsx` — 상수
   선언 1곳 + 사용 1곳(2곳)만 있는지 확인(다른 분기에 실수로 안 퍼졌는지).
5. `shouldUseEditorialBleed`가 `false`인 다른 image_text 레이아웃(split/compact/annotated/
   callout/circle)은 렌더링에 변화 없는지 스크린샷 1~2개로 회귀 확인.
6. 6개 카테고리 전부 `EDITORIAL_BLEED_SLOTS`에 해당하는 섹션이 있는 세션이 있다면 그것도
   1~2개 추가로 확인(없는 카테고리는 이 분기 자체가 안 타므로 스킵).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- `EDITORIAL_BLEED_SLOTS`(`lib/designer-detail-patterns.ts`) 슬롯 목록 자체는 미수정 — 어떤
  슬롯이 풀블리드가 되는지는 건드리지 않고, 풀블리드가 된 섹션의 텍스트 배치만 바꿉니다.
- body 텍스트는 삭제·요약·재생성하지 않음 — 위치만 그대로 이미지 아래 유지(정보량 유지
  원칙, 183차 트랙B-2와 동일한 결).
- split/compact/annotated/callout/circle 등 다른 image_text 레이아웃 미수정.
- 156차(`resolveSplitColumnRatio`)·183차(hero 대비)·190차(저관여 표시예산)·191차
  (lazy-loading)·192차(펫 리뷰 신호)·193차(갤러리 간격/`dh2` 배선)·194차(배경 텍스처 비활성화)
  재작업 없음 — 전부 §5 재작업금지 확인 완료.

## 완료 보고 형식 (짧게)

3~5줄 요약 + `EDITORIAL_BLEED_OVERLAY_CLASS` 확인 + before/after 스크린샷 1~2쌍(food
serving_suggestion 또는 fashion coordination) + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/195cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다(183차 트랙C의 "API
필요" 오판정을 다시 한번 바로잡은 사례 + §4에서 "매거진풍 짧은 캡션" 항목을 완료로
이동하는 근거로 기록).
