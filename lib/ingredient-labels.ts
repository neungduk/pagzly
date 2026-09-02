const PLACEHOLDER_PATTERNS = ["판매자 확인 필요", "판매자에게 문의", "확인 필요", "미정"];

const INGREDIENT_SEP = /[,，、·/|;|\n]+/;

function splitIngredientLabels(raw: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of raw.split(INGREDIENT_SEP)) {
    const label = part.trim();
    if (!label || label.length > 32) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

/** 사용자 입력 "주요 성분 또는 소재"에서 라벨 1개 이상 추출 — 없으면 null */
export function parseIngredientLabels(
  ingredients: string | null | undefined,
): string[] | null {
  const raw = ingredients?.trim();
  if (!raw) return null;
  if (PLACEHOLDER_PATTERNS.some((p) => raw.includes(p))) return null;

  const labels = splitIngredientLabels(raw);
  return labels.length > 0 ? labels : null;
}

/** 사용자 입력에서 라벨 2개 추출 — 정확히 2개 못 뽑으면 null (65차 호환) */
export function parseIngredientPairLabels(
  ingredients: string | null | undefined,
): [string, string] | null {
  const labels = parseIngredientLabels(ingredients);
  if (!labels || labels.length < 2) return null;
  return [labels[0], labels[1]];
}
