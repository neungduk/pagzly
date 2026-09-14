/**
 * 143차 — recraft v3/v4/v4-svg + flux-schnell/flux-dev A/B (프로덕션 배선 미변경)
 *   npx tsx scripts/143cha-upgrade-explore.ts
 *
 * 스키마는 review/143cha-*-schema.json (API 실측) 기준.
 * - recraft-v4 / v4-svg: prompt + aspect_ratio (+ optional size). style 필드 없음.
 * - flux-dev: prompt + aspect_ratio + num_outputs + output_format + num_inference_steps 등.
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import Replicate from "replicate";
import { describeColorTone } from "../lib/color-extract";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import {
  buildIconModelInput,
  ICON_COST_USD_BY_MODEL,
  ICON_MODEL_REF,
  RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  resolveRecraftStyle,
} from "../lib/concept-icons";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");

const BRIEF: ConceptBrief = {
  theme: "수분/물방울",
  motif_keywords: ["물방울", "청량감", "촉촉함", "은은한 빛"],
  mood: "시원하고 맑은",
  backdrop_hint:
    "soft side lighting, fine water droplets on a soft surface, no glass container, no product",
  copy_tone: "촉촉하고 산뜻한 수분 케어 톤.",
  decor_prompt: "soft side lighting, fine water droplets on a surface, no text, no product",
  icon_style: "minimal water droplet and sparkle badge icon, soft circular frame",
};

/** 추정 단가 — 실측과 리포트에서 교차검증 (스키마 API에 가격 없음) */
const ESTIMATE_USD: Record<string, number> = {
  "recraft-v3": 0.04,
  "recraft-v4": 0.04,
  "recraft-v4-svg": 0.08,
  "flux-schnell": 0.003,
  "flux-dev": 0.025,
};

type ExploreModel =
  | "recraft-v3"
  | "recraft-v4"
  | "recraft-v4-svg"
  | "flux-schnell"
  | "flux-dev";

