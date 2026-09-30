/**
 * 280차 — 로컬 /dev/detail-preview 의 이미지를 279차 결과의 실제 원격 이미지로 교체한 뒤
 * prepareCaptureRoot(원격 이미지 data URL 인라인) + toPng(폰트 임베드 포함) 단계별 시간을 잰다. 무료.
 *   npm run dev (별도) → npx tsx scripts/280cha-capture-heavy-local.ts
 * 이미지 URL 은 로그에 남기지 않는다.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "280cha-png-repro", "local-heavy");
const HTI = path.join(ROOT, "node_modules", "html-to-image", "dist", "html-to-image.js");
const SESSION_279 = path.join(ROOT, "review", "279cha-live", "session.json");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const imageUrls = (JSON.parse(fs.readFileSync(SESSION_279, "utf8")) as { imageUrls: string[] }).imageUrls;
  const log: string[] = [];
  const note = (m: string) => {
    log.push(m);
    console.log(m);
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs: string[] = [];
  const t0 = Date.now();
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text().slice(0, 160));
    if (m.text().startsWith("[phase]")) note(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m.text()}`);
  });
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.locator("[data-pagzly-preview]").first().waitFor({ state: "visible" });
  await page.addScriptTag({ content: fs.readFileSync(HTI, "utf8") });

  const r = await page.evaluate(async (urls) => {
    const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
    const imgs = Array.from(root.querySelectorAll("img"));
    imgs.forEach((img, i) => {
      img.removeAttribute("srcset");
      img.src = urls[i % urls.length];
    });
    console.log(`[phase] swap imgs=${imgs.length}`);
    const t0 = performance.now();
    await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
    const tLoad = performance.now();
    console.log(`[phase] remote decode done ${((tLoad - t0) / 1000).toFixed(1)}s`);

    // prepareCaptureRoot 와 같은 방식: fetch(cors) → blob → data URL
    let inlineBytes = 0;
    await Promise.all(
      imgs.map(async (img) => {
        const res = await fetch(img.currentSrc || img.src, { mode: "cors", credentials: "omit", cache: "no-cache" });
        const blob = await res.blob();
        inlineBytes += blob.size;
        console.log(`[phase] fetched ${(blob.size / 1024 / 1024).toFixed(2)}MB ${blob.type}`);
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
        img.src = dataUrl;
      }),
    );
    await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
    const tInline = performance.now();
    console.log(`[phase] inline done ${((tInline - tLoad) / 1000).toFixed(1)}s total=${(inlineBytes / 1024 / 1024).toFixed(1)}MB → toPng`);

    const w = Math.max(1, root.offsetWidth);
    const h = Math.max(root.scrollHeight, root.offsetHeight);
    let pr = 860 / w;
    if (h * pr > 14000) pr = 14000 / h;
    pr = Math.max(pr, 0.25);
    const hti = (window as unknown as { htmlToImage: { toPng: (n: HTMLElement, o: object) => Promise<string> } })
      .htmlToImage;
    const out = await Promise.race([
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
        })
        .then((d) => ({ ok: true, pngMB: +(d.length / 1024 / 1024).toFixed(1) })),
      new Promise<{ ok: false; timeout: true }>((res) => setTimeout(() => res({ ok: false, timeout: true }), 300_000)),
    ]).catch((e: Error) => ({ ok: false, error: String(e) }));
    const tPng = performance.now();
    return {
      imgs: imgs.length,
      css: `${w}x${h}`,
      loadSec: +((tLoad - t0) / 1000).toFixed(1),
      inlineSec: +((tInline - tLoad) / 1000).toFixed(1),
      inlineMB: +(inlineBytes / 1024 / 1024).toFixed(1),
      toPngSec: +((tPng - tInline) / 1000).toFixed(1),
      ...out,
    };
  }, imageUrls);
  note(`[heavy] ${JSON.stringify(r)}`);
  note(`consoleErrors(${errs.length}): ${[...new Set(errs)].slice(0, 5).join(" | ").replace(/https?:\/\/[a-z0-9-]+\.supabase\.co\S*/gi, "<supabase-url>")}`);
  fs.writeFileSync(path.join(OUT, "run-log.txt"), log.join("\n") + "\n");
  await browser.close();
}

main().catch((e) => {
  console.error(String(e).replace(/https?:\/\/[a-z0-9-]+\.supabase\.co\S*/gi, "<supabase-url>"));
  process.exit(1);
});
