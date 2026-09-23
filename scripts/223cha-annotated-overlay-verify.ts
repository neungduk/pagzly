/**
 * 223차 — annotated overlay export 검증 (API 0).
 *   npx tsx scripts/223cha-annotated-overlay-verify.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import {
  buildAnnotatedImageOverlaySvg,
  clampPct,
  leaderEnd,
} from "../lib/annotated-image-overlay-svg";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "223cha-annotated-overlay");
const SESSION = path.join(ROOT, "review", "181cha-live", "electronics", "session.json");

/** 원본 AnnotatedImageOverlay.tsx와 동일 재구현 (교차 검증용) */
function clampPctRef(n: number): number {
  return Math.min(100, Math.max(0, n));
}
function leaderEndRef(
  xPct: number,
  yPct: number,
): { x: number; y: number; side: "left" | "right" } {
  const toLeft = xPct;
  const toRight = 100 - xPct;
  if (toLeft >= toRight) {
    return { x: clampPctRef(xPct - Math.min(18, toLeft * 0.35)), y: yPct, side: "left" };
  }
  return { x: clampPctRef(xPct + Math.min(18, toRight * 0.35)), y: yPct, side: "right" };
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function injectDummyAnnotations(sections: DetailSection[]): DetailSection[] {
  const dummy = [
    { label: "방수 지퍼", xPct: 20, yPct: 30 },
    { label: "인체공학 손잡이", xPct: 80, yPct: 60 },
  ];
  const preferIdx = sections.findIndex(
    (sec) => sec.type === "image_text" && sec.slot === "feature_detail",
  );
  const fallbackIdx = sections.findIndex((sec) => {
    if (sec.type !== "image_text") return false;
    if (
      sec.layout === "compact" ||
      sec.layout === "callout" ||
      sec.slot === "quick_points" ||
      sec.slot === "feature_callout"
    ) {
      return false;
    }
    return true;
  });
  const idx = preferIdx >= 0 ? preferIdx : fallbackIdx;
  if (idx < 0) return sections;
  return sections.map((sec, i) =>
    i === idx ? { ...sec, layout: "annotated" as const, annotations: dummy } : sec,
  );
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let failed = 0;

  console.log("=== buildAnnotatedImageOverlaySvg markup ===");
  {
    const html = buildAnnotatedImageOverlaySvg(
      [
        { label: "방수 지퍼", xPct: 20, yPct: 30 },
        { label: "인체공학 손잡이", xPct: 80, yPct: 60 },
      ],
      "#3B82F6",
    );
    const checks = [
      html.includes("<svg"),
      html.includes('viewBox="0 0 100 100"'),
      html.includes("방수 지퍼"),
      html.includes("인체공학 손잡이"),
      html.includes('cx="20"') && html.includes('cy="30"'),
      html.includes('cx="80"') && html.includes('cy="60"'),
      html.includes("#3B82F6"),
      html.includes('aria-label="제품 부품 주석"'),
    ];
    const ok = checks.every(Boolean);
    console.log(ok ? "OK" : "FAIL", "markup checks", checks);
    if (!ok) failed += 1;
  }

  console.log("=== leaderEnd/clampPct vs AnnotatedImageOverlay 원본 ===");
  {
    const samples = [
      [20, 30],
      [80, 60],
      [50, 50],
      [95, 40],
      [5, 10],
      [0, 0],
      [100, 100],
    ] as const;
    let geoOk = true;
    for (const [x, y] of samples) {
      const a = leaderEnd(x, y);
      const b = leaderEndRef(x, y);
      const same = a.x === b.x && a.y === b.y && a.side === b.side;
      if (!same) {
        console.log("FAIL", { x, y, a, b });
        geoOk = false;
      }
    }
    const edge95 = leaderEnd(95, 40);
    const edge95Ok = edge95.side === "left"; // toLeft=95 >= toRight=5
    const clampOk = clampPct(-1) === 0 && clampPct(101) === 100 && clampPct(42) === 42;
    console.log(geoOk && edge95Ok && clampOk ? "OK" : "FAIL", "geo", { edge95, clampOk });
    if (!geoOk || !edge95Ok || !clampOk) failed += 1;
  }

  console.log("=== escapeXml ===");
  {
    const html = buildAnnotatedImageOverlaySvg(
      [{ label: 'A&B <zip> "x"', xPct: 10, yPct: 10 }],
      "#000",
    );
    const ok =
      html.includes("A&amp;B") &&
      html.includes("&lt;zip&gt;") &&
      html.includes("&quot;x&quot;") &&
      !html.includes("A&B <zip>");
    console.log(ok ? "OK" : "FAIL", "escape");
    if (!ok) failed += 1;
  }

  console.log("=== empty annotations → empty string ===");
  {
    const ok = buildAnnotatedImageOverlaySvg([], "#fff") === "";
    console.log(ok ? "OK" : "FAIL");
    if (!ok) failed += 1;
  }

  console.log("=== export HTML inject + regression ===");
  const session = JSON.parse(fs.readFileSync(SESSION, "utf8")) as {
    productName?: string;
    brandName?: string;
    category: string;
    imageUrls?: string[];
    generated?: {
      sections?: DetailSection[];
      description?: string;
      features?: string[];
      howToUse?: string;
      caution?: string;
    };
    price?: number;
    ingredients?: string;
    keyFeatures?: string;
    certifications?: string;
  };
  const baseSections = session.generated?.sections ?? [];
  const theme = getCategoryTheme(session.category);

  const baseOpts = {
    productName: session.productName ?? "테스트",
    brandName: session.brandName,
    category: session.category,
    sections: baseSections,
    imageUrls: session.imageUrls ?? [],
    theme,
    description: session.generated?.description,
    features: session.generated?.features,
    howToUse: session.generated?.howToUse,
    caution: session.generated?.caution,
    ingredients: session.ingredients,
    keyFeatures: session.keyFeatures,
    price: session.price,
    certifications: session.certifications,
  };

  const htmlBefore = buildDetailPageHtml(baseOpts);
  const hashBefore = sha256(htmlBefore);

  // 비-annotated 섹션만 있는 원본에 overlay 마커가 없어야 함
  const noOverlayBefore =
    !htmlBefore.includes('aria-label="제품 부품 주석"') &&
    !htmlBefore.includes("방수 지퍼");
  console.log(noOverlayBefore ? "OK" : "FAIL", "baseline has no overlay");
  if (!noOverlayBefore) failed += 1;

  const injected = injectDummyAnnotations(baseSections);
  const hasAnnotated = injected.some(
    (s) =>
      s.type === "image_text" &&
      s.layout === "annotated" &&
      Array.isArray(s.annotations) &&
      s.annotations.length > 0,
  );
  console.log(hasAnnotated ? "OK" : "FAIL", "dummy annotations injected");
  if (!hasAnnotated) failed += 1;

  const htmlAfter = buildDetailPageHtml({ ...baseOpts, sections: injected });
  const overlayOk =
    htmlAfter.includes('aria-label="제품 부품 주석"') &&
    htmlAfter.includes("방수 지퍼") &&
    htmlAfter.includes("인체공학 손잡이") &&
    htmlAfter.includes('cx="20"') &&
    htmlAfter.includes('cx="80"');
  console.log(overlayOk ? "OK" : "FAIL", "export includes overlay");
  if (!overlayOk) failed += 1;

  // annotated 섹션에 POINT 배지가 이미지 컨테이너 근처에 과도하게 붙지 않는지
  // (다른 split 섹션의 POINT는 남을 수 있음)
  const annotatedSectionMatch = htmlAfter.match(
    /aria-label="제품 부품 주석"[\s\S]{0,800}?<\/div>\s*<\/div>/,
  );
  const pointNearOverlay = annotatedSectionMatch
    ? /POINT\s+\d+/.test(annotatedSectionMatch[0]!)
    : false;
  console.log(!pointNearOverlay ? "OK" : "FAIL", "no POINT badge beside overlay");
  if (pointNearOverlay) failed += 1;

  // annotated → flex:1 1 280px 쌍 (50/50)
  const flex50 = (htmlAfter.match(/flex:1 1 280px/g) || []).length >= 2;
  console.log(flex50 ? "OK" : "FAIL", "annotated 50/50 flex");
  if (!flex50) failed += 1;

  // 원본 세션 재export가 동일 (주입 없음) — 회귀
  const htmlBefore2 = buildDetailPageHtml(baseOpts);
  const hashStable = sha256(htmlBefore2) === hashBefore;
  console.log(hashStable ? "OK" : "FAIL", "baseline export stable", hashBefore.slice(0, 12));
  if (!hashStable) failed += 1;

  fs.writeFileSync(path.join(OUT, "electronics-annotated-export.html"), htmlAfter, "utf8");
  fs.writeFileSync(
    path.join(OUT, "electronics-baseline-export.html"),
    htmlBefore,
    "utf8",
  );

  console.log("=== screenshot export HTML ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
  const fileUrl = `file:///${path.join(OUT, "electronics-annotated-export.html").replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  const overlay = page.locator('[aria-label="제품 부품 주석"]').first();
  if ((await overlay.count()) > 0) {
    const host = overlay.locator("xpath=ancestor::div[contains(@style,'position:relative')][1]");
    const target = (await host.count()) > 0 ? host : overlay;
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await target.screenshot({
      path: path.join(OUT, "electronics-annotated-overlay.png"),
      animations: "disabled",
    });
    console.log("OK screenshot", path.join(OUT, "electronics-annotated-overlay.png"));
  } else {
    await page.screenshot({
      path: path.join(OUT, "electronics-annotated-full.png"),
      fullPage: true,
    });
    console.log("FAIL overlay not found in page");
    failed += 1;
  }
  await browser.close();

  console.log(failed === 0 ? "\nALL PASS" : `\nFAILED: ${failed}`);
  console.log("API generate: 0");
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
