/**
 * 90차 — overlap raw 수집 + 편향/노이즈 분석 (Vision-only)
 *   $env:TEST_MODE="false"; npx tsx scripts/90cha-overlap-variance-analysis.ts
 */
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import {
  detectHandPlacementForProduct,
  getBestGraspOverlapFraction,
  type HeldObjectRegion,
} from "../lib/detect-held-object-placement";

const ROOT = path.join(__dirname, "..");
const RUNS = 12;

const LIFESTYLE_TRUE_GRIP =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_RUBBING =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";

type RawAttempt = {
  runIndex: number;
  reliable: boolean;
  rejectReason?: string;
  placement: HeldObjectRegion | null;
  graspRegions: HeldObjectRegion[];
  bestGrasp: HeldObjectRegion | null;
  overlapFraction: number;
  cost: number;
};

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function stats(values: number[]) {
  if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    mean,
    std: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
    n: values.length,
  };
}

function regionCenter(r: HeldObjectRegion) {
  return { cx: r.xPct + r.wPct / 2, cy: r.yPct + r.hPct / 2 };
}

function pickBestGrasp(placement: HeldObjectRegion, graspRegions: HeldObjectRegion[]): HeldObjectRegion | null {
  const area = placement.wPct * placement.hPct;
  if (area <= 0) return null;
  let best: HeldObjectRegion | null = null;
  let bestFrac = -1;
  for (const g of graspRegions) {
    const left = Math.max(placement.xPct, g.xPct);
    const top = Math.max(placement.yPct, g.yPct);
    const right = Math.min(placement.xPct + placement.wPct, g.xPct + g.wPct);
    const bottom = Math.min(placement.yPct + placement.hPct, g.yPct + g.hPct);
    if (right <= left || bottom <= top) continue;
    const frac = ((right - left) * (bottom - top)) / area;
    if (frac > bestFrac) {
      bestFrac = frac;
      best = g;
    }
  }
  return best;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "Pagzly-QA/1.0" } });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadCutoutBuffer(): Promise<Buffer> {
  const productPath = path.join(ROOT, "review", "qa-screenshots", "88cha-input-product.png");
  const productDataUrl = `data:image/png;base64,${fs.readFileSync(productPath).toString("base64")}`;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN!, useFileOutput: false });
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover version missing");
  const out = await replicate.run(`851-labs/background-remover:${versionId}`, {
    input: { image: productDataUrl },
  });
  return fetchBuffer(String(Array.isArray(out) ? out[0] : out));
}

function analyzeVariance(attempts: RawAttempt[]) {
  const overlaps = attempts.map((a) => a.overlapFraction);
  const overlapStats = stats(overlaps);

  const graspCenters = attempts
    .filter((a) => a.bestGrasp)
    .map((a) => regionCenter(a.bestGrasp!));
  const placementCenters = attempts
    .filter((a) => a.placement)
    .map((a) => regionCenter(a.placement!));

  const graspCx = stats(graspCenters.map((c) => c.cx));
  const graspCy = stats(graspCenters.map((c) => c.cy));
  const placeCx = stats(placementCenters.map((c) => c.cx));
  const placeCy = stats(placementCenters.map((c) => c.cy));

  const graspWPct = stats(attempts.filter((a) => a.bestGrasp).map((a) => a.bestGrasp!.wPct));
  const graspHPct = stats(attempts.filter((a) => a.bestGrasp).map((a) => a.bestGrasp!.hPct));
  const placeWPct = stats(attempts.filter((a) => a.placement).map((a) => a.placement!.wPct));
  const placeHPct = stats(attempts.filter((a) => a.placement).map((a) => a.placement!.hPct));

  const graspStable = graspCx.std < 3 && graspCy.std < 3;
  const placementStable = placeCx.std < 3 && placeCy.std < 3;
  const overlapVolatile = overlapStats.std > 0.06;

  let biasVsNoise: string;
  if (graspStable && placementStable && overlapStats.mean < 0.4 && overlapStats.max < 0.42) {
    biasVsNoise =
      "편향(bias) 쪽 — grasp/placement 중심은 안정적(std<3%p)인데 overlap이 0.4 미만에 몰림 → 크기/경계 미세 흔들림 + threshold 경계";
  } else if (!graspStable || !placementStable) {
    biasVsNoise =
      "노이즈/불안정 쪽 — bbox 중심 자체가 시도마다 크게 이동(std≥3%p) → 단순 재시도·앙상블 효과 제한적";
  } else if (overlapVolatile && overlapStats.mean >= 0.35) {
    biasVsNoise =
      "혼합 — 중심은 비교적 안정, overlap 분산 큼(std>0.06) → placement/grasp 상대 위치가 요동";
  } else {
    biasVsNoise = "애매 — 두 신호가 섞여 단정 어려움";
  }

  return {
    overlapStats,
    graspCenter: { cx: graspCx, cy: graspCy },
    placementCenter: { cx: placeCx, cy: placeCy },
    graspSize: { wPct: graspWPct, hPct: graspHPct },
    placementSize: { wPct: placeWPct, hPct: placeHPct },
    graspCenterStable: graspStable,
    placementCenterStable: placementStable,
    biasVsNoise,
  };
}

