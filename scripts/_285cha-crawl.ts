/**
 * 285차 트랙 A — 경쟁사 상세페이지 "긴 이미지" 수집 (내부 벤치마크 전용, 커밋 안 함).
 *   npx tsx scripts/_285cha-crawl.ts [targetKey...]
 * 결과: review/285cha-bench/<key>/<n>/img-XX.* + overview.png + meta.json
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "285cha-bench");
const HEADED = process.env.HEADED === "1";

type Target = { key: string; cat: string; site: string; search: string; product: RegExp; n?: number };

const TARGETS: Target[] = [
  { key: "beauty-oy", cat: "화장품/뷰티", site: "oliveyoung", search: "https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=%EC%84%B8%EB%9F%BC", product: /getGoodsDetail\.do\?goodsNo=\w+/ },
  { key: "beauty-kurly", cat: "화장품/뷰티", site: "kurly", search: "https://www.kurly.com/search?sword=%EC%84%B8%EB%9F%BC", product: /\/goods\/\d+/ },
  { key: "food-kurly", cat: "식품", site: "kurly", search: "https://www.kurly.com/search?sword=%EB%8B%AD%EA%B0%80%EC%8A%B4%EC%82%B4", product: /\/goods\/\d+/ },
  { key: "food-coupang", cat: "식품", site: "coupang", search: "https://www.coupang.com/np/search?q=%EB%B9%84%ED%83%80%EB%AF%BC", product: /\/vp\/products\/\d+/ },
  { key: "fashion-musinsa", cat: "패션", site: "musinsa", search: "https://www.musinsa.com/search/goods?keyword=%EC%85%94%EC%B8%A0", product: /\/products\/\d+/ },
  { key: "fashion-29cm", cat: "패션", site: "29cm", search: "https://www.29cm.co.kr/search?keyword=%EB%8B%88%ED%8A%B8", product: /\/products\/\d+|catalog\/\d+/ },
  { key: "elec-coupang", cat: "전자제품", site: "coupang", search: "https://www.coupang.com/np/search?q=%EB%AC%B4%EC%84%A0%EC%B2%AD%EC%86%8C%EA%B8%B0", product: /\/vp\/products\/\d+/ },
  { key: "elec-danawa", cat: "전자제품", site: "danawa", search: "https://search.danawa.com/dsearch.php?query=%EB%AC%B4%EC%84%A0%EC%B2%AD%EC%86%8C%EA%B8%B0", product: /prod\.danawa\.com\/info\/\?pcode=\d+/ },
  { key: "living-ohouse", cat: "생활용품", site: "ohouse", search: "https://ohou.se/search/index?query=%EC%88%98%EB%82%A9%ED%95%A8", product: /\/productions\/\d+/ },
  { key: "living-kurly", cat: "생활용품", site: "kurly", search: "https://www.kurly.com/search?sword=%EC%A3%BC%EB%B0%A9%EC%84%B8%EC%A0%9C", product: /\/goods\/\d+/ },
  { key: "pet-coupang", cat: "반려동물", site: "coupang", search: "https://www.coupang.com/np/search?q=%EA%B0%95%EC%95%84%EC%A7%80+%EA%B0%84%EC%8B%9D", product: /\/vp\/products\/\d+/ },
  { key: "pet-gmarket", cat: "반려동물", site: "gmarket", search: "https://www.gmarket.co.kr/n/search?keyword=%EA%B0%95%EC%95%84%EC%A7%80%20%EA%B0%84%EC%8B%9D", product: /item\.gmarket\.co\.kr\/Item\?goodscode=\d+/i },
  { key: "food-kurly2", cat: "식품", site: "kurly", search: "https://www.kurly.com/search?sword=%EA%B7%B8%EB%9E%98%EB%86%80%EB%9D%BC", product: /\/goods\/\d+/, n: 3 },
  { key: "fashion-29cm2", cat: "패션", site: "29cm", search: "https://shop.29cm.co.kr/search?keyword=%EB%8B%88%ED%8A%B8", product: /\/products\/\d+|catalog\/\d+/ },
  { key: "living-ohouse2", cat: "생활용품", site: "ohouse", search: "https://ohou.se/store/search?query=%EC%88%98%EB%82%A9%ED%95%A8", product: /\/productions\/\d+/ },
  { key: "pet-11st", cat: "반려동물", site: "11st", search: "https://search.11st.co.kr/Search.tmall?kwd=%EA%B0%95%EC%95%84%EC%A7%80%20%EA%B0%84%EC%8B%9D", product: /11st\.co\.kr\/products\/\d+/ },
  { key: "pet-ssg", cat: "반려동물", site: "ssg", search: "https://www.ssg.com/search.ssg?query=%EA%B0%95%EC%95%84%EC%A7%80%20%EC%82%AC%EB%A3%8C", product: /itemView\.ssg\?itemId=\d+/ },
  { key: "elec-11st", cat: "전자제품", site: "11st", search: "https://search.11st.co.kr/Search.tmall?kwd=%EB%AC%B4%EC%84%A0%EC%B2%AD%EC%86%8C%EA%B8%B0", product: /11st\.co\.kr\/products\/\d+/ },
  { key: "food-ssg", cat: "식품", site: "ssg", search: "https://www.ssg.com/search.ssg?query=%EB%B9%84%ED%83%80%EB%AF%BC", product: /itemView\.ssg\?itemId=\d+/ },
  { key: "living-ohouse3", cat: "생활용품", site: "ohouse", search: "https://ohou.se/store", product: /\/productions\/\d+/ },
  { key: "beauty-11st", cat: "화장품/뷰티", site: "11st", search: "https://search.11st.co.kr/Search.tmall?kwd=%EC%84%A0%ED%81%AC%EB%A6%BC", product: /11st\.co\.kr\/products\/\d+/ },
  { key: "food-11st", cat: "식품", site: "11st", search: "https://search.11st.co.kr/Search.tmall?kwd=%EB%8B%AD%EA%B0%80%EC%8A%B4%EC%82%B4", product: /11st\.co\.kr\/products\/\d+/ },
  { key: "living-11st", cat: "생활용품", site: "11st", search: "https://search.11st.co.kr/Search.tmall?kwd=%EC%88%98%EB%82%A9%ED%95%A8", product: /11st\.co\.kr\/products\/\d+/ },
  { key: "pet-kurly", cat: "반려동물", site: "kurly", search: "https://www.kurly.com/search?sword=%EA%B0%95%EC%95%84%EC%A7%80%20%EA%B0%84%EC%8B%9D", product: /\/goods\/\d+/ },
];

async function autoScroll(page: Page, maxMs = 25_000) {
  const t0 = Date.now();
  let last = -1;
  while (Date.now() - t0 < maxMs) {
    const h = await page.evaluate(() => {
      window.scrollBy(0, 1400);
      return document.documentElement.scrollHeight;
    }).catch(() => last);
    await page.waitForTimeout(350);
    const y = await page.evaluate(() => window.scrollY + window.innerHeight).catch(() => 0);
    if (y >= h - 10 && h === last) break;
    last = h;
  }
}

async function clickExpand(page: Page) {
  for (const tab of ["상품설명", "상품정보", "상세정보"]) {
    const el = page.getByText(tab, { exact: true }).first();
    if (await el.isVisible({ timeout: 400 }).catch(() => false)) {
      await el.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(1200);
      break;
    }
  }
  for (const label of ["상품정보 더보기", "상세정보 펼쳐보기", "상품 정보 더보기", "더보기", "펼쳐보기"]) {
    const btn = page.getByRole("button", { name: new RegExp(label) }).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(800);
    }
  }
}

async function collectImages(page: Page): Promise<{ src: string; w: number; h: number }[]> {
  const all: { src: string; w: number; h: number }[] = [];
  for (const frame of page.frames()) {
    const imgs = await frame
      .evaluate(() =>
        Array.from(document.images).map((img) => ({
          src: img.currentSrc || img.src || img.getAttribute("data-src") || "",
          w: img.naturalWidth,
          h: img.naturalHeight,
        })),
      )
      .catch(() => []);
    all.push(...imgs);
  }
  const seen = new Set<string>();
  return all.filter((i) => {
    if (!i.src || i.src.startsWith("data:") || seen.has(i.src)) return false;
    seen.add(i.src);
    return i.w >= 600 && (i.h >= 1200 || i.h / Math.max(1, i.w) >= 1.3);
  });
}

async function saveProduct(ctx: BrowserContext, page: Page, dir: string, url: string) {
  fs.mkdirSync(dir, { recursive: true });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await clickExpand(page);
  await autoScroll(page);
  await clickExpand(page);
  await autoScroll(page, 10_000);
  await page.screenshot({ path: path.join(dir, "page-top.png") }).catch(() => undefined);
  const imgs = await collectImages(page);
  const saved: { file: string; w: number; h: number; bytes: number }[] = [];
  let i = 0;
  for (const img of imgs.slice(0, 40)) {
    try {
      const res = await ctx.request.get(img.src, { headers: { referer: url }, timeout: 30_000 });
      if (!res.ok()) continue;
      const buf = await res.body();
      const meta = await sharp(buf, { limitInputPixels: false }).metadata();
      if (!meta.width || !meta.height) continue;
      i += 1;
      const file = `img-${String(i).padStart(2, "0")}.png`;
      await sharp(buf, { limitInputPixels: false }).png().toFile(path.join(dir, file));
      saved.push({ file, w: meta.width, h: meta.height, bytes: buf.length });
    } catch {
      /* skip */
    }
  }
  // 세로로 이어 붙인 축소 개요(폭 320)
  if (saved.length) {
    const W = 320;
    const parts = await Promise.all(
      saved.map(async (s) => {
        const b = await sharp(path.join(dir, s.file), { limitInputPixels: false }).resize({ width: W }).png().toBuffer();
        const m = await sharp(b).metadata();
        return { b, h: m.height ?? 0 };
      }),
    );
    const total = Math.min(parts.reduce((a, p) => a + p.h, 0), 16000);
    let y = 0;
    const comps = [];
    for (const p of parts) {
      if (y >= total) break;
      comps.push({ input: p.b, top: y, left: 0 });
      y += p.h;
    }
    await sharp({ create: { width: W, height: total, channels: 3, background: "#ffffff" } })
      .composite(comps)
      .png()
      .toFile(path.join(dir, "overview.png"))
      .catch(() => undefined);
  }
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ url, title: await page.title().catch(() => ""), images: saved }, null, 2));
  return saved;
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? TARGETS.filter((t) => only.includes(t.key)) : TARGETS;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: !HEADED,
    channel: process.env.CHANNEL || undefined,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  for (const t of targets) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "ko-KR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    });
    await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => undefined }));
    const page = await ctx.newPage();
    const log = (m: string) => console.log(`[${t.key}] ${m}`);
    try {
      await page.goto(t.search, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(4000);
      for (let s = 0; s < 6; s++) {
        await page.evaluate(() => window.scrollBy(0, 1200)).catch(() => undefined);
        await page.waitForTimeout(700);
      }
      const links = await page.evaluate(() => Array.from(document.querySelectorAll("a")).map((a) => a.href));
      const products = [...new Set(links.filter((h) => t.product.test(h)))].slice(0, t.n ?? 2);
      log(`search title="${(await page.title()).slice(0, 40)}" products=${products.length}`);
      if (!products.length) await page.screenshot({ path: path.join(OUT, `${t.key}-search.png`) });
      let n = 0;
      for (const url of products) {
        n += 1;
        const saved = await saveProduct(ctx, page, path.join(OUT, t.key, String(n)), url).catch((e) => {
          log(`product ${n} error ${String(e).slice(0, 120)}`);
          return [];
        });
        log(`product ${n} images=${saved.length} ${saved.map((s) => `${s.w}x${s.h}`).join(" ")}`);
      }
    } catch (e) {
      log(`error ${String(e).slice(0, 160)}`);
    }
    await ctx.close();
  }
  await browser.close();
}

main();
