/**
 * 449차 1-2 — 스크림 전/후 눈 검수 시트: 사진 6종(밝은 하늘·흰 벽·밝은 옷 대용 파스텔·어두운·고채도·복잡한 노이즈) × 히어로 A·정보 포인트 구간·배너를 한 장에.
 *   npx tsx scripts/scrim-sheet.ts --tag=before|after [--out=review/449-verify/scrim-before-after]
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("scrim-sheet", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { generate } from "./gen-photo-stress";
import { corpus, exportHtmlOf } from "./design-corpus";
import { EXTRA_ROOTS, launch, openHtml } from "./eye-lib";
import { PHOTO_DIR, swapPhotos } from "./photo-legibility";

export const SHEET_PHOTOS = ["sky-ground", "white-shadow", "pastel-low", "very-dark", "sat-red", "noise-shelf"];
export const SHEET_TARGETS: Array<{ label: string; fixture: string; selector: string }> = [
  { label: "히어로 A", fixture: "fx-compare-fashion", selector: '[data-hero-v2="A"]' },
  { label: "정보 포인트", fixture: "fx-skincare-serum", selector: '[data-info="points"]' },
  { label: "배너", fixture: "fx-skincare-serum", selector: ".pagzly-illustration-banner" },
];

async function main() {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const tag = arg("tag", "after");
  const out = arg("out", "review/449-verify/scrim-before-after");
  await generate(PHOTO_DIR);
  EXTRA_ROOTS["/stress/"] = PHOTO_DIR;
  fs.mkdirSync(out, { recursive: true });
  const b = await launch();
  const W = 390, cellH = 330;
  const rows: Buffer[][] = [];
  for (const ph of SHEET_PHOTOS) {
    const cells: Buffer[] = [];
    for (const t of SHEET_TARGETS) {
      const html = swapPhotos(exportHtmlOf(corpus({ only: [t.fixture] })[0]![1]), ph);
      const ex = await openHtml(b, html, W);
      let buf: Buffer;
      try { buf = await ex.page.locator(t.selector).first().screenshot(); } catch { buf = await sharp({ create: { width: W, height: 80, channels: 3, background: "#777" } }).png().toBuffer(); }
      await ex.close();
      cells.push(await sharp(buf).resize({ width: W, height: cellH, fit: "cover", position: "top" }).png().toBuffer());
    }
    rows.push(cells);
  }
  await b.close();
  const sheet = await sharp({ create: { width: 3 * (W + 6), height: rows.length * (cellH + 6), channels: 3, background: "#777777" } })
    .composite(rows.flatMap((cells, r) => cells.map((input, c) => ({ input, left: c * (W + 6), top: r * (cellH + 6) })))).png().toBuffer();
  await sharp(sheet).resize({ width: 1500 }).png().toFile(path.join(out, `${tag}.png`));
  fs.writeFileSync(path.join(out, `${tag}.txt`), `행: ${SHEET_PHOTOS.join(" / ")}\n열: ${SHEET_TARGETS.map((t) => t.label).join(" / ")}\n`);
  console.log("저장", path.join(out, `${tag}.png`));
}
if (/scrim-sheet\.ts$/.test(process.argv[1] ?? "")) void main();
