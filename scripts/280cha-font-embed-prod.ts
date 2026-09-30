/**
 * 280차 — 프로덕션 공개 페이지(/)에서 html-to-image 폰트 임베드 비용 실측 (무료, 로그인 불필요).
 *   npx tsx scripts/280cha-font-embed-prod.ts
 * 결과 페이지와 같은 next/font(Noto Sans/Serif KR) CSS를 쓰므로 getWebFontCSS 단계 비용을 그대로 잰다.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.PROD_BASE ?? "https://www.pagzly.com";
const OUT = path.join(ROOT, "review", "280cha-png-repro", "prod-font-embed");
const HTI = path.join(ROOT, "node_modules", "html-to-image", "dist", "html-to-image.js");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const log: string[] = [];
  const note = (m: string) => {
    log.push(m);
    console.log(m);
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let fontReqs = 0;
  let fontBytes = 0;
  let counting = false;
  page.on("response", async (r) => {
    if (!counting || !/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) return;
    fontReqs += 1;
    const len = Number(r.headers()["content-length"] ?? 0);
    if (len) fontBytes += len;
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.addScriptTag({ content: fs.readFileSync(HTI, "utf8") });

  for (const run of [1, 2]) {
    fontReqs = 0;
    fontBytes = 0;
    counting = true;
    const r = await page.evaluate(async () => {
      const hti = (window as unknown as { htmlToImage: { getFontEmbedCSS: (n: HTMLElement) => Promise<string> } })
        .htmlToImage;
      const t = performance.now();
      const css = await Promise.race([
        hti.getFontEmbedCSS(document.body),
        new Promise<string>((res) => setTimeout(() => res("__timeout__"), 300_000)),
      ]);
      return {
        sec: +((performance.now() - t) / 1000).toFixed(1),
        timeout: css === "__timeout__",
        cssMB: +(css.length / 1024 / 1024).toFixed(1),
      };
    });
    counting = false;
    note(`[getFontEmbedCSS run${run}] ${JSON.stringify(r)} fontRequests=${fontReqs} fontMB≈${(fontBytes / 1024 / 1024).toFixed(1)}`);
  }
  fs.writeFileSync(path.join(OUT, "run-log.txt"), log.join("\n") + "\n");
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
