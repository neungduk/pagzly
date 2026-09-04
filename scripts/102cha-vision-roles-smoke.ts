/**
 * 102차 — Vision roles 파싱·병합·배지 스모크
 *   npx tsx scripts/102cha-vision-roles-smoke.ts
 */
import {
  countVisionRolesApplied,
  defaultRoleForIndex,
  mergeImageRolesWithVision,
} from "../lib/image-roles";
import { parseImageAnalysisResponse } from "../lib/parse-image-analysis-response";
import { buildGenerationPipelineSummary } from "../lib/generation-pipeline-summary";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 1) roles-first 정상 JSON
const ok = parseImageAnalysisResponse(
  JSON.stringify({
    roles: [
      { index: 0, role: "package", confidence: 0.9 },
      { index: 3, role: "detail", confidence: 0.85 },
      { index: 5, role: "package", confidence: 0.8 },
    ],
    analysis: "상세 분석",
  }),
  9,
);
assert(ok.roles.length === 3, "ok roles");
assert(ok.analysis === "상세 분석", "ok analysis");

// 2) roles-first + analysis 잘림 → roles salvage
const longTail = "가".repeat(200);
const withRolesThenCut = [
  "{",
  '  "roles": [',
  '    {"index":0,"role":"hero","confidence":0.9,"reason":"a"},',
  '    {"index":3,"role":"detail","confidence":0.88,"reason":"side bottle"},',
  '    {"index":5,"role":"package","confidence":0.91,"reason":"box"}',
  "  ],",
  `  "analysis": "색상은 핑크이고 ${longTail}`,
].join("\n");
const salvaged = parseImageAnalysisResponse(withRolesThenCut, 9);
assert(salvaged.roles.length === 3, `salvage want 3 got ${salvaged.roles.length}`);
assert(salvaged.roles.find((r) => r.index === 3)?.role === "detail", "idx3 detail");
assert(salvaged.roles.find((r) => r.index === 5)?.role === "package", "idx5 package");

// 3) analysis만 있고 roles 없음 → 빈 roles
const proseOnly = parseImageAnalysisResponse(
  '{"analysis": "아주 긴 분석이 여기까지 오고 끊김',
  9,
);
assert(proseOnly.roles.length === 0, "prose-only empty roles");

// 4) 병합: 폼 기본값 + Vision → Vision 승
const defaults = Array.from({ length: 9 }, (_, i) => defaultRoleForIndex(i));
const merged = mergeImageRolesWithVision({
  imageCount: 9,
  userRoles: defaults,
  userSet: Array(9).fill(false),
  visionRoles: salvaged.roles,
});
assert(merged[3] === "detail", `merged[3]=${merged[3]}`);
assert(merged[5] === "package", `merged[5]=${merged[5]}`);
assert(merged[0] === "hero", `merged[0]=${merged[0]}`);

const applied = countVisionRolesApplied(merged, salvaged.roles, Array(9).fill(false));
assert(applied === 3, `applied=${applied}`);

// 5) 사용자 잠금 유지
const locked = mergeImageRolesWithVision({
  imageCount: 2,
  userRoles: ["lifestyle", "other"],
  userSet: [true, false],
  visionRoles: [
    { index: 0, role: "hero", confidence: 0.99 },
    { index: 1, role: "package", confidence: 0.99 },
  ],
});
assert(locked[0] === "lifestyle", "user lock");
assert(locked[1] === "package", "unlocked vision");

// 6) 배지: analysis만 → "서술 분석 완료" / visionApplied>0 → Vision 역할 반영
const badgeProse = buildGenerationPipelineSummary({
  imageAnalysis: "분석 있음",
  visionRolesApplied: 0,
  sectionCount: 1,
});
assert(
  badgeProse.steps[0].detail === "서술 분석 완료",
  `badge prose got ${badgeProse.steps[0].detail}`,
);
const badgeVision = buildGenerationPipelineSummary({
  imageAnalysis: "분석 있음",
  photoCostBreakdown: { visionRolesApplied: 3 },
  sectionCount: 1,
});
assert(
  badgeVision.steps[0].detail?.includes("Vision 역할 반영") === true,
  `badge vision got ${badgeVision.steps[0].detail}`,
);

console.log("102cha vision-roles smoke OK", {
  salvaged: salvaged.roles,
  merged: merged.slice(0, 6),
  applied,
});
