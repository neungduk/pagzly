# V5 거시 차별화 지도 (466차 Phase 0 — 원인 조사 + 코드 전에 적는 목표)

측정 도구: `scripts/variety-metrics-466.ts`(문자열 전용). 말뭉치 21 × (UP1 기준 + 아키타입 8종), 모두 export 문자열. 임시 스크립트는 scratchpad.

## 1. 왜 8종이 같은 페이지로 보이는가 (변형 선택)
`planV4`(layout-variants.ts)에서 변형은 `variantOrder(...)`의 순서 → **페이지 안에서 덜 쓴 것 먼저** → (앞 1/3 자리/낮은 강도 뒤) **강도 정렬**을 거친 뒤 `variantFits` 첫 통과로 정해진다. 아키타입 `prefer`는 `variantOrder` 안에서 맨 앞으로 오지만, 그 뒤의 `counts` 오름차순·`need` 강도 정렬이 순서를 다시 섞어 버린다. 그 결과 **아키타입이 아니라 변형 강도표가 승자를 정한다.**

말뭉치 21 × 8종에서 뽑힌 변형(계열별, 횟수):
| 계열 | UP1 | 8종 공통 현상 |
|---|---|---|
| story | linetime 4 · pullband 7 · quote 3 · editorial 4 | **8종 모두 pullband ×18 (100%)** — 강도 정렬이 이긴다 |
| touch | band 20 | 8종 모두 band 9 · ticket 6 · ledger 5 (**아키타입과 무관, 시드만**) |
| statement | rule 5 · quote 3 · band 1 | 8종 모두 rule 10 · band 6 · quote 4 (동일) |
| benefits | numcards 10 · zigzag 6 … | 8종 모두 zigzag 9~16이 지배, 새 변형은 0~4 |
| concern | tiles2 6 · stack 5 | 아키타입별로 갈리나 4종 안 (memo/deck/stack/tiles2) |
| spec | cards 12 · line 14 · grid 11 | 갈림은 있음(panel/tags) — 가장 큰 차이는 techsheet panel 18 · catalog grid 20 |
| phototext | overlap/caption/offset/arch/collage | 갈림 있음(7종) |
| faq | — | **chat ×15~17 (8종 모두)** — 강도 정렬 |
| hero | B9 A5 C4 D3 | **9개 조건 모두 같은 분포** — 히어로 선택(`selectHeroVariant`)은 아키타입을 모른다 |

→ 변형 확정 선호(Phase 2)는 `variantOrder`가 아니라 **그 뒤 정렬의 기준**을 바꿔야 한다. 히어로(Phase 3)는 `planHeroV2`에 아키타입 선호를 넘기는 입구가 없다.

## 2. 진한 면 출처 (본문 섹션 기준, 문자 수 비율)
측정(진한 요소 = 배경 휘도 < 0.18, 알파 <0.6 제외, 중첩은 한 번만): 평균 / 페이지 최악
| 조건 | 진한 면 평균 | 최악 | 히어로가 진한 페이지 |
|---|---|---|---|
| UP1 | 0.161 | 0.228 | 18/21 |
| editorial | 0.151 | 0.250 | 18/21 |
| catalog | 0.138 | 0.218 | 18/21 |
| softlife | 0.172 | 0.235 | 18/21 |
| impact | 0.148 | 0.224 | 18/21 |
| techsheet | 0.137 | 0.227 | 18/21 |
| narrative | 0.156 | 0.216 | 18/21 |
| luxe | 0.143 | 0.231 | 18/21 |
| pop | 0.174 | 0.250 | 18/21 |

