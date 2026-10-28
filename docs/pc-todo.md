# 집 PC에서 나중에 할 일 (눈 검수 목록)

**전제**: 이미지 저장소 이전(`docs/migration-r2/README.md` 14단계)이 끝난 뒤에만 한다. 그 전에는 실사진·이미지 업로드·원격 이미지 로드 검증을 하지 않는다(`docs/phone-session-rules.md`).

## UP1 켜서 눈 검수할 항목 (462차)
`NEXT_PUBLIC_DESIGN_V4_UP1=on`으로 켜고 보며, **사진 자리는 placeholder 모드로 먼저** 본다(실사진 로드 없이 레이아웃만). 문제가 없으면 그다음에 실사진으로 한 번 본다.
1. 페르소나 줄(`target_persona`): 22자 넘는 문장이 320·360·390px 폭에서 4줄까지 잘림 없이 보이는지, 행 높이가 글을 넘치지 않는지(사진 있음/없음 모두).
2. 하이라이트 카드 4장(`highlight_box`, 사진이 있는 아이콘 목록 분기가 아닌 격자 분기): 750px 폭에서 2×2로 보이는지, 카드 글이 4열일 때보다 읽기 좋은지, 라이브와 export가 같은지.
3. UP1 꺼짐으로 되돌렸을 때 위 두 곳이 이전 모양인지(롤백 확인).
## UP1과 무관하게 긴 입력에서 확인할 항목
4. 비교 막대: 단위가 긴 경우(예: 문장형 단위) 값 칸이 라벨을 밀어내지 않고 줄바꿈되는지(320px).
5. 통계 막대: 값이 긴 문구인 경우 같은 확인(320px).
명령(이전 완료 후): `git pull origin cloud-work` → `npm ci` → `npx tsc --noEmit` → `npx tsx scripts/regression/run-all.ts` → 눈 검수.

## UP1 확장(463차) 눈 검수 목록 — 이전 완료 후에만, placeholder 모드부터
`NEXT_PUBLIC_DESIGN_V4_UP1=on`. 변형은 시드로 고르므로 상품·카테고리에 따라 안 나올 수 있다 — 말뭉치(`scripts/fixtures`)에서 나온 곳을 알려 준다.
| 변형 | 어느 입력에서 나오나 | 무엇을 볼까 |
|---|---|---|
| `benefits.linelist` | 퀵포인트/강조 박스 3~6개, 제목 ≤36자(fx-compare-tech, fx-fashion-dress-floral, fx-tier-rich-fashion-6p 등) | 번호·제목·설명이 한 줄로 정렬되는지, 설명이 길 때 아래 줄로 자연스럽게 내려가는지(320px), 위아래 선 |
| `story.pullband` | 브랜드 스토리에 인용문 8~80자(fx-food-snack, fx-inner-collagen, fx-tier-rich-tech-6p 등) | 어두운 띠 위 흰 글자 가독, 큰따옴표 장식 위치, 본문이 띠 아래에 붙는지 |
| `spec.cards` | 스펙 행 2~6개, 값 ≤48자·안내 문구 아닌 값(fx-food-snack, fx-skincare-serum, fx-tech-vacuum 등) | 2열 카드의 값 크기(8자 넘으면 작은 글), 라벨 가독, 카드 두 색 번갈이 |
| `steps.vtimeline` | 사용 순서 2~6개(대부분의 뷰티·식품 픽스처) | 번호 원·세로 선 정렬, "라벨: 설명"이 굵은 라벨+설명으로 나뉘는지, 앵커(사용법) 이동 |
| `steps.bignum` / `steps.chipflow` | 사용 순서가 2~6개 / 2~5개이고 한 문장 ≤60자 / ≤32자(fx-compare-tech 등 일부) | 큰 숫자 카드 2열, 칩 사이 화살표 줄바꿈 |
| `statement.band` | 거의 모든 페이지(높이 55% 근처) | 문장이 위 섹션과 겹쳐 중복처럼 보이지 않는지, 왼쪽 세로 띠, 28px 글자 줄바꿈 |
| 면 교대 | 흰 면이 길게 이어지던 페이지 | 숨 고르기 면의 중립 면 색이 어색하지 않은지, 색 면이 3종을 넘지 않는지(446차 색 예산) |
UP1을 끄고 재배포하면 모두 사라지고 이전 모양으로 돌아오는지도 확인한다.

