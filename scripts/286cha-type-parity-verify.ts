/**
 * 286차 — 라이브 ↔ export 글자 크기 패리티 검증. 무료(과금 API 호출 없음).
 * 6카테고리 mock + 279차 저장 결과를 라이브(/dev/detail-preview?capture=session)와
 * export HTML(buildDetailPageHtml)에 같은 폭으로 렌더하고, 같은 문구(제목·수치·가격)를 찾아
 * computed font-size / letter-spacing을 비교한다. 폭: 390(좁음, base 단) · 750(넓음, wide 단).
 * 라이브 750은 데스크톱 뷰포트에서 프리뷰 칼럼을 750px로 고정해 컨테이너 쿼리를 wide로 맞춘다.
 *   npm run dev (별도) → LABEL=before|after npx tsx scripts/286cha-type-parity-verify.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";
import { getCategoryTheme, type CategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const LABEL = process.env.LABEL ?? "after";
const OUT = path.join(ROOT, "review", `286cha-parity-${LABEL}`);
const SESSION = path.join(ROOT, "review", "279cha-live", "session.json");
const ONLY = process.env.ONLY?.split(",");

type Payload = {
  key: string;
  sections: DetailSection[];
  category: string;
  brandName: string;
  productName: string;
  imageUrls: string[];
  conceptIcons?: unknown;
  theme?: CategoryTheme;
  price?: number;
};

type Target = { section: string; role: string; text: string };

const FIXTURE_DIR: Record<string, string> = {
  "화장품/뷰티": "cosmetics",
  "의류/패션": "fashion",
  "식품/건강기능식품": "food",
  전자제품: "electronics",
  생활용품: "living",
  반려동물: "pet",
};

const PRODUCT: Record<string, string> = {
  "화장품/뷰티": "수분 진정 세럼",
  "의류/패션": "오버핏 코튼 셔츠",
  "식품/건강기능식품": "통곡물 그래놀라",
  전자제품: "무선 핸디 청소기",
  생활용품: "모듈 수납함 3단",
  반려동물: "덴탈 껌 간식",
};

function buildMock(category: string): Payload {
  const dir = FIXTURE_DIR[category];
  const imageUrls = [1, 2, 3, 4].map((n) => `/qa-fixtures/${dir}/0${n}.${dir === "cosmetics" ? "jpg" : "png"}`);
  const sections = [
    { type: "hero", slot: "hero", headline: PRODUCT[category], subheadline: "286차 패리티 검증", imageIndex: 0 },
    { type: "image_text", slot: "feature_detail", heading: "매일 쓰기 좋은 설계", body: "입력된 정보 기준으로 정리했어요.", imageIndex: 1, imagePosition: "left" },
    { type: "checklist", slot: "key_benefits", heading: "이런 점이 좋아요", items: ["가벼운 사용감", "간편한 보관", "깔끔한 마감"] },
    { type: "highlight_box", slot: "core_highlights", heading: "핵심만 골랐어요", cards: [{ title: "첫째", body: "설명 한 줄" }, { title: "둘째", body: "설명 한 줄" }, { title: "셋째", body: "설명 한 줄" }] },
    { type: "image_text", slot: "material_detail", heading: "꼼꼼한 마감 디테일", body: "판매자 입력 기준이에요.", imageIndex: 2, imagePosition: "right" },
    {
      type: "stat_infographic",
      slot: "stat_infographic",
      heading: "숫자로 보는 제품",
      metrics: [
        { label: "구성", value: "3종", style: "number" },
        { label: "만족 응답", value: "92%", percent: 92, style: "ring", basis: "measured", sourceNote: "판매자 설문, 2026.08, n=50" },
        { label: "재구매 의향", value: "81%", percent: 81, style: "bar", basis: "measured", sourceNote: "판매자 설문, 2026.08, n=50" },
      ],
    },
    { type: "usage_steps", slot: "usage_steps", heading: "이렇게 사용하세요", steps: ["포장을 열고 구성품을 확인해요", "필요한 만큼 덜어 사용해요", "사용 후 뚜껑을 닫아 보관해요"] },
    { type: "spec_table", slot: "spec_table", heading: "제품 정보", rows: [{ label: "제조국", value: "대한민국" }, { label: "구성", value: "본품 1개" }] },
    { type: "gallery", slot: "gallery", heading: "다양한 각도", imageIndexes: [1, 2, 3] },
    { type: "tradeoff_card", slot: "tradeoff_card", heading: "구매 전 확인하세요", recommendFor: ["가볍게 쓰고 싶은 분"], considerIf: ["대용량이 필요한 분"] },
    { type: "cta_price", slot: "cta_price", price: 29000 },
  ] as unknown as DetailSection[];
  return { key: `mock-${dir}`, sections, category, brandName: "PAGZLY QA", productName: PRODUCT[category], imageUrls, price: 29000 };
}

function loadSession(): Payload {
  const session = JSON.parse(fs.readFileSync(SESSION, "utf8"));
  const g = session.generated ?? session;
  return {
    key: "session279",
    sections: g.sections,
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: (g.imageUrls ?? session.imageUrls) as string[],
    conceptIcons: g.conceptIcons,
    theme: (g.theme ?? session.theme) as CategoryTheme,
    price: session.price,
  };
}

/** 메가 키워드 헤딩("KEYWORD | 나머지")은 나머지만 제목으로 렌더된다 */
function headingText(h: string): string {
  const parts = h.split(/\s*[|｜]\s*/);
  return (parts.length > 1 ? parts.slice(1).join(" ") : h).trim();
}