진한 면의 **출처별 기여**(UP1, 말뭉치 합 — 한 줄이 한 종류 섹션이 만든 진한 문자 수 비중):
| 출처 | 함수·위치 | 아키타입이 바꿀 수 있나 |
|---|---|---|
| 일반 `highlight_box`/`checklist`의 `boldBlock`(큰 진한 면 + 안쪽 진한 카드) | `export-detail-html.ts` `bg = section.boldBlock ? boldBlockBg : sectionBg`(라이브 `DetailSectionRenderer`도 `section.boldBlock`) — **페이지당 1개**(`limitBoldBlocks`) | **가능**: 같은 필드를 표시 단계(`applyDisplayRules`)에서 V5일 때 `false`로 복사본 교체(두 렌더러가 같은 필드를 읽음). 신규 주입 지점 = `applyFaceStrategy`(V5 전용) |
| `illustration_banner` | 사진 위 어두운 스크림 + `deepFill` 바탕. 배너 스타일 기본값은 이번 차수 불변 | **안 바꿈**(지시: 배너 기본값 변경 금지). 지표에서는 사진이 덮는 면이라 **별도 열로 표기** |
| 임팩트 `note`·`illust-center`·`chipwall`·`bubbles`·`sizebars` | 임팩트 템플릿(`impact-templates.ts`)의 면 색 | 일부 가능: 면이 `invert`/`emphasis` 역할이면 `faceCycle`·`assignFaces`로 |
| v4 블록 `story.pullband` 등 반전 면 | `faceCycle`/`assignFaces`의 `emphasis`/`invert`/`grad*` | **가능**(faceCycle은 이미 `ctx.v5.surface`를 읽는다 — 3값 → 4전략으로 확장) |
| **히어로** | `hero-spec.ts` — A 풀블리드(#1B1B18 + 사진), B 컬러 필드(포화 면), C 다크 시네마, D 스플릿(흰·옅은 면), E 타이포(옅은 면) | **가능**: 변형 선택에 아키타입 선호(Phase 3) — D·E는 밝다 |

핵심: 어두운 면의 대부분은 (a) 히어로(18/21), (b) 사진 배너, (c) `boldBlock` 1개, (d) 반전/그라디언트 v4 면. 465차 `surface`는 v4 블록 `faceCycle` 3값만 바꿨고 (a)(c)는 건드리지 않았다.

## 3. 히어로 선택 경로
`planHeroV2`(hero-spec.ts) → `selectHeroVariant({hasPhoto, kind, confidence, archetype(436 레시피), mood, category})`: 사진 없음 E · 사람 사진 A · 종류 모름/신뢰 낮음 A · 뷰티 B(minimal-luxe D) · 패션 D · 전자 C(가전 D) · 식품 B · 리빙 D(반려 B). 입력은 사진 유무·종류(태그/역할)·신뢰도·카테고리·mood뿐 — **465차 V5 아키타입은 입력에 없다.** 첫 화면 필수 요소 규칙(390→844, 750→1000)·실패 폴백(`HERO_FAIL_CSS`, `onerror`로 `data-hero-fail`)·스크림은 변형 렌더(`heroV2Html`/`heroV3Html`) 안에 있어 **변형 선택만 바꾸면 그대로 따라온다**. 새 히어로 신설 없음.

## 4. 타이포 경로
제목 위계 3단·행간은 `design-tokens-v4`, 아이브로·키워드 강조는 `type-treatments`, 상한·keep-all·알약 어절은 `typo-v4`, 폰트 쌍은 `font-pairs`(V3 플래그). 465차 아키타입은 `titleAlign`/`eyebrow`/`number`만 쥐고 있고 크기 비율·굵기 범위는 없다. 가운데 정렬이 늘어난 원인은 `titleAlign:"center"`인 softlife·luxe·pop(센터 0.45·0.58·0.43)와 중앙 정렬 후처리 대상이 임팩트 전체에 걸린 것.

## 5. 빈 사진 면 (항목 4) — 분류: **오프라인 캡처 가짜 현상 + 큰 틀 설계 (결함 아님), 불확실 요소 있음**
- 말뭉치 `fx-skincare-serum`의 사진은 전부 로컬 `/qa-fixtures/ph/beauty/*.png`(480×601, 7~13KB: **거의 단색 + 단순 도형**)이다. `.invalid` 주소는 사진이 아니라 **인포 구간 배경 이미지**(`info-backdrop`: `linear-gradient(스크림), url(https://qa-fixtures.invalid/…)`)에만 있다(6/21 페이지, 각 3건) — 막히면 스크림만 남고 빈 틀이 생기지 않는다.
- 큰 틀 후보: `phototext.caption`(전폭 4/5 → 750폭에서 약 940px), `hero B`의 아치 사진(96% × 4/5.2 → 약 936px), `impact.asym2`(4/5). 단색에 가까운 합성 사진이 이 크기로 늘어나면 "거의 빈 연한 패널"로 보인다. 기준(UP1)과 8종 모두에 있는 이유와 일치한다(같은 섹션이므로).
- `photo-fallback`은 `onerror`/로드 후 판정으로 동작하는 방식이라 **파일이 있고 로드되면 정상 사진으로 취급**한다 — 단색 placeholder는 폴백 대상이 아니다.
- 불확실: 기획 담당 캡처의 정확한 요소는 이 환경에서 렌더하지 못해(캡처 금지) 확정하지 못했다. 집 PC 확인 한 줄은 `docs/pc-todo.md`에 적는다. 조치: Phase 5 참조.

## 6. 목표 (코드 전에 확정 — 나중에 바꾸지 않는다)
측정 정의: 본문 섹션(히어로 제외) 진한 면 비율 = `darkShare` 문자 수 비율. **사진 배너(`illustration-banner`)는 별도 열**로 보고(사진이 덮는 면), 아래 목표 비율은 배너를 뺀 값으로 판정한다. 히어로는 별도 지표.
| 면 전략 | 아키타입 | 본문 진한 면 비율 목표 |
|---|---|---|
| `lightOnly` | editorial · luxe · techsheet | 페이지당 ≤ 12% (평균·최악 모두), 히어로 밝음(D/E) |
| `tintAlt` | catalog · softlife · narrative | 페이지당 ≤ 12% (평균·최악 모두) |
| `blockAlt` | impact | 평균 25~45% |
| `colorCollide` | pop | 평균 30~55% |
서로 다른 구간 ≥ 3개(밝음 / blockAlt / colorCollide).

변형(Phase 2): 계열 benefits·concern·story·spec·phototext에서 8종이 쓰는 **서로 다른 변형 ≥ 5**(말뭉치 21 전체 합산 기준). 465차 미선택 5개(`benefits.rows2/iconlist`, `story.chapter/letter`, `spec.big3`)는 선호 + 요건 충족 입력에서 선택되는 사례를 말뭉치 또는 단위 렌더로 증명.

타이포·정렬(Phase 4): 중앙 정렬 비율 — 8종 각각 ≤ 0.40, 8종 평균 ≤ 0.33(UP1 0.334), 연속 최대 ≤ 4, 평탄 구간 합 — 각 ≤ 37(UP1 37).

쌍 차이(Phase 6): 아키타입 28쌍 각각 아래 7축 중 **3축 이상**에서 기준 이상 차이.
1. 진한 면 비율 차 ≥ 0.06 · 2. 가운데 정렬 비율 차 ≥ 0.10 · 3. 히어로 변형 분포 L1 거리 ≥ 0.3 · 4. 계열별 변형 집합 평균 자카드 거리 ≥ 0.5 · 5. 평균 반경 차 ≥ 3px · 6. 그림자 요소 비율 차 ≥ 0.10 · 7. 제목 굵기 평균 차 ≥ 30
안전: 대비 4.5:1(팔레트 21 × mood 7), 색상군 ≤ 3, export 크기 UP1 +25% 이내, 금지 CSS 없음, 새 문구 없음.
