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

## 7. Phase 1 결과 — 면 전략 (정의 정정 포함)
**지표 정의 정정(코드 변경 전에 baseline 재측정)**: 처음 측정은 칩·점·막대 같은 작은 `span`도 "진한 면"으로 세어(진한 문자 수 비율 잡음) UP1이 0.161로 나왔다. 면으로 읽히는 요소(`section`·`div`, 한 변 ≤120px 고정 제외)만 세도록 `variety-metrics-466.ts`를 정정하자 UP1은 **0.072**(사진 배너 0.019 별도)가 됐다. 목표 수치(§6)는 그대로 두었다 — 밝은 쪽은 이미 기준선이 목표 안이었고(평균), 최악 페이지(0.130)만 12%를 넘었다.

구현: `lib/face-strategy-v5.ts` — 전략 4종·면 순환·`darkPaletteOf`(어두운 면용 의미값 뒤집기)·`invertFixHtml`(렌더러 상수 흰색 보정)·`lightenBoldBlocks`(일반 섹션 boldBlock 밝히기). 주입: ① `planV4`가 전략 면 순환 사용(진한 면 상한: blockAlt 5·colorCollide 6, 최대 2개 연속, 일반 진한 블록·배너와 불접촉) ② `v4Html`이 face=invert면 어두운 팔레트 ③ `display-sections`가 밝은 전략에서 boldBlock 복사본을 밝게 ④ 띠(statement)가 진한 전략에서 진한 면. `scripts/contrast-audit-466.ts`(글자 노드 대비 감사)로 **모든 v4 변형 × 진한 면 × 팔레트 21 × mood**에서 위반 0을 확인.

| 아키타입 | 전략 | 진한 면 평균 | 최악 | 목표 | 판정 |
|---|---|---|---|---|---|
| editorial | lightOnly | 0.025 | 0.071 | ≤0.12 | ○ |
| luxe | lightOnly | 0.026 | 0.072 | ≤0.12 | ○ |
| techsheet | lightOnly | 0.024 | 0.068 | ≤0.12 | ○ |
| catalog | tintAlt | 0.022 | 0.065 | ≤0.12 | ○ |
| softlife | tintAlt | 0.027 | 0.059 | ≤0.12 | ○ |
| narrative | tintAlt | 0.024 | 0.072 | ≤0.12 | ○ |
| impact | blockAlt | 0.285 | 0.407 | 0.25~0.45 | ○ |
| pop | colorCollide | 0.333 | 0.468 | 0.30~0.55 | ○ |
기준선(UP1) 평균 0.072. 사진 배너 바탕은 모든 조건 0.016~0.019로 별도. 히어로는 아직 18/21이 진한 면(Phase 3).
**부작용 공개**: 진한 전략 페이지의 진한 덩어리(연속 섹션) 평균 5.2~5.6개, 최대 8 — 428차 "명암 반전 ≤6" 예산(DOM 지표)을 넘길 수 있다. 이 예산은 브라우저 지표라 여기서 검증하지 못했고, 지시서가 진한 면 비율 25~55%를 명시했으므로 그 목표를 우선했다. 눈 검수 항목에 적는다.

## 8. Phase 2 결과 — 변형 확정 선호
원인(§1): `planV4`의 정렬이 "강도 요구 → 덜 쓴 것 → 순서"라 아키타입 선호가 뒤로 밀렸다. 바꾼 것:
1. **정렬 기준**: 선호 목록(1순위·2순위)에 있는 변형이 먼저, 그 안에서는 앞 섹션이 낮은 강도(≤2)일 때만 강도 ≥3 우선 → 순위. 요건(`variantFits`)·상한(`MAX_SAME_VARIANT`)·이웃 같은 서명 금지는 그대로 뒤에서 건다.
2. **처음 1/3 높음 요건은 계획 마지막에서 최소 개입**(`boostEarlyHighV5`, 최종 순서·`planStoryboard`와 같은 기준): 부족할 때만 그 구간 블록 하나를 강한 변형으로 — 1차 선호 목록 안, 2차 목록 밖(장점·스토리 제외), 3차 장점·스토리 포함.
3. 접점(touch)·강조 띠(statement) 변형도 아키타입 선호로(접점 1순위 약 60%/2순위 40%, 띠 형태 선호 목록).
4. 장점 `stackbig`은 번호가 주인공이라 번호를 한 단계 키우고(`numberMark(...,big)`, 로마자 52px/굵은 숫자 56px) 강도 4로 올렸다(큰 번호가 실제로 눈을 끈다).
5. 접점·띠 외 `ArchetypeTokens.prefer`를 8종 모두 새로 확정(계열별 1·2순위; 2순위는 낮은 강도 뒤에서 쓰도록 강도 ≥3).

