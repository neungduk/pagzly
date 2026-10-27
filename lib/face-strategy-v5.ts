/**
 * 466차 V5 — 면 전략(Face Strategy). 아키타입마다 "밝은 종이 위에서 말하는가, 진한 면을 교대로 쓰는가"를 정한다.
 *   lightOnly    밝은 종이 + 선·숫자·여백. 진한 면 없음(일반 섹션의 진한 강조 블록도 밝게)
 *   tintAlt      옅은 틴트·중립 면 교대. 진한 면 없음
 *   blockAlt     흰 면과 진한 면(invert) 교대. 진한 면 2~3개
 *   colorCollide 포인트 색 면과 진한 면이 부딪힘. 진한 면 3~4개
 * 라이브·export는 같은 함수(`faceCycleOf`·`darkPaletteOf`)를 읽는다. V5 꺼짐·편집 모드에서는 호출되지 않는다.
 * 새 문구 없음 — 색과 면 역할만 바꾼다.
 */
import type { V4Palette } from "@/lib/palette-v4";
import { ensureContrast } from "@/lib/palette-v4";
import { mixHex } from "@/lib/design-tokens";
import type { DetailSection, V4Block } from "@/lib/types/generate";

export type FaceStrategy = "lightOnly" | "tintAlt" | "blockAlt" | "colorCollide";
type Face = NonNullable<V4Block["face"]>;

/** 전략별 v4 블록 면 순환(시드가 시작 위치를 정한다). 진한 면(invert)은 `DARK_FACE_OK` 변형에만 실제로 적용된다(layout-variants가 거른다) */
export const FACE_CYCLES: Record<FaceStrategy, Face[]> = {
  lightOnly: ["bgA", "bgB", "bgA", "emphasis", "bgA", "bgB"],
  tintAlt: ["emphasis", "bgB", "grad0", "emphasis", "bgA", "grad1"],
  blockAlt: ["invert", "bgA", "invert", "emphasis", "invert", "bgB"],
  colorCollide: ["invert", "invert", "grad1", "invert", "invert", "emphasis"],
};

export const faceCycleOf = (strategy: FaceStrategy): Face[] => FACE_CYCLES[strategy];

/** 진한 면 전략인가 */
export const isDarkStrategy = (s: FaceStrategy): boolean => s === "blockAlt" || s === "colorCollide";

/** 일반 섹션의 진한 강조 블록(boldBlock)을 밝게 바꾸는 전략인가 */
export const lightensBoldBlock = (s: FaceStrategy): boolean => s === "lightOnly" || s === "tintAlt";

const WHITE = "#FFFFFF";

/**
 * 진한 면(invert) 위에서 v4 블록 렌더러가 쓰는 팔레트. 렌더러는 팔레트 의미값(ink·deep·tints·faces)만 읽으므로,
 * 값의 의미를 어두운 면에 맞게 뒤집는다: ink=밝은 글자, deep=밝은 강조색, tints=면에서 밝아지는 단계, 카드 면=면보다 살짝 밝은 패널.
 * 대비는 회귀(scripts/contrast-audit-466.ts)가 팔레트 전수에서 확인한다.
 */
export function darkPaletteOf(p: V4Palette): V4Palette {
  const bg = p.faces.invert;
  const panel = mixHex(bg, WHITE, 0.1);
  const tints: V4Palette["tints"] = [mixHex(bg, WHITE, 0.06), mixHex(bg, WHITE, 0.1), mixHex(bg, WHITE, 0.15), mixHex(bg, WHITE, 0.3), mixHex(bg, WHITE, 0.46)];
  const ink = ensureContrast(WHITE, bg, 7);
  const deep = ensureContrast(mixHex(p.accent, WHITE, 0.55), tints[2], 5.1);
  const sub = ensureContrast("#E9E6E1", bg, 5.1);
  const faces = { bgA: bg, bgB: mixHex(bg, "#000000", 0.18), emphasis: panel, invert: bg, card: panel };
  const on = { text: ink, sub, strong: deep };
  return {
    ...p, ink, deep, tints, faces,
    secondary: ensureContrast(mixHex(p.secondary, WHITE, 0.4), bg, 3),
    tertiary: ensureContrast(mixHex(p.tertiary, WHITE, 0.4), bg, 3),
    point: ensureContrast(mixHex(p.point, WHITE, 0.3), bg, 3),
    onFace: { bgA: on, bgB: on, emphasis: on, invert: on, card: on },
    gradients: [`linear-gradient(180deg,${bg} 0%,${faces.bgB} 100%)`, `linear-gradient(135deg,${panel} 0%,${bg} 100%)`],
  };
}

const lumOf = (hex: string): number => {
  const n = parseInt(hex.slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};

/**
 * 어두운 면용 마크업 보정(렌더러가 상수로 쓴 흰색·옅은 색을 팔레트 의미에 맞게): 
 *  ① 옅은 단색 배경(휘도 > 0.55)은 어두운 패널 면으로 — 흰 카드 위 글자색(팔레트 ink)이 밝은 색이 되었기 때문
 *  ② 강조색(deep) 바탕 위 흰 글자는 면 색 글자로(deep이 어두운 면 위에서 밝은 색이므로)
 *  ③ 흰 선·채움 아이콘은 면 색으로(②와 같은 이유)
 * 그라데이션·알파가 있는 배경은 건드리지 않는다. 대비는 scripts/contrast-audit-466.ts가 팔레트 전수에서 확인한다.
 */
export function invertFixHtml(html: string, dark: V4Palette): string {
  const bg = dark.faces.invert;
  const panel = dark.faces.card;
  const deep = dark.deep.toLowerCase();
  let out = html.replace(/background:(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g, (m, c: string) => (lumOf(c) > 0.55 ? `background:${panel}` : m));
  out = out.replace(/style="([^"]*)"/g, (m, st: string) => {
    if (!/color:#FFFFFF/i.test(st)) return m;
    const lower = st.toLowerCase();
    return lower.includes(`background:${deep}`) ? `style="${st.replace(/color:#FFFFFF/gi, `color:${bg}`)}"` : m;
  });
  out = out.replace(/(stroke|fill)="#FFFFFF"/gi, `$1="${bg}"`);
  return out;
}

/**
 * lightOnly·tintAlt 전략: 일반 섹션의 진한 강조 블록(boldBlock — 큰 진한 면 + 안쪽 진한 카드)을 밝은 일반 면으로 되돌린다(표시용 복사본, 원본·편집 모드 불변).
 * 두 렌더러가 같은 필드(`boldBlock`)를 읽으므로 라이브·export가 함께 바뀐다.
 */
export function lightenBoldBlocks(sections: DetailSection[]): DetailSection[] {
  let changed = false;
  const out = sections.map((s) => {
    if ((s.type === "highlight_box" || s.type === "checklist") && s.boldBlock) { changed = true; return { ...s, boldBlock: false } as DetailSection; }
    return s;
  });
  return changed ? out : sections;
}
