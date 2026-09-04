/**
 * 90차 — labelDelta 측정 위치 vs crop/feather 경계 감사 + 동일 paste 재측정
 *   $env:TEST_MODE="false"; npx tsx scripts/90cha-labeldelta-sample-audit.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  REFINE_FEATHER_FRACTION,
  computeRefineCropRect,
  computeCropCoreRect,
  refineGraspAreaLocally,
  measureLabelOppositeColorDelta,
} from "../lib/lifestyle-product-composite";

import type { HeldObjectRegion } from "../lib/detect-held-object-placement";

const ROOT = path.join(__dirname, "..");
const SHOT_DIR = path.join(ROOT, "review", "qa-screenshots");

type SampleRectPx = { left: number; top: number; width: number; height: number };

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

function pctRegionToPx(
  region: HeldObjectRegion,
  sceneW: number,
  sceneH: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: Math.round(sceneW * (region.xPct / 100)),
    top: Math.round(sceneH * (region.yPct / 100)),
    width: Math.max(1, Math.round(sceneW * (region.wPct / 100))),
    height: Math.max(1, Math.round(sceneH * (region.hPct / 100))),
  };
}

/** production measureLabelOppositeColorDelta와 동일한 샘플 rect */
function computeLabelSampleRect(
  placement: HeldObjectRegion,
  graspRegion: HeldObjectRegion,
  sceneW: number,
  sceneH: number,
): SampleRectPx {
  const placementPx = pctRegionToPx(placement, sceneW, sceneH);
  const graspPx = pctRegionToPx(graspRegion, sceneW, sceneH);
  const graspCx = graspPx.left + graspPx.width / 2;
  const graspCy = graspPx.top + graspPx.height / 2;
  const placeCx = placementPx.left + placementPx.width / 2;
  const placeCy = placementPx.top + placementPx.height / 2;
  const dx = placeCx - graspCx;
  const dy = placeCy - graspCy;
  const len = Math.hypot(dx, dy) || 1;
  const sampleW = Math.max(4, Math.round(placementPx.width * 0.35));
  const sampleH = Math.max(4, Math.round(placementPx.height * 0.35));
  const sampleLeft = Math.round(
    Math.min(Math.max(0, placeCx + (dx / len) * (placementPx.width * 0.25) - sampleW / 2), sceneW - sampleW),
  );
  const sampleTop = Math.round(
    Math.min(Math.max(0, placeCy + (dy / len) * (placementPx.height * 0.25) - sampleH / 2), sceneH - sampleH),
  );
  return { left: sampleLeft, top: sampleTop, width: sampleW, height: sampleH };
}

/** 코어 안쪽으로 샘플 중심을 placement 중심 쪽으로 당긴 rect (감사용) */
function computeLabelSampleRectInCore(
  placement: HeldObjectRegion,
  graspRegion: HeldObjectRegion,
  cropCore: SampleRectPx,
  sceneW: number,
  sceneH: number,
): SampleRectPx {
  const base = computeLabelSampleRect(placement, graspRegion, sceneW, sceneH);
  const placementPx = pctRegionToPx(placement, sceneW, sceneH);
  const placeCx = placementPx.left + placementPx.width / 2;
  const placeCy = placementPx.top + placementPx.height / 2;
  let left = Math.round(placeCx - base.width / 2);
  let top = Math.round(placeCy - base.height / 2);
  left = Math.max(cropCore.left, Math.min(left, cropCore.left + cropCore.width - base.width));
  top = Math.max(cropCore.top, Math.min(top, cropCore.top + cropCore.height - base.height));
  return { left, top, width: base.width, height: base.height };
}

