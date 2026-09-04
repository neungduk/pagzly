/**
 * 112차 — AI 사용샷 단독 저비용 검증 (페이지 생성 파이프라인 미경유)
 *
 * 기본: dry-run (비용 추정만, Replicate 호출 없음)
 * 유료 전체: CONFIRM_112_PAID=1 … --execute
 * 합성만(이미 빈손 씬 있음, Kontext 재호출 없음):
 *   CONFIRM_112_PAID=1 … --composite-only
 *
 * 환경(.env.local)은 파일로 수정하지 않음 — process.env만 스크립트 컨텍스트에서 override.
 */
import fs from "node:fs";
import path from "node:path";
import { estimateLifestyleShotUnitCostUsd } from "../lib/lifestyle-shot-config";
import { parseProductHeightCm } from "../lib/lifestyle-physical-scale";

const REVIEW = path.join(process.cwd(), "review");
const OUT_PNG = path.join(REVIEW, "112cha-lifestyle-composite-sample.png");
const EMPTY_PNG = path.join(REVIEW, "112cha-lifestyle-empty-scene.png");

/** 읽기만 — .env.local 파일은 수정하지 않음 */
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

/** 기본 픽스처 — glowiest 계열 재생에 쓰인 공개 URL이 없으면 CLI로 덮어쓰기 */
const DEFAULTS = {
  /** QA용 라벨 세럼병 (fx-moisture 장식컷 아님) */
  productImageUrl:
    process.env.LIFESHOT_TEST_PRODUCT_URL?.trim() ||
    "https://sblnthhayvrfkvaksest.supabase.co/storage/v1/object/public/images/2f01ed61-ed80-465d-9c1a-712bbf01a658/1787899786236-cefc3ece-e3fe-4173-b9e9-0c114afa90de-enhanced.png",
  category: "화장품/뷰티",
  productName: "드림글로우 카멜리아 에센스 미스트",
  productSizeHint: "35mL, 높이 약 9cm",
  userId: "112cha-isolated-test",
};

function sniffImageMediaType(buffer: Buffer): "image/jpeg" | "image/png" {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  return "image/jpeg";
}

function bufferToDataUrl(buffer: Buffer): string {
  const mediaType = sniffImageMediaType(buffer);
  return `data:${mediaType};base64,${buffer.toString("base64")}`;
}

function estimateUsd(): { kontext: number; rembg: number; visionApprox: number; totalHi: number } {
  const kontext = estimateLifestyleShotUnitCostUsd({
    enabled: true,
    maxCount: 1,
    qualityLevel: "standard",
    resolution: "768",
    minUploadCount: 1,
  });
  const rembg = 0.00047;
  const visionApprox = 0.02;
  return {
    kontext,
    rembg,
    visionApprox,
    totalHi: kontext + rembg + visionApprox + 0.01,
  };
}

function printCostReport(mode: "full" | "composite-only") {
  const e = estimateUsd();
  console.log("\n=== 112차 예상 비용 ===");
  if (mode === "full") {
    console.log(`  Kontext empty scene:  ~$${e.kontext.toFixed(3)} (flat)`);
  } else {
    console.log("  Kontext empty scene:  $0 (기존 빈손 씬 재사용)");
  }
  console.log(`  Background remove:    ~$${e.rembg.toFixed(4)}`);
  console.log(`  Grasp Vision (Haiku): ~$${e.visionApprox.toFixed(3)} (상한 추정)`);
  const hi =
    mode === "full" ? e.totalHi : e.rembg + e.visionApprox + 0.01;
  console.log(`  합계 상한 추정:       ~$${hi.toFixed(3)}`);
  console.log("=====================================================\n");
}

async function resolveProductUrl(): Promise<string> {
  const fromArg = process.argv.find((a) => a.startsWith("--url="));
  if (fromArg) return fromArg.slice("--url=".length);
  return DEFAULTS.productImageUrl;
}

/** 이전 실행에서 sample에 저장된 빈손 씬을 empty 경로로 승격 */
function ensureEmptySceneFromPriorSample() {
  if (fs.existsSync(EMPTY_PNG)) return;
  if (!fs.existsSync(OUT_PNG)) return;
  fs.copyFileSync(OUT_PNG, EMPTY_PNG);
  console.log(`[112] promoted prior sample → ${EMPTY_PNG}`);
}

async function runCompositeOnly(productImageUrl: string) {
  ensureEmptySceneFromPriorSample();
  if (!fs.existsSync(EMPTY_PNG)) {
    throw new Error(
      `빈손 씬 없음: ${EMPTY_PNG} — 먼저 --execute 로 Kontext 씬을 생성하세요.`,
    );
  }
  const emptyBuf = fs.readFileSync(EMPTY_PNG);
  const lifestyleImageUrl = bufferToDataUrl(emptyBuf);
  const height = parseProductHeightCm(DEFAULTS.productSizeHint);

  const { compositeProductOnLifestylePhoto } = await import(
    "../lib/lifestyle-product-composite"
  );

  const composite = await compositeProductOnLifestylePhoto({
    lifestyleImageUrl,
    productImageUrl,
    category: DEFAULTS.category,
    productName: DEFAULTS.productName,
    productHeightCm: height,
    requirePixelPaste: true,
  });

  console.log("\n=== 112차 composite-only 결과 ===");
  console.log(`  composited: ${composite.composited}`);
  console.log(`  method: ${composite.method ?? "-"}`);
  console.log(`  fallbackReason: ${composite.fallbackReason ?? "-"}`);
  console.log(`  billed cost: $${composite.cost.toFixed(4)}`);

  if (
    composite.composited &&
    (composite.method === "pixel-paste" ||
      composite.method === "pixel-paste+grasp-refine")
  ) {
    const b64 = composite.url.startsWith("data:")
      ? composite.url.slice(composite.url.indexOf(",") + 1)
      : null;
    if (b64) {
      fs.mkdirSync(REVIEW, { recursive: true });
      fs.writeFileSync(OUT_PNG, Buffer.from(b64, "base64"));
      console.log(`  wrote ${OUT_PNG}`);
    } else {
      const res = await fetch(composite.url);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(REVIEW, { recursive: true });
      fs.writeFileSync(OUT_PNG, buf);
      console.log(`  wrote ${OUT_PNG}`);
    }
  } else {
    console.warn("합성 실패 — 검출/스케일/치수 폐기. 후속 브리프 검토.");
  }
}

