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
