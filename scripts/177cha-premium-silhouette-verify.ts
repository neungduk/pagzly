/**
 * 177차 — Track A/B 검증
 * - B: 176차 배지 스타일(v4-svg) vs 새 단색 실루엣+tint (나란히 + 다이어그램)
 * - A: PREMIUM generateConceptIcons TEST_MODE 스모크 (checklist/usage/highlight)
 *
 *   npx tsx scripts/177cha-premium-silhouette-verify.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import {
  ICON_COST_USD_BY_MODEL,
  generateConceptIcons,
} from "../lib/concept-icons";
import { tintMonochromeSvg, normalizeMonochromeSvg } from "../lib/monochrome-svg";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "177cha-verify");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const META = path.join(ROOT, "review", "177cha-verify-meta.json");
const PROBE176 = path.join(ROOT, "review", "176cha-icon-probe");

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

const LABELS = ["촉촉함", "저자극", "가벼운 착용감", "하루종일 보습", "민감성 피부용", "산뜻한 마무리"];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]!]) continue;
    process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

async function composeBoard(
  title: string,
  cells: { label: string; path?: string }[],
  outName: string,
  cols = 3,
): Promise<string> {
  const tile = 160;
  const labelH = 34;
  const gap = 10;
  const rows = Math.ceil(cells.length / cols);
  const w = gap + cols * (tile + gap);
  const h = 48 + gap + rows * (tile + labelH + gap);
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="12" y="28" font-family="Arial,sans-serif" font-size="13" fill="#1B1B18">${title.replace(/[<>&]/g, "")}</text></svg>`,
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
          `<svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg"><rect fill="#E8E0D8" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#9A3412" font-size="12">missing</text></svg>`,
        ),
        left,
        top,
      });
    }
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="16" font-family="Arial,sans-serif" font-size="10" fill="#3A3A36">${cells[i]!.label.slice(0, 26).replace(/[<>&]/g, "")}</text></svg>`,
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

async function dataUrlToPng(dataUrl: string, file: string) {
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  await sharp(Buffer.from(b64, "base64"))
    .resize(256, 256, { fit: "contain", background: "#FAF8F3" })
    .png()
    .toFile(file);
}

async function rasterDiagram(id: string, color: string, file: string) {
  const raw = fs.readFileSync(path.join(ROOT, "public", "icons", "diagrams", `${id}.svg`), "utf8");
  const tinted = tintMonochromeSvg(normalizeMonochromeSvg(raw), color);
  await sharp(Buffer.from(tinted))
    .resize(256, 256, { fit: "contain", background: "#FAF8F3" })
    .png()
    .toFile(file);
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });

  // Force premium ON for this verify (default is already ON unless false)
  delete process.env.PREMIUM_QUALITY_MODE;
  process.env.TEST_MODE = "true";

  const theme = getCategoryTheme("화장품/뷰티");
  let apiCalls = 0;

  // --- Track A: production path smoke (TEST_MODE → 타입당 1장) ---
  console.log("[177] Track A generateConceptIcons premium TEST_MODE…");
  const { icons, cost } = await generateConceptIcons(
    BRIEF,
    theme,
    ["촉촉함", "저자극", "가벼운 착용감"],
    ["세안 후", "펴바르기", "두드리기"],
    [],
    [],
    ["하루종일 보습", "민감성 피부용"],
  );
  // TEST_MODE: 1 per type → checklist1 + usage1 + highlight1 = 3 (if premium v4-svg)
  const aFiles: string[] = [];
  for (const [key, urls] of Object.entries(icons)) {
    for (let i = 0; i < (urls?.length ?? 0); i++) {
      const u = urls![i]!;
      if (!u) continue;
      const f = path.join(OUT, `premium-${key}-${i}.png`);
      await dataUrlToPng(u, f);
      aFiles.push(f);
      apiCalls += 1;
    }
  }
  console.log(`[177] Track A icons=${aFiles.length} cost=$${cost.toFixed(4)}`);

  // --- Track B: silhouette set via same API (6 labels as checklist only, not TEST_MODE) ---
  delete process.env.TEST_MODE;
  console.log("[177] Track B silhouette set (6 checklist icons)…");
  const b = await generateConceptIcons(BRIEF, theme, LABELS, [], [], [], []);
  apiCalls += b.icons.checklist?.filter(Boolean).length ?? 0;
  const afterFiles: string[] = [];
  for (let i = 0; i < LABELS.length; i++) {
    const u = b.icons.checklist?.[i];
    if (!u) continue;
    const f = path.join(OUT, `after-silhouette-${i}.png`);
    await dataUrlToPng(u, f);
    afterFiles.push(f);
  }

  // Before = 176 badge-style v4-svg (same labels order for first 6)
  const beforeFiles = LABELS.map((_, i) => {
    const candidates = [
      path.join(PROBE176, `v4svg-${i}-checklist.png`),
      path.join(PROBE176, `v4svg-${i}-highlight_box.png`),
    ];
    // 176 order: 0-2 checklist, 3-5 highlight
    if (i < 3) return path.join(PROBE176, `v4svg-${i}-checklist.png`);
    return path.join(PROBE176, `v4svg-${i}-highlight_box.png`);
  });

  const paired: { label: string; path?: string }[] = [];
  for (let i = 0; i < LABELS.length; i++) {
    paired.push({
      label: `before·배지 ${LABELS[i]}`,
      path: fs.existsSync(beforeFiles[i]!) ? beforeFiles[i] : undefined,
    });
    paired.push({
      label: `after·실루엣 ${LABELS[i]}`,
      path: afterFiles[i],
    });
  }
  const pairedBoard = await composeBoard(
    "177 B: before(176 badge v4-svg) | after(silhouette+tint)",
    paired,
    "177cha-badge-vs-silhouette-paired.png",
    2,
  );

  const diagramIds = ["waterproof-droplet", "weight-scale", "noise-speaker"];
  for (const id of diagramIds) {
    await rasterDiagram(id, theme.accent, path.join(OUT, `diagram-${id}.png`));
  }
  const family: { label: string; path?: string }[] = [
    ...afterFiles.slice(0, 3).map((p, i) => ({ label: `concept·${LABELS[i]}`, path: p })),
    ...diagramIds.map((id) => ({
      label: `diagram·${id}`,
      path: path.join(OUT, `diagram-${id}.png`),
    })),
  ];
  const familyBoard = await composeBoard(
    "177 B: concept silhouette + diagram static (same accent tint)",
    family,
    "177cha-silhouette-with-diagrams.png",
    3,
  );

  const premiumBoard = await composeBoard(
    "177 A: premium generateConceptIcons (TEST_MODE sample)",
    aFiles.map((p, i) => ({ label: path.basename(p), path: p })),
    "177cha-premium-smoke.png",
    Math.min(3, Math.max(1, aFiles.length)),
  );

  const costImpact = {
    unitFluxDev: ICON_COST_USD_BY_MODEL["flux-dev"],
    unitV4Svg: ICON_COST_USD_BY_MODEL["recraft-v4-svg"],
    // 9 slots (3+3+3) premium icon path
    premium9Before: ICON_COST_USD_BY_MODEL["flux-dev"] * 9,
    premium9After: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9,
    delta9: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9 - ICON_COST_USD_BY_MODEL["flux-dev"] * 9,
    nonPremiumUnchanged: ICON_COST_USD_BY_MODEL["flux-schnell"] * 9,
  };

  const meta = {
    trackA: {
      modelNow: "recraft-v4-svg",
      modelWas: "flux-dev",
      smokeIcons: aFiles.length,
      smokeCost: cost,
      note: "fallback to flux-schnell still active; recraft concurrency 1+11s",
    },
    trackB: {
      tintApplicable: true,
      tintReason: "recraft-v4-svg returns SVG — normalizeMonochromeSvg + tintMonochromeSvg(theme.accent) then PNG",
      beforeSource: "176cha badge-style v4-svg probe PNGs",
      afterCount: afterFiles.length,
    },
    costImpact,
    apiCallsSuccessfulApprox: apiCalls,
    boards: { pairedBoard, familyBoard, premiumBoard },
  };
  fs.writeFileSync(META, JSON.stringify(meta, null, 2), "utf8");
  console.log("[177] meta", JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
