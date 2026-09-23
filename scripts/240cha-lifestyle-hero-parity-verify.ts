/**
 * 240차 — 라이프스타일 컷아웃 hero급 안전장치 검증.
 *   npx tsx scripts/240cha-lifestyle-hero-parity-verify.ts
 *
 * 유닛(API 0) + 실사진 유료 정확히 2건(전자제품·패션). 3건째 금지.
 * TEST_MODE=false 강제. /api/generate 미호출.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  compositeProductOnLifestylePhoto,
  isLifestyleCutoutAcceptable,
  scoreLifestyleCutout,
} from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "240cha-lifestyle-hero-parity");
const ASSETS = path.join(__dirname, "test-assets");
const MAX_LIVE_RUNS = 2;

type Case = {
  id: string;
  category: string;
  productName: string;
  productPath: string;
  lifestylePath: string;
};

const LIVE_CASES: Case[] = [
  {
    id: "electronics",
    category: "전자제품",
    productName: "240차 이어폰",
    productPath: path.join(ASSETS, "_181cha-live", "electronics-6915262.jpeg"),
    lifestylePath: path.join(ASSETS, "전자기기-액세서리", "01-pexels-35599938.jpeg"),
  },
  {
    id: "fashion",
    category: "의류/패션",
    productName: "240차 티셔츠",
    productPath: path.join(ASSETS, "_181cha-live", "fashion-9558265.jpeg"),
    lifestylePath: path.join(ASSETS, "의류-패션", "01-pexels-22441291.jpeg"),
  },
];

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log("OK", msg);
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

function sniff(buf: Buffer): "image/jpeg" | "image/png" {
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  return "image/jpeg";
}

function toDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:${sniff(buf)};base64,${buf.toString("base64")}`;
}

async function downloadResult(url: string, dest: string): Promise<void> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    fs.writeFileSync(dest, Buffer.from(b64, "base64"));
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`result download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function extractHeroScoreBody(src: string): string {
  const m = src.match(/function scoreCutout\(attempt: CutoutAttempt\): number \{([\s\S]*?)\n  \}/);
  if (!m) throw new Error("hero scoreCutout not found");
  return m[1]!.replace(/\s+/g, " ").trim();
}

function extractHeroAcceptBody(src: string): string {
  const m = src.match(
    /function isCutoutAcceptable\(attempt: CutoutAttempt\): boolean \{([\s\S]*?)\n  \}/,
  );
  if (!m) throw new Error("hero isCutoutAcceptable not found");
  return m[1]!.replace(/\s+/g, " ").trim();
}

function runUnitChecks() {
  for (const f of ["lib/photo-enhance.ts", "lib/lifestyle-product-composite.ts"]) {
    execSync(`npx esbuild "${f}" --bundle=false --format=esm --outfile=NUL`, {
      cwd: ROOT,
      stdio: "pipe",
      shell: true,
    });
    console.log("OK esbuild", f);
  }

  const enhance = fs.readFileSync(path.join(ROOT, "lib", "photo-enhance.ts"), "utf8");
  const lifestyle = fs.readFileSync(
    path.join(ROOT, "lib", "lifestyle-product-composite.ts"),
    "utf8",
  );

  assert(
    /export type PreCropOptions/.test(enhance) &&
      /export async function preCropSourceToProduct/.test(enhance) &&
      /export async function sharpenCutout/.test(enhance),
    "photo-enhance exports PreCropOptions + preCrop + sharpenCutout",
  );

  assert(
    lifestyle.includes("preCropSourceToProduct") &&
      lifestyle.includes("sharpenCutout") &&
      lifestyle.includes("detectCutoutHasHandOrPerson") &&
      lifestyle.includes("clarityUpscaler: 0.016"),
    "lifestyle imports hero parity pieces + clarity cost",
  );

  assert(
    lifestyle.includes("cutout-quality-below-threshold") &&
      lifestyle.includes("LIFESTYLE_CUTOUT_CORNER_ALPHA_FAIL = 40"),
    "quality gate + corner fail=40 present",
  );

  // Formula parity vs hero (constants + arithmetic identical)
  const heroScore = extractHeroScoreBody(enhance);
  assert(heroScore.includes("return -1000"), "hero score: hand -1000");
  assert(heroScore.includes("return -500"), "hero score: plate -500");
  assert(heroScore.includes("return -400"), "hero score: transparent -400");
  assert(heroScore.includes("return -300"), "hero score: corner -300");
  assert(
    heroScore.includes("* 120") &&
      heroScore.includes("* 0.8") &&
      heroScore.includes("* 45") &&
      heroScore.includes("* 20"),
    "hero score: weights 120/0.8/45/20",
  );

  const heroAccept = extractHeroAcceptBody(enhance);
  assert(
    heroAccept.includes(">= 0.05") && heroAccept.includes("< CUTOUT_CORNER_ALPHA_FAIL"),
    "hero accept thresholds",
  );

  // Numeric parity: same inputs → same scores
  const sample = {
    handContaminated: false,
    plateRisk: { risky: false, opaqueAreaRatio: 0.1, softAlphaRatio: 0.05 },
    transparentRatio: 0.4,
    cornerMaxAlpha: 10,
  };
  const expected =
    0.4 * 120 - 10 * 0.8 - 0.1 * 45 - 0.05 * 20;
  assert(
    Math.abs(scoreLifestyleCutout(sample) - expected) < 1e-9,
    `scoreLifestyleCutout numeric = ${expected}`,
  );
  assert(isLifestyleCutoutAcceptable(sample), "acceptable sample passes");
  assert(
    scoreLifestyleCutout({ ...sample, handContaminated: true }) === -1000,
    "hand contamination → -1000",
  );
  assert(
    !isLifestyleCutoutAcceptable({
      ...sample,
      plateRisk: { risky: true, opaqueAreaRatio: 0.1, softAlphaRatio: 0.05 },
    }),
    "plate risky not acceptable",
  );

  // Retry loop present (3 cropAttempts)
  assert(
    (lifestyle.match(/pad: 0\.04/g) || []).length >= 1 &&
      lifestyle.includes("pad: 0.025") &&
      lifestyle.includes("pad: 0.012") &&
      lifestyle.includes("skipIfBoxAreaAbove: 0.95"),
    "3-stage cropAttempts match hero",
  );

  // Call site: no duplicate trim after removeProductBackground in paste path
  const pasteIdx = lifestyle.indexOf("const cutout = await removeProductBackground");
  const pasteBlock = lifestyle.slice(pasteIdx, pasteIdx + 2500);
  assert(
    pasteBlock.includes("cutout.cutoutBuffer") &&
      !pasteBlock.includes("trimCutoutToOpaqueBounds(cutoutImage"),
    "paste uses cutoutBuffer; no duplicate trim on cutoutImage",
  );

  // Untouched files mtime check deferred to caller with before snapshot
}

async function runLive() {
  loadEnvLocal();
  process.env.TEST_MODE = "false";

  if (!process.env.REPLICATE_API_TOKEN?.trim()) {
    throw new Error("REPLICATE_API_TOKEN missing");
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  assert(LIVE_CASES.length === MAX_LIVE_RUNS, `exactly ${MAX_LIVE_RUNS} live cases`);

  for (const c of LIVE_CASES) {
    if (!fs.existsSync(c.productPath)) throw new Error(`missing product: ${c.productPath}`);
    if (!fs.existsSync(c.lifestylePath)) throw new Error(`missing lifestyle: ${c.lifestylePath}`);
  }

  const logPath = path.join(OUT, "run-log.txt");
  const logStream = fs.createWriteStream(logPath, { flags: "w" });
  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origErr = console.error.bind(console);
  const tee =
    (fn: (...a: unknown[]) => void) =>
    (...a: unknown[]) => {
      const line = a
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join(" ");
      logStream.write(line + "\n");
      fn(...a);
    };
  console.log = tee(origLog) as typeof console.log;
  console.warn = tee(origWarn) as typeof console.warn;
  console.error = tee(origErr) as typeof console.error;

  const results: Array<Record<string, unknown>> = [];
  let totalCost = 0;
  let runCount = 0;
  let qualityDropCount = 0;

  console.log(`[240] TEST_MODE=${process.env.TEST_MODE} MAX_LIVE_RUNS=${MAX_LIVE_RUNS}`);
  console.log("[240] /api/generate OFF — compositeProductOnLifestylePhoto only");

  for (const c of LIVE_CASES) {
    if (runCount >= MAX_LIVE_RUNS) {
      console.error("[240] HARD STOP — would exceed MAX_LIVE_RUNS");
      break;
    }
    runCount += 1;
    console.log(`\n=== run ${runCount}/${MAX_LIVE_RUNS}: ${c.id} (${c.category}) ===`);

    const caseLogStart = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

    try {
      const result = await compositeProductOnLifestylePhoto({
        lifestyleImageUrl: toDataUrl(c.lifestylePath),
        productImageUrl: toDataUrl(c.productPath),
        category: c.category,
        productName: c.productName,
      });

      totalCost += result.cost;
      if (result.fallbackReason === "cutout-quality-below-threshold") {
        qualityDropCount += 1;
      }

      const outName = `${c.id}-composite.png`;
      await downloadResult(result.url, path.join(OUT, outName));
      fs.copyFileSync(c.productPath, path.join(OUT, `${c.id}-product${path.extname(c.productPath)}`));
      fs.copyFileSync(
        c.lifestylePath,
        path.join(OUT, `${c.id}-lifestyle${path.extname(c.lifestylePath)}`),
      );

      // Parse this run's cutout attempt lines from tee buffer — re-read full log later
      const entry = {
        id: c.id,
        category: c.category,
        productName: c.productName,
        composited: result.composited,
        method: result.method ?? null,
        fallbackReason: result.fallbackReason ?? null,
        cost: result.cost,
        output: outName,
        caseLogByteOffset: caseLogStart,
      };
      results.push(entry);
      console.log(`[240] result:`, JSON.stringify(entry));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[240] case error ${c.id}: ${msg}`);
      results.push({ id: c.id, error: msg, cost: 0 });
    }
  }

  console.log = origLog;
  console.warn = origWarn;
  console.error = origErr;
  logStream.end();
  await new Promise<void>((resolve) => logStream.on("finish", () => resolve()));

  const fullLog = fs.readFileSync(logPath, "utf8");
  const attemptLines = fullLog
    .split(/\r?\n/)
    .filter((l) => l.includes("[lifestyle-cutout:"));
  const bestLines = fullLog
    .split(/\r?\n/)
    .filter((l) => l.includes("[lifestyle-cutout] best"));
  const sharpenOns = (fullLog.match(/clarity-upscaler ON/g) || []).length;
  const rembgCalls = (fullLog.match(/851-labs\/background-remover/g) || []).length;
  const handHits = attemptLines.filter((l) => /hand=true/.test(l)).length;
  const qualityWarns = (
    fullLog.match(/cutout quality below threshold after retries/g) || []
  ).length;

  const summary = {
    generatedAt: new Date().toISOString(),
    testMode: process.env.TEST_MODE,
    maxLiveRuns: MAX_LIVE_RUNS,
    runsAttempted: runCount,
    totalCost,
    qualityDropCount,
    qualityWarns,
    attemptLines,
    bestLines,
    sharpenUpscalerOns: sharpenOns,
    rembgLogMentions: rembgCalls,
    handContaminatedAttempts: handHits,
    results,
    note: "Exactly 2 live composites. Hero-parity rembg retry + hand check + clarity. No /api/generate.",
  };
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));

  console.log("\n=== LIVE SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  assert(runCount === MAX_LIVE_RUNS, `ran exactly ${MAX_LIVE_RUNS} live cases`);
  assert(attemptLines.length >= 1, "at least one lifestyle-cutout attempt logged");
  assert(bestLines.length >= 1, "best score logged");

  return summary;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const mtimeBefore = {
    photoComposite: fs.statSync(path.join(ROOT, "lib", "photo-composite.ts")).mtimeMs,
    generateLifestyle: fs.statSync(path.join(ROOT, "lib", "generate-lifestyle-shots.ts"))
      .mtimeMs,
  };

  runUnitChecks();

  const skipLive = process.env.SKIP_LIVE === "1";
  let summary: Record<string, unknown> | null = null;
  if (skipLive) {
    console.log("SKIP_LIVE=1 — unit only");
  } else {
    summary = await runLive();
  }

  const mtimeAfter = {
    photoComposite: fs.statSync(path.join(ROOT, "lib", "photo-composite.ts")).mtimeMs,
    generateLifestyle: fs.statSync(path.join(ROOT, "lib", "generate-lifestyle-shots.ts"))
      .mtimeMs,
  };
  assert(
    mtimeBefore.photoComposite === mtimeAfter.photoComposite,
    "photo-composite.ts mtime unchanged",
  );
  assert(
    mtimeBefore.generateLifestyle === mtimeAfter.generateLifestyle,
    "generate-lifestyle-shots.ts mtime unchanged",
  );

  fs.writeFileSync(
    path.join(OUT, "unit-ok.json"),
    JSON.stringify({ ok: true, skipLive, summaryCost: summary?.totalCost ?? null }, null, 2),
  );

  console.log("API generate: 0 (/api/generate unused)");
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
