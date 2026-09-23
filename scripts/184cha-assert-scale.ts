/**
 * 184차 — FONT_SIZE·ELEVATION 스케일 축소 assert (API 0).
 * 기준선: review/183cha-export/after-*.html
 *   npx tsx scripts/184cha-assert-scale.ts
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getCategoryTheme } from "../lib/category-theme";
import { ELEVATION, FONT_SIZE, hexToRgba } from "../lib/design-tokens";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const BASE = path.join(ROOT, "review", "183cha-export");
const OUT = path.join(ROOT, "review", "184cha-export");

const CATS = [
  { key: "beauty", category: "화장품/뷰티" },
  { key: "fashion", category: "의류/패션" },
  { key: "food", category: "식품/건강기능식품" },
  { key: "electronics", category: "전자제품" },
  { key: "living", category: "생활용품" },
  { key: "pet", category: "반려동물" },
] as const;

function sha(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function countRe(html: string, re: RegExp) {
  const m: Record<string, number> = {};
  let x: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((x = r.exec(html))) {
    const k = x[1] ?? x[0];
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function diffCounts(before: Record<string, number>, after: Record<string, number>) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: Record<string, { before: number; after: number; delta: number }> = {};
  for (const k of keys) {
    const b = before[k] ?? 0;
    const a = after[k] ?? 0;
    if (b !== a) out[k] = { before: b, after: a, delta: a - b };
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // —— 토큰 값 assert ——
  const fontOk =
    FONT_SIZE.micro === "9px" &&
    FONT_SIZE.diagramTick === FONT_SIZE.micro &&
    FONT_SIZE.diagramEmph === FONT_SIZE.label &&
    FONT_SIZE.diagramTitle === FONT_SIZE.caption &&
    FONT_SIZE.diagramLabel === FONT_SIZE.xs &&
    FONT_SIZE.bentoValue === FONT_SIZE.body &&
    FONT_SIZE.root === FONT_SIZE.bodyLg &&
    FONT_SIZE.statBarValue === FONT_SIZE.section &&
    FONT_SIZE.heroDisplay === FONT_SIZE.display &&
    FONT_SIZE.statNumber === FONT_SIZE.display &&
    FONT_SIZE.bodySm === "14px" &&
    FONT_SIZE.body === "15px" &&
    FONT_SIZE.checkMark === "18px" &&
    FONT_SIZE.bentoValueHero === "19px" &&
    FONT_SIZE.seoH2 === "1rem" &&
    FONT_SIZE.price === "2.25rem";

  const elevOk =
    ELEVATION.card === ELEVATION.imageThumb &&
    ELEVATION.specThumbMulti === ELEVATION.card &&
    ELEVATION.highlightEmphasis === ELEVATION.emphasis &&
    ELEVATION.ctaSticky === ELEVATION.sticky &&
    ELEVATION.pulseCardKey0 === ELEVATION.pulseCardRest &&
    ELEVATION.twSpecThumbMulti === ELEVATION.twImageThumb &&
    ELEVATION.barFillGlow("#2F4858") === ELEVATION.subtle("#2F4858") &&
    ELEVATION.ctaButton === "0 12px 28px -10px rgba(27,27,24,0.55)" &&
    ELEVATION.imageSoft("#2F4858") === `0 16px 48px ${hexToRgba("#2F4858", 0.12)}` &&
    ELEVATION.imageLift("#2F4858") === `0 20px 56px ${hexToRgba("#2F4858", 0.14)}`;

  if (!fontOk) throw new Error("FONT_SIZE scale assert failed");
  if (!elevOk) throw new Error("ELEVATION scale assert failed");

  const hashes: Record<string, { before: string; after: string; same: boolean }> = {};
  const fontDiffAll: Record<string, ReturnType<typeof diffCounts>> = {};
  const shadowDiffAll: Record<string, ReturnType<typeof diffCounts>> = {};

  for (const c of CATS) {
    const beforePath = path.join(BASE, `after-${c.key}.html`);
    if (!fs.existsSync(beforePath)) throw new Error(`missing baseline ${beforePath}`);
    const beforeHtml = fs.readFileSync(beforePath, "utf8");

    const sessionPath = path.join(ROOT, "review", "181cha-live", c.key, "session.json");
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as {
      productName?: string;
      brandName?: string;
      keyFeatures?: string;
      ingredients?: string;
      certifications?: string;
      generated?: {
        productName?: string;
        brandName?: string;
        sections?: DetailSection[];
        imageUrls?: string[];
      };
    };
    const afterHtml = buildDetailPageHtml({
      productName: session.generated?.productName || session.productName || c.key,
      brandName: session.generated?.brandName || session.brandName,
      keyFeatures: session.keyFeatures,
      ingredients: session.ingredients,
      certifications: session.certifications,
      category: c.category,
      sections: session.generated?.sections ?? [],
      imageUrls: session.generated?.imageUrls ?? [],
      theme: getCategoryTheme(c.category),
    });
    fs.writeFileSync(path.join(OUT, `after-${c.key}.html`), afterHtml, "utf8");

    const bHash = sha(beforeHtml);
    const aHash = sha(afterHtml);
    hashes[c.key] = { before: bHash, after: aHash, same: bHash === aHash };

    fontDiffAll[c.key] = diffCounts(
      countRe(beforeHtml, /font-size:([^;"']+)/g),
      countRe(afterHtml, /font-size:([^;"']+)/g),
    );
    shadowDiffAll[c.key] = diffCounts(
      countRe(beforeHtml, /box-shadow:([^;"']+)/g),
      countRe(afterHtml, /box-shadow:([^;"']+)/g),
    );

    // 의도된 font 변경만: 9.5px ↔ 9px
    for (const [k, d] of Object.entries(fontDiffAll[c.key]!)) {
      if (k !== "9.5px" && k !== "9px") {
        throw new Error(`[184] unexpected font-size delta in ${c.key}: ${k} ${JSON.stringify(d)}`);
      }
    }
    // export HTML에 specThumb/shadow 병합은 영향 없어야 함 (live only)
    if (Object.keys(shadowDiffAll[c.key]!).length > 0) {
      throw new Error(
        `[184] unexpected box-shadow delta in ${c.key}: ${JSON.stringify(shadowDiffAll[c.key])}`,
      );
    }

    console.log(
      `[184] ${c.key} hashSame=${hashes[c.key]!.same} fontDelta=${JSON.stringify(fontDiffAll[c.key])}`,
    );
  }

  const report = {
    at: new Date().toISOString(),
    fontOk,
    elevOk,
    twSync: ELEVATION.twSpecThumbMulti === ELEVATION.twImageThumb,
    hashes,
    fontDiffAll,
    shadowDiffAll,
    intentional: {
      font: "micro 9.5px→9px (bento soft label only when present)",
      elevationExport: "none (specThumbMulti merge is live TW only)",
      elevationLive: "specThumbMulti→card/imageThumb; pulseCardKey0→Rest",
    },
  };
  fs.writeFileSync(path.join(OUT, "assert.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(ROOT, "review", "184cha-value-assert.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("[184] wrote review/184cha-value-assert.json");
}

main();
