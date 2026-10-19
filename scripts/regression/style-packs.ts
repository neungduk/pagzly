/**
 * 회귀 — 408차 스타일 팩(패션 3종). 기본 팩·알 수 없는 id·패션 외 카테고리는 항상 classic이고,
 * classic은 팩 인자 없는 호출과 같은 결과여야 한다. 팩별 export에는 해당 팩의 변수/서체가 들어간다. 유료 호출 0.
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { getHeroGradient, titleScaleVars, titleScaleExportCss } from "../../lib/design-tokens";
import { headlineDisplayStyle, packHeadlineExportCss } from "../../lib/detail-typography";
import { applyPackTone, CLASSIC_PACK, packTitleScaleOverrides, resolveStylePack, stylePackOptions } from "../../lib/style-packs";
import type { DetailSection } from "../../lib/types/generate";

export const name = "스타일 팩(패션 3종) — 기본 불변·폴백·팩별 export";

const CATS = ["의류/패션", "화장품/뷰티", "식품/건강기능식품", "반려동물", "생활용품", "전자제품", "기타"];
const SECTIONS = [
  { type: "hero", headline: "가볍게 입는 데일리 티", subheadline: "부드러운 면" },
  { type: "text_block", heading: "소개", body: "본문 한 줄" },
] as unknown as DetailSection[];

function html(category: string, stylePackId?: string | null) {
  return buildDetailPageHtml({
    productName: "티",
    brandName: "b",
    category,
    sections: SECTIONS,
    imageUrls: [],
    theme: { ...getCategoryTheme(category), accent: "#844F1F", accentText: "#844F1F", deepAccent: "#4A2C0F", accentSoft: "#F3E6D8", baseNeutral: "#F5EEE6" },
    stylePackId,
  });
}

const hue = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r!, g!, b!), min = Math.min(r!, g!, b!), d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g! - b!) / d) % 6 : max === g ? (b! - r!) / d + 2 : (r! - g!) / d + 4;
  return (h * 60 + 360) % 360;
};
const sat = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r!, g!, b!), min = Math.min(r!, g!, b!), l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // 1) id 없음·모르는 id·패션 외 → classic
  for (const c of CATS) {
    for (const id of [undefined, null, "", "nope", "editorial", "mono-minimal"]) {
      const want = c === "의류/패션" && (id === "editorial" || id === "mono-minimal") ? id : "classic";
      if (resolveStylePack(c, id).id !== want) fails.push(`${c}/${String(id)} → ${resolveStylePack(c, id).id} (기대 ${want})`);
    }
    if ((stylePackOptions(c).length > 0) !== (c === "의류/패션")) fails.push(`${c} 선택칸 노출 조건`);
  }
  if (stylePackOptions("의류/패션").map((p) => p.id).join() !== "classic,mono-minimal,editorial") fails.push("패션 팩 목록/순서");
  // 2) classic == 인자 없는 호출
  for (const c of CATS) {
    if (JSON.stringify(headlineDisplayStyle(c, CLASSIC_PACK)) !== JSON.stringify(headlineDisplayStyle(c))) fails.push(`${c} classic 제목 스타일이 다름`);
  }
  if (packHeadlineExportCss(CLASSIC_PACK) !== "") fails.push("classic에 제목 덮어쓰기 CSS가 있음");
  const th = getCategoryTheme("의류/패션");
  if (applyPackTone(th, CLASSIC_PACK) !== th) fails.push("classic이 theme을 바꿈");
  if (JSON.stringify(titleScaleVars(packTitleScaleOverrides(CLASSIC_PACK))) !== JSON.stringify(titleScaleVars())) fails.push("classic 제목 크기 변수가 다름");
  if (titleScaleExportCss(packTitleScaleOverrides(CLASSIC_PACK)) !== titleScaleExportCss()) fails.push("classic export 제목 크기가 다름");
  if (getHeroGradient({ ...th, heroGradientStrength: 1 }) !== getHeroGradient(th)) fails.push("강도 1이 그라데이션을 바꿈");
  // 3) export: classic == 팩 없음, 패션 외는 팩 id가 있어도 같음, 팩별 값 포함
  const base = html("의류/패션");
  if (html("의류/패션", "classic") !== base) fails.push("패션 classic export가 팩 없는 export와 다름");
  if (html("의류/패션", "알수없음") !== base) fails.push("알 수 없는 id export가 classic과 다름");
  for (const c of CATS.filter((x) => x !== "의류/패션")) if (html(c, "editorial") !== html(c)) fails.push(`${c} export가 팩 id 때문에 바뀜`);
  if (/!important;letter-spacing:-0\.0(3|15)em/.test(base)) fails.push("classic export에 팩 서체 규칙이 있음");
  const mono = html("의류/패션", "mono-minimal");
  const edi = html("의류/패션", "editorial");
  if (!mono.includes("font-weight:600!important;letter-spacing:-0.03em!important")) fails.push("mono export에 제목 규칙 없음");
  if (!edi.includes("Noto Serif KR") || !edi.includes("letter-spacing:-0.015em!important")) fails.push("editorial export에 serif 규칙 없음");
  if (!mono.includes("--pz-t-hero:2.5rem") || !edi.includes("--pz-t-hero:3.25rem")) fails.push("팩 제목 크기 변수가 export에 없음");
  if (mono === base || edi === base || mono === edi) fails.push("팩 export가 서로 같음");
  const padOf = (s: string) => /--pz-pad-y:(\d+)px/.exec(s)?.[1];
  if (!(Number(padOf(mono)) > Number(padOf(base))) || !(Number(padOf(edi)) > Number(padOf(mono)))) fails.push(`여백 순서 classic<mono<editorial 아님: ${padOf(base)}/${padOf(mono)}/${padOf(edi)}`);
  // 4) 색: hue 유지, 채도 감소
  const t = { ...th, accent: "#844F1F", accentText: "#844F1F", deepAccent: "#4A2C0F", accentSoft: "#F3E6D8", baseNeutral: "#F5EEE6" };
  for (const id of ["mono-minimal", "editorial"] as const) {
    const out = applyPackTone(t, resolveStylePack("의류/패션", id));
    const dh = Math.abs(hue(out.accent) - hue(t.accent));
    if (Math.min(dh, 360 - dh) > 4) fails.push(`${id} accent hue 변함: ${hue(t.accent)} → ${hue(out.accent)}`);
    if (!(sat(out.accent) < sat(t.accent))) fails.push(`${id} accent 채도가 줄지 않음`);
    if (out.heroGradientStrength !== resolveStylePack("의류/패션", id).heroGradientStrength) fails.push(`${id}: 그라데이션 세기가 theme에 실리지 않음`);
    if (!(getHeroGradient(out) !== getHeroGradient(t))) fails.push(`${id}: 그라데이션이 기본과 같음`);
  }
  return fails;
}
