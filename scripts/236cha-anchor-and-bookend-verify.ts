/**
 * 236차 — FOOD TOC 제품정보 앵커 + export 북엔드 클립 검증 (API 0).
 *   npx tsx scripts/236cha-anchor-and-bookend-verify.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { buildSectionAnchors } from "../lib/section-anchor-nav";
import {
  CATEGORY_SLOT_TEMPLATES,
  resolveTemplateCategory,
  type TemplateCategory,
} from "../lib/section-templates";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "236cha-food-anchor-and-bookend");

const FORM_CATEGORIES = [
  "화장품/뷰티",
  "의류/패션",
  "식품/건강기능식품",
  "전자제품",
  "생활용품",
  "반려동물",
] as const;

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function stubSectionsFromTemplate(templateKey: TemplateCategory): DetailSection[] {
  return CATEGORY_SLOT_TEMPLATES[templateKey].map((def) => {
    if (def.type === "spec_table") {
      return {
        type: "spec_table",
        slot: def.slot,
        heading: def.slot,
        rows: [{ label: "항목", value: "값" }],
      } as DetailSection;
    }
    if (def.type === "hero") {
      return {
        type: "hero",
        slot: "hero",
        headline: "히어로",
        subheadline: "서브",
        imageIndex: 0,
      } as DetailSection;
    }
    if (def.type === "cta_price") {
      return {
        type: "cta_price",
        slot: "cta_price",
        price: 10000,
        badges: [],
      } as DetailSection;
    }
    if (def.type === "gallery") {
      return {
        type: "gallery",
        slot: def.slot,
        heading: "갤러리",
        imageIndexes: [0],
      } as DetailSection;
    }
    if (def.type === "faq") {
      return {
        type: "faq",
        slot: def.slot,
        heading: "FAQ",
        items: [{ question: "Q", answer: "A" }],
      } as DetailSection;
    }
    if (def.type === "caution") {
      return {
        type: "caution",
        slot: def.slot,
        heading: "주의",
        body: "본문",
      } as DetailSection;
    }
    if (def.type === "usage_steps" || def.type === "step_card") {
      return {
        type: def.type,
        slot: def.slot,
        heading: "사용",
        steps: ["1", "2"],
      } as DetailSection;
    }
    if (def.type === "review_highlight") {
      return {
        type: "review_highlight",
        slot: def.slot,
        heading: "후기",
        praises: ["좋아요"],
      } as DetailSection;
    }
    // generic image_text / others
    return {
      type: def.type,
      slot: def.slot,
      heading: def.slot,
      body: "본문",
      imageIndex: 0,
      imagePosition: "left",
    } as DetailSection;
  });
}

function minimalPage(opts: {
  withQuickFacts: boolean;
  certifications?: string;
}): string {
  const sections: DetailSection[] = [
    {
      type: "hero",
      slot: "hero",
      headline: "히어로",
      subheadline: "서브",
      imageIndex: 0,
    } as DetailSection,
    {
      type: "checklist",
      slot: "checklist",
      heading: "포인트",
      items: ["A", "B", "C"],
    } as DetailSection,
    {
      type: "cta_price",
      slot: "cta_price",
      price: 29000,
      badges: ["무료배송"],
      targetCustomer: "테스트",
    } as DetailSection,
  ];
  if (opts.withQuickFacts) {
    sections.splice(1, 0, {
      type: "spec_table",
      slot: "spec_table",
      heading: "스펙",
      rows: [
        { label: "용량", value: "500ml" },
        { label: "중량", value: "200g" },
        { label: "소재", value: "스테인리스" },
      ],
    } as DetailSection);
  }
  return buildDetailPageHtml({
    productName: "북엔드테스트",
    category: "전자제품",
    sections,
    imageUrls: [],
    theme: getCategoryTheme("전자제품"),
    certifications: opts.certifications,
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const f of ["lib/section-anchor-nav.ts", "lib/export-detail-html.ts"]) {
    execSync(
      `npx esbuild "${f}" --bundle=false --format=esm --outfile=NUL`,
      { cwd: ROOT, stdio: "pipe", shell: true },
    );
    console.log("OK esbuild", f);
  }

  console.log("=== anchors by category ===");
  for (const cat of FORM_CATEGORIES) {
    const templateKey = resolveTemplateCategory(cat);
    const stubs = stubSectionsFromTemplate(templateKey);
    const anchors = buildSectionAnchors(stubs);
    const labels = anchors.map((a) => a.label);
    const hasInfo = anchors.some((a) => a.id === "pagzly-info");
    console.log(cat, "→", labels.join(", "));
    if (cat === "식품/건강기능식품") {
      assert(hasInfo, "FOOD has 제품정보 (pagzly-info)");
      const info = anchors.find((a) => a.id === "pagzly-info")!;
      const sec = stubs[info.sectionIndex]!;
      assert(
        sec.type === "spec_table" && sec.slot === "nutrition_table",
        "FOOD info anchor points at nutrition_table",
      );
    } else if (cat === "의류/패션") {
      // fashion uses size_table → "사이즈", may or may not also have spec_table
      assert(
        anchors.some((a) => a.id === "pagzly-size" || a.id === "pagzly-info"),
        "fashion has size or info",
      );
    } else {
      assert(hasInfo, `${cat} still has 제품정보`);
    }
  }

  console.log("=== export bookend clip-path ===");
  const withFacts = minimalPage({
    withQuickFacts: true,
    certifications: "KC, 전자파적합",
  });
  fs.writeFileSync(path.join(OUT, "bookend-with-facts.html"), withFacts, "utf8");
  const heroClip = (
    withFacts.match(/clip-path:polygon\(0 0, 100% 0, 100% 100%, 0 calc\(100% - 44px\)\)/g) || []
  ).length;
  const ctaClip = (
    withFacts.match(/clip-path:polygon\(0 44px, 100% 0, 100% 100%, 0 100%\)/g) || []
  ).length;
  console.log("hero-follow clips", heroClip, "cta clips", ctaClip);
  assert(heroClip === 1, "exactly 1 hero-follow bookend clip");
  assert(ctaClip === 1, "exactly 1 CTA bookend clip");

  const noFacts = minimalPage({ withQuickFacts: false });
  fs.writeFileSync(path.join(OUT, "bookend-no-facts.html"), noFacts, "utf8");
  const heroClip2 = (
    noFacts.match(/clip-path:polygon\(0 0, 100% 0, 100% 100%, 0 calc\(100% - 44px\)\)/g) || []
  ).length;
  const ctaClip2 = (
    noFacts.match(/clip-path:polygon\(0 44px, 100% 0, 100% 100%, 0 100%\)/g) || []
  ).length;
  assert(ctaClip2 === 1, "CTA clip present even without quickFacts");
  // hero-follow may be 0 if no trust chips and no quick facts
  console.log("no-facts hero-follow", heroClip2);

  // food session anchors + export
  const food = JSON.parse(
    fs.readFileSync(path.join(ROOT, "review", "181cha-live", "food", "session.json"), "utf8"),
  ) as {
    productName?: string;
    category: string;
    imageUrls?: string[];
    certifications?: string;
    generated: { sections: DetailSection[] };
  };
  const foodAnchors = buildSectionAnchors(food.generated.sections);
  assert(
    foodAnchors.some((a) => a.id === "pagzly-info"),
    "real food session has pagzly-info",
  );
  const foodHtml = buildDetailPageHtml({
    productName: food.productName ?? "food",
    category: food.category,
    sections: food.generated.sections,
    imageUrls: food.imageUrls ?? [],
    theme: getCategoryTheme(food.category),
    certifications: food.certifications,
  });
  fs.writeFileSync(path.join(OUT, "food-export.html"), foodHtml, "utf8");
  assert(foodHtml.includes('href="#pagzly-info"') || foodHtml.includes("제품정보"), "food nav shows 제품정보");
  assert(
    (foodHtml.match(/clip-path:polygon\(0 44px, 100% 0, 100% 100%, 0 100%\)/g) || []).length >= 1,
    "food export has CTA clip",
  );

  // soft regression: breathers still present (231)
  assert(
    (foodHtml.match(/aria-hidden="true"><span style="height:1px;width:48px/g) || []).length >= 1 ||
      foodHtml.includes("border-radius:9999px"),
    "breathers still present (soft)",
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 750, height: 1100 } });
  await page.goto(`file:///${path.join(OUT, "bookend-with-facts.html").replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, "hero-follow-bookend.png"),
    clip: { x: 0, y: 0, width: 750, height: 700 },
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, "cta-bookend.png"),
    clip: { x: 0, y: 400, width: 750, height: 500 },
  });
  await browser.close();
  console.log("saved bookend screenshots");

  console.log("API generate: 0");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
