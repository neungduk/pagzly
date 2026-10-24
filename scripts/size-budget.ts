/**
 * 448차 5 — export HTML 크기 예산. 합성 21종의 바이트·구성(인라인 SVG·반복 style·CSS·data URI)을 재고 예산(일반 150KB·풍부 220KB)과 비교한다.
 *   npx tsx scripts/size-budget.ts [--out=review/448-verify/size-budget.md] [--json=경로]
 *   NEXT_PUBLIC_DESIGN_V4=off npx tsx scripts/size-budget.ts --json=/tmp/size-off.json   (v4 off와 비교: --off=/tmp/size-off.json)
 */
import fs from "node:fs";
import path from "node:path";
import { corpus, exportHtmlOf } from "./design-corpus";

export const BUDGET_KB = { normal: 150, rich: 220 } as const;
export const isRich = (id: string): boolean => /rich|compare/.test(id);

export type SizeRow = { id: string; bytes: number; svg: number; css: number; styleAttr: number; repeated: number; dataUri: number; topRepeats: Array<{ n: number; len: number; s: string }> };

export function measureHtml(id: string, html: string): SizeRow {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((s, m) => s + Buffer.byteLength(m[1]!, "utf8"), 0);
  const svg = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].reduce((s, m) => s + Buffer.byteLength(m[0], "utf8"), 0);
  const styles = [...html.matchAll(/\sstyle="([^"]*)"/g)].map((m) => m[1]!);
  const styleAttr = styles.reduce((s, x) => s + Buffer.byteLength(x, "utf8") + 9, 0);
  const counts = new Map<string, number>();
  for (const s of styles) counts.set(s, (counts.get(s) ?? 0) + 1);
  const reps = [...counts].filter(([s, n]) => n > 1 && s.length > 40).map(([s, n]) => ({ n, len: s.length, s: s.slice(0, 90) }));
  const repeated = reps.reduce((sum, r) => sum + (r.n - 1) * (r.len + 9), 0);
  const dataUri = [...html.matchAll(/data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g)].reduce((s, m) => s + m[0].length, 0);
  return { id, bytes: Buffer.byteLength(html, "utf8"), svg, css, styleAttr, repeated, dataUri, topRepeats: reps.sort((a, b) => (b.n - 1) * b.len - (a.n - 1) * a.len).slice(0, 3) };
}

export function measureCorpus(): SizeRow[] {
  return corpus().filter(([id]) => id.startsWith("fx-")).map(([id, f]) => measureHtml(id, exportHtmlOf(f)));
}

const kb = (n: number) => (n / 1024).toFixed(1);

if (/size-budget\.ts$/.test(process.argv[1] ?? "")) {
  const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const rows = measureCorpus();
  if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(rows));
  const off: SizeRow[] | null = arg("off", "") ? (JSON.parse(fs.readFileSync(arg("off", ""), "utf8")) as SizeRow[]) : null;
  const lines = ["# export HTML 크기 예산 (448차)", "", `예산: 일반 ${BUDGET_KB.normal}KB · 풍부 입력(rich·compare) ${BUDGET_KB.rich}KB. 크기는 UTF-8 바이트.`, "", `| 세션 | 크기(KB) | 예산 | 인라인 SVG | CSS | style 속성 | 반복 style 낭비 | ${off ? "v4 off(KB) | v4 가 더한 KB |" : ""}`.replace(/\|\s*$/, "|"), `|---|---|---|---|---|---|---|${off ? "---|---|" : ""}`];
  for (const r of rows) {
    const b = isRich(r.id) ? BUDGET_KB.rich : BUDGET_KB.normal;
    const o = off?.find((x) => x.id === r.id);
    lines.push(`| ${r.id} | ${kb(r.bytes)} | ${r.bytes / 1024 <= b ? "✓" : "**초과**"} (${b}) | ${kb(r.svg)} | ${kb(r.css)} | ${kb(r.styleAttr)} | ${kb(r.repeated)} |${o ? ` ${kb(o.bytes)} | ${kb(r.bytes - o.bytes)} |` : ""}`);
  }
  const tot = rows.reduce((s, r) => s + r.bytes, 0);
  lines.push(`| **평균** | ${kb(tot / rows.length)} | | ${kb(rows.reduce((s, r) => s + r.svg, 0) / rows.length)} | ${kb(rows.reduce((s, r) => s + r.css, 0) / rows.length)} | ${kb(rows.reduce((s, r) => s + r.styleAttr, 0) / rows.length)} | ${kb(rows.reduce((s, r) => s + r.repeated, 0) / rows.length)} |${off ? ` ${kb(off.reduce((s, r) => s + r.bytes, 0) / off.length)} | ${kb((tot - off.reduce((s, r) => s + r.bytes, 0)) / rows.length)} |` : ""}`);
  lines.push("", "## 반복되는 style 문자열 상위(첫 세션 3개)");
  for (const t of rows[0]!.topRepeats) lines.push(`- ×${t.n} (${t.len}자) \`${t.s}…\``);
  const out = arg("out", "review/448-verify/size-budget.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  process.exit(rows.some((r) => r.bytes / 1024 > (isRich(r.id) ? BUDGET_KB.rich : BUDGET_KB.normal)) ? 1 : 0);
}
