/**
 * 다운로드 PNG 검증 (콘솔 로그 포함)
 *   npx tsx scripts/verify-download-png.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT = path.join(ROOT, "review", "qa-screenshots", "download-verify.png");

function enrichSession(raw: string): string {
  const session = JSON.parse(raw) as Record<string, unknown> & {
    generated?: {
      imageAnalysis?: string;
      theme?: { baseNeutral?: string };
      sections?: unknown[];
      photoCostBreakdown?: Record<string, number>;
    };
    photoProcessingCost?: number;
    photoCostBreakdown?: Record<string, number>;
    backdropFailed?: boolean;
  };
  if (!session.pipelineSummary) {
    const generated = session.generated;
    const pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated?.imageAnalysis || "fixture",
      theme: generated?.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated?.photoCostBreakdown,
      backdropFailed: Boolean(session.backdropFailed),
      sectionCount: generated?.sections?.length ?? 0,
    });
    pipelineSummary.completedAt = new Date().toISOString();
    session.pipelineSummary = pipelineSummary;
  }
  session.draftApproved = true;
  return JSON.stringify(session);
}

async function main() {
  const sessionRaw = enrichSession(fs.readFileSync(SESSION_PATH, "utf8"));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}]`, msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => {
    console.log("[pageerror]", err.message);
  });

  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  await page.evaluate((raw) => {
    sessionStorage.setItem("pagzly-create-result", raw);
  }, sessionRaw);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="detail-preview"]', { timeout: 30000 });
  await page.waitForTimeout(1000);

  const expand = page.getByRole("button", { name: /더 보기|펼치기|전체/ });
  if (await expand.count()) {
    await expand.first().click().catch(() => undefined);
    await page.waitForTimeout(800);
  }

  const downloadBtn = page.getByRole("button", { name: /이미지로 다운로드|다운로드 준비/ });
  await downloadBtn.first().waitFor({ timeout: 15000 });
  console.log("button text:", await downloadBtn.first().innerText());

  // 미리보기 크기 + 보이는 preview 선택
  const stats = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('[data-testid="detail-preview"]')];
    const visible = nodes.find((n) => n.getBoundingClientRect().width >= 40);
    const root = visible ?? nodes[0] ?? null;
    if (!root) return { count: nodes.length };
    return {
      count: nodes.length,
      w: root.offsetWidth,
      h: root.scrollHeight,
      imgs: root.querySelectorAll("img").length,
      reveal0: [...root.querySelectorAll<HTMLElement>("[data-scroll-reveal]")].filter(
        (el) => getComputedStyle(el).opacity === "0",
      ).length,
    };
  });
  console.log("preview stats", stats);

  const downloadPromise = page.waitForEvent("download", { timeout: 120000 }).catch((e) => e);
  await downloadBtn.first().click();
  console.log("clicked download, waiting...");

  // 진행 상태 폴링
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(3000);
    const label = await downloadBtn.first().innerText().catch(() => "?");
    console.log(`t=${(i + 1) * 3}s button="${label}"`);
    if (!label.includes("준비")) break;
  }

  const download = await downloadPromise;
  if (download instanceof Error) {
    console.error("download event failed:", download.message);
    await browser.close();
    process.exit(1);
  }

  await download.saveAs(OUT);
  const bytes = fs.statSync(OUT).size;
  console.log("saved bytes", bytes);
  if (bytes < 1000) {
    console.error("FAIL: file too small");
    await browser.close();
    process.exit(1);
  }

  const meta = await sharp(OUT, { limitInputPixels: false }).metadata();
  const { data, info } = await sharp(OUT, { limitInputPixels: false })
    .resize({ width: 200 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let nonWhite = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! < 245 || data[i + 1]! < 245 || data[i + 2]! < 240) nonWhite += 1;
  }
  const ratio = nonWhite / (info.width * info.height);
  const pass =
    ratio > 0.05 &&
    (meta.height ?? 0) > 1000 &&
    (meta.width ?? 0) >= 500 &&
    bytes > 50_000;
  console.log(
    JSON.stringify(
      {
        file: OUT,
        bytes,
        width: meta.width,
        height: meta.height,
        nonWhiteRatio: Number(ratio.toFixed(4)),
        pass,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
