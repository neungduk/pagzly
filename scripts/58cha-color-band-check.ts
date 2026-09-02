/**
 * 58차 — 풀페이지 스크린샷 24구간 평균색 분석 (51차 vs 58차 비교)
 *   npx tsx scripts/58cha-color-band-check.ts
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");
const REPORT_PATH = path.join(ROOT, "review", "58cha-color-bands.json");

const BANDS = 24;
/** 히어로(0~1) 제외, 본문 중간 구간 8~19 (12구간) */
const MID_BAND_START = 8;
const MID_BAND_END = 19;

type CategorySlug = "fashion" | "cosmetics" | "food" | "electronics" | "living" | "pet";

const CATEGORIES: Array<{
  slug: CategorySlug;
  label: string;
  before: string;
  after: string;
  afterSpec?: string;
}> = [
  {
    slug: "fashion",
    label: "의류/패션",
    before: "51cha-final-fashion.png",
    after: "58cha-preview-fashion.png",
    afterSpec: "58cha-spec-section-fashion.png",
  },
  {
    slug: "cosmetics",
    label: "화장품/뷰티",
    before: "51cha-final-cosmetics.png",
    after: "58cha-preview-cosmetics.png",
    afterSpec: "58cha-spec-section-cosmetics.png",
  },
  {
    slug: "food",
    label: "식품/건강기능식품",
    before: "51cha-final-food.png",
    after: "58cha-preview-food.png",
    afterSpec: "58cha-spec-section-food.png",
  },
  {
    slug: "electronics",
    label: "전자제품",
    before: "51cha-final-electronics.png",
    after: "58cha-preview-electronics.png",
    afterSpec: "58cha-spec-section-electronics.png",
  },
  {
    slug: "living",
    label: "생활용품",
    before: "living-full.png",
    after: "58cha-preview-living.png",
    afterSpec: "58cha-spec-section-living.png",
  },
  {
    slug: "pet",
    label: "반려동물",
    before: "51cha-final-pet.png",
    after: "58cha-preview-pet.png",
    afterSpec: "58cha-spec-section-pet.png",
  },
];

type Rgb = { r: number; g: number; b: number };

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

async function bandAverages(imagePath: string): Promise<{ bands: Rgb[]; midAvg: Rgb }> {
  const meta = await sharp(imagePath).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width === 0 || height === 0) throw new Error(`Invalid image: ${imagePath}`);

  const bandHeight = Math.floor(height / BANDS);
  const bands: Rgb[] = [];

  for (let i = 0; i < BANDS; i++) {
    const top = i * bandHeight;
    const h = i === BANDS - 1 ? height - top : bandHeight;
    const { data } = await sharp(imagePath)
      .extract({ left: 0, top, width, height: h })
      .resize(1, 1)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    bands.push({ r: data[0]!, g: data[1]!, b: data[2]! });
  }

  const midBands = bands.slice(MID_BAND_START, MID_BAND_END + 1);
  const midAvg: Rgb = {
    r: Math.round(midBands.reduce((s, c) => s + c.r, 0) / midBands.length),
    g: Math.round(midBands.reduce((s, c) => s + c.g, 0) / midBands.length),
    b: Math.round(midBands.reduce((s, c) => s + c.b, 0) / midBands.length),
  };

  return { bands, midAvg };
}

function maxPairwiseDelta(mids: Rgb[]): number {
  let max = 0;
  for (let i = 0; i < mids.length; i++) {
    for (let j = i + 1; j < mids.length; j++) {
      max = Math.max(max, colorDistance(mids[i]!, mids[j]!));
    }
  }
  return max;
}

