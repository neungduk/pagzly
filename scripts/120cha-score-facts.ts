/**
 * 120차 — 채점용 DOM facts (API 없음)
 * npx tsx scripts/120cha-score-facts.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(__dirname, "..", "review");

const CAPTURES = [
  { capture: "58-cosmetics", slug: "cosmetics", wait: "AURA LAB" },
  { capture: "58-fashion", slug: "fashion", wait: "NEUTRAL LINE" },
  { capture: "58-food", slug: "food", wait: "한그릇 키친" },
  { capture: "58-electronics", slug: "electronics", wait: "NORA AUDIO" },
  { capture: "58-living", slug: "living", wait: "PLAIN HOME" },
  { capture: "58-pet", slug: "pet", wait: "PAW FRIEND" },
] as const;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  const all: Record<string, unknown> = {};

  for (const c of CAPTURES) {
    await page.goto(`${BASE}/dev/detail-preview?capture=${c.capture}`, {
      waitUntil: "networkidle",
    });
    await page.locator(`text=${c.wait}`).first().waitFor({ state: "visible", timeout: 20000 });
    await freezeDetailScrollReveal(page);
    await page.waitForTimeout(300);

    const facts = await page.evaluate(() => {
      const root =
        document.querySelector("[data-pagzly-preview]") ||
        document.querySelector('[data-testid="detail-preview"]');
      if (!root) return { error: "no preview" };

      const wm = root.querySelector("[data-hero-brand-mark='wordmark']");
      const wmInfo = wm
        ? {
            text: (wm.textContent || "").trim(),
            scrim: wm.getAttribute("data-wordmark-scrim"),
            bg: getComputedStyle(wm).backgroundColor,
          }
        : null;

      const heroHl = root.querySelector(".pagzly-display-headline");
      const headline = heroHl
        ? {
            text: (heroHl.textContent || "").trim().slice(0, 80),
            font: getComputedStyle(heroHl).fontFamily.slice(0, 60),
            wordBreak: getComputedStyle(heroHl).wordBreak,
          }
        : null;

      let patternCount = 0;
      for (const el of root.querySelectorAll("*")) {
        if (getComputedStyle(el).backgroundImage.includes("svg+xml")) patternCount += 1;
      }

      const svgs = [...root.querySelectorAll("svg[aria-label]")].map((s) =>
        s.getAttribute("aria-label"),
      );
      let sizeStroke: string | null = null;
      const sizeSvg = root.querySelector('svg[aria-label="크기 비교 다이어그램"]');
      if (sizeSvg) {
        sizeStroke = sizeSvg.querySelector("rect")?.getAttribute("stroke") ?? null;
      }

      return { wmInfo, headline, patternCount, svgs, sizeStroke };
    });

    // hero top clip for visual check
    const hero = page.locator("[data-pagzly-preview] section").first();
    const box = await hero.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, `120cha-${c.slug}-hero-clip.png`),
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: Math.min(box.height, 420),
        },
      });
    }

    all[c.slug] = facts;
    console.log(`[120facts] ${c.slug}`, JSON.stringify(facts));
  }

  fs.writeFileSync(path.join(OUT, "120cha-facts.json"), JSON.stringify(all, null, 2), "utf8");
  await browser.close();
  console.log("120cha-score-facts done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
