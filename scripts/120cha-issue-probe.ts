/**
 * 120차 — Next.js "1 Issue" 배지 원인 조사 (수정 없음, API 없음)
 * npx tsx scripts/120cha-issue-probe.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(__dirname, "..", "review");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 1,
  });

  const consoleLogs: string[] = [];
  page.on("console", (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleLogs.push(`[pageerror] ${err.message}`);
  });

  await page.goto(`${BASE}/dev/detail-preview?capture=58-food`, {
    waitUntil: "networkidle",
  });
  await page.locator("text=한그릇 키친").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);

  // Next.js dev indicator / issues badge
  const candidates = [
    'button:has-text("1 Issue")',
    'button:has-text("Issue")',
    '[data-nextjs-toast]',
    '[data-next-badge]',
    'nextjs-portal',
    '#__next-build-watcher',
  ];

  let found: string | null = null;
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      found = sel;
      console.log("[probe] visible candidate:", sel);
      break;
    }
  }

  // Shadow / portal search
  const portalInfo = await page.evaluate(() => {
    const portals = [...document.querySelectorAll("nextjs-portal, [data-nextjs-dialog], [data-next-mark]")];
    const all = [...document.querySelectorAll("body *")].filter((el) => {
      const t = (el.textContent || "").trim();
      return t === "1 Issue" || t.includes("1 Issue") || t === "Issue";
    });
    return {
      portals: portals.map((p) => p.tagName),
      issueNodes: all.slice(0, 8).map((el) => ({
        tag: el.tagName,
        cls: String((el as HTMLElement).className || "").slice(0, 80),
        text: (el.textContent || "").trim().slice(0, 40),
        role: el.getAttribute("role"),
      })),
    };
  });
  console.log("[probe] portalInfo", JSON.stringify(portalInfo, null, 2));

  // Try click via text
  const issueBtn = page.getByText("1 Issue", { exact: false }).first();
  let clickOk = false;
  if ((await issueBtn.count()) > 0) {
    try {
      await issueBtn.click({ timeout: 5000, force: true });
      clickOk = true;
      await page.waitForTimeout(800);
    } catch (e) {
      console.log("[probe] click failed", String(e));
    }
  }

  // Also try frame / shadow hosts
  if (!clickOk) {
    const clicked = await page.evaluate(() => {
      const walk = (root: Document | ShadowRoot): HTMLElement | null => {
        for (const el of root.querySelectorAll("*")) {
          const t = (el.textContent || "").trim();
          if (t.includes("1 Issue") && el instanceof HTMLElement) return el;
          const sr = (el as HTMLElement).shadowRoot;
          if (sr) {
            const hit = walk(sr);
            if (hit) return hit;
          }
        }
        return null;
      };
      const hit = walk(document);
      if (hit) {
        hit.click();
        return hit.outerHTML.slice(0, 300);
      }
      return null;
    });
    console.log("[probe] shadow click", clicked);
    await page.waitForTimeout(800);
  }

  await page.screenshot({
    path: path.join(OUT, "120cha-issue-overlay.png"),
    fullPage: false,
  });

  // Collect dialog/panel text after click
  const panelText = await page.evaluate(() => {
    const dialogs = [
      ...document.querySelectorAll(
        "[data-nextjs-dialog], [role='dialog'], nextjs-portal, [data-nextjs-toast]",
      ),
    ];
    const texts = dialogs.map((d) => (d.textContent || "").replace(/\s+/g, " ").trim().slice(0, 800));
    // shadow roots
    const shadowTexts: string[] = [];
    for (const host of document.querySelectorAll("*")) {
      const sr = (host as HTMLElement).shadowRoot;
      if (!sr) continue;
      const t = (sr.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length > 20 && /issue|error|warn|hydrat|console/i.test(t)) {
        shadowTexts.push(t.slice(0, 800));
      }
    }
    return { texts, shadowTexts };
  });

  const report = {
    foundSelector: found,
    portalInfo,
    clickOk,
    panelText,
    consoleLogs: consoleLogs.slice(-40),
  };
  fs.writeFileSync(
    path.join(OUT, "120cha-issue-probe.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log("[probe] wrote 120cha-issue-probe.json");
  console.log("[probe] console tail:\n", consoleLogs.slice(-20).join("\n"));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
