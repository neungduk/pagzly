/**
 * 176차 — checklist/highlight_box/usage_steps 아이콘 시각 언어 통일 probe
 * (프로덕션 getIconModel / modelForIconGroup 배선 미변경)
 *
 *   npx tsx scripts/176cha-icon-style-unify-probe.ts
 *
 * A: 기본 경로 — flux-schnell vs recraft-v4-svg (동일 프롬프트 9개)
 * B: 프리미엄 경로 — flux-dev vs recraft-v4-svg (동일 프롬프트, A의 v4-svg 재사용)
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import Replicate from "replicate";
import { describeColorTone, hueShift } from "../lib/color-extract";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import {
  ICON_COST_USD_BY_MODEL,
  ICON_MODEL_REF,
  RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  buildIconModelInput,
  type IconModelKey,
} from "../lib/concept-icons";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "176cha-icon-probe");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const META = path.join(ROOT, "review", "176cha-icon-style-probe.json");

/** 실제 서비스에 가까운 라벨 — checklist / highlight / usage 혼합 */
const LABELS: { group: "checklist" | "highlight_box" | "usage_steps"; label: string }[] = [
  { group: "checklist", label: "촉촉함" },
  { group: "checklist", label: "저자극" },
  { group: "checklist", label: "가벼운 착용감" },
  { group: "highlight_box", label: "하루종일 보습" },
  { group: "highlight_box", label: "민감성 피부용" },
  { group: "highlight_box", label: "산뜻한 마무리" },
  { group: "usage_steps", label: "세안 후" },
  { group: "usage_steps", label: "넓게 펴바르기" },
  { group: "usage_steps", label: "가볍게 두드리기" },
];

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

const ICON_HUE_OFFSETS = [0, -50, 40, -25, 65, -75, 20, -40, 80];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]!]) continue;
    process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

function isRecraft(model: IconModelKey): boolean {
  return model === "recraft-v3" || model === "recraft-v4" || model === "recraft-v4-svg";
}

/** lib/concept-icons.ts generateSingleConceptIcon 프롬프트 조립과 동일 */
function buildProductionIconPrompt(
  label: string,
  model: IconModelKey,
  theme: { accent: string; deepAccent: string },
  motifIndex: number,
  hueOffset: number,
): string {
  const motif = BRIEF.motif_keywords[motifIndex % BRIEF.motif_keywords.length]!;
  const iconAccent = hueShift(theme.accent, hueOffset);
  const iconShadow = hueShift(theme.deepAccent, hueOffset);
  const motifLine = isRecraft(model)
    ? `motif: ${motif}, abstract centered symbol only`
    : `motif: ${motif}, concept for "${label.slice(0, 40)}"`;
  const promptParts = [
    "circular badge icon, flat minimal UI illustration",
    "professional vector icon design, polished modern app icon quality",
    "clean crisp linework, consistent stroke weight, balanced negative space",
    "subtle soft shadow for gentle depth, refined finish, no visual clutter",
    BRIEF.icon_style,
    motifLine,
    `${describeColorTone(iconAccent)} primary color, ${describeColorTone(iconShadow)} subtle shadow`,
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
  ];
  if (isRecraft(model)) {
    if (model !== "recraft-v3") {
      promptParts.push(
        "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills",
      );
    }
    promptParts.push(RECRAFT_NO_TYPOGRAPHY_CLAUSE);
  }
  return promptParts.join(", ");
}

function extractUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

type GenRow = {
  model: IconModelKey;
  group: string;
  label: string;
  ok: boolean;
  failReason?: string;
  path?: string;
  latencyMs: number;
  costUsd: number;
};

