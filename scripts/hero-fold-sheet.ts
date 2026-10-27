/**
 * 451차 2 — 히어로 D 750폭 전/후 첫 화면 시트(전 = 사진 높이 상한을 걷은 마크업). `npx tsx scripts/hero-fold-sheet.ts [--out=review/451-verify/hero-fold/sheet.jpg]`
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("hero-fold-sheet", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { HERO_D_PHOTO_MAX_PX } from "../lib/hero-spec";

const IDS = ["fx-living-storage", "fx-tech-vacuum", "fx-tier-normal-living-3p"];
void (async () => {
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "review/451-verify/hero-fold/sheet.jpg";
  const browser = await launch();
  const tiles: sharp.OverlayOptions[] = [];
  const W = 750, H = 1000, G = 12;
  for (const [ci, id] of IDS.entries()) {
    const file = corpus({ only: [id] })[0]![1];
    const after = exportHtmlOf(file);
    const before = after.split(`max-height:${HERO_D_PHOTO_MAX_PX}px;`).join("");
    for (const [ri, html] of [before, after].entries()) {
      const ex = await openHtml(browser, html, W);
      const buf = await ex.page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } });
      await ex.close();
      tiles.push({ input: buf, left: G + ci * (W + G), top: G + ri * (H + G) });
    }
  }
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: G + IDS.length * (W + G), height: G + 2 * (H + G), channels: 3, background: "#e9e9e6" } }).composite(tiles).jpeg({ quality: 70 }).toFile(out);
  console.log(out);
})();
