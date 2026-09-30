/**
 * 280차 — 로컬 /dev/detail-preview 에서 html-to-image toPng 소요 시간 실측 (무료, 로그인 불필요).
 *   npm run dev  (별도)  →  npx tsx scripts/280cha-capture-timing-local.ts
 * captureDetailToPngBlob 과 같은 옵션으로 toPng 를 호출하고, 폰트 임베드(skipFonts) 유무를 비교한다.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "280cha-png-repro", "local");
const HTI = path.join(ROOT, "node_modules", "html-to-image", "dist", "html-to-image.js");
const MAX_CANVAS_EDGE = 14000;
const TIMEOUT_MS = 300_000;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const log: string[] = [];
  const note = (m: string) => {
    log.push(m);
    console.log(m);
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });
  let fontReqs = 0;
  let counting = false;
  page.on("request", (r) => {
    if (counting && /\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fontReqs += 1;
  });

  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.locator("[data-pagzly-preview]").first().waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(2000);
  await page.addScriptTag({ content: fs.readFileSync(HTI, "utf8") });

  const fontFaceInfo = await page.evaluate(() => {
    let rules = 0;
    let urls = 0;
    const families = new Map<string, number>();
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of Array.from(list)) {
        if (r.type === CSSRule.FONT_FACE_RULE) {
          const fr = r as CSSFontFaceRule;
          rules += 1;
          urls += (fr.style.getPropertyValue("src").match(/url\(/g) ?? []).length;
          const fam = fr.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
          families.set(fam, (families.get(fam) ?? 0) + 1);
        }
      }
    }
    return { rules, urls, families: Object.fromEntries(families) };
  });
  note(`@font-face rules=${fontFaceInfo.rules} urls=${fontFaceInfo.urls} families=${JSON.stringify(fontFaceInfo.families)}`);

  for (const variant of ["fonts-embedded(현행)", "skipFonts"] as const) {
    fontReqs = 0;
    counting = true;
    const r = await page
      .evaluate(
        async ({ skipFonts, maxEdge, timeoutMs }) => {
          const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
          const w = Math.max(1, root.offsetWidth);
          const h = Math.max(root.scrollHeight, root.offsetHeight);
          let pr = 860 / w;
          if (h * pr > maxEdge) pr = maxEdge / h;
          pr = Math.max(pr, 0.25);
          const t = performance.now();
          const hti = (window as unknown as { htmlToImage: { toPng: (n: HTMLElement, o: object) => Promise<string> } })
            .htmlToImage;
          const race = await Promise.race([
            hti
              .toPng(root, {
                pixelRatio: pr,
                cacheBust: false,
                skipAutoScale: true,
                backgroundColor: "#FAF8F3",
                width: w,
                height: h,
                canvasWidth: Math.round(w * pr),
                canvasHeight: Math.round(h * pr),
                ...(skipFonts ? { skipFonts: true } : {}),
              })
              .then((d) => ({ ok: true, bytes: d.length })),
            new Promise<{ ok: false; timeout: true }>((res) => setTimeout(() => res({ ok: false, timeout: true }), timeoutMs)),
          ]).catch((e: Error) => ({ ok: false, error: String(e) }));
          return { css: `${w}x${h}`, pr: +pr.toFixed(3), sec: +((performance.now() - t) / 1000).toFixed(1), ...race };
        },
        { skipFonts: variant === "skipFonts", maxEdge: MAX_CANVAS_EDGE, timeoutMs: TIMEOUT_MS },
      )
      .catch((e: Error) => ({ error: e.message }));
    counting = false;
    note(`[${variant}] ${JSON.stringify(r)} fontRequests=${fontReqs}`);
  }
  note(`consoleErrors(${consoleErrors.length}): ${[...new Set(consoleErrors)].slice(0, 5).join(" | ")}`);
  fs.writeFileSync(path.join(OUT, "run-log.txt"), log.join("\n") + "\n");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
