# 470차 보고서 — "대격변": 페이지 골격을 아키타입마다 다르게

## 1. 목표 대비 실측 (목표는 `review/470-targets.md`에 코드 전 기재)
| # | 지표 | 기준선(469차 끝) | 470차 실측 | 목표 | 판정 |
|---|---|---|---|---|---|
| A1 | 아키타입 28쌍의 블록 계열 순서 시그니처 불일치(이동 가능 5개+ 페이지 12개) | 미정의(순서 공통) | 평균 4.53, 최소 쌍 catalog-pop 3.08 | 모든 쌍 ≥ 3 | ○ |
| A2 | 하드 제약 위반(히어로 첫째, 비이동 자리·종류 불변, 블록 집합 불변) | – | 0 | 0 | ○ |
| B1 | 섹션 15+ 페이지 장면 달성률(5:≥3 / 4:≥2 / 3:≥1) | 83~100% | 100% (전 아키타입) | 100% | ○ |
| B2 | 장면/페이지 평균 5 / 4 / 3 | 2.62 / 1.95 / 1.0 | 2.90 / 2.10 / 1.24~1.43 | ≥2.8 / ≥2.0 / ≥1.0 | ○ |
| B3 | 이웃 장면 구도(sceneAt) 교대 위반 | – | 0 | 0 | ○ |
| C1 | 섹션 제목 최대 크기(강도 5/4/3) | 34~50px | 56 / 48 / 44px (상한 72) | ≥56 / ≥48 / ≥44 | ○ |
| C2 | 경계 도형 페이지당 ≥1, 클립 없는 도형 | 0 | 1.86/페이지, 21/21 페이지, 클립 없음 0 | ≥1 / 0 | ○ |
| D1 | 콜아웃 변환 가능분 100%, 라벨은 입력 주석만 | 0 | 합성 페이지에서 변환·라벨 보존·조건 미달 폴백 확인(회귀). 말뭉치 10개 annotated 섹션은 표시 규칙이 이미 text_only로 바꿔 V5에 도달하지 않음 | 변환 가능분 100% | △ |
| E1 | 일반 섹션 새 V5 변형 5종 | 0 | 후기 카드·색상 칩(44px) CSS 2종. spec 게이지·checklist 2열·comparison 분할은 미착수 | 가능한 것 전부 | △ |
| F1 | 평탄 구간 합계(21페이지) | 44~62 | softlife 39 · techsheet/luxe 46 · catalog 48 · pop 55 · editorial/impact 57 · narrative 59 (UP1 37) | ≤ 37 | × |
| F2 | 연속 3개 단일 구간/페이지 | 0.90~1.14 | 0.38~0.48 (impact 0.62) | ≤ 0.5 | impact만 × |
| S1 | export 크기 최대 | 133.3% | 135.2% (fx-tier-normal-fashion-3p/catalog) | ≤ 140% | ○ |
| S2 | 출력 잠금 | diff 0 | diff 0 (V5 off 469차 바이트 동일, V4 off 4a/4b/4c) | diff 0 | ○ |
| S3 | 가로 넘침 위험 | 0 | 0 (회귀: 고정 폭, 경계 도형 overflow-x:clip, 음수 마진 ≤24) | 0 | ○ |

## 2. 한 일
- **A 레시피** `lib/page-recipe-v5.ts`: 이동 가능 계열 7종(benefits·concern·story·phototext·proof·stats·gallery)의 순환표를 아키타입마다 다르게 정해(코퍼스에서 쌍 불일치가 최대가 되도록 탐색한 상수) 블록을 그 순서로 다시 늘어놓는다. 자리(index)는 그대로라 접점·고지·구매 카드·히어로 위치는 불변, 앞 1자리(한눈에 보기)도 고정. 이어서 `derunV5`가 최종 순서의 "높음 3연속"을 줄인다(레시피로 18→38이던 것을 12로).
- **B 장면** `planScenesV5` 확장: 후보에 benefits·proof·concern(첫 항목 제목이 큰 글자, 나머지 번호 줄)·gallery(제목 + 사진 덱)를 추가, 개수 우선 조합 탐색(간격 ≥3), 아키타입별 위치 리듬(`SCENE_AT_BY_ARCHETYPE`), 장면마다 좌/우 치우침 교대(`sceneAt`). 입력이 적은 짧은 페이지(섹션 12개 이하)는 한눈에 보기 블록도 후보. 장면 글자는 36px 이상·min-height 640.
- **C** 제목 토큰 44~56px(display 50~64), 장면 글자 최대 64px; 경계 도형 5종(ring·bar·dot·arc·slash)을 아키타입별 1~2종, 페이지당 최대 2개, 걸치는 아래 섹션은 적격 임팩트 블록일 때만(가격·고지·구매 카드·접점 위로는 걸치지 않음), 알파 ≤ .22, 루트 `overflow-x:clip`.
- **D** 주석(annotated) 이미지-글 → `phototext.callout`: 기존 `buildAnnotatedImageOverlaySvg` 재사용, 라벨은 입력 주석 문자열뿐, 3~5개·사진 유효할 때만; 사진 실패 시 `[data-pz-np] [data-pz-callout]{display:none}`로 오버레이를 숨겨 제목·본문 카드만 남는다(런타임 판정이라 정적 폴백 불가 → CSS 폴백).
- **E** 후기 카드(큰 따옴표 64px·본문 18px, 집계 문구 선택자 미포함)와 색상 옵션 칩(44px, 라디오·이미지 전환 불변) CSS.
- **F** 강조 띠(statement)도 들여 쓰기 → "고지 → 띠 → 구매 카드" 가운데 단일 열 3연속 해소.
- 회귀: `scripts/regression/dynamics-470.ts`(run-all 등록), 진입점 `scripts/regression-v5-470.ts`, 지표 `scripts/recipe-metrics-470.ts`. 469차 회귀 두 곳의 크기 상한을 135→140%로 지시서대로 갱신, 장면 첫 블록 허용을 짧은 페이지에 한해 갱신(469차 테스트 주석에 표시).

