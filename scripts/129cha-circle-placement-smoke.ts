/**
 * 129차 — circle 삽입 위치(comparison_chart 인접 우선) 단위 검증 + DB 거리 조사 (읽기 전용)
 *   npx tsx scripts/129cha-circle-placement-smoke.ts
 */
import fs from "fs";
import path from "path";
import { applyIngredientCircleVisual } from "../lib/apply-ingredient-circle-pair";
import type { DetailSection } from "../lib/types/generate";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "review");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!;
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function isCircle(s: DetailSection): boolean {
  return (
    s.type === "image_text" &&
    (s.layout === "circle-pair" || s.layout === "circle-solo")
  );
}

function baseSlots(): DetailSection[] {
  return [
    {
      type: "image_text",
      slot: "ingredient_highlight",
      heading: "a",
      body: "b",
      imageIndex: 1,
      imagePosition: "left",
    },
    {
      type: "image_text",
      slot: "texture_feel",
      heading: "c",
      body: "d",
      imageIndex: 2,
      imagePosition: "left",
    },
  ];
}

const chart: DetailSection = {
  type: "comparison_chart",
  slot: "comparison_chart",
  heading: "일반 제품과 무엇이 다른가요",
  ourLabel: "AURA LAB",
  baselineLabel: "일반 제품",
  unit: "%",
  basis: "self_assessed",
  basisNote: "자체 평가",
  metrics: [
    { label: "안정성", ourValue: 78, baselineValue: 55 },
    { label: "사용감", ourValue: 72, baselineValue: 58 },
  ],
};

const spec: DetailSection = {
  type: "spec_table",
  slot: "spec_table",
  heading: "제품 정보",
  rows: [{ label: "용량", value: "50ml" }],
};

const filler = (n: number): DetailSection => ({
  type: "checklist",
  slot: "checklist",
  heading: `filler-${n}`,
  items: ["x"],
});

const urls = ["u0", "u1", "u2"];

function assertUnitPlacement() {
  // far: chart early, then fillers, then spec at end
  const far: DetailSection[] = [
    ...baseSlots(),
    chart,
    filler(1),
    filler(2),
    filler(3),
    filler(4),
    filler(5),
    spec,
  ];
  const chartIdxFar = far.findIndex((s) => s.type === "comparison_chart");
  const specIdxFar = far.findIndex((s) => s.type === "spec_table");
  const distFar = Math.abs(specIdxFar - chartIdxFar);
  if (distFar < 5) throw new Error(`far fixture distance expected >=5, got ${distFar}`);

  const farApplied = applyIngredientCircleVisual(far, urls, "히알루론산, 판테놀");
  if (!farApplied.applied) throw new Error("far: apply failed");
  const circleFar = farApplied.sections.findIndex(isCircle);
  const chartAfterFar = farApplied.sections.findIndex((s) => s.type === "comparison_chart");
  if (circleFar < 0 || chartAfterFar !== circleFar + 1) {
    throw new Error(
      `far: expected circle immediately before chart, got circle=${circleFar} chart=${chartAfterFar}`,
    );
  }
  console.log(`[unit] far chart: circle@${circleFar} chart@${chartAfterFar} (dist was ${distFar}) ✓`);

  // adjacent: chart immediately before spec
  const near: DetailSection[] = [...baseSlots(), chart, spec];
  const nearApplied = applyIngredientCircleVisual(near, urls, "히알루론산, 판테놀");
  if (!nearApplied.applied) throw new Error("near: apply failed");
  const circleNear = nearApplied.sections.findIndex(isCircle);
  const chartAfterNear = nearApplied.sections.findIndex((s) => s.type === "comparison_chart");
  if (circleNear < 0 || chartAfterNear !== circleNear + 1) {
    throw new Error(
      `near: expected circle immediately before chart, got circle=${circleNear} chart=${chartAfterNear}`,
    );
  }
  console.log(`[unit] near chart: circle@${circleNear} chart@${chartAfterNear} ✓`);

  // no chart: still before spec_table (69 regression)
  const noChart: DetailSection[] = [...baseSlots(), filler(0), spec];
  const noChartApplied = applyIngredientCircleVisual(noChart, urls, "히알루론산");
  if (!noChartApplied.applied) throw new Error("no-chart: apply failed");
  const circleSolo = noChartApplied.sections.findIndex(isCircle);
  const specAfter = noChartApplied.sections.findIndex((s) => s.type === "spec_table");
  if (circleSolo < 0 || specAfter !== circleSolo + 1) {
    throw new Error(
      `no-chart: expected circle before spec, got circle=${circleSolo} spec=${specAfter}`,
    );
  }
  console.log(`[unit] no-chart fallback: circle@${circleSolo} spec@${specAfter} ✓`);
}

