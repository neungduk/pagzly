/**
 * 140차 — flux-schnell vs recraft-v3 인포 아이콘·배너 A/B (최소 수량)
 *   npx tsx scripts/140cha-icon-model-ab.ts
 *
 * - TEST_MODE: 타입당 아이콘 1장 ×4 + illustration_banner 1장 = 모델당 5장
 * - .env.local ICON_MODEL을 임시 설정했다가 종료 시 원복
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import {
  generateConceptIcons,
  getIconModel,
  ICON_COST_USD_BY_MODEL,
  type IconModelKey,
} from "../lib/concept-icons";
import { generateIllustrationBanner } from "../lib/concept-illustration";
import type { ConceptBrief } from "../lib/concept-brief";
import { getCategoryTheme } from "../lib/category-theme";

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

const LABELS = {
  checklist: ["수분 레이어"],
  usage: ["세안 후 도포"],
  spec: ["용량"],
  stat: ["수분감"],
};

function readEnvLocal(): string {
  return fs.readFileSync(ENV_PATH, "utf8");
}

function getIconModelLine(raw: string): string | null {
  const m = raw.match(/^ICON_MODEL=.*$/m);
  return m ? m[0]! : null;
}

/** ICON_MODEL 라인만 교체/추가. 다른 키는 건드리지 않음. */
function setIconModelInEnv(value: string | null): { before: string | null; after: string | null } {
  const raw = readEnvLocal();
  const before = getIconModelLine(raw);
  let next: string;
  if (value == null) {
    next = before ? raw.replace(/^ICON_MODEL=.*$/m, "").replace(/\n{3,}/g, "\n\n") : raw;
  } else if (before) {
    next = raw.replace(/^ICON_MODEL=.*$/m, `ICON_MODEL=${value}`);
  } else {
    const trimmed = raw.replace(/\s*$/, "");
    next = `${trimmed}\nICON_MODEL=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, next, "utf8");
  return { before, after: getIconModelLine(next) };
}

function loadEnvLocalIntoProcess() {
  const raw = readEnvLocal();
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

function dataUrlToPng(dataUrl: string, filePath: string) {
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
}

async function runModel(model: IconModelKey, log: (s: string) => void) {
  process.env.ICON_MODEL = model;
  process.env.TEST_MODE = "true";
  // .env.local도 동기화 (브리프 요구)
  setIconModelInEnv(model);
  loadEnvLocalIntoProcess();
  process.env.ICON_MODEL = model;
  process.env.TEST_MODE = "true";

  if (getIconModel() !== model) {
    throw new Error(`getIconModel()=${getIconModel()} expected ${model}`);
  }

  const theme = getCategoryTheme("화장품/뷰티");
  log(`[140] === model=${model} cost/ea=$${ICON_COST_USD_BY_MODEL[model]} TEST_MODE=${process.env.TEST_MODE}`);

  const icons = await generateConceptIcons(
    BRIEF,
    theme,
    LABELS.checklist,
    LABELS.usage,
    LABELS.spec,
    LABELS.stat,
  );
  const banner = await generateIllustrationBanner(BRIEF, theme);
  const totalCost = icons.cost + banner.cost;
  log(`[140] ${model} icons.cost=$${icons.cost.toFixed(4)} banner.cost=$${banner.cost.toFixed(4)} total=$${totalCost.toFixed(4)}`);

  const slug = model === "flux-schnell" ? "schnell" : "recraft";
  const files: string[] = [];
  const entries: [string, string | undefined][] = [
    ["checklist", icons.icons.checklist?.[0]],
    ["usage", icons.icons.usageSteps?.[0]],
    ["spec", icons.icons.specTable?.[0]],
    ["stat", icons.icons.statInfographic?.[0]],
  ];
  for (const [name, url] of entries) {
    if (!url) {
      log(`[140] WARN missing icon ${slug}/${name}`);
      continue;
    }
    const fp = path.join(OUT, `140cha-${slug}-icon-${name}.png`);
    dataUrlToPng(url, fp);
    files.push(fp);
    log(`[140] wrote ${path.basename(fp)}`);
  }
  if (banner.dataUrl) {
    const fp = path.join(OUT, `140cha-${slug}-banner.png`);
    dataUrlToPng(banner.dataUrl, fp);
    files.push(fp);
    log(`[140] wrote ${path.basename(fp)}`);
  } else {
    log(`[140] WARN missing banner ${slug}`);
  }

  return { model, slug, totalCost, files, iconCount: entries.filter(([, u]) => u).length };
}

async function composeBoard(
  slug: "schnell" | "recraft",
  files: { label: string; path: string }[],
): Promise<string> {
  const tile = 256;
  const cols = 3;
  const rows = 2;
  const gap = 16;
  const labelH = 28;
  const w = cols * tile + (cols + 1) * gap;
  const h = rows * (tile + labelH) + (rows + 1) * gap + 40;
  const composites: OverlayOptions[] = [];

  const titleSvg = Buffer.from(
    `<svg width="${w}" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#F5F1EA"/>
      <text x="16" y="28" font-family="Arial,sans-serif" font-size="18" fill="#1B1B18">140cha ICON_MODEL=${slug}</text>
    </svg>`,
  );
  composites.push({ input: titleSvg, left: 0, top: 0 });

  for (let i = 0; i < files.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (tile + gap);
    const top = 40 + gap + row * (tile + labelH + gap);
    const img = await sharp(files[i]!.path)
      .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
      .png()
      .toBuffer();
    composites.push({ input: img, left, top });
    const labelSvg = Buffer.from(
      `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="20" font-family="Arial,sans-serif" font-size="14" fill="#3A3A36">${files[i]!.label}</text>
      </svg>`,
    );
    composites.push({ input: labelSvg, left, top: top + tile });
  }

  const out = path.join(SHOT, `140cha-icon-model-ab-${slug}.png`);
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

  const originalRaw = readEnvLocal();
  const originalLine = getIconModelLine(originalRaw);
  const logLines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    logLines.push(s);
  };

  log(`[140] original ICON_MODEL line: ${originalLine ?? "(absent → flux-schnell fallback)"}`);

  try {
    const schnell = await runModel("flux-schnell", log);
    const recraft = await runModel("recraft-v3", log);

    const schnellFiles = [
      { label: "checklist", path: path.join(OUT, "140cha-schnell-icon-checklist.png") },
      { label: "usage_steps", path: path.join(OUT, "140cha-schnell-icon-usage.png") },
      { label: "spec_table", path: path.join(OUT, "140cha-schnell-icon-spec.png") },
      { label: "stat_infographic", path: path.join(OUT, "140cha-schnell-icon-stat.png") },
      { label: "illustration_banner", path: path.join(OUT, "140cha-schnell-banner.png") },
    ].filter((f) => fs.existsSync(f.path));
    const recraftFiles = [
      { label: "checklist", path: path.join(OUT, "140cha-recraft-icon-checklist.png") },
      { label: "usage_steps", path: path.join(OUT, "140cha-recraft-icon-usage.png") },
      { label: "spec_table", path: path.join(OUT, "140cha-recraft-icon-spec.png") },
      { label: "stat_infographic", path: path.join(OUT, "140cha-recraft-icon-stat.png") },
      { label: "illustration_banner", path: path.join(OUT, "140cha-recraft-banner.png") },
    ].filter((f) => fs.existsSync(f.path));

    const boardSchnell = await composeBoard("schnell", schnellFiles);
    const boardRecraft = await composeBoard("recraft", recraftFiles);
    log(`[140] board ${boardSchnell}`);
    log(`[140] board ${boardRecraft}`);

    const expectedRecraft = 0.04 * (recraft.iconCount + (fs.existsSync(path.join(OUT, "140cha-recraft-banner.png")) ? 1 : 0));
    log(`[140] expected recraft ≈ $${expectedRecraft.toFixed(2)} (actual $${recraft.totalCost.toFixed(4)})`);
    log(`[140] expected schnell ≈ $${(0.003 * schnell.iconCount + (fs.existsSync(path.join(OUT, "140cha-schnell-banner.png")) ? 0.003 : 0)).toFixed(3)} (actual $${schnell.totalCost.toFixed(4)})`);

    fs.writeFileSync(
      path.join(OUT, "140cha-ab-run-log.txt"),
      logLines.join("\n") +
        `\n\nJSON\n` +
        JSON.stringify(
          {
            schnell,
            recraft,
            boardSchnell,
            boardRecraft,
            originalIconModelLine: originalLine,
          },
          null,
          2,
        ),
      "utf8",
    );
  } finally {
    // 원복: 원래 라인이 없으면 삭제, 있으면 그 값으로
    if (originalLine) {
      const val = originalLine.replace(/^ICON_MODEL=/, "");
      setIconModelInEnv(val);
    } else {
      setIconModelInEnv(null);
    }
    const restored = getIconModelLine(readEnvLocal());
    log(`[140] restored ICON_MODEL line: ${restored ?? "(absent)"}`);
    if ((originalLine ?? null) !== (restored ?? null)) {
      // normalize whitespace-only diffs: compare values
      const ov = originalLine?.replace(/^ICON_MODEL=/, "") ?? null;
      const rv = restored?.replace(/^ICON_MODEL=/, "") ?? null;
      if (ov !== rv) {
        console.error("[140] ICON_MODEL restore mismatch", { originalLine, restored });
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  // best-effort restore on crash — re-read original from backup? we only have in-memory if crash mid-way
  process.exit(1);
});
