# 디자인 V5 개요 (465차)

**한 줄**: 변형 몇 개로는 "같은 공장 페이지"가 풀리지 않아, 페이지마다 **디자인 성격(아키타입) 한 벌**을 정하고, 섹션을 **박자·강도 곡선**으로 점검하며, 부품 24종을 늘렸다. 눈으로 확인하지 않았다 — 전부 플래그 뒤에 있고 문자열 안전망만 통과했다.

## 플래그와 롤백
| 변수 | 값 | 효과 |
|---|---|---|
| `NEXT_PUBLIC_DESIGN_V5` | `on` | V5 켜짐(**기본 꺼짐**). V5는 UP1(463·464차 기능)을 포함한다. v4(`NEXT_PUBLIC_DESIGN_V4=off`)가 꺼져 있으면 항상 꺼짐 |
| `NEXT_PUBLIC_V5_ARCHETYPE` | `editorial` `catalog` `softlife` `impact` `techsheet` `narrative` `luxe` `pop` | 아키타입 강제(비교·일부 롤백용). 비우면 자동 |
- **롤백 = `NEXT_PUBLIC_DESIGN_V5`를 지우고(또는 `off`) 재배포**. 꺼짐 출력은 464차 끝과 문자열이 같다(말뭉치 export 21개 + 섹션 단독 export·라이브 SSR, UP1 꺼짐/켜짐 두 가지로 확인, 4a·4b·4c 통과).
- 한 성격이 마음에 안 들면 `NEXT_PUBLIC_V5_ARCHETYPE`를 다른 값으로 고정해 임시로 피할 수 있다.
- `lib/v5-labels.ts`의 `V5_LABELS_ENABLED=false`로 두면 새 변형의 영문 표지(`CHAPTER` 등)가 모두 빈 문자열이 되고 순번·기호만 남는다.
- 편집 모드에서는 V5가 적용되지 않는다(`applyDisplayRules`가 편집 중이면 v4 계획 앞에서 끝남 — 464차 확인, 회귀가 잠금).

## 구조 (코드 위치)
| 축 | 파일 | 하는 일 |
|---|---|---|
| 아키타입 | `lib/page-archetype-v5.ts` | 8종 토큰(반경·알약·테두리·그림자·종이색·여백 3단·제목 정렬·아이브로·사진 프레임·구분선·번호 양식·마커·장식·배지·선호 변형), 선택(`pickArchetype`: 카테고리 적합표 + mood 보너스 + 시드, 상위 3개 중 결정적), 후처리(`applyArchetypeHtml`), 일반 섹션 래퍼 CSS(`archetypeCssV5`) |
| 스토리보드 | `lib/storyboard-v5.ts` | 박자(hook·empathy·proof·desire·objection·action) 분류, 강도 1~5, 곡선 규칙 점검·보정(`data-pz-ax` 표식), 변형 강도표 |
| 부품 | `lib/v5-parts.ts` | 새 변형 24개 + 번호 양식 4·마커 5·사진 프레임 6·배지 4 |
| 장식 | `lib/page-archetype-v5.ts`(`decorHtml`), `lib/dividers.ts` | 보조 장식 6종(`dots-grid`·`arc`·`squiggle`·`plus-field`·`bracket`·`ring`), 구분선 6종(`wave2`·`stripe`·`stitch`·`thin2`·`dotwave`·`tape`) |
| 연결 | `lib/display-sections.ts`, `lib/impact-templates.ts`, `lib/layout-variants.ts`, 두 렌더러 | 표시 단계가 토큰을 고르고 임팩트에 `ax`를 찍음 → `impactHtml` 끝에서 후처리 → 일반 섹션은 래퍼 표식 + 같은 CSS 함수 |
| 갤러리 | `scripts/v5-gallery-465.ts` | 말뭉치 × 8종 정적 HTML(집 PC에서 열어 비교; 로컬 placeholder 사진만) |

라이브와 export는 **같은 함수**(`impactHtml`/`v4Html`/`archetypeCssV5`)를 읽는다. 일반 섹션 내부 마크업(두 벌)은 건드리지 않았다 — 그 부분은 래퍼 여백·위쪽 선만 아키타입을 따른다(`docs/v5-architecture-465.md`).

