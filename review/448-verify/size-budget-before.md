# export HTML 크기 예산 (448차)

예산: 일반 150KB · 풍부 입력(rich·compare) 220KB. 크기는 UTF-8 바이트.

| 세션 | 크기(KB) | 예산 | 인라인 SVG | CSS | style 속성 | 반복 style 낭비 | v4 off(KB) | v4 가 더한 KB |
|---|---|---|---|---|---|---|---|---|
| fx-compare-beauty | 131.8 | ✓ (220) | 18.9 | 28.9 | 58.1 | 19.4 | 117.0 | 14.8 |
| fx-compare-fashion | 126.3 | ✓ (220) | 15.0 | 13.1 | 72.1 | 36.7 | 109.2 | 17.1 |
| fx-compare-tech | 103.8 | ✓ (220) | 13.3 | 11.8 | 55.8 | 19.8 | 86.5 | 17.3 |
| fx-fashion-bottom-denim | 125.1 | ✓ (150) | 12.8 | 13.1 | 73.1 | 38.2 | 108.1 | 17.0 |
| fx-fashion-dress-floral | 130.9 | ✓ (150) | 20.2 | 13.1 | 71.4 | 35.9 | 110.9 | 20.0 |
| fx-food-snack | 104.8 | ✓ (150) | 14.1 | 11.8 | 55.4 | 20.2 | 87.9 | 16.8 |
| fx-hairbody-shampoo | 117.1 | ✓ (150) | 15.9 | 28.9 | 49.7 | 15.6 | 106.2 | 11.0 |
| fx-inner-collagen | 120.9 | ✓ (150) | 18.7 | 28.9 | 50.8 | 16.4 | 108.2 | 12.7 |
| fx-living-storage | 87.1 | ✓ (150) | 8.6 | 13.7 | 46.6 | 18.5 | 74.6 | 12.6 |
| fx-makeup-tint | 128.2 | ✓ (150) | 19.3 | 32.1 | 53.2 | 17.0 | 114.0 | 14.1 |
| fx-skincare-serum | 120.4 | ✓ (150) | 18.9 | 28.9 | 50.5 | 17.0 | 105.9 | 14.5 |
| fx-tech-keyboard | 94.9 | ✓ (150) | 9.8 | 11.6 | 53.2 | 23.0 | 150.0 | -55.0 |
| fx-tech-vacuum | 93.4 | ✓ (150) | 8.3 | 11.7 | 53.3 | 24.0 | 150.0 | -56.7 |
| fx-tier-normal-fashion-3p | 119.7 | ✓ (150) | 16.6 | 13.1 | 66.6 | 32.3 | 104.7 | 15.0 |
| fx-tier-normal-living-3p | 83.7 | ✓ (150) | 9.9 | 11.9 | 44.0 | 15.7 | 70.2 | 13.5 |
| fx-tier-normal-pet-3p | 88.6 | ✓ (150) | 14.6 | 11.6 | 44.6 | 14.8 | 75.6 | 13.0 |
| fx-tier-rich-fashion-6p | 119.9 | ✓ (220) | 16.0 | 13.1 | 67.1 | 34.7 | 103.5 | 16.3 |
| fx-tier-rich-tech-6p | 95.5 | ✓ (220) | 11.3 | 11.8 | 51.0 | 17.8 | 83.8 | 11.7 |
| fx-tier-sparse-beauty-1p | 72.2 | ✓ (150) | 5.9 | 28.8 | 26.4 | 10.1 | 64.0 | 8.2 |
| fx-tier-sparse-food-1p | 52.9 | ✓ (150) | 4.1 | 11.6 | 26.1 | 9.9 | 44.9 | 8.0 |
| fx-tier-sparse-tech-1p-noprice | 46.5 | ✓ (150) | 4.2 | 11.6 | 21.9 | 8.8 | 40.8 | 5.7 |
| **평균** | 103.0 | | 13.2 | 17.2 | 51.9 | 21.2 | 96.0 | 7.0 |

## 반복되는 style 문자열 상위(첫 세션 3개)
- ×7 (201자) `text-align:left;padding:14px 16px 14px 0;width:38%;opacity:.55;font-weight:500;font-size:1…`
- ×7 (137자) `flex:0 0 auto;padding:8px 14px;font-size:12px;font-weight:600;color:#216F64;text-decoratio…`
- ×4 (269자) `flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;bo…`
