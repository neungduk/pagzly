/**
 * 177차 — 오프라인 검증 (Replicate 402 시 폴백)
 * 1) 소스 배선 확인 (premium → recraft-v4-svg)
 * 2) SVG tint 파이프라인 (diagram SVG → 토큰 색)
 * 3) 176 배지(before) vs 다이어그램 실루엣(목표 언어) 보드
 *
 *   npx tsx scripts/177cha-offline-boards.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import { getCategoryTheme } from "../lib/category-theme";
import { ICON_COST_USD_BY_MODEL } from "../lib/concept-icons";
import { normalizeMonochromeSvg, tintMonochromeSvg } from "../lib/monochrome-svg";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "177cha-verify");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const PROBE176 = path.join(ROOT, "review", "176cha-icon-probe");

async function composeBoard(
  title: string,
  cells: { label: string; path?: string }[],
  outName: string,
  cols = 3,
) {
  const tile = 160;
  const labelH = 36;
  const gap = 10;
  const rows = Math.ceil(cells.length / cols);
  const w = gap + cols * (tile + gap);
  const h = 52 + gap + rows * (tile + labelH + gap);
  const composites: OverlayOptions[] = [
    {
      input: Buffer.from(
        `<svg width="${w}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#F5F1EA"/><text x="12" y="30" font-family="Arial,sans-serif" font-size="12" fill="#1B1B18">${title.replace(/[<>&]/g, "")}</text></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = gap + col * (tile + gap);
    const top = 52 + gap + row * (tile + labelH + gap);
    if (cells[i]?.path && fs.existsSync(cells[i]!.path!)) {
      composites.push({
        input: await sharp(cells[i]!.path!)
          .resize(tile, tile, { fit: "contain", background: { r: 245, g: 241, b: 234, alpha: 1 } })
          .png()
          .toBuffer(),
        left,
        top,
      });
    }
    composites.push({
      input: Buffer.from(
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-size="10" font-family="Arial,sans-serif" fill="#333">${(cells[i]?.label ?? "").slice(0, 28).replace(/[<>&]/g, "")}</text></svg>`,
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

  const iconsSrc = fs.readFileSync(path.join(ROOT, "lib/concept-icons.ts"), "utf8");
  const premiumSrc = fs.readFileSync(path.join(ROOT, "lib/premium-mode.ts"), "utf8");
  const checks = {
    premiumReturnsV4Svg: iconsSrc.includes('return "recraft-v4-svg"'),
    noFluxDevPremiumBranch: !iconsSrc.includes('return "flux-dev"'),
    silhouettePrompt: iconsSrc.includes("useDiagramSilhouette"),
    tintPipeline: iconsSrc.includes("tintMonochromeSvg"),
    fallbackKept: iconsSrc.includes("ICON_FALLBACK_MODEL"),
    premiumCommentUpdated: premiumSrc.includes("recraft-v4-svg (177차"),
  };
  if (!checks.premiumReturnsV4Svg || !checks.silhouettePrompt || !checks.tintPipeline) {
    throw new Error(`wiring check failed: ${JSON.stringify(checks)}`);
  }
  console.log("[177-offline] wiring OK", checks);

  const theme = getCategoryTheme("화장품/뷰티");
  const food = getCategoryTheme("식품/건강기능식품");

  // tint pipeline demo: same SVG, two category accents
  for (const [cat, color] of [
    ["beauty", theme.accent],
    ["food", food.accentText],
  ] as const) {
    const raw = fs.readFileSync(
      path.join(ROOT, "public/icons/diagrams/waterproof-droplet.svg"),
      "utf8",
    );
    const tinted = tintMonochromeSvg(normalizeMonochromeSvg(raw), color);
    await sharp(Buffer.from(tinted))
      .resize(256, 256, { fit: "contain", background: "#FAF8F3" })
      .png()
      .toFile(path.join(OUT, `tint-demo-${cat}.png`));
  }

  const diagramIds = ["waterproof-droplet", "weight-scale", "noise-speaker", "fashion-shirt"];
  for (const id of diagramIds) {
    const raw = fs.readFileSync(path.join(ROOT, `public/icons/diagrams/${id}.svg`), "utf8");
    const tinted = tintMonochromeSvg(normalizeMonochromeSvg(raw), theme.accent);
    await sharp(Buffer.from(tinted))
      .resize(256, 256, { fit: "contain", background: "#FAF8F3" })
      .png()
      .toFile(path.join(OUT, `diagram-${id}.png`));
  }

  // Concept silhouette language proxy: diagram icons ARE the target language;
  // 176 badge PNGs are the "before" Recraft default look.
  const beforeCells = [0, 1, 2, 3, 4, 5].map((i) => {
    const file =
      i < 3
        ? path.join(PROBE176, `v4svg-${i}-checklist.png`)
        : path.join(PROBE176, `v4svg-${i}-highlight_box.png`);
    return {
      label: `before·배지 #${i}`,
      path: fs.existsSync(file) ? file : undefined,
    };
  });
  const afterProxy = diagramIds.map((id) => ({
    label: `target·실루엣 ${id}`,
    path: path.join(OUT, `diagram-${id}.png`),
  }));

  const paired: { label: string; path?: string }[] = [];
  for (let i = 0; i < 4; i++) {
    paired.push(beforeCells[i]!);
    paired.push(afterProxy[i]!);
  }

  const pairedBoard = await composeBoard(
    "177: before=176 Recraft badge | after-target=diagram silhouette+tint (live Recraft blocked 402)",
    paired,
    "177cha-badge-vs-silhouette-paired.png",
    2,
  );

  const familyBoard = await composeBoard(
    "177: tint pipeline — same SVG, beauty vs food accent + diagram set",
    [
      { label: `tint beauty ${theme.accent}`, path: path.join(OUT, "tint-demo-beauty.png") },
      { label: `tint food ${food.accentText}`, path: path.join(OUT, "tint-demo-food.png") },
      ...afterProxy,
    ],
    "177cha-silhouette-with-diagrams.png",
    3,
  );

  // Cost card as simple text board
  const costSvg = `<svg width="640" height="220" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FAF8F3"/>
    <text x="24" y="40" font-size="16" font-weight="700" fill="#1B1B18">177 Track A — premium icon cost (9 slots)</text>
    <text x="24" y="80" font-size="14" fill="#333">was flux-dev: $${(ICON_COST_USD_BY_MODEL["flux-dev"] * 9).toFixed(3)}</text>
    <text x="24" y="110" font-size="14" fill="#333">now recraft-v4-svg: $${(ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9).toFixed(3)}  (delta +$${(ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9 - ICON_COST_USD_BY_MODEL["flux-dev"] * 9).toFixed(3)})</text>
    <text x="24" y="150" font-size="14" fill="#333">non-premium unchanged: flux-schnell $${(ICON_COST_USD_BY_MODEL["flux-schnell"] * 9).toFixed(3)}</text>
    <text x="24" y="190" font-size="12" fill="#666">Live Recraft smoke: blocked by Replicate 402 Insufficient credit (this session)</text>
  </svg>`;
  const premiumBoard = path.join(SHOT, "177cha-premium-smoke.png");
  await sharp(Buffer.from(costSvg)).png().toFile(premiumBoard);

  const meta = {
    wiringChecks: checks,
    tintApplicable: true,
    tintReason:
      "recraft-v4-svg returns SVG; normalizeMonochromeSvg + tintMonochromeSvg(theme.accent) then sharp PNG",
    liveRecraftSmoke: "blocked_402_insufficient_credit",
    costImpact9Slots: {
      beforeFluxDev: ICON_COST_USD_BY_MODEL["flux-dev"] * 9,
      afterV4Svg: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9,
      delta: ICON_COST_USD_BY_MODEL["recraft-v4-svg"] * 9 - ICON_COST_USD_BY_MODEL["flux-dev"] * 9,
      nonPremiumSchnell: ICON_COST_USD_BY_MODEL["flux-schnell"] * 9,
    },
    boards: { pairedBoard, familyBoard, premiumBoard },
    apiCallsThisOfflineScript: 0,
  };
  fs.writeFileSync(path.join(ROOT, "review", "177cha-verify-meta.json"), JSON.stringify(meta, null, 2));
  console.log("[177-offline] done", JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
