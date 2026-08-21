/**
 * Phase 1: 마스크 기반 flux-fill-dev 배경 실험 (프로덕션 파이프라인 미사용).
 *
 * 현재 generateBackdrop()은 단색 캔버스 + 전체 흰색 마스크로 fill-dev를
 * 배경 생성기로만 쓰고, 컷아웃은 sharp로 나중에 얹는다.
 * 이 스크립트는 컷아웃을 먼저 배치한 뒤 제품 실루엣만 검정(유지)으로 가려
 * 모델이 실루엣을 보고 주변을 그리게 한다.
 *
 * 실행: npx tsx scripts/experiment-masked-backdrop.ts
 * 입력: review/debug-cutout/v2-run/*.png (이미 알파 검증된 컷아웃)
 * 출력: review/masked-backdrop-experiment/
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import Replicate from "replicate";
import { resolvePhotographyTemplate } from "../lib/backdrop-prompt-templates";
import { getCategoryTheme } from "../lib/category-theme";
import { describeColorTone } from "../lib/color-extract";
import { formatConceptPromptBlock, type ConceptBrief } from "../lib/concept-brief";
import { featherCutout, matchCutoutWhiteBalance } from "../lib/photo-composite";
import {
  computeSafeCanvasPlacement,
  DEFAULT_SHADOW,
  lightingLockPrompt,
} from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const CUTOUT_DIR = path.join(ROOT, "review", "debug-cutout", "v2-run");
const OUT_DIR = path.join(ROOT, "review", "masked-backdrop-experiment");

/** generateBackdrop()이 fill-dev에 넘기는 캔버스와 동일 (FILL_BASE_SIZE). */
const CANVAS_SIZE = 1024;
const MASK_BLUR = 6;
const ALPHA_KEEP_THRESHOLD = 16;
const CANDIDATE_COUNT = 2;
const FLUX_FILL_DEV_USD = 0.025;
const FLUX_FILL_TIMEOUT_MS = 180000;

const FLUX_FILL_DEV_REF =
  "black-forest-labs/flux-fill-dev:a053f84125613d83e65328a289e14eb6639e10725c243e8fb0c24128e5573f4c" as const;

const BACKDROP_PROMPTS: Record<string, string> = {
  "화장품/뷰티":
    "minimalist skincare studio background, empty dimensional set, MATCH the product lighting lock exactly, no golden hour, no amber gel, empty product photography backdrop, no text, no logo, no product",
};

const CANDIDATE_VARIATIONS = [
  "identical color temperature to the lighting lock, more negative space around empty center",
  "identical color temperature to the lighting lock, slightly closer surface plane",
];

const EXPERIMENT_BRIEF: ConceptBrief = {
  theme: "수분/보습",
  motif_keywords: ["물방울", "결로", "수분", "촉촉"],
  mood: "시원하고 맑은 수분감이 느껴지는 무드",
  backdrop_hint:
    "soft side lighting with a pale blue gradient backdrop, gentle diffusion, subtle condensation droplets on a clear glass surface, high-key brightness, clean composition with negative space",
  copy_tone: "담백하고 촉촉한",
  decor_prompt: "soft water droplets and mist at frame edges",
  icon_style: "minimal line icon",
};

