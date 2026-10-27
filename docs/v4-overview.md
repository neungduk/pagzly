# v4 변경 총정리 (438~450차)

`NEXT_PUBLIC_DESIGN_V4`가 켜는 디자인 기능과 끄는 법의 한 장 요약. **사실만** 적었고, 이 저장소에서 확인하지 못한 것은 "미검증"으로 표시했다.
근거는 각 차수 보고서(`review/` 폴더의 차수별 보고서)와 커밋 메시지(`git log --grep=NNN차`)다.

## 1. 플래그

| 플래그 | 기본 | 읽는 곳 | 끄는 값과 효과 |
|---|---|---|---|
| `NEXT_PUBLIC_DESIGN_V4` | 켬(`off`가 아니면) | `lib/design-v4.ts` | `off` → v4 전체 꺼짐(아래 표의 "v4" 기능 전부). 히어로 v3 레이어도 없어지고 438차 히어로가 나온다 |
| `NEXT_PUBLIC_HERO_V2` | 켬(438차 조정) | `lib/hero-spec.ts` | `prev` → 437차 히어로 사양, `off` → 436차 히어로. `prev`·`off`면 v4가 켜 있어도 히어로 v3 레이어는 만들지 않는다(`designV4On() && HERO_V2_TUNED`일 때만 v3) |
| `NEXT_PUBLIC_DESIGN_POLISH` | 켬 | `lib/design-polish.ts` | `off` → 437차 직후 화면(색 다양성·기존 섹션 토큰·제목 줄 끝 고아 줄이기) |
| `NEXT_PUBLIC_DESIGN_V2` | 켬 | `lib/design-v2.ts` | `off` → 427차 결과(428차 디자인 V2). v4 이전 플래그 |
| `NEXT_PUBLIC_DESIGN_V3_COLOR` | 켬 | `lib/palette-harmony.ts` | `off` → 429차 틴트 세기. v4 이전 플래그 |
| `NEXT_PUBLIC_HERO_STAGE` | 끔(`on`일 때만 켜짐) | `lib/hero-variants.ts` | 기본이 꺼짐이라 v4 롤백과 무관 |

v4 이전 플래그(`DESIGN_V2`·`DESIGN_V3_COLOR` 등)는 이 문서 범위 밖이다. 롤백 절차에서는 건드리지 않는다.

## 2. 기능 표 (v4 안에서 켜지는 것)

"off 동작" = `NEXT_PUBLIC_DESIGN_V4=off` 일 때. 특별한 언급이 없으면 438차 직후와 같은 출력이다(§4 검증 근거).

