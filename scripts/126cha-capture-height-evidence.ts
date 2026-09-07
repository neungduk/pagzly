/**
 * 126차 — /create/detail 에서 #productHeightCm 스크린샷 + 로그 증거
 * npx tsx scripts/126cha-capture-height-evidence.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STORAGE = path.join(__dirname, "auth-state.json");
const OUT = path.join(__dirname, "..", "review");
const TEST_EMAIL = "pagelab-test@test.local";
const TEST_PASSWORD = "TestPass1234!";

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const logs: string[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(STORAGE) ? STORAGE : undefined,
    viewport: { width: 900, height: 1400 },
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("[126cha]") || t.includes("[125cha]")) logs.push(t);
  });

  // CreateProductForm은 /create 가 아니라 /create/detail
  await page.goto(`${BASE_URL}/create/detail`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  logs.push(`[126cha-evidence] url_after_goto=${page.url()}`);

  if (page.url().includes("/login")) {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25000 });
    await context.storageState({ path: STORAGE });
    await page.goto(`${BASE_URL}/create/detail`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  } else {
    await page.waitForLoadState("networkidle");
  }
  logs.push(`[126cha-evidence] url_ready=${page.url()}`);

  const html = await page.content();
  fs.writeFileSync(path.join(OUT, "126cha-create-page-snippet.html"), html.slice(0, 12000), "utf8");
  logs.push(`[126cha-evidence] html_has_productHeightCm=${html.includes("productHeightCm")}`);
  logs.push(`[126cha-evidence] html_has_lifestyleImage=${html.includes("lifestyleImage")}`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  const height = page.locator("#productHeightCm");
  const count = await height.count();
  logs.push(`[126cha-evidence] locator_count=${count}`);
  if (count === 0) {
    await page.screenshot({
      path: path.join(OUT, "126cha-create-page-debug.png"),
      fullPage: true,
    });
    fs.writeFileSync(path.join(OUT, "126cha-console-evidence.log"), logs.join("\n") + "\n");
    throw new Error("#productHeightCm not in DOM");
  }

  await height.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await height.fill("9");
  const value = await height.inputValue();
  logs.push(`[126cha-evidence] inputValue=${value}`);

  const shotPath = path.join(OUT, "126cha-product-height-field.png");
  await page.screenshot({ path: shotPath, fullPage: false });
  logs.push(`[126cha-evidence] screenshot=${shotPath}`);

  await page.evaluate(() => {
    const snap = {
      category: "화장품/뷰티",
      compositionLength: "long",
      productName: "126차 높이검증",
      brandName: "TEST",
      price: "10000",
      targetCustomer: "",
      keyFeatures: "",
      productSizeHint: "35mL",
      productHeightCm: "9",
      enableAiLifestyleShots: false,
      ingredients: "",
      certifications: "",
      competitorUrl: "",
      wholesaleUrl: "",
      sellerTrustEvidence: "",
    };
    sessionStorage.setItem(
      "pagzly-create-draft",
      JSON.stringify({
        payload: {
          category: snap.category,
          productName: snap.productName,
          price: 10000,
          imageUrls: ["https://example.com/a.jpg"],
          imagePaths: ["x/a.jpg"],
          lifestyleImageUrl: "https://example.com/life.jpg",
        },
        draftToken: "126cha-evidence",
        sections: [],
        headlines: [],
        description: "",
        features: [],
        howToUse: "",
        caution: "",
        draftApproved: false,
        formSnapshot: snap,
      }),
    );
    console.log(
      `[126cha][evidence] formSnapshot.productHeightCm=${JSON.stringify(snap.productHeightCm)}`,
    );
  });
  await page.waitForTimeout(200);

  const logPath = path.join(OUT, "126cha-console-evidence.log");
  fs.writeFileSync(logPath, logs.join("\n") + "\n", "utf8");
  console.log(logs.join("\n"));
  console.log(`[126cha] wrote ${logPath}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