function rectIntersectionArea(a: SampleRectPx, b: SampleRectPx): number {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

function auditSampleVsCrop(
  sample: SampleRectPx,
  crop: SampleRectPx,
  core: SampleRectPx,
  featherFraction: number,
) {
  const sampleArea = sample.width * sample.height;
  const cropOverlap = rectIntersectionArea(sample, crop);
  const coreOverlap = rectIntersectionArea(sample, core);
  const featherBand = {
    left: crop.left,
    top: crop.top,
    width: crop.width,
    height: crop.height,
  };
  const outsideCrop = sampleArea - cropOverlap;
  const inFeatherOnly = cropOverlap - coreOverlap;
  const inCore = coreOverlap;

  return {
    sample,
    crop,
    core,
    featherFraction,
    sampleAreaPx: sampleArea,
    overlapWithCropPx: cropOverlap,
    overlapWithCorePx: inCore,
    overlapFeatherBandPx: inFeatherOnly,
    outsideCropPx: outsideCrop,
    pctOutsideCrop: outsideCrop / sampleArea,
    pctInFeatherBand: inFeatherOnly / sampleArea,
    pctInCore: inCore / sampleArea,
    touchesFeather: inFeatherOnly > 0,
    fullyInsideCore: inCore >= sampleArea * 0.99,
  };
}

async function measureDeltaAtRect(before: Buffer, after: Buffer, rect: SampleRectPx): Promise<number> {
  const sampleBefore = await sharp(before)
    .extract({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    .stats();
  const sampleAfter = await sharp(after)
    .extract({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    .stats();
  const b = sampleBefore.channels.slice(0, 3).map((c) => c.mean);
  const a = sampleAfter.channels.slice(0, 3).map((c) => c.mean);
  return Math.sqrt(b.reduce((sum, v, i) => sum + (v - (a[i] ?? 0)) ** 2, 0));
}

/** 88cha-probe 최종 run placement/grasp (로그 고정값) */
const PROBE_PLACEMENT = {
  xPct: 32,
  yPct: 28,
  wPct: 18,
  hPct: 45,
  rotationDeg: 8,
  confidence: "high" as const,
};
const PROBE_GRASP = { xPct: 38, yPct: 38, wPct: 8, hPct: 25 };

async function audit89chaLoggedParams() {
  const sceneW = 1280;
  const sceneH = 1920;
  const cases = [
    {
      label: "89cha-hard-edge-run",
      placement: { xPct: 38, yPct: 32, wPct: 18, hPct: 35, rotationDeg: 12, confidence: "high" as const },
      grasp: { xPct: 42, yPct: 55, wPct: 12, hPct: 25 },
    },
    {
      label: "89cha-feather-run",
      placement: { xPct: 35, yPct: 28, wPct: 20, hPct: 45, rotationDeg: 12, confidence: "high" as const },
      grasp: { xPct: 40, yPct: 42, wPct: 8, hPct: 20 },
    },
  ];

  return cases.map((c) => {
    const crop = computeRefineCropRect({
      sceneW,
      sceneH,
      placement: c.placement,
      graspRegion: c.grasp,
    });
    const core = computeCropCoreRect(crop, REFINE_FEATHER_FRACTION);
    const sample = computeLabelSampleRect(c.placement, c.grasp, sceneW, sceneH);
    const coreSample = computeLabelSampleRectInCore(c.placement, c.grasp, core, sceneW, sceneH);
    return {
      label: c.label,
      sampleAuditDefault: auditSampleVsCrop(sample, crop, core, REFINE_FEATHER_FRACTION),
      sampleAuditCoreAligned: auditSampleVsCrop(coreSample, crop, core, REFINE_FEATHER_FRACTION),
    };
  });
}

async function remeasureFromProbePaste(): Promise<{
  remeasureSamePaste: Record<string, unknown>;
  totalCost: number;
} | null> {
  const pastePath = path.join(SHOT_DIR, "88cha-probe-paste-before-refine.png");
  if (!fs.existsSync(pastePath)) return null;

  const pasted = fs.readFileSync(pastePath);
  const sceneMeta = await sharp(pasted).metadata();
  const sceneW = sceneMeta.width ?? 1280;
  const sceneH = sceneMeta.height ?? 1920;

  const cropRect = computeRefineCropRect({
    sceneW,
    sceneH,
    placement: PROBE_PLACEMENT,
    graspRegion: PROBE_GRASP,
  });
  const coreRect = computeCropCoreRect(cropRect, REFINE_FEATHER_FRACTION);

  let totalCost = 0;
  const hard = await refineGraspAreaLocally({
    compositeBuffer: pasted,
    cropRect,
    category: "화장품/뷰티",
    useFeather: false,
  });
  totalCost += hard.cost;
  await new Promise((r) => setTimeout(r, 15_000));

  const feather = await refineGraspAreaLocally({
    compositeBuffer: pasted,
    cropRect,
    category: "화장품/뷰티",
    useFeather: true,
  });
  totalCost += feather.cost;

  if (!hard.refined || !feather.refined) {
    return {
      remeasureSamePaste: {
        error: `refine failed hard=${hard.skipReason} feather=${feather.skipReason}`,
      },
      totalCost,
    };
  }

  const defaultSample = computeLabelSampleRect(PROBE_PLACEMENT, PROBE_GRASP, sceneW, sceneH);
  const coreSample = computeLabelSampleRectInCore(
    PROBE_PLACEMENT,
    PROBE_GRASP,
    coreRect,
    sceneW,
    sceneH,
  );

  return {
    remeasureSamePaste: {
      samePaste: true,
      source: "88cha-probe-paste-before-refine.png",
      placement: PROBE_PLACEMENT,
      grasp: PROBE_GRASP,
      defaultSample: {
        hardEdge: await measureLabelOppositeColorDelta(
          pasted,
          hard.buffer,
          PROBE_PLACEMENT,
          PROBE_GRASP,
          sceneW,
          sceneH,
        ),
        feather: await measureLabelOppositeColorDelta(
          pasted,
          feather.buffer,
          PROBE_PLACEMENT,
          PROBE_GRASP,
          sceneW,
          sceneH,
        ),
      },
      coreSample: {
        hardEdge: await measureDeltaAtRect(pasted, hard.buffer, coreSample),
        feather: await measureDeltaAtRect(pasted, feather.buffer, coreSample),
      },
      sampleAuditDefault: auditSampleVsCrop(
        defaultSample,
        cropRect,
        coreRect,
        REFINE_FEATHER_FRACTION,
      ),
      sampleAuditCoreAligned: auditSampleVsCrop(
        coreSample,
        cropRect,
        coreRect,
        REFINE_FEATHER_FRACTION,
      ),
    },
    totalCost,
  };
}

async function main() {
  const env = loadEnvLocal();
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  let totalCost = 0;
  const loggedParamAudit = await audit89chaLoggedParams();

  const probeRemeasure = await remeasureFromProbePaste();
  if (probeRemeasure) totalCost += probeRemeasure.totalCost;

  const summary = {
    logged89chaParamAudit: loggedParamAudit,
    probePasteRemeasure: probeRemeasure?.remeasureSamePaste,
    report89chaComparison: {
      note: "89차 reported values used 서로 다른 Vision run → placement/grasp 상이",
      reported: { hardEdge: 5.07, feather: 1.81 },
    },
    totalCost,
  };

  fs.writeFileSync(
    path.join(ROOT, "review", "90cha-labeldelta-audit.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`[90cha-label] total cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
