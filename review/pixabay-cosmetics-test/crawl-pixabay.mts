import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "..");
const ASSET_DIR = path.join(ROOT, "scripts", "test-assets", "_pixabay-cosmetics-run");
const OUT_DIR = path.join(ROOT, "review", "pixabay-cosmetics-test");
const NEED = 8;

async function waitOutOfCf(page: import("playwright").Page) {
  for (let i = 0; i < 40; i++) {
    const t = await page.title();
    if (!/just a moment/i.test(t)) return;
    await page.waitForTimeout(3000);
  }
  throw new Error("Cloudflare challenge timeout: " + (await page.title()));
}

async function main() {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();
  const sources: { pageUrl: string; file: string; cdnUrl: string }[] = [];
  const queries = ["skincare+cream", "cosmetics+jar", "beauty+product"];
  const seen = new Set<string>();

  for (const q of queries) {
    if (sources.length >= NEED) break;
    await page.goto(`https://pixabay.com/images/search/${q}/`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await waitOutOfCf(page);
    await page.waitForTimeout(2000);
    const links = await page.locator('a[href*="/photos/"]').evaluateAll((as) => {
      const out: string[] = [];
      for (const a of as) {
        const href = (a as HTMLAnchorElement).href;
        if (!/\/photos\//.test(href)) continue;
        const clean = href.split("?")[0];
        if (!out.includes(clean)) out.push(clean);
      }
      return out.slice(0, 20);
    });
    console.log("query", q, "links", links.length);
    for (const pageUrl of links) {
      if (sources.length >= NEED) break;
      if (seen.has(pageUrl)) continue;
      seen.add(pageUrl);
      const p2 = await context.newPage();
      try {
        await p2.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
        await waitOutOfCf(p2);
        await p2.waitForTimeout(1500);
        const cdnUrl = await p2.evaluate(() => {
          const imgs = [...document.querySelectorAll<HTMLImageElement>("img")];
          const cdn = imgs
            .map((img) => img.currentSrc || img.src)
            .filter((s) => s.includes("cdn.pixabay.com/photo/"));
          cdn.sort((a, b) => b.length - a.length);
          return cdn[0] ?? null;
        });
        if (!cdnUrl) continue;
        const cookies = await context.cookies(cdnUrl);
        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
        const res = await context.request.get(cdnUrl, {
          headers: { Referer: pageUrl, Cookie: cookieHeader },
        });
        if (!res.ok()) continue;
        const buf = Buffer.from(await res.body());
        if (buf.length < 5000) continue;
        const id = pageUrl.match(/-(\d+)\/?$/)?.[1] ?? String(sources.length + 1);
        const file = path.join(ASSET_DIR, `pixabay-${id}.jpg`);
        fs.writeFileSync(file, buf);
        sources.push({ pageUrl, file, cdnUrl });
        console.log("saved", sources.length, pageUrl);
      } finally {
        await p2.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, "pixabay-sources.json"), JSON.stringify(sources, null, 2));
  if (sources.length < 7) throw new Error(`only ${sources.length}`);
  console.log("done", sources.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
