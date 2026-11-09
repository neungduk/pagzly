/**
 * 501 — 규칙 JSON 검증 CLI.
 *   npm run validate:rules
 *   LABEL_RULES_DATA_DIR=임시경로 npm run validate:rules
 */
import path from "node:path";
import { validateLabelRulesAt } from "./validate-label-rules-lib";

const root = process.env.LABEL_RULES_DATA_DIR
  ? path.resolve(process.env.LABEL_RULES_DATA_DIR)
  : path.join(process.cwd(), "review", "data");

const issues = validateLabelRulesAt(root);
for (const i of issues) {
  console.log(`${i.level === "error" ? "ERROR" : "WARN "}  ${i.msg}`);
}
const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");
console.log(`\n검증 결과: 오류 ${errors.length}, 경고 ${warns.length}`);
process.exit(errors.length ? 1 : 0);
