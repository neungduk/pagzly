/**
 * 회귀 — 430차 조화형 멀티 컬러. 규칙별 슬롯 4개(primary·secondary·tertiary·accent)의 색상 이동·채도 상한, 모든 슬롯 테마의 글자 대비(4.5:1, 큰 글자 3:1),
 * 색약(적록) 시뮬레이션 슬롯 구분(ΔE), 섹션 순환에서 인접 섹션이 같은 슬롯이 아님(잠금 섹션 제외)·페이지당 슬롯 종류 ≤4, 플래그 off=기존(본문 base 하나), 결정성. 호출 0.
 * 저장 세션 5종(파일이 있을 때)으로 실제 섹션 순서에서도 같은 점검을 한다.
 */
import fs from "node:fs";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken, FLAT_PAPER, getSectionTheme, readableTextAccent, readableTextDeep, tokenHslToRgb, tokenRgbToHex } from "../../lib/design-tokens";
import { HARMONY_RULES, PALETTE_CYCLE, derivePalette, extendThemeFor, harmonyRuleFor, hueGroupCount, minColorblindDeltaE, type HarmonyRule } from "../../lib/palette-harmony";
import { BRAND } from "../../lib/design-tokens";
import { pastelFace } from "../../lib/design-tokens";
import { dividerCss, dividerStyleFor, faceSequence } from "../../lib/section-dividers";

export const name = "조화형 멀티 컬러 — 규칙·채도 상한·대비·색약 구분·인접 같은 슬롯 0·페이지 슬롯 ≤4·flag off 기존·결정성";

