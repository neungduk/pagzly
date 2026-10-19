/**
 * 회귀 — 407차 "AI 비용" 띠 노출: NEXT_PUBLIC_SHOW_COST_STRIP === "true"일 때만 결과 화면에 그린다(기본 숨김).
 * 띠 컴포넌트 자체는 켠 상태에서 오류 없이 그려지는지 서버 렌더로 확인한다. 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationCostStrip from "../../components/GenerationCostStrip";
import { isCostStripVisible } from "../../lib/cost/cost-strip-visibility";

export const name = "AI 비용 띠 노출 플래그(기본 숨김)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const cases: Array<[string | undefined, boolean]> = [[undefined, false], ["", false], ["false", false], ["1", false], ["TRUE", false], ["true", true]];
  for (const [v, want] of cases) if (isCostStripVisible(v) !== want) fails.push(`플래그 ${JSON.stringify(v)} → ${!want} (기대 ${want})`);
  // 켠 상태: 띠가 오류 없이 그려지고 기존 내용(합계·단계별)이 나온다
  const html = renderToStaticMarkup(
    createElement(GenerationCostStrip, {
      photoCostBreakdown: { backdrop: 0.16, enhance: 0.03, claude: 0.14 },
      photoProcessingCost: 0.19,
      generationCost: 0.34,
    }),
  );
  if (!html.includes('data-testid="generation-cost-strip"') || !html.includes("$0.3400")) fails.push("켠 상태에서 띠가 그려지지 않음");
  // 결과 화면은 플래그로 감싸서만 그린다(직접 참조라 빌드 때 인라인된다)
  const page = fs.readFileSync(path.join(__dirname, "..", "..", "app", "create", "result", "page.tsx"), "utf8");
  const at = page.indexOf("<GenerationCostStrip");
  if (at < 0 || !page.slice(Math.max(0, at - 120), at).includes("SHOW_COST_STRIP &&")) fails.push("결과 화면이 SHOW_COST_STRIP로 띠를 감싸지 않음");
  if ((page.match(/<GenerationCostStrip/g) ?? []).length !== 1) fails.push("결과 화면의 띠 렌더가 한 곳이 아님");
  const flag = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "cost", "cost-strip-visibility.ts"), "utf8");
  if (!flag.includes("process.env.NEXT_PUBLIC_SHOW_COST_STRIP")) fails.push("플래그를 직접 참조하지 않음(인라인 안 됨)");
  return fails;
}
