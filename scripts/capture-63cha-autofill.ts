/**
 * 63차 — create 폼 AI 자동입력 UI 캡처 (로그인 필요)
 *   npx tsx scripts/capture-63cha-autofill.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 필요");
  }
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
  });

  await page.goto(`${BASE_URL}/create/detail`, { waitUntil: "networkidle" });
  await page.locator("select").first().waitFor({ timeout: 30000 });
  await page.locator("select").first().selectOption({ label: "화장품/뷰티" });
  await page.fill("#productName", "히알루론 딥 모이스처 세럼");

  const beforePath = path.join(SHOT_DIR, "63cha-autofill-before.png");
  await page.screenshot({ path: beforePath, fullPage: false });
  console.log(`[63cha] ${beforePath} (${bytes(beforePath).toLocaleString()} bytes)`);

  const btn = page.getByRole("button", { name: "AI 자동입력" });
  await btn.waitFor({ state: "visible" });
  const disabledBefore = await btn.isDisabled();
  if (disabledBefore) throw new Error("자동입력 버튼이 비활성 상태");

  const apiPromise = page.waitForResponse((res) => res.url().includes("/api/autofill-draft"));
  await btn.click();
  const apiRes = await apiPromise;
  if (!apiRes.ok()) throw new Error(`autofill API ${apiRes.status()}`);
  const apiJson = (await apiRes.json()) as {
    draft?: { keyFeatures?: string; targetCustomer?: string };
    cost?: number;
  };
  console.log(`[63cha] API cost=$${(apiJson.cost ?? 0).toFixed(6)}`);

  await page.waitForTimeout(800);
  const keyFeatures = await page.inputValue("#keyFeatures");
  if (!keyFeatures.trim()) {
    console.warn("[63cha] keyFeatures 비어 있음 — DeepSeek 키/응답 확인");
  }

  const ingredientsBefore = "";
  await page.fill("#ingredients", ingredientsBefore);
  const ingredientsAfter = await page.inputValue("#ingredients");
  const certs = await page.inputValue("#certifications");

  const notice = await page.locator("text=AI가 작성한 초안입니다").count();
  const afterPath = path.join(SHOT_DIR, "63cha-autofill-after.png");
  await page.screenshot({ path: afterPath, fullPage: false });
  console.log(`[63cha] ${afterPath} (${bytes(afterPath).toLocaleString()} bytes)`);
  console.log(`[63cha] notice=${notice}, ingredients unchanged=${ingredientsAfter === ""}, certs empty=${certs === ""}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
