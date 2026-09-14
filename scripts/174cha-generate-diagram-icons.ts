/**
 * 174차 — 다이어그램용 Recraft v4-svg 단색 아이콘 1회 생성 → public/icons/diagrams/
 * + lib/diagram-icon-assets.ts 임베드(클라이언트에서도 tint 가능).
 *
 *   npx tsx scripts/174cha-generate-diagram-icons.ts
 *
 * 실행마다 Recraft를 부르지 마세요. 자산이 이미 있으면 --force 없을 때 스킵.
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

export { normalizeMonochromeSvg };
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "icons", "diagrams");
const ASSETS_TS = path.join(ROOT, "lib", "diagram-icon-assets.ts");
const META_JSON = path.join(ROOT, "review", "174cha-diagram-icons-meta.json");

const UNIT = ICON_COST_USD_BY_MODEL["recraft-v4-svg"];
const MODEL = "recraft-v4-svg" as const;
const GAP_MS = 11_000;

type IconSpec = {
  id: string;
  file: string;
  prompt: string;
};

const ICONS: IconSpec[] = [
  {
    id: "waterproof-droplet",
    file: "waterproof-droplet.svg",
    prompt:
      "minimal monochrome black silhouette icon of a single water droplet, flat vector, centered, transparent background, no gradients, no colors other than black, simple clean outline filled shape",
  },
  {
    id: "waterproof-shield",
    file: "waterproof-shield.svg",
    prompt:
      "minimal monochrome black silhouette icon of a shield with a small water drop mark, flat vector, centered, transparent background, no gradients, black only",
  },
  {
    id: "package-box",
    file: "package-box.svg",
    prompt:
      "minimal monochrome black silhouette icon of an open cardboard package box, flat vector, centered, transparent background, black only, no labels",
  },
  {
    id: "package-kit",
    file: "package-kit.svg",
    prompt:
      "minimal monochrome black silhouette icon of three small product items arranged as a kit set, flat vector, centered, transparent background, black only",
  },
  {
    id: "volume-bottle",
    file: "volume-bottle.svg",
    prompt:
      "minimal monochrome black silhouette icon of a simple cosmetic bottle, flat vector, centered, transparent background, black only, no logo",
  },
  {
    id: "volume-beaker",
    file: "volume-beaker.svg",
    prompt:
      "minimal monochrome black silhouette icon of a laboratory measuring beaker, flat vector, centered, transparent background, black only, no numbers",
  },
  {
    id: "food-bowl",
    file: "food-bowl.svg",
    prompt:
      "minimal monochrome black silhouette icon of a simple bowl of food, flat vector, centered, transparent background, black only",
  },
  {
    id: "food-ratio",
    file: "food-ratio.svg",
    prompt:
      "minimal monochrome black silhouette icon of a pie chart divided into three slices, flat vector, centered, transparent background, black only, no numerals",
  },
  {
    id: "usage-arrow",
    file: "usage-arrow.svg",
    prompt:
      "minimal monochrome black silhouette icon of a downward chevron arrow, flat vector, centered, transparent background, black only",
  },
  {
    id: "usage-flow",
    file: "usage-flow.svg",
    prompt:
      "minimal monochrome black silhouette icon of three connected nodes in a vertical flow with arrows between them, flat vector, centered, transparent background, black only, no letters no digits",
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

function writeAssetsModule(files: { id: string; file: string; svg: string }[]) {
  const entries = files
    .map(
      (f) =>
        `  ${JSON.stringify(f.id)}: ${JSON.stringify(f.svg)} as string,`,
    )
    .join("\n");
  const body = `/**
 * 174차 — Recraft v4-svg로 1회 생성한 다이어그램 아이콘 (단색, currentColor).
 * 원본 파일: public/icons/diagrams/*.svg
 * 재생성: npx tsx scripts/174cha-generate-diagram-icons.ts --force
 */
export const DIAGRAM_ICON_SVGS = {
${entries}
} as const;

export type DiagramIconId = keyof typeof DIAGRAM_ICON_SVGS;
`;
  fs.writeFileSync(ASSETS_TS, body, "utf8");
}

async function main() {
  loadEnvLocal();
  const force = process.argv.includes("--force");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN missing");
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
    useFileOutput: false,
  });

  let calls = 0;
  let cost = 0;
  const saved: { id: string; file: string; svg: string; reused: boolean }[] = [];

  for (let i = 0; i < ICONS.length; i++) {
    const spec = ICONS[i]!;
    const outPath = path.join(OUT_DIR, spec.file);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 80) {
      const raw = fs.readFileSync(outPath, "utf8");
      const svg = normalizeMonochromeSvg(raw);
      fs.writeFileSync(outPath, svg, "utf8");
      saved.push({ id: spec.id, file: spec.file, svg, reused: true });
      console.log(`[174] skip existing ${spec.file}`);
      continue;
    }

    const prompt = `${spec.prompt}, ${RECRAFT_NO_TYPOGRAPHY_CLAUSE}`;
    const input = buildIconModelInput(MODEL, prompt, "1:1");
    console.log(`[174] RUN ${spec.id} (${i + 1}/${ICONS.length})`);

    let output: unknown;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        output = await replicate.run(ICON_MODEL_REF[MODEL], { input });
        break;
      } catch (e) {
        lastErr = e;
        console.warn(`[174] attempt ${attempt} failed`, e);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    if (output == null) throw lastErr ?? new Error(`failed ${spec.id}`);

    const url = extractUrl(output);
    if (!url) throw new Error(`no url for ${spec.id}: ${JSON.stringify(output).slice(0, 200)}`);

    const res = await fetch(url);
    const raw = await res.text();
    if (!res.ok || !raw.includes("<svg")) {
      throw new Error(`bad svg response for ${spec.id}: ${raw.slice(0, 120)}`);
    }
    const svg = normalizeMonochromeSvg(raw);
    fs.writeFileSync(outPath, svg, "utf8");
    calls += 1;
    cost += UNIT;
    saved.push({ id: spec.id, file: spec.file, svg, reused: false });
    console.log(`[cost] 174 ${spec.id}: +$${UNIT.toFixed(2)} (calls=${calls})`);

    if (i < ICONS.length - 1) {
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
  }

  writeAssetsModule(saved.map(({ id, file, svg }) => ({ id, file, svg })));

  const meta = {
    model: MODEL,
    unitUsd: UNIT,
    recraftCalls: calls,
    estimatedCostUsd: cost,
    icons: saved.map((s) => ({
      id: s.id,
      file: `public/icons/diagrams/${s.file}`,
      reused: s.reused,
      bytes: Buffer.byteLength(s.svg, "utf8"),
    })),
  };
  fs.mkdirSync(path.dirname(META_JSON), { recursive: true });
  fs.writeFileSync(META_JSON, JSON.stringify(meta, null, 2), "utf8");
  console.log("[174] wrote", ASSETS_TS);
  console.log("[174] meta", JSON.stringify(meta, null, 2));
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
