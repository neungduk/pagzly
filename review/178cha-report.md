# 178차 — statInfographic 실루엣 통일 + elevation 감사(조사)

생성: 2026-09-14

## 요약

| 트랙 | 결과 |
|------|------|
| A 실측 metrics/페이지 | **평균 3.14** (n=7: 2~4, live 다수 4) |
| A 전환 | **statInfographic → 항상 `recraft-v4-svg`** (프리미엄·기본 공통) |
| A 실루엣 | `useDiagramSilhouette` 기존 분기 재사용 (프롬프트+SVG tint) |
| A live | **after 4/4** tint 적용 · before 배지 4장 재현 |
| A 하드룰 mtime | `comparison-chart-guard.ts` / `assign-section-images.ts` **불변** |
| B elevation | **조사만** — 규칙 표 작성, 코드 변경 없음 |
| `npx tsc --noEmit` | **EXIT 0** |
| 이미지 API 호출 | **8** (before v4×4 + after v4-svg×4) · after 원가 $0.32 |

---

## 트랙 A — 실측 · 원가 · 전환

### 실측 metrics 개수

| 소스 | metrics |
|------|---------|
| 172cha-live-fashion | 4 |
| 168cha-live-living | 4 |
| 139cha-session-fashion | 4 |
| 139cha-session-electronics | 3 |
| 139cha-session-living | 3 |
| 139cha-session-food | 2 |
| 139cha-session-pet | 2 |
| **평균** | **3.14** |

템플릿 가이드(3~5)와 168 로그(`recraft-v4: $0.16` = 4×$0.04)와도 일치.

### 원가 (실측 평균 3.14 기준, 요금표 미수정)

| 티어 | before | after (v4-svg $0.08) | Δ/페이지 |
|------|--------|----------------------|----------|
| 프리미엄 (was v4 $0.04) | **$0.126** | **$0.251** | **+$0.126** |
| 비프리미엄 (was v3 $0.04) | **$0.126** | **$0.251** | **+$0.126** |

참고: checklist 9슬롯 flux-dev→v4-svg는 +$0.495였음. stat은 실측 개수가 작아 절대 증가폭이 훨씬 작음.

### 전환 범위 판단

**프리미엄 + 기본 모두 `recraft-v4-svg`.**

근거: (1) Δ≈+$0.13/페이지로 수용 가능 (2) 다이어그램·177 checklist 실루엣과 페이지 전체 언어 통일 (3) 프리미엄이 이미 기본 ON이라 실질 사용자는 대부분 해당 — 비프리미만 v3 배지로 남기면 격차가 남음.

### 코드

- `lib/concept-icons.ts` `modelForIconGroup("statInfographic")` → `"recraft-v4-svg"`
- `useDiagramSilhouette`는 이미 `model === "recraft-v4-svg"` — 추가 분기 복제 없음
- 폴백(156)·동시성 1+11s 유지
- `lib/premium-mode.ts` 주석만 동기화

### 스크린샷

| 파일 | 내용 |
|------|------|
| `178cha-stat-badge-vs-silhouette.png` | before=v4 배지 \| after=v4-svg 실루엣+tint (4쌍) |
| `178cha-stat-with-family.png` | stat + checklist(177) + diagram 같은 accent |
| `178cha-stat-smoke.png` | live after 4장 |

육안: after는 배지·다색 제거 → 단색 실루엣. family 보드에서 checklist/diagram과 **한 세트**로 읽힘(일부 stat은 방사형 디테일이 다이어그램 단순 드롭보다 풍부한 정도).

### 하드룰 파일 mtime

| 파일 | mtime | 변경 |
|------|-------|------|
| `lib/comparison-chart-guard.ts` | 2026-09-10T04:48:26.118Z | **불변** |
| `lib/assign-section-images.ts` | 2026-09-07T07:34:49.008Z | **불변** |

통계 수치 경로 미접촉 — 장식 아이콘 스타일만 변경.

---

## 트랙 B — elevation/그림자 감사 (**조사만 · 변경 없음**)

섹션/카드에 쓰이는 shadow·border·radius가 **단일 토큰이 아니라 여러 규칙이 공존**한다.

| 규칙 군 | 정의 위치 | 형태 | 쓰임 |
|---------|-----------|------|------|
| **섹션 inset 라인** | `design-tokens.getSectionInsetShadow` | `inset 0 2~3px 0 accent/deep` (패턴 B/D/E/A, C는 없음; 패션은 alpha↓) | 섹션 래퍼 (`DetailSectionRenderer` / export `sectionInset`) |
| **텍스트 패널 elevation** | `getTextPanelSurface` | outer `0 12px 40px deep@0.08` + border `accent@0.2` + radius **16** | brand/story 등 텍스트 카드 |
| **체크리스트 카드** | `DetailSectionRenderer` 인라인 | outer `0 10px 28px -14px deep@0.14` + border + **rounded-2xl(16)** | checklist 아이템 |
| **하이라이트 emphasis** | 인라인 | outer `0 16px 40px -16px rgba(27,27,24,0.5)` 또는 border only | highlight_box 강조 카드 |
| **칩/인증 inset** | 인라인 + export | `inset 0 -2px 0 accent` 또는 `inset 0 0 0 1px` | cert 칩, persona pill |
| **이미지 drop** | export 인라인 | `0 12px 32px -12px` / `0 16px 48px` / `0 20px 56px` (불투명도·blur 제각각) | 갤러리·이미지텍스트·원형 썸네일 |
| **스펙 썸네일** | export | `0 12px 32px -12px` + `border 1px` + 가변 radius | spec_table |
| **FAQ 카드** | export | border only, radius **12**, shadow 없음 | FAQ |
| **바 fill glow** | renderer | `0 2px 8px deep@0.35` (emphasis만) | comparison/stat bar |
| **CTA sticky** | `globals.css` / export | `0 -8px 24px` / pulse `0 10~18px 28~36px` | 하단 CTA·모션 |
| **radius 스케일** | 산재 | **6 / 12 / 14(bento) / 16 / 999(pill)** | 통일 토큰 없음 |

### 관찰 (변경 없음)

1. **문서화된 elevation 스케일 부재** — soft panel / card / emphasis / image가 각자 다른 blur·alpha.
2. **live↔export 대체로 대응**하나 값이 복제되어 drift 위험.
3. radius가 12 vs 16 vs 999로 섞여 “짜깁기” 체감 가능 — 아이콘 언어(174~178)와 별축의 다음 후보.
4. **이번 라운드 코드 변경 없음.**

---

## 변경 파일

- `lib/concept-icons.ts`
- `lib/premium-mode.ts` (주석)
- `scripts/178cha-stat-silhouette-verify.ts` *(new)*

## 하지 않은 것

- checklist/usage/highlight 재작업 없음
- 174~175 다이어그램 자산 재생성 없음
- specTable 미변경 (flux-schnell)
- 요금표 미수정
- elevation 규칙 **미변경** (조사만)
