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

- 스크립트: `scripts/check-v4-off.ts`(export), `scripts/check-v4-off-live.tsx`(라이브), `scripts/_snap-iso.tmp.tsx`(섹션 단독).
- 매 차수 보고서의 "off diff 3종 0" 줄이 근거다(예: `review/449cha-report.md`). 450차도 같은 방식으로 7ae6336(449차 끝) 대비 정상 입력 0을 확인했다.
- 한계: 비교는 합성 픽스처 21종 + 저장 세션 6종 기준. 실제 운영 데이터는 미검증.

## 5. 알려진 한계·미검증

- 실사진·판매자 저장 세션은 PC에서만 확인할 수 있다(합성 사진은 단색·그라데이션 위주).
- 히어로 A 압축은 390폭 기준 글자 폭 어림이라 750폭 이상에서는 과하게 접힐 수 있다(미검증).
- 배너 3안은 결정 자료만 만들었고 기본값은 그대로다(`review/450-verify/banner-options/`).
- 큰 통계 숫자(40px 굵은 글자)는 3:1 기준으로 측정한다. 측정 도구의 오탐 가능성이 남아 있다.
- `next build`·실제 배포는 클라우드에서 더미 환경값으로만 확인했다.

## 6. 450차 라이브 쌍둥이 정리에서 생긴 off 차이

사진이 0장인 입력에서 라이브가 그리던 `<img src="">`를 v4일 때만 생략한다. 이전엔 이 입력에서 off 출력에도 영향이 있을 수 있어, 해당 코드는 v4 켬 조건 안에 두었다. 정확한 입력과 결과는 `review/450cha-report.md`에 적는다.

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

## 8. 규칙 요약

새 문구·수치를 만들지 않는다. 고지 문구·결제 코드·`cta_price` 구조·`data-pz-buy`·스티키 바·편집 UI·인터랙션은 바꾸지 않는다. 디자인 변경은 모두 v4 안이고 off 출력은 이전 차수와 같아야 한다. export에서는 `:has()`·container query·`text-wrap`·`mix-blend-mode`·`clip-path`·`mask`·`-webkit-text-stroke`를 쓰지 않는다. 글자 대비 4.5:1(큰 글자 3:1은 24px 이상 또는 18.66px 이상 굵은 글자).
