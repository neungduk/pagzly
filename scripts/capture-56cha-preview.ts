/**
 * 56차 — 55차 신규 UI 3종 무료 캡처 (API 호출 없음)
 *   npx tsx scripts/capture-56cha-preview.ts
 *
 * 전제: dev 서버 localhost:3000 실행 중
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";
import type { DetailSection } from "../lib/types/generate";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const EXPORT_HTML = path.join(ROOT, "review", "56cha-export.html");

/** capture=1 시 detail-preview와 동일한 목업 */
const capture56Sections: DetailSection[] = [
  {
    type: "hero",
    slot: "hero",
    headline: "데일리에 맞는 오버핏 실루엣",
    subheadline: "에센셜 코튼 티셔츠",
    imageIndex: 0,
    badge: "면 100%",
  },
  {
    type: "brand_story",
    slot: "brand_story",
    heading: "미니멀 라인의 기준",
    body: "불필요한 장식 없이 소재와 핏만으로 말하는 데일리웨어를 만듭니다.",
  },
  {
    type: "checklist",
    slot: "checklist",
    heading: "핏 포인트",
    items: ["20수 순면", "오버핏", "4색 컬러", "사계절"],
  },
  {
    type: "spec_table",
    slot: "spec_table",
    heading: "제품 정보",
    rows: [
      { label: "소재", value: "면 100%" },
      { label: "원산지", value: "국내" },
      { label: "색상", value: "3종" },
      { label: "제조사", value: "NEUTRAL LINE" },
    ],
  },
  {
    type: "gallery",
    slot: "model_multicut",
    heading: "착장 컷",
    imageIndexes: [0, 1, 2, 3],
  },
  {
    type: "step_card",
    slot: "step_card",
    heading: "코디 가이드",
    steps: [
      { title: "데님", body: "캐주얼 데일리룩.", imageIndex: 1 },
      { title: "슬랙스", body: "포멀한 오피스룩.", imageIndex: 2 },
    ],
  },
  {
    type: "spec_table",
    slot: "size_table",
    heading: "사이즈 안내",
    rows: [
      { label: "어깨너비", value: "48cm" },
      { label: "가슴단면", value: "52cm" },
      { label: "총장", value: "68cm" },
      { label: "소매길이", value: "62cm" },
      { label: "모델 착용", value: "판매자 확인 필요" },
    ],
  },
  {
    type: "faq",
    slot: "faq",
    heading: "자주 묻는 질문",
    items: [
      {
        question: "세탁 방법은 어떻게 되나요?",
        answer: "찬물 단독 세탁을 권장합니다.",
      },
      {
        question: "핏은 어떤가요?",
        answer: "오버핏이라 한 치수 크게 나옵니다.",
      },
    ],
  },
  {
    type: "spec_table",
    slot: "shipping_info",
    heading: "배송·교환 안내",
    rows: [
      { label: "배송비", value: "3,000원 (5만원 이상 무료)" },
      { label: "배송기간", value: "2~3영업일" },
    ],
  },
  {
    type: "cta_price",
    slot: "cta_price",
    price: 39000,
    targetCustomer: "20~40대 데일리룩",
    badges: ["면 100%", "당일발송"],
  },
];

const IMAGE_URLS = [
  "/iteration-fixtures/01.jpg",
  "/iteration-fixtures/02.jpg",
  "/iteration-fixtures/03.jpg",
  "/iteration-fixtures/04.jpg",
];

const FORBIDDEN_API = ["/api/generate", "/api/enhance"];

function bytes(file: string): number {
  return fs.statSync(file).size;
}

