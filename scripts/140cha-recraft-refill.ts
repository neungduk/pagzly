/**
 * 140차 — recraft-v3 누락 아이콘만 순차 재생성 (429 보완)
 *   npx tsx scripts/140cha-recraft-refill.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import { generateConceptIcons, getIconModel } from "../lib/concept-icons";
import type { ConceptBrief } from "../lib/concept-brief";
import { getCategoryTheme } from "../lib/category-theme";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");
const SHOT = path.join(OUT, "qa-screenshots");
const ENV_PATH = path.join(ROOT, ".env.local");
const BACKUP = path.join(OUT, "140cha-icon-model-backup.txt");

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

async function composeRecraftBoard() {
  const files = [
    { label: "checklist", path: path.join(OUT, "140cha-recraft-icon-checklist.png") },
    { label: "usage_steps", path: path.join(OUT, "140cha-recraft-icon-usage.png") },
    { label: "spec_table", path: path.join(OUT, "140cha-recraft-icon-spec.png") },
    { label: "stat_infographic", path: path.join(OUT, "140cha-recraft-icon-stat.png") },
    { label: "illustration_banner", path: path.join(OUT, "140cha-recraft-banner.png") },
  ].filter((f) => fs.existsSync(f.path));

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
      `<svg width="${w}" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="16" y="28" font-family="Arial,sans-serif" font-size="18" fill="#1B1B18">140cha ICON_MODEL=recraft</text></svg>`,
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
  const out = path.join(SHOT, "140cha-icon-model-ab-recraft.png");
  await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 245, g: 241, b: 234 } },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log("[140-refill] board", out);
}

async function main() {
  // load secrets into process.env without printing
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

  const backup = fs.readFileSync(BACKUP, "utf8").trim();
  const originalVal = backup === "__ABSENT__" ? null : backup.replace(/^ICON_MODEL=/, "");

  const missing: { key: "checklist" | "usage" | "spec" | "stat"; file: string; labels: string[] }[] = [];
  if (!fs.existsSync(path.join(OUT, "140cha-recraft-icon-checklist.png"))) {
    missing.push({ key: "checklist", file: "140cha-recraft-icon-checklist.png", labels: ["수분 레이어"] });
  }
  if (!fs.existsSync(path.join(OUT, "140cha-recraft-icon-spec.png"))) {
    missing.push({ key: "spec", file: "140cha-recraft-icon-spec.png", labels: ["용량"] });
  }
  if (!fs.existsSync(path.join(OUT, "140cha-recraft-icon-stat.png"))) {
    missing.push({ key: "stat", file: "140cha-recraft-icon-stat.png", labels: ["수분감"] });
  }

  if (missing.length === 0) {
    console.log("[140-refill] nothing missing");
    await composeRecraftBoard();
    return;
  }

  try {
    setIconModel("recraft-v3");
    process.env.ICON_MODEL = "recraft-v3";
    process.env.TEST_MODE = "true";
    if (getIconModel() !== "recraft-v3") throw new Error("ICON_MODEL not applied");

    const theme = getCategoryTheme("화장품/뷰티");
    let cost = 0;
    for (const item of missing) {
      console.log(`[140-refill] generating ${item.key}…`);
      const result = await generateConceptIcons(
        BRIEF,
        theme,
        item.key === "checklist" ? item.labels : [],
        item.key === "usage" ? item.labels : [],
        item.key === "spec" ? item.labels : [],
        item.key === "stat" ? item.labels : [],
      );
      cost += result.cost;
      const url =
        item.key === "checklist"
          ? result.icons.checklist?.[0]
          : item.key === "spec"
            ? result.icons.specTable?.[0]
            : result.icons.statInfographic?.[0];
      if (!url) throw new Error(`missing output for ${item.key}`);
      dataUrlToPng(url, path.join(OUT, item.file));
      console.log(`[140-refill] wrote ${item.file} (+$${result.cost.toFixed(4)})`);
      await new Promise((r) => setTimeout(r, 12_000));
    }
    console.log(`[140-refill] refill cost=$${cost.toFixed(4)}`);
    await composeRecraftBoard();
  } finally {
    setIconModel(originalVal);
    const now = getIconModelLine(fs.readFileSync(ENV_PATH, "utf8"));
    console.log(`[140-refill] restored ${now ?? "(absent)"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