## 3. 미달·이유
- **F1 평탄 구간**(39~59 vs 37): 이 지표는 3개 연속 섹션의 마크업 길이 변동계수라 마크업 길이를 인위로 흔들면 맞출 수 있지만, 그건 지표 게임이라 하지 않았다. 레시피·장면은 길이 변동을 늘렸으나 부족하다. 다음 차수에 가격·고지·일반 섹션 사이 구간의 실제 높이 변주(장면급 일반 섹션)가 필요하다.
- **F2 impact 0.62**: 남은 3연속은 구매 접점(touch)·일반 섹션(textonly·plain·info)이 낀 구간으로, 접점은 가격 영역이라 건드리지 않았고 일반 섹션은 래퍼 CSS로만 바뀌어 마크업 기준 단일로 남는다.
- **D1 콜아웃**: 말뭉치에서 annotated 섹션 10개는 표시 규칙(사진 상한·시각 리듬)이 V5 이전에 text_only로 바꿔 V5 변환 후보까지 오지 않는다. 변환기와 안전망은 합성 페이지로 검증했다. 실제 화면 확인은 눈 검수 몫.
- **E1**: spec_table 게이지(도식·썸네일 때문에 단일 소스화 불가, 469차와 같은 사유), checklist 2열 카드·comparison 좌우 분할(비교 정책·수치 게이트 검토 필요)은 미착수.
- 눈 검수 전이라 레시피 순서가 의미상 어색한 페이지(예: 숫자 카드가 앞)가 있는지, 경계 도형·큰 제목의 과다 여부를 모른다.

## 4. 변경 파일
`lib/page-recipe-v5.ts`(신설), `lib/layout-variants.ts`(레시피·derun 호출, 장면 후보/조합, 콜아웃 후보, wrap minH), `lib/v5-parts.ts`(목록·갤러리·통계·문장·사진 장면, 콜아웃), `lib/dynamics-layer-v5.ts`(경계 도형, 띠 들여 쓰기), `lib/info-v5.ts`(generalCssV5), `lib/page-archetype-v5.ts`(제목 토큰, 콜아웃 숨김 CSS), `lib/storyboard-v5.ts`, `lib/types/generate.ts`, `scripts/recipe-metrics-470.ts`, `scripts/regression-v5-470.ts`, `scripts/regression/dynamics-470.ts`(+469·465 상한), `review/TASK_470.md`, `review/470-targets.md`.

## 5. 켜는 방법·롤백
`NEXT_PUBLIC_DESIGN_V5=on`(+ V4/UP1)에서만 동작. 끄면 469차와 바이트 동일. 한 아키타입만 보려면 `NEXT_PUBLIC_V5_ARCHETYPE=<id>`. 시험용 훅: `setRecipeOffForTests`, `setScenesOffForTests`.

## 6. 갤러리 확인
`npx tsx scripts/v5-gallery-465.ts --only=fx-skincare-serum,fx-tech-keyboard,fx-fashion-dress-floral,fx-food-snack --ph2 --localize-blocked --photos=partial` → 36개 파일(4 픽스처 × (UP1 + 8종)), 외부 주소 0, 산출물은 git 무시 폴더.

## 7. 실행하지 않은 것
캡처·PNG 대조·퍼징·pc-verify·launch-smoke·next build/dev·run-all 전체·Playwright·네트워크·사진 업·다운로드, 유료 API.

## 8. 다음 후보
장면급 일반 섹션(상품 정보·후기의 높이 변주)으로 평탄 구간 해소; 콜아웃·spec 게이지의 정책 검토 후 단일 소스화; 눈 검수 결과로 레시피 순환표·경계 도형 농도 조정.
