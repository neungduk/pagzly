const PLACEHOLDER_PATTERNS = ["판매자 확인 필요", "판매자에게 문의", "확인 필요", "미정"];

const FORMULATION_KEYWORDS: Record<string, string> = {
  세럼: "serum",
  앰플: "ampoule serum",
  크림: "cream",
  로션: "lotion",
  젤: "gel",
  오일: "oil",
  토너: "toner liquid",
  미스트: "mist spray",
  에센스: "essence",
  밤: "balm",
};

/** spec_table·컨셉에서 제형 키워드 추출 — 없으면 null */
export function extractCosmeticsFormulation(
  specRows?: { label: string; value: string }[],
  conceptText?: string | null,
): string | null {
  const sources: string[] = [];
  if (conceptText?.trim()) sources.push(conceptText);
  for (const row of specRows ?? []) {
    if (/제형|타입|texture|form/i.test(row.label)) {
      sources.push(row.value);
    }
  }
  const joined = sources.join(" ");
  if (!joined.trim()) return null;
  if (PLACEHOLDER_PATTERNS.some((p) => joined.includes(p))) return null;

  for (const [ko, en] of Object.entries(FORMULATION_KEYWORDS)) {
    if (joined.includes(ko)) return en;
  }
  const bare = joined.trim();
  if (bare.length >= 2 && bare.length <= 12) return bare;
  return null;
}

/** 62차 — 화장품 텍스처 스와치 매크로 프롬프트 */
export function buildCosmeticsTextureSwatchPrompt(formulation: string, toneDescription: string): string {
  return [
    `extreme macro photograph of ${formulation} swatch`,
    "a small amount squeezed or spread naturally on a smooth glass palette or ceramic swatch card",
    "texture gloss and viscosity clearly visible, shallow depth of field",
    "soft studio lighting, clean K-beauty product photography",
    `subtle ${toneDescription} ambient tone in background blur only`,
    "no bottle, no dropper, no packaging, no hands, no text, no logo",
    "no glass container, no drinking glass, no vessel, no cup, no beaker, no jar",
    "formula texture only, realistic macro shot",
  ].join(", ");
}
