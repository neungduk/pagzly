/**
 * 477차 A — 섹션(블록) 단위 캡처 하네스.
 *   npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial
 *   npx tsx scripts/block-capture-477.ts
 * 산출: review/477-blocks/{fixture}/{archetype}/{index}-{kind}.png + strip-by-kind (커밋 금지)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type ElementHandle, type Page } from "playwright";
import sharp from "sharp";
import { ARCHETYPE_IDS } from "../lib/page-archetype-v5";

const GALLERY = "review/465-gallery";
const OUT = "review/477-blocks";
const FIXTURES = ["fx-tech-keyboard", "fx-skincare-serum", "fx-fashion-dress-floral", "fx-food-snack"] as const;
const WIDTHS = [750, 390] as const;

/** TASK 477 블록 종류 */
export const BLOCK_KINDS = [
  "hero",
  "points",
  "check",
  "story",
  "metrics",
  "options",
  "phototext",
  "spec",
  "reviews",
  "faq",
  "notice",
  "purchase",
  "other",
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

function fileUrl(p: string): string {
  const abs = path.resolve(p).split(path.sep).join("/");
  return abs.startsWith("/") ? `file://${abs}` : `file:///${abs}`;
}

/** DOM 속성·클래스로 블록 종류 추정 (data-kind 없음) */
export function classifyFromAttrs(a: {
  pzImpact?: string | null;
  pzV4?: string | null;
  info?: string | null;
  pzIt?: string | null;
  pzHl?: string | null;
  pzSf?: string | null;
  pzBuy?: string | null;
  pzPc?: string | null;
  className?: string | null;
  textSample?: string;
}): BlockKind {
  const v4 = (a.pzV4 ?? "").toLowerCase();
  const impact = (a.pzImpact ?? "").toLowerCase();
  const info = (a.info ?? "").toLowerCase();
  const sf = (a.pzSf ?? "").toLowerCase();
  const it = (a.pzIt ?? "").toLowerCase();
  const hl = (a.pzHl ?? "").toLowerCase();
  const cls = (a.className ?? "").toLowerCase();
  const sample = (a.textSample ?? "").slice(0, 200);

  if (a.pzBuy === "1" || v4.startsWith("touch.") || /cta_price|구매|price/.test(cls + sample)) return "purchase";
  if (impact === "hero" || cls.includes("hero") || sample.startsWith("HERO")) return "hero";
  // first section without marks often hero — handled by index in capture
  if (v4.startsWith("benefits.") || info === "points" || hl) return "points";
  if (v4.startsWith("concern.") || sf.startsWith("c") || /checklist|checkrows/.test(cls + impact)) return "check";
  if (v4.startsWith("story.") || sf.includes("brand") || impact.includes("story")) return "story";
  if (v4.startsWith("stats.") || info === "stat" || /stat|number|reviewstat/.test(impact + cls)) return "metrics";
  if (/color_variation|chip|swatch|3.?card|numcards/.test(v4 + impact + cls + sample)) return "options";
  if (v4.startsWith("phototext.") || it || a.pzPc || impact === "zoom" || impact === "inset" || impact === "frame")
    return "phototext";
  if (
    v4.startsWith("spec.") ||
    /specstrip|sizebars|spectable|spec_table|size_table/.test(impact + cls) ||
    info === "compare"
  )
    return "spec";
  if (/review/.test(impact + cls + sf) || /후기|리뷰/.test(sample)) return "reviews";
  if (v4.startsWith("faq.") || impact.includes("faq") || /^q\d/i.test(sample)) return "faq";
  if (/caution|disclosure|ai_disclosure|고지|주의/.test(impact + cls + sample)) return "notice";
  if (v4.startsWith("gallery.") || impact.includes("gallery") || impact === "asym2" || impact === "mosaic3")
    return "phototext";
  return "other";
}

async function classifyHandle(el: ElementHandle<Element>, index: number): Promise<BlockKind> {
  const attrs = await el.evaluate((node) => {
    const e = node as HTMLElement;
    return {
      pzImpact: e.getAttribute("data-pz-impact"),
      pzV4: e.getAttribute("data-pz-v4"),
      info: e.getAttribute("data-info"),
      pzIt: e.getAttribute("data-pz-it"),
      pzHl: e.getAttribute("data-pz-hl"),
      pzSf: e.getAttribute("data-pz-sf"),
      pzBuy: e.getAttribute("data-pz-buy"),
      pzPc: e.getAttribute("data-pz-pc"),
      className: e.className?.toString?.() ?? "",
      textSample: (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240),
      tag: e.tagName,
    };
  });
  if (index === 0) {
    const k = classifyFromAttrs(attrs);
    if (k === "other" || k === "hero") return "hero";
  }
  return classifyFromAttrs(attrs);
}

async function capturePage(
  page: Page,
  outDir: string,
  width: number,
): Promise<Map<BlockKind, Buffer[]>> {
  fs.mkdirSync(outDir, { recursive: true });
  const byKind = new Map<BlockKind, Buffer[]>();
  const sections = page.locator("section");
  const n = await sections.count();
  for (let i = 0; i < n; i++) {
    const loc = sections.nth(i);
    const handle = await loc.elementHandle();
    if (!handle) continue;
    const kind = await classifyHandle(handle, i);
    await handle.dispose();
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
      const buf = await loc.screenshot({ type: "png", animations: "disabled" });
      const name = `${String(i).padStart(2, "0")}-${kind}.png`;
      fs.writeFileSync(path.join(outDir, name), buf);
      const arr = byKind.get(kind) ?? [];
      arr.push(buf);
      byKind.set(kind, arr);
    } catch (e) {
      console.warn(`skip section ${i} ${kind}:`, String(e).slice(0, 80));
    }
  }
  // width unused in file names (folder already scoped by caller width pass) — keep for API
  void width;
  return byKind;
}

