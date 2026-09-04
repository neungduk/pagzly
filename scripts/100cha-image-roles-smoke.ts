/**
 * 100차 — Vision 역할 병합 스모크
 *   npx tsx scripts/100cha-image-roles-smoke.ts
 */
import {
  defaultRoleForIndex,
  mergeImageRolesWithVision,
  parseVisionImageRoles,
} from "../lib/image-roles";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const vision = parseVisionImageRoles([
  { index: 0, role: "package", confidence: 0.9, reason: "박스" },
  { index: 1, role: "hero", confidence: 0.85, reason: "정면" },
  { index: 2, role: "detail", confidence: 0.4, reason: "애매" },
  { index: 3, role: "lifestyle", confidence: 0.8, reason: "손" },
]);
assert(vision.length === 4, "parse length");

const merged = mergeImageRolesWithVision({
  imageCount: 4,
  userRoles: [
    defaultRoleForIndex(0),
    defaultRoleForIndex(1),
    defaultRoleForIndex(2),
    defaultRoleForIndex(3),
  ],
  userSet: [false, false, false, false],
  visionRoles: vision,
});
assert(merged[0] === "package", `idx0 want package got ${merged[0]}`);
assert(merged[1] === "hero", `idx1 want hero got ${merged[1]}`);
assert(
  merged[2] === "lifestyle",
  `idx2 low confidence → default lifestyle got ${merged[2]}`,
);
assert(merged[3] === "lifestyle", `idx3 vision lifestyle got ${merged[3]}`);

const locked = mergeImageRolesWithVision({
  imageCount: 2,
  userRoles: ["detail", "package"],
  userSet: [true, false],
  visionRoles: [
    { index: 0, role: "hero", confidence: 0.99 },
    { index: 1, role: "lifestyle", confidence: 0.99 },
  ],
});
assert(locked[0] === "detail", "user lock must win");
assert(locked[1] === "lifestyle", "unlocked accepts vision");

console.log("100cha image-roles smoke OK", { merged, locked });
