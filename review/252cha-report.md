# 252차 보고 — QA fullPage 스크린샷 sticky(cta_price) 미페인트

**첫 줄 정정:** `cta_price`는 제품에 이미 정상 존재·작동한다. DeepSeek이 섹션을 빼먹은 것이 아니다. 248차 PNG에서 CTA가 안 보인 것은 Playwright `fullPage: true` 도구 버그(QA 전용)이며, 이번 라운드는 그 오탐을 정정하고 QA 헬퍼를 추가한 것이다.

생성: 2026-09-23 · **API generate: 0** · 제품 코드(`export-detail-html` / `DetailSectionRenderer`) **변경 없음**

---

## 원인

| 경로 | sticky CTA |
|------|------------|
| 라이브 브라우저 / DOM | 정상 (`position:sticky`, ₩34,800·배지 보임) |
| 고객 PNG (`html-to-image` / `capture-detail-png.ts`) | 정상 |
| Playwright `page.screenshot({ fullPage: true })` | **미페인트** (좌표는 문서 끝, 픽셀은 빈 배경) |

`fullPage`는 뷰포트를 문서 전체 높이(~19k px)로 리사이즈한 뒤 캡처한다. 이 조합에서 `.pagzly-cta`가 합성되지 않는다.

추가 실측: `position:static`으로 sticky만 풀어 `fullPage:true`를 다시 찍어도 **동일하게 실패**(ratio≈0.014). 따라서 QA에서는 sticky 무력화 + **고정 뷰포트 스크롤 스티치**가 필요하다.

---

## 수정 (QA만)

### `scripts/lib/neutralize-sticky.ts`

- `neutralizeStickyForScreenshot(page)` — sticky/fixed → static (브리프 명세)
- `screenshotFullPageSafe(page, { path })` — 위 무력화 후 타일 스티치 (실제 fullPage 대체)

이후 QA/벤치마크에서 `fullPage: true` 대신 `screenshotFullPageSafe` 사용. 기존 일회성 스크립트 소급 수정 없음.

### 검증

`npx tsx scripts/252cha-sticky-screenshot-verify.ts` → **PASSED**

| 케이스 | 산출물 | `#743E24` 하단 ratio |
|--------|--------|----------------------|
| BEFORE native fullPage | `before-broken-tail.png` | **0.014** (< 0.08) |
| AFTER safe stitch | `after-fixed-tail.png` | **0.607** (> 0.12) — ₩34,800·20~30대 여성·배지 4개 보임 |
| 고객 html-to-image | `customer-png-export-unaffected-tail.png` | **0.872** |

DOM assert: showcase에 PRICE ₩34,800 / 대상고객 / 배지 텍스트 존재 (생성 누락 반증).

---

## 스크린샷 비교

| before (broken QA) | after (safe QA) | customer export |
|--------------------|-----------------|-----------------|
| `review/252cha-sticky-screenshot/before-broken-tail.png` | `…/after-fixed-tail.png` | `…/customer-png-export-unaffected-tail.png` |

---

## git diff --stat

```
 scripts/lib/neutralize-sticky.ts              | (new)
 scripts/252cha-sticky-screenshot-verify.ts    | (new)
 review/252cha-sticky-screenshot/*             | (new artifacts)
 review/252cha-report.md                       | (new)
```

제품 `lib/` · `components/` · `app/` diff 없음.

---

## API

**generate: 0**