async function writeKindStrip(
  kind: BlockKind,
  tiles: Buffer[],
  outPath: string,
  cellW: number,
  cellH: number,
) {
  if (tiles.length < 1) return;
  const n = Math.min(8, tiles.length);
  const resized = await Promise.all(
    tiles.slice(0, n).map((b) =>
      sharp(b).resize(cellW, cellH, { fit: "cover", position: "top" }).png().toBuffer(),
    ),
  );
  const comps = resized.map((input, i) => ({ input, left: i * cellW, top: 0 }));
  const buf = await sharp({
    create: { width: cellW * n, height: cellH, channels: 3, background: "#111" },
  })
    .composite(comps)
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
}

async function main() {
  if (!fs.existsSync(path.join(GALLERY, "index.html"))) {
    console.error(
      `갤러리 없음: ${GALLERY} — npx tsx scripts/v5-gallery-465.ts --ph2 --localize-blocked --photos=partial`,
    );
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  /** kind → archetype tiles for strip (first fixture pass collects all arch) */
  for (const W of WIDTHS) {
    const stripBuckets = new Map<BlockKind, Buffer[]>();
    for (const fx of FIXTURES) {
      for (const arch of ARCHETYPE_IDS) {
        const htmlPath = path.join(GALLERY, arch, `${fx}.html`);
        if (!fs.existsSync(htmlPath)) {
          console.warn(`skip ${htmlPath}`);
          continue;
        }
        const outDir = path.join(OUT, fx, arch, String(W));
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
        await page.waitForTimeout(120);
        const byKind = await capturePage(page, outDir, W);
        // pick first block of each kind for cross-arch strip (use skincare as primary strip fixture)
        if (fx === "fx-skincare-serum") {
          for (const [kind, bufs] of byKind) {
            if (!bufs[0]) continue;
            const arr = stripBuckets.get(kind) ?? [];
            arr.push(bufs[0]);
            stripBuckets.set(kind, arr);
          }
        }
        await ctx.close();
        console.log(`ok ${fx}/${arch}/${W} kinds=${[...byKind.keys()].join(",")}`);
      }
    }
    const cellW = Math.round(W / 2);
    const cellH = 280;
    for (const [kind, tiles] of stripBuckets) {
      if (tiles.length < 2) continue;
      await writeKindStrip(
        kind,
        tiles,
        path.join(OUT, `strip__${kind}__skincare__${W}.png`),
        cellW,
        cellH,
      );
    }
  }
  await browser.close();
  console.log("done", OUT);
}

void main();
