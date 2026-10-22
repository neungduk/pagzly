/**
 * 430차 — 조화형 멀티 컬러(디자인 V3 색). 290차부터 본문 섹션 테마 순환이 ["base"] 하나라(THEME_VARIANT_CYCLE) 제품 대표색 1개와 그 옅은 틴트만 나와 "같은 색만" 보였다.
 * 여기서는 제품 대표색(상품 사진에서 추출한 accent)에서 **보조색 2개 + 포인트색 1개**를 색상환 규칙으로 파생하고(유사색·스플릿·삼각), 섹션마다 슬롯(primary/secondary/tertiary/accent)을
 * 순환 배정한다. 중립(오프화이트·잉크)은 그대로 두어 가독성을 지키고, 하드 색 면 예산(428차 ≤6)과 틴트 규칙은 유지한다.
 *  - 색의 개수는 늘리되 조화 규칙 안에서: 한 페이지의 색 면 종류 ≤4 + 중립(슬롯 4개), 인접 섹션은 같은 슬롯이 아니다.
 *  - 채도·명도 상한(촌스러움 방지): 뷰티=저채도 파스텔, 패션 볼드=대비 강한 2색, 전자=쿨 톤 + 포인트 1.
 *  - 접근성: 글자색은 기존 보정(readableTextDeep/Accent)이 4.5:1(큰 글자 3:1)을 맞추고, 색약(적록) 시뮬레이션에서 슬롯 간 색 차(ΔE)가 모자라면 포인트색 명도를 벌린다.
 * 라이브·export는 같은 함수(extendThemeFor)를 쓴다. NEXT_PUBLIC_DESIGN_V3_COLOR=off 면 429차(본문 base 하나)와 같다.
 */
import type { CategoryTheme } from "@/lib/category-theme";
import { resolveTemplateCategory, type TemplateCategory } from "@/lib/section-templates";
import { ensureReadableOnPaper, extendTheme, setThemeCycle, tokenHslToRgb, tokenRgbToHex, tokenRgbToHsl, hueShiftThemeToken, type ExtendedTheme, type ThemeVariantKey } from "@/lib/design-tokens";
import { fontSeed } from "@/lib/font-pairs";

export const DESIGN_V3_COLOR_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V3_COLOR !== "off";

export type HarmonyRule = "analogous" | "split" | "triad" | "cool-point" | "photo-tonal" | "photo-tonal-bold" | "mono-neutral";

/** 규칙 → 보조·3차·포인트 색상 이동(도)과 채도 상한(0~1) */
export const HARMONY_RULES: Record<HarmonyRule, { secondary: number; tertiary: number; accent: number; satCap: number; label: string }> = {
  analogous: { secondary: 32, tertiary: -34, accent: 150, satCap: 0.5, label: "유사색 ±32° + 스플릿 포인트(저채도 파스텔)" },
  split: { secondary: 28, tertiary: -28, accent: 180, satCap: 0.62, label: "유사색 ±28° + 보색 포인트" },
  triad: { secondary: 120, tertiary: -120, accent: 60, satCap: 0.72, label: "삼각(±120°) 대비 + 포인트" },
  "cool-point": { secondary: 24, tertiary: -24, accent: 180, satCap: 0.55, label: "쿨 톤 유사색 + 포인트 1" },
  // 430B: 패션은 보색·삼각을 쓰지 않는다. 사진 톤(대표색·배경 중립색) 안의 명도·채도 변주 + 포인트 1(같은 계열 고채도 또는 골드·브론즈)
  "photo-tonal": { secondary: 20, tertiary: -20, accent: 0, satCap: 0.55, label: "사진 톤 변주(같은 계열 ±20°) + 포인트 1" },
  "photo-tonal-bold": { secondary: 20, tertiary: -20, accent: 0, satCap: 0.7, label: "사진 톤 변주 + 고채도 포인트 1" },
  "mono-neutral": { secondary: 0, tertiary: 0, accent: 0, satCap: 0.12, label: "무채색 + 대표색 1개" },
};

export type PaletteSlot = "primary" | "secondary" | "tertiary" | "accent";
/** 슬롯 → ExtendedTheme 키(기존 변형 구조 재사용) */
export const SLOT_KEY: Record<PaletteSlot, ThemeVariantKey> = { primary: "base", secondary: "warm", tertiary: "cool", accent: "bold" };

/**
 * 본문 섹션에 슬롯을 돌려 배정하는 순서. 4칸 순환이라 인접 섹션은 항상 다른 슬롯이다(색 면 종류 4).
 * 히어로·구매 카드(cta_price)는 getSectionTheme이 primary로 잠근다.
 */
