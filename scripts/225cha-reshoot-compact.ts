import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";

const OUT = path.join(__dirname, "..", "review", "225cha-compact-layout");

async function main() {
  const session = JSON.parse(
    fs.readFileSync("review/181cha-live/electronics/session.json", "utf8"),
  ) as {
    productName?: string;
    category: string;
    imageUrls?: string[];
    generated: { sections: Array<Record<string, unknown>> };
  };
  const html = buildDetailPageHtml({
    productName: session.productName ?? "t",
    category: session.category,
    sections: session.generated.sections as never,
    imageUrls: session.imageUrls ?? [],
    theme: getCategoryTheme(session.category),
  });
  // Extract compact section snippets
  const re =
    /max-width:576px;margin:0 auto;display:flex;align-items:center;gap:16px;flex-direction:(row|row-reverse)"[\s\S]*?<\/section>/g;
  const parts = [...html.matchAll(re)];
  console.log("compact sections found", parts.length);
  for (const m of parts) {
    const chunk = m[0]!;
    console.log(
      m[1],
      "img",
      chunk.includes("width:120px"),
      "radius",
      chunk.match(/border-radius:(\d+)px/)?.[1],
      "h3",
      chunk.match(/<h3[^>]*>([^<]+)</)?.[1],
    );
  }

  fs.writeFileSync(path.join(OUT, "electronics-compact-export.html"), html, "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 520, height: 1100 } });
  await page.goto(`file:///${path.join(OUT, "electronics-compact-export.html").replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);
  const marked = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("section")].filter((s) =>
      s.innerHTML.includes("max-width:576px"),
    );
    sections.forEach((s) => s.setAttribute("data-compact", "1"));
    return sections.length;
  });
  console.log("DOM compact", marked);
  if (marked > 0) {
    const loc = page.locator("[data-compact='1']");
    await loc.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const b0 = await loc.first().boundingBox();
    const b1 = await loc.nth(Math.min(marked - 1, 2)).boundingBox();
    if (b0 && b1) {
      await page.screenshot({
        path: path.join(OUT, "electronics-compact-thumbs.png"),
        clip: {
          x: 0,
          y: Math.max(0, b0.y - 8),
          width: 520,
          height: Math.min(900, b1.y + b1.height - b0.y + 24),
        },
      });
      console.log("saved electronics-compact-thumbs.png");
    }
  }

  // synthetic
  await page.goto(
    `file:///${path.join(OUT, "synthetic-compact.html").replace(/\\/g, "/")}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    [...document.querySelectorAll("section")].forEach((s) => {
      if (s.innerHTML.includes("max-width:576px")) s.setAttribute("data-compact", "1");
    });
  });
  const loc2 = page.locator("[data-compact='1']");
  await loc2.first().scrollIntoViewIfNeeded();
  const c0 = await loc2.first().boundingBox();
  const c1 = await loc2.nth(2).boundingBox();
  if (c0 && c1) {
    await page.screenshot({
      path: path.join(OUT, "compact-thumbs.png"),
      clip: {
        x: 0,
        y: Math.max(0, c0.y - 8),
        width: 520,
        height: Math.min(900, c1.y + c1.height - c0.y + 24),
      },
    });
    console.log("saved compact-thumbs.png");
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
