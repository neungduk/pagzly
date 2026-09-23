# 252차 — QA 풀페이지 스크린샷에서 `position:sticky`(cta_price) 미출력 버그 (오탐 정정 포함)

생성: 2026-09-23 · 유료 API **0건** (기존 247/248차 자산 재사용, 신규 생성 없음)

## 이 문서가 정정하는 것 (먼저 읽어주세요)

248차 QA 스크린샷(`review/248cha-export-full.png`)을 다시 보다가 "페이지 맨 끝에 `cta_price`
(가격/대상고객/인증배지 섹션)가 통째로 안 보인다"는 걸 발견하고, 처음엔 **"DeepSeek이
cta_price 섹션 생성을 아예 빼먹었다"**는 가설로 조사를 시작했습니다. 그런데 실제
`session.json`의 `generated.sections` 배열(28개)을 직접 열어보니 **`cta_price`는 마지막
(28번째, `ai_disclosure` 바로 다음)에 `price: 34800, badges: 4개, targetCustomer` 값까지
전부 정상적으로 들어있었습니다.** 즉 "생성 누락" 가설은 **틀렸습니다** — 이 문서는 그 대신
실제 원인(아래)을 코드로 재현·검증한 결과입니다. 혼선 드려서 정정합니다.

## 실제 원인 — Playwright `fullPage` 스크린샷이 `position:sticky` 요소를 그리지 않음

`lib/export-detail-html.ts` 1284행:
```css
.pagzly-cta{position:sticky;bottom:0;z-index:20;box-shadow:${ELEVATION.ctaSticky}}
```
`cta_price` 섹션(849행)은 이 클래스를 씁니다. 실제 브라우저에서 일반 뷰포트로 열면 정상
렌더됩니다(직접 확인: `getBoundingClientRect()` → `top:554, bottom:900, height:345,
visibility:visible, opacity:1`, 문제 없음). **문제는 Playwright의
`page.screenshot({ fullPage: true })`가 내부적으로 뷰포트를 문서 전체 높이(19,438px)로
리사이즈한 뒤 캡처하는 방식**입니다. 뷰포트를 전체 높이로 리사이즈한 후 다시
`getBoundingClientRect()`를 찍어보면 좌표는 정상(`top:19092, bottom:19438` — 문서 맨 끝,
레이아웃상 맞는 위치)인데도, **실제 캡처된 PNG에는 그 영역이 완전히 빈 배경색으로만
나옵니다.** 즉 레이아웃 좌표는 맞는데 페인트(합성)가 안 되는, Chromium/Playwright의
`position:sticky` + 리사이즈-후-캡처 조합에서 알려진 렌더링 버그입니다.

**직접 재현 완료**: `review/247cha-recovered/showcase.html`(실제 247차 생성물, 신규 생성
없음)을 그대로 Playwright `fullPage` 스크린샷으로 찍으면 248차와 똑같이 `cta_price`가
사라짐(`before-broken-tail.png` 첨부 — ai_disclosure 뒤 빈 크림색 공간 → 바로 footer).

## 중요 — 실제 고객이 받는 PNG 다운로드는 이 버그와 무관함 (직접 검증)

Pagzly의 진짜 판매자용 "PNG로 다운로드" 기능(`lib/capture-detail-png.ts`)은 Playwright가
아니라 **`html-to-image`의 `toPng()`**를 라이브 React DOM에 직접 씁니다 — 캡처 메커니즘
자체가 다릅니다. `showcase.html`의 실제 마크업(같은 `.pagzly-cta` sticky 스타일 포함)을
그대로 떼어내 `html-to-image`로 캡처해봤더니 **`cta_price`가 정상적으로 렌더됩니다**
(₩34,800·대상고객·배지 4개 전부 보임 — `customer-png-export-unaffected-tail.png` 첨부).
서버 코드(`app/api/`, `lib/`) 전체를 grep해도 Playwright/Puppeteer로 export HTML을
이미지화하는 고객용 경로는 없습니다 — 이 문제는 **전적으로 QA용 스크린샷 스크립트에만
있는 도구 버그**이고, 실제 판매자 다운로드물에는 영향이 없습니다.

