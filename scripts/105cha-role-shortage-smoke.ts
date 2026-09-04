/**
 * 105차 — detectRoleShortages 단위 스모크 ($0)
 *
 *   npx tsx scripts/105cha-role-shortage-smoke.ts
 */
import { detectRoleShortages } from "../lib/role-shortage";
import type { ProductImageRole } from "../lib/image-roles";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const bottlesOnly: ProductImageRole[] = [
  "hero",
  "detail",
  "other",
  "other",
  "other",
  "other",
  "other",
  "other",
  "other",
];
const w1 = detectRoleShortages({ roles: bottlesOnly, category: "화장품/뷰티" });
assert(w1 !== null, "bottles-only should warn");
assert(w1!.missingRoles.includes("package"), "missing package");
assert(w1!.preferTextOnlySlots.includes("ingredient_highlight"), "text ingredient");
assert(w1!.preferTextOnlySlots.includes("texture_feel"), "text texture");
console.log("bottles-only:", w1!.message);

const mixed: ProductImageRole[] = [
  "hero",
  "detail",
  "detail",
  "package",
  "package",
  "lifestyle",
  "other",
  "other",
  "other",
];
const w2 = detectRoleShortages({ roles: mixed, category: "화장품/뷰티" });
assert(w2 === null, `mixed should be null, got ${JSON.stringify(w2)}`);
console.log("mixed: (none)");

const oneDetail: ProductImageRole[] = [
  "hero",
  "detail",
  "package",
  "other",
  "other",
  "other",
  "other",
  "other",
  "other",
];
const w3 = detectRoleShortages({ roles: oneDetail, category: "화장품/뷰티" });
assert(w3 !== null, "one detail should soft-warn");
assert(w3!.preferTextOnlySlots.includes("texture_feel"), "texture text-only");
assert(!w3!.preferTextOnlySlots.includes("ingredient_highlight"), "keep ingredient");
console.log("one-detail:", w3!.message);

console.log("\n105cha role-shortage smoke OK");
