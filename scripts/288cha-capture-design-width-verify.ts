/**
 * 288차 — PNG 캡처 디자인 폭 고정 전후 비교. 무료(생성 호출 없음).
 * HEAD와 작업본 lib/capture-detail-png.ts 를 각각 번들해, 279차 저장 결과를 미리보기 칼럼 폭 여러 개로 렌더하고
 * 860 PNG 기준 실효 글자 크기(본문·섹션 타이틀·히어로)와 출력 크기를 잰다.
 *   npm run dev (별도) → npx tsx scripts/288cha-capture-design-width-verify.ts
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.join(__dirname, "..");
const BASE = process.env.LOCAL_BASE ?? "http://localhost:3000";
const OUT = path.join(ROOT, "review", "288cha-capture");
const SESSION_279 = path.join(ROOT, "review", "279cha-live", "session.json");
const TARGET_W = 860;
const COLUMNS = [358, 501, 730, 890];

function bundle(label: string, source: string): string {
  const entry = path.join(OUT, `_entry-${label}.ts`);
  fs.writeFileSync(entry, source);
  const outfile = path.join(os.tmpdir(), `cap288-${label}.js`);
  execSync(`npx esbuild "${entry}" --bundle --format=iife --global-name=PagzlyCapture --outfile="${outfile}" --log-level=error`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  fs.rmSync(entry);
  return fs.readFileSync(outfile, "utf8");
}

type Measure = {
  cssW: number;
  cssH: number;
  scale: number;
  body: number;
  section: number;
  hero: number;
  parts: { w: number; h: number }[];
  png: string;
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const versions = {
    before: bundle("before", execSync("git show HEAD:lib/capture-detail-png.ts", { cwd: ROOT, encoding: "utf8" })),
    after: bundle("after", fs.readFileSync(path.join(ROOT, "lib", "capture-detail-png.ts"), "utf8")),
  };

  const session = JSON.parse(fs.readFileSync(SESSION_279, "utf8"));
  const g = session.generated ?? session;
  const payload = {
    sections: g.sections,
    category: session.category ?? "화장품/뷰티",
    brandName: session.brandName ?? "",
    productName: session.productName ?? "",
    imageUrls: g.imageUrls ?? session.imageUrls,
    conceptIcons: g.conceptIcons,
  };

  const browser = await chromium.launch();
  const rows: string[] = [];
  const results: Record<string, Record<number, Omit<Measure, "png">>> = {};
  for (const [label, code] of Object.entries(versions)) {
    results[label] = {};
    for (const col of COLUMNS) {
      const context = await browser.newContext({ viewport: { width: Math.max(390, col + 40), height: 900 } });
      const page = await context.newPage();
      await page.addInitScript({ content: "window.__name = (f) => f;" });
      await page.goto(`${BASE}/dev/detail-preview`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.evaluate((p) => sessionStorage.setItem("pagzly-dev-preview-session", JSON.stringify(p)), payload);
      await page.goto(`${BASE}/dev/detail-preview?capture=session`, { waitUntil: "load", timeout: 180_000 });
      await page.waitForSelector("[data-pagzly-preview] section", { timeout: 120_000 });
      await page.addStyleTag({ content: `[data-pagzly-preview]{max-width:${col}px}` });
      await page.waitForTimeout(1500);
      await page.addScriptTag({ content: code });

      const m: Measure = await page.evaluate(async (targetW) => {
        type Cap = {
          prepareCaptureRoot: (el: HTMLElement) => Promise<() => void>;
          captureDetailToPngBlobs: (el: HTMLElement, w: number) => Promise<Blob[]>;
        };
        const cap = (window as unknown as { PagzlyCapture: Cap }).PagzlyCapture;
        const root = document.querySelector<HTMLElement>("[data-pagzly-preview]")!;
        const restore = await cap.prepareCaptureRoot(root);
        const cssW = root.offsetWidth;
        const fs = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
        const median = (xs: number[]) => {
          const s = [...xs].sort((a, b) => a - b);
          return s.length ? s[Math.floor(s.length / 2)]! : 0;
        };
        const bodies = Array.from(root.querySelectorAll("p"))
          .filter((p) => (p.textContent ?? "").trim().length >= 40)
          .map(fs);
        const sections = Array.from(root.querySelectorAll(".pagzly-ink-headline.font-bold")).map(fs);
        const hero = fs(root.querySelector(".pagzly-display-headline.text-white"));
        const blobs = await cap.captureDetailToPngBlobs(root, targetW);
        const parts: { w: number; h: number }[] = [];
        for (const b of blobs) {
          const bmp = await createImageBitmap(b);
          parts.push({ w: bmp.width, h: bmp.height });
        }
        const first = blobs[0]!;
        const png = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
          r.readAsDataURL(first);
        });
        const out = {
          cssW,
          cssH: root.scrollHeight,
          scale: targetW / cssW,
          body: median(bodies),
          section: median(sections),
          hero,
          parts,
          png,
        };
        restore();
        return out;
      }, TARGET_W);
      await context.close();

      fs.writeFileSync(path.join(OUT, `${label}-col${col}.png`), Buffer.from(m.png, "base64"));
      const { png: _png, ...rest } = m;
      void _png;
      results[label][col] = rest;
      const eff = (v: number) => (v * m.scale).toFixed(1);
      rows.push(
        `${label.padEnd(6)} col=${String(col).padStart(3)} css=${m.cssW}x${m.cssH} scale=${m.scale.toFixed(3)} ` +
          `860 실효: 본문 ${eff(m.body)} · 섹션 ${eff(m.section)} · 히어로 ${eff(m.hero)} | ` +
          `${m.parts.length}장 ${m.parts.map((p) => `${p.w}x${p.h}`).join(",")}`,
      );
      console.log(rows[rows.length - 1]);
    }
  }
  await browser.close();

  const afterHeights = COLUMNS.map((c) => results.after[c]!.cssH);
  const deterministic = afterHeights.every((h) => h === afterHeights[0]);
  rows.push(`after 칼럼 폭과 무관하게 같은 레이아웃: ${deterministic ? "PASS" : "FAIL"} (cssH ${afterHeights.join(", ")})`);
  console.log(rows[rows.length - 1]);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, "results.txt"), rows.join("\n") + "\n");
  if (!deterministic) process.exit(1);
}

main().catch((e) => {
  console.error(String(e).replace(/https?:\/\/[a-z0-9-]+\.supabase\.co\S*/gi, "<supabase-url>"));
  process.exit(1);
});
