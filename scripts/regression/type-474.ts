/**
 * 회귀 — 474차 A: 제목 서체 ≥5종, 본문 ≥15px·행간 ≥1.6, V5 off에 서체 변수 없음.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { titleFamiliesDistinct, TYPE_PAIR_V5 } from "../../lib/type-system-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "서체 474 — 아키타입 제목 패밀리·본문 가독성";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const n = titleFamiliesDistinct();
  if (n < 5) f.push(`제목 서체 패밀리 ${n}종 < 5`);
  for (const a of ARCHETYPE_IDS) {
    const p = TYPE_PAIR_V5[a];
    if (p.bodySize < 15) f.push(`${a}: 본문 ${p.bodySize}px < 15`);
    if (p.bodyLh < 1.6) f.push(`${a}: 행간 ${p.bodyLh} < 1.6`);
    if (p.measureCh < 24 || p.measureCh > 34) f.push(`${a}: 문단폭 ${p.measureCh}ch 범위 밖`);
  }
  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(corpus()[0]![1]);
    if (!new RegExp(`--pz-v5-title:`).test(h)) f.push(`${a}: --pz-v5-title 없음`);
    if (!h.includes(`--pz-v5-body:`)) f.push(`${a}: --pz-v5-body 없음`);
    const fam = TYPE_PAIR_V5[a].title;
    // CSS에 제목 패밀리 이름이 들어가야 함
    const name = fam === "noto-sans-kr" ? "Noto Sans KR" : fam === "noto-serif-kr" ? "Noto Serif KR" : fam === "gowun-batang" ? "Gowun Batang" : fam === "gowun-dodum" ? "Gowun Dodum" : fam === "black-han-sans" ? "Black Han Sans" : fam === "do-hyeon" ? "Do Hyeon" : "Jua";
    if (!h.includes(name)) f.push(`${a}: 제목 패밀리 '${name}' 미표기`);
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 3)) {
    const h = exportHtmlOf(file);
    if (/--pz-v5-title:/.test(h)) f.push(`V5 off에 --pz-v5-title 잔존`);
  }
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 40).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