## 아키타입 8종
| id | 성격 | 반경 | 테두리 | 그림자 | 종이색 | 여백(조밀/보통/여유) | 제목 | 장식 | 어울리는 카테고리(앞이 우선) |
|---|---|---|---|---|---|---|---|---|---|
| `editorial` | 에디토리얼 매거진 | 0(알약 2) | 1px 실선 진하게 | 없음 | `#FAF7F1` | 40/64/88 | 왼쪽·번호 | 위쪽 가는 선 | 패션, 뷰티, 리빙 |
| `catalog` | 카탈로그 그리드 | ×0.6(알약 6) | 2px 실선 | 없음 | `#F3F2EE` | 28/40/56 | 왼쪽·번호 | 모서리 브래킷 | 전자, 식품, 리빙, 반려 |
| `softlife` | 소프트 라이프스타일 | ×1.6(알약 유지) | 1px 부드럽게 | 따뜻한 번짐 | `#FFFBF6` | 40/56/72 | 가운데·알약 | 번지는 빛 | 뷰티, 식품, 리빙, 반려 |
| `impact` | 하이콘트라스트 임팩트 | ×0.5(알약 6) | 3px 실선 | 하드 4px | `#FFFFFF` | 32/48/64 | 왼쪽·번호 | 왼쪽 굵은 띠 | 전자, 패션 |
| `techsheet` | 클리닉/테크 스펙시트 | 0(알약 0) | 1px 점선 진하게 | 없음 | `#EEF3F8` | 28/40/52 | 왼쪽·라벨 | 모서리 눈금 | 전자, 뷰티(clinic mood) |
| `narrative` | 스토리 스크롤 | ×1 | 1px 실선 | 부드러움 | `#FDFBF8` | 48/72/96 | 왼쪽·번호 | 세로 척추 | 뷰티·식품·리빙·반려 |
| `luxe` | 프리미엄 미니멀 | ×0.1(알약 2) | 1px 옅게 | 없음 | `#FBFAF6` | 56/80/104 | 가운데·라벨 | 가운데 짧은 선 | 뷰티, 패션, 전자 |
| `pop` | 플레이풀 팝 | ×1.8(알약 유지) | 2px 굵게 | 하드 3px | `#FFFDF4` | 32/44/60 | 가운데·알약 | 기울어진 스티커 | 반려, 식품 |
선택은 카테고리 적합표 상위 3개 안에서 시드로 정한다(같은 상품 = 항상 같은 성격). 규정이 걸린 구매 카드·주의·고지 섹션에는 표식도 후처리도 붙이지 않는다(회귀가 이 섹션들의 글 노드가 V5 켜짐/꺼짐에서 같음을 확인).

