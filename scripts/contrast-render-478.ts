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
    if (e.closest('[aria-hidden="true"],[data-pagzly-bar],nav,nextjs-portal,footer,header')) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (cs.maxHeight === '0px' || cs.maxHeight === '0') continue;
    const deco = !!(e.closest('[data-pz-deco]') || e.getAttribute('data-pz-deco') != null);
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') ? e.getBoundingClientRect() : r.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    seen.add(e);
    const m = rgba(e instanceof SVGElement ? (cs.fill && cs.fill !== 'none' ? cs.fill : cs.color) : cs.color);
    // 479 — 칩/스티커/어두운·밝은 섬만 자기 배경 단색을 신뢰(일반 조상 면색은 사진 위 글자와 충돌)
    let solid = null;
    for (let n = e, depth = 0; n && n !== document.body && depth < 5; n = n.parentElement, depth++) {
      const marked = n.hasAttribute('data-pz-chip') || n.hasAttribute('data-pz-on-dark') || n.hasAttribute('data-pz-on-light') || n.getAttribute('data-hl') === 'sticker' || n.getAttribute('data-hl') === 'price';
      if (!marked) continue;
      const bg = getComputedStyle(n).backgroundColor;
      if (String(bg) === 'rgba(0, 0, 0, 0)' || String(bg) === 'transparent') continue;
      const p = rgba(bg);
      if (p[3] >= 0.95) {
        solid = [Number(p[0]), Number(p[1]), Number(p[2]), Number(p[3])];
        break;
      }
    }
    out.push({
      x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height,
      text: text.slice(0, 20),
      fg: [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])],
      bgSolid: solid,
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
  bgSolid: [number, number, number, number] | null;
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
  await page.waitForTimeout(60);
}

async function measurePage(
  page: Page,
  meta: { fixture: string; archetype: string; width: number },
): Promise<Fail[]> {
  await settleFonts(page);
  // sticky/fixed 내비·바가 fullPage 픽셀 샘플을 오염시키지 않게 해제
  await page.addStyleTag({
    content:
      ".pagzly-anchor-nav,[style*='position:sticky'],[style*='position: fixed'],[style*='position:sticky']{position:relative!important;top:auto!important;bottom:auto!important}",
  });
  const probes = (await page.evaluate(PROBE)) as Probe[];
  // 인라인 !important로 면 강제 잉크(높은 특이도)보다 글자를 숨김
  await page.evaluate(`(() => {
    document.querySelectorAll('p,h1,h2,h3,h4,h5,li,td,th,label,a,span,strong,em,b,small,[data-pz-s],[data-pz-title],[data-pz-eyebrow]').forEach((e) => {
      e.style.setProperty('color', 'transparent', 'important');
      e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
      e.style.setProperty('text-shadow', 'none', 'important');
    });
    document.querySelectorAll('svg text,svg tspan').forEach((e) => {
      e.style.setProperty('fill', 'transparent', 'important');
      e.style.setProperty('stroke', 'none', 'important');
    });
  })()`);
  const vp = page.viewportSize()!;
  const full = (await page.evaluate("Math.ceil(document.documentElement.scrollHeight)")) as number;
  const chunkH = vp.height;
  /** 문서 y → 청크 뷰포트 샷 픽셀 (긴 페이지에서 tall-viewport 텍스처 한계 회피) */
  type Chunk = { top: number; WW: number; HH: number; raw: Buffer };
  const chunks: Chunk[] = [];
  for (let top = 0; top < full; top += chunkH) {
    await page.evaluate((t) => window.scrollTo(0, t), top);
    await page.waitForTimeout(20);
    const buf = await page.screenshot({ type: "png", animations: "disabled" });
    const im = sharp(buf);
    const m = await im.metadata();
    const raw = await im.ensureAlpha().raw().toBuffer();
    chunks.push({ top, WW: m.width!, HH: m.height!, raw });
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const sampleBox = (p: Probe): { ls: number[]; sr: number; sg: number; sb: number; n: number } | null => {
    const midY = p.y + p.h / 2;
    const ch = chunks.find((c) => midY >= c.top && midY < c.top + c.HH) ?? chunks[chunks.length - 1];
    if (!ch) return null;
    // 479 — 원형·알약 가장자리 제외(가로·세로 12% 안쪽만)
    const insetX = Math.max(1, Math.floor(p.w * 0.12));
    const insetY = Math.max(1, Math.floor(p.h * 0.12));
    const x0 = Math.max(0, Math.floor(p.x + insetX));
    const y0 = Math.max(0, Math.floor(p.y - ch.top + insetY));
    const x1 = Math.min(ch.WW, Math.ceil(p.x + p.w - insetX));
    const y1 = Math.min(ch.HH, Math.ceil(p.y + p.h - ch.top - insetY));
    if (x1 - x0 < 2 || y1 - y0 < 2) return null;
    const ls: number[] = [];
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * ch.WW + x) * 4;
        ls.push(lum(ch.raw[i]!, ch.raw[i + 1]!, ch.raw[i + 2]!));
        sr += ch.raw[i]!; sg += ch.raw[i + 1]!; sb += ch.raw[i + 2]!;
        n += 1;
      }
    }
    return n ? { ls, sr, sg, sb, n } : null;
  };

  const fails: Fail[] = [];
  for (const p of probes) {
    if (p.deco) continue;
    const samp = sampleBox(p);
    if (!samp && !p.bgSolid) continue;
    const { ls, sr, sg, sb, n } = samp ?? { ls: [0], sr: 0, sg: 0, sb: 0, n: 1 };
    ls.sort((a, b) => a - b);
    const a = p.fg[3];
    const mix = (c: number, avg: number) => c * a + avg * (1 - a);
    const avgR = n ? sr / n : 0, avgG = n ? sg / n : 0, avgB = n ? sb / n : 0;
    const fl =
      a >= 0.999
        ? lum(p.fg[0], p.fg[1], p.fg[2])
        : lum(mix(p.fg[0], avgR), mix(p.fg[1], avgG), mix(p.fg[2], avgB));
    // 479 — 불투명 자기 배경이 있으면 그걸 우선(스티커·알약 원형 샘플 구멍 회피)
    const med = p.bgSolid
      ? lum(p.bgSolid[0], p.bgSolid[1], p.bgSolid[2])
      : ls[Math.floor(ls.length * 0.5)]!;
    // TASK: 본문(<18px 또는 <14px bold) ≥4.5, 큰 글자 ≥3.0
    const body = p.px < 18 || (p.px < 14 && p.weight >= 700);
    const need = body ? 4.5 : 3.0;
    const ratio = ratioOf(fl, med);
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
  const fx = process.argv.find((a) => a.startsWith("--fixtures="))?.slice(11)?.split(",").filter(Boolean);
  const arch = process.argv.find((a) => a.startsWith("--archetypes="))?.slice(13)?.split(",").filter(Boolean);
  const noCap = process.argv.includes("--no-capture");
  void runContrastRender478({
    short,
    outJson: out,
    capture: noCap ? false : !short,
    fixtures: fx,
    archetypes: arch,
  }).then(({ fails }) => {
    const md = summarizeFails(fails);
    fs.writeFileSync("review/478-contrast-summary.md", md);
    console.log(md);
    process.exit(fails.length ? 1 : 0);
  });
}
