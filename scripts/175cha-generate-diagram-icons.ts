/**
 * 175차 — 나머지 5개 다이어그램용 Recraft 아이콘 1회성 생성.
 * 174차 normalize/생성 패턴 재사용. 기존 10개는 스킵.
 *
 *   npx tsx scripts/175cha-generate-diagram-icons.ts
 */
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import {
  ICON_COST_USD_BY_MODEL,
  ICON_MODEL_REF,
  RECRAFT_NO_TYPOGRAPHY_CLAUSE,
  buildIconModelInput,
} from "../lib/concept-icons";
import { normalizeMonochromeSvg } from "../lib/monochrome-svg";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "icons", "diagrams");
const ASSETS_TS = path.join(ROOT, "lib", "diagram-icon-assets.ts");
const META_JSON = path.join(ROOT, "review", "175cha-diagram-icons-meta.json");

const UNIT = ICON_COST_USD_BY_MODEL["recraft-v4-svg"];
const MODEL = "recraft-v4-svg" as const;
const GAP_MS = 11_000;

/** 174차 기존 + 175차 신규 — assets 재조립용 전체 ID */
export const ALL_DIAGRAM_ICON_IDS = [
  "waterproof-droplet",
  "waterproof-shield",
  "package-box",
  "package-kit",
  "volume-bottle",
  "volume-beaker",
  "food-bowl",
  "food-ratio",
  "usage-arrow",
  "usage-flow",
  // 175
  "noise-speaker",
  "noise-wave",
  "size-ruler",
  "weight-scale",
  "power-plug",
  "power-battery",
  "fashion-shirt",
  "fashion-hanger",
] as const;

type IconSpec = { id: string; file: string; prompt: string };

const NEW_ICONS: IconSpec[] = [
  {
    id: "noise-speaker",
    file: "noise-speaker.svg",
    prompt:
      "minimal monochrome black silhouette icon of a loudspeaker speaker cone, flat vector, centered, transparent background, black only",
  },
  {
    id: "noise-wave",
    file: "noise-wave.svg",
    prompt:
      "minimal monochrome black silhouette icon of sound wave arcs radiating from a point, flat vector, centered, transparent background, black only, no letters",
  },
  {
    id: "size-ruler",
    file: "size-ruler.svg",
    prompt:
      "minimal monochrome black silhouette icon of a straight measuring ruler with tick marks, flat vector, centered, transparent background, black only, no numbers",
  },
  {
    id: "weight-scale",
    file: "weight-scale.svg",
    prompt:
      "minimal monochrome black silhouette icon of a balance scale or kitchen weight scale, flat vector, centered, transparent background, black only, no numbers",
  },
  {
    id: "power-plug",
    file: "power-plug.svg",
    prompt:
      "minimal monochrome black silhouette icon of an electrical power plug, flat vector, centered, transparent background, black only",
  },
  {
    id: "power-battery",
    file: "power-battery.svg",
    prompt:
      "minimal monochrome black silhouette icon of a battery with a lightning bolt, flat vector, centered, transparent background, black only, no numbers",
  },
  {
    id: "fashion-shirt",
    file: "fashion-shirt.svg",
    prompt:
      "minimal monochrome black silhouette icon of a simple t-shirt garment, flat vector, centered, transparent background, black only",
  },
  {
    id: "fashion-hanger",
    file: "fashion-hanger.svg",
    prompt:
      "minimal monochrome black silhouette icon of a clothes hanger, flat vector, centered, transparent background, black only",
  },
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]!]) continue;
    process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
}

function extractUrl(output: unknown): string | null {
  const url = Array.isArray(output) ? output[0] : output;
  return typeof url === "string" && url.length > 0 ? url : null;
}

function writeAssetsFromDisk() {
  const entries: string[] = [];
  for (const id of ALL_DIAGRAM_ICON_IDS) {
    const p = path.join(OUT_DIR, `${id}.svg`);
    if (!fs.existsSync(p)) {
      throw new Error(`missing icon file: ${p}`);
    }
    const svg = normalizeMonochromeSvg(fs.readFileSync(p, "utf8"));
    fs.writeFileSync(p, svg, "utf8");
    entries.push(`  ${JSON.stringify(id)}: ${JSON.stringify(svg)} as string,`);
  }
  fs.writeFileSync(
    ASSETS_TS,
    `/**
 * 174~175차 — Recraft v4-svg 1회성 다이어그램 아이콘 (단색, currentColor).
 * 원본: public/icons/diagrams/*.svg
 * 재생성: npx tsx scripts/175cha-generate-diagram-icons.ts --force
 */
export const DIAGRAM_ICON_SVGS = {
${entries.join("\n")}
} as const;

export type DiagramIconId = keyof typeof DIAGRAM_ICON_SVGS;
`,
    "utf8",
  );
}

async function main() {
  loadEnvLocal();
  const force = process.argv.includes("--force");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN missing");

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  let calls = 0;
  let cost = 0;
  const generated: string[] = [];

  for (let i = 0; i < NEW_ICONS.length; i++) {
    const spec = NEW_ICONS[i]!;
    const outPath = path.join(OUT_DIR, spec.file);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 80) {
      console.log(`[175] skip existing ${spec.file}`);
      continue;
    }

    const prompt = `${spec.prompt}, ${RECRAFT_NO_TYPOGRAPHY_CLAUSE}`;
    const input = buildIconModelInput(MODEL, prompt, "1:1");
    console.log(`[175] RUN ${spec.id} (${i + 1}/${NEW_ICONS.length})`);

    let output: unknown;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        output = await replicate.run(ICON_MODEL_REF[MODEL], { input });
        break;
      } catch (e) {
        lastErr = e;
        console.warn(`[175] attempt ${attempt} failed`, e);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    if (output == null) throw lastErr ?? new Error(`failed ${spec.id}`);

    const url = extractUrl(output);
    if (!url) throw new Error(`no url for ${spec.id}`);
    const res = await fetch(url);
    const raw = await res.text();
    if (!res.ok || !raw.includes("<svg")) {
      throw new Error(`bad svg for ${spec.id}: ${raw.slice(0, 120)}`);
    }
    fs.writeFileSync(outPath, normalizeMonochromeSvg(raw), "utf8");
    calls += 1;
    cost += UNIT;
    generated.push(spec.id);
    console.log(`[cost] 175 ${spec.id}: +$${UNIT.toFixed(2)} (calls=${calls})`);
    if (i < NEW_ICONS.length - 1) await new Promise((r) => setTimeout(r, GAP_MS));
  }

  writeAssetsFromDisk();

  const meta = {
    model: MODEL,
    unitUsd: UNIT,
    recraftCalls: calls,
    estimatedCostUsd: cost,
    generated,
    allIconIds: [...ALL_DIAGRAM_ICON_IDS],
  };
  fs.mkdirSync(path.dirname(META_JSON), { recursive: true });
  fs.writeFileSync(META_JSON, JSON.stringify(meta, null, 2), "utf8");
  console.log("[175] assets updated", ASSETS_TS);
  console.log("[175] meta", JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
