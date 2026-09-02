/**
 * 70차 — 사진 기반 AI 자동입력 폼 캡처 (로그인 + Pexels 사진 필요)
 *   npx tsx scripts/capture-70cha-autofill.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const ASSET_DIR = path.join(__dirname, "test-assets", "_70cha-autofill");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

type PexelsPhoto = { id: number; src: { large2x: string; large: string } };

async function crawlPexels(apiKey: string): Promise<string[]> {
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const query = "face cream jar white background skincare";
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "8");
  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = (await res.json()) as { photos: PexelsPhoto[] };
  const files: string[] = [];
  for (const photo of data.photos.slice(0, 4)) {
    const imgRes = await fetch(photo.src.large2x || photo.src.large);
    if (!imgRes.ok) continue;
    const buf = await sharp(Buffer.from(await imgRes.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
    const file = path.join(ASSET_DIR, `pexels-${photo.id}.jpeg`);
    fs.writeFileSync(file, buf);
    files.push(file);
  }
  if (files.length < 2) throw new Error("Pexels 사진 2장 이상 필요");
  return files;
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 필요");
  }
  const env = loadEnvLocal();
  const pexelsKey = process.env.PEXELS_API_KEY ?? env.PEXELS_API_KEY;
  if (!pexelsKey) throw new Error("PEXELS_API_KEY 필요");

  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const images = await crawlPexels(pexelsKey);
  console.log(`[70cha] Pexels ${images.length}장 준비`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.locator("select").first().waitFor({ timeout: 30000 });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.setInputFiles('input[type="file"][accept*="image/jpeg"]', images);
  await page.fill("#productName", "시카 수딩 크림 50ml");

  const hint = await page.locator('[data-testid="photo-minimal-input-hint"]').count();
  if (hint < 1) throw new Error("최소 입력 안내 문구 없음");

  const beforePath = path.join(SHOT_DIR, "70cha-autofill-before.png");
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log(`[70cha] ${beforePath} (${bytes(beforePath).toLocaleString()} bytes)`);

  const btn = page.getByRole("button", { name: "AI 자동입력" });
  const apiPromise = page.waitForResponse((res) => res.url().includes("/api/autofill-draft"));
  await btn.click();
  const apiRes = await apiPromise;
  if (!apiRes.ok()) throw new Error(`autofill API ${apiRes.status()}`);
  const apiJson = (await apiRes.json()) as {
    draft?: { keyFeatures?: string };
    cost?: number;
    visionCost?: number;
    visionImageCount?: number;
  };
  console.log(
    `[70cha] API total=$${(apiJson.cost ?? 0).toFixed(6)} vision=$${(apiJson.visionCost ?? 0).toFixed(6)} images=${apiJson.visionImageCount ?? 0}`,
  );
  if ((apiJson.visionImageCount ?? 0) < 1) {
    throw new Error("Vision 분석 장수 0 — 사진 연동 실패");
  }

  await page.waitForTimeout(1000);
  const keyFeatures = await page.inputValue("#keyFeatures");
  if (!keyFeatures.trim()) {
    console.warn("[70cha] keyFeatures 비어 있음");
  }

  const ingredients = await page.inputValue("#ingredients");
  const certifications = await page.inputValue("#certifications");
  if (ingredients.trim() || certifications.trim()) {
    throw new Error("성분/인증 필드가 채워짐");
  }

  const afterPath = path.join(SHOT_DIR, "70cha-autofill-after.png");
  await page.screenshot({ path: afterPath, fullPage: false });
  console.log(`[70cha] ${afterPath} (${bytes(afterPath).toLocaleString()} bytes)`);
  console.log(`[70cha] keyFeatures preview: ${keyFeatures.slice(0, 120)}…`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