## 거시 4축 기준 아키타입 표 (466차)
8종이 한 장 캡처에서 "같은 페이지"로 보이던 문제(465차)를 고치기 위해 토큰을 **면 전략 · 히어로 · 변형 확정 선호 · 타이포/정렬** 네 축으로 묶었다. 자세한 지도·수치: [`docs/v5-macro-466.md`](v5-macro-466.md).
| id | 면 전략 | 진한 면 비율(본문) | 히어로(기존 A~E) | 1순위 변형(장점 / 고민 / 스토리 / 스펙 / 사진글 / FAQ) | 제목 굵기·정렬 |
|---|---|---|---|---|---|
| editorial | `lightOnly`(밝은 종이) | 1% | D(스플릿) | stackbig / memo / editorial / line / dframe / numlist | 500 · 왼쪽 |
| catalog | `tintAlt`(옅은 틴트 교대) | 1% | B(컬러 필드) → D | rows2 / tiles2 / chapter / grid / stack / twocol | 700 · 왼쪽 |
| softlife | `tintAlt` | 3% | B → D | iconlist / bubbles / letter / cards / polaroid / chat | 500 · 가운데 1블록 |
| impact | `blockAlt`(진한 면 교대) | 30% | C(다크 시네마) → B → A | bento / deck / pullband / big3 / offset / tabs | 900 · 왼쪽 |
| techsheet | `lightOnly` | 1% | D | iconlist / checkrows / linetime / panel / caption / twocol | 900 · 왼쪽 |
| narrative | `tintAlt` | 1% | A(전폭 사진) → D | zigzag / stack / letter / tags / overlap / numlist | 700 · 왼쪽 |
| luxe | `lightOnly` | 2% | E(타이포) → D | iconstrip / tiles2 / letter / line / dframe / qband | 400 · 가운데 1블록 |
| pop | `colorCollide`(포인트·진한 면 충돌) | 33% | B → C | numcards / bubbles / pullband / grid / polaroid / chat | 900 · 가운데 1블록 |
- **면 전략**: `lightOnly`·`tintAlt`는 진한 면이 없다(일반 섹션의 진한 강조 블록 `boldBlock`도 밝게). `blockAlt`·`colorCollide`는 v4 블록과 띠에 진한 면(`invert`)을 쓴다 — 렌더러가 팔레트 의미값만 읽으므로 어두운 면용 팔레트(`darkPaletteOf`)를 주고, 상수 흰색·잉크색은 보정한다(`invertFixHtml`). 모든 변형 × 팔레트 21 × mood 7에서 글자 대비 4.5:1 감사 통과.
- **선호는 정렬이 아니라 우선순위**: 선호 목록의 변형이 먼저, 요건·상한·이웃 규칙은 그대로. 처음 1/3 높음 요건이 부족하면 계획 마지막에서 최소 개입.
- **롤백**: 위 전부 `NEXT_PUBLIC_DESIGN_V5` 뒤. 특정 성격만 피하려면 `NEXT_PUBLIC_V5_ARCHETYPE`로 고정.

## 다이나믹 레이어 (467차)
"그림판 같다, 너무 밋밋하다"는 평가에 대응해 깊이·겹침·스케일 대비·기울임·도형 전환 장치를 얹었다. 전부 `NEXT_PUBLIC_DESIGN_V5=on` 뒤(꺼짐·편집 모드 불변). 진단·목표·결과: [`docs/dynamics-audit-467.md`](dynamics-audit-467.md).
- **부품** `lib/dynamics-v5.ts` 30종: 스케일(bigWord·numeralStack·statBlock) · 깊이(overlapStack·layeredCard·shadowPlate·floatingObject) · 기울임(tiltCard·tape·sticker·ribbon·stampBadge) · 면 전환(slant·wave·scallop·zigzag·step 이음새, overlapSeam) · 필기(highlighter·scribbleCircle·squiggleUnderline·arrowCallout) · 구성(mosaic·polaroidStack·stepPath·gaugeRing·tickerBand·dotGrid·stripeField·gridPaper).
- **레이어** `lib/dynamics-layer-v5.ts`: 계획(표시 단계) → `impactHtml` 끝에서 적용. 큰 배경 글자(v4=순번, 기존 임팩트=제목 첫 단어) · 기울인 판 · 스티커·테이프(기울임 성격만) · 카드 모서리 변주 · 사진 틀 모서리 6종 변주 · 배경 질감(점·줄무늬·모눈) · 이음새 도형(자기 색이 위 섹션 쪽으로 솟음) · 걸침(rise). 장식은 `aria-hidden`·`pointer-events:none`·`z-index:-1`(루트 `isolation`)이라 글을 가리지 않고, 페이지당 상한이 있다.
- **일반 섹션 다시 그리기**: stat_infographic(number 전부) → stats(bignum·trio·rings), gallery → gallery(mosaic·polaroid), text_only → story. 조건 미달·디스클레이머 필요 수치는 기존 렌더러.
- **티커 띠**(최대 1): 입력의 상품명·키워드 반복, catalog·impact·pop.
- **아키타입별 강도**(`dyn.level`): impact·pop 5 / softlife·narrative·catalog 4 / editorial·techsheet·luxe 3. 이음새 종류: impact slant · pop zigzag · softlife wave · narrative scallop · catalog·techsheet step · editorial·luxe 걸침만.
- **롤백**: 플래그 끄기. 특정 장치만 피하려면 `NEXT_PUBLIC_V5_ARCHETYPE`로 낮은 강도 성격 고정. 모션(`NEXT_PUBLIC_DESIGN_V5_MOTION`)은 만들지 않았다.
- **검수용 사진**: `scripts/make-ph2-467.ts`(제품 8 × 톤 3 SVG, `public/qa-fixtures/ph2`) + 갤러리 `--ph2 --localize-blocked`.

