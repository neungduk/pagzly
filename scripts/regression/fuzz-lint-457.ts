/**
 * 회귀 — 457차 2. 퍼징 200개(시드 448) export의 린트 error가 제외 목록(제품명 공백 사례의 R10 «히어로 제품명 없음»)을 뺀 뒤 0이다. 브라우저 없이 린트만(렌더 검사는 fuzz-check).
 * 제외 근거: 앱 화면이 제품명 공백을 막는다(scripts/fuzz-check.ts isBlankNameCase 주석).
 */
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { applyDisplayRules } from "../../lib/display-sections";
import { applySectionDisplayBudget } from "../../lib/section-display-budget";
import { comparisonPolicyRemovesChart } from "../../lib/comparison-policy";
import { exportArgsOf } from "../design-corpus";
import { lintPage } from "../design-lint";
import { fuzzCases } from "../fuzz-sessions";
import { isBlankNameCase } from "../fuzz-check";

export const name = "퍼징 200개 린트 error 0 — 제품명 공백 R10만 제외(앱이 막는 입력)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  let excluded = 0;
  for (const c of fuzzCases(200)) {
    try {
      const a = exportArgsOf(c.session);
      const html = buildDetailPageHtml(a);
      const display = applyDisplayRules(applySectionDisplayBudget(a.category, a.sections, { chartRemoved: comparisonPolicyRemovesChart(a.claimFacts) }), a.imageUrls, { imageHashByUrl: a.imageHashByUrl, roles: a.imageRoles, origins: a.imageOrigins, category: a.category, tags: a.imageTags, hasSizeInfo: a.hasSizeInfo, claimFacts: a.claimFacts, brandName: a.brandName });
      const lint = lintPage(c.id, html, display.sections ?? (display as never));
      for (const i of lint.issues.filter((x) => x.sev === "error")) {
        if (isBlankNameCase(c) && i.rule === "R10") { excluded += 1; continue; }
        fails.push(`${c.id} ${i.rule} ${i.msg}`);
      }
    } catch (e) { fails.push(`${c.id} 예외 ${String(e).slice(0, 60)}`); }
  }
  if (excluded === 0) fails.push("제외 목록이 비어 있음 — 제품명 공백 사례 재현 실패(회귀 전제 깨짐)");
  return fails.slice(0, 10);
}
