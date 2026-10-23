/**
 * 445차 5 — 합성 픽스처에 review_highlight 부여. 말뭉치에 후기 섹션이 없어 눈 검수·라이브 대조에서 한 번도 못 봤다.
 * 판매자 제공 후기 파일(scripts/fixtures/cosmetics-reviews.txt, 6줄)의 문장만 그대로 쓴다 — 새 문구 없음. 별점 4 이상 줄의 첫 문장 → 칭찬, 3 이하 줄의 첫 문장 → 아쉬운 점.
 * 섹션은 서버와 같은 함수(insertReviewHighlightSection: 제목·위치·상한)로 만들고, 일치 줄 수는 같은 함수(countLineMatches)로 센다.
 *   npx tsx scripts/gen-fixture-reviews.ts [--check]
 */
import fs from "node:fs";
import { extractLinesFromTxt, countLineMatches } from "../lib/review-insights";
import { insertReviewHighlightSection } from "../lib/section-inserts";
import type { DetailSection } from "../lib/types/generate";

export const REVIEW_FIXTURES = ["archetype-compare-beauty"];
export const REVIEW_FILE = "scripts/fixtures/cosmetics-reviews.txt";

/** 별점·첫 문장 분해: "★★★★★ 수분감이 오래가요. 건조한…" → { stars: 5, first: "수분감이 오래가요" } */
export function parseReviewLine(line: string): { stars: number; first: string } {
  const stars = (line.match(/★/g) ?? []).length;
  const body = line.replace(/^[★☆\s]+/, "");
  const first = body.split(/(?<=[.!?])\s|\.$/)[0]!.replace(/[.!?]+$/, "").trim();
  return { stars, first };
}

export function reviewParts(): { lines: string[]; praises: string[]; concerns: string[] } {
  const lines = extractLinesFromTxt(fs.readFileSync(REVIEW_FILE));
  const parsed = lines.map(parseReviewLine);
  return { lines, praises: parsed.filter((p) => p.stars >= 4).map((p) => p.first).slice(0, 3), concerns: parsed.filter((p) => p.stars <= 3).map((p) => p.first).slice(0, 2) };
}

const format = (raw: string, v: unknown): string => JSON.stringify(v, null, raw.startsWith("{\n") ? 2 : undefined) + (raw.endsWith("\n") ? "\n" : "");

function main() {
  const check = process.argv.includes("--check");
  const { lines, praises, concerns } = reviewParts();
  if (lines.length < 5) throw new Error(`후기 ${lines.length}건(≥5 필요)`);
  let changed = 0;
  for (const name of REVIEW_FIXTURES) {
    const file = `scripts/fixtures/${name}.json`;
    const raw = fs.readFileSync(file, "utf8");
    const d = JSON.parse(raw) as { generated: { sections: DetailSection[] } };
    if (format(raw, d) !== raw) throw new Error(`${name}: 다시 쓰면 모양이 달라짐`);
    const base = d.generated.sections.filter((s) => s.type !== "review_highlight");
    const next = insertReviewHighlightSection(
      base,
      praises,
      concerns,
      lines.length,
      praises.map((p) => countLineMatches(lines, p)),
      concerns.map((p) => countLineMatches(lines, p)),
    );
    const out = { ...d, generated: { ...d.generated, sections: next } };
    if (format(raw, out) === raw) continue;
    changed += 1;
    console.log(`${name}: review_highlight 부여(칭찬 ${praises.length}, 아쉬움 ${concerns.length}, 후기 ${lines.length}건) @${next.findIndex((s) => s.type === "review_highlight")}/${next.length}`);
    if (!check) fs.writeFileSync(file, format(raw, out));
  }
  console.log(changed ? `${check ? "바꿀 것" : "바꿈"} ${changed}건` : "변경 없음");
  if (check && changed) process.exit(1);
}
if (process.argv[1] && /gen-fixture-reviews/.test(process.argv[1])) main();
