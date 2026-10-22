/**
 * 431차 1-2 — 코드로 그리는 SVG 일러스트의 공통 도구. 직접 작성한 도형만 쓴다(외부 일러스트·아이콘 팩 복사 없음).
 * 세 가지 스타일: solid(입체: 좌상단 광원 그라데이션 + 하단 소프트 섀도) · flat(플랫 + 레이어 도형) · line(라인 + 소프트 필).
 * PNG 캡처 패리티: 선형·방사 그라데이션, opacity, stroke만 쓴다(<filter>·<foreignObject>·CSS filter·외부 참조 없음).
 * 라이브와 export가 같은 문자열을 그대로 쓰도록 순수 함수로 만든다. 장식용이라 aria-hidden.
 */
import { mixHex } from "@/lib/design-tokens";

export type IllustStyle = "solid" | "flat" | "line";
export const ILLUST_STYLES: readonly IllustStyle[] = ["solid", "flat", "line"];
/** 팔레트 슬롯 4색(430차 슬롯 테마의 accent·deepAccent·accentSoft·baseNeutral) */
export type IllustColors = { a: string; b: string; c: string; n: string };
type Role = "p" | "s" | "t" | "n";

export type Ctx = {
  style: IllustStyle;
  /** 변형 0~2 — 구도와 색 슬롯 회전(p·s·t 순서가 한 칸씩 밀린다) */
  v: number;
  col: Record<Role, string>;
  id: string;
  defs: string[];
};

const hash = (s: string): string => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

export function makeCtx(style: IllustStyle, colors: IllustColors, v: number, key: string): Ctx {
  const rot = [colors.a, colors.b, colors.c];
  const k = ((v % 3) + 3) % 3;
  const [p, s, t] = [rot[k]!, rot[(k + 1) % 3]!, rot[(k + 2) % 3]!];
  return { style, v: k, col: { p, s, t, n: colors.n }, id: `il${hash(`${key}|${style}|${k}|${p}${s}${t}`)}`, defs: [] };
}

/** 칠하기: 스타일별 fill/stroke 속성 문자열 */
export function paint(c: Ctx, role: Role, o: { soft?: number } = {}): string {
  const base = c.col[role];
  if (c.style === "flat") return `fill="${base}"`;
  if (c.style === "line") return `fill="${base}" fill-opacity="${o.soft ?? 0.16}" stroke="${mixHex(base, "#000000", 0.18)}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const gid = `${c.id}-${role}`;
  if (!c.defs.some((d) => d.includes(`id="${gid}"`))) {
    c.defs.push(
      `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mixHex(base, "#FFFFFF", 0.38)}"/><stop offset="0.5" stop-color="${base}"/><stop offset="1" stop-color="${mixHex(base, "#000000", 0.24)}"/></linearGradient>`,
    );
  }
  return `fill="url(#${gid})"`;
}

/** 면 옆면·뒷면용으로 한 단계 어둡게 한 칠 */
export function paintDark(c: Ctx, role: Role, amount = 0.2): string {
  const d = mixHex(c.col[role], "#000000", amount);
  if (c.style === "line") return `fill="${c.col[role]}" fill-opacity="0.28" stroke="${mixHex(c.col[role], "#000000", 0.18)}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  return `fill="${d}"`;
}

/** 라인 스타일의 외곽선 색(선만 그릴 때) */
export const lineColor = (c: Ctx, role: Role): string => (c.style === "line" ? mixHex(c.col[role], "#000000", 0.18) : c.col[role]);

/** 좌상단 광원의 하이라이트 조각(solid·flat만) */
export function shine(c: Ctx, d: string): string {
  if (c.style === "line") return "";
  return `<path d="${d}" fill="#FFFFFF" fill-opacity="${c.style === "solid" ? 0.5 : 0.28}"/>`;
}

/** 하단 소프트 섀도(오른쪽 아래로 살짝 치우침). solid는 방사 그라데이션, flat은 옅은 타원, line은 없음 */
export function shadow(c: Ctx, cx: number, cy: number, rx: number, ry = rx * 0.22): string {
  if (c.style === "line") return "";
  if (c.style === "flat") return `<ellipse cx="${cx + 6}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c.col.n}" fill-opacity="0.16"/>`;
  const gid = `${c.id}-sh`;
  if (!c.defs.some((d) => d.includes(`id="${gid}"`))) {
    c.defs.push(`<radialGradient id="${gid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1B1B18" stop-opacity="0.3"/><stop offset="1" stop-color="#1B1B18" stop-opacity="0"/></radialGradient>`);
  }
  return `<ellipse cx="${cx + 6}" cy="${cy}" rx="${rx * 1.15}" ry="${ry * 1.2}" fill="url(#${gid})"/>`;
}

/** 뒤쪽 큰 도형(구도 변형 3종): 원 / 기울인 둥근 사각 / 물방울 블롭 */
export function back(c: Ctx): string {
  const fillT = c.style === "line" ? `fill="${c.col.t}" fill-opacity="0.18"` : c.style === "flat" ? `fill="${c.col.t}" fill-opacity="0.5"` : `fill="${mixHex(c.col.t, "#FFFFFF", 0.5)}" fill-opacity="0.75"`;
  if (c.v === 0) return `<circle cx="100" cy="102" r="82" ${fillT}/>`;
  if (c.v === 1) return `<rect x="26" y="30" width="148" height="148" rx="34" transform="rotate(-8 100 104)" ${fillT}/>`;
  return `<path d="M44 90 C40 52 84 24 124 34 C166 44 178 92 160 128 C142 166 80 176 54 144 C46 134 45 112 44 90 Z" ${fillT}/>`;
}

/** 작은 장식 점·반짝(앞쪽 장식 레이어) */
export const dot = (c: Ctx, cx: number, cy: number, r: number, role: Role): string => `<circle cx="${cx}" cy="${cy}" r="${r}" ${paint(c, role, { soft: 0.3 })}/>`;
export const spark = (c: Ctx, cx: number, cy: number, r: number, role: Role): string =>
  `<path d="M${cx} ${cy - r} C${cx + r * 0.12} ${cy - r * 0.3} ${cx + r * 0.3} ${cy - r * 0.12} ${cx + r} ${cy} C${cx + r * 0.3} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.3} ${cx} ${cy + r} C${cx - r * 0.12} ${cy + r * 0.3} ${cx - r * 0.3} ${cy + r * 0.12} ${cx - r} ${cy} C${cx - r * 0.3} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.3} ${cx} ${cy - r} Z" ${paint(c, role, { soft: 0.3 })}/>`;

export function wrapSvg(c: Ctx, body: string, label?: string): string {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" ${a11y} style="display:block;width:100%;height:auto"><defs>${c.defs.join("")}</defs>${body}</svg>`;
}
