/**
 * /dev/detail-preview 로 다이나믹스 A~D 시각 확인 (생성 API 호출 없음).
 * npx tsx scripts/capture-dynamics-preview.ts
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(__dirname, "..", "review");

async function shot(
  page: import("playwright").Page,
  name: string,
  locator?: import("playwright").Locator,
) {
  const file = path.join(OUT, name);
  if (locator && (await locator.count()) > 0) {
    await locator.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
  }
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", name);
}

async function captureAtWidth(width: number, label: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height: width <= 400 ? 844 : 900 },
    reducedMotion: "no-preference",
  });

  await page.goto(`${BASE_URL}/dev/detail-preview`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(800);

  // A: hero + follow (diagonal clip) — scroll to top then shoot hero area
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await shot(page, `dynamics-${label}-hero-follow.png`);

  // D: edit mode — badge vs 이미지 교체
  const editToggle = page.getByRole("button", { name: /편집|수정/ });
  if ((await editToggle.count()) > 0) {
    await editToggle.first().click();
    await page.waitForTimeout(400);
  } else {
    // DetailActionBar may use tab
    const editTab = page.getByText("편집", { exact: false });
    if ((await editTab.count()) > 0) await editTab.first().click();
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await shot(page, `dynamics-${label}-hero-badge-edit.png`);

  // B: stat_infographic
  const stat = page.getByText("수치로 보는 핵심 포인트");
  await shot(page, `dynamics-${label}-stat-layered.png`, stat);

  // B: review_highlight
  const review = page.getByText("실제 구매자 리뷰에서 자주 나온 내용을 요약했습니다");
  await shot(page, `dynamics-${label}-review-layered.png`, review);

  // C: hero-follow motion — reload, scroll slowly, capture mid-entry
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  // scroll past sticky chrome into hero-follow section
  for (let y = 0; y <= 420; y += 40) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(200);
  await shot(page, `dynamics-${label}-hero-follow-scroll.png`);

  // clip-path check via computed style on hero-follow wrapper
  const clipInfo = await page.evaluate(() => {
    const hero = document.querySelector(".pagzly-hero-photo");
    const section = hero?.closest("section");
    const followWrap = section?.parentElement?.nextElementSibling as HTMLElement | null;
    // DetailScrollReveal wraps; find element with clip-path
    const clipped = Array.from(document.querySelectorAll("[style*='clip-path'], [style*='clipPath']")) as HTMLElement[];
    return clipped.slice(0, 3).map((el) => ({
      tag: el.tagName,
      className: el.className,
      clip: el.style.clipPath || getComputedStyle(el).clipPath,
      marginTop: getComputedStyle(el).marginTop,
    }));
  });
  console.log(`[${label}] clip wrappers`, JSON.stringify(clipInfo, null, 2));

  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await captureAtWidth(1280, "desktop");
  await captureAtWidth(375, "mobile");
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
