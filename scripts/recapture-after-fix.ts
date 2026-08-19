import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const auth = path.join(__dirname, "auth-state.json");
const outDir = path.join(ROOT, "review", "before-after-fix");
const sessionRaw = fs.readFileSync(path.join(outDir, "session-after.json"), "utf8");

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: auth,
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3001/create");
  await page.evaluate(
    ([key, raw]) => {
      sessionStorage.setItem(key, raw);
    },
    ["pagzly-create-result", sessionRaw] as const,
  );
  await page.goto("http://localhost:3001/create/result", { waitUntil: "networkidle" });
  await page.locator('[data-testid="detail-preview"]').waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(500);
  const afterPath = path.join(outDir, "after-result.png");
  await page.locator('[data-testid="detail-preview"]').screenshot({ path: afterPath });

  const beforePath = path.join(outDir, "before-result.png");
  const comparePath = path.join(outDir, "compare-side-by-side.png");
  const [bMeta, aMeta] = await Promise.all([
    sharp(beforePath).metadata(),
    sharp(afterPath).metadata(),
  ]);
  const w = Math.max(bMeta.width ?? 430, aMeta.width ?? 430);
  const h = Math.max(bMeta.height ?? 1200, aMeta.height ?? 1200);
  const gap = 16;
  const [bBuf, aBuf] = await Promise.all([
    sharp(beforePath).resize({ width: w, height: h, fit: "contain", background: "#faf8f3" }).png().toBuffer(),
    sharp(afterPath).resize({ width: w, height: h, fit: "contain", background: "#faf8f3" }).png().toBuffer(),
  ]);
  await sharp({
    create: { width: w * 2 + gap, height: h + 48, channels: 4, background: "#faf8f3" },
  })
    .composite([
      { input: bBuf, left: 0, top: 24 },
      { input: aBuf, left: w + gap, top: 24 },
    ])
    .png()
    .toFile(comparePath);

  console.log(`after-result.png: ${fs.statSync(afterPath).size} bytes`);
  console.log(`compare-side-by-side.png: ${fs.statSync(comparePath).size} bytes`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