| 영역 | 차수 | 핵심 파일 | 플래그 | off 동작 | 위험 메모 |
|---|---|---|---|---|---|
| 히어로 사진 비율·텍스트 압축·실패 폴백 | 438 | `lib/hero-spec.ts` | `HERO_V2` | `HERO_V2=prev/off`로 이전 사양 | 실사진 미검증 |
| 히어로 포화 면 색(색상 힌트·채도 상한) | 438·447 | `lib/hero-spec.ts` | `DESIGN_POLISH`(힌트), v4(상한 `HERO_FACE_CAP`) | 대표색 그대로 | 채도·명도 상한은 **실사진 확인 필요(미검증)** |
| 제목 줄 끝 고아 줄이기 | 438 | `lib/typo-rhythm.ts` | `DESIGN_POLISH` | 꺼짐 | — |
| 기존 섹션 mood 언어 | 438 | `lib/polish-sections.ts` | `DESIGN_POLISH` | 꺼짐 | — |
| 컬러 시스템 v4(톤 사다리·면 역할) | 439 | `lib/palette-v4.ts` | v4 | 이전 색 | 446차 색상군 ≤3 규칙(R18) |
| 그래픽 모티프(코드 SVG) | 439 | `lib/motifs` | v4 | 없음 | 750폭 가로 넘침을 440차에 수정 |
| 타이포 연출 | 439 | `lib/type-treatments.ts` | v4 | 없음 | 입력 문구만 사용 |
| 섹션 레이아웃 변주·후킹 구조 | 439·440 | `lib/layout-variants.ts` | v4 | 이전 마크업 | — |
| 히어로 v3 레이어(고스트·스티커·가격) | 439·446·447 | `lib/hero-spec.ts` | v4 + `HERO_V2` 기본 | 438차 히어로 | 고스트는 폭 맞춤 후 44px 미만이면 끔 |
| 디자인 린터 | 439~449 | `scripts/design-lint.ts`, `scripts/a11y-lint.ts` | (검사 도구) | — | R5~R23 규칙 |
| 아이콘 75종(코드 SVG) | 440 | `lib/icons` | v4 | 이전 아이콘 | — |
| 제목 시스템(위계 3단) | 441·442·443 | `lib/design-tokens-v4.ts` | v4 | 이전 제목 | — |
| 이전 정보 섹션 v4·구분선·신뢰 스트립 | 441·442 | `lib/dividers.ts`, `lib/layout-variants.ts` | v4 | 이전 섹션 | — |
| 세로 리듬(여백 32·48·64) | 441·444·445·447 | `lib/rhythm-v4.ts`, `lib/mood.ts` | v4 | 이전 여백 | — |
| 토큰 단일 소스·쌍둥이 수정 | 443 | `lib/design-tokens-v4.ts` | v4 | 이전 값 | 라이브·export 문자열 패리티 필요 |
| 본문 사진 톤 오버레이·고스트 페이드 | 443·444 | `lib/design-tokens-v4.ts`, `lib/hero-spec.ts` | v4 | 없음 | `filter`·`mask`·`clip-path` 금지 |
| 가독성↔노출 균형(히어로 A 글 블록 자체 스크림) | 448·449 | `lib/hero-spec.ts` | v4 | 이전 스크림 | 합성 사진 기준, 실사진 미검증 |
| 칩 테두리 토큰 | 449 | `lib/design-tokens-v4.ts`(`CHIP_V4`) | v4 | 이전 칩 | — |
| 접근성·구조(제목 단계·alt 등) | 448 | `scripts/a11y-lint.ts`, 렌더러 | v4 | 이전 마크업 | — |
| export 반복 style 묶기 | 448 | `lib/export-detail-html.ts` | v4 | 묶지 않음 | 계산 스타일 동일 검증 필요 |
| 빈 섹션 껍데기·제목만 항목 생략 | 449 | `lib/display-sections.ts` | v4 | 생략 안 함 | 정상 입력 불변 |
| 소형 글자 muted 단계(`MUTED_V4`) | 450 | `lib/muted-v4.ts` | v4 | 이전 알파 | 합성 21종 기준 |
| 한글 타이포 마감(keep-all·행간 상한·알약 어절 묶음) | 452 | `lib/typo-v4.ts`, `lib/illust-sections.ts` | v4 | 예전 줄바꿈·행간 | 단어 중간 끊김은 미개선 |
| 작은 안내 글 14px(고지·리뷰 요약·스펙 확인 항목·구매 카드 안내) | 452 | `lib/twin-styles-v4.ts`, `lib/beauty-style.ts` | v4 | 12~13px | 린트 점수 지표 정의에 저작 표기 `<footer>` 제외 포함 |
| 히어로 D 사진 높이 상한·첫 화면 실측 | 451 | `lib/hero-spec.ts`(`HERO_D_PHOTO_MAX_PX`) | v4 | 상한 없음 | 750폭 실측은 합성 21종만 |
| 일러스트 배너 3안 스위치 | 451 | `lib/design-tokens-v4.ts`(`BANNER_STYLE`) | v4 | 예전 배너 | 기본 `full-scrim`, 실사진 미검증 |
| 히어로 A 글 블록 압축 | 450 | `lib/hero-spec.ts`(`heroABlockFold`) | v4 | 접지 않음 | 접힌 문구는 마크업에 남고 눈에는 안 보임, 390폭 기준 어림 |
| 라이브 빈 `src`·`key=""` 정리 | 450 | `components/DetailSectionRenderer.tsx` | v4 | §6 참고 | 빈 입력에서만 off 출력이 달라질 수 있음 |

## 3. 롤백 절차 (단계적 off)

환경변수는 Vercel 프로젝트 설정에서 바꾼다. `NEXT_PUBLIC_*`는 빌드 시점에 코드에 들어가므로 **값을 바꾼 뒤 다시 배포해야 한다**(일반적인 Next.js 동작; 이 저장소에서 실제 배포로 확인한 적은 없음 — 미검증).

