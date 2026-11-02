/**
 * 회귀 — 476차 B·C: 사선 gradient 제거, 순수 장식 띠 상한, 마퀴 구조.
 */
import { setDesignUp1ForTests, setDesignV5ForTests } from "../../lib/design-v4";
import { ARCHETYPE_IDS, setV5ArchetypeForTests } from "../../lib/page-archetype-v5";
import { assertBottomPairDiffs } from "../../lib/page-recipe-v5";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "장식·마퀴·레시피 476";

/** 글·아이콘·번호 없이 보이는 순수 장식 후보(대략) */
function pureDecoCount(html: string): number {
  const hatch = (html.match(/repeating-linear-gradient/g) || []).length;
  // 의미 표식 없는 dyn-deco 중 빈 띠 패턴
  const emptyBars = (html.match(/height:3[06]px;margin:0 -8px;transform:rotate/g) || []).length;
  const bareDots = (html.match(/data-pz-ax-decor="dots-grid"/g) || []).length;
  return hatch + emptyBars + bareDots;
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const bottomFails = assertBottomPairDiffs(3);
  for (const x of bottomFails) f.push(`bottom ${x}`);

  setDesignUp1ForTests(true);
  setDesignV5ForTests(true);
  for (const a of ARCHETYPE_IDS) {
    setV5ArchetypeForTests(a);
    for (const [, file] of corpus().slice(0, 4)) {
      const h = exportHtmlOf(file);
      if (/repeating-linear-gradient/i.test(h)) f.push(`${a}: repeating-linear-gradient 잔존`);
      const pure = pureDecoCount(h);
      if (pure > 2) f.push(`${a}: 순수 장식 후보 ${pure} > 2`);
      // 마퀴: 있으면 first/last 표식·패딩·mask
      if (h.includes("data-pz-ticker=") || h.includes('data-pz-dyn="tickerBand"') || h.includes("tickerBand")) {
        if (!h.includes('data-pz-ticker-item="first"')) f.push(`${a}: 마퀴 first 항목 표식 없음`);
        if (!h.includes("padding:0 32px") && !h.includes("padding:0 32px")) {
          // track padding
          if (!/data-pz-ticker-track[^>]*padding:0 32px/.test(h) && !h.includes("padding:0 32px")) {
            if (!h.includes("data-pz-ticker-track")) f.push(`${a}: 마퀴 track 없음`);
          }
        }
        if (!h.includes("mask-image:linear-gradient") && !h.includes("-webkit-mask-image:linear-gradient")) {
          f.push(`${a}: 마퀴 페이드 마스크 없음`);
        }
      }
    }
  }
  setV5ArchetypeForTests(null);
  setDesignV5ForTests(false);
  return [...new Set(f)];
}

if (require.main === module)
  void run().then((x) => {
    console.log(x.length ? x.slice(0, 40).join("\n") : "통과");
    process.exit(x.length ? 1 : 0);
  });
