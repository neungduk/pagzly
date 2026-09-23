/**
 * 183차 before 기준선: 182 after export HTML을 그대로 스크린샷 (API 0).
 * 182 = 183 레이아웃/예산 변경 직전 상태.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "183cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const SRC = path.join(ROOT, "review", "182cha-export");
const CATS = ["beauty", "fashion", "food", "electronics", "living", "pet"] as const;

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const hashes: Record<string, string> = {};
  const sectionCounts: Record<string, { renderedSections: number; source: string }> = {};

  for (const key of CATS) {
    const src = path.join(SRC, `after-${key}.html`);
    if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
    const html = fs.readFileSync(src, "utf8");
    const dest = path.join(OUT, `before-${key}.html`);
    fs.writeFileSync(dest, html, "utf8");
    hashes[key] = sha256(html);

    await page.goto(`file://${dest.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const seo = document.querySelector(".pagzly-seo-text");
      if (seo instanceof HTMLElement) seo.style.display = "none";
    });
    const renderedSections = await page.evaluate(
      () => document.querySelectorAll("section").length,
    );
    sectionCounts[key] = { renderedSections, source: "182cha-after-export" };

    await page.screenshot({
      path: path.join(SHOT, `183cha-before-${key}-export-full.png`),
      fullPage: true,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(SHOT, `183cha-before-${key}-hero.png`),
      fullPage: false,
    });

    const chartY = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("section, p, h1, h2, h3"));
      for (const el of nodes) {
        const t = (el.textContent || "").trim();
        if (t === "COMPARE" || t.includes("일반 제품과") || t.includes("COMPARE")) {
          const r = el.getBoundingClientRect();
          return Math.max(0, window.scrollY + r.top - 60);
        }
      }
      return Math.floor(document.body.scrollHeight * 0.4);
    });
    await page.evaluate((y) => window.scrollTo(0, y), chartY);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(SHOT, `183cha-before-${key}-chart.png`),
      fullPage: false,
    });
    console.log(`[183] before-from-182 ${key} sections=${renderedSections}`);
  }

  await browser.close();
  fs.writeFileSync(
    path.join(OUT, "before-meta.json"),
    JSON.stringify(
      {
        tag: "before",
        at: new Date().toISOString(),
        hashes,
        sectionCounts,
        note: "182cha after export = pre-183 layout baseline (hero/chart/budget 변경 전)",
      },
      null,
      2,
    ),
  );
  console.log("[183] before baseline ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
