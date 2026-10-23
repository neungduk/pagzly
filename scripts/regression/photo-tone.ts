/**
 * 회귀 — 443차 4-1 본문 사진 톤 통일 오버레이(DESIGN_V4): mood별 틴트 그라데이션 오버레이가 사진 칸마다 정확히 한 장,
 * filter·mix-blend-mode·mask 없음(export·PNG 안전), 알파 상한, mood가 없거나 v4 off면 마크업 불변(입력 없음 = 불변), 모든 mood에 틴트 존재. 호출 0.
 */
import { MOOD_IDS } from "../../lib/archetype-recipes";
import { TONE_V4, toneOverlayStyle } from "../../lib/design-tokens-v4";
import { setDesignV4ForTests } from "../../lib/design-v4";
import { photoLayoutHtml } from "../../lib/photo-layouts";
import type { ImpactSection } from "../../lib/types/generate";
import type { ImpactPalette } from "../../lib/impact-templates";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "사진 톤 오버레이 — mood별 한 장·금지 기법 없음·알파 상한·입력 없음 불변";

const PAL = { ink: "#1B1B18", deep: "#2A4A6B", tint: "#EAF1F7" } as unknown as ImpactPalette;
const imgs = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `/p${i}.jpg`, pos: "50% 40%" }));
const CASES: Array<[ImpactSection["kind"], number, number]> = [["asym2", 2, 2], ["mosaic3", 3, 3], ["stagger", 4, 4], ["inset", 1, 1], ["frame", 1, 1], ["zoom", 1, 1]];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const m of MOOD_IDS) if (!toneOverlayStyle(m)) fails.push(`mood ${m}에 틴트 없음`);
  if (toneOverlayStyle(undefined) !== "" || toneOverlayStyle("no-such-mood") !== "") fails.push("mood가 없거나 모르는 값인데 오버레이가 만들어짐");
  if (TONE_V4.alphaBottom > 0.16 || TONE_V4.alphaTop > TONE_V4.alphaBottom) fails.push("오버레이 알파 상한(0.16)·순서 위반");
  setDesignV4ForTests(true);
  for (const [kind, n, want] of CASES) {
    const base = { type: "impact", slot: "impact", kind, text: "톤검사", body: "본문", images: imgs(n) } as unknown as ImpactSection;
    const none = photoLayoutHtml(base, PAL, "alt");
    if (/data-pz-tone/.test(none)) fails.push(`${kind}: mood 없는데 오버레이가 있음`);
    for (const m of MOOD_IDS) {
      const h = photoLayoutHtml({ ...base, mood: m } as ImpactSection, PAL, "alt");
      const got = (h.match(/data-pz-tone/g) ?? []).length;
      if (got !== want) fails.push(`${kind}/${m}: 오버레이 ${got}장 ≠ 사진 칸 ${want}`);
      if (/filter:|mix-blend-mode|mask|clip-path|backdrop-filter/.test(h)) fails.push(`${kind}/${m}: 금지 기법`);
      // 오버레이를 뺀 나머지는 mood 없는 마크업과 같다(position:relative 한 가지만 칸에 더해짐)
      const stripped = h.replace(/<span aria-hidden="true" data-pz-tone[^>]*><\/span>/g, "").replace(/position:relative;/g, "");
      const strippedNone = none.replace(/position:relative;/g, "");
      if (stripped !== strippedNone) fails.push(`${kind}/${m}: 오버레이 외 마크업이 달라짐`);
    }
  }
  // v4 off: mood가 있어도 오버레이 없음(438차 마크업)
  setDesignV4ForTests(false);
  for (const [kind, n] of CASES) {
    const h = photoLayoutHtml({ type: "impact", slot: "impact", kind, text: "x", images: imgs(n), mood: "warm" } as unknown as ImpactSection, PAL, "alt");
    if (/data-pz-tone/.test(h)) fails.push(`${kind}: v4 off인데 오버레이가 있음`);
  }
  setDesignV4ForTests(true);
  // 말뭉치: 사진 레이아웃이 있는 export에는 오버레이가 있고 filter 계열은 없다
  let withTone = 0;
  for (const [id, f] of corpus()) {
    const h = exportHtmlOf(f);
    const k = (h.match(/data-pz-tone/g) ?? []).length;
    if (k) withTone += 1;
    if (k && /data-pz-tone[^>]*(filter|mix-blend|mask)/.test(h)) fails.push(`${id}: 오버레이에 금지 기법`);
  }
  if (corpus().length >= 18 && !withTone) fails.push("말뭉치 어디에도 오버레이가 없음(검사 무의미)");
  return fails;
}
