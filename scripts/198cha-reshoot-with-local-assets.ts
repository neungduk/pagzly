/**
 * 198차 — Supabase 402 진단 + 로컬 181 자산으로 에디토리얼/배너 재검증 (API 0).
 *
 * 원인: session imageUrls → Supabase public storage가 exceed_storage_size_quota로 402.
 * 대체: session.imageCacheKey → scripts/test-assets/_181cha-live/*.jpeg 로컬 파일.
 *
 *   npx tsx scripts/198cha-reshoot-with-local-assets.ts
 */
import fs from "fs";
import http from "http";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const ASSET_DIR = path.join(ROOT, "scripts", "test-assets", "_181cha-live");
const OUT = path.join(ROOT, "review", "198cha-export");
const SHOT = path.join(ROOT, "review", "qa-screenshots");

const CATS: Record<
  string,
  { category: string; editorialSlots: string[]; bannerIdx: number }
> = {
  beauty: {
    category: "화장품/뷰티",
    editorialSlots: ["customer_scenario"],
    bannerIdx: 10,
  },
  electronics: {
    category: "전자제품",
    editorialSlots: ["usage_scenario", "install_scenario"],
    bannerIdx: 19,
  },
  living: {
    category: "생활용품",
    editorialSlots: ["usage_scenario"],
    bannerIdx: 11,
  },
  pet: {
    category: "반려동물",
    editorialSlots: ["usage_scenario"],
    bannerIdx: 11,
  },
  food: {
    category: "식품/건강기능식품",
    editorialSlots: ["serving_suggestion"],
    bannerIdx: 11,
  },
  fashion: {
    category: "의류/패션",
    editorialSlots: ["coordination", "seasonal_styling"],
    bannerIdx: 19,
  },
};

type Session = {
  productName?: string;
  brandName?: string;
  keyFeatures?: string;
  ingredients?: string;
  certifications?: string;
  imageCacheKey?: string;
  generated?: {
    productName?: string;
    brandName?: string;
    sections?: DetailSection[];
    imageUrls?: string[];
  };
};

function loadSession(key: string): Session {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "review", "181cha-live", key, "session.json"), "utf8"),
  ) as Session;
}

/** imageCacheKey "file.jpeg:size|..." → absolute local paths (same order as imageUrls) */
function resolveLocalImageUrls(session: Session, key: string, httpBase: string): string[] {
  const cacheKey = session.imageCacheKey ?? "";
  const names = cacheKey
    .split("|")
    .map((part) => part.split(":")[0]?.trim())
    .filter(Boolean) as string[];
  if (names.length === 0) {
    throw new Error(`${key}: imageCacheKey empty — cannot map local assets`);
  }
  const urls: string[] = [];
  for (const name of names) {
    const abs = path.join(ASSET_DIR, name);
    if (!fs.existsSync(abs)) {
      throw new Error(`${key}: missing local asset ${abs}`);
    }
    // copy into OUT/{key}/ for static server
    const destDir = path.join(OUT, key);
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(abs, dest);
    urls.push(`${httpBase}/${key}/${encodeURIComponent(name)}`);
  }
  return urls;
}

async function probeRemote(url: string): Promise<{ status: number; body: string }> {
  try {
    const r = await fetch(url, { method: "GET" });
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("json") ? (await r.text()).slice(0, 220) : `bytes`;
    return { status: r.status, body };
  } catch (e) {
    return { status: 0, body: String(e) };
  }
}

