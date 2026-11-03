/**
 * 482 B — 키비주얼 로컬 합성(SVG/CSS). 새 AI 이미지 없음.
 * 레시피: stage | bloom | callouts. 아키타입별 1종 배정, 결정적.
 * 컷아웃 알파가 있으면 우선. 없으면 제품 단독컷(whiteBg·hero/package)만 플레이트 허용.
 * 손·라이프스타일·미상 → null(현행 유지).
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";
import type { ProductPalette482 } from "@/lib/palette-from-product-482";
import { contrastRatioToken, mixHex } from "@/lib/design-tokens";

export type KeyvisualRecipe482 = "stage" | "bloom" | "callouts";

export const RECIPE_BY_ARCHETYPE_482: Record<ArchetypeId, KeyvisualRecipe482> = {
  editorial: "stage",
  catalog: "stage",
  softlife: "bloom",
  impact: "callouts",
  techsheet: "stage",
  narrative: "bloom",
  luxe: "bloom",
  pop: "callouts",
};

/** 제품 박스(정규화 0~1, 키비주얼 프레임 기준) — 말풍선 겹침 검사용 */
export const PRODUCT_BOX_482 = { x: 0.28, y: 0.22, w: 0.44, h: 0.58 } as const;

export type CalloutGeom482 = {
  text: string;
  /** 말풍선 중심 (0~1) */
  cx: number;
  cy: number;
  /** 말풍선 반폭·반고 (대략) */
  hw: number;
  hh: number;
};

