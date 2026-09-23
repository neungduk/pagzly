/**
 * 253차 — 배치 이상 증거 수집 (조사만, API 0, 코드 수정 없음)
 *   npx tsx scripts/253cha-layout-check.ts
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import sharp from "sharp";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { assignDistinctSectionImages } from "../lib/assign-section-images";
import type { DetailSection } from "../lib/types/generate";
import {
  neutralizeStickyForScreenshot,
  screenshotFullPageSafe,
} from "./lib/neutralize-sticky";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "253cha-layout-check");
const SESSION = path.join(ROOT, "review", "247cha-recovered", "session.json");
const SHOWCASE = path.join(ROOT, "review", "247cha-recovered", "showcase.html");
const PRODUCT_ID = "6c3c7d7e-dbbc-4ff8-a7cf-a768d04930b4";
const RESULT_URL = `http://localhost:3000/create/result?id=${PRODUCT_ID}`;

type Finding = {
  section: string;
  status: "정상" | "이상함" | "주의" | "정보";
  detail: string;
};

function loadSession() {
  const raw = JSON.parse(fs.readFileSync(SESSION, "utf8")) as {
    category?: string;
    productName?: string;
    brandName?: string;
    imageUrls?: string[];
    generated?: {
      productName?: string;
      brandName?: string;
      sections?: DetailSection[];
      imageUrls?: string[];
      category?: string;
    };
  };
  const sections = raw.generated?.sections ?? [];
  const imageUrls = raw.imageUrls ?? raw.generated?.imageUrls ?? [];
  const category = raw.category ?? raw.generated?.category ?? "화장품/뷰티";
  const productName =
    raw.generated?.productName ?? raw.productName ?? "unknown";
  const brandName = raw.generated?.brandName ?? raw.brandName;
  return { sections, imageUrls, category, productName, brandName };
}

function analyzeIndexes(sections: DetailSection[]): Finding[] {
  const findings: Finding[] = [];
  const banner = sections.find((s) => s.type === "illustration_banner");
  const imageTexts = sections.filter((s) => s.type === "image_text");
  const hero = sections.find((s) => s.type === "hero");

  if (!banner || banner.type !== "illustration_banner") {
    findings.push({
      section: "illustration_banner",
      status: "이상함",
      detail: "섹션 없음",
    });
    return findings;
  }

  const hasIllUrl = Boolean(banner.illustrationUrl?.trim());
  const hasIdx = typeof banner.imageIndex === "number";
  findings.push({
    section: "illustration_banner",
    status: "정보",
    detail: `illustrationUrl=${hasIllUrl ? "있음(레거시)" : "없음"} imageIndex=${hasIdx ? banner.imageIndex : "없음"} heading="${banner.heading ?? ""}"`,
  });

  if (hasIllUrl) {
    findings.push({
      section: "illustration_banner 하위호환",
      status: "정보",
      detail: "세션에 illustrationUrl 존재 — 렌더러는 URL 우선 표시해야 함",
    });
  }

  const itIndexes = imageTexts
    .filter((s) => s.type === "image_text" && s.layout !== "text_only")
    .map((s) =>
      s.type === "image_text"
        ? { slot: s.slot, idx: s.imageIndex, heading: s.heading }
        : null,
    )
    .filter(Boolean) as { slot: string; idx: number; heading?: string }[];

  const heroIdx = hero && hero.type === "hero" ? hero.imageIndex : undefined;
  findings.push({
    section: "hero",
    status: "정보",
    detail: `imageIndex=${heroIdx}`,
  });

  const freq = new Map<number, string[]>();
  if (typeof heroIdx === "number") {
    freq.set(heroIdx, [`hero`]);
  }
  for (const it of itIndexes) {
    const list = freq.get(it.idx) ?? [];
    list.push(`image_text:${it.slot}`);
    freq.set(it.idx, list);
  }
  if (hasIdx && typeof banner.imageIndex === "number") {
    const list = freq.get(banner.imageIndex) ?? [];
    list.push("illustration_banner");
    freq.set(banner.imageIndex, list);
  }

  for (const [idx, users] of freq) {
    if (users.length > 1) {
      findings.push({
        section: `중복 index ${idx}`,
        status: users.includes("illustration_banner") ? "이상함" : "주의",
        detail: users.join(" + "),
      });
    }
  }

  for (const it of itIndexes) {
    findings.push({
      section: `image_text:${it.slot}`,
      status: "정보",
      detail: `idx=${it.idx} heading="${(it.heading ?? "").slice(0, 40)}"`,
    });
  }

  return findings;
}

async function shotSafe(page: import("playwright").Page, outPath: string) {
  await screenshotFullPageSafe(page, { path: outPath });
}

async function cropSection(
  page: import("playwright").Page,
  selector: string,
  outPath: string,
) {
  const loc = page.locator(selector).first();
  if ((await loc.count()) === 0) return false;
  await loc.screenshot({ path: outPath });
  return true;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const findings: Finding[] = [];
  const { sections, imageUrls, category, productName, brandName } = loadSession();

  console.log(`session: ${productName} / ${category} / sections=${sections.length} imgs=${imageUrls.length}`);
  findings.push(...analyzeIndexes(sections));

  // --- A) 저장된 세션 그대로 현재 export로 재렌더 (재생성 없음) ---
  const theme = getCategoryTheme(category);
  const htmlCurrent = buildDetailPageHtml({
    productName,
    brandName,
    category,
    sections,
    imageUrls,
    theme,
  });
  const htmlPath = path.join(OUT, "legacy-session-current-export.html");
  fs.writeFileSync(htmlPath, htmlCurrent, "utf8");

  const banner = sections.find((s) => s.type === "illustration_banner");
  if (banner && banner.type === "illustration_banner") {
    const expectedSrc = banner.illustrationUrl || imageUrls[banner.imageIndex ?? 0] || "";
    const usesLegacy =
      Boolean(banner.illustrationUrl) && htmlCurrent.includes(banner.illustrationUrl!);
    const usesPhoto =
      !banner.illustrationUrl &&
      typeof banner.imageIndex === "number" &&
      htmlCurrent.includes(imageUrls[banner.imageIndex] ?? "___none___");
    findings.push({
      section: "export 렌더 소스",
      status: usesLegacy || usesPhoto ? "정상" : "이상함",
      detail: usesLegacy
        ? `레거시 illustrationUrl 우선 렌더 OK (${expectedSrc.slice(-48)})`
        : usesPhoto
          ? `imageIndex 사진 렌더 (${banner.imageIndex})`
          : `예상 src가 HTML에 없음 expectedTail=${expectedSrc.slice(-48)}`,
    });
    const hasScrim =
      htmlCurrent.includes("rgba(27,27,24,.9)") ||
      htmlCurrent.includes("rgba(27,27,24,0.9)");
    const hasClamp = htmlCurrent.includes("-webkit-line-clamp:2");
    findings.push({
      section: "249차 스크림/clamp 유지",
      status: hasScrim && hasClamp ? "정상" : "이상함",
      detail: `scrim=${hasScrim} clamp2=${hasClamp}`,
    });
  }

  // --- B) 만약 지금 assign을 다시 돌리면? (회귀 후보 — 실제 로드 경로에는 없음) ---
  const reassigned = assignDistinctSectionImages(
    structuredClone(sections),
    imageUrls.length,
    { category },
  );
  const beforeBanner = sections.find((s) => s.type === "illustration_banner");
  const afterBanner = reassigned.find((s) => s.type === "illustration_banner");
  const idxChanged =
    beforeBanner?.type === "illustration_banner" &&
    afterBanner?.type === "illustration_banner" &&
    beforeBanner.imageIndex !== afterBanner.imageIndex;
  const urlKept =
    beforeBanner?.type === "illustration_banner" &&
    afterBanner?.type === "illustration_banner" &&
    beforeBanner.illustrationUrl === afterBanner.illustrationUrl;

  findings.push({
    section: "가상 재배정(assignDistinctSectionImages 재실행)",
    status: "정보",
    detail: `result 페이지 로드 시에는 호출 안 함. 시뮬레이션: illustrationUrl 유지=${urlKept}, imageIndex ${beforeBanner && "imageIndex" in beforeBanner ? beforeBanner.imageIndex : "n/a"}→${afterBanner && "imageIndex" in afterBanner ? afterBanner.imageIndex : "n/a"} changed=${idxChanged}`,
  });

  // image_text index drift under reassign
  let itDrift = 0;
  for (let i = 0; i < sections.length; i++) {
    const a = sections[i];
    const b = reassigned[i];
    if (a?.type === "image_text" && b?.type === "image_text" && a.imageIndex !== b.imageIndex) {
      itDrift += 1;
    }
  }
  findings.push({
    section: "가상 재배정 image_text drift",
    status: itDrift > 0 ? "주의" : "정상",
    detail: `image_text index 변경 ${itDrift}건 (로드 경로에 assign 없으면 실서비스 무영향)`,
  });

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));

  // --- C) export HTML 스크린샷 ---
  {
    const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.evaluate(async () => {
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      for (let y = 0; y < max; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(500);

    const full = path.join(OUT, "01-legacy-export-full.png");
    await shotSafe(page, full);
    console.log("wrote", full);

    await cropSection(page, "section.pagzly-illustration-banner", path.join(OUT, "02-banner.png"));
    // first few image_text-ish sections — export uses various classes; grab by text panels
    const imgSecs = page.locator("section").filter({ has: page.locator("img") });
    const n = Math.min(6, await imgSecs.count());
    for (let i = 0; i < n; i++) {
      await imgSecs.nth(i).screenshot({ path: path.join(OUT, `03-section-with-img-${i}.png`) }).catch(() => undefined);
    }

    // clamp/overflow heuristic on banner text (no nested fn — tsx/playwright __name quirk)
    const bannerMetrics = await page.evaluate(`(() => {
      const root = document.querySelector("section.pagzly-illustration-banner");
      if (!root) return null;
      const h = root.querySelector("h2");
      const p = root.querySelector("p");
      const img = root.querySelector("img");
      const pack = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          text: (el.textContent || "").slice(0, 80),
          lineClamp: cs.webkitLineClamp,
          overflow: cs.overflow,
          scrollH: el.scrollHeight,
          clientH: el.clientHeight,
        };
      };
      return {
        imgSrc: (img && (img.currentSrc || img.src)) || null,
        heading: pack(h),
        body: pack(p),
      };
    })()`);
    console.log("bannerMetrics", JSON.stringify(bannerMetrics, null, 2));
    const bm = bannerMetrics as {
      imgSrc?: string | null;
      heading?: { lineClamp?: string; scrollH?: number; clientH?: number } | null;
      body?: { lineClamp?: string; scrollH?: number; clientH?: number } | null;
    } | null;
    if (bm?.imgSrc) {
      const isIll =
        banner &&
        banner.type === "illustration_banner" &&
        banner.illustrationUrl &&
        bm.imgSrc.includes(banner.illustrationUrl.split("/").slice(-1)[0] ?? "___");
      findings.push({
        section: "렌더된 배너 이미지",
        status: isIll || !banner?.illustrationUrl ? "정상" : "주의",
        detail: `srcTail=${bm.imgSrc.slice(-60)} legacyMatch=${Boolean(isIll)}`,
      });
    }
    if (bm?.body) {
      const overflow = (bm.body.scrollH ?? 0) > (bm.body.clientH ?? 0) + 2;
      findings.push({
        section: "배너 body clamp",
        status: "정보",
        detail: `webkitLineClamp=${bm.body.lineClamp} scroll>client=${overflow}`,
      });
    }

    await page.close();
  }

  // --- D) 원본 showcase.html (247차 당시 export)도 비교 샷 ---
  if (fs.existsSync(SHOWCASE)) {
    const page = await browser.newPage({ viewport: { width: 750, height: 1000 } });
    await page.goto(`file:///${SHOWCASE.replace(/\\/g, "/")}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.evaluate(async () => {
      const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      for (let y = 0; y < max; y += 800) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(400);
    await shotSafe(page, path.join(OUT, "04-original-showcase-full.png"));
    await cropSection(
      page,
      "section.pagzly-illustration-banner",
      path.join(OUT, "05-original-showcase-banner.png"),
    );
    await page.close();
  }

  // --- E) 로컬 result 페이지 (재생성 없이 열기) ---
  let liveOpened = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const res = await page.goto(RESULT_URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const status = res?.status() ?? 0;
    console.log("live result status", status, RESULT_URL);
    if (status >= 200 && status < 400) {
      await page.waitForTimeout(2500);
      // preview pane if present
      const preview = page.locator("[data-detail-preview], .pagzly-preview, iframe").first();
      await page.screenshot({ path: path.join(OUT, "06-live-result-viewport.png"), fullPage: false });
      // try export-like preview scroll inside page
      const hasPreviewText = await page.locator("text=라이트 워터").count();
      findings.push({
        section: "라이브 result 열기",
        status: hasPreviewText > 0 ? "정상" : "주의",
        detail: `HTTP ${status} previewTextHits=${hasPreviewText} (재생성 버튼 미사용)`,
      });
      liveOpened = true;

      // Prefer capturing the embedded preview HTML if available via export button area
      // Fallback: full page safe on main document
      await neutralizeStickyForScreenshot(page);
      await page.screenshot({
        path: path.join(OUT, "07-live-result-after-neutralize.png"),
        fullPage: true,
      }).catch(async () => {
        await screenshotFullPageSafe(page, {
          path: path.join(OUT, "07-live-result-after-neutralize.png"),
        });
      });
    } else {
      findings.push({
        section: "라이브 result 열기",
        status: "주의",
        detail: `HTTP ${status} — 서버 미기동 또는 세션 만료. export HTML 검증으로 대체`,
      });
    }
    await page.close();
  } catch (e) {
    findings.push({
      section: "라이브 result 열기",
      status: "주의",
      detail: `접속 실패: ${e instanceof Error ? e.message : String(e)} — export HTML 검증으로 대체`,
    });
  }

  await browser.close();

  // write findings json + md snippet
  fs.writeFileSync(path.join(OUT, "findings.json"), JSON.stringify(findings, null, 2), "utf8");
  console.log("\n=== FINDINGS ===");
  for (const f of findings) {
    console.log(`[${f.status}] ${f.section}: ${f.detail}`);
  }
  console.log("\nliveOpened", liveOpened);
  console.log("OUT", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
