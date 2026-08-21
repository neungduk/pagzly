/**
 * 배경 제거 파이프라인 디버그 — cutout 알파 채널 검사.
 * 실행: npx tsx scripts/debug-cutout-alpha.ts [imageUrlOrPath]
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import Replicate from "replicate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "debug-cutout");

async function alphaStats(buffer: Buffer, label: string) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let transparent = 0;
  let semi = 0;
  for (let i = 0; i < total; i += 1) {
    const a = data[i * 4 + 3];
    if (a < 16) transparent += 1;
    else if (a < 240) semi += 1;
  }
  const stats = {
    label,
    width: info.width,
    height: info.height,
    transparentRatio: +(transparent / total).toFixed(4),
    semiTransparentRatio: +(semi / total).toFixed(4),
  };
  console.log(stats);
  return stats;
}

async function loadInput(arg?: string): Promise<{ url: string; label: string }> {
  if (arg?.startsWith("http")) return { url: arg, label: "cli-url" };
  const local =
    arg ??
    path.join(ROOT, "public", "iteration-fixtures", "01.jpg");
  if (!fs.existsSync(local)) {
    throw new Error(`이미지 없음: ${local}`);
  }
  const ext = path.extname(local).slice(1) || "jpeg";
  const b64 = fs.readFileSync(local).toString("base64");
  return { url: `data:image/${ext};base64,${b64}`, label: path.basename(local) };
}

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요");
  }

  fs.mkdirSync(OUT, { recursive: true });
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  const { url: sourceUrl, label } = await loadInput(process.argv[2]);
  console.log("source:", label);

  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("background-remover version 없음");
  const modelRef = `851-labs/background-remover:${versionId}` as `${string}/${string}:${string}`;

  console.log("model:", modelRef);
  const bgOutput = await replicate.run(modelRef, { input: { image: sourceUrl } });
  const cutoutUrl = Array.isArray(bgOutput) ? bgOutput[0] : bgOutput;
  if (typeof cutoutUrl !== "string") throw new Error("cutout URL 없음");
  console.log("851-labs output:", cutoutUrl.slice(0, 120));

  const cutoutRes = await fetch(cutoutUrl);
  const cutoutBuf = Buffer.from(await cutoutRes.arrayBuffer());
  fs.writeFileSync(path.join(OUT, "01-bg-remover.png"), cutoutBuf);
  const bgStats = await alphaStats(cutoutBuf, "851-labs");

  const CLARITY_REF =
    "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e";
  try {
    const upOutput = await replicate.run(CLARITY_REF, {
      input: { image: cutoutUrl },
      wait: { mode: "poll", interval: 1000 },
    });
    const upUrl = Array.isArray(upOutput) ? upOutput[0] : upOutput;
    if (typeof upUrl === "string") {
      const upRes = await fetch(upUrl);
      const upBuf = Buffer.from(await upRes.arrayBuffer());
      fs.writeFileSync(path.join(OUT, "02-clarity-upscaler.png"), upBuf);
      const upStats = await alphaStats(upBuf, "clarity-upscaler");
      if (bgStats.transparentRatio > 0.1 && upStats.transparentRatio < 0.05) {
        console.warn("⚠️ clarity-upscaler가 알파를 제거한 것으로 보임");
      }
    }
  } catch (err) {
    console.warn("clarity-upscaler 스킵:", err instanceof Error ? err.message : err);
  }

  console.log(`\n저장: ${OUT}/01-bg-remover.png , 02-clarity-upscaler.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
