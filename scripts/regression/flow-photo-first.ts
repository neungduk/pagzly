/**
 * 회귀 — 409차 photo-first 흐름. 섹션을 지우거나 문구를 바꾸지 않고 순서만 바꾸며, 필수 섹션(사이즈·소재·세탁·주의·FAQ·배송·구매) 상대 순서를 지킨다. 유료 호출 0.
 */
import fs from "node:fs";
import { applyDisplayRules } from "../../lib/display-sections";
import type { DetailSection } from "../../lib/types/generate";

export const name = "photo-first 흐름: 섹션 집합 동일·순서만 변경·필수 섹션 유지";

const MUST = ["size_table", "fabric_composition", "care_info", "faq", "shipping_info", "cta_price"];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const f of ["review/404-live/fashion/session.json", "review/402-live/fashion/session.json"]) {
    if (!fs.existsSync(f)) continue; // review/ 는 커밋되지 않는 자료라 없으면 건너뛴다
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    const g = s.generated ?? s;
    const sections = g.sections as DetailSection[];
    const roles = s.imageRoles ?? g.imageRoles;
    const urls = (g.imageUrls ?? s.imageUrls) as string[];
    const opts = { imageHashByUrl: g.imageHashByUrl, roles, origins: g.imageOrigins ?? s.imageOrigins, category: "의류/패션" };
    const base = applyDisplayRules(sections, urls, opts).sections;
    const pf = applyDisplayRules(sections, urls, { ...opts, flow: "photo-first" }).sections;
    const key = (x: DetailSection) => JSON.stringify(x);
    if (base.length !== pf.length) fails.push(`${f}: 섹션 수가 달라짐 ${base.length}→${pf.length}`);
    if (JSON.stringify(base.map(key).sort()) !== JSON.stringify(pf.map(key).sort())) fails.push(`${f}: 섹션 내용 집합이 달라짐(삭제·문구 변경)`);
    if (base.map(key).join() === pf.map(key).join()) fails.push(`${f}: photo-first인데 순서가 그대로(코디/핏 안내 착용컷이 있는 샘플)`);
    const slotOrder = (arr: DetailSection[]) => arr.map((x) => String((x as { slot?: string }).slot ?? x.type)).filter((x) => MUST.includes(x));
    if (slotOrder(base).join() !== slotOrder(pf).join()) fails.push(`${f}: 필수 섹션 순서가 바뀜`);
    if (pf[0]?.type !== "hero" || pf[1]?.type !== "gallery") fails.push(`${f}: 히어로·갤러리가 앞 두 칸이 아님`);
    // 고민(target_persona)·브랜드·체크리스트는 서로의 순서를 유지
    const textOrder = (arr: DetailSection[]) => arr.filter((x) => ["target_persona", "brand_story", "checklist"].includes(x.type)).map((x) => x.type).join();
    if (textOrder(base) !== textOrder(pf)) fails.push(`${f}: 글 흐름 섹션 순서가 바뀜`);
  }
  // 패션 외·flow 기본은 그대로
  const dummy = [{ type: "hero", headline: "h" }, { type: "gallery", heading: "g", imageIndexes: [0, 1] }] as unknown as DetailSection[];
  const a = applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티", flow: "photo-first" }).sections;
  const b = applyDisplayRules(dummy, ["a", "b"], { category: "화장품/뷰티" }).sections;
  if (JSON.stringify(a) !== JSON.stringify(b)) fails.push("패션 외 카테고리가 flow 때문에 바뀜");
  return fails;
}
