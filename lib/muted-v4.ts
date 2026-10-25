/**
 * 450차 1 — 소형 글자 muted(잉크 알파) 단계 단일화(DESIGN_V4). 448차 이전부터 잉크 알파 0.4~0.65의 흐린 글자가 40곳 넘게 흩어져(export 36 · 라이브 45)
 * 흰·웜·옅은 색 면 위에서 4.0~4.4:1이었다. 지점마다 고치지 않고 **한 곳의 단계표**가 두 렌더러에 같은 바닥값을 깐다:
 *   weak(원래 ≤0.5) → 0.64 · normal(0.55~0.6) → 0.68 · strong(0.62~0.65) → 0.72
 * 바닥값은 가장 어두운 쪽 옅은 면(휘도 0.8)에서도 4.5:1 이상(회귀 muted-450이 면 키 전수로 확인). 원래 알파가 바닥값 이상이면 건드리지 않는다.
 * export는 인라인 `color:rgba(27,27,24,A)`를 속성 선택자(문서 CSS가 style 내용으로 고르는 선택자 — 반복 style 묶기는 이 문자열을 자동 제외)로,
 * 라이브는 Tailwind `text-ink/NN` 클래스를 같은 값으로 덮는다. `border-color:`·`background-color:` 같은 다른 속성은 선택자가 `color:` 앞 구분자(시작·`;`·공백)를 요구해 건드리지 않는다.
 */
import { BRAND, contrastRatioToken, hexToRgba, mixHex } from "@/lib/design-tokens";

export const MUTED_V4 = { weak: 0.64, normal: 0.68, strong: 0.72 } as const;

/** 원래 알파 → 바닥 단계 */
export const MUTED_MAP: ReadonlyArray<{ from: number; to: number }> = [
  { from: 0.4, to: MUTED_V4.weak }, { from: 0.45, to: MUTED_V4.weak }, { from: 0.5, to: MUTED_V4.weak },
  { from: 0.55, to: MUTED_V4.normal }, { from: 0.6, to: MUTED_V4.normal },
  { from: 0.62, to: MUTED_V4.strong }, { from: 0.65, to: MUTED_V4.strong },
];

const INK = "27,27,24";
const spell = (a: number): string[] => { const s = String(a); return s.startsWith("0.") ? [s, s.slice(1)] : [s]; };

/** export(인라인 style) 바닥 CSS */
export function mutedFloorCssExport(scope: string): string {
  const out: string[] = [];
  for (const m of MUTED_MAP) for (const sp of spell(m.from)) {
    const lit = `color:rgba(${INK},${sp})`;
    out.push(`${scope} [style^="${lit}"],${scope} [style*=";${lit}"],${scope} [style*=" ${lit}"]{color:${hexToRgba(BRAND.ink, m.to)}!important}`);
  }
  return out.join("");
}

/** 라이브(Tailwind text-ink/NN) 바닥 CSS + 인라인 `color: rgba(27,27,24,A)`(React 직렬화 두 철자) */
export function mutedFloorCssLive(scope: string): string {
  const inline: string[] = [];
  for (const m of MUTED_MAP) for (const sp of spell(m.from)) for (const lit of [`color:rgba(${INK},${sp})`, `color: rgba(${INK.replace(/,/g, ", ")}, ${sp})`]) {
    inline.push(`${scope} [style^="${lit}"],${scope} [style*=";${lit}"],${scope} [style*=" ${lit}"]{color:${hexToRgba(BRAND.ink, m.to)}!important}`);
  }
  return inline.join("") + MUTED_MAP.map((m) => `${scope} .text-ink\\/${Math.round(m.from * 100)}{color:${hexToRgba(BRAND.ink, m.to)}!important}`).join("");
}

/**
 * 450차 1 — 색 글자를 **실제 면 색 위에서** 4.5:1이 되게 어둡게(DESIGN_V4). 기존 readableTextAccent/Deep는 종이색(#FAF8F3) 위 기준이라 옅은 틴트 면(휘도 약 0.87) 위에서는 4.3~4.4:1이었다
 * (한눈에 보기 알약 글자·성분 칩). 색상은 유지하고 검정 쪽으로만 섞는다. 이미 충분하면 그대로.
 */
export function readableOnFace(hex: string, faceHex: string, min = 4.6): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !/^#[0-9a-f]{6}$/i.test(faceHex)) return hex;
  for (let k = 0; k <= 1.0001; k += 0.04) { const c = mixHex(hex, "#000000", k); if (contrastRatioToken(c, faceHex) >= min) return c; }
  return "#000000";
}
