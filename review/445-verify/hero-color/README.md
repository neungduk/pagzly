# 히어로 포화 면 색 다양성 (445차 4)

원인: 합성 픽스처 9종이 같은 기본 대표색 `#20547E`를 써서(실제 입력에서는 대표색이 사진 지배색에서 나온다) `heroFaceColor`가 모두 같은 파란 면 `#1D79C4`를 냈다.
규칙(`heroFaceColor`: 사진 지배색 → 색상어 → mood → 대표색)은 그대로 두고, 해당 픽스처에 색상을 부여했다(`scripts/gen-fixture-themes.ts`, 실제 파이프라인 함수 `buildThemeFromHueWithNeutral`로 theme 전체 파생).
전: 같은 파란 면 9종 겹침 + 청록 2종 겹침(겹친 픽스처 10/21). 후: 20/21 서로 다름(겹침은 같은 제품 계열 `compare-beauty`·`skincare-serum` 한 쌍 = 2/21).
포화 면은 B 히어로에서만 쓰인다(A·C·D는 어두운 면).

| 픽스처 | 대표색 | 신호 | 면 색 | 히어로 변형 |
|---|---|---|---|---|
| compare-beauty | #2F9E8F | photo (205) | #188173 | B |
| compare-fashion | #2B2381 | photo (dark) | #2F20CA | A |
| compare-tech | #21667E | photo (212) | #187C9F | C |
| fashion-bottom-denim | #2F4A7A | photo (dark) | #2F62BC | A |
| fashion-dress-floral | #E58A8A | photo (336) | #D21919 | A |
| food-snack | #B5651D | photo (26) | #B35D0F | B |
| hairbody-shampoo | #5B9A5A | photo (128) | #228321 | B |
| inner-collagen | #8A63C9 | photo (205) | #642BC0 | B |
| living-storage | #9C8F7E | mood (24) | #BD550F | D |
| makeup-tint | #D9466F | photo (336) | #D4164B | B |
| skincare-serum | #2F9E8F | photo (205) | #188173 | B |
| tech-keyboard | #2B2D3A | keyword (212) | #126ED9 | C |
| tech-vacuum | #E3743A | photo (205) | #C64F10 | D |
| tier-normal-fashion-3p | #A26837 | photo (dark) | #A86024 | A |
| tier-normal-living-3p | #267E61 | accent | #18815E | D |
| tier-normal-pet-3p | #232381 | photo (336) | #2020CA | B |
| tier-rich-fashion-6p | #822482 | photo (dark) | #C921C9 | A |
| tier-rich-tech-6p | #287E4C | photo (212) | #1B8849 | C |
| tier-sparse-beauty-1p | #812265 | photo (205) | #CB1F99 | B |
| tier-sparse-food-1p | #20577E | accent | #1B79BB | B |
| tier-sparse-tech-1p-noprice | #6B2582 | accent | #9F22C8 | C |

서로 다른 면 색 20/21; 겹침: #188173 compare-beauty+skincare-serum