## UP1 464차 눈 검수 추가 항목 — 이전 완료 후에만, placeholder 모드부터
| 항목 | 무엇을 볼까 |
|---|---|
| 강조 띠(`band`/`quote`/`rule`) | 같은 문장이 위쪽 본문(스토리·강조 박스)에 비슷하게 있어 중복처럼 보이지 않는지(글 노드 단위로만 제외하므로 긴 본문 문단 속 문장은 겹칠 수 있다), 페이지마다 위치·모양이 다양한지(말뭉치 21개 중 9개 페이지에 생김), `quote`가 가운데 정렬 구간에서 어색하지 않은지 |
| 흰·색·중립 면 조합 | 숨 고르기 면이 색 면과 흰 면 사이에서 중립 면(bgB)이 될 때 색이 3종을 넘는 느낌이 없는지(446차 색 예산, 브라우저 측정 `scripts/color-budget.ts`는 집 PC에서) |
| 편집 모드의 사용 순서 | 편집을 켜면 사용 순서가 원본 편집 가능한 섹션으로 돌아오고, 편집을 끄면 `steps.*` 변형으로 바뀌는지(코드상 편집 중에는 v4 계획을 건너뜀) |
| 새 변형 320px 줄바꿈 | `linelist`·`pullband`·`spec.cards`·`steps.*`에서 긴 한글·숫자 혼합이 넘치지 않는지 |

## V5 눈 검수 (465차) — 이전(R2) 완료 후에만, placeholder 모드부터
**전제**: `NEXT_PUBLIC_DESIGN_V5=on`은 프리뷰/로컬에서만 켠다(프로덕션 기본 꺼짐). 먼저 갤러리로 본다.
1. `npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum` (그리고 `fx-tech-keyboard`·`fx-food-snack`·`fx-fashion-dress-floral`) → `review/465-gallery/index.html`을 연다. 사진은 로컬 placeholder다. 아키타입 8종 + 기준(UP1)을 나란히 본다.
2. 보는 항목: ① 8종이 서로 확연히 다르게 보이는지(반경·선·그림자·종이색·제목 정렬·장식) ② 글자 가독성·넘침·잘림(320/360/390/750폭) ③ 규정 문구·구매 카드·주의 박스가 그대로인지 ④ 아키타입이 상품 성격과 맞는지(카테고리 적합표 조정 필요?) ⑤ 장식(스티커·눈금·척추·빛)이 글을 가리지 않는지 ⑥ 마무리 띠·가운데 띠의 문장이 위쪽 본문과 중복처럼 보이지 않는지 ⑦ 흰·색·중립 면 조합이 3계열을 넘는 느낌이 없는지(`scripts/color-budget.ts` 실측) ⑧ 새 변형의 극단 입력(긴 질문·긴 값)
3. 새 변형별(어느 입력에서 나오는지는 `docs/v5-overview.md` 표): `faq.*` 5종(번호·2열·질문 띠·대화·탭), `proof.*` 4종(신뢰 근거 박스가 있는 상품만), `spec.panel/tags/big3`, `phototext.stack/polaroid/dframe`(사진 없음 폴백 포함 — 사진 URL을 깨뜨려 빈 틀이 흉하지 않은지), `concern.memo/deck`, `benefits.stackbig/rows2/iconlist`, `story.chapter/letter`, `touch.ticket/ledger`.
4. 실사진은 마지막에 **한 번만**(egress 주의): 마음에 드는 아키타입 1~2개로.
5. 편집 모드: 켜면 V5가 적용되지 않고(원본 섹션), 끄면 다시 V5가 보이는지. 라이브↔export 같은 모양인지, PNG 다운로드 경로(`html-to-image`)에서 새 장식·프레임이 깨지지 않는지.
6. 롤백 확인: `NEXT_PUBLIC_DESIGN_V5` 제거 후 재배포하면 464차 모양으로 돌아오는지.