type DistanceBucket = "adjacent" | "near1-4" | "far5+" | "no_spec" | "no_chart";

function distanceBucket(specIdx: number, chartIdx: number): DistanceBucket {
  if (chartIdx < 0) return "no_chart";
  if (specIdx < 0) return "no_spec";
  const d = Math.abs(specIdx - chartIdx);
  if (d <= 1) return "adjacent";
  if (d <= 4) return "near1-4";
  return "far5+";
}

async function surveyDbDistance(): Promise<string> {
  loadEnvLocal();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) {
    return "DB survey SKIPPED — missing NEXT_PUBLIC_SUPABASE_URL / key\n";
  }

  const url =
    `${base}/rest/v1/products?select=id,product_name,created_at,sections` +
    `&order=created_at.desc&limit=30`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    return `DB survey FAILED — HTTP ${res.status}: ${await res.text()}\n`;
  }

  const rows = (await res.json()) as {
    id: string;
    product_name: string | null;
    created_at: string;
    sections: DetailSection[] | null;
  }[];

  const lines: string[] = [];
  lines.push(`## DB distance survey (read-only, latest ${rows.length})`);
  lines.push("");
  lines.push("| # | id | product | chartIdx | specIdx | |dist| | bucket |");
  lines.push("|---|----|---------|----------|---------|-------|--------|");

  const counts: Record<DistanceBucket, number> = {
    adjacent: 0,
    "near1-4": 0,
    "far5+": 0,
    no_spec: 0,
    no_chart: 0,
  };
  let withChart = 0;

  rows.forEach((row, i) => {
    const sections = Array.isArray(row.sections) ? row.sections : [];
    const chartIdx = sections.findIndex(
      (s) =>
        s.type === "comparison_chart" &&
        Array.isArray((s as { metrics?: unknown }).metrics) &&
        ((s as { metrics: unknown[] }).metrics?.length ?? 0) > 0,
    );
    const specIdx = sections.findIndex(
      (s) => s.type === "spec_table" && s.slot === "spec_table",
    );
    const bucket = distanceBucket(specIdx, chartIdx);
    counts[bucket] += 1;
    if (chartIdx >= 0) withChart += 1;
    const dist =
      chartIdx >= 0 && specIdx >= 0 ? String(Math.abs(specIdx - chartIdx)) : "-";
    const name = (row.product_name ?? "").slice(0, 24).replace(/\|/g, "/");
    lines.push(
      `| ${i + 1} | ${row.id.slice(0, 8)} | ${name} | ${chartIdx} | ${specIdx} | ${dist} | ${bucket} |`,
    );
  });

  lines.push("");
  lines.push("### Summary");
  lines.push(`- scanned: ${rows.length}`);
  lines.push(`- with comparison_chart (metrics>0): ${withChart}`);
  lines.push(`- adjacent (|dist|<=1): ${counts.adjacent}`);
  lines.push(`- near (2–4): ${counts["near1-4"]}`);
  lines.push(`- far (5+): ${counts["far5+"]}`);
  lines.push(`- chart but no spec_table: ${counts.no_spec}`);
  lines.push(`- no chart: ${counts.no_chart}`);
  lines.push("");
  lines.push(
    "Note: distance = |spec_table index − comparison_chart index| in stored sections (circle not yet relocated).",
  );

  return lines.join("\n") + "\n";
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  assertUnitPlacement();
  const survey = await surveyDbDistance();
  fs.writeFileSync(path.join(OUT, "129cha-db-distance.txt"), survey, "utf8");
  console.log(survey);
  console.log("[129] unit + DB survey OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
