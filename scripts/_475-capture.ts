/**
 * 475차 E — 전체 길이 + 아래 구간(2600px~끝) 캡처. 산출 review/475-captures/(gitignore)
 *   npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial
 *   npx tsx scripts/_475-capture.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { ARCHETYPE_IDS } from "../lib/page-archetype-v5";

const GALLERY = "review/465-gallery";
const OUT = "review/475-captures";
const FIXTURES = ["fx-tech-keyboard", "fx-skincare-serum", "fx-fashion-dress-floral", "fx-food-snack"] as const;
const WIDTHS = [750, 390] as const;
const BOTTOM_FROM = 2600;

function fileUrl(p: string): string {
  const abs = path.resolve(p).split(path.sep).join("/");
  return abs.startsWith("/") ? `file://${abs}` : `file:///${abs}`;
}

async function main() {
  if (!fs.existsSync(path.join(GALLERY, "index.html"))) {
    console.error(`갤러리 없음: ${GALLERY} — npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const W of WIDTHS) {
    for (const fx of FIXTURES) {
      const bottomTiles: Buffer[] = [];
      for (const arch of ARCHETYPE_IDS) {
        const htmlPath = path.join(GALLERY, arch, `${fx}.html`);
        if (!fs.existsSync(htmlPath)) {
          console.warn(`skip ${htmlPath}`);
          continue;
        }
        const ctx = await browser.newContext({
          viewport: { width: W, height: 900 },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
          javaScriptEnabled: true,
        });
        await ctx.route("**/*", (route) => {
          const u = route.request().url();
          if (u.startsWith("file:") || u.startsWith("data:")) return route.continue();
          return route.abort();
        });
        const page = await ctx.newPage();
        await page.goto(fileUrl(htmlPath), { waitUntil: "load", timeout: 60000 });
        await page.waitForTimeout(150);
        const full = await page.screenshot({ type: "png", fullPage: true });
        fs.writeFileSync(path.join(OUT, `full__${fx}__${arch}__${W}.png`), full);
        const meta = await sharp(full).metadata();
        const fullH = meta.height ?? 0;
        const fullW = meta.width ?? W;
        if (fullH > BOTTOM_FROM + 200) {
          const botH = fullH - BOTTOM_FROM;
          const bot = await sharp(full).extract({ left: 0, top: BOTTOM_FROM, width: fullW, height: botH }).png().toBuffer();
          fs.writeFileSync(path.join(OUT, `bottom__${fx}__${arch}__${W}.png`), bot);
          const tileH = Math.min(700, botH);
          const tile = await sharp(bot).extract({ left: 0, top: 0, width: fullW, height: tileH }).png().toBuffer();
          bottomTiles.push(tile);
        }
        await ctx.close();
        console.log(`ok ${fx}/${arch}/${W} h=${fullH}`);
      }
      if (bottomTiles.length >= 8) {
        const cellW = Math.round(W / 2);
        const cellH = 350;
        const resized = await Promise.all(bottomTiles.map((b) => sharp(b).resize(cellW, cellH, { fit: "cover", position: "top" }).png().toBuffer()));
        const comps = resized.map((input, i) => ({ input, left: (i % 4) * cellW, top: Math.floor(i / 4) * cellH }));
        const buf = await sharp({ create: { width: cellW * 4, height: cellH * 2, channels: 3, background: "#111" } }).composite(comps).png().toBuffer();
        fs.writeFileSync(path.join(OUT, `strip-bottom__${fx}__${W}.png`), buf);
      }
    }
  }
  await browser.close();
  console.log("done", OUT);
}

void main();
