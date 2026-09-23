/**
 * 249차 — illustration_banner 텍스트 스크림/clamp 검증 (API 0, 기존 일러스트 재사용).
 *   npx tsx scripts/249cha-illustration-banner-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "249cha-illustration-banner");

const ILLUSTRATION_URL =
  "https://qnstsrplqzoqlndojuyw.supabase.co/storage/v1/object/public/images/32b487fb-5a68-44f0-9422-6035f759d0c8/icons/1790140648028-illustration-11.png";

const LONG_BODY =
  "세안 직후 속당김이 느껴지는 아침, 워터리 젤이 가볍게 스며드는 장면을 담았습니다. 끈적임 없이 맑게 정돈된 피부결을 오래 유지하고 싶은 하루를 위한 한 방울입니다.";

function beforeHtml(deep: string): string {
  // 수정 전 export illustration_banner 마크업 (스크림·clamp 없음)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet"/>
<style>body{margin:0;background:#111}</style></head><body>
<section class="pagzly-illustration-banner" style="position:relative;aspect-ratio:16/9;overflow:hidden;background:${deep}">
  <img src="${ILLUSTRATION_URL}" alt="맑게 스며드는 하루" loading="eager" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,${deep}99,transparent 35%,transparent 55%,${deep}cc)"></div>
  <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:32px 24px;text-align:center;color:#FAF8F3">
    <h2 class="pagzly-display-headline" style="font-family:'Noto Serif KR','Noto Sans KR',system-ui,sans-serif;font-weight:700;letter-spacing:-0.02em;font-size:1.75rem;margin:0">맑게 스며드는 하루</h2>
    <p style="margin:12px 0 0;font-size:15px;opacity:.9;max-width:480px;line-height:1.75">${LONG_BODY}</p>
  </div>
</section>
</body></html>`;
}

async function shot(page: import("playwright").Page, htmlPath: string, pngPath: string) {
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll("img")];
    for (const img of imgs) {
      const el = img as HTMLImageElement;
      el.loading = "eager";
      if (!el.complete || el.naturalWidth === 0) {
        const src = el.getAttribute("src");
        if (src) el.src = src;
      }
    }
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            const el = img as HTMLImageElement;
            if (el.complete && el.naturalWidth > 0) resolve();
            else {
              el.onload = () => resolve();
              el.onerror = () => resolve();
              setTimeout(() => resolve(), 15000);
            }
          }),
      ),
    );
  });
  await page.waitForTimeout(300);
  const section = page.locator("section.pagzly-illustration-banner").first();
  await section.screenshot({ path: pngPath });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const category = "화장품/뷰티";
  const theme = getCategoryTheme(category);
  const deep = theme.deepAccent;

  const beforePath = path.join(OUT, "before.html");
  fs.writeFileSync(beforePath, beforeHtml(deep), "utf8");

  const section: DetailSection = {
    type: "illustration_banner",
    slot: "mood_banner",
    heading: "맑게 스며드는 하루",
    body: LONG_BODY,
    illustrationUrl: ILLUSTRATION_URL,
  };

  const afterFull = buildDetailPageHtml({
    productName: "라이트 워터 히알루론 세럼",
    brandName: "라이트 워터",
    category,
    sections: [section],
    imageUrls: [ILLUSTRATION_URL],
    theme,
  });
  const afterPath = path.join(OUT, "after.html");
  fs.writeFileSync(afterPath, afterFull, "utf8");

  const hasScrim =
    afterFull.includes("rgba(27,27,24,.9)") || afterFull.includes("rgba(27,27,24,0.9)");
  const hasClamp = afterFull.includes("-webkit-line-clamp:2");
  console.log("after has text-local panel scrim:", hasScrim);
  console.log("after has line-clamp:2:", hasClamp);
  if (!hasScrim || !hasClamp) {
    console.error("FAIL: export illustration_banner missing scrim/clamp");
    process.exit(1);
  }

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 750, height: 900 } });

  const beforePng = path.join(OUT, "before.png");
  const afterPng = path.join(OUT, "after.png");
  await shot(page, beforePath, beforePng);
  await shot(page, afterPath, afterPng);
  await browser.close();

  console.log("wrote", beforePng);
  console.log("wrote", afterPng);
  console.log("249cha-illustration-banner-verify DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
