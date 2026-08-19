/**
 * Bria GenFill(마스크 기반) 최소 실험.
 * - 프로덕션 코드 미변경
 * - 카테고리당 히어로 1장만 실행(의류/식품/생활)
 * - 실패 시 다음 카테고리 계속
 *
 * 실행: npx tsx scripts/experiment-bria-genfill.ts
 * 출력: review/genfill-{fashion|food|home}-hero.png
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import Replicate from "replicate";
import { computeSafeCanvasPlacement } from "../lib/vision-utils";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "review");
const CANVAS_SIZE = 1024;
const ALPHA_KEEP_THRESHOLD = 16;
const MASK_BLUR = 6;
const BRIA_GENFILL_REF =
  "bria/genfill:797f0f06f83cbf44562f704989c06d1d00d637fb41b505828947524385740352" as const;

const CASES = [
  {
    slug: "fashion",
    categoryKey: "의류-패션",
    prompt:
      "clean minimalist fashion studio backdrop, soft neutral tones, realistic editorial lighting, keep product unchanged, no text, no logo",
  },
  {
    slug: "food",
    categoryKey: "식품",
    prompt:
      "clean supplement product studio background, subtle gym-inspired texture, soft realistic lighting, keep product unchanged, no text, no logo",
  },
  {
    slug: "home",
    categoryKey: "생활용품",
    prompt:
      "cozy camping product backdrop, soft evening ambience, realistic surface shadows, keep product unchanged, no text, no logo",
  },
] as const;

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

function toDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function firstFixturePath(categoryKey: string): string {
  const dir = path.join(ROOT, "scripts", "test-assets", categoryKey);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));
  if (!files.length) throw new Error(`fixture 없음: ${dir}`);
  return path.join(dir, files[0]);
}

async function getBackgroundRemoverRef(replicate: Replicate): Promise<`${string}/${string}:${string}`> {
  const model = await replicate.models.get("851-labs", "background-remover");
  const versionId = model.latest_version?.id;
  if (!versionId) throw new Error("851-labs/background-remover latest version 없음");
  return `851-labs/background-remover:${versionId}`;
}

async function buildSolidCanvas(hexColor: string): Promise<Buffer> {
  return sharp({
    create: {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      channels: 3,
      background: hexColor,
    },
  })
    .png()
    .toBuffer();
}

async function placeCutoutOnCanvas(cutout: Buffer): Promise<{
  canvas: Buffer;
  resizedCutout: Buffer;
  left: number;
  top: number;
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
  const base = await buildSolidCanvas("#F3F4F6");
  const canvas = await sharp(base)
    .composite([{ input: resizedCutout, left: placement.left, top: placement.top }])
    .png()
    .toBuffer();
  return { canvas, resizedCutout, left: placement.left, top: placement.top };
}

/** product=black(keep), background=white(edit) */
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

function extractUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function retryAfterMs(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/retry_after["']?\s*[:=]\s*(\d+)/i);
  if (match) return Math.max(1, Number(match[1])) * 1000;
  if (/429|throttled|rate limit/i.test(message)) return 8000;
  return null;
}

function describeError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: Response }).response instanceof Response
  ) {
    const r = (error as { response: Response }).response;
    return `HTTP ${r.status} ${r.statusText}`;
  }
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function runWithRetry<T>(label: string, run: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const waitMs = retryAfterMs(error);
      if (waitMs == null || attempt >= maxAttempts - 1) break;
      console.warn(`[genfill] ${label} throttled, retry in ${waitMs}ms (${attempt + 1}/${maxAttempts - 1})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function main() {
  loadEnvLocal();
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN 필요");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });
  const bgRemoverRef = await getBackgroundRemoverRef(replicate);

  for (const item of CASES) {
    try {
      const fixturePath = firstFixturePath(item.categoryKey);
      const sourceBuf = fs.readFileSync(fixturePath);
      const sourceUri = `data:image/jpeg;base64,${sourceBuf.toString("base64")}`;

      const cutoutOut = await runWithRetry(`${item.slug}/background-remover`, () =>
        replicate.run(bgRemoverRef, {
          input: { image: sourceUri },
          wait: { mode: "poll", interval: 1000 },
        }),
      );
      const cutoutUrl = extractUrl(cutoutOut);
      if (!cutoutUrl) throw new Error("background-remover URL 없음");
      const cutoutRes = await fetch(cutoutUrl);
      if (!cutoutRes.ok) throw new Error(`cutout fetch 실패: ${cutoutRes.status}`);
      const cutoutBuf = Buffer.from(await cutoutRes.arrayBuffer());

      const placed = await placeCutoutOnCanvas(cutoutBuf);
      const keepMask = await buildKeepProductMask(placed.resizedCutout, placed.left, placed.top);

      const genfillOut = await runWithRetry(`${item.slug}/genfill`, () =>
        replicate.run(BRIA_GENFILL_REF, {
          input: {
            image: toDataUri(placed.canvas),
            mask: toDataUri(keepMask),
            prompt: item.prompt,
            mask_type: "manual",
            preserve_alpha: true,
            sync: true,
            seed: 2100,
          },
          wait: { mode: "poll", interval: 1000 },
        }),
      );
      const genfillUrl = extractUrl(genfillOut);
      if (!genfillUrl) throw new Error("genfill URL 없음");
      const res = await fetch(genfillUrl);
      if (!res.ok) throw new Error(`genfill 결과 fetch 실패: ${res.status}`);
      const outBuf = Buffer.from(await res.arrayBuffer());

      const outPath = path.join(OUT_DIR, `genfill-${item.slug}-hero.png`);
      await sharp(outBuf).png().toFile(outPath);
      console.log(`[genfill] saved ${outPath}`);
    } catch (error) {
      console.error(`[genfill] ${item.slug} 실패: ${describeError(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
