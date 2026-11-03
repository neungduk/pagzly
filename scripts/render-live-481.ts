/**
 * 481차 A — live-481.json 을 8종 아키타입 + 자동(editorial 기대) × (750,390) PNG 로 렌더.
 * 네트워크는 file:/data: + img.pagzly.com 만 허용. 산출물 review/481-captures/(커밋 금지).
 *   npx tsx scripts/render-live-481.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests, type ArchetypeId } from "../lib/page-archetype-v5";
import { exportHtmlOf } from "./design-corpus";

const FIXTURE = path.join("scripts", "fixtures", "live-481.json");
const HTML_DIR = path.join("review", "481-gallery");
const OUT = path.join("review", "481-captures");
const WIDTHS = [750, 390] as const;
const ALLOW_HOST = "img.pagzly.com";

/** 갤러리 HTML에서 /fonts·상대 자산을 file:// 기준으로 맞춤. 외부 img.pagzly.com 은 유지 */
function localizeFonts(html: string, depth: number): string {
  const up = "../".repeat(depth);
  return html
    .replace(/(src|href)="\/(fonts)\//g, `$1="${up}public/$2/`)
    .replace(/(src|href)="\/(qa-fixtures)\//g, `$1="${up}public/$2/`)
    .replace(/loading="lazy"/g, 'loading="eager"');
}

function writeHtml(arch: string, html: string): string {
  const dir = path.join(HTML_DIR, arch);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, "live-481.html");
  fs.writeFileSync(dest, localizeFonts(html, 3));
  return dest;
}

async function main() {
  if (!fs.existsSync(FIXTURE)) throw new Error(`missing ${FIXTURE} — run capture-live-fixture-481.ts first`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(HTML_DIR, { recursive: true });

  process.env.NEXT_PUBLIC_DESIGN_V4 = process.env.NEXT_PUBLIC_DESIGN_V4 || "on";
  process.env.NEXT_PUBLIC_DESIGN_V5 = "on";
  // UP1 기본 가정과 맞춤
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);

  const htmlByArch: Array<[string, string]> = [];
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    htmlByArch.push([a, exportHtmlOf(FIXTURE)]);
  }
  // 자동 선택(강제 해제) — 실사와 같은 조건
  setV5ArchetypeForTests(null);
  const autoHtml = exportHtmlOf(FIXTURE);
  const autoArch =
    (/data-pz-bsig="([a-z]+)"/.exec(autoHtml)?.[1] as ArchetypeId | undefined) ?? "auto";
  htmlByArch.push([`auto-${autoArch}`, autoHtml]);

  const files: Array<[string, string]> = [];
  for (const [a, html] of htmlByArch) {
    files.push([a, writeHtml(a, html)]);
    const vsig = /data-pz-vsig="([a-z]+)"/.exec(html)?.[1] ?? "-";
    const bsig = /data-pz-bsig="([a-z]+)"/.exec(html)?.[1] ?? "-";
    const fonts = [...html.matchAll(/\/fonts\/([a-z0-9-]+)\.css/g)].map((m) => m[1]);
    console.log(`html ${a}: bsig=${bsig} vsig=${vsig} fonts=${[...new Set(fonts)].join(",")}`);
  }

  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);

  const browser = await chromium.launch({ headless: true });
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await ctx.route("**/*", (route) => {
      const u = route.request().url();
      if (u.startsWith("file:") || u.startsWith("data:")) return route.continue();
      try {
        if (new URL(u).host === ALLOW_HOST) return route.continue();
      } catch {
        /* abort */
      }
      return route.abort();
    });
    const page = await ctx.newPage();
    for (const [a, file] of files) {
      const url = "file://" + path.resolve(file).replace(/\\/g, "/");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(400);
      const dest = path.join(OUT, `live-481-${a}-${w}.png`);
      await page.screenshot({ path: dest, fullPage: true, animations: "disabled" });
      console.log("wrote", dest);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`done → ${OUT} (${files.length} arch × ${WIDTHS.length} widths)`);
}

void main();
