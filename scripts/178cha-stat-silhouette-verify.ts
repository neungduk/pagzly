/**
 * 178차 — Track A live 검증
 * - before: 기존 premium stat 모델(recraft-v4) 배지 프롬프트 재현
 * - after: 생산 경로 generateConceptIcons(statLabels only) → v4-svg+실루엣 tint
 * - family: after + 177 checklist 실루엣 + diagram 정적
 *
 *   npx tsx scripts/178cha-stat-silhouette-verify.ts
 */
import fs from "fs";
import path from "path";
import sharp, { type OverlayOptions } from "sharp";
import Replicate from "replicate";
import { getCategoryTheme } from "../lib/category-theme";
import type { ConceptBrief } from "../lib/concept-brief";
import {
  ICON_COST_USD_BY_MODEL,
  generateConceptIcons,
} from "../lib/concept-icons";
import { normalizeMonochromeSvg, tintMonochromeSvg } from "../lib/monochrome-svg";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review", "178cha-verify");
const SHOT = path.join(ROOT, "review", "qa-screenshots");
const META = path.join(ROOT, "review", "178cha-verify-meta.json");
const VERIFY177 = path.join(ROOT, "review", "177cha-verify");

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

/** 실측 평균≈3.14에 맞춰 live 페이지에서 흔한 4개 사용 */
const STAT_LABELS = ["수분감", "보습 지속", "저자극", "흡수력"];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]!]) continue;
    process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

