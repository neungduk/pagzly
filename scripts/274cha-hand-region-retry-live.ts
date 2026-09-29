/**
 * 274차 — 273차 hand-region 재시도 확장 실측 (유료, 정확히 1건).
 *   npx tsx scripts/274cha-hand-region-retry-live.ts
 *
 * 269차와 동일한 상품(유선 이어폰)·장면으로 compositeProductOnLifestylePhoto 직접 호출.
 * /api/generate·크레딧 미사용. 재실행 방지: review/274cha-live/.ran 잠금 파일이 있으면 유료 호출 전에 중단.
 */
import fs from "fs";
import path from "path";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "274cha-live");
const ASSETS = path.join(__dirname, "test-assets");
const LOCK = path.join(OUT, ".ran");

const CASE = {
  id: "wired-earphones",
  category: "전자제품",
  productName: "269차 유선 이어폰",
  productPath: path.join(ASSETS, "_269cha-pixelpaste", "wired-earphones-1540237.jpeg"),
  productSource: "https://www.pexels.com/photo/white-earphones-on-green-background-1540237/ (Emma Pollard)",
  lifestylePath: path.join(ASSETS, "전자기기-액세서리", "01-pexels-35599938.jpeg"),
};

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2]!.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

function toDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const mime = buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function saveResult(url: string, dest: string): Promise<void> {
  if (url.startsWith("data:")) {
    fs.writeFileSync(dest, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
    return;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`result download ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(LOCK)) {
    throw new Error(`이미 1회 실행됨(${LOCK}) — 재실행 금지. 유료 호출 없이 중단.`);
  }
  loadEnvLocal();
  process.env.TEST_MODE = "false";
  if (!process.env.REPLICATE_API_TOKEN?.trim()) throw new Error("REPLICATE_API_TOKEN missing");
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error("ANTHROPIC_API_KEY missing");
  for (const p of [CASE.productPath, CASE.lifestylePath]) {
    if (!fs.existsSync(p)) throw new Error(`missing asset: ${p}`);
  }

  fs.writeFileSync(LOCK, new Date().toISOString());

  const logPath = path.join(OUT, "run-log.txt");
  const logStream = fs.createWriteStream(logPath, { flags: "w" });
  const orig = { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) };
  const tee =
    (fn: (...a: unknown[]) => void) =>
    (...a: unknown[]) => {
      logStream.write(a.map((x) => (typeof x === "string" ? x : x instanceof Error ? x.stack ?? x.message : JSON.stringify(x))).join(" ") + "\n");
      fn(...a);
    };
  console.log = tee(orig.log) as typeof console.log;
  console.warn = tee(orig.warn) as typeof console.warn;
  console.error = tee(orig.error) as typeof console.error;

  console.log(`[274] TEST_MODE=${process.env.TEST_MODE} — 정확히 1건, /api/generate OFF`);
  console.log(`[274] LIFESTYLE_GRASP_ENSEMBLE_ENABLED=${process.env.LIFESTYLE_GRASP_ENSEMBLE_ENABLED ?? "(unset)"}`);
  console.log(`[274] product=${path.relative(ROOT, CASE.productPath)} lifestyle=${path.relative(ROOT, CASE.lifestylePath)}`);

  let result: Awaited<ReturnType<typeof compositeProductOnLifestylePhoto>> | null = null;
  let error: string | null = null;
  try {
    result = await compositeProductOnLifestylePhoto({
      lifestyleImageUrl: toDataUrl(CASE.lifestylePath),
      productImageUrl: toDataUrl(CASE.productPath),
      category: CASE.category,
      productName: CASE.productName,
    });
    await saveResult(result.url, path.join(OUT, "composite.png"));
    console.log(
      `[274] result: ${JSON.stringify({ composited: result.composited, method: result.method ?? null, fallbackReason: result.fallbackReason ?? null, placementConfidence: result.placementConfidence ?? null, cost: result.cost })}`,
    );
  } catch (err) {
    error = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error(`[274] 실행 오류 — 재시도 없이 중단: ${error}`);
  }

  fs.copyFileSync(CASE.productPath, path.join(OUT, `product${path.extname(CASE.productPath)}`));
  fs.copyFileSync(CASE.lifestylePath, path.join(OUT, `lifestyle${path.extname(CASE.lifestylePath)}`));

  console.log = orig.log;
  console.warn = orig.warn;
  console.error = orig.error;
  logStream.end();
  await new Promise<void>((resolve) => logStream.on("finish", () => resolve()));

  const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/);
  const summary = {
    generatedAt: new Date().toISOString(),
    runs: 1,
    product: path.relative(ROOT, CASE.productPath),
    productSource: CASE.productSource,
    lifestyle: path.relative(ROOT, CASE.lifestylePath),
    method: result?.method ?? null,
    composited: result?.composited ?? false,
    fallbackReason: result?.fallbackReason ?? null,
    placementConfidence: result?.placementConfidence ?? null,
    totalCostUsd: result?.cost ?? null,
    error,
    preCropLines: lines.filter((l) => l.includes("[preCrop]")),
    attemptLines: lines.filter((l) => l.includes("[lifestyle-cutout:")),
    bestLines: lines.filter((l) => l.includes("[lifestyle-cutout] best")),
    clarity: {
      skipped: lines.filter((l) => l.includes("sharpenCutout") && l.includes("호출 생략")),
      calls: lines.filter((l) => l.includes("clarity-upscaler ON")).length,
      throttleRetries: lines.filter((l) => l.includes("[replicate] clarity-upscaler throttle")),
      fallbacks: lines.filter((l) => l.includes("[sharpenCutout] FALLBACK") || l.includes("[sharpenCutout] clarity-upscaler 결과 URL 없음")),
    },
    handPlacement: {
      visionCalls: lines.filter((l) => l.includes("claude/handPlacementForProduct")).length,
      handRegionRetryLines: lines.filter((l) => l.includes("[hand-placement] retry (reason=not-overlapping-hand-region")),
      evalLines: lines.filter((l) => l.includes("[hand-placement] confidence=")),
      attemptLines: lines.filter((l) => l.includes("[hand-placement-retry]")),
    },
    otherThrottleRetries: lines.filter((l) => l.includes("throttle —") && !l.includes("clarity-upscaler")),
    stageLines: lines.filter((l) => l.includes("[lifestyle-composite]")),
    costLines: lines.filter((l) => l.includes("[cost]")),
  };
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("\n=== 274차 SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
