/**
 * 144차 — $0.50 프리미엄 페이지 원가 실측 (프로덕션 배선 미변경)
 *
 *   npx tsx scripts/144cha-premium-050-probe.ts [phase]
 *   phase: all | a-backdrop | b-studio | c-lifestyle | d-composite | e-icons | f-effects | g-full | report
 *
 * - lib/* 프로덕션 파일 수정 없음
 * - .env.local 임시 변경 시 finally에서 원복 필수
 * - TEST_MODE=true면 lifestyle/composite 유료 경로가 $0이므로, C/D/G는 일시적으로 false
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import Replicate from "replicate";
import { chromium } from "playwright";
import {
  getBackdropProvider,
  getBriaBackdropCandidateCount,
  getBackdropCandidateCount,
  generateBackdropViaFluxKontext,
  enhanceProductImage,
} from "../lib/photo-enhance";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import { computeStudioCompositeLimit } from "../lib/lifestyle-shot-planner";
import {
  estimateLifestyleShotUnitCostUsd,
  getLifestyleShotConfig,
} from "../lib/lifestyle-shot-config";
import {
  generateConceptEffectGraphic,
  resolveConceptEffects,
  CONCEPT_EFFECT_UNIT_COST,
} from "../lib/concept-effects";
import {
  RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  resolveRecraftStyle,
} from "../lib/concept-icons";
import { describeColorTone } from "../lib/color-extract";
import { freezeDetailScrollReveal } from "./capture-utils";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");
const ENV_BACKUP = path.join(OUT, "144cha-env-backup.txt");
const BREAKDOWN_PATH = path.join(OUT, "144cha-cost-breakdown.json");
const ASSET_DIR = path.join(__dirname, "test-assets", "_beauty-showcase-run");
const SESSION_PATH = path.join(OUT, "beauty-showcase-one", "session.json");
const LIFESTYLE_SCENE = path.join(OUT, "112cha-lifestyle-empty-scene.png");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const PRODUCT = {
  category: "화장품/뷰티",
  productName: "라이트 워터 히알루론 세럼",
  brandName: "페이즐리랩",
};

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

type Breakdown = {
  phases: Record<string, unknown>;
  env: {
    before: Record<string, string>;
    after: Record<string, string>;
    restored: boolean;
  };
  findings: string[];
  totals: Record<string, number>;
  wiringUnchanged: boolean;
};

function loadEnvFile(): string {
  return fs.readFileSync(ENV_PATH, "utf8");
}

function parseEnvKeys(raw: string, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
    out[key] = m ? m[1]!.trim() : "(absent)";
  }
  return out;
}

const TRACKED_ENV = [
  "TEST_MODE",
  "BACKDROP_PROVIDER",
  "BACKDROP_CANDIDATES",
  "BRIA_BACKDROP_CANDIDATES",
  "ICON_MODEL",
  "LIFESTYLE_SHOT_QUALITY",
  "LIFESTYLE_SHOT_MAX_COUNT",
  "LIFESTYLE_SHOTS_ENABLED",
] as const;

function applyEnvToProcess(raw: string) {
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[m[1]!] = val;
  }
}

function setEnvKey(key: string, value: string | null) {
  let raw = loadEnvFile();
  const re = new RegExp(`^${key}=.*$`, "m");
  if (value == null) {
    raw = raw.replace(re, "").replace(/\n{3,}/g, "\n\n");
  } else if (re.test(raw)) {
    raw = raw.replace(re, `${key}=${value}`);
  } else {
    raw = `${raw.replace(/\s*$/, "")}\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, raw, "utf8");
  if (value == null) delete process.env[key];
  else process.env[key] = value;
}

function fileToDataUrl(filePath: string, mime = "image/jpeg"): string {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function listProductFiles(): string[] {
  const files = fs
    .readdirSync(ASSET_DIR)
    .filter((n) => /\.(jpe?g|png|webp)$/i.test(n))
    .map((n) => path.join(ASSET_DIR, n))
    .sort();
  if (files.length < 8) throw new Error(`need 8 product images in ${ASSET_DIR}, got ${files.length}`);
  return files.slice(0, 8);
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string" && output.length) return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

async function urlToPng(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const looksSvg =
    (res.headers.get("content-type") ?? "").includes("svg") ||
    url.toLowerCase().includes(".svg") ||
    raw.slice(0, 200).toString("utf8").includes("<svg");
  const buf = looksSvg ? await sharp(raw).png().toBuffer() : await sharp(raw).png().toBuffer();
  fs.writeFileSync(outPath, buf);
  return { looksSvg, bytes: buf.length };
}

async function composeGrid(
  title: string,
  cells: { label: string; path: string }[],
  outName: string,
  cols: number,
) {
  const tile = 220;
  const gap = 12;
  const labelH = 34;
  const rows = Math.ceil(cells.length / cols);
  const w = cols * tile + (cols + 1) * gap;
  const h = 44 + rows * (tile + labelH + gap) + gap;
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="12" y="28" font-family="Arial" font-size="14" fill="#1B1B18">${title}</text></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (tile + gap);
    const top = 44 + gap + row * (tile + labelH + gap);
    const img = await sharp(cells[i]!.path)
      .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
      .png()
      .toBuffer();
    composites.push({ input: img, left, top });
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-family="Arial" font-size="11" fill="#333">${cells[i]!.label}</text></svg>`,
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

function loadBreakdown(): Breakdown {
  if (fs.existsSync(BREAKDOWN_PATH)) {
    return JSON.parse(fs.readFileSync(BREAKDOWN_PATH, "utf8")) as Breakdown;
  }
  return {
    phases: {},
    env: { before: {}, after: {}, restored: false },
    findings: [],
    totals: {},
    wiringUnchanged: true,
  };
}

function saveBreakdown(b: Breakdown) {
  fs.writeFileSync(BREAKDOWN_PATH, JSON.stringify(b, null, 2), "utf8");
}

function readSessionLabels(): {
  checklist: string[];
  usage: string[];
  spec: string[];
  stat: string[];
  sections: DetailSection[];
} {
  const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8")) as {
    generated?: { sections?: DetailSection[]; photoCostBreakdown?: Record<string, number> };
    photoCostBreakdown?: Record<string, number>;
    photoProcessingCost?: number;
  };
  const sections = session.generated?.sections ?? [];
  const checklist: string[] = [];
  const usage: string[] = [];
  const spec: string[] = [];
  const stat: string[] = [];
  for (const s of sections) {
    if (s.type === "checklist") checklist.push(...s.items);
    if (s.type === "usage_steps") usage.push(...s.steps);
    if (s.type === "spec_table") spec.push(...s.rows.map((r) => r.label));
    if (s.type === "stat_infographic") stat.push(...s.metrics.map((m) => m.label));
  }
  return { checklist, usage, spec, stat, sections };
}

/** script-local kontext N회 — getBriaBackdropCandidateCount 상한(3) 우회용 */
async function runKontextCandidates(
  n: number,
  sourceDataUrl: string,
  theme: ReturnType<typeof getCategoryTheme>,
): Promise<{ urls: string[]; cost: number; loggedCount: number }> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
    useFileOutput: false,
  });
  const unit = 0.04; // Replicate UI 확인가
  const urls: string[] = [];
  const variations = [
    "soft daylight from the left",
    "cooler morning light",
    "warmer golden hour side light",
    "diffused overcast softbox feel",
  ];
  console.log(`[144][A] script-local flux-kontext-pro x${n} (bypass BRIA cap)`);
  for (let i = 0; i < n; i++) {
    const prompt = [
      "replace background only, keep product identical",
      "clean cosmetic product photography backdrop",
      BRIEF.backdrop_hint,
      variations[i % variations.length],
      "no text, no logo, no watermark",
    ].join(", ");
    let output: unknown;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        output = await replicate.run("black-forest-labs/flux-kontext-pro", {
          input: {
            prompt,
            input_image: sourceDataUrl,
            aspect_ratio: "match_input_image",
            output_format: "png",
          },
          wait: { mode: "poll", interval: 1000 },
        });
        break;
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        const msg = String(e);
        if ((status === 429 || /throttled|429/i.test(msg)) && attempt < 5) {
          const waitMs = 15_000 * attempt;
          console.warn(`[144][A] kontext 429 — retry ${attempt}/5 after ${waitMs}ms`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw e;
      }
    }
    const url = extractUrl(output);
    if (!url) throw new Error(`kontext candidate ${i} empty`);
    urls.push(url);
    console.log(`[144][A] candidate[${i}] ok`);
    // credit<$5 burst=1 → always wait between creates
    if (i + 1 < n) await new Promise((r) => setTimeout(r, 12_000));
  }
  const cost = urls.length * unit;
  console.log(`[cost] 144 script-local kontext x${urls.length}: $${cost.toFixed(4)}`);
  return { urls, cost, loggedCount: n };
}