async function runFull(productImageUrl: string) {
  const { generateLifestyleShots: gen } = await import(
    "../lib/generate-lifestyle-shots"
  );

  const result = await gen({
    productImageUrl,
    referenceStoragePath: `${DEFAULTS.userId}/112cha-ref.png`,
    category: DEFAULTS.category,
    productName: DEFAULTS.productName,
    productSizeHint: DEFAULTS.productSizeHint,
    uploadCount: 3,
    userId: DEFAULTS.userId,
    draftToken: "112cha-isolated",
    uploadPng: async (storagePath, buffer) => {
      fs.mkdirSync(REVIEW, { recursive: true });
      // fetch()는 file:// 불가 — data URL로 넘김
      if (storagePath.includes("-px")) {
        fs.writeFileSync(OUT_PNG, buffer);
        console.log(`[112] wrote composite ${OUT_PNG} (${buffer.length} bytes)`);
      } else if (storagePath.includes("lifestyle-ai")) {
        fs.writeFileSync(EMPTY_PNG, buffer);
        console.log(`[112] wrote empty scene ${EMPTY_PNG} (${buffer.length} bytes)`);
      }
      return {
        publicUrl: bufferToDataUrl(buffer),
        path: storagePath,
      };
    },
  });

  console.log("\n=== 112차 실행 결과 ===");
  console.log(`  shots: ${result.shots.length}`);
  console.log(`  billed cost (router+composite sum): $${result.totalCost.toFixed(4)}`);
  for (const s of result.shots) {
    console.log(`  - ${s.label}: ${s.path} cost=$${s.cost.toFixed(4)}`);
  }
  if (result.shots.length === 0) {
    console.warn("합성 컷 0장 — 검출/스케일/치수 폐기. 후속 브리프 필요 여부 검토.");
  } else {
    console.log(`  육안 확인 파일: ${OUT_PNG}`);
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  const compositeOnly = process.argv.includes("--composite-only");

  if (!execute && !compositeOnly) {
    printCostReport("full");
    const height = parseProductHeightCm(DEFAULTS.productSizeHint);
    console.log(`[112] productSizeHint parse heightCm=${height}`);
    console.log(
      "dry-run 종료.\n  전체: CONFIRM_112_PAID=1 npx tsx scripts/112cha-lifestyle-composite-isolated-test.ts --execute\n  합성만: CONFIRM_112_PAID=1 npx tsx scripts/112cha-lifestyle-composite-isolated-test.ts --composite-only",
    );
    return;
  }

  printCostReport(compositeOnly ? "composite-only" : "full");
  console.log(
    `[112] productSizeHint parse heightCm=${parseProductHeightCm(DEFAULTS.productSizeHint)}`,
  );

  if (process.env.CONFIRM_112_PAID !== "1") {
    console.error("거부: CONFIRM_112_PAID=1 이 없으면 실행하지 않습니다.");
    process.exit(1);
  }

  loadEnvLocal();

  const prevTest = process.env.TEST_MODE;
  const prevRouter = process.env.IMAGE_ROUTER_ENABLED;
  const prevMin = process.env.LIFESTYLE_SHOT_MIN_UPLOADS;
  const prevMax = process.env.LIFESTYLE_SHOT_MAX_COUNT;
  const prevEnabled = process.env.LIFESTYLE_SHOTS_ENABLED;
  const prevJobTrack = process.env.IMAGE_JOB_TRACKING;

  process.env.TEST_MODE = "false";
  process.env.IMAGE_ROUTER_ENABLED = "true";
  process.env.LIFESTYLE_SHOTS_ENABLED = "true";
  process.env.LIFESTYLE_SHOT_MIN_UPLOADS = "1";
  process.env.LIFESTYLE_SHOT_MAX_COUNT = "1";
  process.env.IMAGE_JOB_TRACKING = "false";

  try {
    const productImageUrl = await resolveProductUrl();
    if (compositeOnly) {
      await runCompositeOnly(productImageUrl);
    } else {
      await runFull(productImageUrl);
    }
  } finally {
    process.env.TEST_MODE = prevTest;
    process.env.IMAGE_ROUTER_ENABLED = prevRouter;
    process.env.LIFESTYLE_SHOT_MIN_UPLOADS = prevMin;
    process.env.LIFESTYLE_SHOT_MAX_COUNT = prevMax;
    process.env.LIFESTYLE_SHOTS_ENABLED = prevEnabled;
    process.env.IMAGE_JOB_TRACKING = prevJobTrack;
    console.log(`[112] restored TEST_MODE=${process.env.TEST_MODE ?? "(unset)"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
