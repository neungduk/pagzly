/**
 * 89차 — Vision grasp 재시도 통계 (Vision만, 10회+)
 *   $env:TEST_MODE="false"; npx tsx scripts/89cha-grasp-retry-stats.ts
 */
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import {
  detectHandPlacementForProduct,
  getBestGraspOverlapFraction,
} from "../lib/detect-held-object-placement";
import {
  GRASP_VISION_MAX_ATTEMPTS,
  detectHandPlacementWithGraspRetry,
} from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const RUNS = 12;

const LIFESTYLE_TRUE_GRIP =
  "https://images.pexels.com/photos/6767822/pexels-photo-6767822.jpeg?auto=compress&cs=tinysrgb&w=1280";
const LIFESTYLE_RUBBING =
  "https://cdn.pixabay.com/photo/2021/12/22/03/10/self-care-6886590_1280.jpg";

type CaseDef = {
  name: string;
  url: string;
  /** true grip: reliable=true가 성공. rubbing: reliable=false가 성공(오탐 없음) */
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
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  console.log(`[89cha-stats] runs=${RUNS} maxAttempts=${GRASP_VISION_MAX_ATTEMPTS}`);

  const cutoutBuf = await loadCutoutBuffer();
  const cutout = { buffer: cutoutBuf, mediaType: "image/png" as const };

  const summary: Record<string, unknown> = { runs: RUNS, cases: [] as unknown[] };
  let totalVisionCost = 0;

  for (const c of CASES) {
    console.log(`\n[89cha-stats] === ${c.name} ===`);
    const lifestyleBuf = await fetchBuffer(c.url);
    const lifestyle = { buffer: lifestyleBuf, mediaType: "image/jpeg" as const };

    const singleRuns: Array<{
      reliable: boolean;
      rejectReason?: string;
      graspOverlap: number;
      cost: number;
    }> = [];
    const retryRuns: Array<{
      reliable: boolean;
      rejectReason?: string;
      visionAttempts: number;
      graspOverlap: number;
      cost: number;
    }> = [];

    for (let i = 0; i < RUNS; i += 1) {
      const single = await detectHandPlacementForProduct(lifestyle, cutout);
      const overlap = single.placement
        ? getBestGraspOverlapFraction(single.placement, single.graspRegions)
        : 0;
      singleRuns.push({
        reliable: single.reliable,
        rejectReason: single.rejectReason,
        graspOverlap: overlap,
        cost: single.cost,
      });
      totalVisionCost += single.cost;

      const retry = await detectHandPlacementWithGraspRetry(lifestyle, cutout);
      const retryOverlap = retry.placement
        ? getBestGraspOverlapFraction(retry.placement, retry.graspRegions)
        : 0;
      retryRuns.push({
        reliable: retry.reliable,
        rejectReason: retry.rejectReason,
        visionAttempts: retry.visionAttempts,
        graspOverlap: retryOverlap,
        cost: retry.cost,
      });
      totalVisionCost += retry.cost;

      console.log(
        `[89cha-stats] run ${i + 1}/${RUNS} single=${single.reliable}/${single.rejectReason ?? "ok"} ` +
          `overlap=${overlap.toFixed(3)} retry=${retry.reliable} attempts=${retry.visionAttempts}`,
      );

      await new Promise((r) => setTimeout(r, 2000));
    }

    const singleSuccess = singleRuns.filter((r) => r.reliable === c.expectReliable).length;
    const retrySuccess = retryRuns.filter((r) => r.reliable === c.expectReliable).length;

    const singleRate = singleSuccess / RUNS;
    const retryRate = retrySuccess / RUNS;

    const falsePositiveSingle = c.expectReliable
      ? 0
      : singleRuns.filter((r) => r.reliable).length;
    const falsePositiveRetry = c.expectReliable
      ? 0
      : retryRuns.filter((r) => r.reliable).length;

    const caseSummary = {
      name: c.name,
      expectReliable: c.expectReliable,
      single: {
        successCount: singleSuccess,
        rate: singleRate,
        falsePositiveCount: falsePositiveSingle,
        runs: singleRuns,
      },
      retry: {
        successCount: retrySuccess,
        rate: retryRate,
        falsePositiveCount: falsePositiveRetry,
        avgAttempts: retryRuns.reduce((s, r) => s + r.visionAttempts, 0) / RUNS,
        runs: retryRuns,
      },
    };

    (summary.cases as unknown[]).push(caseSummary);

    console.log(
      `[89cha-stats] ${c.name}: single ${singleSuccess}/${RUNS} (${(singleRate * 100).toFixed(0)}%) ` +
        `retry ${retrySuccess}/${RUNS} (${(retryRate * 100).toFixed(0)}%) ` +
        `falsePos single=${falsePositiveSingle} retry=${falsePositiveRetry}`,
    );
  }

  summary.totalVisionCost = totalVisionCost;
  fs.writeFileSync(
    path.join(ROOT, "review", "89cha-grasp-retry-stats.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  console.log(`\n[89cha-stats] total vision cost: $${totalVisionCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