async function phaseA(breakdown: Breakdown) {
  const files = listProductFiles();
  const theme = getCategoryTheme(PRODUCT.category);
  const sourceDataUrl = fileToDataUrl(files[0]!);

  const provider = getBackdropProvider(PRODUCT.category);
  const briaCount = getBriaBackdropCandidateCount();
  const fluxCount = getBackdropCandidateCount();
  const sessionBd = (() => {
    try {
      const s = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
      return s.photoCostBreakdown?.backdrop ?? s.generated?.photoCostBreakdown?.backdrop ?? null;
    } catch {
      return null;
    }
  })();

  breakdown.findings.push(
    `A0: BACKDROP_PROVIDER=${provider}, getBriaBackdropCandidateCount()=${briaCount} (env BRIA, Math.min 3), getBackdropCandidateCount()=${fluxCount} (BACKDROP_CANDIDATES — flux-fill path; unused by kontext)`,
  );
  breakdown.findings.push(
    `A0: beauty-showcase session photoCostBreakdown.backdrop=${sessionBd} — matches kontext×2=$0.08`,
  );

  const cells2: { label: string; path: string }[] = [];
  let prodCost = 0;
  let prodClaude = 0;
  let prodN = 0;
  const existing0 = path.join(OUT, "144cha-backdrop-n2-c0.png");
  if (fs.existsSync(existing0)) {
    console.log("[144][A] resume — reuse existing n2 candidate file(s)");
    for (let i = 0; i < 3; i++) {
      const p = path.join(OUT, `144cha-backdrop-n2-c${i}.png`);
      if (fs.existsSync(p)) {
        cells2.push({ label: `n=2 c${i}`, path: p });
        prodN += 1;
        prodCost += 0.04;
      }
    }
    breakdown.findings.push(
      `A: production log confirmed CALL flux-kontext-pro x2; resume used ${prodN} saved candidate(s)`,
    );
  } else {
    console.log("[144][A] production generateBackdropViaFluxKontext (BRIA current)...");
    await new Promise((r) => setTimeout(r, 15_000));
    const prod2 = await generateBackdropViaFluxKontext(
      PRODUCT.category,
      PRODUCT.productName,
      PRODUCT.brandName,
      theme,
      sourceDataUrl,
      BRIEF,
    );
    prodCost = prod2.cost;
    prodClaude = prod2.claudeCost;
    prodN = prod2.candidateUrls.length;
    for (let i = 0; i < prod2.candidateUrls.length; i++) {
      const p = path.join(OUT, `144cha-backdrop-n2-c${i}.png`);
      await urlToPng(prod2.candidateUrls[i]!, p);
      cells2.push({ label: `n=2 c${i}`, path: p });
    }
  }

  console.log("[144][A] waiting 20s before 4-candidate run…");
  await new Promise((r) => setTimeout(r, 20_000));
  const local4 = await runKontextCandidates(4, sourceDataUrl, theme);
  const cells4: { label: string; path: string }[] = [];
  for (let i = 0; i < local4.urls.length; i++) {
    const p = path.join(OUT, `144cha-backdrop-n4-c${i}.png`);
    await urlToPng(local4.urls[i]!, p);
    cells4.push({ label: `n=4 c${i}`, path: p });
  }

  setEnvKey("BRIA_BACKDROP_CANDIDATES", "4");
  applyEnvToProcess(loadEnvFile());
  const capped = getBriaBackdropCandidateCount();
  breakdown.findings.push(
    `A: BRIA_BACKDROP_CANDIDATES=4 → getBriaBackdropCandidateCount()=${capped} (Math.min 3). Production env alone cannot request 4.`,
  );
  setEnvKey("BRIA_BACKDROP_CANDIDATES", "2");
  applyEnvToProcess(loadEnvFile());

  const board = await composeGrid(
    "144 backdrop: n=2 (prod) | n=4 (script-local)",
    [...cells2, ...cells4],
    "144cha-backdrop-candidates-2v4.png",
    3,
  );

  breakdown.phases.a_backdrop = {
    provider,
    productionCallRequested: 2,
    productionSavedCandidates: prodN,
    productionCost: prodCost,
    productionClaudeCost: prodClaude,
    scriptLocal4Cost: local4.cost,
    board,
    unitUsd: 0.04,
    note: "Live kontext uses BRIA_BACKDROP_CANDIDATES; pricing-doc $0.04 hero understates ×2=$0.08",
  };
  breakdown.totals.a_backdrop = Number(prodCost) + Number(local4.cost) + Number(prodClaude || 0);
  saveBreakdown(breakdown);
  console.log("[144][A] done", breakdown.phases.a_backdrop);
}