function targetsFor(p: Payload): Target[] {
  const out: Target[] = [];
  for (const s of p.sections as Array<Record<string, unknown>>) {
    const type = String(s.type);
    if (type === "hero" && typeof s.headline === "string") out.push({ section: type, role: "title", text: s.headline });
    else if (typeof s.heading === "string" && s.heading.trim()) out.push({ section: type, role: "title", text: headingText(s.heading) });
    if (type === "stat_infographic" && Array.isArray(s.metrics)) {
      for (const m of s.metrics as Array<{ value: string; style?: string }>) {
        out.push({ section: type, role: `stat-${m.style ?? "bar"}`, text: m.value });
      }
    }
    if (typeof s.body === "string" && s.body.trim().length >= 12) {
      out.push({ section: type, role: "body", text: s.body });
    }
    if (type === "cta_price" && typeof s.price === "number") {
      out.push({ section: type, role: "price", text: s.price.toLocaleString("ko-KR") });
    }
  }
  return out;
}

const MEASURE = `
((targets) => {
  const norm = (t) => (t || "").replace(/[\\u2060\\u200b\\s₩원"]/g, "");
  const root = document.querySelector("[data-pagzly-preview]") || document.querySelector(".pagzly-wrap") || document.body;
  const els = Array.from(root.querySelectorAll("h1,h2,h3,p,div,span,strong"));
  return targets.map((t) => {
    const want = norm(t.text);
    const hits = els.filter((el) => norm(el.textContent) === want && el.getBoundingClientRect().width > 0);
    const leaf = hits.filter((el) => !hits.some((o) => o !== el && el.contains(o)));
    const el = leaf.sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0];
    if (!el) return { ...t, found: false };
    const cs = getComputedStyle(el);
    return { ...t, found: true, fontSize: parseFloat(cs.fontSize), letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, weight: cs.fontWeight };
  });
})
`;

async function scrollThrough(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(100);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

async function waitImages(page: Page) {
  await scrollThrough(page);
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((img) => (img.loading = "eager"));
    await Promise.race([
      Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))),
      new Promise((r) => setTimeout(r, 20_000)),
    ]);
  });
  await page.evaluate(() => document.fonts.ready);
}

type Measured = Target & { found: boolean; fontSize?: number; letterSpacing?: string };

