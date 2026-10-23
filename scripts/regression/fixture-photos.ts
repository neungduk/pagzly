/**
 * 회귀 — 443차 4-3 합성 픽스처 사진: 모든 픽스처 사진 주소가 자기 카테고리 폴더(/qa-fixtures/ph/<카테고리>/)의 파일이고 실제로 있으며,
 * 옛 공용 사진(/qa-fixtures/synth/)은 더 이상 가리키지 않고, 플레이스홀더 폴더 총 용량이 8MB 이하. 호출 0.
 */
import fs from "node:fs";
import path from "node:path";

export const name = "합성 픽스처 사진 — 카테고리 폴더·파일 존재·옛 공용 사진 없음·8MB 이하";

const KEY: Record<string, string> = { "의류/패션": "fashion", "화장품/뷰티": "beauty", 식품: "food", 생활용품: "living", 전자제품: "tech", 반려동물: "pet" };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const dir = "scripts/fixtures";
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("archetype-") && f.endsWith(".json"));
  if (!files.length) return ["픽스처 없음"];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const category = (JSON.parse(text) as { category?: string }).category ?? "";
    const key = KEY[category];
    if (!key) { fails.push(`${f}: 카테고리 '${category}' 폴더 키 없음`); continue; }
    if (text.includes("/qa-fixtures/synth/")) fails.push(`${f}: 옛 공용 사진(synth)을 아직 가리킴`);
    const urls = new Set([...text.matchAll(/\/qa-fixtures\/ph\/[^"\\]+/g)].map((m) => m[0]));
    if (!urls.size) fails.push(`${f}: 플레이스홀더 주소 없음`);
    for (const u of urls) {
      if (!u.startsWith(`/qa-fixtures/ph/${key}/`)) fails.push(`${f}: ${u}가 ${category} 폴더(${key})가 아님`);
      else if (!fs.existsSync(path.join("public", u))) fails.push(`${f}: 파일 없음 ${u}`);
    }
  }
  let total = 0;
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else total += fs.statSync(p).size; } };
  walk("public/qa-fixtures/ph");
  if (total > 8 * 1024 * 1024) fails.push(`플레이스홀더 총 ${(total / 1048576).toFixed(1)}MB > 8MB`);
  return fails;
}