말뭉치 21 × 8종에서 계열별로 실제 쓰인 서로 다른 변형(합집합): benefits 7 · concern 6(말풍선·체크 행 포함) · story 6 · spec 6 · phototext 7 · faq 5 (목표 ≥5 ○). 465차에는 story가 8종 모두 `pullband` 100%, faq가 8종 모두 `chat`이었다.
아키타입별 1·2위 선택(말뭉치 횟수):
| 아키타입 | benefits | concern | story | spec | phototext | faq | touch | statement |
|---|---|---|---|---|---|---|---|---|
| UP1 | numcards10/zigzag6 | tiles2 6/stack5 | pullband7/linetime4 | line14/cards12 | overlap10/caption8 | - | band20 | rule5/quote3 |
| editorial | stackbig20 | memo19 | editorial18 | line34 | dframe26/offset7 | chat15/numlist6 | ledger13/band7 | rule11/quote7 |
| catalog | numcards17/stackbig3 | tiles2 19 | chapter17/pullband1 | grid24/line9 | stack26/caption7 | chat15/twocol6 | ticket13/band7 | band11/rule9 |
| softlife | zigzag10/iconlist7 | bubbles19 | letter15/quote3 | cards21/line9 | arch26/polaroid7 | chat21 | ticket13/band7 | band12/quote8 |
| impact | stackbig13/bento7 | deck19 | pullband18 | grid15/line14 | offset26/stack7 | tabs21 | band13/ticket7 | band11/rule9 |
| techsheet | iconlist7/stackbig6 | checkrows17/deck2 | chapter13/linetime5 | panel26/line8 | caption26/dframe7 | chat15/twocol6 | ledger13/ticket7 | rule11/band9 |
| narrative | zigzag16/stackbig3 | stack19 | letter15/chapter3 | grid15/line14 | overlap26/stack7 | chat15/numlist6 | ledger13/band7 | rule9/quote8 |
| luxe | numcards10/iconstrip7 | tiles2 19 | quote17/pullband1 | line34 | arch26/dframe7 | chat15/qband6 | ledger13/band7 | rule11/quote6 |
| pop | numcards17/stackbig3 | bubbles19 | quote17/pullband1 | grid15/line14 | polaroid26/offset7 | chat21 | ticket13/band7 | band13/quote7 |
(숫자 = 말뭉치 21 합산 등장 횟수. faq `chat`이 남은 것은 FAQ가 페이지 끝의 낮은 강도 구간 뒤에 놓여 "낮은 강도 3연속 금지" 규칙이 강도 3 이상을 먼저 고르기 때문.)

**465차에 한 번도 안 뽑힌 5개**: `benefits.iconlist`·`story.chapter`·`story.letter`는 말뭉치에서 선택됨. `benefits.rows2`·`spec.big3`는 말뭉치 입력이 요건(퀵포인트 4~6개·짧은 값 3행 이하)을 못 채워 말뭉치에서는 여전히 안 뽑히고, **합성 입력으로 계획기를 직접 호출하는 회귀**에서 선호 아키타입(catalog→rows2, impact→big3)이 요건 충족 시 실제로 뽑힘을 확인한다. 요건은 완화하지 않았다. (참고: 표시 예산이 퀵포인트를 3개로 줄여 rows2는 사실상 하이라이트 박스 4장 또는 예산 밖 입력에서만 나온다.)

스토리보드 영향(말뭉치 21 합계, UP1 → V5 8종): 낮음 3연속 86 → 27~64(465차 editorial 34), 처음 1/3 높음 부족 3 → 3(동률, `boostEarlyHighV5` 덕분 — 보정 없이는 +1), 마무리 직전 높음 없음 21 → 10. impact의 낮음 3연속이 64로 높은 것은 페이지 끝 정보 꼬리(note·breather·spec.line·faq)가 원인이며 UP1보다는 낮다.

