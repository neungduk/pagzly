/**
 * 280차 — 화면 밖 loading="lazy" 이미지에 prepareCaptureRoot 와 같은 방식(src=data URL → img.decode())을
 * 적용했을 때 decode 가 끝나는지 확인 (무료, 로컬 /dev/detail-preview).
 *   npm run dev (별도) → npx tsx scripts/280cha-lazy-decode-probe.ts
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "280cha-png-repro", "lazy-probe");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript({ content: "window.__name = (f) => f;" });
  await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.locator("[data-pagzly-preview]").first().waitFor({ state: "visible" });

  const r = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
    const imgs = Array.from(root.querySelectorAll("img"));
    const vh = window.innerHeight;
    const info = imgs.map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        lazy: img.loading === "lazy",
        offscreen: rect.top > vh * 2,
        completeBefore: img.complete,
        naturalWBefore: img.naturalWidth,
      };
    });
    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([p.then(() => "resolved" as const, () => "rejected" as const), new Promise<"timeout">((res) => setTimeout(() => res("timeout"), ms))]);

    // prepareCaptureRoot 와 같은 순서: fetch → data URL → img.src 교체 → decode
    const results = await Promise.all(
      imgs.map(async (img, i) => {
        const original = img.currentSrc || img.src;
        const res = await fetch(original);
        const dataUrl = await blobToDataUrl(await res.blob());
        img.removeAttribute("crossorigin");
        img.src = dataUrl;
        const decode = await withTimeout(img.decode(), 15_000);
        return { ...info[i], decode, completeAfter: img.complete, naturalWAfter: img.naturalWidth };
      }),
    );
    return results;
  });

  const summarize = (rows: typeof r) => {
    const groups = new Map<string, number>();
    for (const x of rows) {
      const k = `lazy=${x.lazy} offscreen=${x.offscreen} completeBefore=${x.completeBefore} → decode=${x.decode}`;
      groups.set(k, (groups.get(k) ?? 0) + 1);
    }
    return [...groups].map(([k, n]) => `${n}× ${k}`);
  };
  const lines = [`imgs=${r.length}`, ...summarize(r)];
  for (const l of lines) console.log(l);
  fs.writeFileSync(path.join(OUT, "run-log.txt"), lines.join("\n") + "\n" + JSON.stringify(r, null, 1));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