const hueTheme = (hue: number): CategoryTheme => {
  const hex = (h: number, s: number, l: number) => { const [r, g, b] = tokenHslToRgb(h, s, l); return tokenRgbToHex(r, g, b); };
  const base = getCategoryTheme("화장품/뷰티");
  return { ...base, accent: hex(hue, 0.6, 0.38), accentSoft: hex(hue, 0.5, 0.82), accentText: hex(hue, 0.6, 0.3), deepAccent: hex(hue, 0.55, 0.2), baseNeutral: hex(hue, 0.25, 0.93) };
};
const SESSIONS = ["review/411-live/fashion/session.json", "review/414-live/fashion/session.json", "review/417-live/fashion/session.json", "review/418-live/beauty/session.json", "review/422-live/beauty/session.json"];
const LOCKED = new Set(["hero", "cta_price"]);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };

  // 규칙 선택
  eq("뷰티 analogous", harmonyRuleFor({ category: "화장품/뷰티" }), "analogous");
  eq("패션 클래식 photo-tonal·볼드 photo-tonal-bold·모노 mono-neutral(보색·삼각 폐기)", [harmonyRuleFor({ category: "의류/패션" }), harmonyRuleFor({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 900 } }), harmonyRuleFor({ category: "의류/패션", packHeadline: { kind: "sans-display", weight: 600 } })], ["photo-tonal", "photo-tonal-bold", "mono-neutral"]);
  eq("전자 cool-point", harmonyRuleFor({ category: "전자제품" }), "cool-point");

  // 슬롯·대비·색약: 12색상 × 4규칙
  let worstCb = Infinity;
  for (const rule of Object.keys(HARMONY_RULES) as HarmonyRule[]) {
    for (let hue = 0; hue < 360; hue += 30) {
      const pal = derivePalette(hueTheme(hue), rule);
      for (const [slot, t] of Object.entries(pal.themes)) {
        if (contrastRatioToken(readableTextDeep(t), FLAT_PAPER) < 4.5) fails.push(`${rule}/${hue}/${slot}: 진한 글자 대비 < 4.5`);
        if (contrastRatioToken(readableTextAccent(t, 3), FLAT_PAPER) < 3) fails.push(`${rule}/${hue}/${slot}: 큰 글자 대비 < 3`);
        if (contrastRatioToken(BRAND.ink, t.baseNeutral) < 4.5) fails.push(`${rule}/${hue}/${slot}: 중립 띠 위 본문 대비 < 4.5`);
      }
      // 보조·3차 슬롯 채도는 상한 이하(+허용오차)
      const sat = (hex: string) => { const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };
      if (sat(pal.themes.secondary.accent) > HARMONY_RULES[rule].satCap + 0.03) fails.push(`${rule}/${hue}: 보조색 채도 상한 초과`);
      // 430B: 패션 규칙은 같은 계열의 명도·채도 변주가 목적이라 색약 ΔE 기준에서 제외하고, 대신 색상환 계열 수(≤2)를 점검한다
      const fashionRule = rule === "photo-tonal" || rule === "photo-tonal-bold" || rule === "mono-neutral";
      if (fashionRule) { const g = hueGroupCount(Object.values(pal.slots)); if (g > 2) fails.push(`${rule}/${hue}: 색상환 계열 ${g}개 > 2`); if (rule === "mono-neutral" && g > 1) fails.push(`mono-neutral/${hue}: 무채색+대표색 1개가 아님(계열 ${g})`); }
      else worstCb = Math.min(worstCb, minColorblindDeltaE(pal.slots));
    }
  }
  if (worstCb < 8) fails.push(`색약 시뮬레이션 슬롯 최소 ΔE ${worstCb.toFixed(1)} < 8`);

  // 섹션 순환: 합성 페이지(본문 12개) + 저장 세션
  const check = (label: string, types: string[], theme: CategoryTheme, input: { category: string; productName: string; brandName: string }) => {
    const ext = extendThemeFor(theme, input, true);
    let body = 0;
    const keys: Array<{ key: string; locked: boolean }> = [];
    types.forEach((t) => {
      if (t === "hero") { keys.push({ key: "base", locked: true }); return; }
      const th = getSectionTheme(ext, t, body);
      body += 1;
      const key = (Object.keys(ext) as Array<keyof typeof ext>).find((k) => ext[k] === th)!;
      keys.push({ key, locked: LOCKED.has(t) });
    });
    let adj = 0;
    for (let i = 1; i < keys.length; i += 1) if (keys[i]!.key === keys[i - 1]!.key && !keys[i]!.locked && !keys[i - 1]!.locked) adj += 1;
    if (adj > 0) fails.push(`${label}: 인접 같은 슬롯 ${adj}회`);
    const kinds = new Set(keys.filter((k) => !k.locked).map((k) => k.key));
    if (kinds.size > 4) fails.push(`${label}: 슬롯 종류 ${kinds.size} > 4`);
    if (types.length >= 8 && kinds.size < 4) fails.push(`${label}: 슬롯 ${kinds.size}종만 사용(4종 기대)`);
  };
  const synth = ["hero", ...Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? "image_text" : i % 3 === 1 ? "checklist" : "highlight_box")), "cta_price"];
  check("합성 페이지", synth, getCategoryTheme("화장품/뷰티"), { category: "화장품/뷰티", productName: "p", brandName: "b" });
  for (const f of SESSIONS) {
    if (!fs.existsSync(f)) continue;
    const s = JSON.parse(fs.readFileSync(f, "utf8"));
    const g = s.generated ?? s;
    check(f.split("/")[1]!, (g.sections ?? s.sections).map((x: { type: string }) => x.type), { ...getCategoryTheme(s.category), ...(g.theme ?? s.theme ?? {}) }, { category: s.category, productName: s.productName, brandName: s.brandName ?? "" });
  }

  // flag off = 기존(본문 base 하나), 결정성
  const th = getCategoryTheme("화장품/뷰티");
  const off = extendThemeFor(th, { category: "화장품/뷰티", productName: "p" }, false);
  eq("off: 본문 전부 base", [0, 1, 2, 3, 4].map((i) => getSectionTheme(off, "image_text", i) === off.base), [true, true, true, true, true]);
  const on1 = extendThemeFor(th, { category: "화장품/뷰티", productName: "p", brandName: "b" }, true);
  const on2 = extendThemeFor(th, { category: "화장품/뷰티", productName: "p", brandName: "b" }, true);
  eq("결정성", [0, 1, 2, 3].map((i) => getSectionTheme(on1, "checklist", i).accent), [0, 1, 2, 3].map((i) => getSectionTheme(on2, "checklist", i).accent));
  eq("순환 길이", PALETTE_CYCLE.length, 4);

  // ── 430B 슬롯 파스텔 면: 명도 L≥0.92(또는 흰색 폴백), 그 면 위 글자 대비 통과, 인접 면이 서로 다름, 구분선은 안전한 CSS만 ──
  const hslL = (hex: string) => { const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; return (Math.max(r, g, b) + Math.min(r, g, b)) / 2; };
  for (const cat of ["화장품/뷰티", "의류/패션", "식품", "전자제품", "생활용품", "반려동물"]) {
    for (let hue = 0; hue < 360; hue += 30) {
      const ext = extendThemeFor(hueTheme(hue), { category: cat, productName: "p", brandName: "b" }, true);
      for (const t of [ext.base, ext.warm, ext.cool, ext.bold]) {
        const face = pastelFace(t, cat);
        if (face !== FLAT_PAPER) {
          if (hslL(face) < 0.915) fails.push(`${cat}/${hue}: 파스텔 명도 ${hslL(face).toFixed(2)} < 0.92`);
          if (contrastRatioToken(readableTextDeep(t), face) < 4.5) fails.push(`${cat}/${hue}: 파스텔 위 진한 글자 대비 < 4.5`);
          if (contrastRatioToken(readableTextAccent(t, 3), face) < 3) fails.push(`${cat}/${hue}: 파스텔 위 큰 글자 대비 < 3`);
          if (contrastRatioToken(BRAND.ink, face) < 4.5) fails.push(`${cat}/${hue}: 파스텔 위 본문 대비 < 4.5`);
        }
      }
    }
  }
  // 합성 페이지: 연속한 단색 면이 같은 색이면(흰색 제외) 안 된다
  const plain = ["hero", ...Array.from({ length: 14 }, (_, i) => "checklist"), "cta_price"].map((type) => ({ type }));
  for (const cat of ["화장품/뷰티", "식품/건강기능식품", "전자제품"]) {
    const ext = extendThemeFor(getCategoryTheme(cat === "전자제품" ? "전자제품" : cat), { category: cat, productName: "p", brandName: "b" }, true);
    const faces = faceSequence(plain, ext, cat, "calm");
    for (let i = 1; i < faces.length; i += 1) if (faces[i] && faces[i] === faces[i - 1] && faces[i] !== FLAT_PAPER) fails.push(`${cat}: 인접 같은 색 면 (${i})`);
    const css = dividerCss({ scope: ".pagzly-wrap", mode: "export", sections: plain, ext, category: cat, info: "calm" });
    if (/:has\(|@container|text-wrap/.test(css)) fails.push(`${cat}: 구분선 CSS에 export 금지 기법`);
    if (!css.includes("::before")) fails.push(`${cat}: 구분선이 하나도 없음`);
  }
  eq("구분선 종류(뷰티 곡선·식품 곡선·전자 사선·패션 없음)", [dividerStyleFor("화장품/뷰티"), dividerStyleFor("식품/건강기능식품"), dividerStyleFor("전자제품"), dividerStyleFor("의류/패션")], ["wave", "wave", "slant", null]);
  eq("패션 구분선 CSS 없음", dividerCss({ scope: "x", mode: "live", sections: plain, ext: extendThemeFor(getCategoryTheme("의류/패션"), { category: "의류/패션" }, true), category: "의류/패션", info: "calm" }), "");
  return fails;
}
