/**
 * 195 — capture reconstructed "before" editorial shot (API 0).
 *   npx tsx scripts/195cha-before-shot.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.join(__dirname, "..");
const after = fs.readFileSync(path.join(ROOT, "review", "195cha-export", "after-food.html"), "utf8");
const re = /<section class="pagzly-editorial"[\s\S]*?<\/section>/;
const m = after.match(re);
if (!m) throw new Error("no editorial");
const block = m[0];
const img = block.match(/<img [^>]+>/)?.[0] ?? "";
const h2text = block.match(/>([^<]+)<\/h2>/)?.[1] ?? "";
const body =
  block.match(/padding:24px 24px 48px[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
const bg = block.match(/background:([^;"]+)/)?.[1] ?? "#fff";
const beforeBlock = `<section class="pagzly-editorial" style="padding:0;background:${bg}">
  ${img}
  <div style="padding:40px 24px 48px;text-align:center;max-width:640px;margin:0 auto">
    <h2 style="font-size:2rem;margin:0;line-height:1.2">${h2text}</h2>
    <p style="line-height:1.85;font-size:1.05rem;opacity:.85;margin-top:16px">${body}</p>
  </div>
</section>`;
const beforeHtml = after.replace(re, beforeBlock);
const outHtml = path.join(ROOT, "review", "195cha-export", "before-food-editorial-only.html");
fs.writeFileSync(outHtml, beforeHtml, "utf8");

async function main() {
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto(`file://${outHtml.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  const shot = path.join(ROOT, "review", "qa-screenshots", "195cha-before-food-editorial.png");
  await page.locator("section.pagzly-editorial").first().screenshot({ path: shot });
  console.log("before shot", shot);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
