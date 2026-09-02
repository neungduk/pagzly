/**
 * 69차 — INFO 시각 요소 확장 무료 캡처 + 단위 검증
 *   npx tsx scripts/capture-69cha-preview.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";
import {
  parseIngredientLabels,
  parseIngredientPairLabels,
} from "../lib/ingredient-labels";
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";
import type { ProductImageRole } from "../lib/image-roles";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function assertLabelsAndApply() {
  const two = parseIngredientPairLabels("카멜리아 오일, 세라마이드");
  if (!two || two[0] !== "카멜리아 오일" || two[1] !== "세라마이드") {
    throw new Error("parseIngredientPairLabels 2개 실패");
  }
  const one = parseIngredientLabels("히알루론산");
  if (!one || one.length !== 1 || one[0] !== "히알루론산") {
    throw new Error("parseIngredientLabels 1개 실패");
  }
  if (parseIngredientLabels("") !== null) {
    throw new Error("빈 문자열은 null");
  }
  if (parseIngredientPairLabels("히알루론산") !== null) {
    throw new Error("pair 파서는 1개일 때 null");
  }

  const base: DetailSection[] = [
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "a",
      body: "b",
      imageIndex: 1,
      imagePosition: "left",
    },
    {
      type: "image_text",
      slot: "texture_feel",
      heading: "c",
      body: "d",
      imageIndex: 2,
      imagePosition: "left",
    },
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "제품 정보",
      rows: [{ label: "용량", value: "50ml" }],
    },
  ];
  const urls = ["u0", "u1", "u2"];

  const pair = applyIngredientCircleVisual(base, urls, "히알루론산, 판테놀");
  if (!pair.applied) throw new Error("circle-pair 적용 실패");
  const pairSection = pair.sections.find((s) => s.type === "image_text" && s.layout === "circle-pair");
  if (!pairSection || pairSection.type !== "image_text") throw new Error("circle-pair 섹션 없음");

  const solo = applyIngredientCircleVisual(base, urls, "히알루론산");
  if (!solo.applied) throw new Error("circle-solo 적용 실패");
  const soloSection = solo.sections.find((s) => s.type === "image_text" && s.layout === "circle-solo");
  if (!soloSection || soloSection.type !== "image_text" || !soloSection.circleSolo) {
    throw new Error("circle-solo 섹션 없음");
  }
  if (soloSection.circleSolo.label !== "히알루론산") throw new Error("solo 라벨 불일치");

  const skipped = applyIngredientCircleVisual(base, urls, "");
  if (skipped.applied) throw new Error("성분 없을 때 생성되면 안 됨");

  const roles: ProductImageRole[] = ["hero", "detail", "detail", "lifestyle"];
  const withSpec: DetailSection[] = [
    { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 },
    ...base,
  ];
  const assigned = assignDistinctSectionImages(withSpec, 4, { imageRoles: roles });
  const spec = assigned.find((s) => s.type === "spec_table" && s.slot === "spec_table");
  if (!spec || spec.type !== "spec_table" || !spec.imageIndexes || spec.imageIndexes.length < 2) {
    throw new Error("spec_table 다중 배정 실패");
  }

  console.log("[69cha] label / apply / spec assign unit checks ✓");
}

async function capture(
  name: string,
  capture: string,
  waitText: string,
  assertFn?: (page: import("playwright").Page) => Promise<void>,
) {
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

  if (assertFn) await assertFn(page);

  const fullPath = path.join(SHOT_DIR, `${name}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[69cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

  await browser.close();
  if (apiHits.length > 0) throw new Error(`API 호출: ${apiHits.join(", ")}`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  assertLabelsAndApply();

  await capture("69cha-circle-solo", "69-circle-solo", "히알루론산", async (page) => {
    const soloCircle = await page.locator("img.h-\\[7\\.5rem\\].rounded-full").count();
    const pairLabels = await page.locator("text=판테놀").count();
    if (soloCircle < 1 || pairLabels > 0) {
      throw new Error("circle-solo 렌더 미확인");
    }
  });

  await capture("69cha-circle-pair", "65-circle-pair", "히알루론산", async (page) => {
    const circles = await page.locator("img.h-24.w-24.rounded-full").count();
    if (circles < 2) throw new Error("circle-pair 회귀");
  });

  await capture("69cha-no-ingredients", "65-no-ingredients", "제품 정보", async (page) => {
    const pairLabels = await page.locator("text=판테놀").count();
    const circlePairImages = await page.locator("section img.h-24.w-24.rounded-full").count();
    const soloCircle = await page.locator("img.h-\\[7\\.5rem\\].rounded-full").count();
    if (pairLabels > 0 || circlePairImages >= 2 || soloCircle > 0) {
      throw new Error("성분 없음 회귀 — circle visual 노출");
    }
  });

  await capture("69cha-spec-table-multi", "69-spec-multi", "제품 정보", async (page) => {
    const thumbs = await page.locator("section img.h-20.w-20.rounded-xl").count();
    if (thumbs < 2) throw new Error("spec_table 다중 썸네일 미확인");
  });

  console.log("[69cha] 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
