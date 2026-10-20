/**
 * 회귀 — 413차 조합형 스타일 스펙. 프리셋 → 스펙 → 팩이 이전과 같은 객체·같은 export HTML이고,
 * 알 수 없는 코드·범위 밖 값·패션 외 카테고리는 classic으로 폴백한다. 유료 호출 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { CLASSIC_PACK, decodeSpec, encodeSpec, packFromSpec, resolveStylePack, resolveStyleSpec, specOfPack, stylePackOptions } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "조합형 스타일 스펙 — 프리셋 왕복 동일·코드 폴백·export 바이트 동일";

const SECTIONS = [
  { type: "hero", headline: "가볍게 입는 데일리 티", subheadline: "부드러운 면" },
  { type: "text_block", heading: "소개", body: "본문 한 줄" },
] as unknown as DetailSection[];
const html = (category: string, id?: string | null) =>
  buildDetailPageHtml({ productName: "티", brandName: "b", category, sections: SECTIONS, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme(category), stylePackId: id });

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const presets = stylePackOptions("의류/패션");
  for (const p of presets) {
    const axes = specOfPack(p);
    if (packFromSpec(axes) !== p) fails.push(`${p.id}: 스펙 왕복이 프리셋 객체와 다름`);
    const code = encodeSpec(axes);
    const decoded = decodeSpec(code);
    if (!decoded || encodeSpec(decoded) !== code) fails.push(`${p.id}: 코드 왕복 불일치`);
    // 프리셋과 같은 조합의 코드를 주면 프리셋 id를 준 것과 같은 export 바이트
    if (html("의류/패션", code) !== html("의류/패션", p.id)) fails.push(`${p.id}: 같은 조합의 코드와 프리셋 id의 export가 다름`);
    if (resolveStyleSpec("의류/패션", code) !== p) fails.push(`${p.id}: resolveStyleSpec(code)가 프리셋이 아님`);
  }
  // 새 조합은 프리셋이 아니라 코드 id를 갖고, classic과 다른 export를 낸다
  const mixed = { ...specOfPack(presets[1]!), gallery: "duo-grid" as const, hero: "caption-below" as const };
  const mp = packFromSpec(mixed);
  if (!mp.id.startsWith("x:")) fails.push("조합 팩 id가 코드가 아님");
  if (html("의류/패션", mp.id) === html("의류/패션", "classic")) fails.push("조합이 classic과 같은 export");
  // 폴백
  const bad = ["x:", "x:{}", "x:not json", "x:" + JSON.stringify({ ...mixed, hero: "nope" }), "x:" + "a".repeat(2000), "y:{}"];
  for (const b of bad) {
    if (resolveStylePack("의류/패션", b) !== CLASSIC_PACK) fails.push(`잘못된 코드가 classic이 아님: ${b.slice(0, 24)}`);
  }
  // 범위 밖 숫자는 거부(자르지 않음)가 아니라 클램프 또는 null — 극단값은 null
  if (decodeSpec("x:" + JSON.stringify({ ...mixed, padY: "1" })) !== null) fails.push("숫자 자리에 문자열을 받아들임");
  // 패션 외 카테고리·코드 id는 classic과 바이트 동일
  for (const c of ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활용품", "반려동물"]) {
    if (html(c, mp.id) !== html(c, null)) fails.push(`${c}: 조합 코드가 패션 외 카테고리를 바꿈`);
  }
  return fails;
}
