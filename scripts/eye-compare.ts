/**
 * 444차 1 — 눈 검수 결함 수정 전/후 캡처. 같은 스크립트를 "수정 전 코드 트리"와 "현재 트리"에서 각각 돌려 같은 영역을 찍고(--out=<폴더>),
 * `--compose=<전 폴더>,<후 폴더>`로 전/후를 가로로 붙여 한 장씩 만든다(review/444-verify/before-after/).
 *   (전 트리, 예: git worktree) npx tsx scripts/eye-compare.ts --out=/tmp/before
 *   (현재 트리)                  npx tsx scripts/eye-compare.ts --out=/tmp/after
 *   (현재 트리)                  npx tsx scripts/eye-compare.ts --compose=/tmp/before,/tmp/after --out=review/444-verify/before-after
 * 사진·폰트는 두 트리가 같은 public/ 파일을 쓰게 맞춘 뒤 돌려야 코드 차이만 보인다.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const OUT = arg("out", "review/444-verify/before-after");
const COMPOSE = arg("compose", "");
const W = 390;

/** 수정한 결함마다 찍을 영역: selector(그 요소) 또는 first(첫 화면) 또는 tail(구매 띠와 그 앞 220px) */
const SHOTS: Array<{ name: string; id: string; target: { selector: string } | "first" | "tail" }> = [
  { name: "D1-info강조카드-serum", id: "fx-skincare-serum", target: { selector: "section:has(.pagzly-hl-grid)" } },
  { name: "D1-info강조카드-makeup", id: "fx-makeup-tint", target: { selector: "section:has(.pagzly-hl-grid)" } },
  { name: "D2-배너스크림-richtech", id: "fx-tier-rich-tech-6p", target: { selector: "section:has(.pagzly-display-headline):has([style*='rgba(27,27,24,.9)'])" } },
  { name: "D4-구매띠그림자-sparse", id: "fx-tier-sparse-beauty-1p", target: "tail" },
  { name: "D5-고스트-living", id: "fx-tier-normal-living-3p", target: "first" },
  { name: "D5-고스트-keyboard", id: "fx-tech-keyboard", target: "first" },
  { name: "D3-플레이스홀더-makeup", id: "fx-makeup-tint", target: "first" },
];

async function capture() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  for (const s of SHOTS) {
    const file = corpus().find(([id]) => id === s.id)?.[1];
    if (!file) continue;
    const { page, close } = await openHtml(browser, exportHtmlOf(file), W);
    await page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
    const dest = path.join(OUT, `${s.name}.png`);
    if (s.target === "first") {
      await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: W, height: 844 }, fullPage: true });
    } else if (s.target === "tail") {
      const y = (await page.evaluate("document.querySelector('.pagzly-cta')?.getBoundingClientRect().top + window.scrollY")) as number;
      await page.screenshot({ path: dest, clip: { x: 0, y: Math.max(0, y - 260), width: W, height: 560 }, fullPage: true });
    } else {
      const el = page.locator(s.target.selector).first();
      if (await el.count()) await el.screenshot({ path: dest });
      else console.log(`요소 없음: ${s.name}`);
    }
    await close();
  }
  await browser.close();
}

async function compose() {
  const [before, after] = COMPOSE.split(",") as [string, string];
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SHOTS) {
    const a = path.join(before, `${s.name}.png`);
    const b = path.join(after, `${s.name}.png`);
    if (!fs.existsSync(a) || !fs.existsSync(b)) continue;
    const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
    const h = Math.max(ma.height ?? 0, mb.height ?? 0);
    await sharp({ create: { width: W * 2 + 12, height: h, channels: 3, background: "#7a7a7a" } })
      .composite([{ input: a, left: 0, top: 0 }, { input: b, left: W + 12, top: 0 }])
      .png()
      .toFile(path.join(OUT, `${s.name}.png`));
  }
}

void (COMPOSE ? compose() : capture());
