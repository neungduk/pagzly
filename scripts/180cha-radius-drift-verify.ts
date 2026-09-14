/**
 * 180차 — bento/radius/drift 전후 캡처 (이미지 API 0)
 *   npx tsx scripts/180cha-radius-drift-verify.ts before|after|diff
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { chromium } from "playwright";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { CategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "180cha-pixel");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

const CASES = [
  { key: "cosmetics", file: "139cha-session-cosmetics.json" },
  { key: "fashion", file: "139cha-session-fashion.json" },
  { key: "food", file: "139cha-session-food.json" },
  { key: "electronics", file: "139cha-session-electronics.json" },
  { key: "living", file: "139cha-session-living.json" },
  { key: "pet", file: "139cha-session-pet.json" },
] as const;

function loadSession(file: string) {
  const raw = fs.readFileSync(path.join(ROOT, "review", file), "utf8");
  const s = JSON.parse(raw) as {
    category?: string;
    generated?: {
      category?: string;
      productName?: string;
      brandName?: string;
      sections?: DetailSection[];
      imageUrls?: string[];
      theme?: CategoryTheme;
      certifications?: string;
      ingredients?: string;
      keyFeatures?: string;
    };
  };
  const g = s.generated ?? {};
  const category = g.category || s.category || "화장품/뷰티";
  return {
    rawJson: raw,
    productName: g.productName || "상품",
    brandName: g.brandName,
    category,
    sections: g.sections ?? [],
    imageUrls: g.imageUrls ?? [],
    theme: g.theme ?? getCategoryTheme(category),
    certifications: g.certifications,
    ingredients: g.ingredients,
    keyFeatures: g.keyFeatures,
  };
}

async function pixelDiff(aPath: string, bPath: string) {
  if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) {
    return { equal: false, diffPixels: -1, total: 0, maxChannelDelta: 255 };
  }
  const a = sharp(aPath);
  const b = sharp(bPath);
  const am = await a.metadata();
  const bm = await b.metadata();
  if (am.width !== bm.width || am.height !== bm.height) {
    return { equal: false, diffPixels: -1, total: 0, maxChannelDelta: 255 };
  }
  const [ab, bb] = await Promise.all([
    a.ensureAlpha().raw().toBuffer(),
    b.ensureAlpha().raw().toBuffer(),
  ]);
  let diff = 0;
  let max = 0;
  const w = am.width!;
  const h = am.height!;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const dr = Math.abs(ab[i]! - bb[i]!);
    const dg = Math.abs(ab[i + 1]! - bb[i + 1]!);
    const db = Math.abs(ab[i + 2]! - bb[i + 2]!);
    if (dr || dg || db) {
      diff++;
      max = Math.max(max, dr, dg, db);
    }
  }
  return { equal: diff === 0, diffPixels: diff, total: w * h, maxChannelDelta: max };
}

async function capturePhase(phase: "before" | "after") {
  const dir = path.join(OUT, phase);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  let liveOk = false;
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
    liveOk = r.ok || r.status < 500;
  } catch {
    liveOk = false;
  }

  const browser = await chromium.launch();
  // export는 항상 430폭 — before/after 픽셀 비교 가능하도록 live viewport와 분리
  const exportCtx = await browser.newContext({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 1,
  });
  const liveCtx =
    liveOk && fs.existsSync(STORAGE_STATE_PATH)
      ? await browser.newContext({
          storageState: STORAGE_STATE_PATH,
          viewport: { width: 1280, height: 900 },
          deviceScaleFactor: 1,
        })
      : null;

  for (const c of CASES) {
    const s = loadSession(c.file);
    const html = buildDetailPageHtml({
      productName: s.productName,
      brandName: s.brandName,
      category: s.category,
      sections: s.sections,
      imageUrls: s.imageUrls,
      theme: s.theme,
      certifications: s.certifications,
      ingredients: s.ingredients,
      keyFeatures: s.keyFeatures,
    });
    fs.writeFileSync(path.join(dir, `${c.key}-export.html`), html, "utf8");
    fs.writeFileSync(
      path.join(dir, `${c.key}-export.sha256`),
      crypto.createHash("sha256").update(html).digest("hex"),
      "utf8",
    );

    const page = await exportCtx.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.addStyleTag({
      content: "*,*::before,*::after{animation:none!important;transition:none!important}",
    });
    await page.waitForTimeout(600);
    const exportShot = path.join(dir, `${c.key}-export.png`);
    await page.screenshot({ path: exportShot, fullPage: true });
    fs.copyFileSync(exportShot, path.join(SHOT, `180cha-${phase}-${c.key}-export.png`));
    await page.close();
    console.log(`[180] ${phase} export ${c.key}`);

    if (liveCtx) {
      const livePage = await liveCtx.newPage();
      try {
        await livePage.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await livePage.evaluate(
          (raw) => sessionStorage.setItem("pagzly-create-result", raw),
          s.rawJson,
        );
        await livePage.goto(`${BASE_URL}/create/result`, {
          waitUntil: "networkidle",
          timeout: 60000,
        });
        await livePage.waitForSelector('[data-testid="detail-preview"]', { timeout: 45000 });
        const expand = livePage
          .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
          .first();
        if (await expand.count()) {
          await expand.click();
          await livePage.waitForTimeout(400);
        }
        await freezeDetailScrollReveal(livePage);
        await livePage.addStyleTag({
          content: "*,*::before,*::after{animation:none!important;transition:none!important}",
        });
        await livePage.waitForTimeout(300);
        const preview = livePage.locator(
          '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
        );
        const liveShot = path.join(dir, `${c.key}-live.png`);
        await preview.screenshot({ path: liveShot });
        fs.copyFileSync(liveShot, path.join(SHOT, `180cha-${phase}-${c.key}-live.png`));
        console.log(`[180] ${phase} live ${c.key}`);
      } catch (e) {
        console.warn(`[180] live skip ${c.key}:`, e instanceof Error ? e.message : e);
      }
      await livePage.close();
    }
  }

  await exportCtx.close();
  if (liveCtx) await liveCtx.close();
  await browser.close();
  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify({ phase, liveOk, at: new Date().toISOString() }, null, 2),
  );
}

async function diffPhases() {
  const results: Record<string, unknown>[] = [];
  for (const c of CASES) {
    for (const kind of ["export", "live"] as const) {
      const a = path.join(OUT, "before", `${c.key}-${kind}.png`);
      const b = path.join(OUT, "after", `${c.key}-${kind}.png`);
      const d = await pixelDiff(a, b);
      results.push({ key: c.key, kind, ...d });
    }
    const ha = path.join(OUT, "before", `${c.key}-export.sha256`);
    const hb = path.join(OUT, "after", `${c.key}-export.sha256`);
    if (fs.existsSync(ha) && fs.existsSync(hb)) {
      results.push({
        key: c.key,
        kind: "export-html-changed",
        changed: fs.readFileSync(ha, "utf8") !== fs.readFileSync(hb, "utf8"),
      });
    }
  }
  const report = { results, at: new Date().toISOString(), note: "A/C expect intentional diffs" };
  fs.writeFileSync(path.join(OUT, "diff.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const phase = process.argv[2] ?? "diff";
  if (phase === "before" || phase === "after") {
    await capturePhase(phase);
    return;
  }
  if (phase === "diff") {
    await diffPhases();
    return;
  }
  console.error("usage: before | after | diff");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
