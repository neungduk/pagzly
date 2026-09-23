/**
 * 181차 — Behance food/pet 딥스크롤 재캡처 (프로젝트 본문 UI 프레임).
 *   npx tsx scripts/181cha-behance-deep.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = path.join(__dirname, "..", "review", "qa-screenshots");

const REFS = [
  {
    key: "food",
    url: "https://www.behance.net/gallery/245412913/Wellness-Supplement-Product-Page-UI-Design",
    scrolls: [900, 2000, 3200],
  },
  {
    key: "pet",
    url: "https://www.behance.net/gallery/242350037/Pawcare-Shopify-Store-Website-Design",
    scrolls: [800, 1800],
  },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  for (const ref of REFS) {
    await page.goto(ref.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(4000);
    await page.keyboard.press("Escape").catch(() => undefined);
    let best = { size: 0, file: "" };
    for (let i = 0; i < ref.scrolls.length; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), ref.scrolls[i]);
      await page.waitForTimeout(1800);
      const file = path.join(
        OUT,
        i === 0 ? `181cha-behance-${ref.key}.png` : `181cha-behance-${ref.key}-s${i}.png`,
      );
      await page.screenshot({ path: file, fullPage: false });
      const size = fs.statSync(file).size;
      console.log(`[181] ${ref.key} scroll=${ref.scrolls[i]} bytes=${size}`);
      if (size > best.size) best = { size, file };
    }
    // 메인 파일은 가장 큰 프레임으로 덮어씀
    if (best.file && !best.file.endsWith(`181cha-behance-${ref.key}.png`)) {
      fs.copyFileSync(best.file, path.join(OUT, `181cha-behance-${ref.key}.png`));
      console.log(`[181] ${ref.key} promoted ${path.basename(best.file)}`);
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