## 빈 사진 면 확인 (466차 Phase 5 — 원인 "불확실, 오프라인 캡처 가짜 현상 가능성 높음")
기획 담당 캡처에서 구매 가격 스트립 아래 약 1000px의 빈 연한 패널이 기준(UP1)과 8종 모두에 있었다. 코드상 후보는 ① 합성 placeholder 사진(480×601, 거의 단색)이 전폭 4/5 틀(`phototext.caption`, 750폭에서 약 940px)·히어로 아치 사진(약 936px)으로 늘어난 것 ② 막힌 `*.invalid` 인포 배경(스크림만 남음). `photo-fallback`은 파일이 있고 로드되면 정상 사진으로 취급하므로 단색 placeholder는 폴백 대상이 아니다.
- 집 PC에서 한 줄: `npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum --localize-blocked` 후 `review/465-gallery/index.html`을 750폭으로 열어, 빈 패널이 **실사진(또는 `docs`의 ph2 placeholder)에서도** 같은 자리에 같은 크기로 생기는지 본다. 생기면 어떤 섹션(`data-pz-v4`/클래스)인지 개발자 도구로 확인해 알려 주세요(실제 결함이면 V5 켜짐 한정으로 비율 예약 상한을 두는 수정 후보: 전폭 4/5 틀에 `max-height`).
- `--localize-blocked`는 갤러리 파일만 바꾼다(말뭉치·앱 출력 불변).

## V5 눈 검수 추가 항목 (466차 — 8종이 서로 구별되는가)
기획 담당이 465차에 한 방식 그대로 `fx-skincare-serum`을 기준(UP1) + 8종으로 750폭 캡처해 나란히 놓고 본다(`npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum --localize-blocked`).
1. **밝은/진한 면 비율**: editorial·luxe·techsheet(밝은 종이)·catalog·softlife·narrative(옅은 틴트)에는 큰 진한 면이 없어야 하고, impact(진한 면 교대, ~30%)·pop(포인트·진한 면 충돌, ~33%)은 진한 면이 눈에 띄게 많아야 한다. 진한 덩어리가 너무 많아 답답하지 않은가(428 "명암 반전 ≤6" 예산).
2. **히어로**: editorial·techsheet=D 밝은 스플릿, luxe=E 타이포(작은 원형 사진이 약하지 않은가), catalog·softlife·pop=B, impact=C, narrative=A 전폭 사진. 사진 종류에 따라 B·C가 안 되는 페이지는 A/D로 폴백된다.
3. **장점·스토리 모양**: 같은 장점 구간이 8종에서 서로 다른 모양인가(stackbig 큰 번호 / rows2 / zigzag / bento / iconstrip …), 스토리(editorial·chapter·letter·pullband·quote·linetime).
4. **제목 굵기**: luxe 400(가벼움) ~ impact·pop·techsheet 900(굵음). 400·500 제목이 큰 글자에서 읽히는가.
5. **정렬**: 가운데 성격(softlife·luxe·pop)은 첫 구간 한 블록만 가운데, 나머지 왼쪽. 어색하지 않은가.
6. **진한 면 위 글자**: 흰 글자·카드·아이콘·번호가 진한 면에서 모두 읽히는가(대비 감사는 통과, 실제 눈으로).
7. 위반 시 롤백: 아키타입 고정(`NEXT_PUBLIC_V5_ARCHETYPE`) 또는 플래그 끄기.

## V5 다이나믹 눈 검수 (467차)
갤러리: `npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum --ph2 --localize-blocked` (사진 대용품 ph2). 750폭과 320폭에서 본다.
1. 겹침·기울임·이음새·티커·큰 배경 글자가 **과하지 않은가**, 글 가독성을 해치지 않는가(장식은 글 뒤).
2. 가로 넘침 없음(320/750), 가격·규정 문구·구매 버튼 주변이 가려지지 않음.
3. 이음새 도형 경계에서 색이 어긋나 보이지 않는가(자기 색 도형이 위 섹션 아래 여백으로 솟는 방식 — 위 섹션 배경이 단색이 아닐 때).
4. 진한 면(impact·pop)에서 장식(큰 글자·판)이 읽히는 글자 대비를 해치지 않는가.
5. 사진 틀 모서리 변주(잎·반대 잎·위만·아래만)가 어색한 비율에서 어울리는가.
6. PNG 다운로드 경로(`html-to-image`)에서 기울임·이음새·질감이 같은 모양인가.
7. 위반 시 롤백: 플래그 끄기 / 아키타입 고정.