async function main() {
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  const cutoutBuf = await loadCutoutBuffer();
  const cutout = { buffer: cutoutBuf, mediaType: "image/png" as const };

  const cases = [
    { name: "true-grip-6767822", url: LIFESTYLE_TRUE_GRIP },
    { name: "rubbing-6886590", url: LIFESTYLE_RUBBING },
  ];

  let totalCost = 0;
  const output: Record<string, unknown> = { runs: RUNS, cases: [] as unknown[] };

  for (const c of cases) {
    console.log(`\n[90cha-overlap] === ${c.name} ===`);
    const lifestyleBuf = await fetchBuffer(c.url);
    const lifestyle = { buffer: lifestyleBuf, mediaType: "image/jpeg" as const };
    const attempts: RawAttempt[] = [];

    for (let i = 0; i < RUNS; i += 1) {
      const det = await detectHandPlacementForProduct(lifestyle, cutout);
      totalCost += det.cost;
      const bestGrasp = det.placement ? pickBestGrasp(det.placement, det.graspRegions) : null;
      const overlap = det.placement ? getBestGraspOverlapFraction(det.placement, det.graspRegions) : 0;

      const row: RawAttempt = {
        runIndex: i + 1,
        reliable: det.reliable,
        rejectReason: det.rejectReason,
        placement: det.placement,
        graspRegions: det.graspRegions,
        bestGrasp,
        overlapFraction: overlap,
        cost: det.cost,
      };
      attempts.push(row);

      const g = bestGrasp;
      console.log(
        `[90cha-overlap] run ${i + 1}/${RUNS} overlap=${overlap.toFixed(3)} reliable=${det.reliable} ` +
          `place=(${det.placement?.xPct.toFixed(1)},${det.placement?.yPct.toFixed(1)},${det.placement?.wPct.toFixed(1)}x${det.placement?.hPct.toFixed(1)}) ` +
          `grasp=${g ? `(${g.xPct.toFixed(1)},${g.yPct.toFixed(1)},${g.wPct.toFixed(1)}x${g.hPct.toFixed(1)})` : "none"}`,
      );

      await new Promise((r) => setTimeout(r, 1500));
    }

    const analysis = analyzeVariance(attempts);
    (output.cases as unknown[]).push({ name: c.name, attempts, analysis });
    console.log(
      `[90cha-overlap] ${c.name} overlap mean=${analysis.overlapStats.mean.toFixed(3)} std=${analysis.overlapStats.std.toFixed(3)} ` +
        `graspCx.std=${analysis.graspCenter.cx.std.toFixed(2)} placeCx.std=${analysis.placementCenter.cx.std.toFixed(2)} → ${analysis.biasVsNoise}`,
    );
  }

  output.totalVisionCost = totalCost;
  fs.writeFileSync(
    path.join(ROOT, "review", "90cha-overlap-raw.json"),
    JSON.stringify(output, null, 2),
    "utf8",
  );
  console.log(`\n[90cha-overlap] total cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
