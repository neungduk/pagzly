/**
 * 회귀 — 473차 B: 본문 시각 시그니처 6칸 쌍 ≥3, POINT 목록 분기 표식.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { BODY_SIG, bodySigDiff, recipeBodySigDiff } from "../../lib/body-sig-v5";
import { corpus, exportHtmlOf } from "../design-corpus";
import { bodySigFromHtml } from "../body-sig-473";

export const name = "본문 473 — 시각 시그니처 6칸·POINT 분화";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  // 레시피 표: 모든 쌍 ≥3
  for (let i = 0; i < ARCHETYPE_IDS.length; i += 1) {
    for (let j = i + 1; j < ARCHETYPE_IDS.length; j += 1) {
      const d = recipeBodySigDiff(ARCHETYPE_IDS[i]!, ARCHETYPE_IDS[j]!);
      if (d < 3) f.push(`레시피 ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}: 본문 시그니처 ${d} < 3`);
    }
  }
  const lists = new Set(ARCHETYPE_IDS.map((a) => BODY_SIG[a].list));
  if (lists.size < 6) f.push(`목록 모양 ${lists.size}종 < 6`);
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const byPage: Record<string, ReturnType<typeof bodySigFromHtml>[]> = {};
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      if (!/data-pz-bsig=/.test(h)) f.push(`${id}/${a}: data-pz-bsig 없음`);
      const sig = bodySigFromHtml(h, a);
      (byPage[id] ??= []).push(sig);
      // 시그니처 HTML 값이 레시피와 일치
      const r = BODY_SIG[a];
      for (const k of ["num", "list", "stat", "rule", "radius", "shadow"] as const) {
        if (sig[k] !== r[k]) f.push(`${id}/${a}: ${k}=${sig[k]}≠${r[k]}`);
      }
    }
  }
  for (const [id, sigs] of Object.entries(byPage)) {
    if (sigs.length !== 8) continue;
    for (let i = 0; i < 8; i += 1) for (let j = i + 1; j < 8; j += 1) {
      const d = bodySigDiff(sigs[i]!, sigs[j]!);
      if (d < 3) f.push(`${id} ${ARCHETYPE_IDS[i]}-${ARCHETYPE_IDS[j]}: 본문 시그니처 ${d} < 3`);
    }
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 80).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
