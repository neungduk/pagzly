/**
 * 283차 — 긴 상세페이지 PNG의 목표 폭 유지 검증. 무료(생성 호출 없음).
 * 실제 lib/capture-detail-png.ts (수정 전 HEAD vs 작업본)를 번들해 로컬 /dev/detail-preview?capture=session 에
 * 279차 저장 결과를 결과 페이지 가운데 칼럼 폭(501px)으로 렌더하고, 출력 PNG의 실제 픽셀 크기를 확인한다.
 *   npm run dev (별도) → npx tsx scripts/283cha-capture-width-verify.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "283cha-capture");
const SESSION_279 = path.join(ROOT, "review", "279cha-live", "session.json");
const COL_PX = 501;
const TARGET_W = 860;

function bundle(label: string, source: string): string {
  const tmp = path.join(OUT, "_bundle");
  fs.mkdirSync(tmp, { recursive: true });
  const entry = path.join(tmp, `${label}-entry.ts`);
  fs.writeFileSync(entry, source);
  const out = path.join(os.tmpdir(), `cap283-${label}.js`);
  execSync(
    `npx esbuild "${entry}" --bundle --format=iife --global-name=PagzlyCapture --outfile="${out}" --log-level=error`,
    { cwd: ROOT, stdio: "inherit" },
  );
  return fs.readFileSync(out, "utf8");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const variants = [
    { label: "before", code: bundle("before", execSync("git show HEAD:lib/capture-detail-png.ts", { cwd: ROOT }).toString()) },
    { label: "after", code: bundle("after", fs.readFileSync(path.join(ROOT, "lib", "capture-detail-png.ts"), "utf8")) },
  ];
  const session = JSON.parse(fs.readFileSync(SESSION_279, "utf8"));
  const g = session.generated ?? session;
  const full = {
    sections: g.sections,
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: g.imageUrls ?? session.imageUrls,
    conceptIcons: g.conceptIcons,
  };
  const cases = [
    { key: "long-279", payload: full },
    { key: "short-279-first6", payload: { ...full, sections: full.sections.slice(0, 6) } },
  ];

  const lines: string[] = [];
  const note = (m: string) => {
    lines.push(m);
    console.log(m);
  };
  const browser = await chromium.launch();
  for (const c of cases) {
    for (const v of variants) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      page.on("console", (m) => {
        if (m.text().startsWith("[capture]")) note(`  ${v.label}/${c.key} ${m.text()}`);
      });
      await page.addInitScript({ content: "window.__name = (f) => f;" });
      await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.evaluate((p) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(p)), c.payload);
      await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
      await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
      await page.addStyleTag({ content: `[data-pagzly-preview]{max-width:${COL_PX}px !important}` });
      await page.waitForTimeout(2000);
      await page.addScriptTag({ content: v.code });
      const r = await page.evaluate(
        async ({ targetW, isAfter }) => {
          type Cap = {
            prepareCaptureRoot: (el: HTMLElement) => Promise<() => void>;
            captureDetailToPngBlob?: (el: HTMLElement, w: number) => Promise<Blob>;
            captureDetailToPngBlobs?: (el: HTMLElement, w: number, max?: number) => Promise<Blob[]>;
          };
          const cap = (window as unknown as { PagzlyCapture: Cap }).PagzlyCapture;
          const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
          const t0 = performance.now();
          const restore = await cap.prepareCaptureRoot(root);
          const blobs = isAfter
            ? await cap.captureDetailToPngBlobs!(root, targetW)
            : [await cap.captureDetailToPngBlob!(root, targetW)];
          const splitBlobs = isAfter ? await cap.captureDetailToPngBlobs!(root, targetW, 4200) : [];
          restore();
          const sec = +((performance.now() - t0) / 1000).toFixed(1);
          const toInfo = async (b: Blob) => {
            const bmp = await createImageBitmap(b);
            const buf = new Uint8Array(await b.arrayBuffer());
            let bin = "";
            for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
            return { w: bmp.width, h: bmp.height, kb: Math.round(b.size / 1024), b64: btoa(bin) };
          };
          return {
            cssW: root.offsetWidth,
            cssH: root.scrollHeight,
            sec,
            parts: await Promise.all(blobs.map(toInfo)),
            split: await Promise.all(splitBlobs.map(async (b) => {
              const bmp = await createImageBitmap(b);
              return { w: bmp.width, h: bmp.height };
            })),
          };
        },
        { targetW: TARGET_W, isAfter: v.label === "after" },
      );
      r.parts.forEach((p, i) => {
        fs.writeFileSync(path.join(OUT, `${c.key}-${v.label}-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(p.b64, "base64"));
      });
      note(
        `[${v.label} / ${c.key}] css=${r.cssW}x${r.cssH} sec=${r.sec} ` +
          `parts=${r.parts.map((p) => `${p.w}x${p.h}(${p.kb}KB)`).join(", ")}` +
          (r.split.length ? ` | 분할ZIP=${r.split.length}장 ${r.split.map((p) => `${p.w}x${p.h}`).join(", ")}` : ""),
      );
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
