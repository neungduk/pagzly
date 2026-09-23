/**
 * 252차 — Playwright fullPage + position:sticky(cta_price) 미페인트 재현/수정 검증 (API 0).
 *
 * 정정: cta_price는 제품에 이미 정상 존재함. DeepSeek 생성 누락이 아님.
 * 버그는 QA용 Playwright fullPage 스크린샷 도구에만 있음(고객 html-to-image PNG는 무관).
 *
 *   npx tsx scripts/252cha-sticky-screenshot-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";
import sharp from "sharp";
import {
  neutralizeStickyForScreenshot,
  screenshotFullPageSafe,
} from "./lib/neutralize-sticky";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "252cha-sticky-screenshot");
const SHOWCASE = path.join(ROOT, "review", "247cha-recovered", "showcase.html");

const CTA_BG = { r: 0x74, g: 0x3e, b: 0x24 };

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function colorDist(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

async function ctaBgRatio(pngPath: string, stripH = 500): Promise<number> {
  const meta = await sharp(pngPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w < 10 || h < 40) throw new Error(`bad png size ${w}x${h}`);
  const useH = Math.min(stripH, h);
  const top = Math.max(0, h - useH);
  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top, width: w, height: useH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hit = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    total += 1;
    if (
      colorDist({ r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }, CTA_BG) <= 36
    ) {
      hit += 1;
    }
  }
  return hit / Math.max(1, total);
}

async function cropTail(src: string, dest: string, stripH = 900) {
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 750;
  const h = meta.height ?? stripH;
  const top = Math.max(0, h - stripH);
  await sharp(src)
    .extract({ left: 0, top, width: w, height: Math.min(stripH, h) })
    .png()
    .toFile(dest);
}

async function preparePage(page: Page) {
  await page.goto(`file:///${SHOWCASE.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.evaluate(async () => {
    const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const step = Math.max(700, window.innerHeight);
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, max);
  });
  await page.waitForTimeout(600);

  return page.evaluate(() => {
    const el = document.querySelector(".pagzly-cta") as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
      top: r.top,
      height: r.height,
      position: cs.position,
      visibility: cs.visibility,
      opacity: cs.opacity,
      bg: cs.backgroundColor,
    };
  });
}

async function captureCustomerCtaPng(page: Page, outPath: string) {
  const htmlToImageEntry = path.join(
    ROOT,
    "node_modules",
    "html-to-image",
    "dist",
    "html-to-image.js",
  );
  if (!fs.existsSync(htmlToImageEntry)) {
    throw new Error(`missing html-to-image at ${htmlToImageEntry}`);
  }
  await page.addScriptTag({ path: htmlToImageEntry });
  const dataUrl = await page.evaluate(async () => {
    const el = document.querySelector(".pagzly-cta") as HTMLElement | null;
    if (!el) throw new Error("no .pagzly-cta");
    const w = window as unknown as Record<string, unknown>;
    const mod = (w.htmlToImage ?? w["html-to-image"]) as
      | { toPng: (n: HTMLElement, o?: object) => Promise<string> }
      | undefined;
    if (!mod?.toPng) throw new Error("html-to-image not on window");
    return mod.toPng(el, { cacheBust: true, pixelRatio: 1 });
  });
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(SHOWCASE)) throw new Error(`missing ${SHOWCASE}`);

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));

  // --- BEFORE: sticky 유지 + native fullPage (버그 재현) ---
  {
    const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    const cta = await preparePage(page);
    console.log("DOM cta (before shot):", cta);
    assert(!!cta, "cta_price DOM exists in showcase.html (생성 누락 아님)");
    assert(
      Boolean(cta?.text.includes("34,800") || cta?.text.includes("34800")),
      `cta DOM has ₩34,800 (got: ${cta?.text?.slice(0, 80)})`,
    );
    assert(
      Boolean(cta?.text.includes("20~30") || cta?.text.includes("여성")),
      "cta DOM has targetCustomer",
    );
    assert(
      (cta?.text.match(/30ml|무향|비건|더마/g) ?? []).length >= 2,
      "cta DOM has badges",
    );
    assert(cta?.position === "sticky", `cta computed position sticky (got ${cta?.position})`);

    const beforeFull = path.join(OUT, "before-broken-full.png");
    const beforeTail = path.join(OUT, "before-broken-tail.png");
    await page.screenshot({ path: beforeFull, fullPage: true });
    await cropTail(beforeFull, beforeTail, 900);
    const beforeCta = await ctaBgRatio(beforeTail, 500);
    console.log(`before tail #743E24 ratio=${beforeCta.toFixed(4)}`);
    assert(
      beforeCta < 0.08,
      `BEFORE fullPage: CTA bg absent in paint (ratio ${beforeCta.toFixed(4)} < 0.08)`,
    );
    await page.close();
  }

  // --- AFTER: neutralize + scroll-stitch safe full page ---
  {
    const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    const cta = await preparePage(page);
    assert(!!cta, "cta still in DOM for after shot");

    const afterFull = path.join(OUT, "after-fixed-full.png");
    const afterTail = path.join(OUT, "after-fixed-tail.png");
    // sticky 무력화 + fullPage 리사이즈 회피(스티치) — QA 권장 패턴
    await screenshotFullPageSafe(page, { path: afterFull });
    await cropTail(afterFull, afterTail, 900);
    const afterCta = await ctaBgRatio(afterTail, 500);
    console.log(`after tail #743E24 ratio=${afterCta.toFixed(4)}`);
    assert(
      afterCta > 0.12,
      `AFTER safe capture: CTA bg painted (ratio ${afterCta.toFixed(4)} > 0.12)`,
    );

    // neutralize만 + native fullPage는 이 Chromium에서 여전히 실패할 수 있음 → 참고 로그
    const page2 = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    await preparePage(page2);
    await neutralizeStickyForScreenshot(page2);
    const naive = path.join(OUT, "after-naive-fullpage-still-broken.png");
    await page2.screenshot({ path: naive, fullPage: true });
    const naiveRatio = await ctaBgRatio(naive, 500);
    console.log(
      `note: neutralize+fullPage:true still ratio=${naiveRatio.toFixed(4)} (why stitch is needed)`,
    );
    await page2.close();

    await page.close();
  }

  // --- 고객 PNG 경로: html-to-image (sticky 유지, Playwright fullPage 아님) ---
  {
    const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    const cta = await preparePage(page);
    assert(cta?.position === "sticky", "customer path keeps sticky in DOM");
    const customerTail = path.join(OUT, "customer-png-export-unaffected-tail.png");
    await captureCustomerCtaPng(page, customerTail);
    const custCta = await ctaBgRatio(
      customerTail,
      Math.min(500, (await sharp(customerTail).metadata()).height ?? 500),
    );
    console.log(`customer html-to-image CTA #743E24 ratio=${custCta.toFixed(4)}`);
    assert(
      custCta > 0.15,
      `customer html-to-image paints CTA (ratio ${custCta.toFixed(4)} > 0.15)`,
    );
    await page.close();
  }

  await browser.close();

  if (process.exitCode) {
    console.error("\n252cha-sticky-screenshot-verify FAILED");
    process.exit(1);
  }
  console.log("\n252cha-sticky-screenshot-verify PASSED");
  console.log("artifacts:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
