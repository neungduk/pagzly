/**
 * 사전 크롭 회귀 검증: 4개 카테고리 대표 이미지에서 detectProductRegion 결과 확인.
 * npx tsx scripts/regression-precrop-check.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { detectProductRegion } from "@/lib/vision-utils";
import { measureTransparentRatio } from "@/lib/photo-composite";
import Replicate from "replicate";

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
delete process.env.TEST_MODE;

const CASES = [
  { folder: "화장품-뷰티", file: "01-pexels-16008945.jpeg", product: "딥 버건디 앰플" },
  { folder: "전자제품", file: "01-pexels-10104890.jpeg", product: "오픈형 이어버드" },
  { folder: "의류-패션", file: "01-pexels-22441291.jpeg", product: "린넨 오버핏 셔츠" },
  { folder: "식품", file: "01-pexels-16513595.jpeg", product: "단백질 쉐이크 바닐라" },
];

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN 필요");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 필요");

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover 모델 버전 조회 실패");
  const ref = `851-labs/background-remover:${versionId}` as const;

  const outDir = path.join(__dirname, "..", "review", "regression-precrop");
  fs.mkdirSync(outDir, { recursive: true });

  for (const c of CASES) {
    const imgPath = path.join(__dirname, "test-assets", c.folder, c.file);
    if (!fs.existsSync(imgPath)) {
      console.error(`[SKIP] ${c.folder}/${c.file} 없음`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[${c.folder}] ${c.product} — ${c.file}`);
    console.log("=".repeat(60));

    const raw = fs.readFileSync(imgPath);
    const meta = await sharp(raw).metadata();
    console.log(`[source] ${meta.width}x${meta.height} ${meta.format}`);

    const { box, cost } = await detectProductRegion(raw, c.product, "image/jpeg");
    console.log(`[detectProductRegion] cost=$${cost.toFixed(4)}`);

    let bgRemoveInput: string;
    let label: string;

    if (!box) {
      console.log("[detectProductRegion] box: null → 원본 그대로 배경제거");
      bgRemoveInput = `data:image/jpeg;base64,${raw.toString("base64")}`;
      label = "original";
    } else {
      const boxArea = (box.xMax - box.xMin) * (box.yMax - box.yMin);
      console.log(
        `[detectProductRegion] box: [${box.xMin.toFixed(3)},${box.yMin.toFixed(3)}]→[${box.xMax.toFixed(3)},${box.yMax.toFixed(3)}] area=${(boxArea * 100).toFixed(1)}%`,
      );

      if (boxArea >= 0.90) {
        console.log(`[preCrop] 면적 ≥ 90% → 크롭 스킵`);
        bgRemoveInput = `data:image/jpeg;base64,${raw.toString("base64")}`;
        label = "skip-large";
      } else {
        const sw = meta.width ?? 1;
        const sh = meta.height ?? 1;
        const pad = 0.08;
        const cropLeft = Math.max(0, Math.round((box.xMin - pad) * sw));
        const cropTop = Math.max(0, Math.round((box.yMin - pad) * sh));
        const cropRight = Math.min(sw, Math.round((box.xMax + pad) * sw));
        const cropBottom = Math.min(sh, Math.round((box.yMax + pad) * sh));
        const cropW = Math.max(1, cropRight - cropLeft);
        const cropH = Math.max(1, cropBottom - cropTop);
        console.log(`[preCrop] crop: [${cropLeft},${cropTop} ${cropW}x${cropH}]`);

        const cropped = await sharp(raw)
          .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
          .png()
          .toBuffer();
        bgRemoveInput = `data:image/png;base64,${cropped.toString("base64")}`;
        label = "cropped";

        fs.writeFileSync(path.join(outDir, `${c.folder}-precrop.png`), cropped);
      }
    }

    console.log(`[bgRemove] input=${label}...`);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let output: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        output = await replicate.run(ref, { input: { image: bgRemoveInput } });
        break;
      } catch (e: any) {
        if (e?.response?.status === 429 && attempt < 4) {
          const wait = Math.max(10, Number(e?.response?.headers?.get?.("retry-after") || 10));
          console.log(`[rate-limit] ${wait}s 대기 후 재시도...`);
          await sleep(wait * 1000);
          continue;
        }
        throw e;
      }
    }
    const cutoutUrl = Array.isArray(output) ? output[0] : output;
    if (!cutoutUrl || typeof cutoutUrl !== "string") {
      console.error("[FAIL] 배경제거 URL 없음");
      continue;
    }
    const res = await fetch(cutoutUrl);
    if (!res.ok) { console.error("[FAIL] cutout fetch 실패"); continue; }
    const cutoutBuf = Buffer.from(await res.arrayBuffer());
    const ratio = await measureTransparentRatio(cutoutBuf);
    console.log(`[cutout] transparentRatio=${ratio.toFixed(4)} → ${ratio < 0.05 ? "FALLBACK" : "OK"}`);

    fs.writeFileSync(path.join(outDir, `${c.folder}-cutout.png`), cutoutBuf);
    console.log(`[saved] ${c.folder}-cutout.png`);
  }

  console.log("\n완료.");
}

main().catch((err) => { console.error(err); process.exit(1); });
