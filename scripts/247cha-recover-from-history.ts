/**
 * 247차 — /create/history에서 246차 생성물 복구 (유료 API 0).
 *   npx tsx scripts/247cha-recover-from-history.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { freezeDetailScrollReveal } from "./capture-utils";

const ROOT = path.join(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const OUT = path.join(ROOT, "review", "247cha-recovered");

const EXPECT_NAME = "라이트 워터 히알루론 세럼";
const EXPECT_CATEGORY = "화장품/뷰티";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    throw new Error("scripts/auth-state.json 없음");
  }

  const report: Record<string, unknown> = {
    visitedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    expectName: EXPECT_NAME,
    expectCategory: EXPECT_CATEGORY,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  console.log("[1] /create/history …");
  await page.goto(`${BASE_URL}/create/history`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT, "history-page.png"),
    fullPage: true,
  });

  const empty = await page.getByText("아직 저장된 작업이 없습니다").count();
  if (empty > 0) {
    report.historyEmpty = true;
    report.match = false;
    report.stage = "history-empty";
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("HISTORY EMPTY");
    await browser.close();
    return;
  }

  const firstLink = page.locator('a[href^="/create/result?id="]').first();
  const linkCount = await page.locator('a[href^="/create/result?id="]').count();
  report.linkCount = linkCount;

  if (linkCount === 0) {
    report.match = false;
    report.stage = "no-result-links";
    // capture body text snippet
    report.bodySnippet = (await page.locator("main").innerText().catch(() => "")).slice(0, 800);
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("NO LINKS");
    await browser.close();
    return;
  }

  const href = (await firstLink.getAttribute("href")) ?? "";
  const idMatch = href.match(/id=([^&]+)/);
  const productId = idMatch ? decodeURIComponent(idMatch[1]!) : null;

  const cardText = (await firstLink.innerText()).replace(/\s+/g, " ").trim();
  report.topItem = { href, productId, cardText };

  const nameOk = cardText.includes(EXPECT_NAME);
  const catOk = cardText.includes(EXPECT_CATEGORY);
  // created_at is formatted like "2026. 9. 23. …" or similar
  const dateOk =
    /2026/.test(cardText) &&
    (/9\s*\.?\s*23|09\.?\s*23|9월\s*23|Sep|september/i.test(cardText) ||
      cardText.includes("오후") ||
      cardText.includes("오전"));

  report.nameOk = nameOk;
  report.catOk = catOk;
  report.dateOk = dateOk;
  report.match = nameOk && catOk;

  console.log("[top]", JSON.stringify(report.topItem));
  console.log("[match]", { nameOk, catOk, dateOk, match: report.match });

  if (!report.match) {
    report.stage = "top-item-mismatch";
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("TOP ITEM NOT 246 PRODUCT — stop");
    await browser.close();
    return;
  }

  console.log("[2] open result …", href);
  await firstLink.click();
  try {
    await page.waitForURL(/\/create\/result\?id=/, { timeout: 120_000 });
  } catch (e) {
    report.stage = "navigation-timeout";
    report.navError = e instanceof Error ? e.message : String(e);
    report.currentUrl = page.url();
    await page.screenshot({
      path: path.join(OUT, "result-nav-fail.png"),
      fullPage: true,
    });
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("NAV FAIL", report.currentUrl);
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000);
  report.resultUrl = page.url();
  report.productIdFromUrl = (() => {
    try {
      return new URL(page.url()).searchParams.get("id");
    } catch {
      return null;
    }
  })();

  // error / empty checks
  const bodyText = await page.locator("body").innerText().catch(() => "");
  report.bodyHead = bodyText.slice(0, 500);
  const looksError =
    /찾을 수 없|오류|error|존재하지 않|권한이 없/i.test(bodyText) &&
    !(await page.locator('[data-testid="detail-preview"]').count());

  if (looksError) {
    report.stage = "result-error-or-empty";
    await page.screenshot({
      path: path.join(OUT, "result-error.png"),
      fullPage: true,
    });
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("RESULT ERROR/EMPTY");
    await browser.close();
    return;
  }

  const preview = page.locator('[data-testid="detail-preview"]');
  const previewCount = await preview.count();
  report.previewCount = previewCount;

  if (previewCount === 0) {
    report.stage = "no-detail-preview";
    await page.screenshot({
      path: path.join(OUT, "showcase-full.png"),
      fullPage: true,
    });
    fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
    console.log("NO detail-preview");
    await browser.close();
    return;
  }

  await freezeDetailScrollReveal(page).catch(() => undefined);
  await page.waitForTimeout(500);

  await preview.first().screenshot({
    path: path.join(OUT, "showcase-detail.png"),
  });
  await page.screenshot({
    path: path.join(OUT, "showcase-full.png"),
    fullPage: true,
  });

  // sessionStorage
  const sessionRaw = await page.evaluate(() => {
    try {
      return sessionStorage.getItem("pagzly-create-result");
    } catch {
      return null;
    }
  });
  report.hasSessionStorage = Boolean(sessionRaw);
  if (sessionRaw) {
    fs.writeFileSync(path.join(OUT, "session.json"), sessionRaw, "utf8");
    try {
      const parsed = JSON.parse(sessionRaw) as {
        generated?: { sections?: { type: string }[] };
        productName?: string;
        category?: string;
      };
      report.sessionProductName = parsed.productName;
      report.sessionCategory = parsed.category;
      report.sectionTypes = (parsed.generated?.sections ?? []).map((s) => s.type);
      report.sectionCount = (parsed.generated?.sections ?? []).length;
    } catch {
      report.sessionParseError = true;
    }
  }

  // Try HTML export download
  const htmlBtn = page.getByRole("button", { name: /HTML 보내기/ });
  if ((await htmlBtn.count()) > 0) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }).catch(() => null),
      htmlBtn.first().click(),
    ]);
    if (download) {
      const dest = path.join(OUT, "showcase.html");
      await download.saveAs(dest);
      report.exportHtmlBytes = fs.statSync(dest).size;
      report.exportHtmlSaved = true;
    } else {
      report.exportHtmlSaved = false;
      report.exportNote = "HTML 보내기 click but no download event";
    }
  } else {
    report.exportHtmlSaved = false;
    report.exportNote = "HTML 보내기 button not found";
  }

  // Dom section headings as fallback structure note
  const headings = await page
    .locator('[data-testid="detail-preview"] h2, [data-testid="detail-preview"] h1')
    .allTextContents()
    .catch(() => [] as string[]);
  report.previewHeadings = headings.slice(0, 40);

  report.stage = "recovered";
  report.success = true;
  fs.writeFileSync(path.join(OUT, "recover-meta.json"), JSON.stringify(report, null, 2));
  console.log("RECOVERED", report.productIdFromUrl, "sections", report.sectionCount);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
