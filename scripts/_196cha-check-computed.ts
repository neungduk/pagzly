import { chromium } from "playwright";
import path from "path";

async function check(file: string) {
  const html = path.resolve(file);
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });
  await page.goto(`file://${html.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  const info = await page.evaluate(() => {
    const sec = document.querySelector("section.pagzly-editorial");
    const h2 = sec?.querySelector("h2");
    const scrims = [...(sec?.querySelectorAll("div") ?? [])].filter((d) =>
      (d.getAttribute("style") || "").includes("linear-gradient(0deg"),
    );
    const img = sec?.querySelector("img") as HTMLImageElement | null;
    const cs = h2 ? getComputedStyle(h2) : null;
    return {
      h2Color: cs?.color,
      h2StyleAttr: h2?.getAttribute("style")?.slice(-120),
      scrimCount: scrims.length,
      scrimBg: scrims[0]?.getAttribute("style")?.slice(0, 200),
      imgW: img?.naturalWidth,
      imgComplete: img?.complete,
    };
  });
  console.log(file, JSON.stringify(info, null, 2));
  await browser.close();
}

async function main() {
  await check("review/196cha-export/after-food.html");
  await check("review/196cha-export/after-fashion.html");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
