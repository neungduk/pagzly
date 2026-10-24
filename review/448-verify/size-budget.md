# export HTML 크기 예산 (448차)

예산: 일반 150KB · 풍부 입력(rich·compare) 220KB. 크기는 UTF-8 바이트.

| 세션 | 크기(KB) | 예산 | 인라인 SVG | CSS | style 속성 | 반복 style 낭비 | v4 off(KB) | v4 가 더한 KB |
|---|---|---|---|---|---|---|---|---|
| fx-compare-beauty | 123.0 | ✓ (220) | 18.9 | 34.9 | 41.9 | 7.3 | 117.0 | 6.0 |
| fx-compare-fashion | 103.4 | ✓ (220) | 15.0 | 22.8 | 36.6 | 7.9 | 109.2 | -5.8 |
| fx-compare-tech | 94.7 | ✓ (220) | 13.3 | 18.0 | 39.2 | 7.4 | 86.5 | 8.2 |
| fx-fashion-bottom-denim | 99.3 | ✓ (150) | 12.8 | 23.6 | 33.5 | 5.8 | 108.1 | -8.8 |
| fx-fashion-dress-floral | 107.5 | ✓ (150) | 20.2 | 23.1 | 35.0 | 6.4 | 110.9 | -3.4 |
| fx-food-snack | 95.1 | ✓ (150) | 14.1 | 17.7 | 38.5 | 7.2 | 87.9 | 7.1 |
| fx-hairbody-shampoo | 110.6 | ✓ (150) | 15.9 | 32.9 | 38.1 | 6.7 | 106.2 | 4.4 |
| fx-inner-collagen | 113.1 | ✓ (150) | 18.7 | 33.7 | 37.0 | 5.8 | 108.2 | 4.9 |
| fx-living-storage | 86.6 | ✓ (150) | 8.6 | 14.0 | 45.5 | 17.5 | 74.6 | 12.0 |
| fx-makeup-tint | 127.7 | ✓ (150) | 19.3 | 32.4 | 52.2 | 16.2 | 114.0 | 13.7 |
| fx-skincare-serum | 112.4 | ✓ (150) | 18.9 | 34.2 | 36.0 | 6.1 | 105.9 | 6.5 |
| fx-tech-keyboard | 80.5 | ✓ (150) | 9.8 | 16.6 | 32.2 | 5.5 | 150.0 | -69.5 |
| fx-tech-vacuum | 78.1 | ✓ (150) | 8.3 | 17.0 | 31.0 | 5.5 | 150.0 | -71.9 |
| fx-tier-normal-fashion-3p | 97.5 | ✓ (150) | 16.6 | 20.8 | 34.0 | 4.9 | 104.7 | -7.2 |
| fx-tier-normal-living-3p | 75.3 | ✓ (150) | 9.9 | 16.5 | 29.8 | 4.8 | 70.2 | 5.1 |
| fx-tier-normal-pet-3p | 81.4 | ✓ (150) | 14.6 | 15.6 | 32.4 | 5.3 | 75.6 | 5.7 |
| fx-tier-rich-fashion-6p | 97.2 | ✓ (220) | 16.0 | 22.8 | 31.8 | 6.1 | 103.5 | -6.3 |
| fx-tier-rich-tech-6p | 87.3 | ✓ (220) | 11.3 | 17.2 | 36.1 | 6.5 | 83.8 | 3.5 |
| fx-tier-sparse-beauty-1p | 66.6 | ✓ (150) | 5.9 | 31.7 | 17.1 | 2.9 | 64.0 | 2.6 |
| fx-tier-sparse-food-1p | 47.3 | ✓ (150) | 4.1 | 14.5 | 16.8 | 2.6 | 44.9 | 2.3 |
| fx-tier-sparse-tech-1p-noprice | 41.6 | ✓ (150) | 4.2 | 13.9 | 14.1 | 2.6 | 40.8 | 0.7 |
| **평균** | 91.7 | | 13.2 | 22.6 | 33.7 | 6.7 | 96.0 | -4.3 |

## 반복되는 style 문자열 상위(첫 세션 3개)
- ×2 (297자) `position:relative;z-index:1;flex-shrink:0;display:flex;align-items:center;justify-content:…`
- ×3 (139자) `position:absolute;left:0;top:2px;width:20px;height:20px;border-radius:50%;background:#FFFF…`
- ×2 (270자) `display:inline-block;padding:12px 20px;border-radius:999px;background:#21636F;border:none;…`
