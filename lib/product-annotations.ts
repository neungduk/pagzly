export type ImageAnnotation = {
  label: string;
  xPct: number;
  yPct: number;
};

const PLACEHOLDER_PATTERNS = ["판매자 확인 필요", "판매자에게 문의", "확인 필요"];

export function sanitizeAnnotations(raw: unknown): ImageAnnotation[] {
  if (!Array.isArray(raw)) return [];
  const out: ImageAnnotation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label =
      typeof (item as ImageAnnotation).label === "string"
        ? (item as ImageAnnotation).label.trim()
        : "";
    const xPct = Number((item as ImageAnnotation).xPct);
    const yPct = Number((item as ImageAnnotation).yPct);
    if (!label || label.length > 24) continue;
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) continue;
    if (xPct < 2 || xPct > 98 || yPct < 2 || yPct > 98) continue;
    if (PLACEHOLDER_PATTERNS.some((p) => label.includes(p))) continue;
    out.push({ label, xPct, yPct });
  }
  return out.slice(0, 4);
}

export function areAnnotationsReliable(annotations: ImageAnnotation[]): boolean {
  if (annotations.length < 2) return false;
  const cells = new Set(
    annotations.map((a) => `${Math.round(a.xPct / 12)}-${Math.round(a.yPct / 12)}`),
  );
  if (cells.size < Math.min(annotations.length, 2)) return false;
  const labels = new Set(annotations.map((a) => a.label.toLowerCase()));
  return labels.size === annotations.length;
}
