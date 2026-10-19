/**
 * 회귀 — 405차 패션 표시 규칙(라이브·export 공용 applyDisplayRules). 유료 호출 0.
 * 1) 착용컷이 든 첫 갤러리를 히어로 바로 뒤로 앞당긴다(패션만, 순서만 바뀜).
 * 2) 착용컷 히어로는 사진을 위쪽 기준으로 맞춘다(750에서 브랜드 알약이 머리에 걸치지 않게).
 */
import { applyDisplayRules, pullWornGalleryForward } from "../../lib/display-sections";
import { FASHION_CATEGORY } from "../../lib/fashion-composite-policy";
import type { DetailSection } from "../../lib/types/generate";
import fs from "node:fs";
import path from "node:path";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";

export const name = "405차 패션 표시 규칙(갤러리 앞당김·히어로 위쪽 기준)";

const hero = { type: "hero", slot: "hero", headline: "h", subheadline: "s", imageIndex: 0 } as unknown as DetailSection;
const persona = { type: "target_persona", slot: "target_persona", heading: "이런 고민 있으신가요?", personas: ["a", "b"] } as unknown as DetailSection;
const brand = { type: "brand_story", slot: "brand_story", heading: "브랜드", body: "본문" } as unknown as DetailSection;
const gallery = { type: "gallery", slot: "model_multicut", heading: "착용", imageIndexes: [1, 2] } as unknown as DetailSection;
const faq = { type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] } as unknown as DetailSection;
const SECTIONS = [hero, persona, brand, gallery, faq];
const URLS = ["u0", "u1", "u2", "u3"];

const order = (category: string, roles: string[]) =>
  applyDisplayRules(SECTIONS, URLS, { category, roles: roles as never }).sections.map((s) => s.type).join(",");

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const worn = ["hero", "lifestyle", "other", "detail"];
  const got = order(FASHION_CATEGORY, worn);
  if (got !== "hero,gallery,target_persona,brand_story,faq") fails.push(`패션 착용컷 갤러리가 히어로 뒤로 오지 않음: ${got}`);
  const noWorn = order(FASHION_CATEGORY, ["hero", "detail", "other", "detail"]);
  if (noWorn !== "hero,target_persona,brand_story,gallery,faq") fails.push(`착용컷 없는 패션 갤러리가 옮겨짐: ${noWorn}`);
  for (const category of ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활/리빙", "반려동물"]) {
    const o = order(category, worn);
    if (o !== "hero,target_persona,brand_story,gallery,faq") fails.push(`${category} 순서가 바뀜: ${o}`);
  }
  // 섹션 수·내용은 그대로(순서만)
  const moved = pullWornGalleryForward(SECTIONS, FASHION_CATEGORY, worn as never);
  if (moved.length !== SECTIONS.length || !SECTIONS.every((s) => moved.includes(s))) fails.push("갤러리 앞당김이 섹션을 더하거나 뺌");
  // 편집 모드도 같은 순서(저장은 sourceIndexes로 원래 자리에)
  const edit = applyDisplayRules(SECTIONS, URLS, { category: FASHION_CATEGORY, roles: worn as never, editing: true });
  if (edit.sections[1]?.type !== "gallery" || edit.sourceIndexes[1] !== 3) fails.push(`편집 모드 순서·원본 인덱스 불일치: ${edit.sourceIndexes.join(",")}`);
  // 2) 착용컷 히어로는 사진을 위쪽 기준으로(라이브 object-top, export object-position:50% 0%)
  const heroOf = (category: string, roles: string[]) =>
    applyDisplayRules(SECTIONS, URLS, { category, roles: roles as never }).sections[0] as { photoTopAnchored?: boolean };
  if (!heroOf(FASHION_CATEGORY, worn).photoTopAnchored) fails.push("패션 착용컷 히어로에 위쪽 기준 표시가 없음");
  if (heroOf(FASHION_CATEGORY, ["detail", "hero"]).photoTopAnchored) fails.push("착용컷이 아닌 패션 히어로가 위쪽 기준으로 바뀜");
  if (heroOf("화장품/뷰티", worn).photoTopAnchored) fails.push("뷰티 히어로가 위쪽 기준으로 바뀜");
  const heroHtml = (category: string) =>
    buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: [hero], imageUrls: URLS, theme: getCategoryTheme(category), imageRoles: worn as never });
  if (!heroHtml(FASHION_CATEGORY).includes("object-fit:cover;object-position:50% 0%")) fails.push("export 패션 착용컷 히어로가 위쪽 기준이 아님");
  if (heroHtml("화장품/뷰티").includes("object-position:50% 0%")) fails.push("export 뷰티 히어로가 바뀜");
  if (!fs.readFileSync(path.join(__dirname, "..", "..", "components", "DetailSectionRenderer.tsx"), "utf8").includes('section.photoTopAnchored ? " object-top"')) fails.push("라이브 히어로가 photoTopAnchored를 읽지 않음");
  return fails;
}
