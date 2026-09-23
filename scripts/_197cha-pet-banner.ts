import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";

async function main() {
  const session = JSON.parse(
    fs.readFileSync("review/181cha-live/pet/session.json", "utf8"),
  );
  const banner = session.generated.sections[11];
  console.log("banner type", banner.type, banner.heading);
  const html = buildDetailPageHtml({
    productName: session.generated.productName || session.productName || "pet",
    brandName: session.generated.brandName || session.brandName,
    keyFeatures: session.keyFeatures,
    ingredients: session.ingredients,
    certifications: session.certifications,
    category: "화장품/뷰티",
    sections: [banner],
    imageUrls: session.generated.imageUrls,
    theme: getCategoryTheme("반려동물"),
  });
  fs.mkdirSync("review/197cha-export", { recursive: true });
  const htmlPath = path.resolve("review/197cha-export/banner-pet.html");
  fs.writeFileSync(htmlPath, html);
  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const el = page.locator("section.pagzly-illustration-banner").first();
  await el.scrollIntoViewIfNeeded();
  const nw = await el.evaluate(async (sec) => {
    const img = sec.querySelector("img") as HTMLImageElement | null;
    if (!img) return 0;
    img.loading = "eager";
    const src = img.getAttribute("src");
    if (src) img.src = src;
    await new Promise<void>((r) => {
      if (img.complete && img.naturalWidth > 0) r();
      else {
        img.onload = () => r();
        img.onerror = () => r();
        setTimeout(() => r(), 12000);
      }
    });
    return img.naturalWidth;
  });
  await el.screenshot({ path: "review/qa-screenshots/197cha-banner-pet.png" });
  console.log("pet banner shot nw", nw);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
