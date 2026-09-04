/**
 * 117차 — 카테고리별 히어로 타이포 스크린샷 (로컬 HTML, 비용 $0)
 * 실행: npx tsx scripts/117cha-typography-screenshots.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  DETAIL_GOOGLE_FONTS_URL,
  displayHeadlineInlineCss,
  resolveHeadlineFontKind,
} from "../lib/detail-typography";
import { getCategoryTheme } from "../lib/category-theme";

const CATEGORIES = [
  "화장품/뷰티",
  "의류/패션",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;

const SLUG: Record<(typeof CATEGORIES)[number], string> = {
  "화장품/뷰티": "cosmetics",
  "의류/패션": "fashion",
  "식품/건강기능식품": "food",
  전자제품: "electronics",
  생활용품: "living",
  반려동물: "pet",
};

const HEADLINES: Record<(typeof CATEGORIES)[number], string> = {
  "화장품/뷰티": "화장 위에도 산뜻하게, 카멜리아 미스트",
  "의류/패션": "한겨울에도 가벼운 울 블렌드",
  "식품/건강기능식품": "아침 테이블에 올리는 고소한 한 스푼",
  전자제품: "하루 종일 가는 노이즈캔슬링",
  생활용품: "매일 쓰는 자리, 조용히 정리되다",
  반려동물: "산책 후 발바닥을 가볍게",
};

function pageHtml(category: (typeof CATEGORIES)[number]): string {
  const theme = getCategoryTheme(category);
  const kind = resolveHeadlineFontKind(category);
  const headlineCss = displayHeadlineInlineCss(category);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${DETAIL_GOOGLE_FONTS_URL}"/>
<style>
  body{margin:0;font-family:"Noto Sans KR",sans-serif;background:#FAF8F3;color:#1B1B18}
  .hero{position:relative;width:360px;height:520px;background:linear-gradient(160deg,${theme.deepAccent},${theme.accent});display:flex;flex-direction:column;justify-content:flex-end;padding:28px 20px 36px;box-sizing:border-box}
  .cat{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:rgba(250,248,243,.8);margin:0 0 12px;font-family:"Noto Sans KR",sans-serif}
  h1.pagzly-display-headline{color:#FAF8F3;font-size:1.85rem;line-height:1.15;margin:0;word-break:keep-all;overflow-wrap:break-word;${headlineCss}}
  .sub{margin:12px 0 0;color:rgba(250,248,243,.88);font-size:14px;font-family:"Noto Sans KR",sans-serif;font-weight:400}
  .meta{position:absolute;top:12px;left:12px;right:12px;font-size:10px;color:rgba(250,248,243,.65);font-family:"Noto Sans KR",sans-serif}
</style>
</head>
<body>
  <div class="hero" data-headline-face="${kind}">
    <div class="meta">${category} · face=${kind}</div>
    <p class="cat">${category}</p>
    <h1 class="pagzly-display-headline">${HEADLINES[category]}</h1>
    <p class="sub">본문은 Noto Sans KR 유지 — 헤드라인만 디스플레이 페이스</p>
  </div>
</body>
</html>`;
}

async function main() {
  const review = path.join(process.cwd(), "review");
  fs.mkdirSync(review, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });

  for (const category of CATEGORIES) {
    const slug = SLUG[category];
    const htmlPath = path.join(review, `117cha-typography-${slug}.html`);
    fs.writeFileSync(htmlPath, pageHtml(category), "utf8");
    await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    // 폰트 로드 여유
    await page.waitForTimeout(800);
    const out = path.join(review, `117cha-typography-${slug}.png`);
    await page.locator(".hero").screenshot({ path: out });
    console.log(`[117] wrote ${out} kind=${resolveHeadlineFontKind(category)}`);
  }

  // 폴백 시뮬레이션: 외부 폰트 링크 제거 → Sans 폴백 스택만
  const fallbackHtml = pageHtml("화장품/뷰티").replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*"\/>/,
    "<!-- fonts blocked -->",
  );
  const fbPath = path.join(review, "117cha-typography-fallback.html");
  fs.writeFileSync(fbPath, fallbackHtml, "utf8");
  await page.goto(`file://${fbPath.replace(/\\/g, "/")}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);
  const ff = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  console.log(`[117] fallback fontFamily=${ff}`);
  assertFallback(ff);
  await page.locator(".hero").screenshot({
    path: path.join(review, "117cha-typography-fallback.png"),
  });

  await browser.close();
  console.log("117cha-typography-screenshots PASS");
}

function assertFallback(fontFamily: string) {
  if (!/Noto Sans KR|Malgun|sans-serif/i.test(fontFamily)) {
    throw new Error(`expected sans fallback, got ${fontFamily}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
