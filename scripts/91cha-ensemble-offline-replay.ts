/**
 * 91차 — 90cha raw bbox로 grasp 합집합 ensemble 오프라인 시뮬레이션 (Vision 호출 없음)
 *   npx tsx scripts/91cha-ensemble-offline-replay.ts
 */
import fs from "fs";
import path from "path";
import {
  evaluateHandPlacementReliability,
  getBestGraspOverlapFraction,
  isGraspRegionPlausible,
  mergeGraspRegionsUnion,
  overlapsGraspRegion,
  pickRepresentativeGraspRegion,
  type HeldObjectPlacement,
  type HeldObjectRegion,
} from "../lib/detect-held-object-placement";

const ROOT = path.join(__dirname, "..");
const RAW_PATH = path.join(ROOT, "review", "90cha-overlap-raw.json");
const MIN_GRASP_OVERLAP = 0.4;
const BASELINE_89CHA = 0.25;

/** true grip / rubbing 대표 handRegion (86~87차 QA에서 관측된 범위) */
const HAND_REGIONS: Record<string, HeldObjectRegion[]> = {
  "true-grip-6767822": [{ xPct: 28, yPct: 35, wPct: 35, hPct: 45 }],
  "rubbing-6886590": [
    { xPct: 30, yPct: 40, wPct: 20, hPct: 25 },
    { xPct: 45, yPct: 50, wPct: 18, hPct: 22 },
  ],
};

type RawAttempt = {
  runIndex: number;
  reliable: boolean;
  rejectReason?: string;
  placement: HeldObjectPlacement | null;
  graspRegions: HeldObjectRegion[];
  bestGrasp: HeldObjectRegion | null;
  overlapFraction: number;
};

type RawCase = {
  name: string;
  attempts: RawAttempt[];
};

function simulateEnsembleForSession(params: {
  attempts: RawAttempt[];
  handRegions: HeldObjectRegion[];
}): {
  viaEnsemble: boolean;
  rawBestOverlap: number;
  ensembleOverlap: number;
  merged: HeldObjectRegion | null;
  plausible: boolean;
  rejectReason?: string;
} {
  const { attempts, handRegions } = params;
  const withPlacement = attempts.filter((a) => a.placement && a.graspRegions.length > 0);
  if (withPlacement.length === 0) {
    return {
      viaEnsemble: false,
      rawBestOverlap: 0,
      ensembleOverlap: 0,
      merged: null,
      plausible: false,
    };
  }

  const best = withPlacement.reduce((a, b) =>
    a.overlapFraction >= b.overlapFraction ? a : b,
  );
  const rawBestOverlap = best.overlapFraction;

  const representativeGrasps = withPlacement
    .map((a) => pickRepresentativeGraspRegion(a.placement, a.graspRegions))
    .filter((g): g is HeldObjectRegion => g !== null);

  const merged = mergeGraspRegionsUnion(representativeGrasps);
  if (!merged || !best.placement) {
    return {
      viaEnsemble: false,
      rawBestOverlap,
      ensembleOverlap: 0,
      merged,
      plausible: false,
    };
  }

  const plausible = handRegions.some((h) => isGraspRegionPlausible(merged, h, 0.6));
  const ensembleOverlap = getBestGraspOverlapFraction(best.placement, [merged]);
  const passesOverlap = overlapsGraspRegion(best.placement, [merged], MIN_GRASP_OVERLAP);

  const reliability = evaluateHandPlacementReliability({
    placement: best.placement as HeldObjectPlacement,
    handsVisible: true,
    handRegions,
    graspRegions: [merged],
    faceRegion: null,
    minGraspOverlapFraction: MIN_GRASP_OVERLAP,
  });

  const viaEnsemble =
    withPlacement.every((a) => a.rejectReason === "not-overlapping-grasp-region") &&
    plausible &&
    passesOverlap &&
    reliability.reliable;

  return {
    viaEnsemble,
    rawBestOverlap,
    ensembleOverlap,
    merged,
    plausible,
    rejectReason: reliability.rejectReason,
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8")) as {
    cases: RawCase[];
  };

  const summary: Record<string, unknown> = {
    source: "90cha-overlap-raw.json",
    note: "오프라인 replay — 실제 3회 retry 세션 bbox가 아닌 90cha 단일 호출 분포로 근사",
    baseline89chaTrueGripRate: BASELINE_89CHA,
    scenarios: [] as unknown[],
  };

  for (const c of raw.cases) {
    const handRegions = HAND_REGIONS[c.name] ?? [];
    const validAttempts = c.attempts.filter((a) => a.placement && a.graspRegions.length > 0);

    // 시나리오 A: 각 run을 best placement로, 전체 valid grasp 합집합 (상한)
    const upperBound = simulateEnsembleForSession({
      attempts: validAttempts,
      handRegions,
    });

    // 시나리오 B: 3-run sliding window (인접 run 3개씩 → 12 run 중 10 세션)
    const slidingSessions: ReturnType<typeof simulateEnsembleForSession>[] = [];
    for (let i = 0; i <= validAttempts.length - 3; i += 1) {
      slidingSessions.push(
        simulateEnsembleForSession({
          attempts: validAttempts.slice(i, i + 3),
          handRegions,
        }),
      );
    }

    // 시나리오 C: per-run — 해당 run 1개 grasp만 (ensemble 효과 없음, baseline)
    const perRunOnly = validAttempts.map((a) =>
      simulateEnsembleForSession({ attempts: [a], handRegions }),
    );

    const slidingViaEnsemble = slidingSessions.filter((s) => s.viaEnsemble).length;
    const slidingTotal = slidingSessions.length;

    const caseResult = {
      name: c.name,
      validAttempts: validAttempts.length,
      upperBoundAllGraspsMerged: upperBound,
      slidingWindow3: {
        sessions: slidingTotal,
        viaEnsembleCount: slidingViaEnsemble,
        rate: slidingTotal > 0 ? slidingViaEnsemble / slidingTotal : 0,
        details: slidingSessions.map((s, i) => ({
          windowStart: i + 1,
          ...s,
        })),
      },
      perRunSingleGrasp: {
        maxOverlap: Math.max(...perRunOnly.map((s) => s.rawBestOverlap), 0),
        viaEnsembleCount: 0,
      },
    };

    (summary.scenarios as unknown[]).push(caseResult);

    console.log(`\n[91cha-offline] === ${c.name} ===`);
    console.log(
      `[91cha-offline] upperBound merged overlap=${upperBound.ensembleOverlap.toFixed(3)} ` +
        `viaEnsemble=${upperBound.viaEnsemble} plausible=${upperBound.plausible}`,
    );
    console.log(
      `[91cha-offline] sliding-3 sessions=${slidingTotal} viaEnsemble=${slidingViaEnsemble}/${slidingTotal}`,
    );
    if (upperBound.merged) {
      console.log(`[91cha-offline] merged bbox=${JSON.stringify(upperBound.merged)}`);
    }
  }

  fs.writeFileSync(
    path.join(ROOT, "review", "91cha-ensemble-offline-replay.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  console.log("\n[91cha-offline] wrote review/91cha-ensemble-offline-replay.json");
}

main();
