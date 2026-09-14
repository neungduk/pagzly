/**
 * 이미 받은 Recraft SVG만 재정규화 (+ assets TS 갱신). API 호출 없음.
 *   npx tsx scripts/174cha-normalize-diagram-icons.ts
 */
import fs from "fs";
import path from "path";
import { normalizeMonochromeSvg } from "../lib/monochrome-svg";

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "icons", "diagrams");
const ASSETS_TS = path.join(ROOT, "lib", "diagram-icon-assets.ts");

const FILES = [
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
] as const;

function writeAssetsModule(files: { id: string; svg: string }[]) {
  const entries = files
    .map((f) => `  ${JSON.stringify(f.id)}: ${JSON.stringify(f.svg)} as string,`)
    .join("\n");
  fs.writeFileSync(
    ASSETS_TS,
    `/**
 * 174차 — Recraft v4-svg로 1회 생성한 다이어그램 아이콘 (단색, currentColor).
 * 원본: public/icons/diagrams/*.svg
 */
export const DIAGRAM_ICON_SVGS = {
${entries}
} as const;

export type DiagramIconId = keyof typeof DIAGRAM_ICON_SVGS;
`,
    "utf8",
  );
}

function main() {
  const saved: { id: string; svg: string }[] = [];
  for (const id of FILES) {
    const p = path.join(OUT_DIR, `${id}.svg`);
    const raw = fs.readFileSync(p, "utf8");
    const svg = normalizeMonochromeSvg(raw);
    fs.writeFileSync(p, svg, "utf8");
    saved.push({ id, svg });
    console.log(`[174-norm] ${id} ${Buffer.byteLength(raw)} → ${Buffer.byteLength(svg)} bytes`);
  }
  writeAssetsModule(saved);
  console.log("[174-norm] assets updated", ASSETS_TS);
}

main();
