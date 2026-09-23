/**
 * 251차 — illustration_banner 실사진 배정 + export 검증 (API 0).
 *   npx tsx scripts/251cha-illustration-banner-photo-verify.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "251cha-illustration-banner-photo");
const SESSION = path.join(ROOT, "review", "247cha-recovered", "session.json");

const LEGACY_ILLUSTRATION =
  "https://qnstsrplqzoqlndojuyw.supabase.co/storage/v1/object/public/images/32b487fb-5a68-44f0-9422-6035f759d0c8/icons/1790140648028-illustration-11.png";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${msg}`);
  }
}

function loadImageUrls(): string[] {
  const raw = JSON.parse(fs.readFileSync(SESSION, "utf8")) as {
    imageUrls?: string[];
    generated?: { imageUrls?: string[] };
  };
  const urls = raw.imageUrls ?? raw.generated?.imageUrls ?? [];
  if (urls.length < 4) {
    throw new Error(`need >=4 imageUrls from session, got ${urls.length}`);
  }
  return urls;
}

async function shot(page: import("playwright").Page, htmlPath: string, pngPath: string) {
  await page.goto(`file://${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(400);
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
  await page.locator("section.pagzly-illustration-banner").first().screenshot({ path: pngPath });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const imageUrls = loadImageUrls();
  console.log(`loaded ${imageUrls.length} imageUrls from 247 session`);

  const dummy: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "라이트 워터 히알루론 세럼",
      subheadline: "속당김을 가볍게",
      imageIndex: 0,
    },
    {
      type: "image_text",
      slot: "texture_feel",
      heading: "워터리 젤",
      body: "흐르는 듯 가볍게 스며들어 끈적임이 남지 않습니다.",
      imageIndex: 1,
      imagePosition: "left",
    },
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "히알루론산 3중",
      body: "수분을 세 겹으로 채우는 조합입니다.",
      imageIndex: 2,
      imagePosition: "right",
    },
    {
      type: "illustration_banner",
      slot: "illustration_banner",
      heading: "맑게 스며드는 하루",
      body: "세안 직후 속당김이 느껴지는 아침, 워터리 젤이 가볍게 스며드는 장면을 담았습니다.",
    },
  ];

  const assigned = assignDistinctSectionImages(dummy, imageUrls.length, {
    category: "화장품/뷰티",
    imageTags: imageUrls.map((_, i) =>
      i % 3 === 0 ? ["lifestyle", "morning", "serum"] : ["product", "bottle", "detail"],
    ),
    imageReasons: imageUrls.map((_, i) =>
      i % 3 === 0 ? "morning lifestyle serum use" : "product bottle detail",
    ),
  });

  const hero = assigned.find((s) => s.type === "hero");
  const its = assigned.filter((s) => s.type === "image_text");
  const banner = assigned.find((s) => s.type === "illustration_banner");

  assert(!!banner && banner.type === "illustration_banner", "banner section present");
  assert(
    typeof banner?.imageIndex === "number",
    `banner.imageIndex assigned (got ${banner && "imageIndex" in banner ? banner.imageIndex : "n/a"})`,
  );

  console.log("assigned indexes:", {
    hero: hero && hero.type === "hero" ? hero.imageIndex : null,
    image_texts: its.map((s) => (s.type === "image_text" ? s.imageIndex : null)),
    illustration_banner:
      banner && banner.type === "illustration_banner" ? banner.imageIndex : null,
  });

  const bannerIdx =
    banner && banner.type === "illustration_banner" ? banner.imageIndex! : -1;
  const otherIndexes = [
    hero && hero.type === "hero" ? hero.imageIndex : -1,
    ...its
      .filter((s) => s.type === "image_text" && s.layout !== "text_only")
      .map((s) => (s.type === "image_text" ? s.imageIndex : -1)),
  ].filter((i) => i >= 0);
  assert(
    typeof bannerIdx === "number" && bannerIdx >= 0,
    `banner imageIndex is valid (${bannerIdx})`,
  );
  assert(
    !otherIndexes.includes(bannerIdx),
    `banner imageIndex ${bannerIdx} does not collide with hero/image_text (${[...new Set(otherIndexes)].join(",")})`,
  );

  // --- photo export shot ---
  const category = "화장품/뷰티";
  const theme = getCategoryTheme(category);
  const photoHtml = buildDetailPageHtml({
    productName: "라이트 워터 히알루론 세럼",
    brandName: "라이트 워터",
    category,
    sections: [banner!],
    imageUrls,
    theme,
  });
  const photoHtmlPath = path.join(OUT, "after.html");
  fs.writeFileSync(photoHtmlPath, photoHtml, "utf8");

  const photoSrc = imageUrls[bannerIdx] ?? "";
  assert(
    photoHtml.includes(photoSrc),
    "export HTML embeds assigned product photo URL",
  );
  assert(
    !photoHtml.includes("blur-2xl") && !photoHtml.includes("opacity-55"),
    "export has no blur/opacity mock fallback",
  );
  assert(
    photoHtml.includes("rgba(27,27,24,.9)") || photoHtml.includes("rgba(27,27,24,0.9)"),
    "249cha panel scrim retained",
  );

  // --- legacy illustrationUrl ---
  const legacySection: DetailSection = {
    type: "illustration_banner",
    slot: "illustration_banner",
    heading: "맑게 스며드는 하루",
    body: "레거시 일러스트 URL이 있으면 그대로 표시되어야 합니다.",
    illustrationUrl: LEGACY_ILLUSTRATION,
    imageIndex: 3,
  };
  const legacyHtml = buildDetailPageHtml({
    productName: "레거시 배너",
    brandName: "라이트 워터",
    category,
    sections: [legacySection],
    imageUrls,
    theme,
  });
  assert(
    legacyHtml.includes(LEGACY_ILLUSTRATION),
    "legacy illustrationUrl still rendered",
  );
  assert(
    !legacyHtml.includes(imageUrls[3]!),
    "legacy path does not fall through to imageIndex photo when illustrationUrl set",
  );

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 750, height: 900 } });
  const afterPng = path.join(OUT, "after.png");
  await shot(page, photoHtmlPath, afterPng);
  await browser.close();
  console.log("wrote", afterPng);

  // copy 249 after as before reference note
  const before249 = path.join(ROOT, "review", "249cha-illustration-banner", "after.png");
  if (fs.existsSync(before249)) {
    fs.copyFileSync(before249, path.join(OUT, "before-249cha-illustration.png"));
    console.log("copied 249cha after → before-249cha-illustration.png");
  }

  if (process.exitCode) {
    console.error("\n251cha-illustration-banner-photo-verify FAILED");
    process.exit(1);
  }
  console.log("\n251cha-illustration-banner-photo-verify PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
