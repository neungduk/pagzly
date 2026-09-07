/**
 * 135차 — 결정론적 리뷰 매칭 카운트 + 안심 카피 조건부 지시 검증
 *   npx tsx scripts/135cha-review-match-smoke.ts
 *
 * A: 로컬 문자열 매칭만 (유료 0)
 * B: 기존 카피 파이프라인 2회 (신규 API/모델 없음, 지시문만 추가)
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { freezeDetailScrollReveal } from "./capture-utils";
import {
  buildReviewHighlightSection,
  insertReviewHighlightSection,
} from "../lib/section-inserts";
import {
  countLineMatches,
  extractCoreKeywords,
  extractLinesFromTxt,
} from "../lib/review-insights";
import { buildStyleRubricBlock } from "../lib/copy-orchestrator/deepseek-copy";
import { runDetailCopyPipeline } from "../lib/copy-orchestrator/pipeline";
import { detectCopyHallucinations } from "../lib/copy-orchestrator/validate-copy";
import type { CopyProductInput } from "../lib/copy-orchestrator/types";
import type { DetailSection } from "../lib/types/generate";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { getCategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
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
  const fixture = path.join(ROOT, "scripts", "fixtures", "cosmetics-reviews.txt");
  const lines = extractLinesFromTxt(fs.readFileSync(fixture));
  if (lines.length !== 6) throw new Error(`A: expected 6 lines, got ${lines.length}`);

  const samplePraises = [
    "끈적임 없이 흡수돼요",
    "무향이라 자극이 없어요",
    "은하수 성분으로 빛나요", // 원문 0매칭 → 배지 숨김
  ];
  const sampleComplaints = ["용량이 조금 아쉬워요", "경쟁사보다 별로예요"];

  const table: string[] = [
    "# 135A hand-check match table",
    "",
    `fixture lines (${lines.length}):`,
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    "",
  ];

  const praiseCounts: number[] = [];
  for (const text of samplePraises) {
    const keywords = extractCoreKeywords(text);
    const count = countLineMatches(lines, text);
    praiseCounts.push(count);
    const matched = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => keywords.some((k) => line.includes(k)));
    table.push(`## praise: ${text}`);
    table.push(`keywords: ${JSON.stringify(keywords)}`);
    table.push(`count: ${count}`);
    table.push(
      matched.length
        ? matched.map((m) => `  L${m.i + 1}: ${m.line}`).join("\n")
        : "  (no lines)",
    );
    table.push("");
  }

  const complaintCounts = sampleComplaints.map((t) => countLineMatches(lines, t));
  for (let i = 0; i < sampleComplaints.length; i++) {
    const text = sampleComplaints[i]!;
    const keywords = extractCoreKeywords(text);
    table.push(`## complaint: ${text}`);
    table.push(`keywords: ${JSON.stringify(keywords)}`);
    table.push(`count: ${complaintCounts[i]}`);
    table.push("");
  }

  if (praiseCounts[2] !== 0) {
    throw new Error(`A: zero-match praise expected 0, got ${praiseCounts[2]}`);
  }

  // 인덱스 정합: 빈 문자열 praise가 중간에 있어도 카운트 함께 필터
  const messyPraises = ["끈적임 없이 흡수돼요", "", "무향이라 자극이 없어요"];
  const messyCounts = [
    countLineMatches(lines, messyPraises[0]!),
    99, // 빈 문자열과 짝 — 필터 후 사라져야 함
    countLineMatches(lines, messyPraises[2]!),
  ];
  const section = buildReviewHighlightSection(
    messyPraises,
    ["", "용량이 조금 아쉬워요"],
    lines.length,
    messyCounts,
    [7, countLineMatches(lines, "용량이 조금 아쉬워요")],
  );
  if (section.praises.length !== 2) {
    throw new Error(`A: filtered praises length=${section.praises.length}`);
  }
  if (!section.praiseMatchCounts || section.praiseMatchCounts.length !== 2) {
    throw new Error(`A: praiseMatchCounts desync ${JSON.stringify(section.praiseMatchCounts)}`);
  }
  if (section.praiseMatchCounts[0] !== messyCounts[0] || section.praiseMatchCounts[1] !== messyCounts[2]) {
    throw new Error(
      `A: count index drift got ${JSON.stringify(section.praiseMatchCounts)} expected [${messyCounts[0]},${messyCounts[2]}]`,
    );
  }
  if (section.praiseMatchCounts.includes(99)) {
    throw new Error("A: empty-pair count 99 leaked into section");
  }
  if (!section.concerns || section.concerns.length !== 1) {
    throw new Error(`A: concerns filter failed ${JSON.stringify(section.concerns)}`);
  }
  if (!section.complaintMatchCounts || section.complaintMatchCounts.length !== 1) {
    throw new Error(`A: complaintMatchCounts desync`);
  }
  if (section.complaintMatchCounts[0] === 7) {
    throw new Error("A: empty complaint's count leaked");
  }

  const html = buildDetailPageHtml({
    productName: "t",
    category: "화장품/뷰티",
    sections: [
      buildReviewHighlightSection(
        samplePraises,
        sampleComplaints.slice(0, 1),
        6,
        praiseCounts,
        complaintCounts.slice(0, 1),
      ),
    ],
    imageUrls: [],
    theme: getCategoryTheme("화장품/뷰티"),
  });
  if (!html.includes("건 언급")) throw new Error("A: html missing match badge");
  // 0건 배지 문구는 없어야 함
  if (html.includes("0건 언급")) throw new Error("A: html must hide 0 match badge");

  const inserted = insertReviewHighlightSection(
    [{ type: "cta_price", slot: "cta_price", price: 1, targetCustomer: "", badges: [] }],
    messyPraises,
    ["용량이 조금 아쉬워요"],
    6,
    messyCounts,
    [countLineMatches(lines, "용량이 조금 아쉬워요")],
  );
  const rh = inserted.find((s) => s.type === "review_highlight");
  if (!rh || rh.type !== "review_highlight") throw new Error("A: insert failed");
  if (rh.praiseMatchCounts?.length !== rh.praises.length) {
    throw new Error("A: insert praise/count length mismatch");
  }

  fs.writeFileSync(path.join(OUT, "135cha-A-match-table.txt"), table.join("\n"), "utf8");
  console.log("[135A] match table + index align ✓");
  console.log(`  praiseCounts=${JSON.stringify(praiseCounts)}`);
}

function assertRubric() {
  const block = buildStyleRubricBlock();
  if (!block.includes("무첨가") || !block.includes("literal")) {
    throw new Error("B: rubric missing reassurance conditional");
  }
  if (!block.includes("절대 금지")) {
    throw new Error("B: rubric missing competitor ban");
  }
  console.log("[135B] rubric ✓");
}

function flattenCopyText(copy: {
  mainHeadline: string;
  subHeadline: string;
  problemStatement: string;
  solutionStatement: string;
  benefit: string;
  feature: string;
  featureDescription: string;
  cta: string;
  sections: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
}): string {
  return [
    copy.mainHeadline,
    copy.subHeadline,
    copy.problemStatement,
    copy.solutionStatement,
    copy.benefit,
    copy.feature,
    copy.featureDescription,
    copy.cta,
    ...copy.sections.flatMap((s) => [s.title, s.body]),
    ...copy.faq.flatMap((f) => [f.question, f.answer]),
  ].join("\n");
}

async function runCopySamples() {
  const withSafety: CopyProductInput = {
    productName: "히알루론 수분 세럼",
    category: "화장품/뷰티",
    brandName: "AURA LAB",
    description: "가볍게 스며드는 수분 세럼",
    keyFeatures: "무향, 데일리 보습",
    ingredients: "히알루론산, 파라벤 프리, 무첨가",
    certifications: null,
    targetCustomer: "민감 피부",
    price: 28900,
    productImageUrls: [],
  };
  const noSafety: CopyProductInput = {
    productName: "히알루론 수분 세럼",
    category: "화장품/뷰티",
    brandName: "AURA LAB",
    description: "가볍게 스며드는 수분 세럼",
    keyFeatures: "데일리 보습, 빠른 흡수",
    ingredients: "히알루론산, 글리세린",
    certifications: null,
    targetCustomer: "민감 피부",
    price: 28900,
    productImageUrls: [],
  };

  const lines: string[] = ["# 135B reassurance copy compare", ""];
  const competitorRe =
    /경쟁사|타사|다른\s*제품|타\s*제품|후커블|타브랜드|라이벌/g;

  for (const { label, product, expectReassureHint } of [
    { label: "with-safety-literal", product: withSafety, expectReassureHint: true },
    { label: "no-safety-literal", product: noSafety, expectReassureHint: false },
  ] as const) {
    console.log(`[135B] generating ${label}...`);
    let copy = (await runDetailCopyPipeline(product)).copy;
    let hallu = detectCopyHallucinations(copy, product);
    if (hallu.length > 0) {
      console.warn(`[135B] hallu retry once for ${label}:`, hallu);
      copy = (await runDetailCopyPipeline(product)).copy;
      hallu = detectCopyHallucinations(copy, product);
    }
    const flat = flattenCopyText(copy);
    const reassureHits = flat.match(/넣지\s*않았|무첨가|파라벤\s*프리|무향/g) ?? [];
    const competitorHits = flat.match(competitorRe) ?? [];

    lines.push(`## ${label}`);
    lines.push(`ingredients: ${product.ingredients}`);
    lines.push(`keyFeatures: ${product.keyFeatures}`);
    lines.push(`mainHeadline: ${copy.mainHeadline}`);
    lines.push(
      `sections:`,
      ...copy.sections.map((s) => `- [${s.type}] ${s.title}: ${s.body.slice(0, 120)}`),
    );
    lines.push(`hallucinationWarnings: ${hallu.length}`);
    if (hallu.length > 0) lines.push(`halluDetail: ${hallu.join(" | ")}`);
    lines.push(`reassure-ish hits: ${reassureHits.join(" | ") || "(none)"}`);
    lines.push(`competitor hits: ${competitorHits.join(" | ") || "(none)"}`);
    lines.push("");

    if (hallu.length > 0) {
      throw new Error(`B: hallucinationWarnings=${hallu.length} for ${label}: ${hallu.join("; ")}`);
    }
    if (competitorHits.length > 0) {
      throw new Error(`B: competitor mention in ${label}: ${competitorHits.join(", ")}`);
    }

    // 무입력 케이스는 "불필요한 ○○을 넣지 않았습니다" 패턴이 없어야 함
    const forcedReassure = /불필요한.{0,12}넣지\s*않았/.test(flat);
    if (!expectReassureHint && forcedReassure) {
      throw new Error(`B: no-safety product still got forced reassure sentence`);
    }
    console.log(
      `[135B] ${label} hallu=0 competitor=0 forcedReassure=${forcedReassure} (expect hint path=${expectReassureHint})`,
    );
  }

  fs.writeFileSync(path.join(OUT, "135cha-B-copy-compare.txt"), lines.join("\n"), "utf8");
  console.log("[135B] copy compare written");
}

async function captureUi() {
  fs.mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(`${BASE_URL}/dev/detail-preview?capture=135-match-badges`, {
    waitUntil: "networkidle",
  });
  await freezeDetailScrollReveal(page);
  await page.locator('[data-testid="review-highlight"]').waitFor({ state: "visible" });
  const badges = page.locator('[data-testid="review-match-badge"]');
  const badgeCount = await badges.count();
  if (badgeCount < 1) throw new Error("capture: expected at least one match badge");
  // 0건 praise/concern은 배지 없음 → praises 3 + concerns 2 중 match>0 은 2+1=3
  if (badgeCount !== 3) {
    throw new Error(`capture: expected 3 visible badges (hide zeros), got ${badgeCount}`);
  }
  const out = path.join(SHOT, "135cha-match-badges.png");
  await page.locator('[data-testid="review-highlight"]').screenshot({ path: out });
  console.log(`[135] screenshot ${out} badges=${badgeCount}`);
  await browser.close();
}

async function main() {
  loadEnvLocal();
  process.env.TEST_MODE = process.env.TEST_MODE || "true";
  assertA();
  assertRubric();
  await runCopySamples();
  await captureUi();
  console.log("[135] all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
