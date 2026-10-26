/**
 * 455차 1 — 라이브(React/Tailwind) 사진 실패 눈 검수 + DOM 측정. broken-photo-eye의 라이브 판: 개발 서버의 /dev/detail-preview?capture=session 에 저장 세션·합성 픽스처를 주입하고
 * 모든 사진 요청을 브라우저에서 실패시킨다(외부 호출 없음). 서버는 이 스크립트가 띄우지 않는다(더미 환경):
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3200 npx next dev -p 3200
 *   npx tsx scripts/broken-photo-live.ts --server=http://localhost:3200 [--out=review/455-verify/live-after] [--widths=390,750] [--only=id,id] [--no-sheets] [--json=경로]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { findSessions } from "./pc-sessions-find";
import { presetOf } from "./live-lib";
import { SESSION_KEY } from "./live-lib";
import { MEASURE, type BrokenReport } from "./broken-photo-eye";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const SERVER = arg("server", "http://localhost:3200");
const OUT = arg("out", "review/455-verify/live-after");
const WIDTHS = arg("widths", "390,750").split(",").map(Number);
const ONLY = arg("only", "").split(",").filter(Boolean);
const JSON_OUT = arg("json", "");
const SHEETS = !process.argv.includes("--no-sheets");
const H = 844;

async function main() {
  const { corpus } = await import("./design-corpus");
  const synth = corpus().filter(([id]) => id.startsWith("fx-"));
  const all: Array<[string, string]> = [...findSessions(), ...synth].filter(([id]) => !ONLY.length || ONLY.includes(id));
  const browser = await chromium.launch();
  const reports: BrokenReport[] = [];
  for (const [id, file] of all) {
    for (const W of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      await ctx.addInitScript(`try{window.sessionStorage.setItem(${JSON.stringify(SESSION_KEY)}, ${JSON.stringify(JSON.stringify(presetOf(file)))})}catch(e){}; window.__name = (f) => f;`);
      const page = await ctx.newPage();
      // 사진 요청은 전부 실패, 같은 서버의 그 밖 요청은 통과, 외부는 차단
      await page.route("**/*", (r) => (r.request().resourceType() === "image" ? r.abort() : new URL(r.request().url()).origin === new URL(SERVER).origin ? r.continue() : r.abort()));
      await page.goto(`${SERVER}/dev/detail-preview?capture=session`, { waitUntil: "load" });
      await page.locator("[data-pz-typefloor]").first().waitFor({ state: "attached", timeout: 60000 });
      await page.evaluate("document.fonts.ready.then(() => 1)");
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}[data-pagzly-preview]{max-width:none!important;border:0!important;box-shadow:none!important}[data-scroll-reveal]{transform:none!important;opacity:1!important;translate:none!important;scale:none!important}" });
      const total0 = (await page.evaluate("document.documentElement.scrollHeight")) as number;
      for (let y = 0; y < total0; y += 500) { await page.evaluate(`window.scrollTo(0, ${y})`); await page.waitForTimeout(90); }
      await page.evaluate("window.scrollTo(0, 0)");
      await page.evaluate("Promise.all(Array.from(document.images).map((i) => { i.loading = 'eager'; return i.complete ? 1 : new Promise((r) => { i.addEventListener('load', () => r(1)); i.addEventListener('error', () => r(1)); }); }))");
      await page.waitForTimeout(1200);
      const m = (await page.evaluate(MEASURE.replace("document.querySelectorAll('body *')", "document.querySelectorAll('[data-pz-typefloor] *')"))) as { visibleAlt: string[]; holes: string[]; overflow: number };
      // 가로 넘침은 렌더러 루트만 본다(개발 미리보기 페이지의 툴바는 제외 — fuzz-live와 같은 기준)
      m.overflow = (await page.evaluate("(() => { const r = document.querySelector('[data-pz-typefloor]'); return Math.max(0, r.scrollWidth - r.clientWidth, Math.round(r.getBoundingClientRect().right) - document.documentElement.clientWidth); })()")) as number;
      reports.push({ id, W, visibleAlt: m.visibleAlt, holes: m.holes, overflow: m.overflow });
      if (SHEETS) {
        const total = (await page.evaluate("document.documentElement.scrollHeight")) as number;
        const n = Math.ceil(total / H);
        const slices: Buffer[] = [];
        for (let i = 0; i < n; i++) slices.push(await page.screenshot({ clip: { x: 0, y: i * H, width: W, height: Math.min(H, total - i * H) }, fullPage: true }));
        const dir = path.join(OUT, id, `w${W}`);
        fs.mkdirSync(dir, { recursive: true });
        const per = W <= 500 ? 3 : 2;
        for (let s = 0; s * per < slices.length; s++) {
          const group = slices.slice(s * per, s * per + per);
          await sharp({ create: { width: group.length * W + (group.length - 1) * 8, height: H, channels: 3, background: "#7a7a7a" } }).composite(group.map((input, k) => ({ input, left: k * (W + 8), top: 0 }))).png().toFile(path.join(dir, `sheet-${String(s + 1).padStart(2, "0")}.png`));
        }
      }
      await ctx.close();
      console.log(`${id} w${W}: 대체글자 ${m.visibleAlt.length} · 빈틀 ${m.holes.length} · 가로넘침 ${m.overflow}`);
    }
  }
  await browser.close();
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(reports, null, 1)); }
  console.log(`\n합계: 대체글자 ${reports.reduce((a, r) => a + r.visibleAlt.length, 0)} · 빈틀 ${reports.reduce((a, r) => a + r.holes.length, 0)} · 가로넘침 ${reports.reduce((a, r) => a + (r.overflow ? 1 : 0), 0)}`);
}
void main();
