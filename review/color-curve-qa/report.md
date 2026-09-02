# 49차 색상 추출 QA 보고

생성: 2026-09-01

## Fix A — 버킷 합산
- mergeHueBuckets 단위 테스트: **PASS**
- legacy=30° (w=5) → merged=15° (w=8)
- 소품색(한 장) vs 상품색(3장 누적) 시나리오에서 merged가 상품색(15°)을 선택

## Fix B — hue별 팔레트 커브
| hue | accent S | accent L |
|-----|----------|----------|
| 0° | 0.62 | 0.32 |
| 25° | 0.50 | 0.42 |
| 55° | 0.44 | 0.47 |
| 85° | 0.48 | 0.36 |
| 120° | 0.50 | 0.33 |
| 165° | 0.54 | 0.32 |
| 210° | 0.60 | 0.31 |
| 270° | 0.55 | 0.33 |
| 320° | 0.58 | 0.32 |

주황~황갈(25~55°) 구간: S↓ L↑ — 탁한 흙색 대신 테라코타/앰버 톤

## Fix C — hue 대역별 전/후 스크린샷
- **붉은 립스틱** (`red`): legacy accent=#841F27 → new accent=#882721 · [스크린샷](../qa-screenshots/color-curve-red.png)
- **초록 클렌저** (`green`): legacy accent=#84731F → new accent=#AA9440 · [스크린샷](../qa-screenshots/color-curve-green.png)
- **파란 패키지** (`blue`): legacy accent=#1F7D84 → new accent=#23787E · [스크린샷](../qa-screenshots/color-curve-blue.png)
- **베이지 스킨케어** (`beige`): legacy accent=#845A1F → new accent=#A47339 · [스크린샷](../qa-screenshots/color-curve-beige.png)
- **보라 에센스** (`purple`): legacy accent=#1F6384 → new accent=#21607E · [스크린샷](../qa-screenshots/color-curve-purple.png)

## 체크리스트
- [x] Fix A: 3장 hue 버킷 합산
- [x] Fix B: getPaletteCurve 8구간+
- [x] Fix C: 5 hue 대역 스크린샷 (`review/qa-screenshots/color-curve-*.png`)
