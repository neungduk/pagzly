# 49차 후속 — 실제 앱 화면으로 재검증 요청

생성: 2026-09-01

## 배경

49차(색상 추출 개선) 완료 보고와 QA 스크린샷(`review/color-curve-qa/`)을 확인했습니다.
`mergeHueBuckets`(버킷 합산)와 `getPaletteCurve`(hue별 커브) 모두 코드를 직접 읽고
독립적으로 재실행해서 로직이 보고한 대로 정확히 동작하는 것을 확인했습니다. 특히 QA에
쓰인 립스틱/클렌저/패키지 등 사진은 실제 Pexels 사진을 받아온 것으로 보이고(붉은 립스틱
케이스 스크린샷에서 실제 립스틱 제품 사진 3장을 확인함), 색 추출 로직 자체는 잘 고쳐진
것으로 판단됩니다. 여기까지는 좋습니다.

## 남은 한 가지 — QA 스크린샷은 "실제 상세페이지"가 아니라 "색상 비교용 미니 목업"

`review/color-curve-qa/preview-*.html` / `color-curve-{hue}.png`는 `scripts/color-curve-qa.ts`의
`buildPreviewHtml()`이 만든 **간이 목업**입니다 — 원 버튼 색 + "01·HERO / 02·SPEC /
03·HIGHLIGHT" 라벨 3개짜리 색상 블록만 보여주고, 실제 앱의 `DetailSectionRenderer`가
만드는 진짜 히어로 이미지/카피/레이아웃은 들어있지 않습니다. 색상 값 자체의 전/후 비교는
이걸로 충분하지만, **사용자가 원래 문제 삼았던 화면은 지난번 `cosmetics-pixabay-test-full.png`처럼
실제로 생성된 상세페이지**였습니다.

## 요청 사항

지난번 `cursor_note_cosmetics_pixabay_test_generation.md`로 돌렸던 것과 **동일한 조건으로**
화장품 카테고리 Pixabay 테스트를 한 번 더 실행해 주세요.

1. 가능하면 그때 썼던 것과 같은(또는 최대한 비슷한 톤의) 가라 상품 정보 + Pixabay 이미지
   7장 이상으로, `localhost:3000`에서 실제 `/create/detail` 플로우를 그대로 통과시켜
   진짜 상세페이지를 생성하세요.
2. 전체 페이지 스크린샷을 `review/qa-screenshots/cosmetics-pixabay-retest-after-49cha.png`로
   저장하세요.
3. 완료 보고에는 **지난번 스크린샷(`cosmetics-pixabay-test-full.png`, 탁한 갈색/올리브 배경)과
   이번 스크린샷을 나란히 비교**해서, 실제 페이지에서도 탁한 색이 사라지고 다채로워졌는지
   눈으로 확인할 수 있게 해주세요. 목업이 아니라 실제 앱 화면 기준입니다.
4. 만약 이번에도 특정 섹션이 탁하거나 부자연스러우면 숨기지 말고 그대로 보고해 주세요 —
   49차 커브 값을 한 번 더 다듬어야 할 수도 있습니다.

## 하지 않는 것

- 색상 추출 로직(`color-extract.ts`) 재수정은 이번 요청 범위 밖입니다 — 이번엔 "실제 화면
  재확인"만 해주세요. 문제가 발견되면 그 내용만 보고하고, 수정은 다음 브리프에서 다룹니다.
