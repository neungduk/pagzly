/**
 * Recraft 등 단색 SVG → currentColor 정규화 (174차 다이어그램 / 177차 컨셉 아이콘 공용).
 */

export function normalizeMonochromeSvg(raw: string): string {
  let svg = raw.trim();
  svg = svg.replace(/<\?xml[\s\S]*?\?>/i, "").replace(/<!DOCTYPE[\s\S]*?>/i, "").trim();
  if (!svg.includes("<svg")) throw new Error("not an svg");

  svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
  svg = svg.replace(/xmlns:c2pa="[^"]*"/gi, "");

  svg = svg.replace(/style="([^"]*)"/gi, (_m, style: string) => {
    const cleaned = style
      .replace(/(?:^|;)\s*(?:fill|stroke)\s*:[^;]+/gi, "")
      .replace(/^;+|;+$/g, "")
      .trim();
    return cleaned ? `style="${cleaned}"` : "";
  });

  const toTint = (attr: "fill" | "stroke") => {
    const re = new RegExp(
      `\\b${attr}="(#[0-9a-fA-F]{3,8}|black|white|rgb\\([^"]*\\)|rgba\\([^"]*\\))"`,
      "gi",
    );
    svg = svg.replace(re, (_m, val: string) => {
      const v = val.toLowerCase();
      if (v === "white" || /^#fff(f)?$/i.test(val) || /^#f{3,8}$/i.test(val)) {
        return `${attr}="none"`;
      }
      if (/rgba?\(\s*255/.test(v)) return `${attr}="none"`;
      return `${attr}="currentColor"`;
    });
  };
  toTint("fill");
  toTint("stroke");

  svg = svg.replace(/preserveAspectRatio="none"/gi, 'preserveAspectRatio="xMidYMid meet"');

  if (!/fill="currentColor"/.test(svg)) {
    svg = svg.replace(/<svg\b([^>]*)>/i, '<svg$1 fill="currentColor">');
  }

  if (/viewBox=/i.test(svg)) {
    svg = svg.replace(/\s(width|height)="[^"]*"/gi, "");
  }

  return svg.replace(/\s{2,}/g, " ").trim();
}

/** currentColor → 토큰 색, opacity 노이즈 제거 */
export function tintMonochromeSvg(svg: string, color: string): string {
  return svg
    .replace(/currentColor/g, color)
    .replace(/\bfill-opacity="[^"]*"/gi, "")
    .replace(/\bstroke-opacity="[^"]*"/gi, "");
}
