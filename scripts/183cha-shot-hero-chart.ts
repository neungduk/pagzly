import { chromium } from "playwright";
import path from "path";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "183cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

async function main() {
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

  for (const tag of ["before", "after"] as const) {
    for (const key of ["fashion", "living"] as const) {
      const html = path.join(OUT, `${tag}-${key}.html`);
      await page.goto(`file://${html.replace(/\\/g, "/")}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.evaluate(() => {
        for (const sel of [".pagzly-seo-text", ".pagzly-anchor-nav", ".pagzly-cta"]) {
          const el = document.querySelector(sel);
          if (el instanceof HTMLElement) el.style.display = "none";
        }
      });
      const hero = page.locator("section.hero").first();
      await hero.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await hero.screenshot({ path: path.join(SHOT, `183cha-${tag}-${key}-hero.png`) });

      const compare = page.locator("p").filter({ hasText: /^COMPARE$/ }).first();
      if ((await compare.count()) > 0) {
        await compare.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        const section = compare.locator("xpath=ancestor::section[1]");
        await section.screenshot({ path: path.join(SHOT, `183cha-${tag}-${key}-chart.png`) });
      }
      console.log("ok", tag, key);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
