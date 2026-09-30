/**
 * 280차 — 실제 lib/capture-detail-png.ts (수정 전 HEAD vs 수정 후) 를 번들해 로컬 /dev/detail-preview 에서
 * prepareCaptureRoot + captureDetailToPngBlob 을 실행한다. 이미지는 279차 결과의 실제 원격 이미지로 교체. 무료.
 *   npm run dev (별도) → npx tsx scripts/280cha-capture-lib-verify.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "280cha-png-repro", "lib-verify");
const SESSION_279 = path.join(ROOT, "review", "279cha-live", "session.json");
const CAP_MS = 240_000;

function bundle(label: string, source: string): string {
  const tmp = path.join(OUT, "_bundle");
  fs.mkdirSync(tmp, { recursive: true });
  const entry = path.join(tmp, `${label}-entry.ts`);
  fs.writeFileSync(entry, source);
  const out = path.join(os.tmpdir(), `cap280-${label}.js`);
  execSync(
    `npx esbuild "${entry}" --bundle --format=iife --global-name=PagzlyCapture --outfile="${out}" --log-level=error`,
    { cwd: ROOT, stdio: "inherit" },
  );
  return fs.readFileSync(out, "utf8");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const variants = [
    { label: "before(HEAD)", code: bundle("before", execSync("git show HEAD:lib/capture-detail-png.ts", { cwd: ROOT }).toString()) },
    { label: "after(working)", code: bundle("after", fs.readFileSync(path.join(ROOT, "lib", "capture-detail-png.ts"), "utf8")) },
  ];
  const imageUrls = (JSON.parse(fs.readFileSync(SESSION_279, "utf8")) as { imageUrls: string[] }).imageUrls;
  const lines: string[] = [];
  const note = (m: string) => {
    lines.push(m);
    console.log(m);
  };

  const browser = await chromium.launch();
  for (const v of variants) {
    for (const images of ["fixture", "279-remote"] as const) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
      const page = await context.newPage();
      await page.addInitScript({ content: "window.__name = (f) => f;" });
      await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "networkidle", timeout: 180_000 });
      await page.locator("[data-pagzly-preview]").first().waitFor({ state: "visible" });
      await page.addScriptTag({ content: v.code });
      const r = await page.evaluate(
        async ({ urls, useRemote, capMs }) => {
          type Cap = {
            prepareCaptureRoot: (el: HTMLElement) => Promise<() => void>;
            captureDetailToPngBlob: (el: HTMLElement, w: number) => Promise<Blob>;
          };
          const cap = (window as unknown as { PagzlyCapture: Cap }).PagzlyCapture;
          const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
          const imgs = Array.from(root.querySelectorAll("img"));
          if (useRemote) {
            imgs.forEach((img, i) => {
              img.removeAttribute("srcset");
              img.src = urls[i % urls.length];
            });
          }
          const lazy = imgs.filter((i) => i.loading === "lazy").length;
          const t0 = performance.now();
          let phase = "prepare";
          const run = (async () => {
            const restore = await cap.prepareCaptureRoot(root);
            phase = "toPng";
            const blob = await cap.captureDetailToPngBlob(root, 860);
            restore();
            return { ok: true as const, pngKB: Math.round(blob.size / 1024) };
          })();
          const out = await Promise.race([
            run.catch((e: Error) => ({ ok: false as const, error: String(e).slice(0, 200) })),
            new Promise<{ ok: false; stuckIn: string }>((res) =>
              setTimeout(() => res({ ok: false, stuckIn: phase }), capMs),
            ),
          ]);
          return { imgs: imgs.length, lazy, sec: +((performance.now() - t0) / 1000).toFixed(1), ...out };
        },
        { urls: imageUrls, useRemote: images === "279-remote", capMs: CAP_MS },
      );
      note(`[${v.label} / ${images}] ${JSON.stringify(r)}`);
      await context.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "run-log.txt"), lines.join("\n") + "\n");
  await browser.close();
}

main().catch((e) => {
  console.error(String(e).replace(/https?:\/\/[a-z0-9-]+\.supabase\.co\S*/gi, "<supabase-url>"));
  process.exit(1);
});
