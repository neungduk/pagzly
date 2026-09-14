# 180차 — radius 4단계 정리 + live/export drift 통일 (이미지 API 0)

생성: 2026-09-14

## 요약

| 항목 | 결과 |
|------|------|
| 트랙 A | export bento `14` → `RADIUS.lg(16)` · live `SpecBentoGrid`도 `RADIUS.lg` — **live 기준 정렬** |
| 트랙 B | `RADIUS = hairline/sm/md/lg/pill` · `circle(9999)` → `pill(999)` (`hero-brand-mark` 포함) |
| 트랙 C | `imageLift` / `imageSoft` / `ctaSticky` — **export 값으로 live 통일** |
| `npx tsc --noEmit` | **EXIT 0** |
| 값 assert | `npx tsx scripts/180cha-assert-values.ts` **통과** |
| 이미지 생성 API | **0** |

---

## 트랙 A — bento 14→16

### 변경
- `lib/spec-bento-grid.ts`: `RADIUS.bento(14)` → `RADIUS.lg(16)`
- `components/SpecBentoGrid.tsx`: `rounded-2xl` 대신 `borderRadius: RADIUS.lg` (동일 16)

### 검증
139차 6픽스처 HTML에는 bento 미출력(`quickFacts < 2`) → 페이지 단위 14→16 픽셀 비교 불가.  
의도한 변화는 **스니펫 before/after**로 증명:

| | 파일 |
|--|------|
| before (14) | `review/qa-screenshots/180cha-bento-before.png` · `review/180cha-pixel/bento-before-snippet.html` |
| after (16) | `review/qa-screenshots/180cha-bento-after.png` · `review/180cha-pixel/bento-after-snippet.html` |

HTML: `border-radius:14px` → `border-radius:16px`. live/export 동일 토큰.

6카테고리 export 전후 스크린샷(페이지): `review/qa-screenshots/180cha-{before,after}-{cat}-export.png` — bento 미포함이라 이 축에서는 변화 없음(정상).

---

## 트랙 B — radius 4단계

### 토큰

| 토큰 | px | 구 이름/값 |
|------|-----|------------|
| `hairline` | 2 | 유지 |
| `sm` | 6 | `chip` |
| `md` | 12 | `media` |
| `lg` | 16 | `card` · **bento(14→16)** |
| `pill` | 999 | `pill` + **`circle(9999)` 흡수** |

### 교체 지점 (상세 페이지 축)

| 구 | 신 | 위치 |
|----|-----|------|
| `RADIUS.chip` | `sm` | `export-detail-html.ts` 스펙 칩 등 |
| `RADIUS.media` | `md` | export FAQ·step·gallery·테이블 |
| `RADIUS.bento` | `lg` | `spec-bento-grid.ts` |
| `RADIUS.card` | `lg` | export 카드/패널 전역 |
| `RADIUS.pill` | `pill` | chips/CTA/bars |
| `RADIUS.circle` / `9999` | `pill` | 원형 아바타 경로 + **`hero-brand-mark.ts` wordmark wrap** |
| live `rounded-md/xl/2xl/full` | 스케일 매핑 유지 (6/12/16/999) | `DetailSectionRenderer` 등 — 숫자 불변 |

### 픽셀 / HTML

| 검증 | 결과 |
|------|------|
| export HTML | 6/6 **changed** — 각 1곳 `border-radius:9999px` → `999px` (wordmark) |
| export PNG before↔after (viewport 430 고정) | **6/6 diffPixels=0** — 9999↔999는 원형에서 시각 동일 (기대와 일치) |
| live before | 미캡처(before 시점 live 서버/뷰포트 불일치) → after live만 보관 |

스크린샷: `review/qa-screenshots/180cha-{before,after}-*-export.png`, `180cha-after-*-live.png`

---

## 트랙 C — live/export drift 통일 (export 기준)

### 수치 표 (before → after 통일값)

| 쌍 | before live | before export | **after (통일)** |
|----|-------------|---------------|------------------|
| imageLift | `0 20px 56px -16px rgba(27,27,24,0.22)` | `0 20px 56px rgba(deepAccent,0.14)` | **`0 20px 56px ${hexToRgba(deepAccent,0.14)}`** |
| imageSoft | `0 16px 48px -12px rgba(27,27,24,0.18)` | `0 16px 48px rgba(deepAccent,0.12)` | **`0 16px 48px ${hexToRgba(deepAccent,0.12)}`** |
| ctaSticky | TW `0_-8px_24px_-8px_rgba(27,27,24,0.2)` | CSS `0 -8px 24px rgba(27,27,24,.15)` | **`0 -8px 24px rgba(27,27,24,.15)`** (+ live TW 동일) |

live 구현: `DetailSectionRenderer`에서 imageLift/Soft는 `style={{ boxShadow: ELEVATION.imageLift/Soft(theme.deepAccent) }}`, CTA는 `TW_ELEVATION.ctaSticky` = export.

### 스크린샷
6카테고리 after live + export:  
`review/qa-screenshots/180cha-after-{cosmetics,fashion,food,electronics,living,pet}-{live,export}.png`

(캡처 경로·크롭이 달라 live↔export 픽셀 1:1 동일은 기대하지 않음. 그림자 소스 문자열은 assert로 단일화 확인.)

---

## 공통 검증

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | EXIT 0 |
| `scripts/180cha-assert-values.ts` | RADIUS 4단계 · image/CTA export 값 · textPanel 미건드림 |
| `scripts/180cha-radius-drift-verify.ts` | after 재캡처 + diff.json |
| 이미지 생성 API 호출 | **0** |

### 손대지 않음
`getSectionInsetShadow` / `getTextPanelSurface` 및 그 외 elevation · 아이콘 · `comparison-chart-guard` · `assign-section-images` · 요금표

---

## 변경 파일

- `lib/design-tokens.ts` — RADIUS 4단계 + ELEVATION image/CTA 단일화
- `lib/export-detail-html.ts` — 토큰 rename 반영
- `lib/spec-bento-grid.ts` — bento→lg
- `lib/hero-brand-mark.ts` — wordmark `RADIUS.pill`
- `components/SpecBentoGrid.tsx` — `RADIUS.lg`
- `components/DetailSectionRenderer.tsx` — image style + CTA TW = export
- `scripts/180cha-*.ts` — assert / verify / bento snippet / rename
