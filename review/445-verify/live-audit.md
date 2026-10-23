# review_highlight 픽스처 + 라이브 코드 전수 대조 (445차 5)

## 1. review_highlight 픽스처
- `archetype-compare-beauty`에 후기 요약 섹션을 넣었다(`scripts/gen-fixture-reviews.ts`). 입력은 판매자 후기 파일 `scripts/fixtures/cosmetics-reviews.txt` 6줄(≥5) 뿐이고,
  칭찬 3문장·아쉬운 점 2문장은 그 파일의 문장을 그대로 옮겼다(별점 4 이상 줄의 첫 문장 / 3 이하 줄의 첫 문장). 제목·위치·상한·언급 줄 수는 서버가 쓰는 함수(`insertReviewHighlightSection`·`countLineMatches`)가 정한다 — 새 문구 없음.
- 눈 검수: `review-highlight-export-vs-live.png`(왼쪽 export | 오른쪽 라이브, 390px). 큰 따옴표 글리프·카드·언급 건수 칩·"아쉬운 점" 구분선까지 두 렌더러가 같은 모양, 섹션 높이 815 = 815.

## 2. 라이브 코드 전수 대조 방법
`scripts/live-audit.ts` — 원본 섹션 한 장을 export와 라이브에 같은 입력으로 열고, 글자 요소(내용으로 짝)와 면·테두리·그림자 상자(순서로 짝)의 계산 스타일(크기·굵기·행간·자간·색·반경·여백·그림자·크기)을 비교한다.

| 섹션 | 대조한 입력 | 결과 |
|---|---|---|
| review_highlight | fx-compare-beauty | 아래 차이 3건(2건 수정) |
| step_card | fx-fashion-dress-floral | 높이 620 = 620, 글자 값 동일. 차이 1건(남김) |
| brand_story | fx-compare-beauty, fx-compare-fashion | 높이·글자 값 동일(색은 알파 표기만 다름) |

### 발견한 차이와 처리
| 차이 | 원인 | 처리 |
|---|---|---|
| 후기 카드 반경 export 16 ↔ 라이브 12 | 라이브 하드코딩 `rounded-xl` | **수정**(v4: `rounded-2xl` = 반경 토큰 '중' 16) |
| 후기 캡션(분석 건수·언급 건수·"아쉬운 점" 머리말·요약 안내·건수 칩) 글자 11px, 면 위 대비 약 2.6~3.5:1 | 라이브 `text-[11px] text-ink/40~50`, export `opacity:.4~.5` — 라벨 하한 12px·4.5:1 미충족. **합성 픽스처에 후기 섹션을 넣고서야 드러남** | **수정**(v4: 글자 `MIN_LABEL_PX`=12·행간 토큰 `normal`·잉크 알파 `SPEC_LABEL_INK_ALPHA`=0.65, 라이브·export가 `reviewCaptionV4()` 한 함수를 읽음). 아쉬운 점 문장은 크기는 유지(좁은 12/넓은 13)하고 색만 토큰으로 |
| step_card "STEP 01" 라벨 자간 export 3.5px ↔ 라이브 0.4px | v3 폰트 쌍 CSS(`.font-mono{letter-spacing:…!important}`)가 라이브 클래스에만 걸림. v4와 무관한 기존 차이 | **남김**(폰트 쌍은 쌍마다 자간이 달라 export가 같은 값을 알려면 마크업 함수에 쌍 전달 필요). 다음 차수 후보 |
| 인용 부호 글리프 자간 0 ↔ -0.9px | 라이브가 제목 자간을 상속 | 남김(글리프 1개, 시각 차이 없음) |
| 라이브에만 있는 크기 0 요소(`HOW TO USE`·`STORY` 눈썹) | FLAT 면에서 숨김 처리된 머리말 | 시각 영향 없음 |
| 마진 위치(제목 아래 vs 본문 위) | 같은 간격을 반대쪽 요소가 가짐 | 시각 영향 없음(높이 동일) |

### 토큰과 다른 하드코딩 값 목록(review_highlight·step_card·brand_story 라이브)
| 위치 | 값 | 토큰 | 처리 |
|---|---|---|---|
| review 카드 | `rounded-xl`(12) | radius-md 16 | 치환(v4) |
| review 캡션 5종 + 요약 줄 + 머리말 + 건수 칩 | `text-[11px]`·`text-ink/40~45` | label 12·알파 0.65 | 치환(v4) |
| review 아쉬운 점 문장 | `text-ink/50` | 알파 0.65 | 치환(v4) |
| step_card 이미지 위 STEP 칩 | `text-[10px] tracking-[0.18em]`(행 모드) / `text-[11px] tracking-[0.24em]` | label 12 | **미확인·남김** — 대조에 쓴 입력은 칩이 사진 밖(오프이미지 라벨)이라 사진 위 칩의 계산 크기는 못 봤다. 11px 이하이면 라벨 하한 위반 후보(다음 차수) |
| review/step 카드 안쪽 여백 | `px-5 py-5`·`px-3.5 py-1.5` 등 | 섹션 여백 스케일(32·48·64) 대상 아님(카드 안쪽) | 해당 없음 |
| brand_story | 하드코딩 차이 없음(대조 일치) | — | — |
