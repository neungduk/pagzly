# 196차 — 에디토리얼 오버레이 스크림 색상 수정

생성: 2026-09-15 · API **0**

**원인:** 195차가 `getHeroGradient`(브랜드 accent)를 짧은 aspect-4/5 박스에 재사용해 사진 톤 오염.  
**수정:** `getEditorialBleedScrim()` — `BRAND.ink` 중립 스크림, 하단 55%만. heading `line-clamp-1`(export ellipsis). hero의 `getHeroGradient`는 유지.  
**추가:** export `dh2`에서 `font-family:"..."` 큰따옴표가 `style=""`을 끊어 오버레이 `color:#FAF8F3`가 무시되던 버그 → `detail-typography` 폰트 스택을 작은따옴표로 수정(흰 글씨 실제 적용).  
**검증:** `tsc` 0. 에디토리얼 분기 `getEditorialBleedScrim`만 사용. h2 computed `rgb(250,248,243)`. body 하단 확인.

### 스크린샷 (전체 섹션: 이미지+오버레이+body)

| | before (195) | after (196) |
|--|--|--|
| food serving_suggestion | `196cha-before-food-serving_suggestion-full.png` | `196cha-after-food-serving_suggestion-full.png` |
| fashion coordination | `196cha-before-fashion-coordination-full.png` | `196cha-after-fashion-coordination-full.png` |
| fashion seasonal_styling | `196cha-before-fashion-seasonal_styling-full.png` | `196cha-after-fashion-seasonal_styling-full.png` |

diff: `DetailSectionRenderer.tsx`, `export-detail-html.ts`, `detail-typography.ts`  
백로그 마스터는 Cursor 미갱신.
