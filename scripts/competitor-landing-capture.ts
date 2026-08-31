/**
 * 경쟁사 랜딩 풀페이지 스크린샷 — scripts/competitor-gap-scan.ts, marketplace-pdp-scan.ts 공용.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const SCREEN_DIR = path.join(__dirname, "..", "review", "competitor-screens");

export async function captureCompetitorLanding(
  slug: string,
  url: string,
): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
  fs.mkdirSync(SCREEN_DIR, { recursive: true });
  const outPath = path.join(SCREEN_DIR, `${slug}-landing.png`);

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: outPath, fullPage: true });
    return { ok: true, path: outPath };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, reason };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
