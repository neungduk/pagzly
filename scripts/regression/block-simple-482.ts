/**
 * 482 C — 블록 단순화: 크롬 ≤3, 제목/본문 ≥2.2, V5 off 불변.
 */
import fs from "node:fs";
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import {
  BLOCK_SIMPLE_MAX,
  countBlockChrome482,
  simplifyBlockHtml482,
  titleBodyRatioOk482,
} from "../../lib/block-simple-482";
import { exportHtmlOf } from "../design-corpus";

export const name = "블록 단순 482 — 크롬≤3·제목비·off";

const LIVE = "scripts/fixtures/live-481.json";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const sample =
    `<section data-pz-v4="phototext.bleed" data-pz-pb="1">` +
    `<div data-pz-bchrome="above"><span data-pz-bmark="dots"></span><span data-pz-chip>DETAIL</span></div>` +
    `<p data-pz-title style="font-size:34px">제목</p>` +
    `<p data-pz-title style="font-size:22px">중복</p>` +
    `<span data-pz-kw style="background-image:linear-gradient(transparent 60%,#ccc 60%)">키</span>` +
    `<p data-pz-body style="font-size:15px">본문</p>` +
    `<div data-pz-ax-decor>x</div>` +
    `</section>`;

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  const simplified = simplifyBlockHtml482(sample, BLOCK_SIMPLE_MAX);
  const n = countBlockChrome482(simplified);
  if (n > BLOCK_SIMPLE_MAX) f.push(`샘플 크롬 ${n} > ${BLOCK_SIMPLE_MAX}`);
  if (!titleBodyRatioOk482(simplified)) f.push("샘플 제목/본문 비 실패");
  if (/transparent 60%/.test(simplified) && /data-pz-kw/.test(simplified)) {
    f.push("밑줄 60% 마커 잔존");
  }

  if (!fs.existsSync(LIVE)) {
    f.push(`픽스처 없음 ${LIVE}`);
    return f;
  }

  const counts: number[] = [];
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    const h = exportHtmlOf(LIVE);
    const blocks = h.split(/<section/i).slice(1).map((s) => "<section" + s);
    for (const b of blocks) {
      if (!/data-pz-v4="(?:phototext|benefits)|data-pz-pb=|data-info="points"/i.test(b)) continue;
      const c = countBlockChrome482(b);
      counts.push(c);
      if (c > 4) f.push(`${a}: 블록 크롬 ${c} > 4`);
    }
  }
  if (counts.length) {
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg > 2.5) f.push(`평균 크롬 ${avg.toFixed(2)} > 2.5`);
  }

  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  const off = simplifyBlockHtml482(sample);
  if (off !== sample) f.push("V5 off인데 simplify가 변경함");

  return f;
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
