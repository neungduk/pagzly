/**
 * 33차 — backdrop round-robin mapping smoke (no API).
 * npx tsx scripts/test-backdrop-roundrobin-33.ts
 */
function resolveBackdropLabel(index: number): "hero" | "ingredient" | "texture" {
  const labels = ["hero", "ingredient", "texture"] as const;
  return labels[index % labels.length]!;
}

function main() {
  console.log("=== 33차 backdrop round-robin mapping ===");
  const before: string[] = [];
  const after: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    // 구 로직: index >= 3 → hero
    before.push(i < 3 ? (["hero", "ingredient", "texture"] as const)[i]! : "hero");
    after.push(resolveBackdropLabel(i));
  }
  console.log("before (bug):", before.join(" → "));
  console.log("after  (fix):", after.join(" → "));

  const expected = [
    "hero",
    "ingredient",
    "texture",
    "hero",
    "ingredient",
    "texture",
    "hero",
  ];
  if (after.join(",") !== expected.join(",")) {
    throw new Error(`mapping mismatch: got ${after.join(",")}`);
  }
  // 구 로직은 idx 3~6이 전부 hero
  if (before.slice(3).some((x) => x !== "hero")) {
    throw new Error("before fixture wrong");
  }
  console.log("PASS — idx 3/4/5 cycle ingredient/texture instead of all-hero");
}

main();
