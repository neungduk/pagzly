/**
 * 143차 resume — flux-dev usage_steps만 재생성 + 보드 합성
 *   npx tsx scripts/143cha-resume-flux-and-boards.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import Replicate from "replicate";
import { describeColorTone } from "../lib/color-extract";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import { RECRAFT_NO_TYPOGRAPHY_CLAUSE } from "../lib/concept-icons";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");

const BRIEF: ConceptBrief = {
  theme: "수분/물방울",
  motif_keywords: ["물방울", "청량감", "촉촉함", "은은한 빛"],
  mood: "시원하고 맑은",
  backdrop_hint: "",
  copy_tone: "",
  decor_prompt: "",
  icon_style: "minimal water droplet and sparkle badge icon, soft circular frame",
};

function loadEnvLocal() {
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]!]) process.env[m[1]!] = val;
  }
}

async function composeBoard(
  title: string,
  cells: { label: string; path: string }[],
  outName: string,
  cols: number,
): Promise<string> {
  const tile = 240;
  const gap = 14;
  const labelH = 36;
  const rows = Math.ceil(cells.length / cols);
  const w = cols * tile + (cols + 1) * gap;
  const h = 48 + rows * (tile + labelH + gap) + gap;
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="14" y="30" font-family="Arial,sans-serif" font-size="15" fill="#1B1B18">${title}</text></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (tile + gap);
    const top = 48 + gap + row * (tile + labelH + gap);
    const img = await sharp(cells[i]!.path)
      .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
      .png()
      .toBuffer();
    composites.push({ input: img, left, top });
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-family="Arial,sans-serif" font-size="11" fill="#3A3A36">${cells[i]!.label}</text></svg>`,
      ),
      left,
      top: top + tile,
    });
  }
  const out = path.join(SHOT, outName);
  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 245, g: 241, b: 234 } },
  })
    .composite(composites)
    .png()
    .toFile(out);
  return out;
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(SHOT, { recursive: true });
  const theme = getCategoryTheme("화장품/뷰티");
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
    useFileOutput: false,
  });

  const missing = path.join(OUT, "143cha-flux-dev-usage_steps.png");
  if (!fs.existsSync(missing)) {
    console.log("[143-resume] waiting 15s for rate limit…");
    await new Promise((r) => setTimeout(r, 15_000));
    const prompt = [
      "circular badge icon, flat minimal UI illustration",
      "professional vector icon design, polished modern app icon quality",
      "clean crisp linework, consistent stroke weight, balanced negative space",
      "subtle soft shadow for gentle depth, refined finish, no visual clutter",
      BRIEF.icon_style,
      `motif: ${BRIEF.motif_keywords[0]}, concept for "세안 후 도포"`,
      `${describeColorTone(theme.accent)} primary color, ${describeColorTone(theme.deepAccent)} subtle shadow`,
      "soft round badge frame, centered symbol, no text, no letters, no watermark",
      "white or very light background, ecommerce detail page icon",
    ].join(", ");
    let output: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        output = await replicate.run("black-forest-labs/flux-dev", {
          input: {
            prompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 95,
            num_inference_steps: 28,
            go_fast: true,
            megapixels: "1",
          },
          wait: { mode: "poll", interval: 1000 },
        });
        break;
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 429 && attempt < 4) {
          console.warn(`[143-resume] 429 retry ${attempt}`);
          await new Promise((r) => setTimeout(r, 15_000 * attempt));
          continue;
        }
        throw e;
      }
    }
    const url = Array.isArray(output) ? output[0] : output;
    if (typeof url !== "string") throw new Error("no url");
    console.log("[143-resume] flux-dev usage ok", url.slice(0, 80));
    const res = await fetch(url);
    const buf = await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
    fs.writeFileSync(missing, buf);
  } else {
    console.log("[143-resume] usage already exists");
  }

  // silence unused import warning path — keep clause referenced for parity note
  void RECRAFT_NO_TYPOGRAPHY_CLAUSE;

  const need = [
    "143cha-recraft-v3-stat.png",
    "143cha-recraft-v4-stat.png",
    "143cha-recraft-v4-svg-stat.png",
    "143cha-recraft-v3-banner.png",
    "143cha-recraft-v4-banner.png",
    "143cha-recraft-v4-svg-banner.png",
    "143cha-flux-schnell-checklist.png",
    "143cha-flux-dev-checklist.png",
    "143cha-flux-schnell-usage_steps.png",
    "143cha-flux-dev-usage_steps.png",
  ];
  for (const f of need) {
    if (!fs.existsSync(path.join(OUT, f))) throw new Error(`missing ${f}`);
  }

  const recraftBoard = await composeBoard(
    "143 recraft: v3 | v4 | v4-svg  (stat + banner)",
    [
      { label: "v3 stat", path: path.join(OUT, "143cha-recraft-v3-stat.png") },
      { label: "v4 stat", path: path.join(OUT, "143cha-recraft-v4-stat.png") },
      { label: "v4-svg stat", path: path.join(OUT, "143cha-recraft-v4-svg-stat.png") },
      { label: "v3 banner", path: path.join(OUT, "143cha-recraft-v3-banner.png") },
      { label: "v4 banner", path: path.join(OUT, "143cha-recraft-v4-banner.png") },
      { label: "v4-svg banner", path: path.join(OUT, "143cha-recraft-v4-svg-banner.png") },
    ],
    "143cha-recraft-v4-compare.png",
    3,
  );
  console.log("[143-resume]", recraftBoard);

  const fluxBoard = await composeBoard(
    "143 flux: schnell | flux-dev  (checklist + usage)",
    [
      { label: "schnell checklist", path: path.join(OUT, "143cha-flux-schnell-checklist.png") },
      { label: "dev checklist", path: path.join(OUT, "143cha-flux-dev-checklist.png") },
      { label: "schnell usage", path: path.join(OUT, "143cha-flux-schnell-usage_steps.png") },
      { label: "dev usage", path: path.join(OUT, "143cha-flux-dev-usage_steps.png") },
    ],
    "143cha-flux-dev-compare.png",
    2,
  );
  console.log("[143-resume]", fluxBoard);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