export const PALETTE_CYCLE: ThemeVariantKey[] = ["base", "warm", "cool", "bold"];

export type PaletteInput = { category: string | undefined | null; productName?: string | null; brandName?: string | null; packHeadline?: { kind: "serif" | "sans-display"; weight: number } | null };

/** 카테고리·스타일별 규칙: 뷰티 analogous(파스텔) / 패션 클래식 split·볼드 triad·모노 analogous / 전자·생활 cool-point / 식품·반려 split */
export function harmonyRuleFor(input: PaletteInput): HarmonyRule {
  const cat: TemplateCategory = resolveTemplateCategory(input.category ?? "");
  if (cat === "화장품/뷰티") return "analogous";
  if (cat === "패션/의류") {
    const h = input.packHeadline;
    if (!h || h.kind === "serif") return "photo-tonal";
    return h.weight >= 800 ? "photo-tonal-bold" : "mono-neutral";
  }
  if (cat === "전자/가전" || cat === "생활/리빙") return "cool-point";
  return "split";
}

const hexHsl = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return tokenRgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
};
const hslHex = (h: number, s: number, l: number) => {
  const [r, g, b] = tokenHslToRgb(((h % 360) + 360) % 360, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l)));
  return tokenRgbToHex(r, g, b);
};
/** 채도 상한만 건다(명도·색상은 유지). 이미 낮으면 그대로 */
export function capSaturation(hex: string, max: number): string {
  const { h, s, l } = hexHsl(hex);
  return s <= max ? hex : hslHex(h, max, l);
}

