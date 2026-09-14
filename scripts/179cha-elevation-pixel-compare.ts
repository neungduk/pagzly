/**
 * 179차 — elevation 토큰화 전/후 픽셀·HTML 비교 (이미지 API 0)
 *
 *   npx tsx scripts/179cha-elevation-pixel-compare.ts before
 *   npx tsx scripts/179cha-elevation-pixel-compare.ts after
 *   npx tsx scripts/179cha-elevation-pixel-compare.ts diff
 *
 * export: buildDetailPageHtml → Playwright setContent 스크린샷 + HTML 저장
 * live: BASE_URL 가능 시 result 미리보기 캡처 (불가하면 export만 보고)
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
const OUT = path.join(ROOT, "review", "179cha-pixel");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

type CatCase = {
  key: string;
  sessionPath: string;
  categoryFallback: string;
};

const CASES: CatCase[] = [
  {
    key: "cosmetics",
    sessionPath: path.join(ROOT, "review", "139cha-session-cosmetics.json"),
    categoryFallback: "화장품/뷰티",
  },
  {
    key: "fashion",
    sessionPath: path.join(ROOT, "review", "139cha-session-fashion.json"),
    categoryFallback: "의류/패션",
  },
  {
    key: "food",
    sessionPath: path.join(ROOT, "review", "139cha-session-food.json"),
    categoryFallback: "식품",
  },
  {
    key: "electronics",
    sessionPath: path.join(ROOT, "review", "139cha-session-electronics.json"),
    categoryFallback: "전자/가전",
  },
  {
    key: "living",
    sessionPath: path.join(ROOT, "review", "139cha-session-living.json"),
    categoryFallback: "생활/리빙",
  },
  {
    key: "pet",
    sessionPath: path.join(ROOT, "review", "139cha-session-pet.json"),
    categoryFallback: "반려동물",
  },
];

function loadSession(p: string) {
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as {
    category?: string;
    productName?: string;
    brandName?: string;
    certifications?: string;
    ingredients?: string;
    keyFeatures?: string;
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
  const g = raw.generated ?? {};
  const category = g.category || raw.category || "화장품/뷰티";
  const theme = g.theme ?? getCategoryTheme(category);
  return {
    rawJson: fs.readFileSync(p, "utf8"),
    productName: g.productName || raw.productName || "상품",
    brandName: g.brandName || raw.brandName,
    category,
    sections: g.sections ?? [],
    imageUrls: g.imageUrls ?? [],
    theme,
    certifications: g.certifications ?? raw.certifications,
    ingredients: g.ingredients ?? raw.ingredients,
    keyFeatures: g.keyFeatures ?? raw.keyFeatures,
  };
}

async function pixelDiff(
  aPath: string,
  bPath: string,
): Promise<{ equal: boolean; diffPixels: number; total: number; maxChannelDelta: number }> {
  const a = sharp(aPath);
  const b = sharp(bPath);
  const am = await a.metadata();
  const bm = await b.metadata();
  if (am.width !== bm.width || am.height !== bm.height) {
    return {
      equal: false,
      diffPixels: -1,
      total: 0,
      maxChannelDelta: 255,
    };
  }
  const w = am.width!;
  const h = am.height!;
  const [ab, bb] = await Promise.all([
    a.ensureAlpha().raw().toBuffer(),
    b.ensureAlpha().raw().toBuffer(),
  ]);
  let diff = 0;
  let max = 0;
  for (let i = 0; i < ab.length; i++) {
    const d = Math.abs(ab[i]! - bb[i]!);
    if (d > 0) {
      if (i % 4 !== 3) max = Math.max(max, d);
      if (i % 4 === 0 && (d > 0 || Math.abs(ab[i + 1]! - bb[i + 1]!) > 0 || Math.abs(ab[i + 2]! - bb[i + 2]!) > 0)) {
        // count once per pixel via R channel index
      }
    }
  }
  // recount per-pixel RGB
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
  const context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 1,
  });
  if (liveOk && fs.existsSync(STORAGE_STATE_PATH)) {
    // re-create with auth
    await context.close();
    const authContext = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
    });
    await captureAll(authContext, phase, dir, true);
    await authContext.close();
  } else {
    await captureAll(context, phase, dir, false);
    await context.close();
  }
  await browser.close();

  const meta = {
    phase,
    liveAttempted: liveOk,
    liveCaptured: liveOk && fs.existsSync(STORAGE_STATE_PATH),
    cases: CASES.map((c) => c.key),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`[179] phase=${phase} done`, meta);
}

async function captureAll(
  context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>,
  phase: string,
  dir: string,
  doLive: boolean,
) {
  for (const c of CASES) {
    if (!fs.existsSync(c.sessionPath)) {
      console.warn(`[179] skip missing ${c.sessionPath}`);
      continue;
    }
    const s = loadSession(c.sessionPath);
    const html = buildDetailPageHtml({
      productName: s.productName,
      brandName: s.brandName,
      category: s.category || c.categoryFallback,
      sections: s.sections,
      imageUrls: s.imageUrls,
      theme: s.theme,
      certifications: s.certifications,
      ingredients: s.ingredients,
      keyFeatures: s.keyFeatures,
    });
    const htmlPath = path.join(dir, `${c.key}-export.html`);
    fs.writeFileSync(htmlPath, html, "utf8");
    fs.writeFileSync(
      path.join(dir, `${c.key}-export.sha256`),
      crypto.createHash("sha256").update(html).digest("hex"),
      "utf8",
    );

    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });
    await page.waitForTimeout(800);
    const exportShot = path.join(dir, `${c.key}-export.png`);
    await page.screenshot({ path: exportShot, fullPage: true });
    // also copy to qa-screenshots for report browsing
    fs.copyFileSync(exportShot, path.join(SHOT, `179cha-${phase}-${c.key}-export.png`));
    await page.close();
    console.log(`[179] ${phase} export ${c.key}`);

    if (doLive) {
      const livePage = await context.newPage();
      try {
        await livePage.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await livePage.evaluate(
          (raw) => sessionStorage.setItem("pagzly-create-result", raw),
          s.rawJson,
        );
        await livePage.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle", timeout: 60000 });
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
          content:
            "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
        });
        await livePage.waitForTimeout(400);
        const preview = livePage.locator(
          '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
        );
        const liveShot = path.join(dir, `${c.key}-live.png`);
        await preview.screenshot({ path: liveShot });
        fs.copyFileSync(liveShot, path.join(SHOT, `179cha-${phase}-${c.key}-live.png`));
        console.log(`[179] ${phase} live ${c.key}`);
      } catch (e) {
        console.warn(`[179] live skip ${c.key}:`, e instanceof Error ? e.message : e);
      }
      await livePage.close();
    }
  }
}

async function diffPhases() {
  const beforeDir = path.join(OUT, "before");
  const afterDir = path.join(OUT, "after");
  const results: Record<string, unknown>[] = [];
  let allEqual = true;

  for (const c of CASES) {
    for (const kind of ["export", "live"] as const) {
      const a = path.join(beforeDir, `${c.key}-${kind}.png`);
      const b = path.join(afterDir, `${c.key}-${kind}.png`);
      if (!fs.existsSync(a) || !fs.existsSync(b)) {
        results.push({ key: c.key, kind, status: "missing", a: fs.existsSync(a), b: fs.existsSync(b) });
        if (kind === "export") allEqual = false;
        continue;
      }
      const d = await pixelDiff(a, b);
      if (!d.equal) allEqual = false;
      results.push({ key: c.key, kind, ...d });

      const ha = path.join(beforeDir, `${c.key}-export.sha256`);
      const hb = path.join(afterDir, `${c.key}-export.sha256`);
      if (kind === "export" && fs.existsSync(ha) && fs.existsSync(hb)) {
        const sameHash = fs.readFileSync(ha, "utf8") === fs.readFileSync(hb, "utf8");
        results.push({ key: c.key, kind: "export-html-sha256", equal: sameHash });
        if (!sameHash) allEqual = false;
      }
    }
  }

  const report = {
    visualChangeZero: allEqual,
    results,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "diff.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!allEqual) process.exitCode = 2;
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
