/**
 * 회귀 — 409차 팩 구조 변형 값(layout)과 폴백 규칙. 유료 호출 0.
 */
import { CLASSIC_LAYOUT, CLASSIC_PACK, getPackLayout, resolveGalleryVariant, resolveHeadingVariant, resolveHeroVariant, resolveStylePack } from "../../lib/style-packs";

export const name = "팩 구조 변형 값·폴백(히어로·갤러리·소제목)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // classic = 변형 없는 호출
  if (JSON.stringify(getPackLayout(CLASSIC_PACK)) !== JSON.stringify(CLASSIC_LAYOUT)) fails.push("classic layout이 CLASSIC_LAYOUT과 다름");
  if (JSON.stringify(getPackLayout(undefined)) !== JSON.stringify(CLASSIC_LAYOUT)) fails.push("팩 없음이 classic이 아님");
  for (const [c, id] of [["의류/패션", "nope"], ["의류/패션", undefined], ["화장품/뷰티", "editorial"], ["전자제품", "mono-minimal"]] as const) {
    if (JSON.stringify(getPackLayout(resolveStylePack(c, id))) !== JSON.stringify(CLASSIC_LAYOUT)) fails.push(`${c}/${String(id)} layout이 classic이 아님`);
  }
  const mono = getPackLayout(resolveStylePack("의류/패션", "mono-minimal"));
  const edi = getPackLayout(resolveStylePack("의류/패션", "editorial"));
  if (mono.hero !== "caption-above" || mono.flow !== "photo-first" || mono.gallery !== "lookbook-stack" || mono.radius !== 0) fails.push("mono 값이 제안과 다름");
  if (edi.hero !== "caption-below" || edi.gallery !== "lead-plus-two" || edi.heading !== "center-rule" || edi.summary !== "spec-list") fails.push("editorial 값이 제안과 다름");
  // 폴백
  if (resolveHeroVariant(mono, false) !== "bleed-bottom" || resolveHeroVariant(edi, false) !== "bleed-bottom") fails.push("히어로 사진 없음 → bleed-bottom 아님");
  if (resolveHeroVariant(edi, true) !== "caption-below") fails.push("히어로 사진 있음인데 변형이 꺼짐");
  if (resolveGalleryVariant(mono, 1) !== "duo-grid") fails.push("갤러리 1장 → duo-grid 아님");
  if (resolveGalleryVariant(edi, 2) !== "duo-grid") fails.push("lead-plus-two 2장 → duo-grid 아님");
  if (resolveGalleryVariant(edi, 3) !== "lead-plus-two" || resolveGalleryVariant(mono, 2) !== "lookbook-stack") fails.push("갤러리 충분한 사진에서 변형이 꺼짐");
  if (resolveHeadingVariant(mono, false) !== "center-stack") fails.push("라벨 없음 → center-stack 아님");
  if (resolveHeadingVariant(mono, true) !== "left-eyebrow" || resolveHeadingVariant(edi, false) !== "center-rule") fails.push("소제목 변형 규칙");
  return fails;
}