## 9. Phase 3 결과 — 히어로를 아키타입에 묶기
입구: `planHeroV2`가 선택 직후 `pickHeroV5(아키타입 히어로 선호, {사진 유무, 종류, 신뢰도}, 기존 선택)`을 거친다(`display-sections`가 V5 토큰이 있을 때만 `v5Hero`를 넘김 — 꺼짐·편집 모드면 기존 그대로). **기존 히어로 A~E 안에서만** 고르고 새 히어로·새 문구는 없다. 요건: A·D·E는 사진만 있으면 됨, B·C는 제품 단독 컷(신뢰도 ≥ 0.45), 요건 불충족이면 기존 `selectHeroVariant` 결과(폴백), 사진 없음은 그대로 E. 첫 화면 필수 요소 규칙·사진 실패 폴백(`data-hero-fail`)·스크림은 변형 렌더 안에 있어 그대로 따라온다.
| 아키타입 | 면 전략 | 히어로 선호 | 말뭉치 21 분포 | 진한 히어로 |
|---|---|---|---|---|
| editorial | lightOnly | D, A | D 21 | 0 |
| catalog | tintAlt | D, B | D 21 | 0 |
| softlife | tintAlt | B, D | B 16 · D 5 | 15 |
| impact | blockAlt | C, B, A | C 16 · A 5 | 21 |
| techsheet | lightOnly | D | D 21 | 0 |
| narrative | tintAlt | A, D | A 21 | 21(전폭 사진, 사진 아래 어두운 바탕) |
| luxe | lightOnly | E, D | E 21 | 0 |
| pop | colorCollide | B, C | B 16 · A 5(사람 사진은 B·C 요건 밖 → A) | 20 |
| (UP1 기준) | - | 기존 선택 | B 9 · A 5 · C 4 · D 3 | 18 |
lightOnly 3종은 21페이지 모두 밝은 히어로(목표 "lightOnly면 히어로도 밝은 면" ○). 8종이 쓴 히어로 변형 5종(A~E). 한계: lightOnly·tintAlt 중 4종(editorial·catalog·techsheet 외 luxe는 E)이 D를 공유한다 — 새 히어로 신설이 금지라 D 하나로는 이 이상 갈리지 않는다(나머지 축은 면·변형·정렬로 갈림).

