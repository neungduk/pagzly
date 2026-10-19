/**
 * 회귀 — 409차 요약 띠 변형·구조 CSS(모서리·가는 선·소제목·평면 체크리스트)·밀도. 유료 호출 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { packStructureCss } from "../../lib/pack-css";
import { CLASSIC_LAYOUT, getPackLayout, packPadScale, resolveStylePack, CLASSIC_PACK } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "팩 구조 CSS·요약 띠 변형·밀도(classic 불변)";

const SECTIONS = [
  { type: "hero", headline: "가볍게 입는 데일리 티", subheadline: "부드러운 면", imageIndex: 0 },
  { type: "checklist", slot: "checklist", heading: "기본 티, 아쉬웠던 세 가지", items: ["비침이 적은 두께", "목이 늘어나지 않는 립", "세탁 후에도 같은 핏"] },
  { type: "highlight_box", slot: "highlight_box", heading: "한눈에 보는 세 가지", cards: [{ title: "면 100%", body: "20수 싱글 저지" }, { title: "당일 출고", body: "평일 오후 2시 이전" }, { title: "무료배송", body: "5만원 이상" }] },
] as unknown as DetailSection[];
const html = (pack: string | null) =>
  buildDetailPageHtml({ productName: "티", brandName: "모아웨어", category: "의류/패션", sections: SECTIONS, imageUrls: ["https://example.com/a.jpg"], theme: getCategoryTheme("의류/패션"), stylePackId: pack });

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // classic: 구조 CSS·표식 없음
  if (packStructureCss(CLASSIC_LAYOUT, ".pagzly-wrap", "export") !== "") fails.push("classic 구조 CSS가 비어 있지 않음");
  const classic = html("classic");
  for (const m of ["data-summary", "data-gallery-variant", "data-hero-variant", "border-radius:0px!important"]) if (classic.includes(m)) fails.push(`classic export에 ${m}`);
  // 모노·에디토리얼 구조 CSS
  const monoCss = packStructureCss(getPackLayout(resolveStylePack("의류/패션", "mono-minimal")), ".pagzly-wrap", "export");
  const ediCss = packStructureCss(getPackLayout(resolveStylePack("의류/패션", "editorial")), ".pagzly-wrap", "export");
  if (!monoCss.includes("border-radius:0px!important") || !ediCss.includes("border-radius:0px!important")) fails.push("모서리 0 규칙 없음");
  if (!monoCss.includes("text-align:left!important")) fails.push("mono 소제목 좌측 정렬 규칙 없음");
  if (ediCss.includes("text-align:left!important")) fails.push("editorial에 좌측 정렬 규칙이 있음(가운데 + 선이어야 함)");
  if (!monoCss.includes("border-width:0 0 1px 0") || !ediCss.includes("border-width:0 0 1px 0")) fails.push("체크리스트 평면 규칙 없음");
  // 라이브용 CSS는 라이브 선택자
  const liveCss = packStructureCss(getPackLayout(resolveStylePack("의류/패션", "mono-minimal")), "[data-pz-pack]", "live");
  if (!liveCss.includes("[data-pz-pack] li.rounded-2xl.border")) fails.push("라이브 체크리스트 선택자");
  // 요약 띠 변형은 이 샘플에 칩이 없을 수 있어 표식은 칩이 있을 때만 — 칩 문구가 사라지지 않는지만 본다
  for (const [p, c] of [["mono-minimal", "inline-strip"], ["editorial", "spec-list"]] as const) {
    const h = html(p);
    if (h.includes("data-summary") && !h.includes(`data-summary="${c}"`)) fails.push(`${p} 요약 변형 표식이 ${c}가 아님`);
    if (!h.includes("비침이 적은 두께")) fails.push(`${p}: 체크리스트 문구 사라짐`);
  }
  // 밀도: compact는 세로 여백을 조인다(0.85배), classic은 1
  if (packPadScale(CLASSIC_PACK) !== 1) fails.push("classic 여백 배율이 1이 아님");
  const mono = resolveStylePack("의류/패션", "mono-minimal");
  if (Math.abs(packPadScale(mono) - mono.padYScale * 0.85) > 1e-9) fails.push("mono compact 배율");
  return fails;
}
