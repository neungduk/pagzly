/**
 * 196 — before shots from 195 export HTML (brand-colored scrim), full section.
 *   npx tsx scripts/196cha-before-shot.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.join(__dirname, "..");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const FILES = [
  {
    src: path.join(ROOT, "review", "195cha-export", "after-food.html"),
    outs: [{ idx: 0, name: "196cha-before-food-serving_suggestion-full.png" }],
  },
  {
    src: path.join(ROOT, "review", "195cha-export", "after-fashion.html"),
    outs: [
      { idx: 0, name: "196cha-before-fashion-coordination-full.png" },
      { idx: 1, name: "196cha-before-fashion-seasonal_styling-full.png" },
    ],
  },
] as const;

async function main() {
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });

  for (const f of FILES) {
    if (!fs.existsSync(f.src)) {
      console.warn("missing", f.src);
      continue;
    }
    await page.goto(`file://${f.src.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll("section.pagzly-editorial img")];
      for (const img of imgs) {
        const el = img as HTMLImageElement;
        el.loading = "eager";
        if (!el.complete || el.naturalWidth === 0) {
          const src = el.getAttribute("src");
          if (src) el.src = src;
        }
      }
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              const el = img as HTMLImageElement;
              if (el.complete && el.naturalWidth > 0) resolve();
              else {
                el.onload = () => resolve();
                el.onerror = () => resolve();
                setTimeout(() => resolve(), 12000);
              }
            }),
        ),
      );
    });
    await page.waitForTimeout(400);
    const editorials = page.locator("section.pagzly-editorial");
    for (const o of f.outs) {
      const shotPath = path.join(SHOT, o.name);
      await editorials.nth(o.idx).screenshot({ path: shotPath });
      console.log("before", shotPath);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