**단, 이게 왜 중요하냐면**: `scripts/` 안에 `fullPage: true`를 쓰는 스크린샷 스크립트가 이미
6개 있습니다(`219cha-clamp-overflow-verify.ts`, `66cha-lifestyle-e2e-qa.ts`,
`generate-beauty-showcase-one.ts`, `capture-58cha-preview.ts`,
`139cha-regression-qa.ts`, `181cha-live-generate.ts`, 그리고 이번 248차 스크립트까지) —
이 프로젝트가 지금까지 진행한 수많은 시각 검수 라운드 중 `cta_price`처럼 `position:sticky`가
걸린 섹션이 찍힌 스크린샷은 전부 **소리 없이 빈 화면으로 나왔을 가능성**이 있습니다. 즉
"버그가 있는데 스크린샷에 안 잡혀서 아무도 몰랐던" 사각지대였고, 이번에 제가 하마터면
그 사각지대 때문에 "생성 자체가 누락됐다"는 잘못된 결론으로 브리프를 쓸 뻔했습니다.

## 수정 지시 (제품 코드 변경 없음 — QA 스크립트 전용, 위험도 최저)

**`lib/export-detail-html.ts`나 `components/DetailSectionRenderer.tsx`는 건드리지
마세요** — 실제 제품(라이브 사이트, 고객 PNG 다운로드) 쪽은 버그가 없는 게 확인됐으므로
그대로 둡니다. 수정 범위는 **QA 스크린샷 스크립트뿐**입니다.

1. 새 공용 헬퍼 `scripts/lib/neutralize-sticky.ts` 생성:
   ```ts
   import type { Page } from "playwright";

   /**
    * 252차 — Playwright fullPage 스크린샷은 position:sticky 요소를 레이아웃상
    * 좌표는 맞는데 실제로 페인트하지 않는 경우가 있음(cta_price에서 재현·확인).
    * 실제 고객용 PNG 다운로드(html-to-image 기반)는 이 문제가 없음 — QA용
    * fullPage 스크린샷 스크립트에서 캡처 직전에만 호출할 것.
    */
   export async function neutralizeStickyForScreenshot(page: Page): Promise<void> {
     await page.addStyleTag({
       content: `.pagzly-cta{position:static !important;}
   [style*="position:sticky"],[style*="position: sticky"]{position:static !important;}`,
     });
   }
   ```
2. `page.screenshot({ fullPage: true, ... })` 호출 **직전**에 항상
   `await neutralizeStickyForScreenshot(page);`을 추가 — 앞으로 새로 작성하는 모든
   QA/벤치마크 스크린샷 스크립트에 이 패턴을 기본으로 넣어주세요(스크립트 상단 주석에
   "왜 필요한지" 한 줄 남기면 다음 라운드에서 또 헷갈리지 않습니다).
3. 기존 6개 스크립트는 일회성 검증이 이미 끝난 것들이라 **소급 수정은 불필요**합니다.
   다만 다음에 `cta_price`나 다른 `position:sticky` 섹션이 걸린 페이지를 다시
   스크린샷해야 할 일이 생기면(예: 253차 이후 재검수) 이 헬퍼를 쓰세요.

## 검증 (유료 API 없음)

새 스크립트 `scripts/252cha-sticky-screenshot-verify.ts`에서:
1. `review/247cha-recovered/showcase.html`(기존 파일, 신규 생성 없음)을 Playwright로 열고
   `neutralizeStickyForScreenshot()` **적용 전** `fullPage` 스크린샷 → `cta_price` 영역이
   비어있는지 확인(회귀 재현, `before-broken-tail.png`와 동일해야 함).
2. 같은 페이지에서 `neutralizeStickyForScreenshot()` **적용 후** `fullPage` 스크린샷 →
   `cta_price`의 `₩34,800`·`20~30대 여성`·배지 4개 텍스트가 스크린샷 픽셀에 실제로
   존재하는지(OCR 또는 해당 좌표의 색상이 `#743E24` 배경인지 픽셀 샘플링) assert.
3. `review/252cha-report.md`에 이번 문서의 before/after/customer-export 3장 스크린샷 비교 +
   assert 결과 + `git diff --stat` 포함. **cta_price 자체는 제품에 이미 존재/정상 작동하고
   있었다는 점, 이번 라운드가 정정한 것뿐이라는 점을 리포트 첫 줄에 명시**해주세요 — 다음
   라운드에서 같은 오탐을 반복하지 않기 위함입니다.

API generate: **0**.