| 단계 | 설정 | 사라지는 것 | 출력이 같은 시점 |
|---|---|---|---|
| 1 히어로만 이전 사양 | `NEXT_PUBLIC_HERO_V2=prev` | 히어로 v3 레이어(고스트·스티커·가격 알약·글 블록 스크림·압축)와 438차 히어로 조정. 나머지 v4는 유지 | 히어로는 437차 사양(코드 주석 기준, 문자열 대조는 미검증) |
| 2 v4 전체 off | `NEXT_PUBLIC_DESIGN_V4=off` | 위 표의 v4 기능 전부 | 438차 직후 출력(`check-v4-off`) · 447·449차 기준 커밋 출력(회귀 `checkV4Off`) |
| 3 이전 상태 | 2단계 + `NEXT_PUBLIC_DESIGN_POLISH=off` + `NEXT_PUBLIC_HERO_V2=off` | 438차 마감(색 다양성·제목 줄·히어로 조정) | 436~437차(코드 주석 기준, 이 조합의 문자열 대조는 미검증) |

되돌린 뒤 눈으로 확인할 곳은 `docs/pc-verify.md`의 체크리스트를 따른다.

## 4. off = 이전 차수 검증 근거

- 스크립트: `scripts/check-v4-off.ts`(export), `scripts/check-v4-off-live.tsx`(라이브), `scripts/check-v4-off-section.tsx`(섹션 단독 — 섹션을 하나씩만 담아 export·라이브로 렌더, 기준 `review/454-verify/snap-section/`은 커밋하지 않으며 없으면 건너뜀. 기준 만들기: 기준 커밋 worktree에서 `OUT=review/454-verify/snap-section npx tsx scripts/check-v4-off-section.tsx --write`).
- 매 차수 보고서의 "off diff 3종 0" 줄이 근거다(예: `review/449cha-report.md`). 450차도 같은 방식으로 7ae6336(449차 끝) 대비 정상 입력 0을 확인했다.
- 한계: 비교는 합성 픽스처 21종 + 저장 세션 6종 기준. 실제 운영 데이터는 미검증.

## 5. 알려진 한계·미검증

- 실사진·판매자 저장 세션은 PC에서만 확인할 수 있다(합성 사진은 단색·그라데이션 위주).
- 히어로 A 압축은 390폭 기준 글자 폭 어림이라 750폭 이상에서는 과하게 접힐 수 있다(미검증).
- 배너 3안은 결정 자료만 만들었고 기본값은 그대로다(`review/450-verify/banner-options/`).
- 큰 통계 숫자(40px 굵은 글자)는 3:1 기준으로 측정한다. 측정 도구의 오탐 가능성이 남아 있다.
- `next build`·실제 배포는 클라우드에서 더미 환경값으로만 확인했다.

## 6. 450차 라이브 쌍둥이 정리와 off 출력

- 사진이 0장일 때 색상 옵션 섹션(`ColorVariationInteractive`)의 `<img src="">`를 v4일 때만 생략한다(`DESIGN_V4_ENABLED` 분기). off에서는 이전과 같이 그린다.
- 비교표 짝수 행 배경을 v4에서 `transparent`(export와 같음)로 둔다. off는 `theme.baseNeutral` 그대로.
- 목록 키(칩·배지·각주·색상 옵션·FAQ·비교표)에 순번을 넣었다. 키는 출력 문자열에 나오지 않으므로 off 출력은 변하지 않는다.
- off 출력 변화: 정상 입력 21종 0. 빈 입력에서의 off 차이는 없음(분기가 모두 v4 안).

## 6-1. 배너 3안 스위치와 첫 화면 기준 (451차)

**배너 스위치**: `lib/design-tokens-v4.ts`의 `BANNER_STYLE`(기본 `full-scrim`). 한 줄만 바꾸면 라이브·export가 같이 바뀐다. v4가 꺼져 있으면 값과 상관없이 예전 배너.

| 값 | 모습 | 대비(최저, 합성 사진 17종) | 사진 노출(가림/보존, 평균) |
|---|---|---|---|
| `full-scrim` | 전면 스크림 + 가운데 제목 카드(현재) | 14.2 | 1.00 / 0.09 |
| `card-only` | 전면 스크림 없이 제목 카드 면만 | 12.3 | 0.67 / 0.36 |
| `split` | 사진은 덮개·글자 없음, 제목은 사진 아래 띠 | 사진 위 글자 없음(띠 위 흰 글자) | 0.00 / 1.00 |

표: `review/451-verify/banner-style.md`(`npx tsx scripts/banner-style-measure.ts`로 다시 만든다). 눈 비교: `review/450-verify/banner-options/`. 합성 사진 기준이며 실사진은 **미검증**.

**첫 화면 기준값**(히어로 필수 요소 실측, `scripts/hero-fold-check.ts`): 390폭 → 844px, 750폭 → 1000px(가정값). 히어로 D는 사진 높이 상한 `HERO_D_PHOTO_MAX_PX`(640px, v4)로 750폭에서도 제품명·훅·가격이 첫 화면 안에 들어온다.

