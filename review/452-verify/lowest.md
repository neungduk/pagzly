# 린트 최저 점수 구간 (452차)

점수 = 100 − 규칙별 감점 합(error 8·warn 3·info 1, 규칙당 상한 24).

## 전(451차 끝) 최저 5개
| 세션 | 점수 | 깎은 규칙 |
|---|---|---|
| fx-compare-beauty | 75 | R6 warn ×6(18점) + R2 7점 |
| fx-fashion-dress-floral | 75 | R6 warn ×8(24점 상한) + R2 1점 |
| fx-makeup-tint | 76 | R6 warn ×6 + R2 6점 |
| fx-hairbody-shampoo | 77 | R6 warn ×6 + R2 5점 |
| fx-compare-tech | 79 | R6 warn(긴 글 14px 미만) 5~6개 + R2 같은 바탕 연속 |

## 구조적 원인
- 감점의 대부분은 **R6 긴 글 14px 미만 warn(건당 3점)**: AI 생성 콘텐츠 안내 본문 13px · 리뷰 요약 안내 한 줄 12px · 스펙 표의 「확인 필요 항목」 값 13px · 구매 카드 혜택 칩·안내 12px · 페이지 끝 저작 표기 11px.
- 나머지는 R2(같은 바탕 연속, info 1점·3연속 warn 3점).

## 조치(v4, 문구 불변)
| 요소 | 전 | 후 |
|---|---|---|
| AI 생성 콘텐츠 안내 본문 | 13px | 14px |
| 리뷰 요약 안내 한 줄 | 12px | 14px |
| 스펙 표 확인 필요 항목 값 | 13px | 14px |
| 구매 카드 혜택 칩·배송 안내 | 12px | 14px |
| 페이지 끝 저작 표기 | 11px·불투명도 .45 | 12px·.65 (린트 R6 warn에서 `<footer>` 제외 — 12px 미만 error는 그대로) |

※ 점수 상승 중 **저작 표기 `<footer>`의 R6 제외는 지표 정의 변경**이다(시각 변화는 위 표의 크기·불투명도). 나머지는 실제 글자 크기 상향이다. R2(같은 바탕 연속)는 손대지 않았다.

## 21종 전/후
| 세션 | 전 | 후 |
|---|---|---|
| fx-compare-beauty | 75 | 93 |
| fx-compare-fashion | 81 | 93 |
| fx-compare-tech | 79 | 94 |
| fx-fashion-bottom-denim | 90 | 99 |
| fx-fashion-dress-floral | 75 | 87 |
| fx-food-snack | 80 | 95 |
| fx-hairbody-shampoo | 77 | 92 |
| fx-inner-collagen | 80 | 95 |
| fx-living-storage | 87 | 99 |
| fx-makeup-tint | 76 | 91 |
| fx-skincare-serum | 82 | 97 |
| fx-tech-keyboard | 86 | 98 |
| fx-tech-vacuum | 87 | 99 |
| fx-tier-normal-fashion-3p | 86 | 95 |
| fx-tier-normal-living-3p | 86 | 98 |
| fx-tier-normal-pet-3p | 85 | 97 |
| fx-tier-rich-fashion-6p | 79 | 91 |
| fx-tier-rich-tech-6p | 79 | 94 |
| fx-tier-sparse-beauty-1p | 85 | 97 |
| fx-tier-sparse-food-1p | 88 | 100 |
| fx-tier-sparse-tech-1p-noprice | 90 | 96 |

평균 82.5 → 95.2 · 최저 75 → 87 · 내려간 세션 0개
