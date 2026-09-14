import fs from "fs";
import path from "path";

const dir = path.join(__dirname, "..", "review", "168cha-live-living");
const a = JSON.parse(fs.readFileSync(path.join(dir, "analysis.json"), "utf8"));
const s = JSON.parse(fs.readFileSync(path.join(dir, "session.json"), "utf8"));
const blob = JSON.stringify(s);

console.log({
  generationCost: a.generationCost,
  photoProcessingCost: a.photoProcessingCost,
  hasTradeoff: a.hasTradeoff,
  hasStat: a.hasStat,
  hasChart: a.hasChart,
  lifestyleFail: a.lifestyleFail,
  canvasOverflow: blob.includes("canvas-overflow"),
  productHeightCm: s.productHeightCm,
  fallbackReasons: blob.match(/"fallbackReason":"[^"]+"/g)?.slice(0, 15) ?? [],
  compositedTrue: (blob.match(/"composited":true/g) || []).length,
  compositedFalse: (blob.match(/"composited":false/g) || []).length,
  tradeoffRecommend: a.tradeoff?.recommendFor,
  tradeoffConsider: a.tradeoff?.considerIf,
});
console.log(
  "files",
  fs.readdirSync(dir).map((n) => `${n}:${fs.statSync(path.join(dir, n)).size}`),
);
