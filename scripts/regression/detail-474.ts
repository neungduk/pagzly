/**
 * 회귀 — 474차 D: 미세 장식 어휘·이중선/테이프 표식·V5 off 잔존 없음.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { detailHeadDistinct, detailDecoOf } from "../../lib/detail-deco-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "디테일 474 — 장식 어휘·표식";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const n = detailHeadDistinct();
  if (n < 4) f.push(`머리 장식 종류 ${n} < 4`);
  for (const a of ARCHETYPE_IDS) {
    const d = detailDecoOf(a);
    if (!d.head || d.head === "none") f.push(`${a}: head decor 없음`);
    if (d.alt.length < 1) f.push(`${a}: decorAlt 비어 있음`);
  }
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  let sawDouble = false;
  let sawTape = false;
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [, file] of corpus().slice(0, 8)) {
      const h = exportHtmlOf(file);
      if (h.includes('data-pz-ax-decor="double-rule"')) sawDouble = true;
      if (h.includes('data-pz-ax-decor="tape-tab"')) sawTape = true;
    }
  }
  setV5ArchetypeForTests(null);
  if (!sawDouble) f.push("double-rule 표식 미출현");
  if (!sawTape) f.push("tape-tab 표식 미출현");
  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 3)) {
    const h = exportHtmlOf(file);
    if (/data-pz-ax-decor="double-rule"/.test(h) || /data-pz-ax-decor="tape-tab"/.test(h)) f.push("V5 off에 474 decor 잔존");
  }
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 40).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
