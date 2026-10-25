/**
 * 453차 3 — 섹션 종류별 눈 검수 캡처. 종류 키가 같은 구간을 입력 풍부(tier-rich)·보통(tier-normal)·빈약(tier-sparse) 합성 세션에서 390폭으로 찍어 저장한다.
 *   npx tsx scripts/section-sheet.ts --dir=review/453-verify/section-sheet/after   (코드 바꾸기 전/후에 각각 실행)
 */
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

const dir = process.argv.find((a) => a.startsWith("--dir="))?.slice(6) ?? "review/453-verify/section-sheet/after";
const TYPES = ["v4:spec.line", "v4:concern.stack", "v4:phototext.collage", "v4:story.linetime", "impact:faqcards"];
const TIERS = ["fx-tier-rich-fashion-6p", "fx-tier-normal-fashion-3p", "fx-tier-sparse-beauty-1p", "fx-tier-rich-tech-6p", "fx-tier-normal-living-3p", "fx-tier-sparse-food-1p"];
void (async () => {
  fs.mkdirSync(dir, { recursive: true });
  const b = await launch();
  for (const id of TIERS) {
    const ex = await openHtml(b, exportHtmlOf(corpus({ only: [id] })[0]![1]), 390);
    for (const t of TYPES) {
      const attr = t.startsWith("v4:") ? `[data-pz-v4="${t.slice(3)}"]` : `[data-pz-impact="${t.slice(7)}"]`;
      const loc = ex.page.locator(`.pagzly-wrap > section${attr}`).first();
      if (await loc.count()) await loc.screenshot({ path: path.join(dir, `${t.replace(/[:.]/g, "_")}__${id}.png`) }).catch(() => {});
    }
    await ex.close();
  }
  await b.close();
  console.log(fs.readdirSync(dir).length + " files");
})();
