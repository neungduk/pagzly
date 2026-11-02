/**
 * 회귀 — 476차 A: 렌더 배경 hue 분포. 같은 상품 8종 동일 hue bin ≤3.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import {
  colorRolesV5,
  dominantFaceHueBinFromHtml,
  hueBin,
  maxSameFaceHueCount,
} from "../../lib/color-roles-v5";
import { contrastRatioToken } from "../../lib/design-tokens";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "색눈 476 — 면 hue 분포·대비";

const ACCENT = "#E8A0BF";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const roleBins = ARCHETYPE_IDS.map((a) => hueBin(colorRolesV5(a, ACCENT).surface));
  const maxR = maxSameFaceHueCount(roleBins);
  if (maxR > 3) f.push(`역할 surface 동일 hue bin ${maxR} > 3`);

  for (const a of ARCHETYPE_IDS) {
    const r = colorRolesV5(a, ACCENT);
    if (contrastRatioToken(r.ink, r.surface) < 4.5) f.push(`${a}: ink/surface 대비 <4.5`);
    if (hueBin(r.point) === hueBin(r.surface)) f.push(`${a}: surface·point 같은 hue bin`);
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const htmlBins: number[] = [];
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    // 원피스 픽스처 우선
    const file = corpus().find(([id]) => /dress|fashion/i.test(id))?.[1] ?? corpus()[0]![1];
    const h = exportHtmlOf(file);
    if (!h.includes("data-pz-face=")) f.push(`${a}: data-pz-face 없음`);
    if (!h.includes("--pz-s:")) f.push(`${a}: --pz-s 없음`);
    htmlBins.push(dominantFaceHueBinFromHtml(h));
  }
  const maxH = maxSameFaceHueCount(htmlBins);
  if (maxH > 3) f.push(`렌더 HTML 면 hue 동일 bin ${maxH} > 3 (${htmlBins.join(",")})`);

  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const off = exportHtmlOf(corpus()[0]![1]);
  if (/data-pz-face=/.test(off)) f.push("V5 off에 data-pz-face 잔존");
  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
