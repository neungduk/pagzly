# 193차 — 갤러리 사진 그리드 간격 확대 + export 섹션 타이틀 폰트 누락 배선 (API 0)

생성: 2026-09-15

## 하드 가드레일 (반복)

Replicate/Claude/DeepSeek 등 생성 API 호출 절대 금지. `/api/generate` 실행 금지. 이번
항목은 순수 CSS/클래스 값 조정 + 기존 헬퍼 함수(`dh2()`) 재사용 배선입니다 — 신규 로직
없음. 두 트랙 모두 작지만, 같은 사용자 피드백(스크린샷)에서 나온 것이라 한 라운드에
같이 처리합니다. 각 트랙은 서로 다른 파일이라 섞이지 않습니다.

## 배경 — 사용자가 스크린샷으로 직접 지적

192차 완료 보고 직후, 사용자가 렌더링된 "포장과 구성"(식품 카테고리, `gallery` 섹션)
스크린샷 2장과 함께 이렇게 지적했습니다:

> "전반적인 인포그래픽 그리고 배치 사진에 보면 그림이 너무 따닥따닥 붙어있고 글자의
> 폰트도 좋지 않아"

코드를 직접 대조해 두 가지 독립된 원인을 찾았습니다(둘 다 지금까지 미발견 상태였음).

## 트랙 A — 갤러리 사진 그리드 간격이 사실상 0~4px

`components/DetailSectionRenderer.tsx`의 `"gallery"` 케이스(3083~3090행)는 그리드 gap을
`getCategoryRhythm(category).galleryGapClass`에서 가져오는데, `lib/design-tokens.ts`의
실제 값이 전부 극단적으로 좁습니다:

- `DEFAULT_RHYTHM`(808행): `"gap-px"` (1px)
- 식품/건강기능식품(842행), 반려동물(883행): `"gap-1"` (4px) — 스크린샷의 "포장과 구성"이
  바로 이 값
- 화장품/뷰티(861행): `"gap-px"` (1px)
- 의류/패션(902행), 전자제품(935행): `"gap-0"` (0px, 완전히 붙음)
- 생활용품: 오버라이드 없음 → `DEFAULT_RHYTHM`의 1px 그대로 상속

6개 카테고리 전부 1~4px, 절반은 0~1px — 사용자가 "따닥따닥 붙어있고"라고 느낄 만합니다.
페이지의 다른 그리드(체크리스트 12px, 비교 카드 20px, 트렌드 카드 12~16px)는 전부
12px 이상인데 갤러리만 유독 좁게 남아 있었습니다.

**export(`lib/export-detail-html.ts`) 쪽은 더 나쁩니다** — `galleryGapClass`를 아예
참조하지 않고 684행에서 **모든 카테고리에 하드코딩된 `gap:2px`**를 씁니다. 카테고리별
차이조차 없이 export에서는 항상 2px입니다.

### 패치 — `gap-2`(8px)로 통일 (live 6곳 + export 1곳)

`lib/design-tokens.ts`:

1. 808행 `galleryGapClass: "gap-px",` → `galleryGapClass: "gap-2",`
2. 842행(식품/건강기능식품) `galleryGapClass: "gap-1",` → `galleryGapClass: "gap-2",`
3. 861행(화장품/뷰티) `galleryGapClass: "gap-px",` → `galleryGapClass: "gap-2",`
4. 883행(반려동물) `galleryGapClass: "gap-1",` → `galleryGapClass: "gap-2",`
5. 902행(의류/패션) `galleryGapClass: "gap-0",` → `galleryGapClass: "gap-2",`
6. 935행(전자제품) `galleryGapClass: "gap-0",` → `galleryGapClass: "gap-2",`
   (생활용품은 오버라이드가 없어 1번 DEFAULT 변경만으로 자동 적용 — 별도 수정 불필요)

`components/DetailSectionRenderer.tsx`:

7. 3086행 뷰티 전용 비교(pairCompare) 하드코딩도 같이 맞춥니다:
   `"grid grid-cols-2 gap-px"` → `"grid grid-cols-2 gap-2"`

`lib/export-detail-html.ts`:

8. 684행 `gap:2px` → `gap:8px` (Tailwind `gap-2` = 0.5rem = 8px와 1:1 대응시켜 live와
   export가 같은 픽셀값을 갖도록)

