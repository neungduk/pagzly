/**
 * 회귀 — 408차 표 10행 상한이 사이즈 행(S·M·L·XL·2XL)을 자르지 않는다. 유료 호출 0.
 * 404차 XL 누락의 유력 원인: 패션 뼈대 7행 + 사이즈 행이 slice(0, 10)에 걸렸다.
 */
import { enrichSpecTableSection } from "../../lib/enrich-product-sections";
import type { DetailSection } from "../../lib/types/generate";

export const name = "표 행 상한이 사이즈 행을 자르지 않음";

const table = (slot: string, labels: string[]) =>
  ({
    type: "spec_table",
    slot,
    heading: "사이즈 실측표",
    rows: labels.map((l) => ({ label: l, value: `총장 70 · 가슴 5${l.length} cm` })),
  }) as unknown as DetailSection & { type: "spec_table" };
const rowsOf = (s: DetailSection & { type: "spec_table" }, category: string) =>
  (enrichSpecTableSection(s, category, { brandName: "b" }) as { rows: { label: string }[] }).rows.map((r) => r.label);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const sizes = ["S", "M", "L", "XL", "2XL"];
  const out = rowsOf(table("size_table", sizes), "의류/패션");
  for (const s of sizes) if (!out.includes(s)) fails.push(`패션 size_table에서 ${s} 행이 잘림 (결과: ${out.join(",")})`);
  // 패션 외: 상한 10 그대로(뼈대 + 추가 행 합 10을 넘지 않음)
  const many = Array.from({ length: 8 }, (_, i) => `추가${i + 1}`);
  for (const c of ["화장품/뷰티", "전자제품", "식품/건강기능식품", "생활/리빙", "반려동물"]) {
    const n = rowsOf(table("spec_table", many), c).length;
    if (n > 10) fails.push(`${c} 표가 10행을 넘음: ${n}`);
  }
  // 패션이라도 사이즈가 아닌 추가 행은 10행 상한
  const nonSize = rowsOf(table("spec_table", many), "의류/패션").length;
  if (nonSize > 10) fails.push(`패션 비사이즈 추가 행이 10행을 넘음: ${nonSize}`);
  return fails;
}
