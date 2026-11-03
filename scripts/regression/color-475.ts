/**
 * 회귀 — 475차 B: 색 4역할, hue≥2, 포인트 5~15%, 대비 4.5:1, 8종 hue 전부 동일 금지.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { colorRolesV5, hueBin } from "../../lib/color-roles-v5";
import { contrastRatioToken } from "../../lib/design-tokens";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "색 475 — 4역할·hue·대비";

const SAMPLE_ACCENT = "#E8A0BF"; // 원피스 분홍 계열

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const pointBins = new Set<number>();
  const surfaceBins = new Set<number>();
  for (const a of ARCHETYPE_IDS) {
    const r = colorRolesV5(a, SAMPLE_ACCENT);
    if (r.pointPct < 5 || r.pointPct > 15) f.push(`${a}: pointPct ${r.pointPct} 범위 밖`);
    const pb = hueBin(r.point);
    const sb = hueBin(r.surface);
    pointBins.add(pb);
    surfaceBins.add(sb);
    if (pb === sb) f.push(`${a}: surface·point 같은 hue bin ${pb}`);
    if (contrastRatioToken(r.ink, r.surface) < 4.5) f.push(`${a}: ink/surface 대비 <4.5`);
  }
  if (pointBins.size < 2) f.push(`8종 point hue bin ${pointBins.size} < 2`);
  // 같은 상품 8종 — point hue가 전부 같으면 안 됨
  if (pointBins.size < 3) f.push(`포인트 hue 다양성 ${pointBins.size} < 3(분홍 일색 방지)`);

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(corpus()[0]![1]);
    if (!h.includes("--pz-s:") || !h.includes("--pz-p:")) f.push(`${a}: 색 토큰 미표기`);
    if (!h.includes("--pz-surface:") || !h.includes("--pz-on-surface:")) f.push(`${a}: 478 면/글자 쌍 미표기`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 2)) {
    const h = exportHtmlOf(file);
    if (/--pz-s:/.test(h)) f.push("V5 off에 --pz-s 잔존");
  }
  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
