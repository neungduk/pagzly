/**
 * 회귀 — 473차 D: V5 checklist 모드 표식·V5 off 무분기.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { checklistV5Mode } from "../../lib/checklist-layout-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "체크리스트 473 — V5 모드 분기";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const modes = new Set(ARCHETYPE_IDS.map((a) => checklistV5Mode(a)));
  if (modes.size < 3) f.push(`체크리스트 모드 ${modes.size}종 < 3`);

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  let saw = 0;
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const want = checklistV5Mode(a);
    for (const [id, file] of corpus()) {
      const h = exportHtmlOf(file);
      if (!h.includes("pagzly-cl-grid") && !/data-pz-cl-v5=/.test(h)) continue;
      if (!h.includes(`data-pz-cl-v5="${want}"`)) {
        // 허브/페인버블만 있으면 표식 없을 수 있음 — 표식이 다른 값이면 실패
        const m = h.match(/data-pz-cl-v5="([^"]+)"/);
        if (m && m[1] !== want) f.push(`${id}/${a}: cl-v5=${m[1]}≠${want}`);
        else if (m) saw += 1;
      } else saw += 1;
    }
  }
  if (saw === 0) f.push("V5 checklist data-pz-cl-v5 표식 0건(코퍼스에 기본 그리드 checklist 없음?)");

  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  for (const [, file] of corpus()) {
    const h = exportHtmlOf(file);
    if (/data-pz-cl-v5=/.test(h)) f.push(`V5 off에 data-pz-cl-v5 잔존: ${file}`);
  }
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 80).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