const MODEL_REF: Record<ExploreModel, `${string}/${string}`> = {
  "recraft-v3": "recraft-ai/recraft-v3",
  "recraft-v4": "recraft-ai/recraft-v4",
  "recraft-v4-svg": "recraft-ai/recraft-v4-svg",
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-dev": "black-forest-labs/flux-dev",
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

function asciiMotifOnly(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildIconPrompt(label: string, theme: { accent: string; deepAccent: string }, forRecraft: boolean) {
  const motif = BRIEF.motif_keywords[0]!;
  const motifLine = forRecraft
    ? `motif: ${motif}, abstract centered symbol only`
    : `motif: ${motif}, concept for "${label.slice(0, 40)}"`;
  const parts = [
    "circular badge icon, flat minimal UI illustration",
    "professional vector icon design, polished modern app icon quality",
    "clean crisp linework, consistent stroke weight, balanced negative space",
    "subtle soft shadow for gentle depth, refined finish, no visual clutter",
    BRIEF.icon_style,
    motifLine,
    `${describeColorTone(theme.accent)} primary color, ${describeColorTone(theme.deepAccent)} subtle shadow`,
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
  ];
  if (forRecraft) {
    // v4에는 style 파라미터가 없어 프롬프트에 outline 미학을 명시 (v3는 style 필드도 병행)
    parts.push(
      "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills",
      RECRAFT_NO_TYPOGRAPHY_CLAUSE,
    );
  }
  return parts.join(", ");
}

function buildBannerPrompt(theme: { accent: string; deepAccent: string }) {
  const motif = asciiMotifOnly(BRIEF.motif_keywords.slice(0, 3).join(", "));
  const themeAscii = asciiMotifOnly(BRIEF.theme);
  const styleAscii = asciiMotifOnly(BRIEF.icon_style);
  return [
    "abstract decorative background art only, wide 16:9 landscape",
    "professional editorial illustration, magazine-quality decorative art",
    "sharp focus, refined color grading, subtle gradient mesh",
    "soft gradient waves, fluid organic shapes, single centered motif symbol",
    styleAscii || "flat minimal editorial illustration",
    "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills",
    themeAscii ? `mood: ${themeAscii}` : "",
    motif ? `motif: ${motif}` : "",
    `${describeColorTone(theme.accent)} and ${describeColorTone(theme.deepAccent)} color palette`,
    "clean empty center area, atmospheric backdrop for product detail page",
    "no product photo, no packaging, no human, no face",
    "absolutely no text, no letters, no numbers, no words, no glyphs, no korean characters, no hangul, no typography, no watermark, no logo",
    RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildInput(model: ExploreModel, prompt: string, aspectRatio: "1:1" | "16:9"): Record<string, unknown> {
  if (model === "recraft-v3") {
    return buildIconModelInput("recraft-v3", prompt, aspectRatio);
  }
  if (model === "recraft-v4" || model === "recraft-v4-svg") {
    // 143 schema: prompt + aspect_ratio (+ size ignored when aspect set). NO style.
    return {
      prompt,
      aspect_ratio: aspectRatio,
    };
  }
  if (model === "flux-dev") {
    // 143 schema: has num_inference_steps (default 28), go_fast, guidance, etc.
    return {
      prompt,
      num_outputs: 1,
      aspect_ratio: aspectRatio,
      output_format: "png",
      output_quality: 95,
      num_inference_steps: 28,
      go_fast: true,
      megapixels: "1",
    };
  }
  // flux-schnell via existing builder
  return buildIconModelInput("flux-schnell", prompt, aspectRatio);
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string" && output.length > 0) return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

async function urlToPngBuffer(url: string): Promise<{ buf: Buffer; kind: "svg" | "raster"; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url.slice(0, 80)}`);
  const contentType = res.headers.get("content-type") ?? "";
  const ab = await res.arrayBuffer();
  const raw = Buffer.from(ab);
  const looksSvg =
    contentType.includes("svg") ||
    url.toLowerCase().includes(".svg") ||
    raw.slice(0, 200).toString("utf8").includes("<svg");
  if (looksSvg) {
    // SVG → PNG for board / <img> parity check (renderer can also use SVG data URL)
    const buf = await sharp(raw).png().toBuffer();
    return { buf, kind: "svg", contentType: contentType || "image/svg+xml" };
  }
  const buf = await sharp(raw).png().toBuffer();
  return { buf, kind: "raster", contentType: contentType || "image/*" };
}

type GenResult = {
  model: ExploreModel;
  slot: string;
  path: string;
  svgPath?: string;
  kind: "svg" | "raster";
  estimateUsd: number;
  latencyMs: number;
  outputUrl: string;
};

async function generateOne(
  replicate: Replicate,
  model: ExploreModel,
  slot: string,
  prompt: string,
  aspectRatio: "1:1" | "16:9",
  outBase: string,
): Promise<GenResult> {
  const ref = MODEL_REF[model];
  const input = buildInput(model, prompt, aspectRatio);
  console.log(`[143] RUN model=${model} slot=${slot} ref=${ref} inputKeys=${Object.keys(input).join(",")}`);
  const t0 = Date.now();
  let output: unknown;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      output = await replicate.run(ref, {
        input,
        wait: { mode: "poll", interval: 1000 },
      });
      lastErr = undefined;
      break;
    } catch (error) {
      lastErr = error;
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 429 && attempt < 4) {
        const waitMs = 12_000 * attempt;
        console.warn(`[143] ${model} 429 — retry ${attempt}/4 after ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw error;
    }
  }
  if (lastErr) throw lastErr;
  const latencyMs = Date.now() - t0;
  console.log(`[143] DONE model=${model} slot=${slot} ${latencyMs}ms output:`, output);
  const url = extractUrl(output);
  if (!url) throw new Error(`no url from ${model}/${slot}`);
  const { buf, kind, contentType } = await urlToPngBuffer(url);
  const pngPath = `${outBase}.png`;
  fs.writeFileSync(pngPath, buf);
  let svgPath: string | undefined;
  if (kind === "svg") {
    // keep original svg bytes too
    const svgRes = await fetch(url);
    const svgBuf = Buffer.from(await svgRes.arrayBuffer());
    svgPath = `${outBase}.svg`;
    fs.writeFileSync(svgPath, svgBuf);
    console.log(`[143] SVG saved ${path.basename(svgPath)} (${svgBuf.length}B) contentType=${contentType}`);
  }
  return {
    model,
    slot,
    path: pngPath,
    svgPath,
    kind,
    estimateUsd: ESTIMATE_USD[model] ?? 0,
    latencyMs,
    outputUrl: url,
  };
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
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  loadEnvLocal();
  process.env.TEST_MODE = "true";

  // 배선 미변경 확인용 스냅샷
  const iconSrc = fs.readFileSync(path.join(ROOT, "lib/concept-icons.ts"), "utf8");
  const illustSrc = fs.readFileSync(path.join(ROOT, "lib/concept-illustration.ts"), "utf8");
  if (!iconSrc.includes('if (key === "statInfographic") return "recraft-v3"')) {
    throw new Error("unexpected: 142 wiring missing in concept-icons");
  }
  if (!illustSrc.includes('ILLUSTRATION_BANNER_MODEL: IconModelKey = "recraft-v3"') &&
      !illustSrc.includes('const ILLUSTRATION_BANNER_MODEL: IconModelKey = "recraft-v3"')) {
    throw new Error("unexpected: 142 banner model missing");
  }
  console.log(
    `[143] wiring check OK — banner=recraft-v3, stat=recraft-v3, styleDefault=${resolveRecraftStyle()}`,
  );
  console.log(
    `[143] production ICON_MODEL_REF keys=${Object.keys(ICON_MODEL_REF).join(",")} (v4/dev not wired)`,
  );
  console.log(`[143] estimates`, ESTIMATE_USD);

  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN missing");
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });
  const theme = getCategoryTheme("화장품/뷰티");

  const results: GenResult[] = [];
  const logLines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    logLines.push(s);
  };

  // --- A: recraft 3-way (stat icon + banner each) ---
  const recraftModels: ExploreModel[] = ["recraft-v3", "recraft-v4", "recraft-v4-svg"];
  for (const model of recraftModels) {
    const iconPrompt = buildIconPrompt("수분감", theme, true);
    const bannerPrompt = buildBannerPrompt(theme);
    // rate-limit: sequential + short gap for recraft
    const icon = await generateOne(
      replicate,
      model,
      "stat_infographic",
      iconPrompt,
      "1:1",
      path.join(OUT, `143cha-${model}-stat`),
    );
    results.push(icon);
    await new Promise((r) => setTimeout(r, 11_000));
    const banner = await generateOne(
      replicate,
      model,
      "illustration_banner",
      bannerPrompt,
      "16:9",
      path.join(OUT, `143cha-${model}-banner`),
    );
    results.push(banner);
    await new Promise((r) => setTimeout(r, 11_000));
  }

  // --- B: flux 2-way (checklist + usage representative) ---
  const fluxModels: ExploreModel[] = ["flux-schnell", "flux-dev"];
  const fluxSlots: { slot: string; label: string }[] = [
    { slot: "checklist", label: "수분 레이어" },
    { slot: "usage_steps", label: "세안 후 도포" },
  ];
  for (const model of fluxModels) {
    for (const { slot, label } of fluxSlots) {
      const prompt = buildIconPrompt(label, theme, false);
      const r = await generateOne(
        replicate,
        model,
        slot,
        prompt,
        "1:1",
        path.join(OUT, `143cha-${model}-${slot}`),
      );
      results.push(r);
    }
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
  log(`[143] board ${recraftBoard}`);

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
  log(`[143] board ${fluxBoard}`);

  // cost rollup by estimate (Replicate model API has no price field — mark as estimate)
  const byModel: Record<string, { n: number; estimateUsd: number }> = {};
  for (const r of results) {
    byModel[r.model] = byModel[r.model] ?? { n: 0, estimateUsd: 0 };
    byModel[r.model]!.n += 1;
    byModel[r.model]!.estimateUsd += r.estimateUsd;
  }
  const totalEst = results.reduce((s, r) => s + r.estimateUsd, 0);
  log(`[cost] 143 explore estimate total=$${totalEst.toFixed(4)} byModel=${JSON.stringify(byModel)}`);
  log(`[143] ICON_COST_USD production table still: ${JSON.stringify(ICON_COST_USD_BY_MODEL)}`);

  const svgNotes = results
    .filter((r) => r.kind === "svg")
    .map((r) => `${r.model}/${r.slot} → PNG via sharp; raw ${r.svgPath}`);
  log(`[143] SVG handling: ${svgNotes.length ? svgNotes.join(" | ") : "none (all raster URIs)"}`);

  fs.writeFileSync(
    path.join(OUT, "143cha-run-log.txt"),
    logLines.join("\n") +
      "\n\n" +
      JSON.stringify(
        {
          results: results.map((r) => ({
            model: r.model,
            slot: r.slot,
            kind: r.kind,
            estimateUsd: r.estimateUsd,
            latencyMs: r.latencyMs,
            path: path.basename(r.path),
            svgPath: r.svgPath ? path.basename(r.svgPath) : null,
          })),
          byModel,
          totalEst,
          styleNote:
            "v4/v4-svg have no style input — outline aesthetic + no-typography pushed via prompt only",
          wiringUnchanged: true,
        },
        null,
        2,
      ),
    "utf8",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
