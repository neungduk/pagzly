/**
 * 167차 분석기 확장 — 169차: food/fashion/living 네이티브 섹션 트리로 실제 채움 판정
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "..");
const ids = [
  "cosmetics-review",
  "cosmetics-noreview",
  "food",
  "electronics",
  "fashion",
  "living",
  "cosmetics",
  "pet",
  "fashion-omit",
];

/** 스펙·수치 근거 */
const NUMERIC_HINT =
  /\d+\s*(%|％|dB|db|ml|mL|L|g|kg|cm|mm|W|h|시간|일|회|명|℃|CFU)|[0-9]+(?:\.[0-9]+)?\s*%|단백질|함량|용량|배터리|IPX?\d|하중|수명|신축|수축|나트륨|내열/i;

const TRADEOFF_HINT =
  /추천|이런 분|이런 경우|비추천|주의|유의|참고|적합|확인 후 구매|권장/i;

for (const id of ids) {
  const file = path.join(ROOT, "review", `139cha-session-${id}.json`);
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ id, skipped: "missing-session-json" }));
    continue;
  }
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  const generated = j.generated as { sections?: Array<{ type: string; slot?: string }> } | undefined;
  const sections = generated?.sections ?? [];
  const types = sections.map((s) => s.type);
  const slots = sections.map((s) => s.slot ?? "");
  const kf = String(j.keyFeatures ?? "");
  const ing = String(j.ingredients ?? "");
  const cert = String(j.certifications ?? "");
  const target = String(j.targetCustomer ?? "");
  const inputBlob = [kf, ing, cert, target].join("\n");
  const hasNumericInput = NUMERIC_HINT.test(inputBlob);
  const hasTradeoffInput = TRADEOFF_HINT.test(inputBlob);
  const hasStat = types.includes("stat_infographic") || slots.includes("stat_infographic");
  const hasTradeoff = types.includes("tradeoff_card") || slots.includes("tradeoff_card");
  const hasChart = types.includes("comparison_chart");
  const beautyKfPollution =
    id !== "cosmetics-review" &&
    id !== "cosmetics-noreview" &&
    id !== "cosmetics" &&
    /히알루론|보습|저자극|메이크업/.test(kf);

  let verdictStat: string;
  if (beautyKfPollution) verdictStat = "polluted-input";
  else if (hasStat) verdictStat = "ok-filled";
  else if (!hasNumericInput) verdictStat = "ok-omit-no-input";
  else verdictStat = "suspect-omit-with-input";

  let verdictTradeoff: string;
  if (beautyKfPollution) verdictTradeoff = "polluted-input";
  else if (hasTradeoff) verdictTradeoff = "ok-filled";
  else if (!hasTradeoffInput) verdictTradeoff = "ok-omit-no-input";
  else verdictTradeoff = "suspect-omit-with-input";

  let verdictChart: string;
  if (beautyKfPollution) verdictChart = "polluted-input";
  else if (hasChart) verdictChart = "ok-filled";
  else if (!hasNumericInput) verdictChart = "ok-omit-no-input";
  else verdictChart = "suspect-omit-with-input";

  console.log(
    JSON.stringify({
      id,
      category: j.category,
      beautyKfPollution,
      hasNumericInput,
      hasTradeoffInput,
      hasStat,
      hasChart,
      hasTradeoff,
      verdictStat,
      verdictChart,
      verdictTradeoff,
      sectionCount: types.length,
      keyFeaturesHead: kf.slice(0, 100),
    }),
  );
}
