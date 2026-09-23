# 184차 — FONT_SIZE·ELEVATION 스케일 축소 (API 0)

생성: 2026-09-15  
가드레일: 생성 API **0회**. 기준선 = `review/183cha-export/after-*.html` (UTF-8 재고정 후, micro 병합만 델타).

---

## 트랙 A — FONT_SIZE

### 병합 후보표

| 쌍 | 값 | 결정 | 사유 |
|----|-----|------|------|
| `diagramTick` 9px / `micro` 9.5px | 0.5px | **병합 → 9px** | radius pill급 근접; bento soft label만 영향 |
| `diagramEmph` / `label` | 둘 다 10px | **별칭** | 동일값 |
| `diagramTitle` / `caption` | 둘 다 11px | **별칭** | 동일값 (diagram-icons → caption) |
| `diagramLabel` / `xs` | 둘 다 12px | **별칭** | 동일값 |
| `bentoValue` / `body` | 둘 다 15px | **별칭** | 동일값 |
| `root` / `bodyLg` | 둘 다 16px | **별칭** | 동일값 |
| `statBarValue` / `section` | 둘 다 1.5rem | **별칭** | 동일값 |
| `heroDisplay` / `statNumber` | 둘 다 3rem | **별칭 → `display`** | 동일값, 역할명만 다름 |
| `bodySm` 14 / `body` 15 | 1px | **병합 안 함** | 본문 위계 단계 |
| `checkMark` 18 / `bentoValueHero` 19 | 1px | **병합 안 함** | ✓ vs bento 강조 위계 |
| `sectionXs` 1.25 / `sectionSm` 1.35 | ~1.6px | **병합 안 함** | 소제목 위계 |
| `seoH2` 1rem / `bodyLg` 16px | 수치≈동일 | **병합 안 함** | rem 상속 의도 유지 |
| `price` 2.25 / `sectionXl` 2 / `display` 3 | — | **병합 안 함** | 가격·섹션·디스플레이 위계 |
| `brandMono` 1.15rem | — | **유지** | 워드마크 전용 |
| clamps | — | **유지** | 반응형 메가키워드 |

### 새 스케일 이름 (canonical)

`micro` → `label` → `caption` → `xs` → `sm` → `bodySm` → `body` → `bodyLg` → `checkMark` → `sectionXs`/`sectionSm`/`section`/`sectionLg`/`sectionXl` → `price` → **`display`**

역할 별칭은 동일 문자열을 가리킴 (`diagramTitle`→`caption` 등).

### sha256 (183 after 기준선 vs 184 re-export)

| cat | hashSame | font-size 델타 |
|-----|----------|----------------|
| fashion | **true** | 없음 |
| food | **true** | 없음 |
| electronics | **true** | 없음 |
| beauty | false | `9.5px` −2 → `9px` +2 |
| living | false | `9.5px` −1 → `9px` +1 |
| pet | false | `9.5px` −2 → `9px` +2 |

의도 외 font/box-shadow 델타 **0** (`scripts/184cha-assert-scale.ts`).

---

## 트랙 B — ELEVATION

### 규칙군 → 4단계

| 단계 | 값 | 흡수 |
|------|-----|------|
| **subtle** | `0 2px 8px accent@0.35` | `barFillGlow` |
| **card** | `0 12px 32px -12px ink@0.28` | `imageThumb` ← **`specThumbMulti` 병합** (구 10/28/-10@0.24) |
| **emphasis** | `0 16px 40px -16px ink@0.5` | `highlightEmphasis` |
| **sticky** | `0 -8px 24px ink@0.15` | `ctaSticky` |

### 병합 / 유지

| 항목 | 결정 | 사유 |
|------|------|------|
| `specThumbMulti` → `card`/`imageThumb` | **병합** | blur/spread/alpha 근접 (live TW) |
| `badgeRing` ≡ `swatchRing` | **`hairlineRing` 별칭** | 동일 식 |
| `pulseCardKey0` → `pulseCardRest` | **병합** | alpha 0.4→0.45 (`globals.css` 동기) |
| `checklistCard` (accent tint) | **유지** | card와 색 채널 다름 |
| `imageLift` / `imageSoft` | **유지** | 이미지 깊이 위계 |
| `ctaButton` | **유지** | emphasis와 blur/alpha 위계 다름 |
| rings (`cert*`/`persona*`) | **유지** | drop이 아닌 inset/hairline |
| `getSectionInsetShadow` / `getTextPanelSurface` | **미수정** | 179와 동일 |

### TW_ELEVATION 동기화

`DetailSectionRenderer` 리터럴 = `ELEVATION.tw*`  
`twSpecThumbMulti` === `twImageThumb` (`shadow-[0_12px_32px_-12px_rgba(27,27,24,0.28)]`)  
기동 시 drift throw 메시지 `[184]`.

### sha256 / 스니펫

- export HTML: **box-shadow 델타 0** (specThumb 병합은 live 전용)
- beauty 스니펫: `font-size:9.5px` → `9px` (bento 라벨만)

---

## 공통

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | **0** |
| 이미지·카피 생성 API | **0** |
| assert | `review/184cha-value-assert.json` |
| 산출 HTML | `review/184cha-export/after-*.html` |

### 코드

- `lib/design-tokens.ts` — `FONT_SIZE` / `ELEVATION` 스케일
- `components/DetailSectionRenderer.tsx` — TW sync
- `app/globals.css` — pulse Key0
- `lib/diagram-icons.ts`, `detail-typography.ts`, `spec-bento-grid.ts` — canonical 토큰명
- `scripts/184cha-assert-scale.ts`
