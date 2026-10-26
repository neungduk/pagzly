/**
 * 456차 2 — 사진 실패 모드 퍼징(무료: 외부 호출 없음). 합성 픽스처 + 퍼징 시드 사례를 사진 전부 실패 / 일부 실패 / 사진 0장으로 export 렌더해
 * 320·360·390·750폭에서 빈 틀·보이는 대체 글자·가로 넘침·린트 error·예외를 센다. 455차 broken-photo-eye의 측정 코드(MEASURE)를 그대로 쓴다.
 *   npx tsx scripts/fuzz-photo-fail.ts [--n=60] [--widths=320,360,390,750] [--modes=all,half,none] [--out=review/456-verify/fuzz-photo-fail.md] [--no-fx]
 * 사진 전부 실패는 R7처럼 사진이 있어야 성립하는 규칙이 생략되지 않도록 사진 0장 모드와 따로 센다.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDetailPageHtml } from "../lib/export-detail-html";
import { applyDisplayRules } from "../lib/display-sections";
import { applySectionDisplayBudget } from "../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../lib/comparison-policy";
import { exportArgsOf } from "./design-corpus";
import { lintPage } from "./design-lint";
import { launch, openHtml } from "./eye-lib";
import { fuzzCases, baseFixtures, type Session } from "./fuzz-sessions";
import { MEASURE } from "./broken-photo-eye";

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
type Mode = "all" | "half" | "none";
export type PhotoViolation = { mode: Mode; id: string; W: number; kind: string; detail: string };

export async function run(opts: { n: number; widths: number[]; modes: Mode[]; fx: boolean }): Promise<{ total: number; violations: PhotoViolation[] }> {
  const cases: Array<{ id: string; session: Session }> = [];
  if (opts.fx) for (const [id, file] of baseFixtures()) cases.push({ id, session: JSON.parse(fs.readFileSync(file, "utf8")) });
  for (const c of fuzzCases(opts.n)) cases.push({ id: c.id, session: c.session });
  const browser = await launch();
  const violations: PhotoViolation[] = [];
  let total = 0;
  for (const mode of opts.modes) {
    for (const c of cases) {
      const add = (W: number, kind: string, detail: string) => violations.push({ mode, id: c.id, W, kind, detail });
      let html = "";
      try {
        const s: Session = mode === "none" ? { ...c.session, imageUrls: [] } : c.session;
        const args = exportArgsOf(s);
        html = buildDetailPageHtml(args);
        const display = applyDisplayRules(applySectionDisplayBudget(args.category, args.sections, { chartRemoved: comparisonPolicyRemovesChart(args.claimFacts) }), args.imageUrls, { imageHashByUrl: args.imageHashByUrl, roles: args.imageRoles, origins: args.imageOrigins, category: args.category, tags: args.imageTags, hasSizeInfo: args.hasSizeInfo, claimFacts: args.claimFacts, brandName: args.brandName });
        const lint = lintPage(c.id, html, display.sections ?? (display as never));
        for (const i of lint.issues.filter((x) => x.sev === "error")) add(0, "린트 error", `${i.rule} ${i.msg}`.slice(0, 120));
      } catch (e) {
        add(0, "예외", e instanceof Error ? e.message.slice(0, 100) : String(e));
        continue;
      }
      for (const W of opts.widths) {
        total += 1;
        try {
          const ex = await openHtml(browser, html, W, undefined, false, mode === "all" ? true : mode === "half" ? "half" : false);
          const m = (await ex.page.evaluate(MEASURE)) as { visibleAlt: string[]; holes: string[]; overflow: number };
          await ex.close();
          for (const a of m.visibleAlt) add(W, "보이는 대체 글자", a);
          for (const h of m.holes) add(W, "빈 틀·붕괴", h.slice(0, 140));
          if (m.overflow > 0) add(W, "가로 넘침", `+${m.overflow}`);
        } catch (e) {
          add(W, "예외", `브라우저 ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
        }
      }
    }
  }
  await browser.close();
  return { total, violations };
}

export function report(total: number, vs: PhotoViolation[], modes: Mode[], widths: number[]): string {
  const kinds = ["빈 틀·붕괴", "보이는 대체 글자", "가로 넘침", "린트 error", "예외"];
  const L = ["# 사진 실패 퍼징 (456차)", "", `렌더 ${total}조합(폭 ${widths.join("·")}) · 위반 ${vs.length}건 · 위반 사례 ${new Set(vs.map((v) => v.id)).size}개`, "", `| 모드 | ${kinds.join(" | ")} |`, `|---|${kinds.map(() => "---").join("|")}|`];
  for (const m of modes) L.push(`| ${m === "all" ? "전부 실패" : m === "half" ? "일부 실패" : "사진 0장"} | ${kinds.map((k) => vs.filter((v) => v.mode === m && v.kind === k).length).join(" | ")} |`);
  L.push("", "## 종류별 대표 재현(모드마다 최대 3개)");
  for (const m of modes) for (const k of kinds) {
    const xs = vs.filter((v) => v.mode === m && v.kind === k);
    if (!xs.length) continue;
    L.push(`### ${m} · ${k}`);
    for (const x of xs.slice(0, 3)) L.push(`- \`${x.id}\` ${x.W ? x.W + "px " : ""}${x.detail}`);
  }
  return L.join("\n") + "\n";
}

if (/fuzz-photo-fail\.ts$/.test((process.argv[1] ?? "").replace(/\\/g, "/"))) {
  const widths = arg("widths", "320,360,390,750").split(",").map(Number);
  const modes = arg("modes", "all,half,none").split(",") as Mode[];
  const out = arg("out", "review/456-verify/fuzz-photo-fail.md");
  void run({ n: Number(arg("n", "60")), widths, modes, fx: !process.argv.includes("--no-fx") }).then(({ total, violations }) => {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const md = report(total, violations, modes, widths);
    fs.writeFileSync(out, md);
    console.log(md.split("\n").slice(0, 14).join("\n"));
    process.exit(violations.length ? 1 : 0);
  });
}