## 7. 하네스·검증 도구

| 도구 | 용도 |
|---|---|
| `npm run pc-verify` | PC 원커맨드 검증. 사용법 `docs/pc-verify.md` |
| `scripts/regression/run-all.ts` | 회귀 전체 |
| `scripts/photo-legibility.ts` | 극단 사진 위 글자 대비(픽셀 기준) |
| `scripts/photo-exposure.ts` | 사진 노출(가림 면적비·휘도 보존율) |
| `scripts/fuzz-check.ts` · `scripts/fuzz-live.ts` | 입력 퍼징(export · 라이브, 라이브는 `next dev` 필요) |
| `scripts/png-compare.ts` | PNG 다운로드 경로 대조 |
| `scripts/size-budget.ts` · `scripts/style-dedupe-check.ts` | export 크기 예산·반복 style 묶기 |
| `scripts/hero-compress-sheet.ts` | 히어로 A 압축 전/후 시트 |
| `scripts/hero-fold-check.ts` · `scripts/hero-fold-sheet.ts` | 히어로 필수 요소 첫 화면 실측(390·750)·전/후 시트 |
| `scripts/banner-style-measure.ts` | 배너 3값 대비·노출 측정 |
| `scripts/predeploy-static.ts` | 배포 전 정적 점검(환경 파일 안 읽음) — `docs/predeploy-static.md` |
| `scripts/typo-metrics.ts` | 한글 타이포 지표(외톨이·끊김·행간·줄 글자 수) |
| `scripts/fuzz-stability.ts` | 라이브 퍼징 작업자 4 vs 1 안정성 비교 |
| `scripts/live-probe.ts` | 라이브 퍼징 사례 한 건의 글자 대비 위반 원천(클래스·배경 사슬) 확인 |

## 8. 규칙 요약

새 문구·수치를 만들지 않는다. 고지 문구·결제 코드·`cta_price` 구조·`data-pz-buy`·스티키 바·편집 UI·인터랙션은 바꾸지 않는다. 디자인 변경은 모두 v4 안이고 off 출력은 이전 차수와 같아야 한다. export에서는 `:has()`·container query·`text-wrap`·`mix-blend-mode`·`clip-path`·`mask`·`-webkit-text-stroke`를 쓰지 않는다. 글자 대비 4.5:1(큰 글자 3:1은 24px 이상 또는 18.66px 이상 굵은 글자).

## 9. UP1 — 업그레이드 1차 하위 플래그 (462차)
- 플래그: `NEXT_PUBLIC_DESIGN_V4_UP1=on`일 때만 켜진다(**기본 꺼짐**). v4가 꺼져 있으면(`NEXT_PUBLIC_DESIGN_V4=off`) 항상 꺼진다. 코드: `lib/design-v4.ts`의 `DESIGN_V4_UP1_ENABLED`.
- UP1 안에서만 바뀌는 것(라이브·export 같은 규칙): ① 페르소나 줄 글이 22자를 넘으면 3줄 말줄임 대신 4줄까지 표시(`lib/robust-462.ts` `personaClampLines`) ② 하이라이트 카드가 4장이면 넓은 폭에서도 2×2 격자(4열이면 칸 글 폭이 120px 안팎).
- v4 안에서 항상 적용되지만 **긴 입력에서만** 달라지는 것(정상 길이 출력은 문자열 그대로): ③ 비교 막대의 값 칸 — 단위가 4자를 넘으면 줄바꿈 허용(`isLongUnit`) ④ 통계 막대의 값 칸 — 값이 10자를 넘으면 줄바꿈 허용(`isLongStatValue`).
- 확인: 말뭉치 전체(export HTML 21개 + 섹션 단독 export·라이브)에서 **UP1 꺼짐 = 462차 이전 출력과 문자열 동일**(개발 중 stash 비교), 438차 기준 off 비교(`scripts/check-v4-off.ts`) 통과. 회귀 `scripts/regression/robust-462.ts`.
- 롤백: `NEXT_PUBLIC_DESIGN_V4_UP1`을 지우거나 `off`로 두고 재배포(한 줄). ③④는 플래그가 없다 — 긴 입력의 줄바꿈 허용만 바뀌므로 필요하면 `lib/robust-462.ts`의 두 함수를 `false`로 돌려주게 하면 이전과 같다.
- 감사 표와 고르지 않은 항목: `docs/upgrade-backlog-462.md`.

