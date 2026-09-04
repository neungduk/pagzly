/**
 * 106차 — Vision roles-first + 빈 roles 경고 스모크
 *   npx tsx scripts/106cha-vision-roles-smoke.ts
 */
import {
  defaultRoleForIndex,
  mergeImageRolesWithVision,
} from "../lib/image-roles";
import { parseImageAnalysisResponse } from "../lib/parse-image-analysis-response";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// roles-first salvage
const cut = [
  '{"roles":[',
  '{"index":0,"role":"hero","confidence":0.9,"reason":"a"},',
  '{"index":1,"role":"package","confidence":0.88,"reason":"box"}',
  "],",
  '"analysis":"잘린 서술 ',
  "가".repeat(100),
].join("");
const salvaged = parseImageAnalysisResponse(cut, 10);
assert(salvaged.roles.length === 2, `salvage ${salvaged.roles.length}`);

// analysis만 있고 roles 키 없음 → 빈 roles
const proseOnly = parseImageAnalysisResponse(
  '{"analysis": "아주 긴 분석만 있고 roles 키가 없음',
  10,
);
assert(proseOnly.roles.length === 0, "prose-only empty roles");

const warns: unknown[] = [];
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  warns.push(args);
  origWarn(...args);
};
try {
  mergeImageRolesWithVision({
    imageCount: 10,
    userRoles: Array.from({ length: 10 }, (_, i) => defaultRoleForIndex(i)),
    userSet: Array(10).fill(false),
    visionRoles: [],
  });
} finally {
  console.warn = origWarn;
}

const hit = warns.some(
  (w) =>
    Array.isArray(w) &&
    typeof w[0] === "string" &&
    w[0].includes("[image-roles] vision roles 비어있음"),
);
assert(hit, "expected console.warn for empty vision roles");

console.log("106cha vision-roles smoke OK", {
  salvaged: salvaged.roles.length,
  proseOnlyEmpty: proseOnly.roles.length,
  warnHit: hit,
});
