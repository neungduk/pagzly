/**
 * 회귀 — 447차 2-c 히어로 포화 면 채도·명도 상한(HERO_FACE_CAP, OKLCH). 12개 색상 전부에서 면 채도 ≤ 상한, 명도 ≤ 상한, 흰 글자 4.5:1, 색상 변화 ≤ 8°,
 * 상한 안의 면은 그대로, 이미 낮은 채도(청록)는 건드리지 않음, v4 off는 입력 그대로.
 */
import { HERO_FACE_CAP } from "../../lib/design-tokens-v4";
import { capFaceChroma, heroFaceColor, hexToOklch, oklchToHex, saturatedFace } from "../../lib/hero-spec";
import { contrastRatioToken } from "../../lib/design-tokens";
import { setDesignV4ForTests, DESIGN_V4_ENABLED } from "../../lib/design-v4";

export const name = "히어로 포화 면 상한 — 12색상 채도·명도 ≤ 토큰·흰 글자 4.5:1·색상 유지·상한 안은 그대로·off 그대로";

const hsl = (h: number, s: number, l: number): string => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0"); return `#${to(r)}${to(g)}${to(b)}`.toUpperCase(); };
const hd = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };
  ok(HERO_FACE_CAP.chroma > 0.1 && HERO_FACE_CAP.chroma < 0.3, "채도 상한 값 범위");
  const rt = hexToOklch(oklchToHex(0.55, 0.08, 200)); ok(Math.abs(rt.C - 0.08) < 0.01 && hd(rt.h, 200) < 2, `OKLCH 왕복 ${JSON.stringify(rt)}`);
  let capped = 0;
  for (let h = 0; h < 360; h += 30) {
    const raw = saturatedFace(hsl(h, 0.7, 0.45));
    const face = heroFaceColor(hsl(h, 0.7, 0.45), { hue: h, source: "keyword" }).face;
    const a = hexToOklch(raw), o = hexToOklch(face);
    ok(o.C <= HERO_FACE_CAP.chroma + 0.012, `${h}°: 채도 ${o.C.toFixed(3)} > 상한`);
    ok(o.L <= HERO_FACE_CAP.lightness + 0.012, `${h}°: 명도 ${o.L.toFixed(3)} > 상한`);
    ok(contrastRatioToken("#FFFFFF", face) >= 4.5, `${h}°: 흰 글자 ${contrastRatioToken("#FFFFFF", face).toFixed(2)}`);
    ok(hd(a.h, o.h) <= 8, `${h}°: 색상 이동 ${hd(a.h, o.h).toFixed(1)}°`);
    if (a.C <= HERO_FACE_CAP.chroma && a.L <= HERO_FACE_CAP.lightness) ok(face === raw, `${h}°: 상한 안인데 바뀜 ${raw} → ${face}`);
    else capped += 1;
  }
  ok(capped >= 4 && capped <= 9, `상한에 걸린 색상 수 ${capped}/12 (너무 적거나 많으면 값 재검토)`);
  setDesignV4ForTests(false);
  try { ok(capFaceChroma("#1212D9") === "#1212D9", "v4 off는 그대로"); } finally { setDesignV4ForTests(DESIGN_V4_ENABLED); }
  return fails;
}