async function live(browser: Browser, p: Payload, width: number, targets: Target[]) {
  const vw = width >= 640 ? 1280 : width;
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.evaluate((x) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(x)), p);
  await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
  // 좁은 폭에선 스크롤바·프레임 테두리만큼 라이브가 export보다 좁아져 폭 기반 피팅 수치가 어긋난다
  await page.addStyleTag({
    content: `html{scrollbar-width:none}::-webkit-scrollbar{display:none}[data-pagzly-preview]{width:${width}px !important;max-width:${width}px !important;border:0 !important;box-sizing:border-box}`,
  });
  await waitImages(page);
  await page.waitForTimeout(1000);
  const m = (await page.evaluate(`${MEASURE}(${JSON.stringify(targets)})`)) as Measured[];
  const shot = path.join(OUT, `live-${p.key}-${width}.png`);
  await page.locator("[data-pagzly-preview]").first().screenshot({ path: shot });
  await ctx.close();
  return { m, shot };
}

async function exportHtml(browser: Browser, p: Payload, width: number, targets: Target[]) {
  const html = buildDetailPageHtml({
    productName: p.productName,
    brandName: p.brandName,
    category: p.category,
    sections: p.sections,
    imageUrls: p.imageUrls.map((u) => (u.startsWith("/") ? `${BASE}${u}` : u)),
    theme: p.theme ? { ...getCategoryTheme(p.category), ...p.theme } : getCategoryTheme(p.category),
    price: p.price,
  });
  const file = path.join(OUT, `export-${p.key}.html`);
  fs.writeFileSync(file, html);
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`file:///${file.replace(/\\/g, "/")}`, { waitUntil: "load", timeout: 120_000 });
  await waitImages(page);
  await page.waitForTimeout(600);
  const m = (await page.evaluate(`${MEASURE}(${JSON.stringify(targets)})`)) as Measured[];
  const shot = path.join(OUT, `export-${p.key}-${width}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  await ctx.close();
  return { m, shot };
}

async function sideBySide(left: string, right: string, out: string) {
  const W = 480;
  const [a, b] = await Promise.all(
    [left, right].map((f) => sharp(f).resize({ width: W }).png().toBuffer({ resolveWithObject: true })),
  );
  const H = Math.min(Math.max(a.info.height, b.info.height), 16000);
  await sharp({ create: { width: W * 2 + 24, height: H, channels: 3, background: "#ffffff" } })
    .composite([
      { input: await sharp(a.data).extract({ left: 0, top: 0, width: W, height: Math.min(a.info.height, H) }).toBuffer(), left: 0, top: 0 },
      { input: await sharp(b.data).extract({ left: 0, top: 0, width: W, height: Math.min(b.info.height, H) }).toBuffer(), left: W + 24, top: 0 },
    ])
    .jpeg({ quality: 78 })
    .toFile(out);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const payloads = [...Object.keys(FIXTURE_DIR).map(buildMock), loadSession()].filter(
    (p) => !ONLY || ONLY.includes(p.key),
  );
  const browser = await chromium.launch();
  const report: Record<string, unknown> = { label: LABEL };
  for (const p of payloads) {
    const targets = targetsFor(p);
    const rows: Record<string, unknown>[] = [];
    for (const width of [390, 750]) {
      const l = await live(browser, p, width, targets);
      const e = await exportHtml(browser, p, width, targets);
      await sideBySide(l.shot, e.shot, path.join(OUT, `side-${p.key}-${width}.jpg`));
      targets.forEach((t, i) => {
        const lv = l.m[i];
        const ev = e.m[i];
        const diff = lv.found && ev.found ? +((ev.fontSize! - lv.fontSize!)).toFixed(1) : null;
        rows.push({ width, section: t.section, role: t.role, text: t.text.slice(0, 24), live: lv.fontSize ?? null, export: ev.fontSize ?? null, diff, liveLs: lv.letterSpacing ?? null, exportLs: ev.letterSpacing ?? null });
        console.log(
          `[286] ${LABEL} ${p.key} w${width} ${t.section}/${t.role} live=${lv.fontSize ?? "-"} export=${ev.fontSize ?? "-"} diff=${diff ?? "-"}`,
        );
      });
    }
    report[p.key] = rows;
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