export type KeyvisualPlan482 = {
  recipe: KeyvisualRecipe482;
  imageUrl: string;
  alt: string;
  callouts: CalloutGeom482[];
  /** 기존 입력 수치가 있을 때만 큰 숫자 */
  bigNumber: string | null;
  palette: ProductPalette482;
  archetype: ArchetypeId;
  slot: "hero" | "summary";
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 최대 12자(한글·영문 동일 길이). 넘치면 해당 말풍선 생략(말줄임 금지). */
export function shortCalloutText482(raw: string): string | null {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const chars = [...t];
  if (chars.length > 12) return null;
  return t;
}

export function collectCalloutTexts482(
  sources: Array<string | null | undefined>,
  max = 4,
): string[] {
  const out: string[] = [];
  for (const s of sources) {
    const t = shortCalloutText482(s ?? "");
    if (!t) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** 좌우 교차, 제품 박스 바깥. 결정적 배치. */
export function layoutCallouts482(texts: string[]): CalloutGeom482[] {
  // 좌상·우상·좌하·우하 (제품 박스 바깥)
  const slots: Array<{ cx: number; cy: number }> = [
    { cx: 0.14, cy: 0.28 },
    { cx: 0.86, cy: 0.3 },
    { cx: 0.16, cy: 0.72 },
    { cx: 0.84, cy: 0.7 },
  ];
  return texts.slice(0, 4).map((text, i) => {
    const n = [...text].length;
    const hw = Math.min(0.13, 0.04 + n * 0.007);
    const hh = 0.045;
    const s = slots[i]!;
    return { text, cx: s.cx, cy: s.cy, hw, hh };
  });
}

export function calloutOverlapsProduct482(c: CalloutGeom482, box = PRODUCT_BOX_482): boolean {
  const left = c.cx - c.hw;
  const right = c.cx + c.hw;
  const top = c.cy - c.hh;
  const bottom = c.cy + c.hh;
  const bx2 = box.x + box.w;
  const by2 = box.y + box.h;
  return !(right < box.x || left > bx2 || bottom < box.y || top > by2);
}

export function isKeyvisualSource482(opts: {
  photoKind?: "person" | "product" | "unknown";
  whiteBg?: boolean;
  hasAlpha?: boolean;
  role?: string | null;
  lifestyle?: boolean;
}): boolean {
  if (opts.lifestyle || opts.photoKind === "person") return false;
  if (opts.hasAlpha) return true;
  if (opts.photoKind === "product" && (opts.whiteBg || opts.role === "hero" || opts.role === "package")) {
    return true;
  }
  return false;
}

export function recipeForArchetype482(id: ArchetypeId): KeyvisualRecipe482 {
  return RECIPE_BY_ARCHETYPE_482[id];
}

export function planKeyvisual482(input: {
  archetype: ArchetypeId;
  imageUrl: string;
  alt?: string;
  palette: ProductPalette482;
  slot: "hero" | "summary";
  calloutSources: Array<string | null | undefined>;
  bigNumber?: string | null;
  photoKind?: "person" | "product" | "unknown";
  whiteBg?: boolean;
  hasAlpha?: boolean;
  role?: string | null;
  lifestyle?: boolean;
}): KeyvisualPlan482 | null {
  if (!input.imageUrl) return null;
  if (
    !isKeyvisualSource482({
      photoKind: input.photoKind,
      whiteBg: input.whiteBg,
      hasAlpha: input.hasAlpha,
      role: input.role,
      lifestyle: input.lifestyle,
    })
  ) {
    return null;
  }
  const recipe = recipeForArchetype482(input.archetype);
  const maxCallouts = recipe === "callouts" ? 4 : recipe === "stage" ? 3 : 3;
  const texts = collectCalloutTexts482(input.calloutSources, maxCallouts);
  const callouts = layoutCallouts482(texts).filter((c) => !calloutOverlapsProduct482(c));
  const num = input.bigNumber?.replace(/[^\d.%+]/g, "") ?? "";
  const bigNumber = num && num.length <= 6 ? num : null;
  return {
    recipe,
    imageUrl: input.imageUrl,
    alt: input.alt || "",
    callouts,
    bigNumber,
    palette: input.palette,
    archetype: input.archetype,
    slot: input.slot,
  };
}

function inkOn(bg: string): string {
  return contrastRatioToken("#1B1B18", bg) >= 4.5 ? "#1B1B18" : "#FAF8F3";
}

function stageLayers(p: KeyvisualPlan482): string {
  const face = mixHex(p.palette.secondary, p.palette.primary, 0.35);
  const dark = p.palette.dark;
  const num = p.bigNumber
    ? `<text x="375" y="420" text-anchor="middle" font-size="220" font-weight="800" fill="${esc(mixHex(face, dark, 0.15))}" opacity="0.35" font-family="system-ui,sans-serif">${esc(p.bigNumber)}</text>`
    : `<ellipse cx="375" cy="380" rx="160" ry="160" fill="${esc(mixHex(face, p.palette.primary, 0.25))}" opacity="0.55"/>`;
  return (
    `<rect width="750" height="820" fill="${esc(face)}"/>` +
    `<ellipse cx="375" cy="620" rx="220" ry="48" fill="${esc(mixHex(dark, "#000000", 0.4))}" opacity="0.35"/>` +
    num
  );
}

function bloomLayers(p: KeyvisualPlan482): string {
  const face = mixHex(p.palette.dark, p.palette.primary, 0.25);
  const light = mixHex(p.palette.secondary, "#FFFFFF", 0.4);
  return (
    `<rect width="750" height="820" fill="${esc(face)}"/>` +
    `<radialGradient id="kv482b"><stop offset="0%" stop-color="${esc(light)}" stop-opacity="0.85"/><stop offset="55%" stop-color="${esc(face)}" stop-opacity="0.2"/><stop offset="100%" stop-color="${esc(face)}" stop-opacity="0"/></radialGradient>` +
    `<ellipse cx="375" cy="360" rx="280" ry="300" fill="url(#kv482b)"/>` +
    // 은은한 노이즈(점 패턴)
    `<g opacity="0.08" fill="${esc(light)}">${Array.from({ length: 40 }, (_, i) => {
      const x = (i * 97 + 13) % 750;
      const y = (i * 53 + 29) % 820;
      return `<circle cx="${x}" cy="${y}" r="1.2"/>`;
    }).join("")}</g>`
  );
}

function calloutSvg(c: CalloutGeom482, i: number, p: KeyvisualPlan482): string {
  const bx = PRODUCT_BOX_482.x * 750 + (PRODUCT_BOX_482.w * 750) / 2;
  const by = PRODUCT_BOX_482.y * 820 + (PRODUCT_BOX_482.h * 820) / 2;
  const x = c.cx * 750;
  const y = c.cy * 820;
  const rw = c.hw * 750 * 2;
  const rh = c.hh * 820 * 2;
  const bubble = p.palette.secondary;
  const ink = inkOn(bubble);
  // 대비 강제
  const fg = contrastRatioToken(ink, bubble) >= 4.5 ? ink : inkOn(mixHex(bubble, "#000000", 0.15));
  const bg = contrastRatioToken(fg, bubble) >= 4.5 ? bubble : mixHex(bubble, "#FFFFFF", 0.5);
  return (
    `<line x1="${bx}" y1="${by}" x2="${x}" y2="${y}" stroke="${esc(mixHex(p.palette.primary, "#000", 0.2))}" stroke-width="1.2" opacity="0.55"/>` +
    `<rect x="${x - rw / 2}" y="${y - rh / 2}" width="${rw}" height="${rh}" rx="14" ry="14" fill="${esc(bg)}" stroke="${esc(mixHex(p.palette.primary, bg, 0.3))}" stroke-width="1"/>` +
    `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="18" font-weight="600" fill="${esc(fg)}" font-family="system-ui,sans-serif">${esc(c.text)}</text>`
  );
}

/**
 * 키비주얼 HTML. export·라이브 공통. 인라인 SVG + img.
 * 목표: 마크업 ≤ ~4KB(이미지 URL 제외 시).
 */
export function keyvisualHtml482(p: KeyvisualPlan482): string {
  const layers =
    p.recipe === "bloom" ? bloomLayers(p) : p.recipe === "callouts" ? bloomLayers(p) : stageLayers(p);
  const showCallouts = p.recipe === "callouts" || p.recipe === "stage" || p.recipe === "bloom";
  const calloutN = p.recipe === "callouts" ? p.callouts.length : Math.min(3, p.callouts.length);
  const callouts = showCallouts ? p.callouts.slice(0, calloutN).map((c, i) => calloutSvg(c, i, p)).join("") : "";
  const box = PRODUCT_BOX_482;
  const imgLeft = box.x * 100;
  const imgTop = box.y * 100;
  const imgW = box.w * 100;
  const imgH = box.h * 100;
  return (
    `<div data-pz-kv482="${p.recipe}" data-pz-kv-slot="${p.slot}" style="position:relative;width:100%;aspect-ratio:750/820;overflow:hidden;background:${esc(p.palette.secondary)}">` +
    `<svg viewBox="0 0 750 820" width="100%" height="100%" style="position:absolute;inset:0;display:block" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${layers}${callouts}</svg>` +
    `<img src="${esc(p.imageUrl)}" alt="${esc(p.alt)}" data-pz-kv-product="1" style="position:absolute;left:${imgLeft}%;top:${imgTop}%;width:${imgW}%;height:${imgH}%;object-fit:contain;object-position:center bottom;z-index:2;pointer-events:none"/>` +
    `</div>`
  );
}

/** export 증가량 추정(URL 제외 마크업 바이트) */
export function keyvisualMarkupBytes482(html: string): number {
  return Buffer.byteLength(html.replace(/src="[^"]*"/g, 'src=""'), "utf8");
}

/** 섹션·키피처에서 말풍선 후보(기존 문구만) */
export function calloutSourcesFromDetail482(
  sections: Array<{
    type: string;
    slot?: string;
    heading?: string;
    emphasis?: string;
    callout?: string;
    items?: string[];
    cards?: Array<{ title?: string; body?: string }>;
  }>,
  keyFeatures?: string | null,
): string[] {
  const out: string[] = [];
  if (keyFeatures) {
    for (const part of keyFeatures.split(/[,，、/\n]/)) out.push(part.trim());
  }
  for (const s of sections) {
    if (s.type === "checklist" && Array.isArray(s.items)) {
      for (const it of s.items) out.push(String(it));
    }
    if (s.type === "image_text") {
      if (s.emphasis) out.push(s.emphasis);
      if (s.heading) out.push(s.heading);
      if (s.callout) out.push(s.callout);
    }
    if (s.type === "highlight_box" && s.slot !== "seller_trust_evidence" && s.cards) {
      for (const c of s.cards) {
        if (c.title) out.push(c.title);
      }
    }
  }
  return out;
}

/** 큰 숫자: 배지·체크 항목의 짧은 수치만 */
export function bigNumberFromCopy482(texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    if (!t) continue;
    const m = t.match(/(\d[\d,.]*\s*%?|\d+\s*만)/);
    if (m && [...m[1]!].length <= 6) return m[1]!.replace(/\s+/g, "");
  }
  return null;
}
