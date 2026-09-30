/**
 * 284차 — 플랫폼별 PNG 장당 용량·세로 실측. 무료(생성 호출 없음).
 * 작업본 lib/capture-detail-png.ts 를 번들해 로컬 /dev/detail-preview?capture=session 에 279차 저장 결과를
 * 결과 페이지 가운데 칼럼 폭(501px)으로 렌더하고, 플랫폼별 "이미지로 다운로드"·"분할 ZIP"과 같은 인자로 캡처한다.
 *   npm run dev (별도) → LABEL=before|after npx tsx scripts/284cha-platform-size-verify.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { DOWNLOAD_PLATFORMS, imageDownloadMaxPartHeight } from "../lib/download-platforms";
import { DEFAULT_SLICE_HEIGHT_PX } from "../lib/split-detail-download";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const LABEL = process.env.LABEL ?? "after";
const OUT = path.join(ROOT, "review", "284cha-sizes");
const SESSION_279 = path.join(ROOT, "review", "279cha-live", "session.json");
const COL_PX = 501;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const entry = path.join(OUT, "_entry.ts");
  fs.writeFileSync(entry, fs.readFileSync(path.join(ROOT, "lib", "capture-detail-png.ts"), "utf8"));
  const bundlePath = path.join(os.tmpdir(), "cap284.js");
  execSync(`npx esbuild "${entry}" --bundle --format=iife --global-name=PagzlyCapture --outfile="${bundlePath}" --log-level=error`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  const code = fs.readFileSync(bundlePath, "utf8");

  const session = JSON.parse(fs.readFileSync(SESSION_279, "utf8"));
  const g = session.generated ?? session;
  const payload = {
    sections: g.sections,
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: g.imageUrls ?? session.imageUrls,
    conceptIcons: g.conceptIcons,
  };
  const jobs = DOWNLOAD_PLATFORMS.flatMap((p) => [
    { platform: p.id, mode: "image", width: p.width, max: imageDownloadMaxPartHeight(p.id) },
    { platform: p.id, mode: "split", width: p.width, max: DEFAULT_SLICE_HEIGHT_PX },
  ]);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript({ content: "window.__name = (f) => f;" });
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.evaluate((p) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(p)), payload);
  await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
  await page.addStyleTag({ content: `[data-pagzly-preview]{max-width:${COL_PX}px !important}` });
  await page.waitForTimeout(2000);
  await page.addScriptTag({ content: code });

  const results = await page.evaluate(async (jobList) => {
    type Cap = {
      prepareCaptureRoot: (el: HTMLElement) => Promise<() => void>;
      captureDetailToPngBlobs: (el: HTMLElement, w: number, max?: number) => Promise<Blob[]>;
    };
    const cap = (window as unknown as { PagzlyCapture: Cap }).PagzlyCapture;
    const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
    const restore = await cap.prepareCaptureRoot(root);
    const out = [];
    for (const job of jobList) {
      const blobs = await cap.captureDetailToPngBlobs(root, job.width, job.max);
      const parts = [];
      for (const b of blobs) {
        const bmp = await createImageBitmap(b);
        parts.push({ w: bmp.width, h: bmp.height, bytes: b.size });
      }
      out.push({ ...job, cssH: root.scrollHeight, parts });
    }
    restore();
    return out;
  }, jobs);
  await browser.close();

  const lines = results.map((r) => {
    const maxBytes = Math.max(...r.parts.map((p) => p.bytes));
    const maxH = Math.max(...r.parts.map((p) => p.h));
    return (
      `${r.platform.padEnd(10)} ${r.mode.padEnd(5)} max=${r.max} → ${r.parts.length}장, 최대 세로 ${maxH}px, ` +
      `최대 ${(maxBytes / 1048576).toFixed(2)}MB | ${r.parts.map((p) => `${p.w}x${p.h} ${(p.bytes / 1048576).toFixed(2)}MB`).join(", ")}`
    );
  });
  lines.forEach((l) => console.log(l));
  fs.writeFileSync(path.join(OUT, `${LABEL}.json`), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, `${LABEL}.txt`), lines.join("\n") + "\n");
}

main().catch((e) => {
  console.error(String(e).replace(/https?:\/\/[a-z0-9-]+\.supabase\.co\S*/gi, "<supabase-url>"));
  process.exit(1);
});
