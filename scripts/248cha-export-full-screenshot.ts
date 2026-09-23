/**
 * 248차 — 247차 export HTML 풀페이지 스크린샷 (API 0).
 *   npx tsx scripts/248cha-export-full-screenshot.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";

async function main() {
  const file = path.join(__dirname, "..", "review", "247cha-recovered", "showcase.html");
  const out = path.join(__dirname, "..", "review", "248cha-export-full.png");
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });

  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("requestfailed", (req) => {
    if (/\.(jpe?g|png|webp|gif)/i.test(req.url())) {
      consoleErrors.push(`img-fail ${req.failure()?.errorText} ${req.url().slice(0, 120)}`);
    }
  });

  await page.goto(`file:///${file.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  // lazy img 로드 유도
  await page.evaluate(async () => {
    const step = Math.max(400, window.innerHeight);
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);

  const imgStats = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
    const pending = imgs.filter((i) => !i.complete).length;
    const sampleSrc = imgs.slice(0, 3).map((i) => ({
      src: i.currentSrc || i.src,
      w: i.naturalWidth,
      complete: i.complete,
    }));
    return { total: imgs.length, loaded, broken, pending, sampleSrc };
  });
  console.log("imgStats", JSON.stringify(imgStats, null, 2));
  if (consoleErrors.length) console.log("errors", consoleErrors.slice(0, 8));

  await page.screenshot({ path: out, fullPage: true });
  await browser.close();

  const meta = await sharp(out).metadata();
  const st = fs.statSync(out);
  console.log(
    JSON.stringify({
      path: out,
      bytes: st.size,
      width: meta.width,
      height: meta.height,
      imgLoaded: imgStats.loaded,
      imgTotal: imgStats.total,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
