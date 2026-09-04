/**
 * 119차 — 워드마크/식품 다이어그램/생활 패턴 검증 캡처 (API 없음)
 * npx tsx scripts/119cha-verify-capture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";
import { getCategoryPatternBackground } from "../lib/design-tokens";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(__dirname, "..", "review");

async function main() {
  // 생활용품 패턴 키 존재
  const livingPat = getCategoryPatternBackground("생활용품");
  if (!livingPat || !livingPat.includes("data:image/svg+xml")) {
    throw new Error("생활용품 CATEGORY_PATTERN_SVG missing");
  }
  console.log("[119] living pattern OK");

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  // --- 밝은 히어로 워드마크 (화장품 픽스처 = 노란 배경) ---
  await page.goto(`${BASE}/dev/detail-preview?capture=58-cosmetics`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=AURA LAB").first().waitFor({ state: "visible", timeout: 20000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const wm = page.locator('[data-hero-brand-mark="wordmark"]');
  await wm.waitFor({ state: "visible" });
  const scrim = await wm.getAttribute("data-wordmark-scrim");
  if (scrim !== "local") throw new Error("wordmark scrim missing");
  const bg = await wm.evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log("[119] bright wordmark wrap bg=", bg);

  // 워드마크 주변만 크롭 (섹션 전체가 아닌 래퍼)
  await wm.screenshot({ path: path.join(OUT, "119cha-wordmark-bright.png") });

  // 히어로 상단 뷰포트 (워드마크 포함) — section first 자식 중 hero 영역만 clip
  const heroBox = await page.locator("[data-pagzly-preview] section").first().boundingBox();
  if (!heroBox) throw new Error("no hero box");
  await page.screenshot({
    path: path.join(OUT, "119cha-wordmark-bright-hero.png"),
    clip: {
      x: heroBox.x,
      y: heroBox.y,
      width: heroBox.width,
      height: Math.min(heroBox.height, 420),
    },
  });

  // --- 어두운 히어로: 히어로 사진을 거의 검정으로 ---
  await page.evaluate(() => {
    const img = document.querySelector(
      "[data-pagzly-preview] section .pagzly-hero-photo",
    ) as HTMLImageElement | null;
    if (img) {
      img.style.objectFit = "cover";
      img.style.filter = "brightness(0.15)";
    }
  });
  await page.waitForTimeout(200);
  await wm.screenshot({ path: path.join(OUT, "119cha-wordmark-dark.png") });
  await page.screenshot({
    path: path.join(OUT, "119cha-wordmark-dark-hero.png"),
    clip: {
      x: heroBox.x,
      y: heroBox.y,
      width: heroBox.width,
      height: Math.min(heroBox.height, 420),
    },
  });
  console.log("[119] wordmark bright+dark captured");

  // --- 식품 다이어그램 ---
  await page.goto(`${BASE}/dev/detail-preview?capture=58-food`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=한그릇 키친").first().waitFor({ state: "visible", timeout: 20000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(300);
  const diag = page.locator('svg[aria-label="크기 비교 다이어그램"]').first();
  await diag.waitFor({ state: "visible", timeout: 15000 });
  const sec = diag.locator("xpath=ancestor::section[1]");
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await sec.screenshot({ path: path.join(OUT, "119cha-food-diagram.png") });
  const stroke = await diag.locator("rect").first().evaluate((el) => el.getAttribute("stroke"));
  console.log("[119] food diagram stroke=", stroke);

  // --- 생활용품 패턴 (본문 섹션 backgroundImage에 svg) ---
  await page.goto(`${BASE}/dev/detail-preview?capture=58-living`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=PLAIN HOME").first().waitFor({ state: "visible", timeout: 20000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const patternHit = await page.evaluate(() => {
    const root = document.querySelector("[data-pagzly-preview]");
    if (!root) return { found: false, preview: "" };
    for (const el of root.querySelectorAll("*")) {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg.includes("svg+xml") || bg.includes("data:image")) {
        return { found: true, preview: bg.slice(0, 140) };
      }
    }
    return { found: false, preview: "" };
  });
  if (!patternHit.found) {
    throw new Error("living section pattern background not found in DOM");
  }
  // 패턴이 있는 첫 요소 스크린샷 (보통 brand_story 본문 패드)
  const livingTarget = page.locator("[data-pagzly-preview] section").nth(1);
  await livingTarget.scrollIntoViewIfNeeded();
  await livingTarget.screenshot({ path: path.join(OUT, "119cha-living-pattern.png") });
  console.log("[119] living pattern DOM OK", patternHit.preview.slice(0, 80));

  await browser.close();
  console.log("119cha-verify-capture PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