## 새 변형 24개 (V5 켜짐에서만)
| 계열.변형 | 입력 요건 | 선호하는 아키타입 | 말뭉치×8종에서 선택됨 |
|---|---|---|---|
| `benefits.stackbig` | 항목 2~5, 제목 ≤40, 설명 ≤90 | editorial·impact·narrative | 6종 |
| `benefits.rows2` | 항목 4~6, 제목 ≤24, 설명 ≤60 | catalog·softlife·techsheet·pop | 선택 안 됨(요건 까다로움, 단위 렌더로 확인) |
| `benefits.iconlist` | 항목 3~6, 제목 ≤40, 설명 ≤90 | editorial·softlife·techsheet·narrative·luxe | 선택 안 됨(단위 렌더) |
| `concern.memo` | 항목 3~6, 제목 ≤40 | editorial·catalog·techsheet·luxe | 4종 |
| `concern.deck` | 항목 3~5, 제목 ≤36 | softlife·impact·narrative·pop | 4종 |
| `story.chapter` | 인용문 ≥8자 또는 본문 ≥40자 | editorial·catalog·impact·techsheet·narrative | 선택 안 됨(앞 1/3 자리에서 더 큰 변형이 먼저 뽑힘) |
| `story.letter` | 본문 ≥60자 | editorial·softlife·narrative·luxe | 선택 안 됨(같은 이유) |
| `spec.panel` | 행 2~8, 라벨 ≤20, 값 ≤60 | editorial·catalog·techsheet | 6종 |
| `spec.tags` | 행 2~8, 라벨 ≤12, 값 ≤16 | catalog·softlife·narrative·luxe | 2종 |
| `spec.big3` | 행 2~3, 값 ≤10 | impact·techsheet·pop | 선택 안 됨(값이 짧은 입력이 말뭉치에 없음) |
| `phototext.stack` | 사진 1장 항목 1개 | editorial·catalog·impact·narrative | 8종 |
| `phototext.polaroid` | 사진 1장 항목 1개 | softlife·pop | 7종 |
| `phototext.dframe` | 사진 1장 항목 1개 | editorial·techsheet·luxe | 8종 |
| `faq.numlist` | 질문 2~8, 질문 ≤70, 답 ≤200 | editorial·techsheet·narrative·luxe | 8종 |
| `faq.twocol` | 2~6, 질문 ≤50, 답 ≤120 | catalog·techsheet·pop | 6종 |
| `faq.qband` | 2~8 | editorial·softlife·impact·luxe | 5종 |
| `faq.chat` | 2~6, 질문 ≤60, 답 ≤160 | softlife·narrative·pop | 8종 |
| `faq.tabs` | 2~8 | catalog·impact | 2종 |
| `proof.lead` | 신뢰 근거 박스 카드 2~4 | editorial·softlife·narrative·luxe | 8종 |
| `proof.wall` | 카드 3~4 | editorial·catalog·impact·techsheet·pop | 5종 |
| `proof.badges` | 카드 2~4, 제목 ≤14 | catalog·impact·techsheet·pop | 5종 |
| `proof.seal` | 카드 2~4, 제목 ≤20 | softlife·narrative·luxe | 3종 |
| `touch.ticket` | 접점(가격 입력 있을 때) | catalog·softlife·impact·pop | 8종 |
| `touch.ledger` | 접점 | editorial·techsheet·narrative·luxe | 8종 |
- 모든 문구는 입력 원문. 추가되는 글자는 순번과 `lib/v5-labels.ts`의 닫힌 영문 표지뿐(`STEP POINT NO. Q A CHAPTER SPEC NOTE CHECK STORY DETAIL`).
- FAQ(`faq.*`)는 **이미 정적으로 펼친 FAQ 카드(`faqcards` 임팩트)** 를 다시 그린다 — 접힘 인터랙션이 있는 일반 FAQ 아코디언(`FaqAccordion`)은 건드리지 않았다. 신뢰 근거(`proof.*`)는 `seller_trust_evidence` 강조 박스에서만 만든다.
- 제외(다음 차수 후보): 후기(`review_highlight` — 집계·고지), 비교(`comparison_chart` — 측정 근거 정책), 히어로 확장(첫 화면 규칙 때문에 눈 검수 없이 위험).

