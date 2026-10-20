/**
 * 회귀 — 413차 서체 프리셋·연속 톤: 모든 서체 프리셋이 허용 굵기(Noto 실제 로딩분)이고, 톤 파라미터 범위 끝값 × 중립 띠 4종 × hue 12개에서 글자 대비가 합격선(4.5:1, 큰 글자 3:1) 이상. 유료 호출 0.
 */
import { contrastLint, HUES, makeTone, TYPE_PRESETS, type NeutralBand } from "../../lib/style-axes";
import { decodeSpec, encodeSpec, specOfPack, resolveStylePack, TITLE_SCALES, type SpecAxes } from "../../lib/style-packs";

export const name = "서체 프리셋·연속 톤 — 허용 굵기·대비(범위 끝값 × 중립 띠 × hue 12)";

const SANS = [400, 500, 600, 700, 900];
const SERIF = [400, 600, 700];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const base = specOfPack(resolveStylePack("의류/패션", "editorial"));
  for (const [id, p] of Object.entries(TYPE_PRESETS)) {
    if (p.headline) {
      const ok = (p.headline.kind === "serif" ? SERIF : SANS).includes(p.headline.weight);
      if (!ok) fails.push(`${id}: 로딩되지 않은 굵기 ${p.headline.weight}`);
    }
    if (!(p.scale in TITLE_SCALES)) fails.push(`${id}: 제목 크기 묶음 ${p.scale} 없음`);
  }
  if (Object.keys(TYPE_PRESETS).length < 5) fails.push("서체 프리셋이 5종 미만");
  const bands: NeutralBand[] = ["tinted", "ivory", "cool", "plain"];
  for (const sat of [0.2, 0.55, 1]) {
    for (const depth of [0, 0.5, 1]) {
      for (const band of bands) {
        const tone = makeTone(sat, depth, band);
        for (const heading of ["center-stack", "left-eyebrow"] as const) {
          const axes: SpecAxes = { ...base, hero: "caption-below", heading, tone };
          const rt = decodeSpec(encodeSpec(axes));
          if (!rt) {
            fails.push(`톤 sat${sat} depth${depth} ${band}: 코드 왕복 실패`);
            continue;
          }
          for (const hue of HUES) for (const f of contrastLint(axes, hue)) fails.push(`sat${sat} depth${depth} ${band} ${heading}: ${f}`);
        }
      }
    }
  }
  return fails.slice(0, 12);
}