function startStaticServer(rootDir: string): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const raw = decodeURIComponent((req.url || "/").split("?")[0] || "/");
        const rel = raw.replace(/^\/+/, "");
        const filePath = path.normalize(path.join(rootDir, rel));
        if (!filePath.startsWith(rootDir)) {
          res.writeHead(403);
          res.end("forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".jpeg": "image/jpeg",
          ".jpg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
        };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("no port"));
        return;
      }
      resolve({
        port: addr.port,
        close: () => server.close(),
      });
    });
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  // --- A: diagnose remote ---
  const food = loadSession("food");
  const remote0 = food.generated?.imageUrls?.[0];
  if (!remote0) throw new Error("food imageUrls[0] missing");
  const probe = await probeRemote(remote0);
  console.log("=== A diagnose ===");
  console.log("remote status", probe.status);
  console.log("remote body", probe.body);
  if (probe.status !== 402) {
    console.warn("expected 402 quota; got", probe.status, "— still using local assets");
  } else {
    console.log("CAUSE: Supabase exceed_storage_size_quota (402) — not tooling/file://");
  }

  const server = await startStaticServer(OUT);
  const httpBase = `http://127.0.0.1:${server.port}`;
  console.log("static server", httpBase);

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });

  let failed = 0;

  console.log("=== B editorial ===");
  for (const [key, cfg] of Object.entries(CATS)) {
    const session = loadSession(key);
    const sections = session.generated?.sections ?? [];
    const imageUrls = resolveLocalImageUrls(session, key, httpBase);
    console.log(key, "local images", imageUrls.length);

    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: cfg.category,
      sections,
      imageUrls,
      theme: getCategoryTheme(cfg.category),
    });
    const htmlName = `editorial-${key}.html`;
    fs.writeFileSync(path.join(OUT, htmlName), html, "utf8");

    await page.goto(`${httpBase}/${htmlName}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(300);

    const editorials = page.locator("section.pagzly-editorial");
    const n = await editorials.count();
    for (let i = 0; i < n; i++) {
      const el = editorials.nth(i);
      await el.scrollIntoViewIfNeeded();
      const nw = await el.evaluate(async (sec) => {
        const img = sec.querySelector("img") as HTMLImageElement | null;
        if (!img) return 0;
        img.loading = "eager";
        const src = img.getAttribute("src");
        if (src) img.src = src;
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 15000);
          }
        });
        return img.naturalWidth;
      });
      const slot = cfg.editorialSlots[i] ?? `i${i}`;
      const shotPath = path.join(SHOT, `198cha-editorial-${key}-${slot}.png`);
      if (nw < 1) {
        console.error("FAIL no image", key, slot, "nw", nw);
        failed += 1;
        continue;
      }
      await el.screenshot({ path: shotPath });
      console.log("OK", shotPath, "naturalWidth", nw);
    }
  }

  console.log("=== B banner food+electronics ===");
  for (const key of ["food", "electronics"] as const) {
    const cfg = CATS[key];
    const session = loadSession(key);
    const bannerRaw = session.generated?.sections?.[cfg.bannerIdx];
    if (!bannerRaw || bannerRaw.type !== "illustration_banner") {
      console.error("FAIL banner missing", key);
      failed += 1;
      continue;
    }
    const imageUrls = resolveLocalImageUrls(session, key, httpBase);
    // illustrationUrl이 원격(402)이면 imageUrls[0]보다 우선해 깨짐 → 로컬로 덮어씀
    const banner = {
      ...bannerRaw,
      illustrationUrl: imageUrls[0],
    } as DetailSection;
    const budgetCategory =
      cfg.category === "생활용품" || cfg.category === "반려동물"
        ? "화장품/뷰티"
        : cfg.category;
    const html = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: budgetCategory,
      sections: [banner],
      imageUrls,
      theme: getCategoryTheme(cfg.category),
    });
    const htmlName = `banner-${key}.html`;
    fs.writeFileSync(path.join(OUT, htmlName), html, "utf8");
    await page.goto(`${httpBase}/${htmlName}`, {
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
      await new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 15000);
        }
      });
      return img.naturalWidth;
    });
    const shotPath = path.join(SHOT, `198cha-banner-${key}.png`);
    if (nw < 1) {
      console.error("FAIL banner image", key, nw);
      failed += 1;
      continue;
    }
    await el.screenshot({ path: shotPath });
    console.log("OK", shotPath, "naturalWidth", nw);
  }

  await browser.close();
  server.close();
  console.log("API calls: 0");
  console.log("failed", failed);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