/** 색약(적록) 시뮬레이션 — Machado 2009 deuteranopia(severity 1.0) 행렬, 선형 RGB */
const DEUT = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
const toLin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const fromLin = (v: number) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
export function simulateDeuteranopia(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(toLin);
  const o = DEUT.map((row) => fromLin(row[0]! * lin[0]! + row[1]! * lin[1]! + row[2]! * lin[2]!));
  return `#${o.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
/** CIE76 ΔE (D65) */
export function deltaE(a: string, b: string): number {
  const lab = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    const [r, g, bl] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(toLin) as [number, number, number];
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * bl, z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export type Palette = {
  rule: HarmonyRule;
  /** 슬롯별 대표 색(accent) */
  slots: Record<PaletteSlot, string>;
  themes: Record<PaletteSlot, CategoryTheme>;
};

/** 슬롯 대표색 쌍의 색약 시뮬레이션 최소 ΔE(회귀·보고용) */
export function minColorblindDeltaE(slots: Record<PaletteSlot, string>): number {
  const keys = Object.keys(slots) as PaletteSlot[];
  let min = Infinity;
  for (let i = 0; i < keys.length; i += 1) for (let j = i + 1; j < keys.length; j += 1) min = Math.min(min, deltaE(simulateDeuteranopia(slots[keys[i]!]), simulateDeuteranopia(slots[keys[j]!])));
  return min;
}

function capTheme(t: CategoryTheme, satCap: number): CategoryTheme {
  return { ...t, accent: capSaturation(t.accent, satCap), accentSoft: capSaturation(t.accentSoft, satCap), accentText: capSaturation(t.accentText, satCap), deepAccent: capSaturation(t.deepAccent, satCap + 0.05), baseNeutral: capSaturation(t.baseNeutral, Math.min(satCap, 0.35)) };
}

/** 제품 대표색 테마에서 슬롯 4개를 파생한다. 사진 대표색(primary)은 그대로 두고 나머지만 규칙대로 이동·채도 상한 */
/** 색상환 거리(0~180) */
const hueDist = (a: number, b: number) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };

/** 색상환 계열(군) 수: 45° 이상 떨어진 색상끼리 다른 군. 무채색(채도<0.1)은 세지 않는다 */
export function hueGroupCount(hexes: string[]): number {
  const hs = hexes.map(hexHsl).filter((c) => c.s >= 0.1).map((c) => c.h);
  const groups: number[] = [];
  for (const h of hs) if (!groups.some((g) => hueDist(g, h) < 45)) groups.push(h);
  return groups.length;
}

/** 테마의 accent 계열을 HSL 값으로 다시 맞춘다(soft·text·deep은 같은 색상으로 따라감) */
function themeWithAccentHsl(t: CategoryTheme, h: number, s: number, l: number): CategoryTheme {
  return {
    ...t,
    accent: hslHex(h, s, l),
    accentText: hslHex(h, s, Math.max(0.2, l - 0.08)),
    deepAccent: hslHex(h, Math.min(1, s * 0.9), Math.max(0.12, Math.min(l - 0.14, 0.24))),
    accentSoft: hslHex(h, Math.min(0.6, s), 0.95),
  };
}

/**
 * 패션 팔레트(430B): 보색·삼각 없이 제품 사진 톤 안에서만 변주한다.
 *  - 사진에서 실제로 뽑힌 색은 테마에 대표색(accent)과 배경 중립색(baseNeutral) 둘뿐이다(2~3번째 지배색은 세션에 저장돼 있지 않다).
 *    중립색 색상이 대표색과 12~45° 떨어져 있으면 그 색상을 보조색 1의 방향으로 쓴다(사진의 실제 색). 아니면 대표색 ±20° 변주.
 *  - 보조·3차는 같은 계열 ±20° + 명도(보조 +0.06, 3차 −0.05)·채도(×0.85) 단계. 사진 톤을 못 읽으면(대표색뿐) 대표색 단일 계열 변주로 폴백.
 *  - 포인트 1개: 대표색이 따뜻하면(15~60°) 같은 색상에서 채도만 높임, 아니면 골드·브론즈 중립 금속톤. 한 페이지 색상환 계열 ≤2.
 *  - mono-neutral: 보조·3차는 무채색(채도 0.06), 포인트 = 대표색.
 */
function deriveFashionPalette(base: CategoryTheme, rule: "photo-tonal" | "photo-tonal-bold" | "mono-neutral"): Palette {
  const { h, s, l } = hexHsl(base.accent);
  let secondary: CategoryTheme, tertiary: CategoryTheme, accent: CategoryTheme;
  if (rule === "mono-neutral") {
    const grey = (lightness: number) => themeWithAccentHsl(base, h, 0.06, lightness);
    secondary = { ...grey(0.36), baseNeutral: hslHex(h, 0.04, 0.94) };
    tertiary = { ...grey(0.28), baseNeutral: hslHex(h, 0.03, 0.95) };
    accent = base;
  } else {
    const neutralH = hexHsl(base.baseNeutral);
    const d = ((neutralH.h - h + 540) % 360) - 180; // -180..180
    const photoShift = neutralH.s >= 0.08 && Math.abs(d) >= 12 && Math.abs(d) <= 45 ? d : 20;
    const sat = Math.min(HARMONY_RULES[rule].satCap, s * 0.85);
    secondary = capTheme(themeWithAccentHsl(hueShiftThemeToken(base, photoShift), h + photoShift, sat, Math.min(0.52, l + 0.06)), HARMONY_RULES[rule].satCap);
    tertiary = capTheme(themeWithAccentHsl(hueShiftThemeToken(base, -Math.sign(photoShift || 1) * 20), h - Math.sign(photoShift || 1) * 20, sat, Math.max(0.24, l - 0.05)), HARMONY_RULES[rule].satCap);
    const warm = h >= 15 && h <= 60;
    const boost = rule === "photo-tonal-bold" ? 1.45 : 1.25;
    accent = warm ? themeWithAccentHsl(base, h, Math.min(0.82, s * boost), Math.max(0.3, l - 0.02)) : themeWithAccentHsl(base, 38, 0.55, 0.38);
  }
  const themes: Record<PaletteSlot, CategoryTheme> = { primary: base, secondary, tertiary, accent };
  return { rule, slots: { primary: base.accent, secondary: secondary.accent, tertiary: tertiary.accent, accent: accent.accent }, themes };
}

export function derivePalette(base: CategoryTheme, rule: HarmonyRule): Palette {
  if (rule === "photo-tonal" || rule === "photo-tonal-bold" || rule === "mono-neutral") return deriveFashionPalette(base, rule);
  const r = HARMONY_RULES[rule];
  const themes: Record<PaletteSlot, CategoryTheme> = {
    primary: base,
    secondary: capTheme(hueShiftThemeToken(base, r.secondary), r.satCap),
    tertiary: capTheme(hueShiftThemeToken(base, r.tertiary), r.satCap),
    accent: capTheme(hueShiftThemeToken(base, r.accent), r.satCap),
  };
  const slotColors = (): Record<PaletteSlot, string> => ({ primary: themes.primary.accent, secondary: themes.secondary.accent, tertiary: themes.tertiary.accent, accent: themes.accent.accent });
  // 색약(적록) 시뮬레이션에서 슬롯이 서로 구분되지 않으면(최소 ΔE<14) 가장 가까운 쌍의 뒤쪽 슬롯(primary는 제품 대표색이라 그대로)을 명도·색상 소폭 이동 후보 중 최소 ΔE를 가장 키우는 쪽으로 옮긴다
  const order: PaletteSlot[] = ["primary", "secondary", "tertiary", "accent"];
  const minDe = (colors: Record<PaletteSlot, string>) => minColorblindDeltaE(colors);
  for (let i = 0; i < 10; i += 1) {
    const colors = slotColors();
    if (minDe(colors) >= 14) break;
    let worst: { b: PaletteSlot; de: number } | null = null;
    for (let x = 0; x < order.length; x += 1) {
      for (let y = x + 1; y < order.length; y += 1) {
        const de = deltaE(simulateDeuteranopia(colors[order[x]!]), simulateDeuteranopia(colors[order[y]!]));
        if (!worst || de < worst.de) worst = { b: order[y]!, de };
      }
    }
    if (!worst) break;
    const mover = worst.b;
    const { h, s, l } = hexHsl(themes[mover].accent);
    let best = { hex: themes[mover].accent, score: minDe(colors) };
    for (const [dh, dl] of [[0, 0.08], [0, -0.08], [20, 0], [-20, 0], [40, 0], [-40, 0], [20, 0.08], [-20, -0.08], [40, 0.08], [-40, -0.08]] as Array<[number, number]>) {
      const cand = hslHex(h + dh, s, Math.min(0.66, Math.max(0.18, l + dl)));
      const score = minDe({ ...colors, [mover]: cand });
      if (score > best.score) best = { hex: cand, score };
    }
    if (best.hex === themes[mover].accent) break;
    themes[mover] = { ...themes[mover], accent: best.hex };
  }
  return { rule, slots: slotColors(), themes };
}

/**
 * 렌더러·export 공통 진입점: 플래그가 켜져 있고 대상(뷰티·패션 우선, 그 밖은 규칙 적용)이면 조화형 변형을 만들어 섹션 순환(PALETTE_CYCLE)을 건 ExtendedTheme을 돌려준다.
 * 플래그 off면 기존 extendTheme(본문 base 하나) 그대로.
 */
export function extendThemeFor(base: CategoryTheme, input: PaletteInput, enabled: boolean = DESIGN_V3_COLOR_ENABLED): ExtendedTheme {
  const legacy = extendTheme(base);
  if (!enabled) return legacy;
  const pal = derivePalette(base, harmonyRuleFor(input));
  const ext: ExtendedTheme = { base: pal.themes.primary, warm: pal.themes.secondary, cool: pal.themes.tertiary, bold: pal.themes.accent };
  // 같은 상품은 항상 같은 시작 위치(라이브·export·재불러오기 동일): 시드로 4칸 순환을 회전
  const shift = fontSeed(input.productName, input.brandName) % PALETTE_CYCLE.length;
  const cycle = PALETTE_CYCLE.map((_, i) => PALETTE_CYCLE[(i + shift) % PALETTE_CYCLE.length]!);
  return setThemeCycle(ext, cycle);
}

/**
 * 인포 구간(사용 단계·세탁 관리·숫자 칸)의 라벨 칩·번호·구분선·아이콘 원·수치 배지를 팔레트 슬롯 색으로 분산한다(428차 ±15° 아이콘 변주 대신 슬롯 색 사용).
 * 사용 단계 = secondary, 세탁·관리 = tertiary, 숫자 칸 배지 = accent 슬롯. 흰 글자 대비 4.5:1은 ensureReadableOnPaper가 보정한다. level이 calm이면 빈 문자열.
 */
export function paletteInfoCss(scope: string, ext: ExtendedTheme, level: string | undefined): string {
  if (!level || level === "calm") return "";
  const sec = ensureReadableOnPaper(ext.warm.accent, 4.5);
  const ter = ensureReadableOnPaper(ext.cool.accent, 4.5);
  const acc = ensureReadableOnPaper(ext.bold.accent, 4.5);
  const IMP = "!important";
  const rule = (sel: string, decl: string) => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;
  const steps = `${scope} [data-info="steps"]`;
  const care = `${scope} [data-info="care"]`;
  const statnum = `${scope} [data-info="statnum"]`;
  return [
    rule(steps, `border-top-color:${sec}`),
    rule(`${steps} ol>li`, `border-left-color:${sec}`),
    rule(`${steps} ol>li>div:first-child>span,${steps} ol>li>span:first-child`, `color:${sec}`),
    rule(`${steps} ol>li>div:last-child>p`, `background:${sec}`),
    `${steps} ol>li+li::before{background:${sec}!important}`,
    rule(care, `border-top-color:${ter}`),
    rule(`${care} [data-caution-list] li>span:first-child`, `background:${ter}`),
    rule(`${statnum}>div>div>:first-child`, `background:${acc}`),
  ].join("");
}
