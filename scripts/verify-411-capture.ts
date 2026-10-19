/**
 * 411차 검증 7번 — 새 세션에 3팩을 입힌 캡처(무료: 렌더만, 로그인·생성 API 호출 없음).
 *   npx tsx scripts/verify-411-capture.ts --session review/411-live/fashion/session.json [--label 411]
 * 필요: dev 서버(:3000). /dev/detail-preview?capture=session에 세션을 sessionStorage로 넣어 그린다.
 * 출력: review/<label>-verify/packs/<팩>-<폭>-live.png (+ export HTML 렌더 -export.png), 첫 3화면 크롭 포함.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";

const args = process.argv.slice(2);
const arg = (n: string, d?: string) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : d);
const SESSION = arg("--session", "review/411-live/fashion/session.json")!;
const LABEL = arg("--label", "411")!;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = `review/${LABEL}-verify/packs`;
const PACKS = ["classic", "mono-minimal", "editorial"];

function payload() {
  const s = JSON.parse(fs.readFileSync(SESSION, "utf8"));
  const g = s.generated ?? s;
  return {
    sections: g.sections,
    category: s.category ?? g.category,
    brandName: s.brandName ?? "",
    productName: s.productName ?? "",
    imageUrls: g.imageUrls ?? s.imageUrls,
    imageHashByUrl: g.imageHashByUrl,
    theme: g.theme ?? s.theme,
    imageRoles: s.imageRoles ?? g.imageRoles,
    imageOrigins: g.imageOrigins ?? s.imageOrigins,
    price: typeof s.price === "number" ? s.price : Number(s.price) || undefined,
  };
}

async function settle(page: import("playwright").Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, 4000); y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => null))), new Promise((r) => setTimeout(r, 15000))]);
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const p = payload();
  if (p.category !== "의류/패션") console.warn(`[verify-411-capture] 카테고리가 ${p.category} — 팩은 패션에서만 적용됩니다`);
  const browser = await chromium.launch();
  for (const pack of PACKS) {
    for (const W of [390, 750]) {
      const ctx = await browser.newContext({ viewport: { width: W === 390 ? 390 : 1280, height: 844 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.addInitScript({ content: "window.__name = (f) => f;" });
      await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded" });
      await page.evaluate((x) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(x)), { ...p, stylePackId: pack });
      await page.goto(`${BASE}/dev/detail-preview?capture=session&budget=1`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: `html{scrollbar-width:none}::-webkit-scrollbar{display:none}[data-pagzly-preview]{width:${W}px!important;max-width:${W}px!important;border:0!important}nextjs-portal{display:none!important}*{animation:none!important;transition:none!important}` });
      await page.waitForSelector("[data-section-index]");
      await settle(page);
      const base = path.join(OUT, `${pack}-${W}-live`);
      await page.locator("[data-pagzly-preview]").screenshot({ path: `${base}.png` });
      const m = await sharp(`${base}.png`).metadata();
      await sharp(`${base}.png`).extract({ left: 0, top: 0, width: m.width!, height: Math.min(m.height!, W === 390 ? 2532 : 2600) }).toFile(`${base}-first3.png`);
      await ctx.close();
      // export HTML도 같은 팩으로 렌더
      const html = buildDetailPageHtml({ productName: p.productName, brandName: p.brandName, category: p.category, sections: p.sections, imageUrls: p.imageUrls, imageHashByUrl: p.imageHashByUrl, theme: p.theme ? { ...getCategoryTheme(p.category), ...p.theme } : getCategoryTheme(p.category), imageRoles: p.imageRoles, imageOrigins: p.imageOrigins, price: p.price, stylePackId: pack });
      const hf = path.resolve(OUT, `${pack}-${W}-export.html`);
      fs.writeFileSync(hf, html);
      const ectx = await browser.newContext({ viewport: { width: W, height: 844 }, reducedMotion: "reduce" });
      const ep = await ectx.newPage();
      await ep.goto("file:///" + hf.split(path.sep).join("/"), { waitUntil: "load" });
      await settle(ep);
      await ep.screenshot({ path: path.join(OUT, `${pack}-${W}-export.png`), fullPage: true });
      await ectx.close();
      console.log(`${pack} ${W} 저장`);
    }
  }
  await browser.close();
  console.log(`→ ${OUT}`);
})();
