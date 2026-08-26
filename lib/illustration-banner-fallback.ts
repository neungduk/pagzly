/**
 * flux-schnell 일러스트 생성 실패 시 illustration_banner용 로컬 폴백.
 * 상품 컷 블러 + 테마 그라데이션 + 장식 SVG를 합성해 단색 빈 배경을 피한다.
 */

import sharp from "sharp";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ConceptBrief } from "@/lib/concept-brief";
import { hexToRgba } from "@/lib/design-tokens";

const WIDTH = 1280;
const HEIGHT = 720;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDecorSvg(
  accent: string,
  deepAccent: string,
  baseNeutral: string,
  brief?: ConceptBrief,
): string {
  const motif = escapeXml(brief?.motif_keywords?.slice(0, 2).join(" · ") ?? "Pagzly");
  const accentSoft = hexToRgba(accent, 0.35);
  const deepSoft = hexToRgba(deepAccent, 0.5);
  const neutralSoft = hexToRgba(baseNeutral, 0.25);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${deepSoft}"/>
      <stop offset="55%" stop-color="${accentSoft}"/>
      <stop offset="100%" stop-color="${neutralSoft}"/>
    </linearGradient>
    <radialGradient id="orb" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${hexToRgba(accent, 0.28)}"/>
      <stop offset="100%" stop-color="${hexToRgba(accent, 0)}"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <circle cx="180" cy="140" r="220" fill="url(#orb)"/>
  <circle cx="1080" cy="580" r="260" fill="url(#orb)" opacity="0.75"/>
  <path d="M-40 520 Q 420 380, 880 460 T 1320 320" fill="none" stroke="${hexToRgba(accent, 0.22)}" stroke-width="2"/>
  <path d="M80 680 Q 520 560, 980 620 T 1360 500" fill="none" stroke="${hexToRgba(deepAccent, 0.18)}" stroke-width="1.5"/>
  <line x1="120" y1="0" x2="420" y2="${HEIGHT}" stroke="${hexToRgba(accent, 0.12)}" stroke-width="1"/>
  <line x1="900" y1="0" x2="640" y2="${HEIGHT}" stroke="${hexToRgba(deepAccent, 0.1)}" stroke-width="1"/>
  <text x="64" y="${HEIGHT - 48}" fill="${hexToRgba(accent, 0.18)}" font-family="ui-sans-serif, system-ui" font-size="13" letter-spacing="0.28em">${motif}</text>
</svg>`;
}

async function composeFromSvg(svg: string): Promise<string> {
  const png = await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** 상품 이미지 블러 + 컨셉 장식 SVG 폴백 PNG data URL */
export async function buildIllustrationBannerFallback(params: {
  productImageUrl?: string | null;
  theme: Pick<CategoryTheme, "accent" | "deepAccent" | "baseNeutral">;
  brief?: ConceptBrief;
}): Promise<string> {
  const decorSvg = buildDecorSvg(
    params.theme.accent,
    params.theme.deepAccent,
    params.theme.baseNeutral,
    params.brief,
  );

  if (params.productImageUrl) {
    try {
      const response = await fetch(params.productImageUrl);
      if (!response.ok) {
        throw new Error(`product image fetch ${response.status}`);
      }
      const input = Buffer.from(await response.arrayBuffer());
      const blurred = await sharp(input)
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
        .blur(26)
        .modulate({ brightness: 0.82, saturation: 1.08 })
        .toBuffer();

      const composed = await sharp(blurred)
        .composite([{ input: Buffer.from(decorSvg), blend: "over" }])
        .png({ quality: 85 })
        .toBuffer();

      return `data:image/png;base64,${composed.toString("base64")}`;
    } catch (error) {
      console.warn("[illustration-fallback] 상품 블러 배경 실패 — SVG-only 폴백", error);
    }
  }

  return composeFromSvg(decorSvg);
}
