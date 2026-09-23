/**
 * 181차 — Behance 카테고리 겹치는 PDP 레퍼런스 스크린샷 (이미지 생성 API 0).
 *   npx tsx scripts/181cha-behance-capture.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "qa-screenshots");
const META = path.join(ROOT, "review", "181cha-behance");

const REFS = [
  {
    key: "beauty",
    url: "https://www.behance.net/gallery/244431573/WordPress-Skincare-Product-UIUX-Design",
    title: "WordPress Skincare Product UI/UX Design",
    why: "스킨케어 PDP — 히어로·루틴 카드·여백",
  },
  {
    key: "beauty-app",
    url: "https://www.behance.net/gallery/254642703/Cosmetics-eCommerce-App-Design",
    title: "Cosmetics eCommerce App Design",
    why: "뷰티 모바일 PDP — 카드 리듬·정보 위계",
  },
  {
    key: "fashion",
    url: "https://www.behance.net/gallery/200765267/Jil-Sander-Clothing-Ecommerce-Website-Product-Detail",
    title: "Jil Sander Clothing Ecommerce Product Detail",
    why: "패션 PDP — 미니멀 타이포·이미지 우선",
  },
  {
    key: "electronics",
    url: "https://www.behance.net/gallery/247616149/Shark-Air-Purifier-Product-Design",
    title: "Shark Air Purifier Product Design",
    why: "공기청정기 리스팅 — 스펙 인포 위계(전자 겹침)",
  },
  {
    key: "food",
    url: "https://www.behance.net/gallery/245412913/Wellness-Supplement-Product-Page-UI-Design",
    title: "Wellness+ Supplement Product Page UI Design",
    why: "건기식 PDP — 임상/신뢰·투여량 위계",
  },
  {
    key: "pet",
    url: "https://www.behance.net/gallery/242350037/Pawcare-Shopify-Store-Website-Design",
    title: "Pawcare Shopify Store Website Design",
    why: "펫푸드 스토어 — 성분·신뢰 신호",
  },
  {
    key: "living",
    url: "https://www.behance.net/search/projects/furniture%20product%20detail%20page%20shelf",
    title: "Behance search: furniture product detail shelf",
    why: "생활/가구 PDP 검색 진입점 (Kayupinus 등)",
  },
] as const;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(META, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const saved: Array<Record<string, string>> = [];

  for (const ref of REFS) {
    console.log(`[181] ${ref.key} → ${ref.url}`);
    await page.goto(ref.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3500);
    // dismiss cookie/sign-in overlays if present
    await page.keyboard.press("Escape").catch(() => undefined);
    const file = path.join(OUT, `181cha-behance-${ref.key}.png`);
    await page.screenshot({ path: file, fullPage: false });
    saved.push({ ...ref, file: path.basename(file) });
    console.log(`[181] saved ${file}`);
  }

  fs.writeFileSync(
    path.join(META, "refs.json"),
    JSON.stringify({ at: new Date().toISOString(), saved }, null, 2),
  );
  await browser.close();
  console.log("[181] behance capture done", saved.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
