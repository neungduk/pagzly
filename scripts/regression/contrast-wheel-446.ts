/**
 * 회귀 — 446차 1: 대표색 색상환 전수. 색상 12단(30° 간격) × 채도·명도 3단 × 합성 픽스처 4종에서 린트 R7(대비) 위반 0(수정 전 같은 방식으로 세면 수백 건),
 * v4SafeTheme 순수 불변식(이미 안전하면 같은 객체·색상 유지·명도만 낮춤·두 번 적용해도 같음), 구매 섹션 구조 불변(`data-pz-buy` 수·`pagzly-cta` 수가 어떤 색상에서도 같다). 호출 0·서버 0.
 */
import { v4SafeTheme, LIGHT_TINT_FLOOR } from "../../lib/palette-v4";
import { contrastRatioToken } from "../../lib/design-tokens";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { corpus, exportArgsOf, readSession } from "../design-corpus";
import { TONES, synthTheme, sweep } from "../contrast-sweep";
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";

export const name = "색상환 R7 전수 — 12색 × 3단 × 4픽스처 위반 0·테마 보정 불변식·구매 섹션 구조 불변";

const hueOf = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const d = mx - mn; const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
const lumOf = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const hues = Array.from({ length: 12 }, (_, i) => i * 30);
  const fixtures = ["fx-compare-beauty", "fx-tier-rich-fashion-6p", "fx-food-snack", "fx-tier-rich-tech-6p"];
  const v = sweep(fixtures, hues, TONES);
  if (v.length) fails.push(`R7 위반 ${v.length}건: ${v.slice(0, 5).map((x) => `${x.hue}°/${x.tone}/${x.fixture} ${x.msg}`).join(" | ")}`);

  // 순수 불변식
  let changed = 0, same = 0;
  for (const h of hues) for (const t of TONES) {
    const th = synthTheme(h, t);
    const a = v4SafeTheme(th);
    const b = v4SafeTheme(a);
    if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(`${h}°/${t.id}: 두 번 적용하면 달라짐`);
    if (a === th) { same += 1; continue; }
    changed += 1;
    for (const k of ["accent", "deepAccent", "accentText"] as const) {
      if (lumOf(a[k]) > lumOf(th[k]) + 0.001) fails.push(`${h}°/${t.id}: ${k}가 밝아짐`);
      const dh = Math.abs(((hueOf(a[k]) - hueOf(th[k]) + 540) % 360) - 180);
      if (th[k] !== a[k] && dh > 8) fails.push(`${h}°/${t.id}: ${k} 색상이 ${dh.toFixed(0)}° 바뀜`);
    }
    if (contrastRatioToken(a.accentText, LIGHT_TINT_FLOOR) < 4.5) fails.push(`${h}°/${t.id}: accentText 대비 미달`);
    if (contrastRatioToken("#FAF8F3", a.accent) < 4.5) fails.push(`${h}°/${t.id}: accent 면 위 종이색 글자 대비 미달`);
  }
  if (!changed || !same) fails.push(`표본 부족(보정 ${changed}, 불변 ${same})`);
  // 이미 안전한 테마는 같은 객체
  const safe = buildThemeFromHueWithNeutral(250, STUDIO_NEUTRAL_SAMPLE);
  if (contrastRatioToken(safe.accentText, LIGHT_TINT_FLOOR) >= 4.6 && contrastRatioToken("#FAF8F3", safe.accent) >= 4.6 && v4SafeTheme(safe) !== safe) fails.push("안전한 테마는 같은 객체여야 함");

  // 구매 섹션 구조 불변: 색상이 달라도 표식·섹션 수는 같다
  for (const [, file] of corpus({ only: ["fx-compare-beauty"] })) {
    const a = exportArgsOf(readSession(file));
    const counts = new Set<string>();
    for (const h of hues) {
      const html = buildDetailPageHtml({ ...a, theme: { ...a.theme, ...synthTheme(h, TONES[1]!) } });
      counts.add(`${(html.match(/data-pz-buy="1"/g) ?? []).length}/${(html.match(/class="pagzly-cta"/g) ?? []).length}/${(html.match(/data-info="buy"/g) ?? []).length}`);
    }
    if (counts.size !== 1) fails.push(`구매 섹션 구조가 색상에 따라 달라짐: ${[...counts].join(", ")}`);
    if (/^\d+\/0\//.test([...counts][0]!)) fails.push("export 구매 섹션(pagzly-cta)이 없음");
  // 라이브 data-pz-buy 표식은 소스에 정확히 1개(결제 마크업 불변)
  const liveSrc = (await import("node:fs")).readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  if ((liveSrc.match(/data-pz-buy="1"/g) ?? []).length !== 1) fails.push("라이브 data-pz-buy 마크가 1개가 아님");
  }
  return fails;
}