async function generateOne(
  replicate: Replicate,
  model: IconModelKey,
  label: string,
  group: string,
  motifIndex: number,
  hueOffset: number,
  theme: { accent: string; deepAccent: string },
  outBase: string,
): Promise<GenRow> {
  const prompt = buildProductionIconPrompt(label, model, theme, motifIndex, hueOffset);
  const input = buildIconModelInput(model, prompt, "1:1");
  const t0 = Date.now();
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const output = await replicate.run(ICON_MODEL_REF[model], {
        input,
        wait: { mode: "poll", interval: 1000 },
      });
      const url = extractUrl(output);
      if (!url) throw new Error("empty url");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const raw = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get("content-type") ?? "";
      const looksSvg =
        model === "recraft-v4-svg" ||
        ct.includes("svg") ||
        raw.slice(0, 200).toString("utf8").includes("<svg");
      const png = looksSvg ? await sharp(raw).png().toBuffer() : raw;
      // empty / near-empty fail heuristic
      if (png.length < 400) throw new Error("tiny image");
      const meta = await sharp(png).metadata();
      if ((meta.width ?? 0) < 32 || (meta.height ?? 0) < 32) throw new Error("too small dims");

      const file = `${outBase}.png`;
      await sharp(png).resize(256, 256, { fit: "contain", background: "#FAF8F3" }).png().toFile(file);
      return {
        model,
        group,
        label,
        ok: true,
        path: file,
        latencyMs: Date.now() - t0,
        costUsd: ICON_COST_USD_BY_MODEL[model],
      };
    } catch (e) {
      lastErr = e;
      console.warn(`[176] ${model} "${label}" attempt ${attempt}`, e);
      await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }
  return {
    model,
    group,
    label,
    ok: false,
    failReason: lastErr instanceof Error ? lastErr.message : String(lastErr),
    latencyMs: Date.now() - t0,
    costUsd: 0,
  };
}

