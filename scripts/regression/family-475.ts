/**
 * 회귀 — 475차 A: 일반 섹션 종류×8종 쌍 시그니처 ≥3, highlight data-pz-hl, V5 off에 표식 없음.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import {
  FAMILY_SECTION_KINDS,
  assertFamilyPairDiffs,
  highlightFamilyMode,
} from "../../lib/section-family-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "패밀리 475 — 일반 섹션 시그니처·highlight 변형";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const pairFails = assertFamilyPairDiffs(3);
  for (const x of pairFails) f.push(`시그니처 ${x}`);

  const modes = new Set(ARCHETYPE_IDS.map(highlightFamilyMode));
  if (modes.size < 8) f.push(`highlight 모드 ${modes.size}종 < 8`);

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  let sawHl = 0;
  let sawSf = 0;
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(corpus()[0]![1]);
    const mode = highlightFamilyMode(a);
    if (h.includes(`data-pz-hl="${mode}"`)) sawHl++;
    else if (/data-pz-hl=/.test(h) === false && !h.includes("highlight_box")) {
      /* fixture may lack highlight — ok */
    } else if (!h.includes(`data-pz-hl="${mode}"`) && h.includes("data-pz-hl=")) {
      f.push(`${a}: highlight 모드 ${mode} 미표기`);
    }
    if (h.includes("data-pz-sf=") || h.includes("data-pz-it=") || h.includes("data-pz-hl=")) sawSf++;
  }
  if (sawSf === 0) f.push("패밀리 표식(data-pz-hl/it/sf) 없음");
  // highlight가 있는 픽스처에서 모드 표식
  setV5ArchetypeForTests("editorial");
  for (const [, file] of corpus()) {
    const h = exportHtmlOf(file);
    if (h.includes("pagzly-hl-grid") || h.includes("data-pz-hl-g=")) {
      if (!h.includes('data-pz-hl="')) f.push("highlight 섹션에 data-pz-hl 없음");
      break;
    }
  }

  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 3)) {
    const h = exportHtmlOf(file);
    if (/data-pz-hl=/.test(h)) f.push("V5 off에 data-pz-hl 잔존");
    if (/data-pz-sf=/.test(h)) f.push("V5 off에 data-pz-sf 잔존");
    if (/data-pz-it=/.test(h)) f.push("V5 off에 data-pz-it 잔존");
  }
  void sawHl;
  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
