# 사진 노출 지표 (449차)

덮개가 사진을 가리는 정도(사진과 무관 — 순백·순흑 사진 쌍으로 푼 픽셀별 알파). 가림 면적비 = 알파 ≥0.5 픽셀 비율(낮을수록 사진이 보임), 휘도 보존율 = 평균(1-알파)(높을수록 사진이 밝게 보임). 목표: 히어로 가림 ≤0.45·보존 ≥0.55, 정보 구간 가림 ≤0.6·보존 ≥0.4.

| 레이아웃 | 영역 수 | 가림 평균 | 가림 최악 | 보존 평균 | 보존 최악 | 최악 픽스처 |
|---|---|---|---|---|---|---|
| banner | 7 | 1.00 | 1.00 | 0.08 | 0.07 | fx-compare-fashion / fx-tech-keyboard |
| hero-A | 2 | 0.54 | 0.54 | 0.50 | 0.50 | fx-compare-fashion / fx-fashion-dress-floral |
| hero-B | 3 | 0.15 | 0.23 | 0.85 | 0.77 | fx-food-snack |
| hero-C | 1 | 0.04 | 0.04 | 0.96 | 0.96 | fx-tech-keyboard |
| hero-D | 2 | 0.04 | 0.04 | 0.96 | 0.96 | fx-tech-vacuum / fx-tier-normal-living-3p |
| impact-asym2 | 6 | 0.01 | 0.03 | 0.88 | 0.86 | fx-food-snack |
| impact-bleed | 1 | 0.27 | 0.27 | 0.74 | 0.74 | fx-food-snack |
| impact-frame | 1 | 0.03 | 0.03 | 0.87 | 0.87 | fx-fashion-dress-floral |
| impact-split | 2 | 0.01 | 0.01 | 0.99 | 0.99 | fx-tech-keyboard |
| impact-zoom | 2 | 0.02 | 0.08 | 0.89 | 0.88 | fx-tech-keyboard |
| info-points | 2 | 0.96 | 0.96 | 0.06 | 0.06 | fx-hairbody-shampoo / fx-skincare-serum |
| info-stat | 1 | 1.00 | 1.00 | 0.37 | 0.37 | fx-hairbody-shampoo |
| section | 36 | 0.06 | 0.22 | 0.94 | 0.78 | fx-tech-keyboard / fx-food-snack |
| v4-benefits.bento | 1 | 0.04 | 0.04 | 0.96 | 0.96 | fx-tier-normal-living-3p |
| v4-benefits.zigzag | 4 | 0.03 | 0.05 | 0.97 | 0.95 | fx-hairbody-shampoo |
| v4-phototext.arch | 4 | 0.09 | 0.10 | 0.91 | 0.90 | fx-tech-vacuum |
| v4-phototext.caption | 4 | 0.00 | 0.01 | 1.00 | 0.99 | fx-compare-fashion |
| v4-phototext.collage | 2 | 0.03 | 0.03 | 0.97 | 0.97 | fx-tech-keyboard |
| v4-phototext.offset | 4 | 0.01 | 0.01 | 0.99 | 0.99 | fx-hairbody-shampoo |
| v4-phototext.overlap | 5 | 0.06 | 0.06 | 0.94 | 0.94 | fx-tech-vacuum |
| v4-story.linetime | 2 | 0.01 | 0.01 | 0.99 | 0.99 | fx-food-snack |
| v4-story.quote | 2 | 0.01 | 0.01 | 0.99 | 0.99 | fx-hairbody-shampoo |

## 목표 미달 영역
- fx-compare-fashion hero-A: 가림 0.54 > 0.45
- fx-compare-fashion hero-A: 보존 0.50 < 0.55
- fx-fashion-dress-floral hero-A: 가림 0.54 > 0.45
- fx-fashion-dress-floral hero-A: 보존 0.50 < 0.55
- fx-skincare-serum info-points: 가림 0.96 > 0.6
- fx-skincare-serum info-points: 보존 0.06 < 0.4
- fx-hairbody-shampoo info-points: 가림 0.96 > 0.6
- fx-hairbody-shampoo info-points: 보존 0.06 < 0.4
- fx-hairbody-shampoo info-stat: 가림 1.00 > 0.6
- fx-hairbody-shampoo info-stat: 보존 0.37 < 0.4
