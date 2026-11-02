/**
 * 474차 F — export≤140% · V5 off 안정 · type/photo/spacing/detail 회귀 묶음.
 * 기존 run-all 실패 4건(muted 대비·export 픽셀·DB SQL·무거운 도구)은 미착수.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../lib/page-archetype-v5";
import { corpus, exportHtmlOf } from "./design-corpus";
import * as type474 from "./regression/type-474";
import * as photo474 from "./regression/photo-474";
import * as spacing474 from "./regression/spacing-474";
import * as detail474 from "./regression/detail-474";
import * as hero473 from "./regression/hero-473";
import * as body473 from "./regression/body-473";
import * as hero471 from "./regression/hero-471";

async function main() {
  setDesignUp1ForTests(true);
  setDesignV5ForTests(false);
  const bases = new Map(corpus().map(([id, f]) => [id, exportHtmlOf(f).length]));
  let worst = { id: "", a: "", pct: 0 };
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [id, file] of corpus()) {
      const pct = (exportHtmlOf(file).length / (bases.get(id) ?? 1)) * 100;
      if (pct > worst.pct) worst = { id, a, pct };
    }
  }
  setV5ArchetypeForTests(null);
  console.log(`WORST export ${worst.a}/${worst.id} ${worst.pct.toFixed(1)}% (limit 140)`);

  setDesignV5ForTests(false);
  const a = exportHtmlOf(corpus()[0]![1]);
  const b = exportHtmlOf(corpus()[0]![1]);
  console.log(`V5off stable ${a === b} len=${a.length}`);

  const suites = [type474, photo474, spacing474, detail474, hero473, body473, hero471];
  const fails: string[] = [];
  for (const m of suites) {
    const f = await m.run();
    console.log(`${m.name}: ${f.length ? `FAIL ${f.length}` : "ok"}`);
    if (f.length) fails.push(`${m.name}\n` + f.slice(0, 15).map((x) => `  - ${x}`).join("\n"));
  }
  if (worst.pct > 140) fails.push(`export ${worst.pct.toFixed(1)}% > 140`);
  if (fails.length) {
    console.log(fails.join("\n"));
    console.log("실패");
    process.exit(1);
  }
  console.log("통과");
}

void main();
