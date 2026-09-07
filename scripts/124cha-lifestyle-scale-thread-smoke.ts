/**
 * 124차 — lifestyle composite 스케일 게이트 + requirePixelPaste 무비용 검증
 * npx tsx scripts/124cha-lifestyle-scale-thread-smoke.ts
 */
import assert from "node:assert/strict";
import { resolveLifestyleCompositeScale } from "../lib/lifestyle-composite-scale-gate";
import { parseProductHeightCm } from "../lib/lifestyle-physical-scale";
import { compositeProductOnLifestylePhoto } from "../lib/lifestyle-product-composite";

async function main() {
  // gate: hint present
  const ok = resolveLifestyleCompositeScale({
    productSizeHint: "35mL, 높이 약 9cm",
  });
  assert.equal(ok.shouldAttempt, true);
  assert.equal(ok.productHeightCm, 9);

  // gate: explicit cm wins
  const explicit = resolveLifestyleCompositeScale({
    productSizeHint: "no height here",
    productHeightCm: 12,
  });
  assert.equal(explicit.shouldAttempt, true);
  assert.equal(explicit.productHeightCm, 12);

  // gate: missing → skip (옵션 1)
  const miss = resolveLifestyleCompositeScale({
    productSizeHint: "35mL only",
  });
  assert.equal(miss.shouldAttempt, false);
  assert.equal(miss.skipReason, "missing-product-height-cm");
  assert.equal(miss.productHeightCm, null);

  const empty = resolveLifestyleCompositeScale({});
  assert.equal(empty.shouldAttempt, false);

  assert.equal(parseProductHeightCm("높이 12cm"), 12);

  // requirePixelPaste + missing height → 원본 반환 (네트워크/Replicate 호출 없음)
  const skipped = await compositeProductOnLifestylePhoto({
    lifestyleImageUrl: "https://example.com/lifestyle.png",
    productImageUrl: "https://example.com/product.png",
    category: "화장품/뷰티",
    productName: "테스트",
    productHeightCm: null,
    requirePixelPaste: true,
  });
  assert.equal(skipped.composited, false);
  assert.equal(skipped.fallbackReason, "missing-product-height-cm");
  assert.equal(skipped.url, "https://example.com/lifestyle.png");
  assert.equal(skipped.cost, 0);

  console.log("[124cha] lifestyle scale thread smoke OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
