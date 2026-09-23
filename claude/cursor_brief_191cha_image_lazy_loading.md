# 191차 — 이미지 lazy-loading 추가 (코드 전용, API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 시각적
변화 없음(레이아웃/색상/카피 미변경) — 브라우저 네이티브 속성만 추가하는 성능 전용
라운드입니다. 단일 트랙만 정확히 끝내세요.

## 배경 — 코드로 직접 확인한 실제 격차

Pagzly 상세페이지는 라이브 기준 18~29개 섹션, export 기준으로도 비슷한 수의 이미지가
한 페이지에 들어갑니다(183/190차가 이미 이 섹션 수 자체를 다룬 바 있음). 그런데 제가
`components/DetailSectionRenderer.tsx`, `components/SectionImage.tsx`,
`lib/export-detail-html.ts` 전체를 grep해 확인한 결과, **`loading`/`decoding` 속성이
단 한 곳에도 없습니다** — 전체 이미지가 뷰포트 밖에 있어도 전부 즉시(eager) 로드됩니다.
174~190차 어느 라운드도 이 축은 건드린 적이 없는, 순수하게 새로 발견한 성능 격차입니다.

`components/SectionImage.tsx`가 라이브 렌더러의 이미지 대부분이 거치는 단일 지점입니다
(`DetailSectionRenderer.tsx`에서 15곳 이상이 `<SectionImage>`를 통해 렌더링됨, 히어로
포함). `lib/export-detail-html.ts`는 공용 헬퍼 없이 섹션 케이스마다 `<img>` 문자열을
직접 만드는 구조라, 14곳의 `<img ` 자리를 개별적으로 손봐야 합니다(정확한 위치는 아래
"작업" 참고 — 전부 실제 코드에서 확인한 줄).

## 작업 — 히어로(최상단, LCP)만 즉시 로드 유지, 나머지는 lazy

**원칙**: 페이지 최초 진입 시 바로 보이는 히어로 이미지는 지금처럼 즉시 로드(오히려
`fetchPriority="high"`로 우선순위를 명시하면 LCP에 더 좋음). 그 아래 모든 이미지는
`loading="lazy" decoding="async"`.

### 1. 라이브 렌더러 — `components/SectionImage.tsx`

`SectionImageProps`에 `priority?: boolean`(기본 `false`) 추가하고, 47~61행의 `<img>`에
반영하세요:

```tsx
type SectionImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  imageIndex?: number;
  showAiLifestyleBadge?: boolean;
  /** 191차 — true면 즉시 로드(히어로 전용). 기본 false = lazy. */
  priority?: boolean;
};

// ...

const img = (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={resolved}
    alt={alt}
    className={className}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    {...(priority ? { fetchPriority: "high" as const } : {})}
    crossOrigin={
      resolved.startsWith("data:") || resolved.startsWith("blob:") ? undefined : "anonymous"
    }
    onError={() => {
      if (fallbackSrc && current !== fallbackSrc) {
        setCurrent(fallbackSrc);
      }
    }}
  />
);
```

`DetailSectionRenderer.tsx`의 `case "hero"`(현재 1356행 부근 `<SectionImage src={src} ... />`)
**한 곳에만** `priority` prop을 추가하세요(`<SectionImage src={src} alt={imgAlt} ... priority />`
형태 — 기존 prop 순서/다른 값 변경 없음). **나머지 `<SectionImage>` 호출부(15곳 이상)는
아무것도 바꾸지 않아도** 기본값 `false`로 자동 lazy 적용됩니다.

`case "hero"` 바깥의 다른 raw `<img>`(브랜드 로고, 283행 컨셉 배지 아이콘처럼 작고 항상
필요한 요소)는 건드리지 마세요 — 이번 라운드는 큰 섹션 이미지 lazy-load에 한정합니다.

### 2. 정적 export — `lib/export-detail-html.ts`

히어로 케이스(**205~206행**, `class="hero"` 섹션의 `<img src="${esc(src)}" ... style="width:100%;height:70vh;object-fit:cover"/>`)는 **그대로 두세요**(원하면
`fetchPriority="high"`만 추가 가능, 필수는 아님).

아래 13곳(전부 실제 코드에서 확인한 줄 — 히어로 제외)의 `<img ...>` 태그에
`loading="lazy" decoding="async"`를 추가하세요. 각 자리의 기존 `src`/`alt`/`style` 등은
전혀 바꾸지 말고 속성만 추가:

- 280행 (step_card 이미지)
- 440행 (circleSolo)
- 446행 (circlePair)
- 454행 (callout)
- 464행 (editorial bleed)
- 502행 (image_text 기본)
- 525행 (image_text soft)
- 643행 (spec thumb)
- 684행 (gallery A)
- 699행 (gallery B)
- 743행 (custom_gif)
- 823행 (color_variation)
- 853행 (illustration_banner)

한 곳씩 정규식/문자열 치환으로 처리하되, **각 줄이 정말 그 섹션 케이스가 맞는지 확인 후**
적용하세요(라운드 사이 줄번호가 약간 밀렸을 수 있음 — grep `<img ` 로 재확인 권장).

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `grep -c 'loading="lazy"' lib/export-detail-html.ts` → **13**, `grep -c 'loading="eager"\|fetchPriority' lib/export-detail-html.ts` → 히어로 1곳(선택 사항이면 0~1).
3. 181차 저장 세션(`review/181cha-live/{cat}/session.json`) 아무 카테고리 1개로 export
   HTML 재렌더링 → 브라우저에서 `document.querySelectorAll('img[loading="lazy"]').length`가
   0보다 큰지, 히어로 `<img>` 하나만 `loading` 속성이 없거나 `eager`인지 확인.
4. 스크린샷 불필요(시각적 변화 없음이 통과 조건) — before/after DOM 렌더링 결과가 픽셀
   단위로 동일한지 export HTML sha256 대신 "본문 텍스트/스타일 diff 0, `loading`/`decoding`
   속성 추가만"으로 diff 요약.

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 레이아웃/색상/카피/이미지 자체 변경 없음 — HTML 속성 추가만.
- 히어로(라이브 `case "hero"`, export 205~206행)는 lazy로 바꾸지 않음 — LCP 보호.
- `comparison-chart-guard.ts`, `assign-section-images.ts` 미수정.
- 174~190차가 끝낸 아이콘/elevation/radius/font/hero/그레인/대비/표시예산 로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + `loading="lazy"` 적용 개수(export 13/13 확인) + `tsc` 결과 + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/191cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다.