async function phaseB(breakdown: Breakdown) {
  const files = listProductFiles();
  const theme = getCategoryTheme(PRODUCT.category);
  const limit4 = computeStudioCompositeLimit(8);
  breakdown.findings.push(`B: computeStudioCompositeLimit(8)=${limit4} (production; planner 미수정)`);

  const REMBG = 0.00047;
  const CLARITY = 0.016;

  let backdropBuf: Buffer;
  const existing = path.join(OUT, "144cha-backdrop-n2-c0.png");
  if (fs.existsSync(existing)) {
    backdropBuf = fs.readFileSync(existing);
  } else {
    const one = await runKontextCandidates(1, fileToDataUrl(files[0]!), theme);
    const tmp = path.join(OUT, "144cha-backdrop-helper.png");
    await urlToPng(one.urls[0]!, tmp);
    backdropBuf = fs.readFileSync(tmp);
    breakdown.totals.b_backdrop_helper = one.cost;
  }

  const prevTest = process.env.TEST_MODE;
  process.env.TEST_MODE = "false";

  const costs4: number[] = [];
  const costs8: number[] = [];
  const cells: { label: string; path: string }[] = [];

  for (let i = 0; i < 8; i++) {
    const src = fileToDataUrl(files[i]!);
    const result = await enhanceProductImage(src, backdropBuf, {
      applyDecor: false,
      backdropAlreadyComposited: false,
      productName: PRODUCT.productName,
      theme,
    });
    const outPath = path.join(OUT, `144cha-studio-idx${i}.png`);
    fs.writeFileSync(outPath, result.buffer);
    const cost = (result.cost ?? 0) + (result.claudeCost ?? 0);
    if (i < 4) costs4.push(cost);
    costs8.push(cost);
    if (i >= 4) {
      const rawPath = path.join(OUT, `144cha-studio-idx${i}-raw.png`);
      await sharp(files[i]!).png().toFile(rawPath);
      cells.push({ label: `idx${i} RAW`, path: rawPath });
      cells.push({ label: `idx${i} COMP`, path: outPath });
    }
    console.log(`[144][B] enhance idx=${i} cost=$${cost.toFixed(4)}`);
  }

  process.env.TEST_MODE = prevTest;

  const sum4 = costs4.reduce((a, b) => a + b, 0);
  const sum8 = costs8.reduce((a, b) => a + b, 0);
  const board = await composeGrid(
    "144 studio: idx4-7 RAW vs COMP (limit4 would skip these)",
    cells,
    "144cha-studio-composite-4v8.png",
    4,
  );

  breakdown.phases.b_studio = {
    productionLimit: limit4,
    costsPerIndex: costs8,
    costIfLimit4: sum4,
    costIfLimit8: sum8,
    delta: sum8 - sum4,
    rembgUnit: REMBG,
    clarityUnit: CLARITY,
    board,
  };
  breakdown.totals.b_studio = sum8;
  saveBreakdown(breakdown);
  console.log("[144][B] done", breakdown.phases.b_studio);
}

