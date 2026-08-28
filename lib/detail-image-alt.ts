/** 마켓·접근성용 이미지 alt — 상품명 + 섹션 맥락 */
export function buildSectionImageAlt(
  productName: string,
  heading: string,
  slot?: string,
): string {
  const base = productName.trim();
  const head = heading.trim().slice(0, 60);
  const slotHint =
    slot && slot !== "image_text" && slot !== "hero"
      ? slot.replace(/_/g, " ")
      : "";
  const parts = [base, head, slotHint].filter(Boolean);
  const alt = parts.join(" — ");
  return alt.length > 120 ? alt.slice(0, 117) + "…" : alt;
}