async function main() {
  const results: Record<string, unknown> = { bands: BANDS, midBandRange: [MID_BAND_START, MID_BAND_END] };
  const beforeMids: Rgb[] = [];
  const afterMids: Rgb[] = [];
  const afterSpecMids: Rgb[] = [];
  const rows: string[] = [];

  console.log(`\n=== 58차 색상 밴드 분석 (${BANDS}구간, 중간 ${MID_BAND_START}~${MID_BAND_END}) ===\n`);
  console.log(
    "category".padEnd(14),
    "before mid".padEnd(12),
    "after mid".padEnd(12),
    "shift".padEnd(8),
    "bands(hex sample 10-14)",
  );
  console.log("-".repeat(90));

  for (const cat of CATEGORIES) {
    const beforePath = path.join(SHOT_DIR, cat.before);
    const afterPath = path.join(SHOT_DIR, cat.after);
    if (!fs.existsSync(beforePath)) {
      console.warn(`SKIP ${cat.slug}: missing before ${cat.before}`);
      continue;
    }
    if (!fs.existsSync(afterPath)) {
      console.warn(`SKIP ${cat.slug}: missing after ${cat.after}`);
      continue;
    }

    const before = await bandAverages(beforePath);
    const after = await bandAverages(afterPath);
    const afterSpecPath = cat.afterSpec ? path.join(SHOT_DIR, cat.afterSpec) : null;
    const afterSpec =
      afterSpecPath && fs.existsSync(afterSpecPath)
        ? await bandAverages(afterSpecPath)
        : null;
    const shift = colorDistance(before.midAvg, after.midAvg);
    beforeMids.push(before.midAvg);
    afterMids.push(after.midAvg);
    if (afterSpec) afterSpecMids.push(afterSpec.midAvg);

    const sample = after.bands
      .slice(10, 15)
      .map((c) => rgbToHex(c))
      .join(" ");

    rows.push(
      `${cat.label.padEnd(12)} ${rgbToHex(before.midAvg).padEnd(10)} ${rgbToHex(after.midAvg).padEnd(10)} Δ${shift.toFixed(1).padStart(5)}  ${sample}`,
    );

    results[cat.slug] = {
      label: cat.label,
      beforeMid: rgbToHex(before.midAvg),
      afterMid: rgbToHex(after.midAvg),
      afterSpecMid: afterSpec ? rgbToHex(afterSpec.midAvg) : null,
      shift,
      beforeBands: before.bands.map(rgbToHex),
      afterBands: after.bands.map(rgbToHex),
      afterSpecBands: afterSpec?.bands.map(rgbToHex) ?? null,
    };
  }

  const beforeSpread = maxPairwiseDelta(beforeMids);
  const afterSpread = maxPairwiseDelta(afterMids);
  const afterSpecSpread =
    afterSpecMids.length >= 2 ? maxPairwiseDelta(afterSpecMids) : 0;

  /** 51차 크림 수렴 구간(생활용품 outlier 제외) — 패션·화장품·식품·전자·반려동물 */
  const creamSlugs = new Set<CategorySlug>(["fashion", "cosmetics", "food", "electronics", "pet"]);
  const beforeCream = CATEGORIES.filter((c) => creamSlugs.has(c.slug))
    .map((c) => (results[c.slug] as { beforeMid: string })?.beforeMid)
    .filter(Boolean)
    .map((hex) => {
      const n = parseInt(hex.slice(1), 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    });
  const beforeCreamSpread =
    beforeCream.length >= 2 ? maxPairwiseDelta(beforeCream) : beforeSpread;

  results.summary = {
    beforeMidMaxPairwiseDelta: Math.round(beforeSpread * 10) / 10,
    beforeCreamClusterMaxDelta: Math.round(beforeCreamSpread * 10) / 10,
    afterMidMaxPairwiseDelta: Math.round(afterSpread * 10) / 10,
    afterSpecSectionMaxPairwiseDelta: Math.round(afterSpecSpread * 10) / 10,
    spreadIncrease: Math.round((afterSpread - beforeSpread) * 10) / 10,
    creamClusterSpreadIncrease: Math.round((afterSpread - beforeCreamSpread) * 10) / 10,
    specSectionSpreadVsCreamCluster:
      Math.round((afterSpecSpread - beforeCreamSpread) * 10) / 10,
  };

  for (const row of rows) console.log(row);

  console.log("\n--- 요약 ---");
  console.log(
    `중간 구간 6카테고리 최대 pairwise Δ: before=${beforeSpread.toFixed(1)} → after=${afterSpread.toFixed(1)}`,
  );
  console.log(
    `51차 크림 수렴 5카테고리 최대 Δ: ${beforeCreamSpread.toFixed(1)} → 58차 풀페이지 ${afterSpread.toFixed(1)} / spec섹션 ${afterSpecSpread.toFixed(1)}`,
  );

  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nJSON → ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
