# 197차 — 사진 독립 품질 감사 (브랜드 스크림 충돌)

생성: 2026-09-15 · API **0** (로컬 재렌더·스크린샷만)

**질문:** “어떤 사진이 들어와도 같은 품질” — 브랜드색 스크림이 사진 색과 부딪히는 자리가 더 있는가.

### 트랙 A — 에디토리얼 풀블리드 (`getEditorialBleedScrim`)
6카테고리 export 재렌더: 전부 `rgba(27,27,24…)` 중립 스크림 확인. 정지점(0/24/42/55)·불투명도(0.82) **조정 없음** — 사진이 로드된 샘플에서 상단 톤이 브랜드색으로 오염되지 않음.  
living/pet의 `usage_scenario_extra`는 190차 display-budget demote로 표시 제외(의도된 동작) → 각 1장만 촬영.

샷: `197cha-editorial-{beauty,electronics×2,living,pet,food,fashion×2}-*.png`

### 트랙 B — `illustration_banner`
6카테고리 스크린샷 확인. **코드 미수정(이상 없음).**  
근거: live는 의도적으로 `blur-2xl`+`opacity-55` 위에 `getHeroGradient`+deepAccent 이중 오버레이(“가짜 UI 가리기”). export는 `deepFill` 솔리드 무대. 195형 “선명 사진+브랜드 스크림 오염”과 다른 설계. 섣부른 중립화는 가림 목적을 약화시킴.

샷: `197cha-banner-{beauty,electronics,living,food,fashion,pet}.png`

### 트랙 C — `custom_gif` (실사 데이터 없음)
`getHeroGradient(theme)` → `getAspectVideoBleedScrim()` (aspect-video용 정지점 0/20/38/50, `BRAND.ink`).  
`grep getHeroGradient(` → **hero 1곳 + illustration_banner 1곳**만 잔존. custom_gif 제거 확인.

| 파일 | diff |
|------|------|
| `DetailSectionRenderer.tsx` | `getAspectVideoBleedScrim` + custom_gif 배선 |

이미지 생성 API 호출: **0**. `tsc` 0.  
백로그 마스터는 Cursor 미갱신.
