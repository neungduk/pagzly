/**
 * 회귀 — 450차 3 라이브 쌍둥이 잔여. ① 사진 0장 입력(합성 21종 + 퍼징 200개)에서 라이브가 `<img src="">`를 만들지 않는다(React의 "empty string passed to src" 경고 0)
 * ② 문자열 키가 빈 값이 될 수 있는 목록(칩·배지·각주)은 순번을 키에 넣는다(`key={chip}` 같은 단독 문자열 키가 렌더러에 남지 않음 — 전부 빈 입력의 `key=""` 중복 경고 방지).
 */
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import R from "../../components/DetailSectionRenderer";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { corpus, exportArgsOf } from "../design-corpus";
import { fuzzCases } from "../fuzz-sessions";

export const name = "라이브 빈 src·key — 사진 0장 입력에서 빈 src 경고 0·문자열 단독 키 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const warn: string[] = [];
  const orig = console.error;
  const warnOrig = console.warn;
  let cur = "";
  console.error = (...a: unknown[]) => { warn.push(`${cur}: ${String(a[0]).slice(0, 60)}`); };
  console.warn = () => {};
  try {
    const render = (id: string, s: Record<string, unknown>) => {
      cur = id;
      const a = exportArgsOf(s as never) as Record<string, any>;
      renderToStaticMarkup(React.createElement(R as never, { sections: applySectionDisplayBudget(a.category, a.sections ?? [], { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), imageUrls: [], category: a.category, theme: a.theme, productName: a.productName, brandName: a.brandName, stylePackId: a.stylePackId, claimFacts: a.claimFacts } as never));
    };
    for (const [id, f] of corpus()) {
      const s = JSON.parse(fs.readFileSync(f, "utf8"));
      s.imageUrls = []; if (s.generated) s.generated.imageUrls = []; s.imageOrigins = []; s.imageRoles = []; s.visionImageRoles = [];
      try { render(id, s); } catch (e) { fails.push(`${id} 렌더 예외: ${String(e).slice(0, 80)}`); }
    }
    for (const c of fuzzCases(60)) {
      const s = JSON.parse(JSON.stringify(c.session));
      s.imageUrls = []; if (s.generated) s.generated.imageUrls = []; s.imageOrigins = []; s.imageRoles = []; s.visionImageRoles = [];
      try { render(c.id, s); } catch (e) { fails.push(`${c.id} 렌더 예외: ${String(e).slice(0, 80)}`); }
    }
  } finally {
    console.error = orig;
    console.warn = warnOrig;
  }
  const empty = warn.filter((w) => /empty string/i.test(w));
  if (empty.length) fails.push(`빈 src 경고 ${empty.length}건: ${empty.slice(0, 3).join(" / ")}`);
  const src = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  const bare = [...src.matchAll(/key=\{(chip|badge|fn\.number)\}/g)];
  if (bare.length) fails.push(`문자열 단독 키 ${bare.length}곳 남음: ${bare.map((m) => m[0]).join(", ")}`);
  return fails;
}