const CUTOUTS: Array<{ id: string; file: string }> = [
  { id: "hero", file: "1787037641009-cutout.png" },
  { id: "ingredient", file: "1787037659450-cutout.png" },
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 타임아웃 (${ms}ms)`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function extractFluxImageUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function buildPrompt(category: string): string {
  const theme = getCategoryTheme(category);
  const shadow = DEFAULT_SHADOW;
  const photography = resolvePhotographyTemplate(EXPERIMENT_BRIEF);
  const conceptBlock = `, ${formatConceptPromptBlock(EXPERIMENT_BRIEF)}`;
  const lock = lightingLockPrompt(shadow);
  const accentClause =
    shadow.colorTemperature === "warm"
      ? `subtle ${describeColorTone(theme.accent)} accent lighting`
      : "no warm accent gel, no amber bounce, keep white balance locked to the product";
  const basePrompt = BACKDROP_PROMPTS[category] ?? BACKDROP_PROMPTS["화장품/뷰티"];
  return `${basePrompt}${conceptBlock}, ${photography.prompt}, ${lock}, ${accentClause}, soft ${describeColorTone(theme.baseNeutral)} set color without shifting key light`;
}

async function buildSolidCanvas(hexColor: string, size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: hexColor,
    },
  })
    .png()
    .toBuffer();
}

async function buildFullWhiteMask(size: number): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#FFFFFF",
    },
  })
    .png()
    .toBuffer();
}

async function placeCutoutOnCanvas(
  cutout: Buffer,
  canvasHex: string,
): Promise<{
  canvas: Buffer;
  resizedCutout: Buffer;
  left: number;
  top: number;
  targetW: number;
  targetH: number;
}> {
  const meta = await sharp(cutout).metadata();
  const rawW = meta.width ?? 1;
  const rawH = meta.height ?? 1;
  const placement = computeSafeCanvasPlacement(CANVAS_SIZE, rawW, rawH, []);
  const targetW = Math.max(1, Math.round(rawW * placement.scale));
  const targetH = Math.max(1, Math.round(rawH * placement.scale));
  const resizedCutout = await sharp(cutout)
    .resize(targetW, targetH, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const base = await buildSolidCanvas(canvasHex, CANVAS_SIZE);
  const canvas = await sharp(base)
    .composite([{ input: resizedCutout, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
  return {
    canvas,
    resizedCutout,
    left: placement.left,
    top: placement.top,
    targetW,
    targetH,
  };
}

/** 제품(알파>임계값) = 검정(유지), 나머지 = 흰색(재생성). 경계 blur로 페더.
 *  RGB로 합성된 캔버스는 알파가 사라져서 마스크를 뽑을 수 없으므로,
 *  리사이즈된 컷아웃 알파를 같은 left/top에 직접 찍는다. */
async function buildKeepProductMask(
  resizedCutout: Buffer,
  left: number,
  top: number,
): Promise<Buffer> {
  const { data, info } = await sharp(resizedCutout)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE, 255);
  for (let y = 0; y < info.height; y += 1) {
    const destY = top + y;
    if (destY < 0 || destY >= CANVAS_SIZE) continue;
    for (let x = 0; x < info.width; x += 1) {
      const destX = left + x;
      if (destX < 0 || destX >= CANVAS_SIZE) continue;
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > ALPHA_KEEP_THRESHOLD) {
        mask[destY * CANVAS_SIZE + destX] = 0;
      }
    }
  }
  return sharp(mask, {
    raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 1 },
  })
    .blur(MASK_BLUR)
    .png()
    .toBuffer();
}

async function runFluxFill(opts: {
  replicate: Replicate;
  prompt: string;
  image: Buffer;
  mask: Buffer;
  label: string;
}): Promise<Buffer> {
  console.log(`[replicate] CALL flux-fill-dev (${opts.label})`);
  const output = await withTimeout(
    opts.replicate.run(FLUX_FILL_DEV_REF, {
      input: {
        prompt: opts.prompt,
        image: toDataUri(opts.image),
        mask: toDataUri(opts.mask),
        output_format: "png",
      },
      wait: { mode: "poll", interval: 1000 },
    }),
    FLUX_FILL_TIMEOUT_MS,
    `flux-fill-dev ${opts.label}`,
  );
  const url = extractFluxImageUrl(output);
  if (!url) {
    throw new Error(`flux-fill-dev URL 없음 (${opts.label})`);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`flux-fill-dev fetch ${res.status} (${opts.label})`);
  }
  return Buffer.from(await res.arrayBuffer()) as Buffer;
}

async function overlayCutoutOnBackdrop(
  backdrop: Buffer,
  resizedCutout: Buffer,
  left: number,
  top: number,
): Promise<Buffer> {
  const bg = await sharp(backdrop)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
    .png()
    .toBuffer();
  let cutoutForComposite = resizedCutout;
  try {
    const feathered = await featherCutout(resizedCutout);
    cutoutForComposite = await matchCutoutWhiteBalance(feathered, bg);
  } catch (error) {
    console.warn("[composite] feather/WB 실패, 컷아웃 그대로 합성", error);
  }
  return sharp(bg)
    .composite([{ input: cutoutForComposite, left, top }])
    .png()
    .toBuffer();
}

async function writeSideBySide(left: Buffer, right: Buffer, outPath: string) {
  const l = await sharp(left).resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" }).png().toBuffer();
  const r = await sharp(right).resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" }).png().toBuffer();
  await sharp({
    create: {
      width: CANVAS_SIZE * 2,
      height: CANVAS_SIZE,
      channels: 3,
      background: "#111111",
    },
  })
    .composite([
      { input: l, left: 0, top: 0 },
      { input: r, left: CANVAS_SIZE, top: 0 },
    ])
    .png()
    .toFile(outPath);
}

async function main() {
  loadEnvLocal();
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요 (.env.local)");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  const category = "화장품/뷰티";
  const theme = getCategoryTheme(category);
  const prompt = buildPrompt(category);
  console.log(`[prompt] masked-backdrop experiment: ${prompt}`);
  console.log(`[cost] flux-fill-dev unit=$${FLUX_FILL_DEV_USD.toFixed(3)} / image`);

  const fullMask = await buildFullWhiteMask(CANVAS_SIZE);
  const emptyCanvas = await buildSolidCanvas(theme.baseNeutral, CANVAS_SIZE);
  let calls = 0;

  for (const cutout of CUTOUTS) {
    const cutoutPath = path.join(CUTOUT_DIR, cutout.file);
    if (!fs.existsSync(cutoutPath)) {
      throw new Error(`컷아웃 없음: ${cutoutPath}`);
    }
    const cutoutBuf = fs.readFileSync(cutoutPath);
    const placed = await placeCutoutOnCanvas(cutoutBuf, theme.baseNeutral);
    const keepMask = await buildKeepProductMask(
      placed.resizedCutout,
      placed.left,
      placed.top,
    );

    fs.writeFileSync(path.join(OUT_DIR, `${cutout.id}-input-canvas.png`), placed.canvas);
    fs.writeFileSync(path.join(OUT_DIR, `${cutout.id}-mask.png`), keepMask);

    const currentPath = path.join(OUT_DIR, `${cutout.id}-current-pipeline.png`);
    let currentPipeline: Buffer;
    if (fs.existsSync(currentPath)) {
      currentPipeline = fs.readFileSync(currentPath);
      console.log(`[skip] ${cutout.id}-current-pipeline.png 재사용 (fill-dev 미호출)`);
    } else {
      const currentFill = await runFluxFill({
        replicate,
        prompt: `${prompt}, ${CANDIDATE_VARIATIONS[0]}`,
        image: emptyCanvas,
        mask: fullMask,
        label: `${cutout.id}-current`,
      });
      calls += 1;
      currentPipeline = await overlayCutoutOnBackdrop(
        currentFill,
        placed.resizedCutout,
        placed.left,
        placed.top,
      );
      fs.writeFileSync(currentPath, currentPipeline);
      console.log(`[cost] ${cutout.id}-current-pipeline flux-fill-dev: $${FLUX_FILL_DEV_USD.toFixed(3)}`);
    }

    const maskedResults: Buffer[] = [];
    for (let i = 0; i < CANDIDATE_COUNT; i += 1) {
      const candidatePrompt = `${prompt}, ${CANDIDATE_VARIATIONS[i % CANDIDATE_VARIATIONS.length]}`;
      const filled = await runFluxFill({
        replicate,
        prompt: candidatePrompt,
        image: placed.canvas,
        mask: keepMask,
        label: `${cutout.id}-masked-${i}`,
      });
      calls += 1;
      const resized = await sharp(filled)
        .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover" })
        .png()
        .toBuffer();
      maskedResults.push(resized);
      const name =
        i === 0
          ? `${cutout.id}-masked-experiment.png`
          : `${cutout.id}-masked-experiment-${i}.png`;
      fs.writeFileSync(path.join(OUT_DIR, name), resized);
      console.log(`[cost] ${name} flux-fill-dev: $${FLUX_FILL_DEV_USD.toFixed(3)}`);
    }

    await writeSideBySide(
      currentPipeline,
      maskedResults[0],
      path.join(OUT_DIR, `${cutout.id}-compare-side-by-side.png`),
    );
    console.log(
      `[saved] ${cutout.id} left=current-pipeline right=masked-experiment → ${cutout.id}-compare-side-by-side.png`,
    );
  }

  const total = calls * FLUX_FILL_DEV_USD;
  console.log(`[cost] flux-fill-dev calls=${calls} total=$${total.toFixed(3)} (unit=$${FLUX_FILL_DEV_USD.toFixed(3)}, no extra vs current per-image rate)`);
  console.log(`저장: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
