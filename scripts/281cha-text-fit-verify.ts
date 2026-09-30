/**
 * 281차 — 폰트 크기 vs 컨테이너(말줄임·음절 단위 줄바꿈) 검증. 무료(과금 API 호출 없음).
 * 279차 저장 결과(review/279cha-live/session.json)를 라이브(/dev/detail-preview?capture=session)와
 * export HTML(buildDetailPageHtml) 양쪽에 렌더해, 모바일 폭에서
 *   1) line-clamp / text-overflow:ellipsis 로 잘린 텍스트
 *   2) 공백이 아닌 두 글자 사이에서 줄이 바뀐(음절 단위) 텍스트
 * 를 검출하고 대상 섹션 스크린샷을 남긴다.
 *   npm run dev (별도) → LABEL=before|after npx tsx scripts/281cha-text-fit-verify.ts
 */
import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";
import type { CategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const LABEL = process.env.LABEL ?? "after";
const SESSION = process.env.SESSION_JSON ?? path.join(ROOT, "review", "279cha-live", "session.json");
const OUT = path.join(ROOT, "review", `281cha-${LABEL}`);
const WIDTH = Number(process.env.VIEWPORT_W ?? 390);

const TARGET_TEXTS = [
  "당기는 아침",
  "나이아신아마이드 5% 배합",
  "#나이아신아마이드5",
  "6가지",
  "AI 생성 기술을",
];

const PROBE = `
(() => {
  const root = document.querySelector("[data-pagzly-preview]") || document.body;
  const clamped = [];
  const breaks = [];
  const leafs = Array.from(root.querySelectorAll("h1,h2,h3,h4,p,span,li,strong,div"))
    .filter((el) => {
      if (!el.textContent || !el.textContent.trim()) return false;
      return Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    });
  for (const el of leafs) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const text = el.textContent.trim().replace(/\\s+/g, " ");
    const clampOn = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    const ellipsis = cs.textOverflow === "ellipsis";
    if (clampOn || ellipsis) {
      const before = { h: el.getBoundingClientRect().height, sw: el.scrollWidth, cw: el.clientWidth };
      const prev = el.getAttribute("style") || "";
      el.style.setProperty("-webkit-line-clamp", "none", "important");
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("white-space", "normal", "important");
      const afterH = el.getBoundingClientRect().height;
      el.setAttribute("style", prev);
      const cutV = afterH > before.h + 2;
      const cutH = ellipsis && before.sw > before.cw + 1;
      if (cutV || cutH) {
        clamped.push({ text: text.slice(0, 80), lineClamp: cs.webkitLineClamp, textOverflow: cs.textOverflow });
      }
    }
    const chars = [];
    for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue;
      const s = node.textContent;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "\\u2060") continue;
        if (!/\\S/.test(s[i])) { chars.push(null); continue; }
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const rect = r.getClientRects()[0];
        chars.push(rect && rect.width > 0 ? { ch: s[i], top: rect.top, left: rect.left } : null);
      }
      chars.push(null);
    }
    const split = [];
    for (let i = 1; i < chars.length; i++) {
      const a = chars[i - 1], b = chars[i];
      if (!a || !b) continue;
      if (b.top - a.top > 4 && b.left < a.left && !/[·,/\\-–—)(]/.test(a.ch)) {
        split.push(a.ch + "|" + b.ch);
      }
    }
    if (split.length) breaks.push({ text: text.slice(0, 80), at: split, fontPx: cs.fontSize });
  }
  return { clamped, breaks };
})()
`;

async function shootTargets(page: Page, prefix: string) {
  const shots: string[] = [];
  for (const [i, needle] of TARGET_TEXTS.entries()) {
    const handle = await page.evaluateHandle((t) => {
      const root = document.querySelector("[data-pagzly-preview]") || document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      let best: Element | null = null;
      let bestH = Infinity;
      while ((n = walker.nextNode())) {
        const text = (n.textContent ?? "").replace(/\u2060/g, "");
        if (!text.includes(t)) continue;
        const el = n.parentElement;
        if (!el || el.closest("script,style,nav,[data-preview-chrome]")) continue;
        const sec = el.closest("section");
        const h = sec?.getBoundingClientRect().height ?? 0;
        if (sec && h > 80 && h < bestH) {
          best = sec;
          bestH = h;
        }
      }
      return best;
    }, needle);
    const el = handle.asElement();
    if (!el) continue;
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const file = path.join(OUT, `${prefix}-${i + 1}.png`);
    await el.screenshot({ path: file });
    shots.push(path.relative(ROOT, file));
  }
  return shots;
}

async function waitImages(page: Page) {
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const session = JSON.parse(fs.readFileSync(SESSION, "utf8"));
  const g = session.generated ?? session;
  const payload = {
    sections: g.sections as DetailSection[],
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: (g.imageUrls ?? session.imageUrls) as string[],
    conceptIcons: g.conceptIcons,
  };

  const browser = await chromium.launch();
  const report: Record<string, unknown> = { label: LABEL };
  type Probe = { clamped: unknown[]; breaks: unknown[] };
  const summary: string[] = [];

  // 모바일(390) + 결과 페이지 데스크톱 3단 레이아웃의 가운데 칼럼 폭 재현
  // (앱 사이드바 56 + 좌우 패딩 48 + 좌 260 + 우 360 + 간격 40 제외: 1024→약 300, 1280→516, 1440→676)
  const cases = [
    { key: `m${WIDTH}`, vw: WIDTH, col: 0 },
    { key: "d1024c300", vw: 1024, col: 300 },
    { key: "d1280c516", vw: 1280, col: 516 },
    { key: "d1440c676", vw: 1440, col: 676 },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: c.vw, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.evaluate((p) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(p)), payload);
    await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
    if (c.col) {
      await page.addStyleTag({ content: `[data-pagzly-preview]{max-width:${c.col}px !important}` });
    }
    await waitImages(page);
    await page.waitForTimeout(1500);
    const probe = (await page.evaluate(PROBE)) as Probe;
    report[`live_${c.key}`] = probe;
    report[`live_${c.key}_shots`] = await shootTargets(page, `live-${c.key}`);
    summary.push(`live@${c.key}: clamped=${probe.clamped.length} breaks=${probe.breaks.length}`);
    await ctx.close();
  }

  const html = buildDetailPageHtml({
    productName: payload.productName,
    brandName: payload.brandName,
    category: payload.category,
    sections: payload.sections,
    imageUrls: payload.imageUrls,
    theme: (g.theme ?? session.theme) as CategoryTheme,
    price: session.price,
  });
  const htmlFile = path.join(OUT, "export.html");
  fs.writeFileSync(htmlFile, html);
  for (const vw of [WIDTH, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 });
    const ex = await ctx.newPage();
    await ex.goto(`file:///${htmlFile.replace(/\\/g, "/")}`, { waitUntil: "load", timeout: 120_000 });
    await waitImages(ex);
    await ex.waitForTimeout(1000);
    const exp = (await ex.evaluate(PROBE)) as Probe;
    report[`export_${vw}`] = exp;
    report[`export_${vw}_shots`] = await shootTargets(ex, `export-${vw}`);
    summary.push(`export@${vw}: clamped=${exp.clamped.length} breaks=${exp.breaks.length}`);
    await ctx.close();
  }

  fs.writeFileSync(path.join(OUT, "probe.json"), JSON.stringify(report, null, 2));
  for (const line of summary) console.log(`[281] ${LABEL} ${line}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
