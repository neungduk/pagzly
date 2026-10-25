/**
 * 회귀 — 453차 1 단어 중간 끊김. ① 합성 21종 × 390·750 끊김 ≤10(전 15, 의도한 블록 줄바꿈 제외 정의) ② 합성 21종 × 320·390·750 가로 넘침 0 ③ bindCompoundsHtml이 글자(태그 제거 후)를 바꾸지 않고
 * script·style·head는 건드리지 않는다 ④ 라벨 머리(display:block)는 끊김으로 세지 않는다(지표 정의).
 */
import { corpus, exportHtmlOf } from "../design-corpus";
import { launch, openHtml } from "../eye-lib";
import { bindCompoundsHtml } from "../../lib/typo-v4";
import { run as measure, sum } from "../typo-metrics";

export const name = "단어 중간 끊김 — 21종 ≤10·가로 넘침 0·글자 불변·script/style 불변";

const text = (h: string): string => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows = await measure([390, 750]);
  const m = sum(rows, "midword");
  if (m > 10) fails.push(`단어 중간 끊김 ${m} > 10`);
  const sample = '<html><head><title>가을·겨울</title></head><body><p>봄·여름에는 단독, 데님·슬랙스에 · 매치</p><style>.a{content:"가·나"}</style><script>var s="가·나";</script></body></html>';
  const out = bindCompoundsHtml(sample);
  if (text(out) !== text(sample)) fails.push("bindCompoundsHtml이 글자를 바꿈");
  if (!out.includes('<span style="white-space:nowrap">봄·여름에는</span>')) fails.push("가운뎃점 복합어를 묶지 않음");
  if (out.includes("<title><span") || /<style>[^<]*<span/.test(out) || /<script>[^<]*<span/.test(out)) fails.push("head/script/style을 건드림");
  const b = await launch();
  try {
    for (const [id, f] of corpus().filter(([i]) => i.startsWith("fx-"))) {
      const html = exportHtmlOf(f);
      for (const W of [320, 390, 750]) {
        const ex = await openHtml(b, html, W);
        const over = (await ex.page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")) as number;
        await ex.close();
        if (over > 0) fails.push(`${id} ${W}px 가로 넘침 +${over}`);
      }
    }
  } finally { await b.close(); }
  return fails.slice(0, 10);
}
