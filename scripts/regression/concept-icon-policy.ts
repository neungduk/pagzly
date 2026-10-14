/**
 * 회귀 — 개념 아이콘 생성 건너뛰기(403차). 평면 표면(FLAT_SECTION_SURFACES=true)에서는 생성하지 않고,
 * 설정을 되돌리면 다시 생성한다. 생성 경로(route.ts)가 이 판단 함수를 쓰는지도 본다. 유료 호출 0.
 */
import fs from "node:fs";
import path from "node:path";
import { shouldGenerateConceptIcons } from "../../lib/concept-icon-policy";
import { FLAT_SECTION_SURFACES } from "../../lib/design-tokens";

export const name = "개념 아이콘 생성 건너뛰기(평면 표면)";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  if (shouldGenerateConceptIcons({ hasConceptBrief: true, flatSurfaces: true })) fails.push("평면 표면인데 생성한다고 판단");
  if (!shouldGenerateConceptIcons({ hasConceptBrief: true, flatSurfaces: false })) fails.push("평면 표면이 아닌데 생성하지 않는다고 판단(되돌리기 불가)");
  if (shouldGenerateConceptIcons({ hasConceptBrief: false, flatSurfaces: false })) fails.push("conceptBrief 없이 생성한다고 판단");
  if (FLAT_SECTION_SURFACES && shouldGenerateConceptIcons({ hasConceptBrief: true })) fails.push("지금 설정(FLAT=true)에서 기본 판단이 생성으로 나옴");
  const route = fs.readFileSync(path.join(__dirname, "..", "..", "app", "api", "generate", "route.ts"), "utf8");
  const gate = route.indexOf("shouldGenerateConceptIcons(");
  const call = route.indexOf("await generateConceptIcons(");
  if (gate < 0) fails.push("route.ts가 shouldGenerateConceptIcons를 부르지 않음");
  else if (call < 0 || gate > call) fails.push("route.ts에서 판단이 generateConceptIcons 호출보다 앞에 있지 않음");
  return fails;
}
