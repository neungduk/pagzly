/**
 * 141차 — recraft 텍스트 환각 억제 재생성 + style 후보 비교
 *   npx tsx scripts/141cha-recraft-no-text.ts
 *
 * 세트 A: RECRAFT_STYLE=digital_illustration (강화 프롬프트)
 * 세트 B: RECRAFT_STYLE=digital_illustration/hand_drawn_outline
 * 각 5장(아이콘4+배너1) → 합계 10장 × $0.04 = $0.40
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import {
  generateConceptIcons,
  getIconModel,
  resolveRecraftStyle,
  type RecraftStyle,
} from "../lib/concept-icons";
import { generateIllustrationBanner } from "../lib/concept-illustration";
import type { ConceptBrief } from "../lib/concept-brief";
import { getCategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");
const BACKUP = path.join(OUT, "141cha-icon-model-backup.txt");

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

type StyleRun = {
  style: RecraftStyle;
  slug: string;
  boardName: string;
};

const RUNS: StyleRun[] = [
  {
    style: "digital_illustration",
    slug: "di",
    boardName: "141cha-icon-model-ab-recraft-v2.png",
  },
  {
    style: "digital_illustration/hand_drawn_outline",
    slug: "outline",
    boardName: "141cha-icon-model-ab-recraft-outline.png",
  },
];

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

function getIconModelLine(raw: string): string | null {
  const m = raw.match(/^ICON_MODEL=.*$/m);
  return m ? m[0]! : null;
}

function setIconModel(value: string | null) {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  let next: string;
  if (value == null) {
    next = raw.replace(/^ICON_MODEL=.*$/m, "").replace(/\n{3,}/g, "\n\n");
  } else if (getIconModelLine(raw)) {
    next = raw.replace(/^ICON_MODEL=.*$/m, `ICON_MODEL=${value}`);
  } else {
    next = `${raw.replace(/\s*$/, "")}\nICON_MODEL=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, next, "utf8");
}

function dataUrlToPng(dataUrl: string, filePath: string) {
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
}

async function composeBoard(
  boardName: string,
  title: string,
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
  composites.push({
    input: Buffer.from(
      `<svg width="${w}" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="16" y="28" font-family="Arial,sans-serif" font-size="16" fill="#1B1B18">${title.replace(/[<>&]/g, "")}</text></svg>`,
    ),
    left: 0,
    top: 0,
  });
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
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="20" font-family="Arial,sans-serif" font-size="14" fill="#3A3A36">${files[i]!.label}</text></svg>`,
      ),
      left,
      top: top + tile,
    });
  }
  const out = path.join(SHOT, boardName);
  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 245, g: 241, b: 234 } },
  })
    .composite(composites)
    .png()
    .toFile(out);
  return out;
}

async function runStyle(run: StyleRun, log: (s: string) => void) {
  process.env.ICON_MODEL = "recraft-v3";
  process.env.RECRAFT_STYLE = run.style;
  process.env.TEST_MODE = "true";
  setIconModel("recraft-v3");

  if (getIconModel() !== "recraft-v3") throw new Error("ICON_MODEL not applied");
  if (resolveRecraftStyle() !== run.style) {
    throw new Error(`style resolve=${resolveRecraftStyle()} expected ${run.style}`);
  }

  const theme = getCategoryTheme("화장품/뷰티");
  log(`[141] === style=${run.style} slug=${run.slug}`);

  const icons = await generateConceptIcons(
    BRIEF,
    theme,
    LABELS.checklist,
    LABELS.usage,
    LABELS.spec,
    LABELS.stat,
  );
  const banner = await generateIllustrationBanner(BRIEF, theme);
  const total = icons.cost + banner.cost;
  log(
    `[141] ${run.slug} icons=$${icons.cost.toFixed(4)} banner=$${banner.cost.toFixed(4)} total=$${total.toFixed(4)}`,
  );

  const entries: [string, string | undefined][] = [
    ["checklist", icons.icons.checklist?.[0]],
    ["usage", icons.icons.usageSteps?.[0]],
    ["spec", icons.icons.specTable?.[0]],
    ["stat", icons.icons.statInfographic?.[0]],
  ];
  const files: { label: string; path: string }[] = [];
  for (const [name, url] of entries) {
    if (!url) {
      log(`[141] WARN missing ${run.slug}/${name}`);
      continue;
    }
    const fp = path.join(OUT, `141cha-${run.slug}-icon-${name}.png`);
    dataUrlToPng(url, fp);
    files.push({ label: name === "usage" ? "usage_steps" : name === "spec" ? "spec_table" : name === "stat" ? "stat_infographic" : name, path: fp });
    log(`[141] wrote ${path.basename(fp)}`);
  }
  if (banner.dataUrl) {
    const fp = path.join(OUT, `141cha-${run.slug}-banner.png`);
    dataUrlToPng(banner.dataUrl, fp);
    files.push({ label: "illustration_banner", path: fp });
    log(`[141] wrote ${path.basename(fp)}`);
  }

  const board = await composeBoard(
    run.boardName,
    `141cha recraft style=${run.style}`,
    files,
  );
  log(`[141] board ${board}`);
  return { run, total, files, board, imageCount: files.length };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  loadEnvLocal();

  const originalRaw = fs.readFileSync(ENV_PATH, "utf8");
  const originalLine = getIconModelLine(originalRaw);
  fs.writeFileSync(BACKUP, originalLine ?? "__ABSENT__", "utf8");

  const logLines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    logLines.push(s);
  };
  log(`[141] original ${originalLine ?? "(absent)"}`);
  log(`[141] planned images=${RUNS.length * 5} estCost=$${(RUNS.length * 5 * 0.04).toFixed(2)}`);

  const results = [];
  try {
    for (const run of RUNS) {
      results.push(await runStyle(run, log));
      // rate limit: burst=1 on low credit
      await new Promise((r) => setTimeout(r, 12_000));
    }
  } finally {
    const backup = fs.readFileSync(BACKUP, "utf8").trim();
    if (backup === "__ABSENT__") setIconModel(null);
    else setIconModel(backup.replace(/^ICON_MODEL=/, ""));
    const restored = getIconModelLine(fs.readFileSync(ENV_PATH, "utf8"));
    log(`[141] restored ${restored ?? "(absent)"}`);
  }

  const sumCost = results.reduce((s, r) => s + r.total, 0);
  const sumImgs = results.reduce((s, r) => s + r.imageCount, 0);
  log(`[141] TOTAL cost=$${sumCost.toFixed(4)} images=${sumImgs}`);
  fs.writeFileSync(
    path.join(OUT, "141cha-run-log.txt"),
    logLines.join("\n") + "\n\n" + JSON.stringify(results, null, 2),
    "utf8",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
