/**
 * 454차 3 — 섹션 패리티 표. 입력마다 "계획 · 라이브 · export 최상위 · export 내부 중첩" 4개 숫자를 뽑아 표로 남기고,
 * 셋(계획·라이브·export 최상위)이 다르면 어느 섹션이 어느 쪽에만 있는지 순서·종류로 지목한다. 무료(브라우저·호출 없음).
 *   npx tsx scripts/section-parity-table.ts [--out=review/454-verify/section-parity.md] [--only=id,id]
 * 저장 세션은 findSessions()가 찾은 것(review/*-live/**, review/pexels-*), 없으면 합성 픽스처만. 불일치가 있으면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { exportSectionCounts, parityOk } from "./section-parity";

export type ParityRow = { id: string; plan: number; live: number; top: number; nested: number; splits: number; splitAt: string[]; ok: boolean; detail: string };

/** 라이브 렌더에서 data-section-index 번호와 슬롯 */
export async function liveSections(file: string): Promise<Array<{ index: number; slot: string }>> {
  const { exportArgsOf, readSession } = await import("./design-corpus");
  const { default: R } = await import("../components/DetailSectionRenderer");
  const { applySectionDisplayBudget } = await import("../lib/section-display-budget");
  const { comparisonPolicyRemovesChart } = await import("../lib/comparison-policy");
  const a = exportArgsOf(readSession(file));
  const live = renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: a.imageUrls ?? [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, logoUrl: a.logoUrl, ingredients: a.ingredients, keyFeatures: a.keyFeatures, certifications: a.certifications, stylePackId: a.stylePackId, infoBackdrops: a.infoBackdrops, imageHashByUrl: a.imageHashByUrl, imageOrigins: a.imageOrigins, imageRoles: a.imageRoles, imageTags: a.imageTags, sceneImages: a.sceneImages, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts } as never));
  const all = [...live.matchAll(/data-section-index="(\d+)"(?:[^>]*?data-section-slot="([^"]*)")?/g)].map((m) => ({ index: Number(m[1]), slot: m[2] ?? "" }));
  // 같은 번호가 두 요소에 붙는 섹션이 있다(비교표·일부 impact) — 섹션은 번호 기준으로 센다
  return all.filter((x, i) => all.findIndex((y) => y.index === x.index) === i);
}

/**
 * 계획의 섹션 하나가 export에서 최상위 `<section>` 둘 이상으로 나뉘는 경우(라이브는 번호 하나). 단독 렌더로 센다.
 * impact 섹션은 앞뒤 맥락에 따라 단독이면 아예 안 그려져(0개) 제외하고, 그 밖의 종류만 본다. 454차 확인: stat_infographic이 지표 3개일 때 2개로 나뉜다.
 */
export async function exportSplits(file: string, planSections: unknown[]): Promise<{ extra: number; at: string[] }> {
  const { exportArgsOf, readSession } = await import("./design-corpus");
  const { buildDetailPageHtml } = await import("../lib/export-detail-html");
  const a = exportArgsOf(readSession(file));
  // 섹션 없이 뽑아도 나오는 최상위 섹션(고정 꼬리 등)은 빼고 센다
  const base = exportSectionCounts(buildDetailPageHtml({ ...a, sections: [] })).top.length;
  let extra = 0;
  const at: string[] = [];
  for (let i = 0; i < planSections.length; i += 1) {
    const sec = planSections[i] as { type?: string };
    if (!sec.type || sec.type === "impact") continue;
    const n = exportSectionCounts(buildDetailPageHtml({ ...a, sections: [sec as never] })).top.length - base;
    if (n > 1) { extra += n - 1; at.push(`${i}:${sec.type}(export ${n}개·라이브 1개)`); }
  }
  return { extra, at };
}

/** 한 입력의 패리티 행. html은 주입 가능(변조 입력 음성 테스트용) */
export async function parityRow(id: string, file: string, htmlOverride?: string): Promise<ParityRow> {
  const { exportHtmlOf, displayOf } = await import("./design-corpus");
  const html = htmlOverride ?? exportHtmlOf(file);
  const planSections = displayOf(file).sections;
  const live = await liveSections(file);
  const ex = exportSectionCounts(html);
  const sp = await exportSplits(file, planSections);
  const splits = sp.extra;
  const ok = parityOk(planSections.length, live.length, ex.top.length, splits);
  let detail = "";
  if (!ok) {
    const types = planSections.map((s, i) => `${i}:${(s as { type?: string }).type ?? "?"}`);
    const tops = ex.top.map((t) => `${t.index}:${t.kind}`);
    detail = `계획 ${types.join(" ")}\n  라이브 인덱스 ${live.map((l) => l.index).join(",")}\n  export ${tops.join(" | ")}`;
    // 개수가 같지 않은 쪽에서 어디부터 어긋나는지 힌트
    const n = Math.min(planSections.length, ex.top.length);
    detail += `\n  → 계획 ${planSections.length} / 라이브 ${live.length} / export 최상위 ${ex.top.length}(export 분리 ${splits}): ${planSections.length > ex.top.length ? `export에만 없음 — 계획의 뒤쪽 ${planSections.length - n}개 중 하나` : planSections.length < ex.top.length ? `export에만 있음 — 계획 밖 최상위 ${ex.top.length - n}개` : "개수는 같으나 라이브와 다름"}`;
  }
  return { id, plan: planSections.length, live: live.length, top: ex.top.length, nested: ex.nested, splits, splitAt: sp.at, ok, detail };
}

export function tableMd(rows: ParityRow[]): string {
  const head = ["| 입력 | 계획 | 라이브 | export 최상위 | export 내부 중첩 | export 분리(섹션 1→2) | 판정 |", "|---|---|---|---|---|---|---|"];
  const body = rows.map((r) => `| ${r.id} | ${r.plan} | ${r.live} | ${r.top} | ${r.nested} | ${r.splits}${r.splitAt.length ? ` — ${r.splitAt.join(", ")}` : ""} | ${r.ok ? "일치" : "**불일치**"} |`);
  const bad = rows.filter((r) => !r.ok);
  return [...head, ...body, "", bad.length ? `## 불일치\n${bad.map((r) => `- ${r.id}\n  ${r.detail}`).join("\n")}` : "불일치 없음.", ""].join("\n");
}

async function main() {
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const out = arg("out") ?? "review/454-verify/section-parity.md";
  const only = (arg("only") ?? "").split(",").filter(Boolean);
  const { corpus } = await import("./design-corpus");
  const { findSessions } = await import("./pc-sessions-find");
  const seen = new Set<string>();
  const items: Array<[string, string]> = [];
  for (const [id, f] of [...corpus(), ...findSessions()]) if (!seen.has(path.normalize(f)) && (!only.length || only.includes(id))) { seen.add(path.normalize(f)); items.push([id, f]); }
  const rows: ParityRow[] = [];
  for (const [id, f] of items) rows.push(await parityRow(id, f));
  const md = `# 섹션 패리티 표 (454차)\n\n판정: 계획 = 라이브, 그리고 export 최상위 = 계획(또는 한 섹션이 둘로 나뉘는 'export 분리'로 차이가 정확히 설명될 때)(\`.pagzly-wrap\` 직계 \`<section>\`). export 내부 중첩은 검색용 평문 등 안쪽 \`<section>\`이라 판정에서 제외하고 참고로만 센다.\n\n${tableMd(rows)}`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(md);
  process.exit(rows.some((r) => !r.ok) ? 1 : 0);
}

if (process.argv[1] && /section-parity-table/.test(process.argv[1])) void main();
