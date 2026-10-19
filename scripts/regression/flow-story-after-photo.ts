/**
 * 회귀 — 410차 story-after-photo(모노). 섹션 id 집합·문구 불변, 확인 영역 순서 유지, 고민→해결 묶음이 붙어 있음,
 * 히어로·갤러리 뒤에 사진 블록이 먼저 오고 글 묶음이 그 뒤로 감. 고민·체크리스트가 없으면 그대로. 유료 호출 0.
 */
import fs from "node:fs";
import { applyDisplayRules } from "../../lib/display-sections";
import type { DetailSection } from "../../lib/types/generate";

export const name = "story-after-photo: 집합 불변·고민→해결 묶음 유지·사진 블록 먼저";

const MUST = ["size_table", "fabric_composition", "care_info", "faq", "shipping_info", "cta_price"];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const f of ["review/404-live/fashion/session.json", "review/402-live/fashion/session.json"]) {
    if (!fs.existsSync(f)) continue;
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    const g = s.generated ?? s;
    const roles = s.imageRoles ?? g.imageRoles;
    const urls = (g.imageUrls ?? s.imageUrls) as string[];
    const opts = { imageHashByUrl: g.imageHashByUrl, roles, origins: g.imageOrigins ?? s.imageOrigins, category: "의류/패션" };
    const base = applyDisplayRules(g.sections, urls, opts).sections;
    const st = applyDisplayRules(g.sections, urls, { ...opts, flow: "story-after-photo" }).sections;
    const key = (x: DetailSection) => JSON.stringify(x);
    if (JSON.stringify(base.map(key).sort()) !== JSON.stringify(st.map(key).sort())) fails.push(`${f}: 섹션 집합·문구가 달라짐`);
    if (base.map(key).join() === st.map(key).join()) fails.push(`${f}: 순서가 그대로`);
    const slotOf = (x: DetailSection) => String((x as { slot?: string }).slot ?? x.type);
    const must = (arr: DetailSection[]) => arr.map(slotOf).filter((x) => MUST.includes(x)).join();
    if (must(base) !== must(st)) fails.push(`${f}: 확인 영역 순서가 바뀜`);
    const types = st.map((x) => x.type);
    const p = types.indexOf("target_persona"), c = types.indexOf("checklist");
    if (!(p >= 0 && c > p && types.slice(p, c + 1).every((t) => ["target_persona", "brand_story", "checklist"].includes(t)))) fails.push(`${f}: 고민→해결 묶음이 끊김`);
    if (types.indexOf("highlight_box") < c) fails.push(`${f}: 요약(highlight_box)이 해결 묶음보다 앞으로 옴`);
    if (!(types[0] === "hero" && types[1] === "gallery" && p > 2)) fails.push(`${f}: 사진 블록이 글 묶음보다 먼저 오지 않음(고민 위치 ${p})`);
    // 팩 없음 = 기본 순서
    if (JSON.stringify(applyDisplayRules(g.sections, urls, opts).sections.map(key)) !== JSON.stringify(base.map(key))) fails.push("기본 순서가 흔들림");
  }
  // 고민·체크리스트가 없으면 그대로, 패션 외도 그대로
  const dummy = [{ type: "hero", headline: "h" }, { type: "gallery", heading: "g", imageIndexes: [0, 1] }, { type: "brand_story", heading: "b", body: "x" }] as unknown as DetailSection[];
  const a = applyDisplayRules(dummy, ["a", "b"], { category: "의류/패션", flow: "story-after-photo" }).sections;
  const b = applyDisplayRules(dummy, ["a", "b"], { category: "의류/패션" }).sections;
  if (JSON.stringify(a) !== JSON.stringify(b)) fails.push("고민·체크리스트 없는데 순서가 바뀜");
  const c = applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티", flow: "story-after-photo" }).sections;
  if (JSON.stringify(c) !== JSON.stringify(applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티" }).sections)) fails.push("패션 외가 바뀜");
  return fails;
}
