# 182차 — 폰트 사이즈 불일치 수정 + 타이포 토큰 감사 ($0)

생성: 2026-09-15

## 요약

| 항목 | 결과 |
|------|------|
| 이미지·카피 생성 API | **0회** (하드 가드레일 준수) |
| 트랙 A | `brand_story` / `caution` / `ai_disclosure` 섹션 타이틀 → `TYPO.sectionTitle` · export NOTICE/STORY → `1.5rem` |
| 트랙 B | `FONT_SIZE` 상수화 · 값 불변 이관 (Track A 2곳 제외) |
| 증빙 | export HTML **Track A revert 시 sha256 = before** 6/6 · size delta = `1.25/1.35/1.5rem`만 |
| `npx tsc --noEmit` | **0** |

---

## 트랙 A — 발견된 불일치 · 수정

### 육안 (181 `*-full.png` 6장)

전 카테고리 공통으로 **하단/중상단 신뢰·스토리 섹션 헤드라인**이 FAQ·스펙·차트 등 이웃 섹션보다 눈에 띄게 작음.

| 카테고리 | 위치 | 증상 |
|----------|------|------|
| beauty~pet 공통 | brand_story (STORY) | 본문 섹션 타이틀보다 한 단계 작음 |
| beauty~pet 공통 | caution (NOTICE / 주의사항) | FAQ(`TYPO.sectionTitle`) 대비 현저히 작음 |
| beauty~pet 공통 | ai_disclosure | 동일 (live만 · export 스킵 섹션) |

### 원인 코드

| 파일 | 문제 |
|------|------|
| `components/DetailSectionRenderer.tsx` | `brand_story` / `caution` / `ai_disclosure` 헤드가 `text-lg sm:text-xl` 하드코딩 — 다른 섹션은 `TYPO.sectionTitle` (`text-[2rem]` / `sm:text-[2.75rem]`) |
| `lib/export-detail-html.ts` | caution `font-size:1.25rem`, brand_story `1.35rem` — FAQ 등 표준 export 섹션 타이틀은 `1.5rem` |

### 수정

- live 3곳 → `TYPO.sectionTitle`
- export caution / brand_story → `FONT_SIZE.section` (`1.5rem`)

### 전/후 (181 저장 세션 · 로컬 export 렌더)

| | before | after |
|--|--------|-------|
| beauty NOTICE h2 | `1.25rem` | `1.5rem` |
| beauty STORY h2 | `1.35rem` | `1.5rem` |
| 스크린샷 | `review/qa-screenshots/182cha-before-{cat}-export-*.png` | `182cha-after-{cat}-export-*.png` |
| HTML | `review/182cha-export/before-*.html` | `after-*.html` |

---

## 트랙 B — font-size 전수 · 토큰화

### `FONT_SIZE` (`lib/design-tokens.ts`)

| 토큰 | 값 | 용도 |
|------|-----|------|
| micro | 9.5px | bento soft label |
| diagramTick | 9px | 다이어그램 눈금 |
| label | 10px | 배지·컬럼 라벨 |
| caption / diagramTitle | 11px | 섹션 라벨·다이어그램 타이틀 |
| xs | 12px | 칩·보조 |
| sm | 13px | step body 등 |
| bodySm | 14px | 본문 소 |
| body / bentoValue | 15px | 본문 |
| bodyLg / root | 16px | 본문 대·root |
| checkMark | 18px | ✓/✗ |
| bentoValueHero | 19px | bento 강조 값 |
| sectionXs | 1.25rem | keyword 잔여 등 |
| sectionSm | 1.35rem | compact 소제목 |
| section | 1.5rem | export 섹션 타이틀 표준 |
| sectionLg | 1.75rem | feature 타이틀 |
| sectionXl | 2rem | callout/hero |
| price | 2.25rem | 가격 |
| statNumber | 3rem | 스탯 숫자 |
| keywordClamp* / categoryKeyword | clamp(...) | 메가 키워드 |
| brandMono | 1.15rem | 영문 워드마크 |
| footnoteSup | 0.6em | 각주 |

### 배선 지점

- `lib/export-detail-html.ts` — 인라인 `font-size` → `FONT_SIZE.*`
- `lib/diagram-icons.ts` — `diagramTitleWithIconHtml`
- `lib/spec-bento-grid.ts` — bento 라벨/값
- `lib/detail-typography.ts` — body root
- `lib/hero-brand-mark.ts` — export 워드마크
- live `TYPO` — JIT용 클래스 리터럴 유지 + FONT_SIZE 대응 주석

### 값 스케일 축소

**미실시** (180 radius처럼 다음 라운드 후보만).

### 「Track A 외 변화 없음」 증빙

`npx tsx scripts/182cha-assert-font-values.ts` → `review/182cha-value-assert.json`

- after HTML에서 NOTICE/STORY 타이틀만 before 값으로 되돌리면 **sha256 == before** (6/6)
- `font-size` 카운트 변화 키 = `1.25rem` / `1.35rem` / `1.5rem` 뿐, 순증감 +2 / −1 / −1
- `${FONT_SIZE` 리터럴 누수 **0**

---

## 공통

| 항목 | 값 |
|------|-----|
| 이미지 생성 API 호출 | **0** |
| `/api/generate` | **0** |
| Replicate / Claude / DeepSeek | **0** |
| `npx tsc --noEmit` | **0** |

## 산출물

- 코드: `lib/design-tokens.ts` (`FONT_SIZE`), renderer/export/diagram/bento/hero/typography
- 스크립트: `scripts/182cha-export-verify.ts`, `182cha-assert-font-values.ts`, patch helpers
- 보고서: 본 파일 · `review/182cha-value-assert.json`