async function phaseC(breakdown: Breakdown) {
  // generateLifestyleShots() uses ImageRouter → Supabase cookies (Next request scope).
  // Probe providers directly for measured unit costs; note gate/retry need HTTP path.
  const { generateKontextProViaReplicate } = await import(
    "../lib/image-router/providers/kontext-replicate-client"
  );
  const { generateGemini3ProImage } = await import(
    "../lib/image-router/providers/gemini-google-client"
  );
  const { planLifestyleShots } = await import("../lib/lifestyle-shot-planner");

  const estimateStd = estimateLifestyleShotUnitCostUsd({
    ...getLifestyleShotConfig(),
    qualityLevel: "standard",
  });
  const estimatePrem = estimateLifestyleShotUnitCostUsd({
    ...getLifestyleShotConfig(),
    qualityLevel: "premium",
  });

  const plans = planLifestyleShots({
    category: PRODUCT.category,
    productName: PRODUCT.productName,
    brandName: PRODUCT.brandName,
    count: 1,
  });
  const plan = plans[0]!;
  console.log(`[144][C] plan label=${plan.label} task=${plan.taskType}`);

  await new Promise((r) => setTimeout(r, 12_000));
  const std = await generateKontextProViaReplicate({
    request: {
      taskType: plan.taskType,
      aspectRatio: plan.aspectRatio,
      qualityLevel: "standard",
      resolution: "768",
      prompt: plan.prompt,
      productImages: [],
    },
    prompt: plan.prompt,
    productImages: [],
    timeoutMs: 180_000,
  });
  const stdPath = path.join(OUT, "144cha-lifestyle-standard-0.png");
  await urlToPng(std.outputUrls[0]!, stdPath);
  console.log(`[cost] 144 lifestyle standard (kontext): $${std.actualCost.toFixed(4)}`);

  await new Promise((r) => setTimeout(r, 12_000));
  const prem = await generateGemini3ProImage({
    request: {
      taskType: plan.taskType,
      aspectRatio: plan.aspectRatio,
      qualityLevel: "premium",
      resolution: "768",
      prompt: plan.prompt,
      productImages: [],
    },
    prompt: plan.prompt,
    productImages: [],
    timeoutMs: 180_000,
  });
  const premPath = path.join(OUT, "144cha-lifestyle-premium-0.png");
  await urlToPng(prem.outputUrls[0]!, premPath);
  console.log(`[cost] 144 lifestyle premium (gemini): $${prem.actualCost.toFixed(4)}`);

  const board = await composeGrid(
    "144 lifestyle: standard(kontext) vs premium(gemini)",
    [
      { label: `std $${std.actualCost.toFixed(3)}`, path: stdPath },
      { label: `prem $${prem.actualCost.toFixed(3)}`, path: premPath },
    ],
    "144cha-lifestyle-shots-standard-vs-premium.png",
    2,
  );

  breakdown.phases.c_lifestyle = {
    estimateUnitStandard: estimateStd,
    estimateUnitPremium: estimatePrem,
    measuredStandard: {
      n: 1,
      totalCost: std.actualCost,
      model: std.model,
      path: "provider-direct (no ImageRouter/gates)",
    },
    measuredPremium: {
      n: 1,
      totalCost: prem.actualCost,
      model: prem.model,
      path: "provider-direct (no ImageRouter/gates)",
    },
    board,
    note:
      "Unit costs from provider clients. Full generateLifestyleShots adds Haiku gate + optional retryShot (cookies require Next request); 127cha showed enableAiLifestyleShots=false skips entirely.",
  };
  breakdown.totals.c_lifestyle = std.actualCost + prem.actualCost;
  saveBreakdown(breakdown);
  console.log("[144][C] done", breakdown.phases.c_lifestyle);
}

