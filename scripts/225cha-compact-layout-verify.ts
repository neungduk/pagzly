/**
 * 225차 — export layout:"compact" 분기 검증 (API 0).
 *   npx tsx scripts/225cha-compact-layout-verify.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { resolveCompactImageShape } from "../lib/compact-image-shape";
import { getCategoryTheme } from "../lib/category-theme";
import { RADIUS } from "../lib/design-tokens";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection, ImageTextSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "225cha-compact-layout");

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function compactSec(
  slot: string,
  heading: string,
  imagePosition: "left" | "right" = "left",
  imageIndex = 0,
): ImageTextSection {
  return {
    type: "image_text",
    slot,
    layout: "compact",
    heading,
    body: `${heading} 본문`,
    imageIndex,
    imagePosition,
  };
}

function mainSyncChecks(): { failed: number; compactCount: number } {
  let failed = 0;

  console.log("=== resolveCompactImageShape alternate ===");
  {
    const base = compactSec("quick_points", "A");
    const shapes = [0, 1, 2, 3].map((i) => resolveCompactImageShape(base, i, 4));
    const ok =
      shapes[0] === "square" &&
      shapes[1] === "circle" &&
      shapes[2] === "square" &&
      shapes[3] === "circle";
    console.log(ok ? "OK" : "FAIL", shapes);
    if (!ok) failed += 1;

    const explicit = resolveCompactImageShape(
      { ...base, imageShape: "circle" },
      0,
      4,
    );
    console.log(explicit === "circle" ? "OK" : "FAIL", "explicit imageShape");
    if (explicit !== "circle") failed += 1;

    const single = resolveCompactImageShape(base, 0, 1);
    console.log(single === "square" ? "OK" : "FAIL", "single → square");
    if (single !== "square") failed += 1;
  }

  console.log("=== synthetic compact export HTML ===");
  {
    const theme = getCategoryTheme("전자제품");
    const sections: DetailSection[] = [
      {
        type: "hero",
        slot: "hero",
        headline: "히어로",
        subheadline: "서브",
        imageIndex: 0,
      } as DetailSection,
      compactSec("quick_points", "포인트 하나", "left", 0),
      compactSec("quick_points", "포인트 둘", "right", 1),
      compactSec("quick_points", "포인트 셋", "left", 2),
      {
        type: "image_text",
        slot: "feature_detail",
        layout: "full",
        heading: "일반 스플릿",
        body: "스플릿 본문",
        imageIndex: 0,
        imagePosition: "left",
      },
    ];
    const html = buildDetailPageHtml({
      productName: "테스트",
      category: "전자제품",
      sections,
      imageUrls: [
        "https://placehold.co/400x400/png",
        "https://placehold.co/401x401/png",
        "https://placehold.co/402x402/png",
      ],
      theme,
    });

    const compactBlocks = html.match(/width:120px;height:120px/g) ?? [];
    const has120 = compactBlocks.length === 3;
    console.log(has120 ? "OK" : "FAIL", "3× 120px thumbs", compactBlocks.length);

    const squareR = `border-radius:${RADIUS.md}px`;
    const circleR = `border-radius:${RADIUS.pill}px`;
    const squareCount = (html.match(new RegExp(squareR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
      .length;
    // circle also used elsewhere — check within compact sections by pairing with 120px
    const thumbRadii = [...html.matchAll(/width:120px;height:120px;object-fit:cover;border-radius:(\d+)px/g)].map(
      (m) => Number(m[1]),
    );
    const radiiOk =
      thumbRadii.length === 3 &&
      thumbRadii[0] === RADIUS.md &&
      thumbRadii[1] === RADIUS.pill &&
      thumbRadii[2] === RADIUS.md;
    console.log(radiiOk ? "OK" : "FAIL", "square/circle/square", thumbRadii, {
      md: RADIUS.md,
      pill: RADIUS.pill,
    });

    const hasLeft = html.includes("flex-direction:row") && html.includes("text-align:left");
    const hasRight =
      html.includes("flex-direction:row-reverse") && html.includes("text-align:right");
    console.log(hasLeft && hasRight ? "OK" : "FAIL", "left/right alternate");

    const noFullBleedCompact =
      !html.includes("포인트 하나") ||
      !html.match(/포인트 하나[\s\S]{0,200}aspect-ratio:1/);
    // compact heading should not be in a full-width aspect-ratio:1 image block as primary
    const compactNotFallback = !html.includes(
      `포인트 하나</h2>`,
    ); // dh2 uses h2; compact uses h3
    const usesH3 = html.includes(">포인트 하나</h3>") && html.includes(">포인트 둘</h3>");
    console.log(usesH3 ? "OK" : "FAIL", "compact uses h3 not display h2");

    // split still present for feature_detail
    const splitOk =
      html.includes("POINT") &&
      (html.includes("일반 스플릿") || html.includes("pagzly-display-headline"));
    console.log(splitOk ? "OK" : "FAIL", "non-compact split still renders");

    if (!has120 || !radiiOk || !hasLeft || !hasRight || !usesH3 || !splitOk) failed += 1;
    void noFullBleedCompact;
    void compactNotFallback;
    void squareCount;

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "synthetic-compact.html"), html, "utf8");
  }

  console.log("=== regression: electronics session without compact mutation ===");
  {
    const sessionPath = path.join(ROOT, "review", "181cha-live", "electronics", "session.json");
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
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
    const sections = session.generated?.sections ?? [];
    const compactCount = sections.filter(
      (s) => s.type === "image_text" && s.layout === "compact",
    ).length;
    const theme = getCategoryTheme(session.category);
    const html = buildDetailPageHtml({
      productName: session.productName ?? "테스트",
      brandName: session.brandName,
      category: session.category,
      sections,
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
    });

    const thumbMatches =
      html.match(/width:120px;height:120px;object-fit:cover;border-radius:\d+px/g) ?? [];
    console.log(
      compactCount === 0 || thumbMatches.length === compactCount ? "OK" : "FAIL",
      `electronics compactCount=${compactCount} thumbs=${thumbMatches.length}`,
    );
    if (compactCount > 0 && thumbMatches.length !== compactCount) failed += 1;

    // annotated / editorial markers still present if they were
    const hasEditorial = sections.some(
      (s) => s.type === "image_text" && (s.slot === "usage_scenario" || s.slot === "usage_scene"),
    );
    if (hasEditorial) {
      const edOk = html.includes("pagzly-editorial") || html.includes("aspect-ratio:4/5");
      console.log(edOk ? "OK" : "FAIL", "editorial bleed still present");
      if (!edOk) failed += 1;
    }

    fs.writeFileSync(path.join(OUT, "electronics-export.html"), html, "utf8");
    fs.writeFileSync(
      path.join(OUT, "electronics-meta.json"),
      JSON.stringify({ compactCount, thumbMatches: thumbMatches.length, hash: sha256(html) }, null, 2),
    );

    return { failed, compactCount };
  }
}

async function maybeScreenshot(htmlPath: string, outPng: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(500);
  const thumb = page.locator('img[style*="width:120px"]').first();
  if ((await thumb.count()) > 0) {
    const host = thumb.locator("xpath=ancestor::section[1]");
    await host.scrollIntoViewIfNeeded();
    // capture a few compact sections — parent of first + siblings via evaluate height
    const box = await host.boundingBox();
    if (box) {
      await page.screenshot({
        path: outPng,
        clip: {
          x: Math.max(0, box.x - 4),
          y: Math.max(0, box.y - 4),
          width: Math.min(512, box.width + 8),
          height: Math.min(480, Math.max(box.height * 3 + 24, 200)),
        },
      });
    } else {
      await host.screenshot({ path: outPng });
    }
  } else {
    await page.screenshot({ path: outPng, fullPage: false });
  }
  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const result = mainSyncChecks();
  let failed = result.failed;

  // Prefer a real session that has compact sections
  const cats = ["electronics", "fashion", "beauty", "food", "living", "pet"] as const;
  let shotHtml: string | null = path.join(OUT, "synthetic-compact.html");
  for (const key of cats) {
    const p = path.join(ROOT, "review", "181cha-live", key, "session.json");
    if (!fs.existsSync(p)) continue;
    const session = JSON.parse(fs.readFileSync(p, "utf8")) as {
      productName?: string;
      brandName?: string;
      category: string;
      imageUrls?: string[];
      generated?: { sections?: DetailSection[] };
      ingredients?: string;
      keyFeatures?: string;
      price?: number;
      certifications?: string;
    };
    const sections = session.generated?.sections ?? [];
    const n = sections.filter((s) => s.type === "image_text" && s.layout === "compact").length;
    if (n >= 2) {
      const html = buildDetailPageHtml({
        productName: session.productName ?? key,
        brandName: session.brandName,
        category: session.category,
        sections,
        imageUrls: session.imageUrls ?? [],
        theme: getCategoryTheme(session.category),
        ingredients: session.ingredients,
        keyFeatures: session.keyFeatures,
        price: session.price,
        certifications: session.certifications,
      });
      const outHtml = path.join(OUT, `${key}-compact-export.html`);
      fs.writeFileSync(outHtml, html, "utf8");
      shotHtml = outHtml;
      console.log("OK fixture with compact", key, n);
      break;
    }
  }

  console.log("=== screenshot ===");
  try {
    await maybeScreenshot(shotHtml!, path.join(OUT, "compact-thumbs.png"));
    console.log("OK screenshot", path.join(OUT, "compact-thumbs.png"));
  } catch (e) {
    console.log("FAIL screenshot", e);
    failed += 1;
  }

  // source wiring
  console.log("=== source ===");
  {
    const src = fs.readFileSync(path.join(ROOT, "lib", "export-detail-html.ts"), "utf8");
    const ok =
      src.includes('from "@/lib/compact-image-shape"') &&
      src.includes('section.layout === "compact"') &&
      src.includes("compactImageTextIndex") &&
      src.includes("totalCompactImageTextCount");
    console.log(ok ? "OK" : "FAIL", "export wiring");
    if (!ok) failed += 1;
  }

  console.log(failed === 0 ? "\nALL PASS" : `\nFAILED: ${failed}`);
  console.log("API generate: 0");
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
