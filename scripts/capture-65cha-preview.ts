/**
 * 65차 — circle-pair 무료 캡처 + 성분 라벨 파싱 단위 검증
 *   npx tsx scripts/capture-65cha-preview.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";
import { parseIngredientPairLabels, parseIngredientLabels } from "../lib/ingredient-labels";
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function assertLabels() {
  const ok = parseIngredientPairLabels("카멜리아 오일, 세라마이드");
  if (!ok || ok[0] !== "카멜리아 오일" || ok[1] !== "세라마이드") {
    throw new Error("parseIngredientPairLabels 2개 실패");
  }
  if (parseIngredientPairLabels("히알루론산") !== null) {
    throw new Error("pair 파서는 1개일 때 null");
  }
  const one = parseIngredientLabels("히알루론산");
  if (!one || one.length !== 1) {
    throw new Error("parseIngredientLabels 1개 실패");
  }
  if (parseIngredientPairLabels("") !== null) {
    throw new Error("빈 문자열은 null");
  }

  const sections: DetailSection[] = [
    { type: "image_text", slot: "ingredient_highlight", heading: "a", body: "b", imageIndex: 1, imagePosition: "left" },
    { type: "image_text", slot: "texture_feel", heading: "c", body: "d", imageIndex: 2, imagePosition: "left" },
    { type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: [{ label: "용량", value: "50ml" }] },
  ];
  const urls = ["u0", "u1", "u2"];
  const applied = applyIngredientCircleVisual(sections, urls, "히알루론산, 판테놀");
  if (!applied.applied) throw new Error("applyIngredientCircleVisual 적용 실패");
  const pair = applied.sections.find((s) => s.type === "image_text" && s.layout === "circle-pair");
  if (!pair || pair.type !== "image_text" || !pair.circlePair) throw new Error("circle-pair 섹션 없음");
  if (pair.circlePair[0]?.label !== "히알루론산" || pair.circlePair[1]?.label !== "판테놀") {
    throw new Error("라벨 불일치");
  }
  const solo = applyIngredientCircleVisual(sections, urls, "히알루론산");
  if (!solo.applied) throw new Error("1개 성분 circle-solo 적용 실패");
  const soloSection = solo.sections.find((s) => s.type === "image_text" && s.layout === "circle-solo");
  if (!soloSection) throw new Error("circle-solo 섹션 없음");
  console.log("[65cha] ingredient label / apply unit checks ✓");
}

async function capture(name: string, capture: string, waitText: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  const apiHits: string[] = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/generate") || url.includes("/api/enhance")) apiHits.push(url);
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=${capture}`, { waitUntil: "networkidle" });
  await page.locator(`text=${waitText}`).first().waitFor({ state: "visible", timeout: 15000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  const fullPath = path.join(SHOT_DIR, `${name}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[65cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

  if (capture === "65-circle-pair") {
    const circles = await page.locator("img.rounded-full").count();
    const hLabel = await page.locator("text=히알루론산").count();
    const pLabel = await page.locator("text=판테놀").count();
    console.log(`[65cha] rounded-full: ${circles}, labels: ${hLabel}/${pLabel}`);
    if (circles < 2 || hLabel < 1 || pLabel < 1) {
      await browser.close();
      throw new Error("circle-pair 렌더 미확인");
    }
  } else {
    const pairLabel = await page.locator("text=판테놀").count();
    const circlePairImages = await page.locator("section img.h-24.w-24.rounded-full").count();
    if (pairLabel > 0 || circlePairImages >= 2) {
      await browser.close();
      throw new Error("성분 없음 프리셋에 circle-pair가 보임");
    }
  }

  await browser.close();
  if (apiHits.length > 0) throw new Error(`API 호출: ${apiHits.join(", ")}`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  assertLabels();
  await capture("65cha-circle-pair", "65-circle-pair", "히알루론산");
  await capture("65cha-no-ingredients", "65-no-ingredients", "제품 정보");
  console.log("[65cha] 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