async function composeBoard(
  title: string,
  cells: { label: string; path?: string }[],
  outName: string,
  cols = 3,
): Promise<string> {
  const tile = 180;
  const labelH = 36;
  const gap = 12;
  const rows = Math.ceil(cells.length / cols);
  const w = gap + cols * (tile + gap);
  const h = 48 + gap + rows * (tile + labelH + gap);
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="14" y="28" font-family="Arial,sans-serif" font-size="14" fill="#1B1B18">${title.replace(/[<>&]/g, "")}</text></svg>`,
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
    if (cells[i]!.path && fs.existsSync(cells[i]!.path!)) {
      const img = await sharp(cells[i]!.path!)
        .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
        .png()
        .toBuffer();
      composites.push({ input: img, left, top });
    } else {
      composites.push({
        input: Buffer.from(
          `<svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#E8E0D8"/><text x="50%" y="50%" text-anchor="middle" font-size="14" fill="#9A3412">FAIL</text></svg>`,
        ),
        left,
        top,
      });
    }
    const safe = cells[i]!.label.slice(0, 28).replace(/[<>&]/g, "");
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-family="Arial,sans-serif" font-size="11" fill="#3A3A36">${safe}</text></svg>`,
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

async function rasterDiagramIcon(id: string, outPath: string, color: string) {
  const svgPath = path.join(ROOT, "public", "icons", "diagrams", `${id}.svg`);
  let svg = fs.readFileSync(svgPath, "utf8").replace(/currentColor/g, color);
  // sharp needs explicit size sometimes
  if (!/width=/.test(svg)) {
    svg = svg.replace(/<svg\b/, '<svg width="256" height="256"');
  }
  await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: "#FAF8F3" }).png().toFile(outPath);
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN missing");

  // wiring snapshot — must remain unchanged
  const src = fs.readFileSync(path.join(ROOT, "lib", "concept-icons.ts"), "utf8");
  if (!src.includes('return getIconModel()')) {
    throw new Error("unexpected: getIconModel fallback missing");
  }
  if (!src.includes('return "flux-dev"')) {
    throw new Error("unexpected: premium flux-dev branch missing");
  }
  console.log("[176] wiring check OK — production models not changed by this probe");

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });
  const theme = getCategoryTheme("화장품/뷰티");

  const rows: GenRow[] = [];
  let apiCalls = 0;

  // --- A: baseline flux-schnell ---
  for (let i = 0; i < LABELS.length; i++) {
    const item = LABELS[i]!;
    console.log(`[176] A schnell ${i + 1}/${LABELS.length} ${item.label}`);
    const r = await generateOne(
      replicate,
      "flux-schnell",
      item.label,
      item.group,
      i,
      ICON_HUE_OFFSETS[i % ICON_HUE_OFFSETS.length]!,
      theme,
      path.join(OUT, `schnell-${i}-${item.group}`),
    );
    rows.push(r);
    if (r.ok) apiCalls += 1;
    else apiCalls += 3; // attempts burned roughly
  }

  // --- A: recraft-v4-svg (concurrency 1 + 11s) ---
  for (let i = 0; i < LABELS.length; i++) {
    const item = LABELS[i]!;
    console.log(`[176] A v4-svg ${i + 1}/${LABELS.length} ${item.label}`);
    const r = await generateOne(
      replicate,
      "recraft-v4-svg",
      item.label,
      item.group,
      i,
      ICON_HUE_OFFSETS[i % ICON_HUE_OFFSETS.length]!,
      theme,
      path.join(OUT, `v4svg-${i}-${item.group}`),
    );
    rows.push(r);
    apiCalls += r.ok ? 1 : 3;
    if (i < LABELS.length - 1) await new Promise((r) => setTimeout(r, 11_000));
  }

  // --- B: premium flux-dev (same labels); reuse v4-svg from A for board ---
  for (let i = 0; i < LABELS.length; i++) {
    const item = LABELS[i]!;
    console.log(`[176] B flux-dev ${i + 1}/${LABELS.length} ${item.label}`);
    const r = await generateOne(
      replicate,
      "flux-dev",
      item.label,
      item.group,
      i,
      ICON_HUE_OFFSETS[i % ICON_HUE_OFFSETS.length]!,
      theme,
      path.join(OUT, `fluxdev-${i}-${item.group}`),
    );
    rows.push(r);
    apiCalls += r.ok ? 1 : 3;
  }

  // diagram icons for "same family?" board
  const diagramRefs = ["waterproof-droplet", "weight-scale", "noise-speaker"];
  for (const id of diagramRefs) {
    await rasterDiagramIcon(id, path.join(OUT, `diagram-${id}.png`), theme.accentText);
  }

  // optional: 1× recraft-v4 as stand-in for "stat_infographic premium family"
  // (production stat is v3/v4 raster — one shot for visual adjacency, not a wiring change)
  console.log("[176] ref stat-like recraft-v4 (1 shot)");
  const statRef = await generateOne(
    replicate,
    "recraft-v4",
    "수분감",
    "stat_infographic",
    0,
    0,
    theme,
    path.join(OUT, `stat-ref-recraft-v4`),
  );
  rows.push(statRef);
  apiCalls += statRef.ok ? 1 : 3;
  if (statRef.ok) await new Promise((r) => setTimeout(r, 11_000));

  const byModel = (m: IconModelKey) => rows.filter((r) => r.model === m);
  const summarize = (m: IconModelKey) => {
    const rs = byModel(m);
    const ok = rs.filter((r) => r.ok).length;
    return {
      model: m,
      n: rs.length,
      ok,
      fail: rs.length - ok,
      failRate: rs.length ? (rs.length - ok) / rs.length : 0,
      costIfAllOk: ICON_COST_USD_BY_MODEL[m] * LABELS.length,
      unitUsd: ICON_COST_USD_BY_MODEL[m],
      avgLatencyMs: Math.round(
        rs.reduce((a, r) => a + r.latencyMs, 0) / Math.max(1, rs.length),
      ),
    };
  };

  const schnellBoard = await composeBoard(
    "176 A: flux-schnell (current default checklist/usage/highlight)",
    byModel("flux-schnell").map((r) => ({
      label: `${r.group}: ${r.label}`,
      path: r.path,
    })),
    "176cha-flux-schnell-board.png",
    3,
  );
  const v4svgBoard = await composeBoard(
    "176 A/B: recraft-v4-svg (candidate for style unify)",
    byModel("recraft-v4-svg").map((r) => ({
      label: `${r.group}: ${r.label}`,
      path: r.path,
    })),
    "176cha-recraft-v4-svg-board.png",
    3,
  );
  const fluxDevBoard = await composeBoard(
    "176 B: flux-dev (current premium checklist/usage/highlight)",
    byModel("flux-dev").map((r) => ({
      label: `${r.group}: ${r.label}`,
      path: r.path,
    })),
    "176cha-flux-dev-board.png",
    3,
  );

  // side-by-side family board: 3 schnell + 3 v4svg + 3 diagram + 1 stat
  const familyCells: { label: string; path?: string }[] = [
    ...byModel("flux-schnell")
      .slice(0, 3)
      .map((r) => ({ label: `schnell·${r.label}`, path: r.path })),
    ...byModel("recraft-v4-svg")
      .slice(0, 3)
      .map((r) => ({ label: `v4svg·${r.label}`, path: r.path })),
    ...diagramRefs.map((id) => ({
      label: `diagram·${id}`,
      path: path.join(OUT, `diagram-${id}.png`),
    })),
    {
      label: "stat·recraft-v4",
      path: statRef.path,
    },
  ];
  const familyBoard = await composeBoard(
    "176 family: schnell | v4-svg | diagram(v4-svg static) | stat(v4)",
    familyCells,
    "176cha-style-family-board.png",
    4,
  );

  // paired compare: same label schnell vs v4svg (first 6)
  const paired: { label: string; path?: string }[] = [];
  for (let i = 0; i < Math.min(6, LABELS.length); i++) {
    const s = byModel("flux-schnell")[i];
    const v = byModel("recraft-v4-svg")[i];
    paired.push({ label: `schnell ${LABELS[i]!.label}`, path: s?.path });
    paired.push({ label: `v4svg ${LABELS[i]!.label}`, path: v?.path });
  }
  const pairedBoard = await composeBoard(
    "176 paired: flux-schnell | recraft-v4-svg (same prompts)",
    paired,
    "176cha-schnell-vs-v4svg-paired.png",
    2,
  );

  const premiumPaired: { label: string; path?: string }[] = [];
  for (let i = 0; i < Math.min(6, LABELS.length); i++) {
    const d = byModel("flux-dev")[i];
    const v = byModel("recraft-v4-svg")[i];
    premiumPaired.push({ label: `dev ${LABELS[i]!.label}`, path: d?.path });
    premiumPaired.push({ label: `v4svg ${LABELS[i]!.label}`, path: v?.path });
  }
  const premiumBoard = await composeBoard(
    "176 premium paired: flux-dev | recraft-v4-svg",
    premiumPaired,
    "176cha-fluxdev-vs-v4svg-paired.png",
    2,
  );

  const meta = {
    note: "probe only — getIconModel / modelForIconGroup unchanged",
    labels: LABELS,
    unitCosts: {
      "flux-schnell": ICON_COST_USD_BY_MODEL["flux-schnell"],
      "flux-dev": ICON_COST_USD_BY_MODEL["flux-dev"],
      "recraft-v4-svg": ICON_COST_USD_BY_MODEL["recraft-v4-svg"],
      "recraft-v4": ICON_COST_USD_BY_MODEL["recraft-v4"],
    },
    // 페이지당 가정: checklist3 + highlight3 + usage3 = 9 (이번 프로브 세트)
    costPerPageIfSwitched: {
      currentDefault: ICON_COST_USD_BY_MODEL["flux-schnell"] * LABELS.length,
      candidateV4Svg: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * LABELS.length,
      delta: (ICON_COST_USD_BY_MODEL["recraft-v4-svg"] - ICON_COST_USD_BY_MODEL["flux-schnell"]) *
        LABELS.length,
      currentPremium: ICON_COST_USD_BY_MODEL["flux-dev"] * LABELS.length,
      premiumIfV4Svg: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * LABELS.length,
      premiumDelta:
        (ICON_COST_USD_BY_MODEL["recraft-v4-svg"] - ICON_COST_USD_BY_MODEL["flux-dev"]) *
        LABELS.length,
    },
    summary: {
      "flux-schnell": summarize("flux-schnell"),
      "recraft-v4-svg": summarize("recraft-v4-svg"),
      "flux-dev": summarize("flux-dev"),
      "recraft-v4": summarize("recraft-v4"),
    },
    apiCallsApproximate: apiCalls,
    successfulGenerations: rows.filter((r) => r.ok).length,
    boards: {
      schnellBoard,
      v4svgBoard,
      fluxDevBoard,
      familyBoard,
      pairedBoard,
      premiumBoard,
    },
    rows: rows.map((r) => ({
      model: r.model,
      group: r.group,
      label: r.label,
      ok: r.ok,
      failReason: r.failReason,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      file: r.path ? path.relative(ROOT, r.path) : undefined,
    })),
  };
  fs.writeFileSync(META, JSON.stringify(meta, null, 2), "utf8");
  console.log("[176] meta", JSON.stringify(meta.summary, null, 2));
  console.log("[176] costPerPageIfSwitched", meta.costPerPageIfSwitched);
  console.log("[176] boards", meta.boards);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
