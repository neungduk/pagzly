/**
 * 214차 — 라이프스타일 합성 매칭 3축 실사 (유료, 정확히 2건).
 *   npx tsx scripts/214cha-lifestyle-matching-live.ts
 *
 * TEST_MODE=false 강제. 3건째 금지. 1회 실패 시 즉시 중단.
 * 코드 변경 없음 — compositeProductOnLifestylePhoto만 호출 (pasteCutoutOnScene 경로).
 */
import fs from "fs";
import path from "path";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "214cha-live");
const ASSETS = path.join(__dirname, "test-assets");
const MAX_RUNS = 2;

type Case = {
  id: string;
  category: string;
  productName: string;
  productPath: string;
  lifestylePath: string;
};

const CASES: Case[] = [
  {
    id: "beauty",
    category: "화장품/뷰티",
    productName: "214차 매칭 검증 세럼",
    productPath: path.join(ASSETS, "_181cha-live", "beauty-6800936.jpeg"),
    lifestylePath: path.join(ASSETS, "_pixabay-cosmetics-run", "pixabay-6886590.jpg"),
  },
  {
    id: "electronics",
    category: "전자제품",
    productName: "214차 매칭 검증 이어폰",
    productPath: path.join(ASSETS, "_181cha-live", "electronics-6915262.jpeg"),
    lifestylePath: path.join(ASSETS, "_168cha-living", "hand-31203656.jpeg"),
  },
];

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

async function main() {
  loadEnvLocal();
  // 하드 가드레일: 이 스크립트는 항상 실과금 경로
  process.env.TEST_MODE = "false";

  if (!process.env.REPLICATE_API_TOKEN?.trim()) {
    throw new Error("REPLICATE_API_TOKEN missing");
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("ANTHROPIC_API_KEY missing (Vision grasp)");
  }

  fs.mkdirSync(OUT, { recursive: true });

  if (CASES.length !== MAX_RUNS) {
    throw new Error(`CASES must be exactly ${MAX_RUNS}`);
  }

  for (const c of CASES) {
    if (!fs.existsSync(c.productPath)) throw new Error(`missing product: ${c.productPath}`);
    if (!fs.existsSync(c.lifestylePath)) throw new Error(`missing lifestyle: ${c.lifestylePath}`);
  }

  console.log(`[214] TEST_MODE=${process.env.TEST_MODE} MAX_RUNS=${MAX_RUNS}`);
  console.log("[214] AI lifestyle shot / img2img: OFF (user lifestyle photo only)");

  const results: Array<Record<string, unknown>> = [];
  let totalCost = 0;
  let runCount = 0;

  for (const c of CASES) {
    if (runCount >= MAX_RUNS) {
      console.error("[214] HARD STOP — would exceed MAX_RUNS");
      break;
    }
    runCount += 1;
    console.log(`\n=== run ${runCount}/${MAX_RUNS}: ${c.id} (${c.category}) ===`);
    console.log(`product: ${path.basename(c.productPath)}`);
    console.log(`lifestyle: ${path.basename(c.lifestylePath)}`);

    try {
      const result = await compositeProductOnLifestylePhoto({
        lifestyleImageUrl: toDataUrl(c.lifestylePath),
        productImageUrl: toDataUrl(c.productPath),
        category: c.category,
        productName: c.productName,
      });

      totalCost += result.cost;
      const outName = `${c.id}-composite.png`;
      const outPath = path.join(OUT, outName);
      await downloadResult(result.url, outPath);

      // also copy inputs for report
      fs.copyFileSync(c.productPath, path.join(OUT, `${c.id}-product${path.extname(c.productPath)}`));
      fs.copyFileSync(
        c.lifestylePath,
        path.join(OUT, `${c.id}-lifestyle${path.extname(c.lifestylePath)}`),
      );

      const entry = {
        id: c.id,
        category: c.category,
        productName: c.productName,
        productFile: path.basename(c.productPath),
        lifestyleFile: path.basename(c.lifestylePath),
        composited: result.composited,
        method: result.method ?? null,
        fallbackReason: result.fallbackReason ?? null,
        cost: result.cost,
        output: outName,
      };
      results.push(entry);
      console.log(`[214] result:`, JSON.stringify(entry));

      if (!result.composited) {
        console.error(
          `[214] STOP — composited=false (${result.fallbackReason ?? "unknown"}). No retry.`,
        );
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[214] STOP — run ${runCount} failed: ${msg}`);
      results.push({
        id: c.id,
        category: c.category,
        error: msg,
        cost: 0,
      });
      break;
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    testMode: process.env.TEST_MODE,
    maxRuns: MAX_RUNS,
    runsAttempted: runCount,
    totalCost,
    results,
    note: "Calls compositeProductOnLifestylePhoto only (pasteCutoutOnScene + 211 matching axes). No /api/generate, no AI lifestyle img2img.",
  };
  const summaryPath = path.join(OUT, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n[214] summary → ${summaryPath}`);
  console.log(`[214] totalCost=$${totalCost.toFixed(4)} runs=${runCount}`);

  if (results.some((r) => r.error || r.composited === false)) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
