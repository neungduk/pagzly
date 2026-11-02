/**
 * 회귀 — 474차 B: 사진 구도 5종 표식, V5 off에 data-pz-pc 없음, 깨진 아이콘 폴백 표식 유지.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { PHOTO_COMPOSE_KINDS, PHOTO_COMPOSE_V5 } from "../../lib/photo-compose-v5";
import { corpus, exportHtmlOf } from "../design-corpus";
import { existsSync } from "fs";
import { join } from "path";

export const name = "사진 474 — 구도 5종·ph2 대기 분위기 SVG";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  for (const k of PHOTO_COMPOSE_KINDS) {
    if (!Object.values(PHOTO_COMPOSE_V5).includes(k)) f.push(`PHOTO_COMPOSE_V5에 ${k} 없음`);
  }
  const ph2 = join(process.cwd(), "public/qa-fixtures/ph2");
  for (const n of ["atmosphere-warm.svg", "atmosphere-cool.svg", "atmosphere-sage.svg"]) {
    if (!existsSync(join(ph2, n))) f.push(`ph2 누락: ${n}`);
  }

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const seen = new Set<string>();
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const want = PHOTO_COMPOSE_V5[a];
    let found = false;
    for (const [, file] of corpus()) {
      const h = exportHtmlOf(file);
      if (h.includes(`data-pz-pc="${want}"`)) found = true;
      for (const k of PHOTO_COMPOSE_KINDS) {
        if (h.includes(`data-pz-pc="${k}"`)) seen.add(k);
      }
      if (/<img[^>]+onerror=/i.test(h) && /broken|placeholder\.com|via\.placeholder/i.test(h)) f.push(`${a}: 깨진 아이콘 폴백 의심`);
    }
    if (!found) f.push(`${a}: 주 구도 data-pz-pc="${want}" 샘플 없음`);
  }
  setV5ArchetypeForTests(null);
  for (const k of PHOTO_COMPOSE_KINDS) {
    if (!seen.has(k)) f.push(`말뭉치 전체에서 data-pz-pc="${k}" 미출현`);
  }

  setDesignV5ForTests(false);
  for (const [, file] of corpus().slice(0, 4)) {
    const h = exportHtmlOf(file);
    if (/data-pz-pc=/.test(h)) f.push("V5 off에 data-pz-pc 잔존");
  }
  return f;
}

if (require.main === module) void run().then((x) => { console.log(x.length ? x.slice(0, 40).join("\n") : "통과"); process.exit(x.length ? 1 : 0); });