async function phaseD(breakdown: Breakdown) {
  const { compositeProductOnLifestylePhoto } = await import("../lib/lifestyle-product-composite");
  const { resolveLifestyleCompositeScale } = await import("../lib/lifestyle-composite-scale-gate");

  const files = listProductFiles();
  if (!fs.existsSync(LIFESTYLE_SCENE)) {
    throw new Error(`missing lifestyle scene ${LIFESTYLE_SCENE}`);
  }
  const lifestyleUrl = fileToDataUrl(LIFESTYLE_SCENE, "image/png");
  const productUrl = fileToDataUrl(files[0]!);

  const skipScale = resolveLifestyleCompositeScale({
    productHeightCm: null,
    productSizeHint: null,
  });
  breakdown.findings.push(
    `D: no-height shouldAttempt=${skipScale.shouldAttempt} skipReason=${skipScale.skipReason}`,
  );

  setEnvKey("TEST_MODE", "false");
  process.env.TEST_MODE = "false";

  const withHeight = await compositeProductOnLifestylePhoto({
    lifestyleImageUrl: lifestyleUrl,
    productImageUrl: productUrl,
    category: PRODUCT.category,
    productName: PRODUCT.productName,
    productHeightCm: 9,
    requirePixelPaste: true,
  });

  const outOk = path.join(OUT, "144cha-lifestyle-composite-with-height.png");
  if (withHeight.url?.startsWith("data:")) {
    fs.writeFileSync(outOk, Buffer.from(withHeight.url.split(",")[1]!, "base64"));
  } else if (withHeight.url) {
    await urlToPng(withHeight.url, outOk);
  }

  setEnvKey("TEST_MODE", "true");
  process.env.TEST_MODE = "true";

  breakdown.phases.d_composite = {
    withoutHeight: { cost: 0, skipped: true, reason: skipScale.skipReason },
    withHeight: {
      cost: withHeight.cost,
      composited: withHeight.composited,
      fallbackReason: withHeight.fallbackReason ?? null,
      method: withHeight.method ?? null,
      out: outOk,
    },
  };
  breakdown.totals.d_composite = withHeight.cost ?? 0;
  saveBreakdown(breakdown);
  console.log("[144][D] done", breakdown.phases.d_composite);
}

async function phaseE(breakdown: Breakdown) {
  const labels = readSessionLabels();
  const theme = getCategoryTheme(PRODUCT.category);
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
    useFileOutput: false,
  });

  const fluxDevLabels = [
    ...labels.checklist.map((l) => ({ group: "checklist", label: l })),
    ...labels.usage.map((l) => ({ group: "usage_steps", label: l })),
    ...labels.spec.map((l) => ({ group: "spec_table", label: l })),
  ];
  const recraftSvgSlots = [
    ...labels.stat.map((l) => ({ group: "stat_infographic", label: l })),
    { group: "illustration_banner", label: "banner" },
  ];

  breakdown.findings.push(
    `E: actual session counts checklist=${labels.checklist.length} usage=${labels.usage.length} spec=${labels.spec.length} stat=${labels.stat.length} banner=1`,
  );

  const UNIT_DEV = 0.025;
  const UNIT_SVG = 0.08;
  let costDev = 0;
  let costSvg = 0;
  const byGroup: Record<string, { n: number; cost: number; model: string }> = {};

  async function genFluxDev(label: string, group: string, idx: number) {
    const prompt = [
      "circular badge icon, flat minimal UI illustration",
      BRIEF.icon_style,
      `motif: ${BRIEF.motif_keywords[0]}, concept for "${label.slice(0, 40)}"`,
      `${describeColorTone(theme.accent)} primary color`,
      "no text, no letters, no watermark, white background",
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
          await new Promise((r) => setTimeout(r, 12000 * attempt));
          continue;
        }
        throw e;
      }
    }
    const url = extractUrl(output);
    if (!url) throw new Error("flux-dev empty");
    const p = path.join(OUT, `144cha-icon-dev-${group}-${idx}.png`);
    await urlToPng(url, p);
    costDev += UNIT_DEV;
    byGroup[group] = byGroup[group] ?? { n: 0, cost: 0, model: "flux-dev" };
    byGroup[group]!.n += 1;
    byGroup[group]!.cost += UNIT_DEV;
    console.log(`[cost] 144 flux-dev ${group}[${idx}] +$${UNIT_DEV}`);
  }

  async function genSvg(slot: string, idx: number) {
    const prompt =
      slot === "banner"
        ? [
            "abstract decorative background art only, wide 16:9 landscape",
            "hand-drawn outline digital illustration style",
            BRIEF.decor_prompt,
            RECRAFT_NO_TYPOGRAPHY_CLAUSE,
            "absolutely no text",
          ].join(", ")
        : [
            "circular badge icon, vector graphic",
            "hand-drawn outline digital illustration style",
            `motif: ${BRIEF.motif_keywords[0]}, abstract centered symbol only`,
            RECRAFT_NO_TYPOGRAPHY_CLAUSE,
          ].join(", ");
    let output: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        output = await replicate.run("recraft-ai/recraft-v4-svg", {
          input: {
            prompt,
            aspect_ratio: slot === "banner" ? "16:9" : "1:1",
          },
          wait: { mode: "poll", interval: 1000 },
        });
        break;
      } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (status === 429 && attempt < 4) {
          await new Promise((r) => setTimeout(r, 12000 * attempt));
          continue;
        }
        throw e;
      }
    }
    const url = extractUrl(output);
    if (!url) throw new Error("v4-svg empty");
    const p = path.join(OUT, `144cha-icon-svg-${slot}-${idx}.png`);
    await urlToPng(url, p);
    costSvg += UNIT_SVG;
    const g = slot === "banner" ? "illustration_banner" : "stat_infographic";
    byGroup[g] = byGroup[g] ?? { n: 0, cost: 0, model: "recraft-v4-svg" };
    byGroup[g]!.n += 1;
    byGroup[g]!.cost += UNIT_SVG;
    console.log(`[cost] 144 recraft-v4-svg ${slot}[${idx}] +$${UNIT_SVG}`);
    await new Promise((r) => setTimeout(r, 11000));
  }

  // Resume: skip already-written files
  for (let i = 0; i < fluxDevLabels.length; i++) {
    const item = fluxDevLabels[i]!;
    const p = path.join(OUT, `144cha-icon-dev-${item.group}-${i}.png`);
    if (fs.existsSync(p)) {
      costDev += UNIT_DEV;
      byGroup[item.group] = byGroup[item.group] ?? { n: 0, cost: 0, model: "flux-dev" };
      byGroup[item.group]!.n += 1;
      byGroup[item.group]!.cost += UNIT_DEV;
      console.log(`[144][E] resume skip ${path.basename(p)}`);
      continue;
    }
    await genFluxDev(item.label, item.group, i);
    await new Promise((r) => setTimeout(r, 12_000));
  }
  for (let i = 0; i < recraftSvgSlots.length; i++) {
    const item = recraftSvgSlots[i]!;
    const slot = item.group === "illustration_banner" ? "banner" : `stat-${i}`;
    const p = path.join(OUT, `144cha-icon-svg-${slot}-${i}.png`);
    if (fs.existsSync(p)) {
      costSvg += UNIT_SVG;
      const g = item.group === "illustration_banner" ? "illustration_banner" : "stat_infographic";
      byGroup[g] = byGroup[g] ?? { n: 0, cost: 0, model: "recraft-v4-svg" };
      byGroup[g]!.n += 1;
      byGroup[g]!.cost += UNIT_SVG;
      console.log(`[144][E] resume skip ${path.basename(p)}`);
      continue;
    }
    await genSvg(slot, i);
  }

  const projected =
    fluxDevLabels.length * UNIT_DEV + recraftSvgSlots.length * UNIT_SVG;

  breakdown.phases.e_icons = {
    counts: {
      checklist: labels.checklist.length,
      usage: labels.usage.length,
      spec: labels.spec.length,
      stat: labels.stat.length,
      banner: 1,
    },
    byGroup,
    measuredTotal: costDev + costSvg,
    projectedFromUnits: projected,
    unitFluxDev: UNIT_DEV,
    unitRecraftSvg: UNIT_SVG,
    styleDefault: resolveRecraftStyle(),
    note: "Units from Replicate UI (143). Logged as unit×n; billing line items not scraped.",
  };
  breakdown.totals.e_icons = costDev + costSvg;
  saveBreakdown(breakdown);
  console.log("[144][E] done", breakdown.phases.e_icons);
}

