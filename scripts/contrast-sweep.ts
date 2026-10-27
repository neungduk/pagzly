/**
 * 446차 1 — 대표색 색상환 전수: 색상 H × 채도·명도 3단(하·중·상)으로 theme을 실제 파생 함수(buildThemeFromHueWithNeutral)로 만들고
 * 합성 픽스처를 export로 그려 린트 R7(대비)을 센다. 회귀와 보고서가 같은 함수를 쓴다.
 *   npx tsx scripts/contrast-sweep.ts [--hues=0,15,...] [--fixtures=id,id]
 */
import { assertHeavyEntry } from "./lib/heavy-guard";
assertHeavyEntry("contrast-sweep", typeof module !== "undefined" ? require.main === module : true);
import fs from "node:fs";
import { STUDIO_NEUTRAL_SAMPLE, buildThemeFromHueWithNeutral } from "../lib/color-extract";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { corpus, displayOf, exportArgsOf, readSession } from "./design-corpus";
import { lintPage } from "./design-lint";

export type Tone = { id: "low" | "mid" | "high"; sMul: number; dl: number };
export const TONES: Tone[] = [{ id: "low", sMul: 0.7, dl: -0.06 }, { id: "mid", sMul: 1, dl: 0 }, { id: "high", sMul: 1.25, dl: 0.08 }];
export const HUES = Array.from({ length: 24 }, (_, i) => i * 15);

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}
const retone = (hex: string, t: Tone) => { const [h, s, l] = toHsl(hex); return fromHsl(h, Math.max(0, Math.min(1, s * t.sMul)), Math.max(0.08, Math.min(0.95, l + t.dl))); };

/** 실제 파생 함수로 만든 theme을 채도·명도 단계만큼 다시 칠한다(팩 톤과 같은 종류의 변주) */
export function synthTheme(hue: number, tone: Tone) {
  const base = buildThemeFromHueWithNeutral(hue, STUDIO_NEUTRAL_SAMPLE);
  if (tone.id === "mid") return base;
  const accent = retone(base.accent, tone);
  return { ...base, accent, accentText: retone(base.accentText, tone), deepAccent: retone(base.deepAccent, tone), accentSoft: retone(base.accentSoft, { ...tone, sMul: 1, dl: tone.dl / 2 }), heroScrimFrom: base.heroScrimFrom };
}

export type Violation = { hue: number; tone: string; fixture: string; msg: string };

/** R7 위반 전수. fixtures가 비면 입력이 풍부한 합성 3종(가격·후기·단계·수치 포함) */
export function sweep(fixtures: string[] = ["fx-compare-beauty", "fx-tier-rich-fashion-6p", "fx-food-snack"], hues = HUES, tones = TONES): Violation[] {
  const out: Violation[] = [];
  for (const [id, file] of corpus({ only: fixtures })) {
    const s = readSession(file);
    const a = exportArgsOf(s);
    const display = displayOf(file).sections;
    for (const hue of hues) for (const tone of tones) {
      const theme = { ...a.theme, ...synthTheme(hue, tone) };
      const html = buildDetailPageHtml({ ...a, theme });
      const r = lintPage(id, html, display);
      for (const i of r.issues) if (i.rule === "R7") out.push({ hue, tone: tone.id, fixture: id, msg: i.msg });
    }
  }
  return out;
}

if (process.argv[1] && /contrast-sweep/.test(process.argv[1])) {
  const arg = (k: string) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const hues = arg("hues")?.split(",").map(Number) ?? HUES;
  const fx = arg("fixtures")?.split(",");
  const v = sweep(fx, hues);
  const byHue = new Map<number, number>();
  for (const x of v) byHue.set(x.hue, (byHue.get(x.hue) ?? 0) + 1);
  console.log(`R7 위반 ${v.length}건 / 색상 ${[...byHue].map(([h, n]) => `${h}°:${n}`).join(" ") || "-"}`);
  const kinds = new Map<string, number>();
  for (const x of v) { const k = x.msg.replace(/#[0-9A-Fa-f]{6}\/#[0-9A-Fa-f]{6}/g, "#fg/#bg").replace(/대비 [\d.]+/, "대비 N"); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
  for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${String(n).padStart(4)}  ${k}`);
  if (arg("out")) fs.writeFileSync(arg("out")!, JSON.stringify(v));
}
