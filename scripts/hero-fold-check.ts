/**
 * 451차 2 — 히어로 필수 요소 첫 화면 실측. 합성 21종(export)을 390·750폭으로 열어 제품명(h1)·훅(data-hero-hook)·가격(data-hl=price)의 하단 좌표가
 * 첫 화면 높이 안에 들어오는지 잰다. 첫 화면 높이는 가정값: 390폭 → 844, 750폭 → 1000(FIRST_SCREEN_PX, 문서 docs/v4-overview.md에 기록).
 *   npx tsx scripts/hero-fold-check.ts [--out=review/451-verify/hero-fold/summary.md] [--json=경로]
 * 가격은 히어로 v3 레이어 `data-hl="price"`만 본다(없는 변형·가격 없는 입력은 "없음"으로 구분하고 위반으로 세지 않는다).
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("hero-fold-check", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";

export const FIRST_SCREEN_PX: Record<number, number> = { 390: 844, 750: 1000 };
export type FoldRow = { id: string; width: number; variant: string; name: number | null; hook: number | null; price: number | null; hasPrice: boolean; hasHook: boolean; limit: number; out: string[] };

const MEASURE = `(() => {
  const h = document.querySelector('[data-hero-v2]'); if (!h) return null;
  const bottom = (e) => e ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null;
  const vis = (e) => { if (!e) return null; const cs = getComputedStyle(e); return cs.display === 'none' || e.closest('[data-hero-fold]') ? null : e; };
  const name = h.querySelector('h1'); const hook = h.querySelector('[data-hero-hook]'); const price = h.querySelector('[data-hl="price"]');
  return { variant: h.getAttribute('data-hero-v2'), name: bottom(vis(name)), hook: bottom(vis(hook)), price: bottom(price), hasPrice: !!price, hasHook: !!hook };
})()`;

export async function run(widths = [390, 750]): Promise<FoldRow[]> {
  const browser = await launch();
  const rows: FoldRow[] = [];
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    for (const W of widths) {
      const ex = await openHtml(browser, html, W);
      const m = (await ex.page.evaluate(MEASURE)) as { variant: string; name: number | null; hook: number | null; price: number | null; hasPrice: boolean; hasHook: boolean } | null;
      await ex.close();
      const limit = FIRST_SCREEN_PX[W] ?? 844;
      if (!m) { rows.push({ id, width: W, variant: "-", name: null, hook: null, price: null, hasPrice: false, hasHook: false, limit, out: ["히어로 없음"] }); continue; }
      const out: string[] = [];
      if (m.name === null) out.push("제품명 없음"); else if (m.name > limit) out.push(`제품명 ${m.name}>${limit}`);
      if (m.hasHook && m.hook !== null && m.hook > limit) out.push(`훅 ${m.hook}>${limit}`);
      if (m.hasPrice && m.price !== null && m.price > limit) out.push(`가격 ${m.price}>${limit}`);
      rows.push({ id, width: W, variant: m.variant, name: m.name, hook: m.hook, price: m.price, hasPrice: m.hasPrice, hasHook: m.hasHook, limit, out });
    }
  }
  await browser.close();
  return rows;
}

export function report(rows: FoldRow[]): string {
  const bad = rows.filter((r) => r.out.length);
  return [
    "# 히어로 필수 요소 첫 화면 실측 (451차)",
    "",
    `첫 화면 높이 가정: ${Object.entries(FIRST_SCREEN_PX).map(([w, h]) => `${w}폭 → ${h}px`).join(" · ")}. 하단 좌표 = 요소 아래 끝(문서 기준 px).`,
    `측정 ${rows.length}건(합성 21종 × 폭) · 첫 화면 밖 ${bad.length}건`,
    "",
    "| 픽스처 | 폭 | 변형 | 제품명 | 훅 | 가격 | 판정 |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.width} | ${r.variant} | ${r.name ?? "-"} | ${r.hasHook ? r.hook ?? "접힘" : "없음"} | ${r.hasPrice ? r.price : "없음"} | ${r.out.join(", ") || "안"} |`),
    "",
  ].join("\n");
}

if (/hero-fold-check\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  void run().then((rows) => {
    const out = arg("out", "review/451-verify/hero-fold/summary.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, report(rows));
    if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
    console.log(report(rows).split("\n").filter((l) => /첫 화면 밖|\| (?!안).*,|밖/.test(l) || /^측정/.test(l)).join("\n"));
    process.exit(rows.some((r) => r.out.length) ? 1 : 0);
  });
}