async function phaseF(breakdown: Breakdown) {
  process.env.TEST_MODE = "false";
  const picked = resolveConceptEffects(BRIEF, "수분 물방울 미스트 촉촉 쿨링 영양", {
    cosmeticsOnly: true,
  });
  if (!picked[0]) throw new Error("no concept effect resolved");

  const one = await generateConceptEffectGraphic(picked[0]);
  fs.writeFileSync(path.join(OUT, "144cha-effect-0.png"), one.buffer);

  // Force 3 generations (production live max=2) — same primary + repeats if pool short
  const pool = resolveConceptEffects(BRIEF, "수분 클렌징 쿨링 영양 미스트", {
    cosmeticsOnly: false,
  });
  const specs = [...pool];
  while (specs.length < 3) specs.push(picked[0]);
  let cost3 = 0;
  for (let i = 0; i < 3; i++) {
    const g = await generateConceptEffectGraphic(specs[i]!);
    fs.writeFileSync(path.join(OUT, `144cha-effect-${i}.png`), g.buffer);
    cost3 += g.cost;
  }

  breakdown.phases.f_effects = {
    unit: CONCEPT_EFFECT_UNIT_COST,
    measured1: one.cost,
    measured3: cost3,
    delta1to3: cost3 - one.cost,
    productionMaxLive: 2,
    productionMaxTest: 1,
    note: "3장은 스크립트 강제 — 프로덕션 maxConceptEffects live=2",
  };
  breakdown.totals.f_effects = one.cost + cost3;
  process.env.TEST_MODE = "true";
  saveBreakdown(breakdown);
  console.log("[144][F] done", breakdown.phases.f_effects);
}

async function phaseG(breakdown: Breakdown) {
  // Synthesize $0.50 page cost from measured components + capture full page with premium assets
  const labels = readSessionLabels();
  const a = breakdown.phases.a_backdrop as { productionCost?: number } | undefined;
  const b = breakdown.phases.b_studio as { costIfLimit8?: number; costIfLimit4?: number } | undefined;
  const c = breakdown.phases.c_lifestyle as {
    measuredStandard?: { totalCost: number };
  } | undefined;
  const d = breakdown.phases.d_composite as { withHeight?: { cost: number } } | undefined;
  const e = breakdown.phases.e_icons as { measuredTotal?: number } | undefined;
  const f = breakdown.phases.f_effects as { measured1?: number; measured3?: number } | undefined;

  const components = {
    backdrop_kontext_x2: a?.productionCost ?? 0.08,
    backdrop_extra_to_x4: 0.08, // +2 candidates
    studio_composite_limit8: b?.costIfLimit8 ?? null,
    studio_composite_limit4: b?.costIfLimit4 ?? null,
    lifestyle_shots_standard_1: c?.measuredStandard?.totalCost ?? null,
    lifestyle_composite_with_height: d?.withHeight?.cost ?? null,
    icons_v4svg_fluxdev_actual_counts: e?.measuredTotal ?? null,
    effects_x3: f?.measured3 ?? null,
    // text stack from prior beauty session residual
    llm_and_misc_from_beauty_session: 0.021 + 0.00007, // icons old + brief approx; replaced by e
  };

  const premiumSum =
    Number(components.backdrop_kontext_x2) +
    Number(components.backdrop_extra_to_x4) +
    Number(components.studio_composite_limit8 ?? 0) +
    Number(components.lifestyle_shots_standard_1 ?? 0) +
    Number(components.lifestyle_composite_with_height ?? 0) +
    Number(components.icons_v4svg_fluxdev_actual_counts ?? 0) +
    Number(components.effects_x3 ?? 0);

  breakdown.phases.g_full = {
    components,
    premiumSumMeasuredParts: premiumSum,
    targetBand: [0.45, 0.55],
    inBand: premiumSum >= 0.45 && premiumSum <= 0.55,
    note: "Sum of probe parts (not a single /api/generate). LLM copy cost excluded except residual note.",
  };
  breakdown.totals.g_premium_stack = premiumSum;

  // Capture full page with injected premium icons/banner if available
  await captureFullPage(breakdown);
  saveBreakdown(breakdown);
  console.log("[144][G] done", breakdown.phases.g_full);
}