## V5 다이나믹 눈 검수 (468차)
갤러리: `npx tsx scripts/v5-gallery-465.ts --compare=fx-skincare-serum --ph2 --localize-blocked` · 빈 틀 확인 `--photos=none|partial`. 320/390/750폭에서 본다.
1. **읽히는 제목 크기**: 섹션 제목이 아키타입 성격대로 커졌는가(impact·pop 38~50, editorial 40, luxe 32), 긴 제목·긴 영단어가 가로로 넘치거나 어색하게 끊기지 않는가.
2. **배너**: editorial·luxe·techsheet·catalog = 사진 아래 띠(split), softlife·narrative = 카드만(card-only), impact·pop = 전면 스크림. 한 페이지에 배너가 둘이면 서로 다른 값. 사진이 덮이지 않고 글이 읽히는가.
3. **구도**: 풀블리드 사진 + 걸친 카드(phototext.bleed), 58/42 엇갈림(split), 엇갈린 2열 카드(benefits.stagger), 좌우로 엇갈리는 카드(concern.offset), 튀어나온 인용(story.pullout), 번호 칸/글 칸(story.chapter), 사진 덱(gallery.deck). 가로 넘침·겹쳐서 글이 가려지는 곳 없음.
4. **들여 쓰기**: 이웃 섹션이 번갈아 한쪽으로 들여 쓰이는 것이 어색하지 않은가(가운데 정렬 섹션 포함).
5. **걸침**: 이음새가 걸침으로 바뀐 경계에서 위 섹션 내용이 가려지지 않는가.
6. **빈 사진 틀**: 사진이 안 불러올 때(`--photos=partial`은 문자열 단계, 실제 실패는 네트워크 차단으로) 틀이 280px 이하에서 줄무늬가 보이고 고장난 페이지처럼 보이지 않는가.
7. **일반 섹션 시트 모서리**: 강도 4·5 일반 섹션 윗모서리·윗그림자가 구매 카드·고지를 건드리지 않는가.
8. FAQ 접힘 동작(변경 없음), PNG 다운로드가 라이브와 같은 모양인가.
9. 위반 시 롤백: 플래그 끄기 / 아키타입 고정.

## V5 남은 평평한 덩어리 눈 검수 (469차)
갤러리 권장 세트: `npx tsx scripts/v5-gallery-465.ts --only=fx-skincare-serum,fx-tech-keyboard,fx-fashion-dress-floral,fx-food-snack,fx-living-storage --ph2 --localize-blocked` (산출물은 git 무시 폴더). 469차부터 갤러리 HTML은 `loading="lazy"`를 `eager`로 바꿔 쓴다 — 전체 페이지 캡처에서 사진이 안 불러와져 "빈 틀"로 보이는 가짜 현상 방지(`--keep-lazy`로 끔). 앱 출력은 그대로.
1. **정보 구간(points 등)**: editorial·catalog·luxe·techsheet는 밝은 틴트 스크림 + 흰 카드 + 잉크 글자, softlife·narrative는 옅은 스크림(사진이 더 비침), impact·pop은 기존 진한 면. 카드 글자 읽힘, 강조 카드(진한 면) 대비.
2. **추천 대상**: 고민(concern) 변형(memo·deck·offset·tiles2·bubbles)으로 바뀐 페이지 8종에서 구조가 갈리는가, 문장이 그대로인가. 사진 띠가 있는 추천 대상은 기존 모양 유지.
3. **상품 정보 표**: ledger(editorial·luxe·techsheet)/stack(그 외) 목록이 읽기 쉬운가, 부피 비교 도식·썸네일·"확인 필요 항목" 행이 어색하지 않은가. 크기표·배송 표는 변경 없음.
4. **단계 카드(step_card)**: 사진이 있는 zigzag 모양 + STEP 라벨.
5. **본문 글자**: 15~16px가 큰 제목 아래에서 균형이 맞는가(너무 크지 않은가), 고지·주의·배송 블록 글자는 그대로인가.
6. **화면 장악 장면**: 강도 5=3개·4=2개·3=1개 안팎. 한 화면을 쓰는 큰 문장/큰 숫자/사진+큰 제목이 과하지 않은지, 320폭에서 큰 글자 줄바꿈·잘림, 가격·규정·구매 카드를 가리지 않는지.
7. FAQ 접힘·색상 옵션 선택 동작(변경 없음), 320/390/750 가로 넘침, PNG 다운로드가 라이브와 같은 모양인지.
8. 위반 시 롤백: 플래그 끄기 / 아키타입 고정.