## 스토리보드 규칙과 결과 (말뭉치 21 × 2종 샘플, 섹션 순서는 바꾸지 않음)
- 강도 곡선: 높음(≥4)/낮음(≤2) 3연속 금지, 처음 1/3(히어로 제외)에 높음 2개 이상, 구매 카드 앞 3개 안에 높음 1개.
- 보정 수단: 표식 가능한 일반 섹션의 강도(=여백 단계), 앞 1/3 자리 변형 선택에서 큰 변형 우선, 앞 섹션이 낮으면 강도 3 이상 변형 우선, 구매 카드 앞 "마무리 띠".
- 결과(위반 합계, 말뭉치 21페이지, editorial 기준 — V5 꺼짐(UP1)→V5): 높음 3연속 3→4(+1, 회귀 허용치 +2 안), **낮음 3연속 86→34**, 처음 1/3 높음 부족 3→3(변화 없음), **마무리 직전 높음 없음 21→10**. **0이 되지는 않았다**: 임팩트·v4 블록끼리의 낮은 연속과 페이지 끝의 정보 꼬리(스펙·FAQ·주의·고지)는 순서를 바꾸지 않는 한 표식으로 못 고친다.

## 알려진 한계
- 눈 검수 없음. 8종이 "눈에 띄게 다르다"는 것은 문자열 대리 지표로만 확인했다: 28쌍이 7축(진한 면·중앙 정렬·히어로·변형 집합·반경·그림자·제목 굵기) 중 3축 이상에서 갈림(465차 서명 거리 지표는 포화돼 폐기).
- 일반 섹션 내부(카드 반경·제목 정렬)는 아키타입을 따르지 않는다(두 벌 마크업). 중앙 정렬의 상당 부분(약 27%)이 일반 섹션이라 가운데 성격도 가운데 제목은 페이지당 1블록뿐이다.
- **평탄 구간(연속 3개 섹션 마크업 길이 변동 < 0.15)은 목표(UP1 37 이하)에 못 미친다**: 아키타입별 48~71. v4 변형 마크업이 2~4천 자에 모여 있고 선호가 일관돼서다(시도·원인: `docs/v5-macro-466.md` §10).
- 빈 사진 면(캡처에서 보인 약 1000px 빈 패널)은 원인 불확실(가짜 현상 가능성이 높음). 집 PC 확인: `docs/pc-todo.md`.
- 진한 면 전략(impact·pop)은 진한 덩어리가 페이지당 평균 5개 안팎(최대 8)이라 428차 "명암 반전 ≤6" 예산(브라우저 지표)을 넘길 수 있다.
- 눈 검수 순서와 항목: `docs/pc-todo.md` "V5 눈 검수".

