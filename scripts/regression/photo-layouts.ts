/**
 * 회귀 — 431차 2-2 사진 레이아웃: 갤러리 사진 수별 레이아웃(2=비대칭·3=모자이크·4+=스태거), 히어로 직후 첫 갤러리·1장 갤러리·AI 연출컷은 그대로,
 * 사진 한 장 템플릿(프레임·인셋·확대) 회전(연속 같은 템플릿 0·종류 ≥3), 입력 사진·문구만 사용, export 마크업 동일·금지 CSS 없음. 호출 0.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { planPhotoLayouts, photoLayoutHtml } from "../../lib/photo-layouts";
import { impactPalette } from "../../lib/impact-templates";
import type { DetailSection } from "../../lib/types/generate";

export const name = "사진 레이아웃 — 갤러리 수별 선택·첫 갤러리/1장/AI컷 유지·단일 사진 회전·연속 같은 템플릿 0·입력 사진만·export 동일·금지 CSS 없음";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}.jpg`);
const gal = (h: string, idx: number[]) => S({ type: "gallery", slot: "gallery", heading: h, imageIndexes: idx });
const full = (h: string, i: number) => S({ type: "image_text", slot: "detail_zoom", heading: h, body: `${h} 본문입니다.`, imageIndex: i, imagePosition: "left", layout: "full" });
const filler = (n: number) => S({ type: "highlight_box", slot: "highlight_box", heading: `요약${n}`, body: "본문" });
const page = (_cat: string): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "제목", subheadline: "부제", imageIndex: 0 }),
  gal("첫 갤러리", [0, 1, 2, 3]),
  S({ type: "target_persona", slot: "target_persona", heading: "고민", personas: ["a", "b", "c"] }),
  filler(1), gal("둘", [4, 5]), filler(2), gal("셋", [6, 7, 8]), filler(3), gal("넷", [0, 1, 2, 3]), filler(4),
  full("사진 가", 4), filler(5), full("사진 나", 5), filler(6), full("사진 다", 6), filler(7), full("사진 라", 7),
  S({ type: "faq", slot: "faq", heading: "FAQ", items: [{ question: "q", answer: "a" }] }),
  S({ type: "cta_price", slot: "cta_price", price: 1000 }),
];
const F = () => buildClaimFacts({ productName: "상품", brandName: "b", price: 1000, keyFeatures: "상품" } as never);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  const secs = page("화장품/뷰티");
  const plan = planPhotoLayouts(secs, secs.map((_, i) => i), { category: "화장품/뷰티", imageUrls: urls });
  eq("갤러리 수별 레이아웃", plan.placed.map((p) => p.kind), ["asym2", "mosaic3", "stagger"]);
  eq("히어로 직후 첫 갤러리 유지", plan.sections[1]!.type, "gallery");
  // 1장 갤러리·AI 연출컷만 든 갤러리는 그대로
  const one = [secs[0]!, filler(0), gal("하나", [4]), filler(1), gal("AI", [5, 6]), filler(2), filler(3), filler(4), filler(5)];
  const p1 = planPhotoLayouts(one, one.map((_, i) => i), { category: "화장품/뷰티", imageUrls: urls, origins: urls.map((_, i) => (i >= 5 ? "ai-lifestyle" : "original")) });
  eq("1장·AI 컷 갤러리 그대로", p1.placed.length, 0);
  // 입력 사진·문구만
  const pool = JSON.stringify(secs);
  for (const s of plan.sections) if (s.type === "impact") for (const x of [s.text, ...(s.images ?? []).map((im) => im.url)]) if (x && !pool.includes(x) && !urls.includes(x)) fails.push(`입력에 없는 값 "${x}"`);
  const st = plan.sections.find((s) => s.type === "impact" && s.kind === "stagger");
  eq("스태거는 짝수 장", ((st as { images?: unknown[] } | undefined)?.images?.length ?? 0) % 2, 0);
  // 전체 표시: 레이아웃 종류 ≥3, 인접 같은 임팩트 0
  for (const cat of ["화장품/뷰티", "의류/패션"]) {
    const out = applyDisplayRules(page(cat), urls, { category: cat, claimFacts: F() });
    const kinds = out.sections.filter((s) => s.type === "impact").map((s) => (s as { kind: string }).kind);
    const photoKinds = kinds.filter((k) => ["bleed", "split", "inset", "frame", "zoom", "asym2", "mosaic3", "stagger", "callout"].includes(k));
    if (new Set(photoKinds).size < 3) fails.push(`${cat}: 사진 레이아웃 종류 ${new Set(photoKinds).size}개(<3)`);
    out.sections.forEach((s, i) => { if (i > 0 && s.type === "impact" && out.sections[i - 1]!.type === "impact" && (s as { kind: string }).kind === (out.sections[i - 1] as { kind: string }).kind) fails.push(`${cat}: 인접 같은 레이아웃`); });
    eq(`${cat}: sourceIndexes 길이`, out.sourceIndexes.length, out.sections.length);
  }
  // 마크업: 6종 모두 이미지 사용·금지 CSS 없음·export 동일
  const pal = impactPalette(getCategoryTheme("화장품/뷰티"));
  const img = (n: number) => Array.from({ length: n }, (_, i) => ({ url: urls[i]!, pos: "50% 40%" }));
  for (const [kind, n] of [["asym2", 2], ["mosaic3", 3], ["stagger", 4], ["inset", 1], ["frame", 1], ["zoom", 1]] as const) {
    const html = photoLayoutHtml({ type: "impact", slot: "impact", kind, text: "제목", body: "본문", images: img(n) }, pal, "alt");
    if (!html.includes(`data-pz-impact="${kind}"`)) fails.push(`${kind}: 마크업 없음`);
    if ((html.match(/<img /g) ?? []).length < n) fails.push(`${kind}: 사진 ${n}장 미만`);
    if (/:has\(|@container|text-wrap|<foreignObject|filter:/.test(html)) fails.push(`${kind}: 금지 기법`);
  }
  const exp = buildDetailPageHtml({ productName: "상품", brandName: "b", category: "화장품/뷰티", sections: page("화장품/뷰티"), imageUrls: urls, theme: getCategoryTheme("화장품/뷰티"), claimFacts: F() });
  if (!/data-pz-impact="asym2"/.test(exp) || !/data-pz-impact="mosaic3"/.test(exp)) fails.push("export에 사진 레이아웃 마크업 없음");
  return fails;
}
