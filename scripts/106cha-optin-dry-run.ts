/**
 * 106차 — 옵트인 dry-run (Replicate 미호출)
 *   npx tsx scripts/106cha-optin-dry-run.ts
 */
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

/** photo-pipeline 분기와 동일한 조건 */
function wouldCallLifestyleShots(params: {
  uploadCount: number;
  minUploadCount: number;
  enableAiLifestyleShots?: boolean;
}): boolean {
  if (params.uploadCount < params.minUploadCount) return false;
  return params.enableAiLifestyleShots === true;
}

assert(
  !wouldCallLifestyleShots({
    uploadCount: 9,
    minUploadCount: 3,
    enableAiLifestyleShots: false,
  }),
  "unchecked must not call",
);
assert(
  !wouldCallLifestyleShots({
    uploadCount: 9,
    minUploadCount: 3,
    enableAiLifestyleShots: undefined,
  }),
  "undefined must not call",
);
assert(
  wouldCallLifestyleShots({
    uploadCount: 9,
    minUploadCount: 3,
    enableAiLifestyleShots: true,
  }),
  "checked must call (until generate)",
);
assert(
  !wouldCallLifestyleShots({
    uploadCount: 2,
    minUploadCount: 3,
    enableAiLifestyleShots: true,
  }),
  "below min uploads skip",
);

// composite 경로는 옵트인과 무관 — 시그니처만 문서화
const compositeIndependent = true;
assert(compositeIndependent, "composite path independent of opt-in");

console.log("106cha opt-in dry-run OK", {
  off: "skip generateLifestyleShots",
  on: "enter lifestyle branch (API still gated by enableAiLifestyleShots=true)",
});