function fileMtime(rel: string) {
  const p = path.join(ROOT, rel);
  const st = fs.statSync(p);
  return { path: rel, mtimeMs: st.mtimeMs, mtimeIso: st.mtime.toISOString() };
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
        `<svg width="${tile}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="16" font-family="Arial,sans-serif" font-size="10" fill="#3A3A36">${cells[i]!.label.slice(0, 28).replace(/[<>&]/g, "")}</text></svg>`,
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

/** 전환 전 premium stat = recraft-v4 배지 스타일 재현 (생산 경로 미사용) */
async function generateBeforeBadge(
  replicate: Replicate,
  label: string,
  accent: string,
  deep: string,
): Promise<Buffer> {
  const prompt = [
    "circular badge icon, flat minimal UI illustration",
    "professional vector icon design, polished modern app icon quality",
    "clean crisp linework, consistent stroke weight, balanced negative space",
    "subtle soft shadow for gentle depth, refined finish, no visual clutter",
    BRIEF.icon_style,
    `motif: water droplet moisture, abstract centered symbol only`,
    "teal primary color, soft navy subtle shadow",
    "soft round badge frame, centered symbol, no text, no letters, no watermark",
    "white or very light background, ecommerce detail page icon",
    "hand-drawn outline digital illustration style, thick clean black outlines, flat color fills",
    "absolutely no text, no letters, no numbers, no watermark, no logo typography",
    `concept label hint: ${label}`,
  ].join(", ");

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const output = await replicate.run("recraft-ai/recraft-v4", {
        input: { prompt, aspect_ratio: "1:1" },
        wait: { mode: "poll", interval: 1000 },
      });
      const url = Array.isArray(output)
        ? String(output[0])
        : typeof output === "string"
          ? output
          : (output as { url?: () => string })?.url?.() ?? String(output);
      const res = await fetch(String(url));
      if (!res.ok) throw new Error(`before fetch ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }
  void accent;
  void deep;
  throw lastError;
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOT, { recursive: true });
  delete process.env.PREMIUM_QUALITY_MODE;
  delete process.env.TEST_MODE;

  const hardBefore = [
    fileMtime("lib/comparison-chart-guard.ts"),
    fileMtime("lib/assign-section-images.ts"),
  ];

  const theme = getCategoryTheme("화장품/뷰티");
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  let apiCalls = 0;

  // --- before: recraft-v4 badge (구 프리미엄 stat) ---
  console.log("[178] before badges (recraft-v4)…");
  const beforeFiles: string[] = [];
  for (let i = 0; i < STAT_LABELS.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 11_000));
    const buf = await generateBeforeBadge(replicate, STAT_LABELS[i]!, theme.accent, theme.deepAccent);
    const f = path.join(OUT, `before-badge-${i}.png`);
    await sharp(buf)
      .resize(256, 256, { fit: "contain", background: "#FAF8F3" })
      .png()
      .toFile(f);
    beforeFiles.push(f);
    apiCalls += 1;
    console.log(`[178] before ${i} ${STAT_LABELS[i]} ok`);
  }

  // --- after: production path ---
  console.log("[178] after generateConceptIcons(stat only)…");
  const after = await generateConceptIcons(BRIEF, theme, [], [], [], STAT_LABELS, []);
  const afterFiles: string[] = [];
  for (let i = 0; i < STAT_LABELS.length; i++) {
    const u = after.icons.statInfographic?.[i];
    if (!u) continue;
    const f = path.join(OUT, `after-silhouette-${i}.png`);
    await dataUrlToPng(u, f);
    afterFiles.push(f);
    apiCalls += 1;
  }
  console.log(`[178] after ${afterFiles.length}/${STAT_LABELS.length} cost=$${after.cost.toFixed(4)}`);

  const paired: { label: string; path?: string }[] = [];
  for (let i = 0; i < STAT_LABELS.length; i++) {
    paired.push({ label: `before·배지 ${STAT_LABELS[i]}`, path: beforeFiles[i] });
    paired.push({ label: `after·실루엣 ${STAT_LABELS[i]}`, path: afterFiles[i] });
  }
  const pairedBoard = await composeBoard(
    "178 A: before(recraft-v4 badge) | after(v4-svg silhouette+tint)",
    paired,
    "178cha-stat-badge-vs-silhouette.png",
    2,
  );

  for (const id of ["waterproof-droplet", "weight-scale"]) {
    await rasterDiagram(id, theme.accent, path.join(OUT, `diagram-${id}.png`));
  }
  const checklist177 = [0, 1].map((i) => path.join(VERIFY177, `after-silhouette-${i}.png`));
  const family: { label: string; path?: string }[] = [
    ...afterFiles.slice(0, 2).map((p, i) => ({ label: `stat·${STAT_LABELS[i]}`, path: p })),
    ...checklist177.map((p, i) => ({
      label: `checklist·177-${i}`,
      path: fs.existsSync(p) ? p : undefined,
    })),
    {
      label: "diagram·waterproof",
      path: path.join(OUT, "diagram-waterproof-droplet.png"),
    },
    {
      label: "diagram·weight-scale",
      path: path.join(OUT, "diagram-weight-scale.png"),
    },
  ];
  const familyBoard = await composeBoard(
    "178 A: stat silhouette + checklist(177) + diagram (same accent)",
    family,
    "178cha-stat-with-family.png",
    3,
  );

  const smokeBoard = await composeBoard(
    "178 A: live smoke — statInfographic v4-svg silhouettes",
    afterFiles.map((p, i) => ({ label: STAT_LABELS[i]!, path: p })),
    "178cha-stat-smoke.png",
    4,
  );

  const hardAfter = [
    fileMtime("lib/comparison-chart-guard.ts"),
    fileMtime("lib/assign-section-images.ts"),
  ];
  const hardUnchanged = hardBefore.every(
    (b, i) => b.mtimeMs === hardAfter[i]!.mtimeMs && b.path === hardAfter[i]!.path,
  );

  const measured = {
    samples: [
      { src: "172cha-live-fashion", n: 4 },
      { src: "168cha-live-living", n: 4 },
      { src: "139cha-session-fashion", n: 4 },
      { src: "139cha-session-food", n: 2 },
      { src: "139cha-session-electronics", n: 3 },
      { src: "139cha-session-living", n: 3 },
      { src: "139cha-session-pet", n: 2 },
    ],
    avg: 3.14,
  };

  const meta = {
    measured,
    decision: {
      scope: "premium+non-premium → recraft-v4-svg",
      reason:
        "실측 avg≈3.14라 단가 +$0.04×3.14≈+$0.13/페이지 — checklist 9슬롯(+0.495)보다 훨씬 작아 기본 티어도 실루엣 통일",
    },
    costPerPageAtAvg: {
      beforePremium: measured.avg * ICON_COST_USD_BY_MODEL["recraft-v4"],
      after: measured.avg * ICON_COST_USD_BY_MODEL["recraft-v4-svg"],
      delta: measured.avg * (ICON_COST_USD_BY_MODEL["recraft-v4-svg"] - ICON_COST_USD_BY_MODEL["recraft-v4"]),
      beforeNonPremium: measured.avg * ICON_COST_USD_BY_MODEL["recraft-v3"],
    },
    trackA: {
      beforeModel: "recraft-v4 (badge recreate)",
      afterModel: "recraft-v4-svg",
      afterCount: afterFiles.length,
      afterCost: after.cost,
      beforeCount: beforeFiles.length,
      beforeCostApprox: beforeFiles.length * ICON_COST_USD_BY_MODEL["recraft-v4"],
    },
    hardRuleFiles: { before: hardBefore, after: hardAfter, unchanged: hardUnchanged },
    apiCallsSuccessfulApprox: apiCalls,
    boards: { pairedBoard, familyBoard, smokeBoard },
  };
  fs.writeFileSync(META, JSON.stringify(meta, null, 2), "utf8");
  console.log("[178] meta", JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