function writeExportHtml(): void {
  const html = buildDetailPageHtml({
    productName: "에센셜 코튼 티셔츠",
    brandName: "NEUTRAL LINE",
    category: "의류/패션",
    sections: capture56Sections,
    imageUrls: IMAGE_URLS,
    theme: getCategoryTheme("의류/패션"),
    price: 39000,
    description: "20수 순면 오버핏 데일리 티셔츠",
    features: ["면 100%", "오버핏", "4색"],
  });
  fs.mkdirSync(path.dirname(EXPORT_HTML), { recursive: true });
  fs.writeFileSync(EXPORT_HTML, html, "utf8");
  console.log(`[56cha] export HTML → ${EXPORT_HTML} (${bytes(EXPORT_HTML).toLocaleString()} bytes)`);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  writeExportHtml();

  const apiHits: string[] = [];
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  page.on("response", (res) => {
    const url = res.url();
    for (const forbidden of FORBIDDEN_API) {
      if (url.includes(forbidden)) apiHits.push(url);
    }
  });

  await page.goto(`${BASE_URL}/dev/detail-preview?capture=1`, { waitUntil: "networkidle" });
  await page.locator("text=FASHION").first().waitFor({ state: "visible", timeout: 15000 });
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(600);

  const fullPath = path.join(SHOT_DIR, "56cha-preview-full.png");
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`[56cha] ${fullPath} (${bytes(fullPath).toLocaleString()} bytes)`);

  const anchorNav = page.locator("nav[aria-label='섹션 이동']");
  await anchorNav.waitFor({ state: "visible" });
  const anchorPath = path.join(SHOT_DIR, "56cha-anchor-nav.png");
  await anchorNav.screenshot({ path: anchorPath });
  console.log(`[56cha] ${anchorPath} (${bytes(anchorPath).toLocaleString()} bytes)`);

  const brandLine = page.locator("text=NEUTRAL LINE").first();
  await brandLine.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const clipBox = await page.evaluate(() => {
    const brandEl = [...document.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("NEUTRAL LINE"),
    );
    const stripEl = [...document.querySelectorAll("div")].find(
      (d) =>
        d.textContent?.includes("소재") &&
        d.textContent?.includes("면 100%") &&
        d.textContent?.includes("원산지"),
    );
    if (!brandEl || !stripEl) return null;
    const top = brandEl.getBoundingClientRect().top;
    const bottom = stripEl.getBoundingClientRect().bottom;
    return {
      x: 0,
      y: Math.max(0, top - 8),
      width: window.innerWidth,
      height: bottom - top + 16,
    };
  });
  if (clipBox && clipBox.height > 0) {
    const quickPath = path.join(SHOT_DIR, "56cha-quick-fact.png");
    await page.screenshot({ path: quickPath, clip: clipBox });
    console.log(`[56cha] ${quickPath} (${bytes(quickPath).toLocaleString()} bytes)`);
  } else {
    console.warn("[56cha] quick-fact clip skipped — elements not found");
  }

  const sizeDiagram = page.locator('svg[aria-label="사이즈 실측 다이어그램"]');
  await sizeDiagram.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const sizePath = path.join(SHOT_DIR, "56cha-size-diagram.png");
  await sizeDiagram.screenshot({ path: sizePath });
  console.log(`[56cha] ${sizePath} (${bytes(sizePath).toLocaleString()} bytes)`);

  await browser.close();

  const exportPage = await chromium.launch({ headless: true });
  const exportBrowserPage = await exportPage.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  exportBrowserPage.on("response", (res) => {
    const url = res.url();
    for (const forbidden of FORBIDDEN_API) {
      if (url.includes(forbidden)) apiHits.push(url);
    }
  });

  const fileUrl = `file:///${EXPORT_HTML.replace(/\\/g, "/")}`;
  await exportBrowserPage.goto(fileUrl, { waitUntil: "networkidle" });
  await exportBrowserPage.waitForTimeout(500);
  const exportShotPath = path.join(SHOT_DIR, "56cha-export-full.png");
  await exportBrowserPage.screenshot({ path: exportShotPath, fullPage: true });
  console.log(`[56cha] ${exportShotPath} (${bytes(exportShotPath).toLocaleString()} bytes)`);
  await exportPage.close();

  console.log(`\n[56cha] API 호출 감지: ${apiHits.length}건`);
  if (apiHits.length > 0) {
    for (const u of apiHits) console.log(`  - ${u}`);
    process.exit(1);
  }
  console.log("[56cha] /api/generate, /api/enhance 호출 없음 ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
