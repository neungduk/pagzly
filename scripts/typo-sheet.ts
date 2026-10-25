/**
 * 452차 2 — 타이포 전/후 시트용 캡처. 일러스트 임팩트 구간(말풍선 알약)과 첫 본문 구간을 390폭으로 찍어 PNG로 저장한다.
 *   npx tsx scripts/typo-sheet.ts --dir=review/452-verify/typo/after     (코드를 바꾸기 전/후에 각각 실행해 before/after 폴더를 만든다)
 */
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

const dir = process.argv.find((a) => a.startsWith("--dir="))?.slice(6) ?? "review/452-verify/typo/after";
const IDS = ["fx-compare-beauty", "fx-tech-keyboard", "fx-fashion-dress-floral", "fx-hairbody-shampoo", "fx-makeup-tint", "fx-tier-rich-tech-6p"];
void (async () => {
  fs.mkdirSync(dir, { recursive: true });
  const b = await launch();
  for (const id of IDS) {
    const ex = await openHtml(b, exportHtmlOf(corpus({ only: [id] })[0]![1]), 390);
    const loc = ex.page.locator('[data-pz-impact^="illust"], [data-ip="badges"], .pagzly-body-lh').first();
    if (await loc.count()) { const box = await loc.locator("xpath=ancestor-or-self::section[1]").first(); await box.screenshot({ path: path.join(dir, `${id}.png`) }).catch(() => {}); }
    await ex.close();
  }
  await b.close();
  console.log(fs.readdirSync(dir).join(", "));
})();
