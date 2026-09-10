/**
 * 160차 — detail-preview 캡처 + export HTML 스모크 (노이즈/IP/각주/성분각주).
 * 실행: npx tsx scripts/160cha-capture-verify.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import {
  buildNoiseComparisonDiagramSvg,
  matchNoiseComparisonRow,
} from "../lib/noise-comparison-diagram";
import {
  buildWaterproofIpDiagramSvg,
  matchWaterproofIpRow,
} from "../lib/waterproof-ip-diagram";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "qa-screenshots");
const EXPORT_DIR = path.join(ROOT, "review", "160cha-export");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const rows = [
    { label: "소음도", value: "24dB" },
    { label: "방수등급", value: "IPX5" },
  ];
  const noise = matchNoiseComparisonRow(rows);
  const ip = matchWaterproofIpRow(rows);
  if (!noise || !ip) throw new Error("matcher failed");
  fs.writeFileSync(
    path.join(EXPORT_DIR, "noise-ip-export-snippet.html"),
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:24px;background:#f7f4ef">
      ${buildNoiseComparisonDiagramSvg(noise.db, noise.value, "#3d4a3a", "#3d4a3a")}
      ${buildWaterproofIpDiagramSvg(ip.level, ip.value, "#3d4a3a", "#3d4a3a")}
    </body>`,
    "utf8",
  );

  // footnote dedupe unit check
  const notes = [
    "한국화학융합시험연구원, 2025.11, n=48",
    "한국화학융합시험연구원, 2025.11, n=48",
    "한국화학융합시험연구원, 2025.11, n=48",
    "피부임상연구센터, 2026.01, n=32",
  ];
  const footnotes: { number: number; text: string }[] = [];
  const map = new Map<string, number>();
  for (const note of notes) {
    let n = map.get(note);
    if (n == null) {
      n = footnotes.length + 1;
      footnotes.push({ number: n, text: note });
      map.set(note, n);
    }
  }
  if (footnotes.length !== 2) {
    throw new Error(`footnote dedupe expected 2 unique, got ${footnotes.length}`);
  }
  fs.writeFileSync(
    path.join(EXPORT_DIR, "footnote-dedupe.json"),
    JSON.stringify({ footnotes, sharedNumbers: [1, 1, 1, 2] }, null, 2),
    "utf8",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const captures = [
    ["160-noise-ip", "160cha-noise-ip-live.png"],
    ["160-footnote-dedupe", "160cha-footnote-dedupe-live.png"],
    ["160-ingredient-note", "160cha-ingredient-note-live.png"],
  ] as const;

  for (const [capture, file] of captures) {
    await page.goto(`${BASE_URL}/dev/detail-preview?capture=${capture}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(800);
    const preview = page.locator('[data-testid="detail-preview"]');
    if (await preview.count()) {
      await preview.screenshot({ path: path.join(OUT, file) });
    } else {
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    }
    console.log(`[capture] ${capture} → ${file}`);
  }

  // export snippet visual
  await page.goto(`file://${path.join(EXPORT_DIR, "noise-ip-export-snippet.html").replace(/\\/g, "/")}`);
  await page.screenshot({ path: path.join(OUT, "160cha-noise-ip-export.png") });
  console.log("[capture] export snippet ok");

  await browser.close();
  console.log("160cha capture verify done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
