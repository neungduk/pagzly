/**
 * 133차 — A(전자 KC enrich) / C(리뷰 건수) 결정론 + B 카피 샘플
 *   npx tsx scripts/133cha-density-evidence-smoke.ts
 *
 * B만 DeepSeek/Claude 기존 카피 파이프라인 호출 (신규 모델·이미지 API 없음).
 * A/C는 로컬만 — 유료 0.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { freezeDetailScrollReveal } from "./capture-utils";
import { enrichSectionsWithProductMetadata } from "../lib/enrich-product-sections";
import {
  buildReviewHighlightSection,
  insertReviewHighlightSection,
} from "../lib/section-inserts";
import { countReviewLines } from "../lib/review-insights";
import { buildStyleRubricBlock } from "../lib/copy-orchestrator/deepseek-copy";
import { runDetailCopyPipeline } from "../lib/copy-orchestrator/pipeline";
import {
  detectCopyHallucinations,
  detectGenericCliches,
} from "../lib/copy-orchestrator/validate-copy";
import type { CopyProductInput } from "../lib/copy-orchestrator/types";
import type { DetailSection } from "../lib/types/generate";
import { getCategoryTheme } from "../lib/category-theme";
import { buildDetailPageHtml } from "../lib/export-detail-html";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function assertA() {
  const base: DetailSection[] = [
    {
      type: "spec_table",
      slot: "spec_table",
      heading: "상품 정보",
      rows: [{ label: "브랜드", value: "AURA" }],
    },
  ];
  const withCert = enrichSectionsWithProductMetadata(base, {
    category: "전자제품",
    brandName: "AURA",
    certifications: "KC인증 12345",
  });
  const rowsWith =
    withCert[0] && withCert[0].type === "spec_table" ? withCert[0].rows : [];
  const kc = rowsWith.find((r) => r.label === "KC 인증");
  if (!kc || !kc.value.includes("KC인증 12345")) {
    throw new Error(`A: expected KC row with cert, got ${JSON.stringify(rowsWith)}`);
  }

  const noCert = enrichSectionsWithProductMetadata(base, {
    category: "전자제품",
    brandName: "AURA",
    certifications: null,
  });
  const rowsNo =
    noCert[0] && noCert[0].type === "spec_table" ? noCert[0].rows : [];
  if (rowsNo.some((r) => /인증/.test(r.label))) {
    throw new Error(`A: KC row must be omitted, got ${JSON.stringify(rowsNo)}`);
  }
  console.log("[133A] enrich KC present/omit ✓");
  fs.writeFileSync(
    path.join(OUT, "133cha-A-spec-rows.txt"),
    [
      "## with cert",
      ...rowsWith.map((r) => `${r.label}: ${r.value}`),
      "",
      "## no cert",
      ...rowsNo.map((r) => `${r.label}: ${r.value}`),
      "",
    ].join("\n"),
    "utf8",
  );
}

function assertC() {
  const fixture = path.join(ROOT, "scripts", "fixtures", "cosmetics-reviews.txt");
  const buf = fs.readFileSync(fixture);
  const n = countReviewLines(buf, "txt");
  if (n !== 6) throw new Error(`C: expected 6 lines from fixture, got ${n}`);

  const section = buildReviewHighlightSection(
    ["좋았어요"],
    ["용량 아쉬움"],
    n,
  );
  if (section.sourceReviewCount !== 6) {
    throw new Error(`C: sourceReviewCount=${section.sourceReviewCount}`);
  }

  const noCount = buildReviewHighlightSection(["좋았어요"], []);
  if (noCount.sourceReviewCount != null) {
    throw new Error("C: omit sourceReviewCount when unset");
  }

  const html = buildDetailPageHtml({
    productName: "t",
    category: "화장품/뷰티",
    sections: [section],
    imageUrls: ["/iteration-fixtures/01.jpg"],
    theme: getCategoryTheme("화장품/뷰티"),
  });
  if (!html.includes("실제 리뷰 6건 분석")) {
    throw new Error("C: export missing count caption");
  }

  const emptyBuf = Buffer.from("\n\n  \n", "utf8");
  if (countReviewLines(emptyBuf, "txt") !== 0) {
    throw new Error("C: empty file must be 0");
  }

  const inserted = insertReviewHighlightSection(
    [{ type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 }],
    ["p"],
    [],
    6,
  );
  const rh = inserted.find((s) => s.type === "review_highlight");
  if (!rh || rh.type !== "review_highlight" || rh.sourceReviewCount !== 6) {
    throw new Error("C: insert wiring failed");
  }

  console.log(`[133C] reviewLineCount=${n} wired ✓`);
  fs.writeFileSync(
    path.join(OUT, "133cha-C-count.txt"),
    `fixture=${fixture}\ncountReviewLines=${n}\nsourceReviewCount=${section.sourceReviewCount}\n`,
    "utf8",
  );
}

function assertRubric() {
  const block = buildStyleRubricBlock();
  if (!block.includes("문제") || !block.includes("해결")) {
    throw new Error("B: rubric missing problem→solution guidance");
  }
  if (!block.includes("지어내지")) {
    throw new Error("B: rubric missing no-fabricate guard");
  }
  console.log("[133B] rubric text ✓");
}

async function runCopySamples() {
  const products: { label: string; product: CopyProductInput }[] = [
    {
      label: "cosmetics-contrast",
      product: {
        productName: "히알루론 수분 크림",
        category: "화장품/뷰티",
        brandName: "AURA LAB",
        description: "속당김이 심했던 피부에 가볍게 바르는 수분 크림",
        keyFeatures: "속건조 케어, 끈적임 없는 젤, 무향, 아침저녁 사용",
        ingredients: "히알루론산",
        certifications: null,
        targetCustomer: "속건조 고민",
        price: 28900,
        productImageUrls: [],
      },
    },
    {
      label: "electronics-contrast",
      product: {
        productName: "무선 청소기 VC-100",
        category: "전자제품",
        brandName: "AURA",
        description: "매번 선을 들고 다니던 청소, 무선으로 끝",
        keyFeatures: "21.6V, 40분 사용, 멀티 브러시, 원터치 비움",
        ingredients: null,
        certifications: "KC인증 12345",
        targetCustomer: "아파트 생활",
        price: 119000,
        productImageUrls: [],
      },
    },
    {
      label: "thin-problem",
      product: {
        productName: "베이직 면 티셔츠",
        category: "패션/의류",
        brandName: "AURA",
        description: "기본 면 티셔츠",
        keyFeatures: "면 100%, 화이트",
        ingredients: "면 100%",
        certifications: null,
        targetCustomer: null,
        price: 19900,
        productImageUrls: [],
      },
    },
  ];

  const lines: string[] = ["# 133B copy headlines", ""];
  for (const { label, product } of products) {
    console.log(`[133B] generating ${label}...`);
    const result = await runDetailCopyPipeline(product);
    const copy = result.copy;
    const cliche = detectGenericCliches(copy);
    const hallu = detectCopyHallucinations(copy, product);
    lines.push(`## ${label}`);
    lines.push(`mainHeadline: ${copy.mainHeadline}`);
    lines.push(`problemStatement: ${copy.problemStatement}`);
    lines.push(`solutionStatement: ${copy.solutionStatement}`);
    lines.push(`clicheWarnings: ${cliche.length === 0 ? "0" : cliche.join(" | ")}`);
    lines.push(`hallucinationWarnings: ${hallu.length === 0 ? "0" : hallu.join(" | ")}`);
    lines.push("");
    console.log(`[133B] ${label} → ${copy.mainHeadline}`);
    if (cliche.length > 0) console.warn(`[133B] cliche ${label}:`, cliche);
    if (hallu.length > 0) console.warn(`[133B] hallu ${label}:`, hallu);
  }
  fs.writeFileSync(path.join(OUT, "133cha-B-headlines.txt"), lines.join("\n"), "utf8");
  console.log("[133B] headlines written");
}

async function captureUi() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });

  const shots = [
    {
      capture: "133-electronics-cert",
      file: "133cha-electronics-cert.png",
      wait: "KC 인증",
    },
    {
      capture: "133-electronics-nocert",
      file: "133cha-electronics-nocert.png",
      wait: "정격전압",
    },
    {
      capture: "133-with-count",
      file: "133cha-review-count.png",
      wait: "실제 리뷰 6건 분석",
    },
    {
      capture: "131-praises-only",
      file: "133cha-review-no-count.png",
      wait: "실제 구매자들이 자주 남긴 이야기",
    },
  ];

  const notes: string[] = [];
  for (const shot of shots) {
    await page.goto(`${BASE_URL}/dev/detail-preview?capture=${shot.capture}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByText(shot.wait).first().waitFor({ state: "visible", timeout: 20000 });
    await freezeDetailScrollReveal(page);
    if (shot.capture === "133-electronics-nocert") {
      const kc = await page.getByText("KC 인증").count();
      if (kc !== 0) throw new Error("nocert fixture must not show KC 인증");
    }
    if (shot.capture === "133-with-count") {
      const c = await page.locator('[data-testid="review-highlight-count"]').count();
      if (c !== 1) throw new Error(`count caption expected 1, got ${c}`);
    }
    if (shot.capture === "131-praises-only") {
      const c = await page.locator('[data-testid="review-highlight-count"]').count();
      if (c !== 0) throw new Error(`no-count expected 0, got ${c}`);
    }
    await page.screenshot({ path: path.join(OUT, shot.file), fullPage: true });
    notes.push(`${shot.capture} → ${shot.file}`);
  }
  fs.writeFileSync(path.join(OUT, "133cha-capture-notes.txt"), notes.join("\n") + "\n", "utf8");
  await browser.close();
  console.log("[133] UI captures OK");
}

async function main() {
  loadEnvLocal();
  process.env.TEST_MODE = "true";
  fs.mkdirSync(OUT, { recursive: true });
  assertA();
  assertC();
  assertRubric();
  await runCopySamples();
  await captureUi();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