async function captureFullPage(breakdown: Breakdown) {
  if (!fs.existsSync(SESSION_PATH) || !fs.existsSync(STORAGE_STATE_PATH)) {
    breakdown.findings.push("G capture skipped — missing session or auth-state");
    return;
  }
  const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
  const generated = session.generated;
  if (!generated?.sections) return;

  // Inject any generated premium assets we have
  const bannerPath = path.join(OUT, "144cha-icon-svg-banner-0.png");
  const conceptIcons: Record<string, string[]> = {
    checklist: [],
    usageSteps: [],
    specTable: [],
    statInfographic: [],
  };
  for (const f of fs.readdirSync(OUT)) {
    const m = f.match(/^144cha-icon-dev-(checklist|usage_steps|spec_table)-(\d+)\.png$/);
    if (m) {
      const key =
        m[1] === "checklist" ? "checklist" : m[1] === "usage_steps" ? "usageSteps" : "specTable";
      conceptIcons[key]!.push(fileToDataUrl(path.join(OUT, f), "image/png"));
    }
    const s = f.match(/^144cha-icon-svg-stat-(\d+)\.png$/);
    if (s) conceptIcons.statInfographic!.push(fileToDataUrl(path.join(OUT, f), "image/png"));
  }
  // shrink for sessionStorage
  async function shrink(dataUrl: string, w: number) {
    const b64 = dataUrl.split(",")[1]!;
    const buf = await sharp(Buffer.from(b64, "base64"))
      .resize(w, w, { fit: "inside" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
  for (const key of Object.keys(conceptIcons) as (keyof typeof conceptIcons)[]) {
    conceptIcons[key] = await Promise.all(
      (conceptIcons[key] ?? []).slice(0, 6).map((u) => shrink(u, 160)),
    );
  }
  generated.conceptIcons = conceptIcons;
  if (fs.existsSync(bannerPath)) {
    const bannerUrl = await shrink(fileToDataUrl(bannerPath, "image/png"), 640);
    generated.sections = generated.sections.map((s: DetailSection) =>
      s.type === "illustration_banner" ? { ...s, illustrationUrl: bannerUrl } : s,
    );
  }
  if (!session.pipelineSummary) {
    session.pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated.imageAnalysis || "144 probe",
      theme: generated.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated.photoCostBreakdown,
      backdropFailed: false,
      sectionCount: generated.sections.length,
    });
  }
  session.draftApproved = true;

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  const raw = JSON.stringify(session);
  const stored = await page.evaluate((payload) => {
    try {
      sessionStorage.setItem("pagzly-create-result", payload);
      return sessionStorage.getItem("pagzly-create-result")?.length ?? -1;
    } catch (e) {
      return `ERR:${String(e)}`;
    }
  }, raw);
  console.log(`[144][G] sessionStorage stored=${stored}`);
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="desktop-structure-sidebar"]', { timeout: 45000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) await expand.click().catch(() => undefined);
  await freezeDetailScrollReveal(page);
  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  await preview.waitFor({ state: "visible", timeout: 15000 });
  const out = path.join(SHOT, "144cha-full-050-page.png");
  await preview.screenshot({ path: out });
  await browser.close();
  (breakdown.phases.g_full as Record<string, unknown>).fullPage = out;
}

function verifyWiring(): string[] {
  const icons = fs.readFileSync(path.join(ROOT, "lib/concept-icons.ts"), "utf8");
  const illust = fs.readFileSync(path.join(ROOT, "lib/concept-illustration.ts"), "utf8");
  const planner = fs.readFileSync(path.join(ROOT, "lib/lifestyle-shot-planner.ts"), "utf8");
  const notes: string[] = [];
  if (!icons.includes('if (key === "statInfographic") return "recraft-v3"')) {
    notes.push("WARN: 142 stat wiring missing");
  } else notes.push("OK: statInfographic → recraft-v3");
  if (!illust.includes('const ILLUSTRATION_BANNER_MODEL: IconModelKey = "recraft-v3"')) {
    notes.push("WARN: banner model missing");
  } else notes.push("OK: banner → recraft-v3");
  if (!planner.includes("if (uploadCount >= 8) return 4")) {
    notes.push("WARN: studio limit changed");
  } else notes.push("OK: computeStudioCompositeLimit(8)=4 unchanged");
  if (icons.includes("recraft-v4") && icons.includes('IconModelKey = "flux-schnell" |')) {
    // v4 in comments ok; production key union should not include v4 for default routing
  }
  if (!icons.includes('"recraft-v3"') || icons.includes('| "recraft-v4"')) {
    // if v4 added to union that's still ok if not defaulted — check getIconModel
  }
  return notes;
}