## 진짜 다이나믹 (468차)
- **배너 매핑**(토큰 `banner:[첫,다음]`, `lib/banner-v5.ts`, 섹션 `v5Banner` → 두 렌더러가 `section.v5Banner ?? bannerStyleNow()`): editorial·catalog·techsheet·luxe = split → card-only / softlife·narrative = card-only → split / impact = full-scrim → card-only / pop = full-scrim → split. 배너가 여럿이면 번갈아(연속 같은 값 없음). `BANNER_STYLE` 기본값·V5 꺼짐 배너는 그대로.
- **디스플레이 스케일**(토큰 `type.title/display`, `fitTitlePx`): 제목(26px 역할)·큰 문구(30px 역할)를 글자 수·가장 긴 어절로 단계 선택(320폭 가용 272px, 기존 크기 미만 없음). 값 title/display: editorial 40/44, catalog 36/40, softlife 36/40, impact 44/50, techsheet 34/38, narrative 38/42, luxe 32/36, pop 42/48. `clamp/cqi`는 export에 있으나 v4 블록 루트에 컨테이너가 없어 단계 함수로 처리(결정적).
- **구도 부품**(`lib/compose-v5.ts`): bleedPhoto·splitAsym·staggerGrid·pullOut·offsetStack·heroNumber·layerDeck. 새 변형: phototext.bleed/split, benefits.stagger, concern.offset, story.pullout, gallery.deck(+ story.chapter 번호 칸). 입력 요건 미달이면 기존 변형으로 폴백. `wrap(bleed)`는 내용 상자가 섹션 폭을 쓴다.
- **구도 계획**(`planDynamicsV5`): 구도 변형이 아닌 적격 섹션은 내용 열을 번갈아 한쪽으로 들인다(`indent`), 이음새의 2/3를 걸침으로 바꾼다.
- **빈 사진 틀**: V5 켜짐에서 `[data-pz-np]` 틀 max-height 280px + 사선 대비 상향(`noPhotoCssV5`). 기준(꺼짐)의 같은 결함은 별도 결정.
- **일반 섹션**: V5 단일 소스는 467차 3종(stats·gallery·text_only story). 468차는 표식이 있는 일반 섹션에 강도 4·5 시트 모서리/윗그림자(래퍼 CSS). 상품 정보 표·persona 등 구조 재작성은 하지 않음.
- **롤백**: 플래그(`NEXT_PUBLIC_DESIGN_V5`) 끄기 또는 `NEXT_PUBLIC_V5_ARCHETYPE` 고정. 지표: `npx tsx scripts/dynamics-report-468.ts`.

## 남은 평평한 덩어리 (469차)
- **정보 구간 매핑**(토큰 `infoBackdrop`, `lib/info-v5.ts`): scrim-deep(impact·pop: 기존 진한 면 유지) / scrim-light(editorial·catalog·techsheet·luxe: 밝은 틴트 스크림 + 흰 카드 + 잉크 글자, 알파는 기존 `scrimAlpha`로 검은 사진 최악 5.5:1) / photo-plain(softlife·narrative: 옅은 스크림) / 사진 URL이 없으면 모두 틴트 면. `archetypeCssV5` 뒤에서 같은 선택자 `!important`로 덮어쓴다(stat·statnum·steps 반전도 해제). 상품 정보 표(`#pagzly-info`)는 ledger(editorial·luxe·techsheet)/stack(그 외) 목록 구조, 크기표·배송 제외.
- **일반 섹션 변환**: target_persona → concern 변형(3~6개·각 40자 이하·사진 띠 없음일 때만, 문장 원문), step_card → benefits.zigzag(사진 유지, 라벨 STEP; 2~4단계·사진 모두 유효·중복 없음일 때만). 조건 미달·편집 모드·V5 꺼짐은 기존 렌더러. review_highlight·checklist·tradeoff·comparison·color_variation은 정책·인터랙션 사유로 래퍼만.
- **본문 글자 토큰**(`type.body/lh`): editorial·catalog·techsheet·luxe 15px, softlife·impact·narrative·pop 16px, 행간 1.7~1.75(`BODY_LINE_HEIGHT_MAX`). 대상은 문단급 14·15px `<p>`(16자 이상, 굵기 ≤500) — 가격·한 줄 고정·대문자 라벨·고지(note)·배송 블록 제외.
- **화면 장악 장면**(`planScenesV5`): story 인용·phototext 1장·숫자 카드·강조 문장을 `*.scene`(min-height 640, 글자 36px 이상)으로 승격. 강도 5/4/3 → 3/2/1개, 위치 30·62·88%, 간격 ≥3, 접점·숨 고르기 옆 제외, 새 글자 없음. 일반 변형 회전에는 들어가지 않는다.
- **롤백**: 플래그(`NEXT_PUBLIC_DESIGN_V5`) 끄기 또는 `NEXT_PUBLIC_V5_ARCHETYPE` 고정. 지표: `npx tsx scripts/dynamics-report-469.ts`.