그 외 그리드 간격(체크리스트/비교/트렌드/브랜드스토리 등)과 갭 사이로 보이는 accent
틴트 배경(`hexToRgba(theme.accent, 0.18)` / `${accent}2e`)은 그대로 둡니다 — 문제는
간격 크기뿐입니다.

## 트랙 B — export HTML에서 섹션 타이틀 7곳이 카테고리 전용 폰트를 못 받음

`lib/detail-typography.ts`(117차)가 카테고리별 헤드라인 폰트 체계를 만들어뒀습니다 —
화장품/패션/식품은 Noto Serif KR, 나머지는 Noto Sans KR 굵게+타이트 트래킹. `lib/
export-detail-html.ts`의 `dh2()` 헬퍼(162~164행)가 이걸 적용하는 통로입니다:
`<h2 class="pagzly-display-headline" style="${displayHeadlineInlineCss(category)}...">`.

실제로 `dh2()`는 export 파일 안에서 **16곳**에 쓰이고 있지만, 같은 파일 안에 `dh2()`를
안 거치고 **그냥 `<h2>`/`<h3>`를 직접 쓴 섹션 타이틀이 7곳** 남아 있습니다 — 이 7곳은
카테고리와 무관하게 항상 기본 Noto Sans KR로만 렌더됩니다(폰트 자체가 깨지는 건 아니고,
식품/패션/뷰티에서 나머지 섹션과 달리 세리프가 안 먹어 **페이지 안에서 헤드라인 폰트가
섞여** 보입니다 — "글자의 폰트도 좋지 않아"와 정확히 일치, 스크린샷의 "포장과 구성"
헤딩이 바로 이 케이스 중 하나입니다).

라이브 렌더러(`DetailSectionRenderer.tsx`)는 문제 없습니다 — `TYPO.sectionTitle`
상수 자체에 `pagzly-display-headline` 클래스가 이미 포함돼 있고, 미리보기 컨테이너에
`data-headline-face` 속성이 걸려 있어(`app/create/result/page.tsx:888`) CSS
선택자(`app/globals.css:47/55`)로 전 섹션에 자동 적용됩니다. **export만 헬퍼 누락으로
어긋나 있는 상태**입니다.

### 패치 — 누락된 7곳을 `dh2()`로 교체

`lib/export-detail-html.ts`, 전부 기존 스타일 문자열을 `dh2()`의 세 번째 인자
(`extraStyle`)로 그대로 옮기기만 하면 됩니다:

1. 253행 (`highlight_box` 케이스):
   ```ts
   // before
   <h2 style="text-align:center;font-size:${headingParts.keyword ? FONT_SIZE.sectionXs : FONT_SIZE.section};margin:12px 0 0">${esc(headingParts.remainder || section.heading)}</h2>
   // after
   ${dh2(category, esc(headingParts.remainder || section.heading), `text-align:center;font-size:${headingParts.keyword ? FONT_SIZE.sectionXs : FONT_SIZE.section};margin:12px 0 0`)}
   ```
2. 463행 (콜아웃 분기):
   ```ts
   // before
   <h2 style="font-size:${FONT_SIZE.sectionSm}">${esc(section.heading)}</h2>
   // after
   ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionSm}`)}
   ```
3. 683행 (`gallery` 케이스, 스크린샷 원인):
   ```ts
   // before
   <h2 style="text-align:center;font-size:${FONT_SIZE.section};margin-bottom:24px">${esc(section.heading)}</h2>
   // after
   ${dh2(category, esc(section.heading), `text-align:center;font-size:${FONT_SIZE.section};margin-bottom:24px`)}
   ```
4. 780행 (`caution` 케이스):
   ```ts
   // before
   <h2 style="font-size:${FONT_SIZE.section};margin:0">${esc(section.heading)}</h2>
   // after
   ${dh2(category, esc(section.heading), `font-size:${FONT_SIZE.section};margin:0`)}
   ```
5. 862행 (`illustration_banner` 케이스, 흰 텍스트 — 색은 부모 div의 `color:#FAF8F3`
   상속이라 `dh2()`로 바꿔도 색은 그대로 유지됨):
   ```ts
   // before
   ${section.heading ? `<h2 style="font-size:${FONT_SIZE.sectionLg};margin:0">${esc(section.heading)}</h2>` : ""}
   // after
   ${section.heading ? dh2(category, esc(section.heading), `font-size:${FONT_SIZE.sectionLg};margin:0`) : ""}
   ```
