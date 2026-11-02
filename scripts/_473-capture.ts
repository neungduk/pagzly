/**
 * 473차 — 갤러리 전체 길이 + 첫화면/중간(1500~4000) 대조 캡처(네트워크 차단, file://·data:만).
 *   npx tsx scripts/_473-capture.ts
 * 산출: review/473-captures/ (gitignore)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { ARCHETYPE_IDS } from "../lib/page-archetype-v5";

const GALLERY = "review/465-gallery";
const OUT = "review/473-captures";
const FIXTURES = ["fx-tech-keyboard", "fx-skincare-serum", "fx-fashion-dress-floral", "fx-food-snack"] as const;
const WIDTHS = [750, 390] as const;
const FIRST_H = 1500;
const MID_Y0 = 1500;
const MID_H = 2500; // 1500~4000

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
      const firstTiles: Buffer[] = [];
      const midTiles: Buffer[] = [];
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

        const firstH = Math.min(FIRST_H, fullH);
        const first = await sharp(full).extract({ left: 0, top: 0, width: fullW, height: firstH }).png().toBuffer();
        fs.writeFileSync(path.join(OUT, `first__${fx}__${arch}__${W}.png`), first);
        firstTiles.push(first);

        if (fullH > MID_Y0 + 100) {
          const midH = Math.min(MID_H, fullH - MID_Y0);
          const mid = await sharp(full).extract({ left: 0, top: MID_Y0, width: fullW, height: midH }).png().toBuffer();
          fs.writeFileSync(path.join(OUT, `mid__${fx}__${arch}__${W}.png`), mid);
          midTiles.push(mid);
        }
        await ctx.close();
        console.log(`ok ${fx}/${arch}/${W} h=${fullH} w=${fullW}`);
      }
      const makeStrip = async (tiles: Buffer[], tag: string, cellH: number) => {
        if (tiles.length < 8) return;
        const cellW = Math.round(W / 2);
        const resized = await Promise.all(tiles.map((b) => sharp(b).resize(cellW, cellH, { fit: "cover", position: "top" }).png().toBuffer()));
        const comps = resized.map((input, i) => ({ input, left: (i % 4) * cellW, top: Math.floor(i / 4) * cellH }));
        const strip = await sharp({ create: { width: cellW * 4, height: cellH * 2, channels: 3, background: "#111" } }).composite(comps).png().toBuffer();
        const p = path.join(OUT, `strip-${tag}__${fx}__${W}.png`);
        fs.writeFileSync(p, strip);
        console.log(`wrote ${p}`);
      };
      await makeStrip(firstTiles, "first", Math.round(FIRST_H / 2));
      await makeStrip(midTiles, "mid", Math.round(MID_H / 2));
    }
  }
  await browser.close();
  console.log(`done → ${OUT}`);
}

void main();
