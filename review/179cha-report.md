# 179차 — elevation/radius 단일 토큰화 (값 불변)

생성: 2026-09-14

## 요약

| 항목 | 결과 |
|------|------|
| 트랙 A | `RADIUS` + `ELEVATION` 상수화 · live/export 배선 · **숫자값 변경 없음** |
| 검증 | Round1 export HTML **sha256 6/6 동일** → 스타일 문자열 불변 증명 |
| 값 assert | `npx tsx scripts/179cha-assert-elevation-values.ts` **통과** |
| `npx tsc --noEmit` | **EXIT 0** |
| 이미지 API | **0** |
| 트랙 B | radius 정리안 **제안만** (코드 미변경) |

---

## 트랙 A — 상수화한 규칙군

| 178 규칙 군 | 토큰 | 비고 |
|-------------|------|------|
| 섹션 inset 라인 | *(기존)* `getSectionInsetShadow` | 미이동 |
| 텍스트 패널 elevation | *(기존)* `getTextPanelSurface` | 미이동 · radius만 `RADIUS.card` |
| 체크리스트 카드 | `ELEVATION.checklistCard` | live style |
| 하이라이트 emphasis | `ELEVATION.highlightEmphasis` | live |
| 칩/인증 inset | `certUnderline` / `certRing` / `personaRing` / `badgeRing` / `swatchRing` 등 | live+export |
| 이미지 drop | `imageThumb` / `imageLiftExport` / `imageSoftExport` / `imageLiftLive` / `imageSoftLive` | live↔export 기존 drift **유지** |
| 스펙 썸네일 | `imageThumb` + `specThumbBorder` / `twSpecThumb*` | |
| FAQ 카드 | `RADIUS.media` (shadow 없음) | |
| 바 fill glow | `ELEVATION.barFillGlow` | live |
| CTA sticky | `ctaSticky`(export) / `twCtaSticky`(live) | 값·spread 다름 — 기존 drift |
| radius 스케일 | `RADIUS.{hairline,chip,media,bento,card,pill,circle}` | 2/6/12/14/16/999/9999 |

pulse-card (`globals.css`)는 CSS←TS import 불가 → 값 동일 문자열을 `ELEVATION.pulseCard*`에 문서화 + CSS 주석.

### live TW JIT

`ELEVATION.tw*`만 `design-tokens.ts`에 두면 Tailwind v4가 클래스를 누락할 수 있음.  
`DetailSectionRenderer`에 `TW_ELEVATION` **리터럴 복제** + 기동 시 drift throw로 동기 보장.

### 교체 지점 (대표)

**`lib/design-tokens.ts`** — `RADIUS`, `ELEVATION` 정의  
**`lib/export-detail-html.ts`** — `RADIUS.*` / `ELEVATION.*` (textPanel·trust·checklist·steps·image·spec·FAQ·CTA 등)  
**`components/DetailSectionRenderer.tsx`** — checklist/bar/cert/persona/highlight + `TW_ELEVATION.*`  
**`lib/spec-bento-grid.ts`** — `RADIUS.bento`  
**`app/globals.css`** — pulse 주석만 (값 불변)

---

## 픽셀 / HTML 검증

### Round 1 (올바른 베이스라인 — 동일 design-tokens 트리에서 배선만 변경)

| 검증 | 결과 |
|------|------|
| export HTML sha256 | **6/6 identical** (cosmetics/fashion/food/electronics/living/pet) |
| export PNG | 약 **0.01%** 픽셀 차이 (HTML 동일 → 폰트 AA·원격 이미지 노이즈) |
| live PNG | TW 클래스 누락으로 대량 diff → `TW_ELEVATION` 리터럴로 수정 |

→ **시각 값 변화 0** (export는 HTML 해시로 확정).

### Round 2 (무효)

`git stash`가 `design-tokens.ts` 전체를 HEAD로 되돌려 **패턴 그라데이션 등 무관 코드**까지 바뀜 → HTML/픽셀 비교 오염. 판정에 사용하지 않음.

### 값 assert (최종)

`review/179cha-value-assert.json` — RADIUS/ELEVATION 리터럴 = 전환 전 값, 6픽스처 HTML에 `border-radius:16px` / `999px` / CTA sticky 문자열 존재, 템플릿 잔존 없음.

스크린샷: `review/qa-screenshots/179cha-{before,after}-{cat}-{export,live}.png`

---

## 트랙 B — radius 정리안 (**코드 변경 없음**)

현재 → 제안 스케일 (180차 판단용):

| 현재 | 제안 토큰 | px | 용도 |
|------|-----------|-----|------|
| 2 | `sm` 또는 hairline 유지 | 2 | 액센트 바 |
| 6 (`rounded-md`≈6) | **`sm`** | 6 | 스펙 칩, UI 버튼 |
| 12 | **`md`** | 12 | 미디어·FAQ·테이블 |
| 14 (export bento만) | **`md`로 흡수** 또는 `mdPlus` | 12 또는 16 | live SpecBento는 이미 `rounded-2xl`(16) — **14→16 정렬 후보** |
| 16 (`rounded-2xl`) | **`lg`** | 16 | 카드·텍스트 패널 |
| 999 / 9999 | **`pill`** | 999 | 칩·버튼·원형(9999→999 동등) |

### 호출 지점 목록 (상세 페이지 축)

| 값 | 위치 |
|----|------|
| 6 / chip | `export-detail-html.ts:637` · live `DetailSectionRenderer.tsx:2120` (`rounded-md`) |
| 12 / media | export FAQ·step·gallery 다수 (`RADIUS.media`) · live `rounded-xl` (~12) 예: `:2939`, `:3320`, `:3404` |
| 14 / bento | `spec-bento-grid.ts:44,49` — live `SpecBentoGrid.tsx`는 `rounded-2xl`(16) **불일치** |
| 16 / card | export `RADIUS.card` 전역 · live `rounded-2xl` 예: `:718`, `:1471`, `:1618`, `:2373` |
| 999 / pill | export `RADIUS.pill` · live `rounded-full` 예: `:970`, `:1471` 인근 chips, `:3471`, CTA |
| 9999 / circle | export 원형 아바타 (`RADIUS.circle`) — pill과 병합 후보 |

180차에서 실제 px를 바꿀지(특히 **bento 14↔16 live/export 정렬**) 결정.

---

## 변경 파일

- `lib/design-tokens.ts` — `RADIUS`, `ELEVATION`
- `lib/export-detail-html.ts`
- `components/DetailSectionRenderer.tsx`
- `lib/spec-bento-grid.ts`
- `app/globals.css` (주석만)
- `scripts/179cha-elevation-pixel-compare.ts` / `179cha-assert-elevation-values.ts`

## 하지 않은 것

- 그림자/radius **숫자값** 변경 없음
- 아이콘 파일·comparison-chart-guard·assign-section-images·요금표 미수정
- 트랙 B 코드 변경 없음
