import type { Page } from "playwright";
import sharp from "sharp";

/**
 * 252차 — Playwright `page.screenshot({ fullPage: true })`는 뷰포트를 문서 전체
 * 높이로 리사이즈한 뒤 캡처하는데, 이 과정에서 `position:sticky` 요소가
 * 레이아웃 좌표는 맞는데 페인트되지 않는 경우가 있음(cta_price에서 재현·확인).
 *
 * 실제 고객용 PNG 다운로드(`lib/capture-detail-png.ts` / html-to-image)는 이 문제가
 * 없음 — QA·벤치마크 fullPage 스크린샷에서만 캡처 직전에 호출할 것.
 */
export async function neutralizeStickyForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `.pagzly-cta{position:static !important;}
[style*="position:sticky"],[style*="position: sticky"]{position:static !important;}`,
  });
  // 인라인 computed sticky/fixed도 강제 (스타일 태그만으로 안 잡히는 케이스)
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const pos = getComputedStyle(el).position;
      if (pos === "sticky" || pos === "fixed") {
        el.style.setProperty("position", "static", "important");
        el.style.setProperty("top", "auto", "important");
        el.style.setProperty("bottom", "auto", "important");
      }
    });
    void document.body.offsetHeight;
  });
}

export type FullPageSafeOptions = {
  path: string;
  /** 스티치 타일 높이. 기본은 현재 뷰포트 높이 */
  tileHeight?: number;
};

/**
 * `fullPage: true` 대신 고정 뷰포트로 스크롤 스티치.
 *
 * Chrome/Playwright는 sticky를 static으로 바꿔도 fullPage(뷰포트=문서높이 리사이즈)
 * 캡처에서 CTA가 빈 배경으로 남는 경우가 있음. 고정 뷰포트 타일 합성은 페인트됨.
 */
export async function screenshotFullPageSafe(
  page: Page,
  opts: FullPageSafeOptions,
): Promise<void> {
  await neutralizeStickyForScreenshot(page);

  const viewport = page.viewportSize() ?? { width: 750, height: 1000 };
  const tileH = opts.tileHeight ?? viewport.height;
  const width = viewport.width;

  const scrollH = await page.evaluate(() =>
    Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
  );

  const ys: number[] = [];
  for (let y = 0; y + tileH < scrollH; y += tileH) ys.push(y);
  const lastY = Math.max(0, scrollH - tileH);
  if (ys.length === 0 || ys[ys.length - 1] !== lastY) ys.push(lastY);

  const tiles: { y: number; buf: Buffer }[] = [];
  for (const y of ys) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(50);
    const buf = await page.screenshot({ type: "png", fullPage: false });
    tiles.push({ y, buf });
  }

  const canvasH = Math.max(scrollH, lastY + tileH);
  const composed = await sharp({
    create: {
      width,
      height: canvasH,
      channels: 3,
      background: { r: 250, g: 248, b: 243 },
    },
  })
    .composite(tiles.map((t) => ({ input: t.buf, top: t.y, left: 0 })))
    .png()
    .toBuffer();

  await sharp(composed)
    .extract({ left: 0, top: 0, width, height: scrollH })
    .png()
    .toFile(opts.path);

  await page.evaluate(() => window.scrollTo(0, 0));
}