6. 909행 (`review_highlight` 케이스):
   ```ts
   // before
   <h2 style="text-align:center;font-size:${FONT_SIZE.section};margin:0">${esc(section.heading)}</h2>
   // after
   ${dh2(category, esc(section.heading), `text-align:center;font-size:${FONT_SIZE.section};margin:0`)}
   ```
7. 943행 (fallback/알 수 없는 섹션 타입):
   ```ts
   // before
   ${heading ? `<h2 style="text-align:center;font-size:${FONT_SIZE.section}">${esc(heading)}</h2>` : ""}
   // after
   ${heading ? dh2(category, esc(heading), `text-align:center;font-size:${FONT_SIZE.section}`) : ""}
   ```

## 검증 (짧게)

1. `npx tsc --noEmit` — 0.
2. `grep -n "galleryGapClass" lib/design-tokens.ts` — 6곳(DEFAULT+5카테고리 오버라이드,
   생활용품은 오버라이드 없음) 전부 `"gap-2"` 확인.
3. `grep -n "gap-px\|gap-0" components/DetailSectionRenderer.tsx` — 3086행 등 갤러리
   관련 잔여 없는지 확인(다른 용도의 `gap-0`/`gap-px`가 있다면 그건 갤러리와 무관하니
   건드리지 않음, 갤러리 관련만 확인).
4. `grep -n "dh2(" lib/export-detail-html.ts | wc -l` — 기존 16 → **23**.
5. 7곳 전부 더 이상 `dh2()`를 거치지 않는 `<h2 style="...">${esc(section.heading)}</h2>`
   패턴이 안 남았는지 raw grep으로 재확인.
6. 식품/뷰티/패션 카테고리로 export 1회 생성해 `.pagzly-display-headline` 클래스가
   달린 `<h2>` 개수가 라이브 렌더링의 섹션 개수와 맞는지 눈으로 확인(스크린샷 불필요,
   HTML 소스에서 class 속성 grep으로 충분).

## 하지 않는 것

- 생성 API 호출 전부 금지(0회).
- 카드/스텝 서브타이틀(262행 `highlight_box` 카드 `<h3>`, 288행 `step_card` 스텝
  `<h3>`)은 이번에 건드리지 않음 — 117차 원칙("히어로·섹션 타이틀 전용, 본문/라벨/표
  제외")상 이 둘은 섹션 최상위 타이틀이 아니라 하위 카드 라벨에 가까워 범위 밖으로 둠.
- `megaKeyword`(초대형 키워드) 분기의 `sectionSubtitle`/`keywordDisplay` 처리 방식은
  라이브·export 둘 다 지금 그대로 — 이번 라운드와 무관, 별도 조사 필요하면 다음 라운드.
- 갤러리 그리드 간격을 8px보다 더 키우지 않음 — 체크리스트(12px)보다는 좁게 유지해
  "사진 모자이크" 정체성은 남김. 취향 조정 필요하면 사용자 확인 후 다음 라운드.
- `FONT_SIZE`/`ELEVATION`/`RADIUS` 스케일 자체는 미수정(182/184차 완료·재작업 금지).
- 갭 사이로 보이는 accent 틴트 배경(그리드 배경색) 로직은 미수정.
- 174~192차가 끝낸 아이콘/elevation/radius/hero/그레인/대비/표시예산/lazy-loading/
  리뷰 나이체중 신호 로직 재작업 없음.

## 완료 보고 형식 (짧게)

3~5줄 요약 + `galleryGapClass` 6곳 확인 + `dh2()` 카운트(16→23) + diff.

## 백로그 마스터

이번에도 Cursor가 갱신하지 않습니다 — `review/193cha-report.md`만 남겨주시면 검증 후
제가 `claude/pagzly-backlog-master-2026-09-15.md`에 반영하겠습니다(이번 항목은 §3
백로그가 아니라 사용자가 스크린샷으로 직접 지적한 신규 버그라, 완료 후 §1에 "사용자
피드백(스크린샷) 직접 반영"으로 기록합니다).