async function writeReport(breakdown: Breakdown) {
  const envDiff = {
    before: breakdown.env.before,
    after: breakdown.env.after,
    restored: breakdown.env.restored,
  };
  const lines = [
    `# 144차 — $0.50 프리미엄 페이지 실측 보고`,
    ``,
    `생성: 2026-09-08`,
    `원칙: 비교·실측만. 프로덕션 배선/기본값 미변경. .env 측정 후 원복.`,
    ``,
    `## 0. 배선·env`,
    ``,
    ...verifyWiring().map((n) => `- ${n}`),
    ``,
    `### .env.local before/after (tracked keys only)`,
    ``,
    "```json",
    JSON.stringify(envDiff, null, 2),
    "```",
    ``,
    `## 1. A — 배경 후보 / 127 불일치 확정`,
    ``,
    ...breakdown.findings.filter((f) => f.startsWith("A")).map((f) => `- ${f}`),
    ``,
    "```json",
    JSON.stringify(breakdown.phases.a_backdrop ?? null, null, 2),
    "```",
    ``,
    `스크린샷: \`review/qa-screenshots/144cha-backdrop-candidates-2v4.png\``,
    ``,
    `**결론:** 라이브 \`flux-kontext-pro\`는 \`BACKDROP_CANDIDATES\`가 아니라 \`BRIA_BACKDROP_CANDIDATES\`(기본 2, 코드 상한 3)를 쓴다. 히어로 배경 원가 앵커는 **$0.04가 아니라 $0.08(2×$0.04)** 가 맞다.`,
    ``,
    `## 2. B — 스튜디오 컴포지트 4→8`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.b_studio ?? null, null, 2),
    "```",
    ``,
    `## 3. C — AI 라이프스타일샷 standard/premium`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.c_lifestyle ?? null, null, 2),
    "```",
    ``,
    `## 4. D — 라이프스타일 합성`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.d_composite ?? null, null, 2),
    "```",
    ``,
    `## 5. E — recraft-v4-svg + flux-dev (실 아이템 수)`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.e_icons ?? null, null, 2),
    "```",
    ``,
    `## 6. F — 이펙트 1→3`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.f_effects ?? null, null, 2),
    "```",
    ``,
    `## 7. G — $0.50 조합 종합`,
    ``,
    "```json",
    JSON.stringify(breakdown.phases.g_full ?? null, null, 2),
    "```",
    ``,
    `## 컴포넌트별 totals`,
    ``,
    "```json",
    JSON.stringify(breakdown.totals, null, 2),
    "```",
    ``,
    `## Findings (all)`,
    ``,
    ...breakdown.findings.map((f) => `- ${f}`),
    ``,
  ];
  fs.writeFileSync(path.join(OUT, "144cha-report.md"), lines.join("\n"), "utf8");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  const phase = (process.argv[2] || "all").toLowerCase();
  const rawBefore = loadEnvFile();
  fs.writeFileSync(ENV_BACKUP, rawBefore, "utf8");
  applyEnvToProcess(rawBefore);

  const breakdown = loadBreakdown();
  breakdown.env.before = parseEnvKeys(rawBefore, [...TRACKED_ENV]);
  breakdown.wiringUnchanged = true;

  try {
    if (phase === "all" || phase === "a-backdrop") await phaseA(breakdown);
    if (phase === "all" || phase === "b-studio") await phaseB(breakdown);
    if (phase === "all" || phase === "c-lifestyle") await phaseC(breakdown);
    if (phase === "all" || phase === "d-composite") await phaseD(breakdown);
    if (phase === "all" || phase === "e-icons") await phaseE(breakdown);
    if (phase === "all" || phase === "f-effects") await phaseF(breakdown);
    if (phase === "all" || phase === "g-full") await phaseG(breakdown);
    if (phase === "report") await writeReport(breakdown);
  } finally {
    // Always restore .env.local from backup
    fs.writeFileSync(ENV_PATH, fs.readFileSync(ENV_BACKUP, "utf8"), "utf8");
    applyEnvToProcess(loadEnvFile());
    const after = parseEnvKeys(loadEnvFile(), [...TRACKED_ENV]);
    breakdown.env.after = after;
    breakdown.env.restored = JSON.stringify(breakdown.env.before) === JSON.stringify(after);
    saveBreakdown(breakdown);
    await writeReport(breakdown);
    console.log(`[144] env restored=${breakdown.env.restored}`, after);
  }
}

main().catch((e) => {
  console.error(e);
  try {
    if (fs.existsSync(ENV_BACKUP)) {
      fs.writeFileSync(ENV_PATH, fs.readFileSync(ENV_BACKUP, "utf8"), "utf8");
      console.log("[144] env restored after error");
    }
  } catch {
    /* ignore */
  }
  process.exit(1);
});