## 10. Phase 4 결과 — 타이포·정렬
**정렬**: 가운데 성격(softlife·luxe·pop)이 모든 블록 제목을 가운데로 만들면 중앙 정렬 비율이 0.43~0.58이었다. 원인 분해(말뭉치 UP1): 가운데 정렬은 대부분 **일반 섹션**(`plain` 60, 구매 카드 20, 텍스트 전용 15, 사진 배너 15, 갤러리 9, 인포 8, 페르소나 5 …, 전체의 약 27%)이고 V5가 바꿀 수 있는 임팩트·v4 블록은 일부뿐이다. 그래서 목표(평균 ≤ 0.33)를 맞추려면 가운데 성격도 블록 대부분을 왼쪽으로 둬야 한다. 구현:
- `lib/align-v5.ts planAlignV5`: 가운데 성격은 페이지당 `centerBudget`(1)개 블록만 가운데 제목(첫 구간 시선 블록 — 가운데 이웃에서 떨어진 곳), 나머지 v4 블록은 왼쪽(`axAlign`), 섹션 16개 미만의 짧은 페이지는 0개. `applyArchetypeHtml`이 `axAlign`을 읽는다.
- 본래 가운데인 변형을 가운데 성격의 선호에서 뺐다(`phototext.arch`·`story.quote`·`statement.quote`·`spec.strip`) / `phototext.polaroid` 캡션은 왼쪽으로(렌더러 수정).
- **제목 타이포**(`typographyV5`, `tierHeadingWeights` 이후): 22~40px 제목급 요소에만 굵기·자간·크기 배율. 새 폰트 없음(로드된 굵기 400·500·700·900).
| 아키타입 | 정렬 | 굵기/자간/크기 | 중앙 정렬 비율 | 연속 | 평탄 구간 합 | 제목 굵기 평균 |
|---|---|---|---|---|---|---|
| (UP1) | - | - | 0.334 | 4 | 37 | 841 |
| editorial | 왼쪽 | 500 / -0.01 / ×1.04 | 0.311 | 3 | 69 | 615 |
| catalog | 왼쪽 | 700 / -0.02 / ×0.96 | 0.312 | 3 | 71 | 726 |
| softlife | 가운데 1블록 | 700 / -0.03 / ×1 | 0.343 | 4 | 66 | 704 |
| impact | 왼쪽 | 900 / -0.045 / ×1.1 | 0.319 | 3 | 48 | 895 |
| techsheet | 왼쪽 | 500 / 0 / ×0.94 | 0.311 | 3 | 52 | 565 |
| narrative | 왼쪽 | 700 / -0.02 / ×1.04 | 0.318 | 3 | 66 | 762 |
| luxe | 가운데 1블록 | 400 / +0.02 / ×1 | 0.342 | 4 | 65 | 534 |
| pop | 가운데 1블록 | 900 / -0.03 / ×1.08 | 0.342 | 4 | 63 | 895 |
8종 평균 중앙 정렬 비율 **0.325**(목표 ≤ 0.33 ○), 각 ≤ 0.40 ○, 연속 ≤ 4 ○. 465차(0.42~0.58, 연속 5) 대비 개선.
**평탄 구간은 목표(각 ≤ 37)에 못 미쳤다(48~71)**. 시도한 것: ① 변형 밀도 등급 규칙 ② 변형 평균 길이 표로 앞 두 블록과 변동계수 0.2 미만 3연속 회피 ③ 최종 순서에서 실제 마크업 길이(`impactHtml`)를 재어 평탄 3연속의 변형 교체 — 모두 효과가 없거나(평탄 구간이 줄지 않거나 일부 아키타입은 오히려 늘어) 복잡도만 늘어 **되돌렸다**. 원인: 평탄 구간은 연속 3개 섹션 마크업 길이의 변동계수 < 0.15인 곳의 수인데, v4 변형 대부분이 마크업 2~4천 자에 모여 있고(표: 문서 §8 부근) 아키타입 선호가 같은 계열을 일관되게 고르므로 크기가 비슷한 블록이 이어지기 쉽다. 또 평탄 3연속의 약 절반은 일반 섹션·구매 카드가 끼어 있어 V5가 길이를 바꿀 수 없다(위 `plain`·`textonly`·`gallery`·`id.info`). 길이는 실제 높이가 아니라 대리 지표다. 다음 차수 제안: 평탄 구간 지표를 실제 높이 추정(변형별 높이)으로 바꾸고, 짧은 블록(띠·숨 고르기)을 평탄 3연속 사이에 넣는 규칙을 별도 설계. 회귀는 평탄 구간을 "목표"가 아닌 가드(≤ 80)로만 걸었다.

## 11. Phase 5 결과 — 빈 사진 면
분류(§5): **오프라인 캡처 가짜 현상 가능성이 높으나 정확한 요소는 불확실**(캡처 금지라 이 환경에서 확정 불가). 근거: 말뭉치 사진은 거의 단색 합성 placeholder이고, 전폭 4/5 사진 틀(`phototext.caption`)·히어로 아치 사진이 750폭에서 약 940px로 늘어나며, `*.invalid` 인포 배경은 막히면 스크린만 남는다. `photo-fallback`은 로드된 파일을 정상 사진으로 본다. 말뭉치 21 중 `.invalid` 배경이 있는 페이지 6개, 전폭 4/5 틀이 있는 페이지는 `phototext.caption`/히어로 B 보유 페이지 전부.
조치(실제 결함이 확정되지 않았으므로 앱 출력은 바꾸지 않았다 — 출력 잠금 유지): ① 갤러리 도구에 `--localize-blocked`(막힌 `.invalid` 주소를 같은 페이지 카테고리의 로컬 placeholder 사진으로, 갤러리 파일만) ② `docs/pc-todo.md`에 집 PC 확인 한 줄과 실제 결함일 때의 수정 후보(V5 켜짐 한정 전폭 4/5 틀 `max-height`) ③ 467차 지시서의 "검수용 placeholder를 사진처럼 보이게(ph2)"가 이 현상의 근본 대응이다.
