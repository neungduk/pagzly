/**
 * 91차 — grasp bbox 합집합 ensemble QA
 *   $env:TEST_MODE="false"; npx tsx scripts/91cha-grasp-ensemble-qa.ts
 */
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import {
  getBestGraspOverlapFraction,
  mergeGraspRegionsUnion,
  type HeldObjectRegion,
} from "../lib/detect-held-object-placement";
import {
  GRASP_VISION_MAX_ATTEMPTS,
  detectHandPlacementWithGraspRetry,
} from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const RUNS = 12;
const BASELINE_89CHA_TRUE_GRIP_RATE = 0.25;

const LIFESTYLE_TRUE_GRIP =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_RUBBING =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";

type CaseDef = {
  name: string;
  url: string;
  expectReliable: boolean;
};

const CASES: CaseDef[] = [
  { name: "true-grip-6767822", url: LIFESTYLE_TRUE_GRIP, expectReliable: true },
  { name: "rubbing-6886590", url: LIFESTYLE_RUBBING, expectReliable: false },
];

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

function assertUnion(
  label: string,
  regions: HeldObjectRegion[],
  expected: HeldObjectRegion,
): void {
  const merged = mergeGraspRegionsUnion(regions);
  if (!merged) throw new Error(`${label}: merge returned null`);
  const ok =
    Math.abs(merged.xPct - expected.xPct) < 0.001 &&
    Math.abs(merged.yPct - expected.yPct) < 0.001 &&
    Math.abs(merged.wPct - expected.wPct) < 0.001 &&
    Math.abs(merged.hPct - expected.hPct) < 0.001;
  if (!ok) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(merged)}`,
    );
  }
  console.log(`[91cha-unit] ${label} OK → ${JSON.stringify(merged)}`);
}

function runMergeGraspRegionsUnionUnitTests(): void {
  console.log("[91cha-unit] mergeGraspRegionsUnion() coordinate tests");
  assertUnion(
    "two-disjoint-horizontal",
    [
      { xPct: 10, yPct: 20, wPct: 15, hPct: 10 },
      { xPct: 30, yPct: 25, wPct: 12, hPct: 8 },
    ],
    { xPct: 10, yPct: 20, wPct: 32, hPct: 13 },
  );
  assertUnion(
    "three-overlapping",
    [
      { xPct: 40, yPct: 50, wPct: 10, hPct: 10 },
      { xPct: 45, yPct: 52, wPct: 8, hPct: 6 },
      { xPct: 38, yPct: 48, wPct: 5, hPct: 5 },
    ],
    { xPct: 38, yPct: 48, wPct: 15, hPct: 12 },
  );
  assertUnion("single", [{ xPct: 5, yPct: 5, wPct: 20, hPct: 30 }], {
    xPct: 5,
    yPct: 5,
    wPct: 20,
    hPct: 30,
  });
  if (mergeGraspRegionsUnion([]) !== null) {
    throw new Error("empty input should return null");
  }
  console.log("[91cha-unit] empty input → null OK");
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "Pagzly-QA/1.0" } });
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadCutoutBuffer(): Promise<Buffer> {
  const productPath = path.join(ROOT, "review", "qa-screenshots", "88cha-input-product.png");
  if (!fs.existsSync(productPath)) {
    throw new Error("88cha-input-product.png 없음 — 먼저 다운로드 필요");
  }
  const productDataUrl = `data:image/png;base64,${fs.readFileSync(productPath).toString("base64")}`;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN!, useFileOutput: false });
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover version missing");
  const out = await replicate.run(`851-labs/background-remover:${versionId}`, {
    input: { image: productDataUrl },
  });
  const url = Array.isArray(out) ? out[0] : out;
  return fetchBuffer(String(url));
}

async function main() {
  runMergeGraspRegionsUnionUnitTests();

  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  console.log(`\n[91cha-qa] runs=${RUNS} maxAttempts=${GRASP_VISION_MAX_ATTEMPTS} + ensemble`);

  const cutoutBuf = await loadCutoutBuffer();
  const cutout = { buffer: cutoutBuf, mediaType: "image/png" as const };

  const summary: Record<string, unknown> = {
    runs: RUNS,
    baseline89chaTrueGripRate: BASELINE_89CHA_TRUE_GRIP_RATE,
    cases: [] as unknown[],
  };
  let totalVisionCost = 0;

  for (const c of CASES) {
    console.log(`\n[91cha-qa] === ${c.name} ===`);
    const lifestyleBuf = await fetchBuffer(c.url);
    const lifestyle = { buffer: lifestyleBuf, mediaType: "image/jpeg" as const };

    const runs: Array<{
      reliable: boolean;
      rejectReason?: string;
      visionAttempts: number;
      graspOverlap: number;
      viaEnsemble: boolean;
      ensembleGraspOverlap?: number;
      mergedGraspRegion?: HeldObjectRegion | null;
      attemptLogs: unknown[];
      cost: number;
    }> = [];

    for (let i = 0; i < RUNS; i += 1) {
      const retry = await detectHandPlacementWithGraspRetry(lifestyle, cutout);
      const graspOverlap = retry.placement
        ? getBestGraspOverlapFraction(retry.placement, retry.graspRegions)
        : 0;
      totalVisionCost += retry.cost;

      runs.push({
        reliable: retry.reliable,
        rejectReason: retry.rejectReason,
        visionAttempts: retry.visionAttempts,
        graspOverlap,
        viaEnsemble: retry.viaEnsemble === true,
        ensembleGraspOverlap: retry.ensembleGraspOverlap,
        mergedGraspRegion: retry.mergedGraspRegion,
        attemptLogs: retry.attemptLogs,
        cost: retry.cost,
      });

      console.log(
        `[91cha-qa] run ${i + 1}/${RUNS} reliable=${retry.reliable} ` +
          `reject=${retry.rejectReason ?? "none"} attempts=${retry.visionAttempts} ` +
          `overlap=${graspOverlap.toFixed(3)} viaEnsemble=${retry.viaEnsemble === true} ` +
          `ensembleOverlap=${retry.ensembleGraspOverlap?.toFixed(3) ?? "n/a"}`,
      );

      await new Promise((r) => setTimeout(r, 2500));
    }

    const successCount = runs.filter((r) => r.reliable === c.expectReliable).length;
    const rate = successCount / RUNS;
    const viaEnsembleCount = runs.filter((r) => r.viaEnsemble).length;
    const falsePositiveViaEnsemble = c.expectReliable
      ? 0
      : runs.filter((r) => r.viaEnsemble && r.reliable).length;
    const falsePositiveTotal = c.expectReliable ? 0 : runs.filter((r) => r.reliable).length;

    const caseSummary = {
      name: c.name,
      expectReliable: c.expectReliable,
      successCount,
      rate,
      viaEnsembleCount,
      falsePositiveViaEnsemble,
      falsePositiveTotal,
      avgAttempts: runs.reduce((s, r) => s + r.visionAttempts, 0) / RUNS,
      runs,
    };
    (summary.cases as unknown[]).push(caseSummary);

    console.log(
      `[91cha-qa] ${c.name}: ${successCount}/${RUNS} (${(rate * 100).toFixed(0)}%) ` +
        `viaEnsemble=${viaEnsembleCount} falsePos=${falsePositiveTotal} ` +
        `falsePosViaEnsemble=${falsePositiveViaEnsemble}`,
    );
  }

  summary.totalVisionCost = totalVisionCost;
  fs.writeFileSync(
    path.join(ROOT, "review", "91cha-grasp-ensemble-qa.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  console.log(`\n[91cha-qa] total vision cost: $${totalVisionCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
