# 195차 — 에디토리얼 풀블리드 대형 타이포 오버레이

생성: 2026-09-15 · API **0**

**변경:** `EDITORIAL_BLEED_SLOTS` image_text만 — kicker+heading을 이미지 위 오버레이(`getHeroGradient` + `TYPO.bannerTitle`/`heroCategory`). body는 이미지 아래 유지.  
**live:** `EDITORIAL_BLEED_OVERLAY_CLASS` 선언 1 + 사용 1. **export:** illustration_banner와 동일 absolute 오버레이.  
**검증:** `tsc` 0. food `serving_suggestion` / fashion `coordination`·`seasonal_styling` — h2 오버레이·body 하단 확인.

샷: `195cha-before|after-food-editorial.png`, `195cha-after-fashion-editorial.png`

| 파일 | diff |
|------|------|
| `DetailSectionRenderer.tsx` | 상수 + bleed 분기 |
| `export-detail-html.ts` | bleed 분기 |

백로그 마스터는 Cursor 미갱신.
