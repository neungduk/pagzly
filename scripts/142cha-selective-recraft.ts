/**
 * 142차 — 선별 recraft 검증 (TEST_MODE 아이콘4+배너1)
 *   npx tsx scripts/142cha-selective-recraft.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import { chromium } from "playwright";
import {
  generateConceptIcons,
  getIconModel,
  ICON_COST_USD_BY_MODEL,
  resolveRecraftStyle,
} from "../lib/concept-icons";
import { generateIllustrationBanner } from "../lib/concept-illustration";
import type { ConceptBrief } from "../lib/concept-brief";
import { getCategoryTheme } from "../lib/category-theme";
import { freezeDetailScrollReveal } from "./capture-utils";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const SESSION_PATH = path.join(ROOT, "review", "beauty-showcase-one", "session.json");
const STORAGE_STATE_PATH = path.join(__dirname, "auth-state.json");

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

function dataUrlToFile(dataUrl: string, filePath: string) {
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
}

async function composeBoard(files: { label: string; path: string }[]): Promise<string> {
  const tile = 220;
  const cols = 3;
  const rows = 2;
  const gap = 14;
  const labelH = 26;
  const w = cols * tile + (cols + 1) * gap;
  const h = rows * (tile + labelH) + (rows + 1) * gap + 44;
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="14" y="28" font-family="Arial,sans-serif" font-size="15" fill="#1B1B18">142 selective: banner+stat=recraft, checklist/usage/spec=schnell</text></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (let i = 0; i < files.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (tile + gap);
    const top = 44 + gap + row * (tile + labelH + gap);
    const img = await sharp(files[i]!.path)
      .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
      .png()
      .toBuffer();
    composites.push({ input: img, left, top });
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-family="Arial,sans-serif" font-size="12" fill="#3A3A36">${files[i]!.label}</text></svg>`,
      ),
      left,
      top: top + tile,
    });
  }
  const out = path.join(SHOT, "142cha-selective-recraft-board.png");
  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 245, g: 241, b: 234 } },
  })
    .composite(composites)
    .png()
    .toFile(out);
  return out;
}

async function captureSessionPreview(
  icons: {
    checklist?: string[];
    usageSteps?: string[];
    specTable?: string[];
    statInfographic?: string[];
  },
  bannerUrl: string,
): Promise<string | null> {
  if (!fs.existsSync(SESSION_PATH) || !fs.existsSync(STORAGE_STATE_PATH)) {
    console.warn("[142] session/auth missing — skip fullpage capture");
    return null;
  }
  const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8")) as {
    generated?: {
      sections?: DetailSection[];
      imageAnalysis?: string;
      theme?: { baseNeutral?: string };
      conceptIcons?: Record<string, string[]>;
      photoCostBreakdown?: Record<string, number>;
    };
    draftApproved?: boolean;
    pipelineSummary?: unknown;
    photoProcessingCost?: number;
    photoCostBreakdown?: Record<string, number>;
    backdropFailed?: boolean;
  };
  const generated = session.generated;
  if (!generated?.sections) return null;

  generated.conceptIcons = {
    checklist: icons.checklist ?? [],
    usageSteps: icons.usageSteps ?? [],
    specTable: icons.specTable ?? [],
    statInfographic: icons.statInfographic ?? [],
  };

  // Cluster banner + checklist + stat so one screenshot shows all three
  let sections = [...generated.sections] as DetailSection[];
  sections = sections.map((s) =>
    s.type === "illustration_banner" ? { ...s, illustrationUrl: bannerUrl } : s,
  );
  type BannerSec = Extract<DetailSection, { type: "illustration_banner" }>;
  type ChecklistSec = Extract<DetailSection, { type: "checklist" }>;
  type StatSec = Extract<DetailSection, { type: "stat_infographic" }>;

  let bannerSec = sections.find((s): s is BannerSec => s.type === "illustration_banner");
  if (!bannerSec) {
    bannerSec = {
      type: "illustration_banner",
      slot: "illustration_banner",
      heading: "수분 컨셉",
      body: "촉촉한 수분 레이어를 한눈에",
      illustrationUrl: bannerUrl,
    };
  }
  let checklistSec = sections.find((s): s is ChecklistSec => s.type === "checklist");
  if (!checklistSec) {
    checklistSec = {
      type: "checklist",
      slot: "checklist",
      heading: "이런 고민이 있다면",
      items: ["수분 레이어", "건조함", "산뜻한 마무리"],
    };
  }
  let statSec = sections.find((s): s is StatSec => s.type === "stat_infographic");
  if (!statSec) {
    statSec = {
      type: "stat_infographic",
      slot: "stat_infographic",
      heading: "수치로 보는 수분감",
      metrics: [
        { label: "수분감", value: "92%", percent: 92, style: "ring", basis: "self_assessed" },
      ],
    };
  }
  const rest: DetailSection[] = sections.filter(
    (s) =>
      s.type !== "illustration_banner" &&
      s.type !== "checklist" &&
      s.type !== "stat_infographic",
  );
  const heroIdx = rest.findIndex((s) => s.type === "hero");
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0;
  // After hero: checklist → banner → stat (icons + recraft assets visible together)
  rest.splice(insertAt, 0, checklistSec, bannerSec, statSec);
  generated.sections = rest;
  sections = rest;

  if (!session.pipelineSummary) {
    session.pipelineSummary = buildGenerationPipelineSummary({
      imageAnalysis: generated.imageAnalysis || "142 fixture",
      theme: generated.theme,
      photoProcessingCost: Number(session.photoProcessingCost) || 0,
      photoCostBreakdown: session.photoCostBreakdown ?? generated.photoCostBreakdown,
      backdropFailed: Boolean(session.backdropFailed),
      sectionCount: sections.length,
    });
  }
  session.draftApproved = true;

  const browser = await chromium
    .launch({ headless: true, channel: "chrome" })
    .catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/create`, { waitUntil: "domcontentloaded" });
  const raw = JSON.stringify(session);
  console.log(`[142] session JSON bytes=${raw.length}`);
  const stored = await page.evaluate((payload) => {
    try {
      sessionStorage.setItem("pagzly-create-result", payload);
      return sessionStorage.getItem("pagzly-create-result")?.length ?? -1;
    } catch (e) {
      return `ERR:${String(e)}`;
    }
  }, raw);
  console.log(`[142] sessionStorage stored=${stored}`);
  if (typeof stored === "string" && stored.startsWith("ERR:")) {
    throw new Error(`sessionStorage inject failed: ${stored}`);
  }
  await page.goto(`${BASE_URL}/create/result`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="desktop-structure-sidebar"]', { timeout: 45000 });
  const expand = page
    .locator('[data-testid="result-desktop-split"] [data-testid="detail-preview-expand"]')
    .first();
  if (await expand.count()) {
    await expand.click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await freezeDetailScrollReveal(page);

  const preview = page.locator(
    '[data-testid="result-desktop-split"] [data-testid="detail-preview"]',
  );
  await preview.waitFor({ state: "visible", timeout: 15000 });

  // Prefer sections that show banner / checklist / stats together in one frame
  const cluster = preview.locator("section").filter({ hasText: "수분" }).first();
  if (await cluster.count()) {
    await cluster.scrollIntoViewIfNeeded().catch(() => undefined);
  } else {
    const checklistEl = preview.getByText("이런 고민").first();
    if (await checklistEl.count()) await checklistEl.scrollIntoViewIfNeeded().catch(() => undefined);
  }
  await freezeDetailScrollReveal(page);
  await page.waitForTimeout(400);

  // Verify inject landed
  const dataImgCount = await preview.locator('img[src^="data:image"]').count();
  console.log(`[142] capture data:image count=${dataImgCount}`);

  const out = path.join(SHOT, "142cha-selective-recraft-full.png");
  await preview.screenshot({ path: out });
  await browser.close();
  return out;
}

function fileToDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** sessionStorage quota 회피 — 캡처용으로만 축소 data URL */
async function fileToCaptureDataUrl(
  filePath: string,
  opts: { width: number; height?: number },
): Promise<string> {
  const buf = await sharp(filePath)
    .resize(opts.width, opts.height ?? opts.width, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  loadEnvLocal();
  process.env.TEST_MODE = "true";
  // do not change ICON_MODEL — should resolve to flux-schnell (or typo fallback)

  const captureOnly = process.env.CAPTURE_ONLY === "1";
  const logLines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    logLines.push(s);
  };

  log(`[142] ICON_MODEL env resolve=${getIconModel()} RECRAFT_STYLE=${resolveRecraftStyle()}`);
  log(
    `[142] expected schnell=$${ICON_COST_USD_BY_MODEL["flux-schnell"]} ×3 + recraft=$${ICON_COST_USD_BY_MODEL["recraft-v3"]} ×2 (stat+banner) ≈ $0.089`,
  );

  let icons: Awaited<ReturnType<typeof generateConceptIcons>>;
  let banner: Awaited<ReturnType<typeof generateIllustrationBanner>>;

  if (captureOnly) {
    log("[142] CAPTURE_ONLY — reuse review/142cha-*.png (no Replicate calls)");
    const need = [
      "checklist",
      "usage_steps",
      "spec_table",
      "stat_infographic",
      "illustration_banner",
    ] as const;
    for (const slug of need) {
      if (!fs.existsSync(path.join(OUT, `142cha-${slug}.png`))) {
        throw new Error(`missing review/142cha-${slug}.png for CAPTURE_ONLY`);
      }
    }
    // shrink for sessionStorage — full PNG base64 exceeds quota and silently drops inject
    icons = {
      icons: {
        checklist: [await fileToCaptureDataUrl(path.join(OUT, "142cha-checklist.png"), { width: 192 })],
        usageSteps: [
          await fileToCaptureDataUrl(path.join(OUT, "142cha-usage_steps.png"), { width: 192 }),
        ],
        specTable: [
          await fileToCaptureDataUrl(path.join(OUT, "142cha-spec_table.png"), { width: 192 }),
        ],
        statInfographic: [
          await fileToCaptureDataUrl(path.join(OUT, "142cha-stat_infographic.png"), {
            width: 256,
          }),
        ],
      },
      cost: 0.049,
    };
    banner = {
      dataUrl: await fileToCaptureDataUrl(path.join(OUT, "142cha-illustration_banner.png"), {
        width: 960,
        height: 540,
      }),
      cost: 0.04,
    };
    log(
      `[142] capture payloads bytes~ icons=${JSON.stringify(icons.icons).length} banner=${banner.dataUrl.length}`,
    );
  } else {
    const theme = getCategoryTheme("화장품/뷰티");
    icons = await generateConceptIcons(
      BRIEF,
      theme,
      ["수분 레이어"],
      ["세안 후 도포"],
      ["용량"],
      ["수분감"],
    );
    banner = await generateIllustrationBanner(BRIEF, theme);
  }

  const total = icons.cost + banner.cost;
  log(
    `[142] icons.cost=$${icons.cost.toFixed(4)} banner.cost=$${banner.cost.toFixed(4)} total=$${total.toFixed(4)}`,
  );

  if (!captureOnly) {
    const files: { label: string; path: string }[] = [];
    const mapping: [string, string | undefined][] = [
      ["checklist (schnell)", icons.icons.checklist?.[0]],
      ["usage_steps (schnell)", icons.icons.usageSteps?.[0]],
      ["spec_table (schnell)", icons.icons.specTable?.[0]],
      ["stat_infographic (recraft)", icons.icons.statInfographic?.[0]],
      ["illustration_banner (recraft)", banner.dataUrl || undefined],
    ];
    for (const [label, url] of mapping) {
      if (!url) {
        log(`[142] WARN missing ${label}`);
        continue;
      }
      const slug = label.split(" ")[0]!.replace(/[^a-z_]/gi, "");
      const fp = path.join(OUT, `142cha-${slug}.png`);
      dataUrlToFile(url, fp);
      const pngFp = fp.replace(/\.png$/, "-board.png");
      await sharp(fp)
        .png()
        .toFile(pngFp)
        .catch(async () => {
          fs.copyFileSync(fp, pngFp);
        });
      files.push({ label, path: pngFp });
      log(`[142] wrote ${path.basename(fp)}`);
    }
    const board = await composeBoard(files);
    log(`[142] board ${board}`);
  }

  const full = await captureSessionPreview(icons.icons, banner.dataUrl);
  if (full) log(`[142] full ${full}`);

  fs.writeFileSync(
    path.join(OUT, "142cha-run-log.txt"),
    logLines.join("\n") +
      `\n\nJSON\n` +
      JSON.stringify(
        {
          iconModel: getIconModel(),
          recraftStyle: resolveRecraftStyle(),
          iconsCost: icons.cost,
          bannerCost: banner.cost,
          total,
          estimateSelectiveDelta: "0.07~0.15",
          captureOnly,
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
