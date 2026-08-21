/**
 * 반려동물 texture 사진(pexels-10994369)으로 사전 크롭 + 배경 제거 진단.
 * 실행: $env:REPLICATE_API_TOKEN=...; $env:ANTHROPIC_API_KEY=...; npx tsx scripts/debug-pet-cutout.ts
 */

import Replicate from "replicate";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// .env.local 수동 로드 (dotenv 미설치)
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}
import { measureTransparentRatio } from "@/lib/photo-composite";
import { detectProductRegion } from "@/lib/vision-utils";

const IMAGE_PATH = path.join(
  __dirname,
  "test-assets",
  "반려동물",
  "03-pexels-10994369.jpeg",
);
const PRODUCT_NAME = "강아지 리드줄";
const OUT_DIR = path.join(__dirname, "..", "review", "debug-pet");

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");
  delete process.env.TEST_MODE;
  if (!fs.existsSync(IMAGE_PATH)) throw new Error(`파일 없음: ${IMAGE_PATH}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  const raw = fs.readFileSync(IMAGE_PATH);
  const meta = await sharp(raw).metadata();
  const sw = meta.width ?? 1;
  const sh = meta.height ?? 1;
  console.log(`[source] ${path.basename(IMAGE_PATH)} ${sw}x${sh} ${meta.format}`);

  // ── 1. detectProductRegion ──
  console.log(`\n[step 1] detectProductRegion('${PRODUCT_NAME}')...`);
  const { box, cost: detectCost } = await detectProductRegion(raw, PRODUCT_NAME, "image/jpeg");
  console.log(`[detectProductRegion] cost=$${detectCost.toFixed(4)}`);

  if (!box) {
    console.log("[detectProductRegion] 결과: null (상품 감지 실패)");
    console.log("사전 크롭 불가 — 원본 그대로 배경제거로 진행합니다.");
  } else {
    const boxArea = (box.xMax - box.xMin) * (box.yMax - box.yMin);
    console.log(
      `[detectProductRegion] box: [${box.xMin.toFixed(3)},${box.yMin.toFixed(3)}]→[${box.xMax.toFixed(3)},${box.yMax.toFixed(3)}] area=${(boxArea * 100).toFixed(1)}%`,
    );

    if (boxArea >= 0.90) {
      console.log(`[preCrop] box 면적 ≥ 90% — 크롭 스킵`);
    } else {
      const pad = 0.08;
      const cropLeft = Math.max(0, Math.round((box.xMin - pad) * sw));
      const cropTop = Math.max(0, Math.round((box.yMin - pad) * sh));
      const cropRight = Math.min(sw, Math.round((box.xMax + pad) * sw));
      const cropBottom = Math.min(sh, Math.round((box.yMax + pad) * sh));
      const cropW = Math.max(1, cropRight - cropLeft);
      const cropH = Math.max(1, cropBottom - cropTop);

      console.log(`[preCrop] crop region: [${cropLeft},${cropTop} ${cropW}x${cropH}]`);

      const croppedBuf = await sharp(raw)
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .png()
        .toBuffer();

      fs.writeFileSync(path.join(OUT_DIR, "pre-crop.png"), croppedBuf);
      console.log(`[saved] ${OUT_DIR}/pre-crop.png`);

      // ── 2. 크롭된 이미지로 배경 제거 ──
      console.log("\n[step 2] 크롭 이미지로 배경제거...");
      const model = await replicate.models.get("851-labs", "background-remover");
      const versionId = model.latest_version?.id;
      if (!versionId) throw new Error("background-remover 모델 버전 조회 실패");
      const ref = `851-labs/background-remover:${versionId}` as const;

      const dataUri = `data:image/png;base64,${croppedBuf.toString("base64")}`;
      const output = await replicate.run(ref, { input: { image: dataUri } });
      const cutoutUrl = Array.isArray(output) ? output[0] : output;
      if (!cutoutUrl || typeof cutoutUrl !== "string") {
        console.error("[FAIL] 배경 제거 URL 없음:", JSON.stringify(output));
        return;
      }

      const res = await fetch(cutoutUrl);
      if (!res.ok) {
        console.error("[FAIL] cutout fetch 실패:", res.status);
        return;
      }
      const cutoutBuffer = Buffer.from(await res.arrayBuffer());
      const cutoutMeta = await sharp(cutoutBuffer).metadata();
      console.log(
        `[cutout] ${cutoutMeta.width}x${cutoutMeta.height} format=${cutoutMeta.format} channels=${cutoutMeta.channels} hasAlpha=${cutoutMeta.hasAlpha}`,
      );

      const transparentRatio = await measureTransparentRatio(cutoutBuffer);
      console.log(`[cutout] transparentRatio=${transparentRatio.toFixed(4)}`);

      const belowThreshold = transparentRatio < 0.05;
      console.log(
        `[cutout] 0.05 미만 여부: ${belowThreshold} → ${belowThreshold ? "fallback 대상" : "정상 합성 진행"}`,
      );

      fs.writeFileSync(path.join(OUT_DIR, "cutout-after-precrop.png"), cutoutBuffer);
      console.log(`[saved] ${OUT_DIR}/cutout-after-precrop.png`);

      // 알파 히스토그램
      const { data } = await sharp(cutoutBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const bins = new Array(10).fill(0);
      const total = (cutoutMeta.width ?? 1) * (cutoutMeta.height ?? 1);
      for (let i = 3; i < data.length; i += 4) {
        bins[Math.min(9, Math.floor(data[i] / 26))] += 1;
      }
      console.log("\n[alpha histogram]");
      const labels = [
        "0-25", "26-51", "52-77", "78-103", "104-129",
        "130-155", "156-181", "182-207", "208-233", "234-255",
      ];
      for (let i = 0; i < 10; i++) {
        console.log(`  ${labels[i]}: ${bins[i]} (${((bins[i] / total) * 100).toFixed(1)}%)`);
      }

      console.log(`\n=== 최종 경로: ${belowThreshold ? "fallback (원본 사용)" : "정상 합성"} ===`);
      return;
    }
  }

  // detectProductRegion 실패 또는 box가 90% 이상인 경우 — 원본으로 배경제거
  console.log("\n[step 2] 원본 이미지로 배경제거 (사전 크롭 없음)...");
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover 모델 버전 조회 실패");
  const ref = `851-labs/background-remover:${versionId}` as const;

  const dataUri = `data:image/jpeg;base64,${raw.toString("base64")}`;
  const output = await replicate.run(ref, { input: { image: dataUri } });
  const cutoutUrl = Array.isArray(output) ? output[0] : output;
  if (!cutoutUrl || typeof cutoutUrl !== "string") {
    console.error("[FAIL] 배경 제거 URL 없음:", JSON.stringify(output));
    return;
  }
  const res = await fetch(cutoutUrl);
  if (!res.ok) {
    console.error("[FAIL] cutout fetch 실패:", res.status);
    return;
  }
  const cutoutBuffer = Buffer.from(await res.arrayBuffer());
  const transparentRatio = await measureTransparentRatio(cutoutBuffer);
  console.log(`[cutout] transparentRatio=${transparentRatio.toFixed(4)} (원본 그대로)`);

  fs.writeFileSync(path.join(OUT_DIR, "cutout-no-precrop.png"), cutoutBuffer);
  console.log(`[saved] ${OUT_DIR}/cutout-no-precrop.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
