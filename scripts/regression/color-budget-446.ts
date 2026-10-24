/**
 * 회귀 — 446차 2 색 응집력(페이지 단위 색 예산). ① 순수 함수(색상군 계산: 중립 제외·30° 창·0° 경계), ② 합성 21종 export DOM: 면 색상군 ≤3(R18)·평균 ≤2.2,
 * ③ 페이지 사이 다양성 유지(포인트 색상 30° 칸이 8칸 이상 서로 다름), ④ v4 슬롯 좁히기(extendThemeFor: 4슬롯이 색상 2군 안, 보조 이동 ≤40°),
 * ⑤ 린트 R18 규칙이 3군 초과에만 걸림. 호출 0·서버 0.
 */
import { MAX_HUE_GROUPS, budgetOf, measureFaces } from "../color-budget";
import { corpus, exportArgsOf, exportHtmlOf, readSession } from "../design-corpus";
import { lintPage } from "../design-lint";
import { extendThemeFor } from "../../lib/palette-harmony";
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";
import { getCategoryTheme } from "../../lib/category-theme";

export const name = "색 응집력 — 면 색상군 ≤3(21종)·평균 ≤2.2·페이지 사이 다양성·슬롯 좁히기·R18";

const rgb = (h: number, s = 70, l = 80) => { const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100), x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l / 100 - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`; };
const hueOf = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const d = mx - mn; return (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; };
const dist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // ① 순수 함수
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };
  eq("중립만(흰·웜 크림·회색)", budgetOf(["rgb(255, 255, 255)", "rgb(246, 241, 234)", "rgb(128, 128, 128)"]).groups, 0);
  eq("같은 계열(10°·25°) 한 군", budgetOf([rgb(200), rgb(210), rgb(225)]).groups, 1);
  eq("두 계열", budgetOf([rgb(10), rgb(200)]).groups, 2);
  eq("0° 경계(350°·10°) 한 군", budgetOf([rgb(350), rgb(10)]).groups, 1);
  eq("네 계열", budgetOf([rgb(0), rgb(90), rgb(180), rgb(270)]).groups, 4);

  // ② 합성 21종
  const entries = corpus().filter(([id]) => id.startsWith("fx-"));
  const m = await measureFaces(entries.map(([id, f]) => [id, exportHtmlOf(f)] as [string, string]));
  let tot = 0;
  const primary = new Set<number>();
  for (const [id, v] of m) {
    const b = budgetOf(v.faces);
    tot += b.groups;
    if (b.groups > MAX_HUE_GROUPS) fails.push(`${id}: 면 색상군 ${b.groups} > ${MAX_HUE_GROUPS} (${b.groupHues.join(", ")}°)`);
    if (b.groupHues[0] !== undefined) primary.add(Math.floor(b.groupHues[0] / 30));
  }
  const avg = tot / Math.max(1, m.size);
  if (m.size < 18) fails.push(`합성 픽스처 ${m.size}개(≥18 기대)`);
  if (avg > 2.2) fails.push(`평균 색상군 ${avg.toFixed(2)} > 2.2`);
  // ③ 페이지 사이 다양성: 포인트(대표색) 색상 30° 칸이 8칸 이상
  const themeBins = new Set(entries.map(([, f]) => Math.floor(hueOf(exportArgsOf(readSession(f)).theme.accent) / 30)));
  if (themeBins.size < 8) fails.push(`대표색 색상 칸 ${themeBins.size} < 8 — 페이지 사이 다양성 부족`);

  // ④ 슬롯 좁히기
  for (const cat of ["화장품/뷰티", "의류/패션", "전자제품", "식품", "생활용품"]) for (let h = 0; h < 360; h += 45) {
    const base = { ...getCategoryTheme(cat), ...buildThemeFromHueWithNeutral(h, STUDIO_NEUTRAL_SAMPLE) };
    const ext = extendThemeFor(base, { category: cat, productName: "p", brandName: "b" }, true);
    const hs = [ext.base, ext.warm, ext.cool, ext.bold].map((t) => hueOf(t.accent));
    const prim = hueOf(ext.base.accent);
    const far = hs.filter((x) => dist(x, prim) > 3);
    // 대표색 외 슬롯은 보조 한 계열(±40° 이내, 슬롯끼리 ±8° 이내)
    if (far.some((x) => dist(x, prim) > 42)) fails.push(`${cat}/${h}: 슬롯 색상이 대표색에서 40° 넘게 벗어남 ${hs.map((x) => Math.round(x)).join(",")}`);
    if (far.length && far.some((x) => dist(x, far[0]!) > 10)) fails.push(`${cat}/${h}: 보조 계열이 한 군이 아님 ${hs.map((x) => Math.round(x)).join(",")}`);
  }

  // ⑤ R18은 3군 초과에만
  const [id0, f0] = entries[0]!;
  const html0 = exportHtmlOf(f0);
  const base = { screens: 10, bigPerScreen: 1, flips: 1 };
  const disp = (await import("../design-corpus")).displayOf(f0).sections;
  const r18 = (g: number) => lintPage(id0, html0, disp, { ...base, colorGroups: g, colorGroupHues: [1, 2, 3, 4] }).issues.filter((i) => i.rule === "R18").length;
  if (r18(3) !== 0 || r18(4) !== 1) fails.push(`R18 경계: 3군 ${r18(3)}건(0 기대), 4군 ${r18(4)}건(1 기대)`);
  return fails;
}
