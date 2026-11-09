/**
 * 501 — 규칙 검증을 회귀 스위트에 포함.
 */
import path from "node:path";
import { validateLabelRulesAt } from "../validate-label-rules-lib";

export const name = "표시사항 501 — 규칙 JSON 검증";

export async function run(): Promise<string[]> {
  const issues = validateLabelRulesAt(path.join(process.cwd(), "review", "data"));
  return issues.filter((i) => i.level === "error").map((i) => `501-validate: ${i.msg}`);
}
