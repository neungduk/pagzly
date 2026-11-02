/**
 * 회귀 — 473차 A: 말줄임 금지·중복 제목·한눈에 보기 칸·의도 있는 구분 띠.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "../design-corpus";
import { bareBreatherHits, dupTitleOk, ellipsisHits, glanceLayoutOk } from "../hero-metrics-473";

export const name = "첫 화면 473 — 말줄임·중복 제목·한눈에 보기·구분 띠";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  let sawGlance = false;
  let sawBreather = false;
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      const el = ellipsisHits(h);
      if (el.length) f.push(`${id}/${a}: 말줄임 ${[...new Set(el)].join(",")}`);
      if (!dupTitleOk(h)) f.push(`${id}/${a}: 중복 제목 시각 숨김 누락`);
      for (const g of glanceLayoutOk(h)) f.push(`${id}/${a}: ${g}`);
      if (/data-pz-glance=/.test(h)) sawGlance = true;
      const br = bareBreatherHits(h);
      if (br.length) f.push(`${id}/${a}: 빈 구분 띠`);
      if (/breather\.rule/.test(h)) sawBreather = true;
    }
  }
  if (!sawGlance) f.push("한눈에 보기(data-pz-glance) 샘플 0");
  if (!sawBreather) f.push("구분 띠 샘플 0");
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 60).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
