/**
 * 478차 A — 렌더 기반 픽셀 대비 검사.
 *   npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial
 *   npx tsx scripts/contrast-render-478.ts [--short] [--out=review/478-contrast.json]
 * 4 픽스처 × 8종 × (750,390) — 글자 투명 재캡처로 실제 배경 샘플 → WCAG.
 * 본문(<18px 또는 <14px bold) ≥4.5, 큰 글자 ≥3.0. `data-pz-deco` 제외.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Page } from "playwright";
import { ARCHETYPE_IDS } from "../lib/page-archetype-v5";
import { lum, ratioOf } from "./photo-legibility";

const GALLERY = "review/465-gallery";
const CAP_DIR = "review/478-captures";
export const FIXTURES = [
  "fx-tech-keyboard",
  "fx-skincare-serum",
  "fx-fashion-dress-floral",
  "fx-food-snack",
] as const;

export type Fail = {
  fixture: string;
  archetype: string;
  width: number;
  section: string;
  text: string;
  px: number;
  ratio: number;
  need: number;
  deco: boolean;
};

export type RunOpts = {
  short?: boolean;
  widths?: number[];
  fixtures?: string[];
  archetypes?: string[];
  capture?: boolean;
  outJson?: string;
};

function fileUrl(p: string): string {
  const abs = path.resolve(p).split(path.sep).join("/");
  return abs.startsWith("/") ? `file://${abs}` : `file:///${abs}`;
}

/** 페이지 안: 보이는 텍스트 + 섹션 종류 + data-pz-deco 여부 */
const PROBE = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const sectionOf = (e) => {
    const sec = e.closest('section');
    if (!sec) return 'other';
    const v4 = (sec.getAttribute('data-pz-v4') || '').toLowerCase();
    const impact = (sec.getAttribute('data-pz-impact') || '').toLowerCase();
    const info = (sec.getAttribute('data-info') || '').toLowerCase();
    const sf = (sec.getAttribute('data-pz-sf') || '').toLowerCase();
    if (impact === 'hero' || (sec === document.querySelector('section'))) return 'hero';
    if (v4.startsWith('benefits.') || info === 'points') return 'points';
    if (v4.startsWith('concern.') || /check/.test(v4 + impact)) return 'check';
    if (v4.startsWith('story.') || sf.includes('brand')) return 'story';
    if (v4.startsWith('stats.') || info === 'stat') return 'metrics';
    if (v4.startsWith('phototext.') || sec.getAttribute('data-pz-it') || impact === 'zoom') return 'phototext';
    if (v4.startsWith('spec.') || info === 'compare') return 'spec';
    if (/review/.test(impact + v4)) return 'reviews';
    if (v4.startsWith('faq.')) return 'faq';
    if (/caution|disclosure|고지/.test(impact + v4 + (sec.innerText || '').slice(0, 40))) return 'notice';
    if (sec.getAttribute('data-pz-buy') === '1' || /touch\\.|cta_price/.test(v4)) return 'purchase';
    return impact || info || v4.split('.')[0] || 'other';
  };
  const out = [];
  const root = document.querySelector('[data-pz-typefloor],[data-pz-bsig]') || document.body;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (w.nextNode()) {
    const n = w.currentNode;
    const text = (n.textContent || '').trim();
    if (!text) continue;
    const e = n.parentElement;
    if (!e || seen.has(e) || ['SCRIPT','STYLE','NOSCRIPT'].includes(e.tagName)) continue;
    if (e.closest('[aria-hidden="true"],[data-pagzly-bar],nav,nextjs-portal')) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const deco = !!(e.closest('[data-pz-deco]') || e.getAttribute('data-pz-deco') != null);
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') ? e.getBoundingClientRect() : r.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    seen.add(e);
    const m = rgba(e instanceof SVGElement ? (cs.fill && cs.fill !== 'none' ? cs.fill : cs.color) : cs.color);
    out.push({
      x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height,
      text: text.slice(0, 20),
      fg: [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])],
      px: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight) || 400,
      section: sectionOf(e),
      deco,
    });
  }
  return out;
})()`;

type Probe = {
  x: number; y: number; w: number; h: number;
  text: string; fg: [number, number, number, number];
  px: number; weight: number; section: string; deco: boolean;
};

async function settleFonts(page: Page): Promise<void> {
  await page.evaluate(`(async () => {
    try { await document.fonts.ready; } catch (e) {}
    await Promise.all(Array.from(document.images).map((i) => {
      i.loading = 'eager';
      return i.decode ? i.decode().catch(() => 0) : Promise.resolve(0);
    }));
  })()`);
  await page.waitForTimeout(120);
}

async function measurePage(
  page: Page,
  meta: { fixture: string; archetype: string; width: number },
): Promise<Fail[]> {
  await settleFonts(page);
  const probes = (await page.evaluate(PROBE)) as Probe[];
  const hide = await page.addStyleTag({
    content:
      "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}svg text,svg tspan{fill:transparent!important;stroke:none!important}",
  });
  const vp = page.viewportSize()!;
  const full = (await page.evaluate("Math.ceil(document.documentElement.scrollHeight)")) as number;
  await page.setViewportSize({ width: vp.width, height: Math.min(Math.max(full, vp.height), 16000) });
  await page.waitForTimeout(80);
  const buf = await page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
  await page.setViewportSize(vp);
  await hide.evaluate((el) => el.remove());

  const im = sharp(buf);
  const m = await im.metadata();
  const raw = await im.ensureAlpha().raw().toBuffer();
  const WW = m.width!, HH = m.height!;
  const fails: Fail[] = [];

  for (const p of probes) {
    if (p.deco) continue;
    const x0 = Math.max(0, Math.floor(p.x));
    const y0 = Math.max(0, Math.floor(p.y));
    const x1 = Math.min(WW, Math.ceil(p.x + p.w));
    const y1 = Math.min(HH, Math.ceil(p.y + p.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const ls: number[] = [];
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * WW + x) * 4;
        ls.push(lum(raw[i]!, raw[i + 1]!, raw[i + 2]!));
        sr += raw[i]!; sg += raw[i + 1]!; sb += raw[i + 2]!;
        n += 1;
      }
    }
    if (!n) continue;
    ls.sort((a, b) => a - b);
    const a = p.fg[3];
    const mix = (c: number, avg: number) => c * a + avg * (1 - a);
    const fl =
      a >= 0.999
        ? lum(p.fg[0], p.fg[1], p.fg[2])
        : lum(mix(p.fg[0], sr / n), mix(p.fg[1], sg / n), mix(p.fg[2], sb / n));
    const med = ls[Math.floor(ls.length * 0.5)]!;
    // TASK: 본문(<18px 또는 <14px bold) ≥4.5, 큰 글자 ≥3.0
    const body = p.px < 18 || (p.px < 14 && p.weight >= 700);
    const need = body ? 4.5 : 3.0;
    const hi = need === 3 ? 0.75 : 0.9;
    const worst = fl >= med ? ls[Math.min(ls.length - 1, Math.floor(ls.length * hi))]! : ls[Math.floor(ls.length * (1 - hi))]!;
    const ratio = ratioOf(fl, worst);
    if (ratio < need) {
      fails.push({
        fixture: meta.fixture,
        archetype: meta.archetype,
        width: meta.width,
        section: p.section,
        text: p.text,
        px: Math.round(p.px * 10) / 10,
        ratio: Math.round(ratio * 100) / 100,
        need,
        deco: false,
      });
    }
  }
  return fails.sort((a, b) => a.ratio - b.ratio);
}

export async function runContrastRender478(opts: RunOpts = {}): Promise<{
  fails: Fail[];
  totalCheckedPages: number;
  captureDir: string;
}> {
  const widths = opts.widths ?? (opts.short ? [750] : [750, 390]);
  const fixtures = opts.fixtures ?? [...FIXTURES];
  const archetypes = opts.archetypes ?? [...ARCHETYPE_IDS];
  const capture = opts.capture ?? !opts.short;

  if (!fs.existsSync(path.join(GALLERY, "index.html"))) {
    throw new Error(
      `갤러리 없음: ${GALLERY} — npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`,
    );
  }
  if (capture) fs.mkdirSync(CAP_DIR, { recursive: true });

  const browser = await chromium.launch();
  const fails: Fail[] = [];
  let pages = 0;

  for (const W of widths) {
    for (const fx of fixtures) {
      for (const arch of archetypes) {
        const htmlPath = path.join(GALLERY, arch, `${fx}.html`);
        if (!fs.existsSync(htmlPath)) {
          console.warn(`skip ${htmlPath}`);
          continue;
        }
        const ctx = await browser.newContext({
          viewport: { width: W, height: 900 },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
          javaScriptEnabled: true,
        });
        await ctx.route("**/*", (route) => {
          const u = route.request().url();
          if (u.startsWith("file:") || u.startsWith("data:")) return route.continue();
          return route.abort();
        });
        const page = await ctx.newPage();
        await page.goto(fileUrl(htmlPath), { waitUntil: "load", timeout: 60_000 });
        const pageFails = await measurePage(page, { fixture: fx, archetype: arch, width: W });
        fails.push(...pageFails);
        pages += 1;
        if (capture) {
          const full = await page.screenshot({ type: "png", fullPage: true, animations: "disabled" });
          fs.writeFileSync(path.join(CAP_DIR, `full__${fx}__${arch}__${W}.png`), full);
        }
        await ctx.close();
        const tag = `${fx}/${arch}/${W}`;
        console.log(`${pageFails.length ? "FAIL" : "ok  "} ${tag} fails=${pageFails.length}`);
      }
    }
  }
  await browser.close();

  if (opts.outJson) {
    fs.mkdirSync(path.dirname(opts.outJson), { recursive: true });
    fs.writeFileSync(opts.outJson, JSON.stringify({ pages, fails }, null, 2));
  }
  return { fails, totalCheckedPages: pages, captureDir: CAP_DIR };
}

export function summarizeFails(fails: Fail[]): string {
  const lines: string[] = [];
  lines.push(`# 478 렌더 대비 실패 ${fails.length}건`);
  lines.push("");
  const byArch = new Map<string, number>();
  const byFx = new Map<string, number>();
  for (const f of fails) {
    byArch.set(f.archetype, (byArch.get(f.archetype) ?? 0) + 1);
    byFx.set(f.fixture, (byFx.get(f.fixture) ?? 0) + 1);
  }
  lines.push("## 아키타입별");
  for (const [k, n] of [...byArch.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- ${k}: ${n}`);
  lines.push("", "## 픽스처별");
  for (const [k, n] of [...byFx.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- ${k}: ${n}`);
  lines.push("", "## 샘플(최대 40)");
  for (const f of fails.slice(0, 40)) {
    lines.push(
      `- ${f.fixture}/${f.archetype}/${f.width} [${f.section}] «${f.text}» ${f.px}px ${f.ratio}<${f.need}`,
    );
  }
  return lines.join("\n") + "\n";
}

if (/contrast-render-478\.ts$/.test(process.argv[1] ?? "")) {
  const short = process.argv.includes("--short");
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "review/478-contrast.json";
  void runContrastRender478({ short, outJson: out, capture: !short }).then(({ fails }) => {
    const md = summarizeFails(fails);
    fs.writeFileSync("review/478-contrast-summary.md", md);
    console.log(md);
    process.exit(fails.length ? 1 : 0);
  });
}
