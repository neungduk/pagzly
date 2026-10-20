/**
 * 회귀 — 415차 인포 구간(info 축). calm은 마크업·CSS·코드가 그대로, bold/dramatic은 라이브·export가 같은 CSS 한 벌(새 CSS 기능 없음),
 * 옛 스펙 코드는 calm으로 해석, 글자 대비(12 hue × 2 모드), 본문 최소 15px. 유료 호출 0.
 */
import { decodeSpec, encodeSpec, packFromSpec, type SpecAxes } from "../../lib/style-packs";
import { infoAttr, infoColorsOf, infoCss, infoData, ipAttr, splitLead, INFO_BODY_MIN_PX } from "../../lib/info-style";
import { directStyle } from "../../lib/style-director";
import { HUES, infoContrastLint } from "../../lib/style-lint";
import { applyPackTone } from "../../lib/style-packs";
import { buildThemeFromHueWithNeutral, STUDIO_NEUTRAL_SAMPLE } from "../../lib/color-extract";
import { getCategoryTheme, type CategoryTheme } from "../../lib/category-theme";

export const name = "인포 구간(info 축) — calm 불변·코드 호환·대비·본문 15px·새 CSS 기능 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // calm: 속성·CSS 모두 빈 값
  const calm = { info: "calm" as const };
  if (infoAttr(calm, "steps") !== "" || ipAttr(calm, "x") !== "" || Object.keys(infoData(calm, "steps")).length) fails.push("calm인데 속성이 붙음");
  const theme = applyPackTone({ ...getCategoryTheme("의류/패션"), ...buildThemeFromHueWithNeutral(30, STUDIO_NEUTRAL_SAMPLE) } as CategoryTheme, null);
  const colors = infoColorsOf(theme);
  if (infoCss("calm", ".pagzly-wrap", colors) !== "" || infoCss(undefined, ".pagzly-wrap", colors) !== "") fails.push("calm인데 CSS가 나옴");
  // 코드: 옛 코드(info 키 없음)는 calm, calm 인코딩에는 info 키가 없다, bold 왕복
  const axes = directStyle({
    category: "의류/패션", targetCustomer: "30~40대 여성", price: 59000, hasBrand: true, productName: "니트", moodText: "따뜻하고 담백한 우아한", accentHex: "#A26837",
    photos: { total: 8, worn: 5, detail: 2, flat: 1, other: 0, heroWorn: true, galleryCount: 4 }, text: { sectionCount: 27, bodyChars: 3600, hasSizeTable: true }, seed: "info-regression",
  }).axes;
  const calmAxes: SpecAxes = { ...axes, info: "calm" };
  const calmCode = encodeSpec(calmAxes);
  if (calmCode.includes('"info"')) fails.push("calm 코드에 info 키가 있음(기존 코드와 달라짐)");
  if (decodeSpec(calmCode)?.info !== "calm") fails.push("info 없는 옛 코드가 calm으로 풀리지 않음");
  for (const lv of ["bold", "dramatic"] as const) {
    const code = encodeSpec({ ...axes, info: lv });
    if (decodeSpec(code)?.info !== lv) fails.push(`${lv} 왕복 실패`);
    if (packFromSpec({ ...axes, info: lv }).layout.info !== lv) fails.push(`${lv} 레이아웃에 info 없음`);
  }
  if (decodeSpec(calmCode.slice(0, -1) + ',"info":"x"}') !== null) fails.push("잘못된 info 값이 통과함");
  // CSS: 라이브·export 같은 규칙(스코프만 다름), 새 CSS 기능 없음, 본문 최소 크기
  for (const lv of ["bold", "dramatic"] as const) {
    const live = infoCss(lv, "[data-pz-pack]", colors);
    const exp = infoCss(lv, ".pagzly-wrap", colors);
    if (!live || live.replace(/\[data-pz-pack\]/g, "S") !== exp.replace(/\.pagzly-wrap/g, "S")) fails.push(`${lv} 라이브·export CSS가 스코프 외에 다름`);
    if (/:has\(|@container|text-wrap|@supports|backdrop-filter/.test(exp)) fails.push(`${lv} export에 새 CSS 기능이 들어감`);
    for (const m of exp.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sel = m[1]!;
      const px = /font-size:(\d+(?:\.\d+)?)px/.exec(m[2]!)?.[1];
      if (!px) continue;
      const isLabel = /\[data-info="compare"\]>p|ol>li>div:last-child>p|:first-child>span|::before|\[data-em\]::|>span:nth-child\(2\)>span|>span:nth-child\(3\)>span|>span:nth-child\(2\)\s|>span:nth-child\(3\)\s/.test(sel) || /svg|::after/.test(sel);
      if (!isLabel && Number(px) < INFO_BODY_MIN_PX) fails.push(`${lv} 본문 글자 ${px}px < ${INFO_BODY_MIN_PX}px: ${sel.slice(-60)}`);
    }
  }
  // 앞 절 분리: 문구 보존(공백 제외 글자 그대로)
  for (const t of ["이너 먼저: 얇은 이너를 입고 확인합니다.", "비틀어 짜지 말고, 건조기는 사용하지 않습니다.", "쉼표 없는 문장입니다."]) {
    const sp = splitLead(t);
    const strip = (x: string) => x.replace(/[\s:,]/g, "");
    if (sp && strip(sp.lead + sp.rest) !== strip(t)) fails.push(`앞 절 분리로 문구가 달라짐: ${t}`);
  }
  if (splitLead("쉼표 없는 문장입니다.") !== null) fails.push("쉼표·콜론 없는 문장이 분리됨");
  // 대비 12 hue × 2 모드(조합 스펙의 톤 그대로)
  for (const lv of ["bold", "dramatic"] as const) for (const h of HUES) fails.push(...infoContrastLint({ ...axes, info: lv }, h).map((f) => `${lv}: ${f}`));
  void applyPackTone;
  return fails;
}
