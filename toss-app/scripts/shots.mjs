/**
 * 523 — 폰 화면 스크린샷 도구(검수·자기 점검용). 번들에는 들어가지 않는다.
 *
 * 쓰는 법 (toss-app 폴더에서):
 *   1) npm run build
 *   2) npx vite preview --port 4173      (다른 터미널에 켜 둔다)
 *   3) node scripts/shots.mjs ../review/523-screens/round-1
 *
 * playwright 는 저장소 루트 node_modules 의 것을 쓴다(toss-app 에 패키지를 추가하지 않는다).
 * 화면 상태는 주소의 ?demo=<이름> 으로 연다(개발·미리보기 전용 스위치, TASK_523 2장 참고).
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, "../../package.json"));
let chromium; try { if (process.env.PLAYWRIGHT_PATH) throw 0; ({ chromium } = require("playwright")); } catch { ({ chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright")); }

const BASE = process.env.SHOTS_BASE || "http://127.0.0.1:4173/";
const outDir = path.resolve(process.argv[2] || "../review/523-screens/round-x");
fs.mkdirSync(outDir, { recursive: true });

/** 폰 크기 3종: 작은 안드로이드 / 기준 / 큰 폰 */
const SIZES = [
  { name: "360", width: 360, height: 740 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
];

/** TASK_523 2장의 demo 상태 이름. 상태를 추가하면 여기에도 추가한다. */
const STATES = (process.env.SHOTS_STATES ||
  "start,picked,text,busy,ocr,result,result-open,result-clean,result-many,unreadable,error,limit,heic")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const browser = await chromium.launch();
const problems = [];
for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  for (const state of STATES) {
    await page.goto(`${BASE}?demo=${encodeURIComponent(state)}`);
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      demo: document.documentElement.getAttribute("data-demo") || "",
    }));
    if (m.sw > m.cw) problems.push(`${state}@${size.name}: 가로 스크롤 ${m.sw} > ${m.cw}`);
    if (m.demo !== state) problems.push(`${state}@${size.name}: demo 상태가 열리지 않음(data-demo="${m.demo}")`);
    // 첫 화면(스크롤 없이 보이는 부분)과 전체 페이지를 둘 다 남긴다
    await page.screenshot({ path: path.join(outDir, `${state}-${size.name}-fold.png`) });
    await page.screenshot({ path: path.join(outDir, `${state}-${size.name}-full.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(outDir, "problems.txt"), problems.join("\n") + (problems.length ? "\n" : ""));
console.log(`[shots] ${STATES.length} 상태 × ${SIZES.length} 크기 → ${outDir}`);
if (problems.length) {
  console.log("[shots] 문제:\n" + problems.join("\n"));
  process.exitCode = 1;
}
