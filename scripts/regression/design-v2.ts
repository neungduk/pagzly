/**
 * 회귀 — 428차 디자인 V2. 플래그(off면 427차와 같은 출력)·대상 카테고리(뷰티·패션만)·타이포 상한·하드 색 면 반전 예산(≤6, AI 배경 우선)·틴트 대비·
 * export 금지 CSS 기법 없음·라이브/export가 같은 CSS 한 벌을 쓰는지. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { contrastRatioToken } from "../../lib/design-tokens";
import { infoColorsOf, infoCss } from "../../lib/info-style";
import { V2_MAX_HARD_FLIPS, V2_TITLE_SCALE, designV2Css, designV2On, designV2Typo, planBands, v2Tint, v2TitleOverrides } from "../../lib/design-v2";
import { emphasisMarkerGradient } from "../../lib/body-emphasis";
import { V2_MARKER, emphasisCss } from "../../lib/design-v2";
import type { DetailSection } from "../../lib/types/generate";

export const name = "디자인 V2 — 플래그·대상·타이포 상한·하드 면 예산·틴트 대비·export 안전 CSS·라이브/export 동일";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const sections = (extra: Record<string, unknown>[] = []): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "세안 후 15cm", subheadline: "촉촉", imageIndex: 0 }),
  S({ type: "checklist", slot: "checklist", heading: "체크", items: ["a", "b"] }),
  S({ type: "highlight_box", slot: "highlight_box", heading: "포인트", cards: [{ title: "가", body: "나" }, { title: "다", body: "라" }] }),
  S({ type: "usage_steps", slot: "usage_steps", heading: "사용법", steps: ["세안 후 사용하세요", "가볍게 뿌려요", "두드려 흡수시켜요"] }),
  S({ type: "stat_infographic", slot: "stat_infographic", heading: "숫자", metrics: [{ label: "용량", value: "30mL" }, { label: "형태", value: "미스트" }] }),
  S({ type: "caution", slot: "caution", heading: "주의", body: "주의 문구" }),
  S({ type: "cta_price", slot: "cta_price", price: 24000 }),
  ...extra.map(S),
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const theme = getCategoryTheme("화장품/뷰티");
  const colors = infoColorsOf(theme);
  const base = { scope: "[data-pz-v2]", colors, category: "화장품/뷰티", beautyInfo: true, sections: sections() };

  // ── 플래그·대상 ──
  eq("뷰티 대상", designV2On("화장품/뷰티", true), true);
  eq("패션 대상", designV2On("의류/패션", true), true);
  eq("기타 카테고리 불변", [designV2On("식품", true), designV2On("전자제품", true), designV2On(undefined, true)], [false, false, false]);
  eq("flag off", designV2On("화장품/뷰티", false), false);
  eq("타이포는 인포 켜짐일 때만", [designV2Typo("화장품/뷰티", "calm", true), designV2Typo("화장품/뷰티", "bold", true), designV2Typo("식품", "bold", true)], [false, true, false]);
  eq("flag off → 빈 CSS", designV2Css({ ...base, level: "bold", enabled: false }), "");
  eq("비대상 → 빈 CSS", designV2Css({ ...base, level: "bold", category: "식품" }), "");
  eq("calm 패션 → 타이포·띠 규칙 없음", designV2Css({ ...base, level: "calm", beautyInfo: false, category: "의류/패션" }).includes("data-info"), false);

  // ── 타이포 상한 ──
  const t = v2TitleOverrides({});
  eq("구간 제목 상한", [t.section?.base, t.section?.wide], [V2_TITLE_SCALE.section!.base, V2_TITLE_SCALE.section!.wide]);
  eq("팩이 더 작으면 존중", v2TitleOverrides({ section: { base: "1.5rem", wide: "2rem" } }).section, { base: "1.5rem", wide: "2rem" });
  eq("팩이 더 크면 줄임", v2TitleOverrides({ section: { base: "2.125rem", wide: "2.75rem" } }).section, { base: "1.75rem", wide: "2.25rem" });
  const css = designV2Css({ ...base, level: "bold" });
  for (const needle of ["font-size:40px", "font-size:24px", "font-size:36px", "font-size:44px", "font-weight:600"]) if (!css.includes(needle)) fails.push(`V2 CSS에 ${needle} 없음`);
  if (/\b900\b/.test(css)) fails.push("V2 CSS에 굵기 900이 남음");

  // ── 하드 면 예산 ──
  const bold = planBands(sections(), "bold", undefined, { buyCard: true });
  eq("bold: points만 하드", bold.hard, ["points"]);
  if (bold.flips > V2_MAX_HARD_FLIPS) fails.push(`bold 반전 ${bold.flips} > ${V2_MAX_HARD_FLIPS}`);
  eq("bold: 밝은 구간은 틴트", bold.tinted.sort(), ["care", "stat", "steps"]);
  const dr = planBands(sections(), "dramatic", undefined, { buyCard: true });
  if (dr.flips > V2_MAX_HARD_FLIPS) fails.push(`dramatic 반전 ${dr.flips} > ${V2_MAX_HARD_FLIPS}`);
  // AI 배경 구간은 예산을 넘어도 유지(우선), 반전 횟수에는 포함
  const bd = planBands(sections(), "dramatic", { points: "https://x/a.png", stat: "https://x/b.png", care: "https://x/c.png", steps: "https://x/d.png" }, { buyCard: true });
  eq("배경 구간 모두 유지", [bd.hard.includes("points"), bd.hard.includes("stat"), bd.hard.includes("care"), bd.hard.includes("steps")], [true, true, true, true]);
  eq("배경 구간은 틴트로 덮지 않음", designV2Css({ ...base, level: "dramatic", backdrops: { stat: "https://x/b.png", steps: "https://x/d.png", care: "https://x/c.png" } }).includes('[data-info="steps"]{background'), false);
  eq("calm → 계획 없음", planBands(sections(), "calm", undefined, { buyCard: false }), { hard: [], tinted: [], demoted: [], flips: 0 });
  // 예산 초과 시 dramatic stat은 bold 표현으로 낮춘다
  const many = planBands(sections(), "dramatic", { points: "https://x/a.png", steps: "https://x/b.png", care: "https://x/c.png" }, { buyCard: true });
  eq("예산 초과 → stat 낮춤", [many.demoted.includes("stat"), many.hard.includes("stat")], [true, false]);
  const demoted = infoCss("dramatic", "[data-pz-v2]", colors, undefined, { demote: ["stat"] });
  const normal = infoCss("dramatic", "[data-pz-v2]", colors, undefined);
  if (demoted === normal) fails.push("demote가 infoCss를 바꾸지 않음");
  if (!demoted.includes(`[data-info="stat"]{background:${colors.soft}`)) fails.push("낮춘 stat이 옅은 면이 아님");

  // ── 틴트: 밝은 면(L>205), 본문 잉크 대비 4.5 이상 ──
  for (const hue of [theme.accentSoft, "#C8DCEB", "#EAD8B8", "#D9C8E8"]) {
    const tint = v2Tint({ ...colors, soft: hue });
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
    if (lum(tint) <= 205) fails.push(`틴트 ${tint}(${hue})가 밝은 면이 아님`);
    if (contrastRatioToken(colors.ink, tint) < 4.5) fails.push(`틴트 ${tint} 위 잉크 대비 < 4.5`);
  }

  // ── export 안전 CSS: 쓰지 않던 기법 금지 ──
  for (const lvl of ["bold", "dramatic"] as const) {
    const c = designV2Css({ ...base, level: lvl });
    if (/:has\(|@container|text-wrap/.test(c)) fails.push(`V2 CSS(${lvl})에 export 금지 기법`);
  }

  // ── 라이브/export 같은 CSS: 같은 함수 한 벌(export HTML이 V2 CSS를 그대로 담는다) ──
  const urls = ["https://example.com/a.jpg"];
  const mk = (category: string) => buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: sections(), imageUrls: urls, theme: getCategoryTheme(category) });
  const html = mk("화장품/뷰티");
  const v2css = designV2Css({ scope: ".pagzly-wrap", colors: infoColorsOf(getCategoryTheme("화장품/뷰티")), level: "bold", category: "화장품/뷰티", beautyInfo: true, sections: applyDisplayRules(sections(), urls, { category: "화장품/뷰티" }).sections });
  if (v2css && !html.includes(v2css.slice(0, 200))) fails.push("export HTML이 V2 CSS를 담지 않음");
  if (!html.includes("--pz-t-section:1.75rem")) fails.push("export 제목 스케일에 상한이 반영되지 않음");
  const nonTarget = mk("식품");
  if (nonTarget.includes("--pz-t-section:1.75rem") || nonTarget.includes('[data-info="steps"]{background:linear-gradient')) fails.push("비대상 카테고리 export가 바뀜");

  // ── 2-3 강조 연출: 기존 라벨·구절에만 스타일, 새 요소·문구 없음, 칩 상한 ──
  {
    const marker = emphasisMarkerGradient("#20547E");
    const sel = emphasisCss("[data-pz-v2]", colors, false);
    if (!sel.includes('strong[style*="linear-gradient(transparent 60%"]')) fails.push("마커 선택자 없음");
    if (!marker.includes("linear-gradient(transparent 60%")) fails.push("기존 마커 값이 선택자와 맞지 않음(body-emphasis 변경 확인)");
    if (!sel.includes(`${V2_MARKER.alpha}`)) fails.push("마커 진하기 상수 미반영");
    eq("calm: 칩·배지 없음", [sel.includes("steps"), sel.includes("statnum")], [false, false]);
    const on = emphasisCss("[data-pz-v2]", colors, true);
    eq("인포: STEP 칩·수치 배지", [on.includes('[data-info="steps"] ol>li>div:last-child>p'), on.includes('[data-info="statnum"]>div>div>:first-child')], [true, true]);
    // 칩 상한: 칩은 사용 단계 라벨뿐(마크업을 늘리지 않으므로 단계 수 이하)
    if (/content:/.test(on)) fails.push("강조 CSS가 새 문구(content)를 만듦");
    // 배지 글자 대비: 흰 글자 on 포인트색 4.5 이상
    if (contrastRatioToken(colors.paper, colors.accent) < 4.5) fails.push("수치 배지 대비 < 4.5");
  }
  return fails;
}
