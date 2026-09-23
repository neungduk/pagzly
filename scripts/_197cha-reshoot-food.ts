import path from "path";
import { chromium } from "playwright";

async function main() {
  const html = path.resolve("review/197cha-export/editorial-food.html");
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });
  await page.goto(`file://${html.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const el = page.locator("section.pagzly-editorial").first();
  await el.scrollIntoViewIfNeeded();
  const info = await el.evaluate(async (sec) => {
    const img = sec.querySelector("img") as HTMLImageElement | null;
    if (!img) return { nw: 0 };
    img.loading = "eager";
    const src = img.getAttribute("src");
    if (src) img.src = src;
    await new Promise<void>((r) => {
      if (img.complete && img.naturalWidth > 0) r();
      else {
        img.onload = () => r();
        img.onerror = () => r();
        setTimeout(() => r(), 15000);
      }
    });
    return { nw: img.naturalWidth, complete: img.complete, src: src?.slice(-50) };
  });
  console.log(info);
  await el.screenshot({
    path: "review/qa-screenshots/197cha-editorial-food-serving_suggestion.png",
  });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
