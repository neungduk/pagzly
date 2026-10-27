/**
 * 446차 2 — 페이지 색 예산 측정. export를 390폭에 열어 최상위 구간의 면(배경) 색을 모으고 색상군(색상 30° 창 안을 한 군으로)·채도 상위 면 수를 센다.
 * 중립(chroma < 0.055 또는 거의 흰색/검정)은 세지 않는다. design-lint R18과 회귀가 같은 함수를 쓴다.
 *   npx tsx scripts/color-budget.ts [--out=review/446-verify/color-budget.md] [id...]
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("color-budget", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import { corpus, exportHtmlOf } from "./design-corpus";
import { launch, openHtml } from "./eye-lib";
import { EXTRACT, type Info } from "./live-vs-export";

export const HUE_GROUP_DEG = 30;
export const MAX_HUE_GROUPS = 3;

/** 색 거리(채도 대신 chroma): 거의 흰/웜 중립(#F6F1EA 등)은 HSL 채도가 부풀려 보이므로 max-min이 0.055 미만이면 중립 */
export const NEUTRAL_CHROMA = 0.055;
export function chromaOf(css: string): number {
  const m = css.match(/[\d.]+/g);
  if (!m || m.length < 3) return 0;
  const v = m.slice(0, 3).map((x) => Number(x) / 255);
  return Math.max(...v) - Math.min(...v);
}
export function hslOf(css: string): { h: number; s: number; l: number } | null {
  const m = css.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => Number(v) / 255) as [number, number, number];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
/** 면 색 목록 → 색상군 수·채도 상위 면 수. 중립: chroma 0.055 미만 */
export function budgetOf(faces: string[]): { groups: number; groupHues: number[]; strong: number; chromatic: number } {
  const hs = faces.filter((f) => chromaOf(f) >= NEUTRAL_CHROMA).map(hslOf).filter((x): x is { h: number; s: number; l: number } => !!x && x.l > 0.04 && x.l < 0.98);
  // 색상군: 가장 큰 빈틈 다음부터 훑으며 30° 안에 드는 색상을 한 군으로(대표색 계열·보조 계열이 각각 한 군)
  const sorted = hs.map((x) => x.h).sort((a, b) => a - b);
  let start = 0;
  if (sorted.length > 1) {
    let best = -1;
    for (let k = 0; k < sorted.length; k++) { const gap = (sorted[(k + 1) % sorted.length]! - sorted[k]! + 360) % 360; if (gap > best) { best = gap; start = (k + 1) % sorted.length; } }
  }
  const rotated = sorted.map((_, k) => sorted[(start + k) % sorted.length]!);
  const merged: number[] = [];
  let anchor = -1;
  for (const h of rotated) {
    if (anchor < 0 || (h - anchor + 360) % 360 > HUE_GROUP_DEG) { merged.push(Math.round(h)); anchor = h; }
  }
  return { groups: merged.length, groupHues: merged.map((c) => Math.round(c)), strong: hs.filter((x) => x.s >= 0.4 && x.l < 0.85).length, chromatic: hs.length };
}

export async function measureFaces(pages: Array<[string, string]>): Promise<Map<string, { faces: string[]; sections: number }>> {
  const b = await launch();
  const out = new Map<string, { faces: string[]; sections: number }>();
  for (const [id, html] of pages) {
    const ex = await openHtml(b, html, 390);
    await ex.page.addStyleTag({ content: ".pagzly-anchor-nav{display:none!important}" });
    const rows = (await ex.page.evaluate(EXTRACT)) as Info[];
    out.set(id, { faces: rows.filter((r) => r.bg !== "photo" && r.height > 40).map((r) => r.bg), sections: rows.length });
    await ex.close();
  }
  await b.close();
  return out;
}

if (process.argv[1] && /color-budget/.test(process.argv[1])) {
  void (async () => {
    const outPath = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
    const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
    const m = await measureFaces(corpus({ only }).map(([id, f]) => [id, exportHtmlOf(f)] as [string, string]));
    const rows = ["| 픽스처 | 구간 | 색 면 | 색상군 수 | 군 중심(°) | 채도 상위 면 |", "|---|---|---|---|---|---|"];
    let tot = 0, over = 0;
    for (const [id, v] of m) {
      const b = budgetOf(v.faces);
      tot += b.groups; if (b.groups > MAX_HUE_GROUPS) over += 1;
      rows.push(`| ${id.replace(/^fx-/, "")} | ${v.sections} | ${b.chromatic} | ${b.groups} | ${b.groupHues.join(", ")} | ${b.strong} |`);
    }
    rows.push("", `평균 색상군 ${(tot / m.size).toFixed(2)}, ${MAX_HUE_GROUPS}군 초과 ${over}/${m.size}`);
    console.log(rows.join("\n"));
    if (outPath) fs.writeFileSync(outPath, rows.join("\n") + "\n");
  })();
}