### 9-1. UP1 확장 (463차) — 단조로움 탈피
같은 플래그(`NEXT_PUBLIC_DESIGN_V4_UP1=on`) 뒤에서만 켜진다. 측정·목표는 `docs/monotony-audit-463.md`, 지표 도구는 `scripts/variety-metrics-463.ts`(말뭉치 export 문자열만 읽음), 회귀는 `scripts/regression/variety-463.ts`.
- **새 변형 6개**(모두 기존 입력 필드만, 요건 미달이면 기존 레이아웃으로 폴백, 선택은 시드+mood 결정적·페이지당 같은 변형 ≤2·바로 앞과 같은 서명 금지):
  - `benefits.linelist` — 번호+제목+설명을 한 줄에 늘어놓은 목록(항목 3~6, 제목 ≤36자, 설명 ≤70자)
  - `story.pullband` — 인용문을 어두운 띠에 크게(왼쪽 정렬), 본문은 띠 아래(인용문 8~80자)
  - `spec.cards` — 값 먼저·라벨 아래의 색 면 카드 2열(행 2~6, 라벨 ≤20자, 값 ≤48자)
  - `steps.vtimeline` / `steps.bignum` / `steps.chipflow` — 사용 순서(`usage_steps`) 문장을 세로 타임라인 / 큰 숫자 카드 / 화살표로 이은 칩으로(원 섹션 종류는 `origin`으로 남겨 앵커 내비 유지, "라벨: 설명"이면 라벨을 굵게 나눠 보여 줌)
- **강조 띠** `statement.band`: 입력에 이미 있는 문장(브랜드 스토리 인용문 → 강조 박스 카드 제목 순, 8~48자, 수치 검사 `checkText` 통과)을 원문 그대로 크게 보여 주는 왼쪽 정렬 띠. 페이지당 ≤1, 높이 55% 근처, 히어로·접점·숨 고르기·구매 카드와 맞닿지 않고 같은 문장이 든 섹션 옆에는 두지 않음. 기존 규칙(`INFO_RUN_MAX`·`MAX_BREATHERS`·`TOUCH_AT`)이 먼저 놓이고 남는 경계에만 끼워 충돌하면 띠를 만들지 않는다.
- **면 교대**: ① 흰 면(임팩트 + 흰 바탕인 일반 섹션 종류)이 3개 이상 이어지면 바꿀 수 있는 임팩트 하나를 색 면으로 ② 숨 고르기 면이 색 면과 흰 면 사이에서 흰 면이 되면 따뜻한 중립 면으로.
- **하지 않음**: 밀도 교대·일반 제목 정렬 변주(렌더러 하드코딩), FAQ·비교·후기·인증 변형(인터랙션·정책·고지와 얽힘) — 사유는 감사 문서.
- 롤백: `NEXT_PUBLIC_DESIGN_V4_UP1`을 지우고(또는 `off`) 재배포하면 462차 끝 출력과 같다(말뭉치 export 21개·섹션 단독 export/라이브 문자열 비교로 확인).

### 9-2. UP1 464차 변경 — 강조 띠 쏠림 해소
- 강조 띠(`statement.*`): 463차에는 말뭉치 21개 중 18개 페이지에 같은 위치·같은 모양이었다. 464차: ① 시드로 약 60% 통과 × 후보 있는 페이지만(말뭉치 9/21) ② 위치는 높이의 45~65%를 시드로 ③ 형태 3가지(`band` 왼쪽 큰 글자 띠 / `quote` 가운데 짧은 인용 / `rule` 위아래 선) ④ 후보 문장은 브랜드 스토리 본문의 문장 → 강조 박스 카드 본문 → 카드 제목 → 스토리 인용문 순으로 모으고, 같은 페이지 다른 임팩트 섹션에 **한 글 노드 그대로** 있는 문장은 제외. 가운데 정렬 `quote`는 이웃이 가운데 정렬 쪽 섹션이면 `band`로 바꿔 정렬 연속을 늘리지 않는다.
- 밀도 교대(여백 32/48/64 선택): 시도했으나 여백 3연속이 줄지 않고 오히려 늘어(27→32곳) **되돌렸다**. 새 변형·띠의 기본 여백을 그대로 쓴다.
- 편집 모드: `applyDisplayRules`가 편집 중이면 v4 계획 앞에서 끝나므로(`lib/display-sections.ts` 편집 조기 반환) `usage_steps`는 UP1에서도 편집 중에는 원본 섹션 그대로다.
- 롤백: `NEXT_PUBLIC_DESIGN_V4_UP1`을 지우거나 `off`로 두고 재배포(한 줄). UP1 꺼짐 출력은 변하지 않는다.
