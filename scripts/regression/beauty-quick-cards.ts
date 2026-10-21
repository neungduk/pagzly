/**
 * 회귀 — 424차 1-4 뷰티 퀵포인트·페르소나 칩 보정. 사진을 잃은 퀵포인트(compact) 카드는 번호 목록으로 합쳐지지 않고 아이콘 카드로 남는지,
 * 페르소나 칩에는 제품 정면·근접 컷만 쓰이고 없으면 사진 없이 가는지, 라이브·export가 같은 구조인지, 뷰티가 아니거나 태그가 없으면 불변인지 확인한다.
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { findTextOnlyRuns } from "../../lib/text-only-run";
import { personaChipAllow } from "../../lib/photo-text-match";
import type { DetailSection } from "../../lib/types/generate";

export const name = "뷰티 퀵포인트 아이콘 카드·번호 목록 분리·페르소나 칩 정면/근접만·라이브/export 동일·비뷰티 불변";

const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
// 0 히어로(정면) · 1 손에 든 컷 · 2 정면 · 3 클로즈업 · 4 박스
const TAGS = [["정면", "단독"], ["손", "들기"], ["정면", "단독"], ["클로즈업", "라벨"], ["박스", "구성품"]];
const URLS = TAGS.map((_, i) => `https://example.com/${i}.jpg`);
const quick = (h: string, b: string, imageIndex: number) => S({ type: "image_text", slot: "quick_points", heading: h, body: b, layout: "compact", imageIndex, imagePosition: "left" });
const feature = (h: string, b: string) => S({ type: "image_text", slot: "feature_callout", heading: h, body: b, layout: "text_only", imageIndex: 2, imagePosition: "left" });
const sections = (handIdx = 1): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "H", subheadline: "s", imageIndex: 0 }),
  S({ type: "target_persona", slot: "target_persona", heading: "이런 고민", personas: ["세안 후 당기는 분", "수분이 필요한 분", "가방에 넣을 미스트", "메이크업 위"] }),
  quick("미스트 안개", "얼굴에서 15cm, 고르게 퍼지는 물방울입니다.", handIdx), // 손에 든 컷 — 분사 요구에 안 맞음
  quick("휴대 30mL", "파우치 한 칸에 들어가는 크기입니다.", handIdx), // 크기·휴대, 높이 입력 없음
  feature("산뜻한 마무리", "뿌린 뒤 손으로 두드리지 않아도 가볍게 마무리됩니다."),
  feature("동백 추출물", "동백 추출물과 히알루론산을 함께 담았습니다."),
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ctx = { category: "화장품/뷰티", tags: TAGS };
  const shown = applyDisplayRules(sections(), URLS, { category: "화장품/뷰티", tags: TAGS });
  const cards = shown.sections.filter((s) => s.type === "image_text" && s.slot === "quick_points") as unknown as Array<{ layout?: string; noPhoto?: boolean; heading: string }>;
  if (cards.length !== 2 || !cards.every((c) => c.layout === "compact" && c.noPhoto === true)) fails.push(`퀵포인트 두 장이 아이콘 카드(compact+noPhoto)가 아님: ${JSON.stringify(cards)}`);

  // 번호 목록(text_only 묶음)에는 퀵포인트가 섞이지 않고, 같은 종류(feature) 카드끼리만 번호를 받는다
  const runs = findTextOnlyRuns(shown.sections);
  const members = [...runs.values()].flat().map((i) => (shown.sections[i] as unknown as { heading: string }).heading);
  if (members.includes("미스트 안개") || members.includes("휴대 30mL")) fails.push(`퀵포인트가 번호 목록에 섞임: ${members}`);
  if (JSON.stringify(members) !== JSON.stringify(["산뜻한 마무리", "동백 추출물"])) fails.push(`번호 목록 구성이 다름: ${members}`);

  // 페르소나 칩: 정면·근접 컷(0은 히어로라 제외, 2·3)만, 손·박스는 제외
  const persona = shown.sections.find((s) => s.type === "target_persona") as unknown as { imageIndexes?: number[] } | undefined;
  const ids = persona?.imageIndexes ?? [];
  if (ids.some((i) => i === 1 || i === 4)) fails.push(`칩에 손에 든 컷·박스 컷이 쓰임: ${ids}`);
  // 후보(정면·근접)가 칩 수보다 적으면 칩에 사진을 넣지 않는다
  if (ids.length !== 0) fails.push(`정면·근접 후보(2장)가 칩 4개보다 적은데 사진이 배정됨: ${ids}`);
  const allow = personaChipAllow({ ...ctx, tags: TAGS });
  eq(fails, "허용 판정", [0, 1, 2, 3, 4].map((i) => allow?.(i)), [true, false, true, true, false]);
  // 후보가 충분하면 정면·근접 컷만 배정
  const many = [["정면"], ["정면"], ["정면"], ["클로즈업"], ["클로즈업"], ["손", "들기"], ["박스"]];
  const ok = applyDisplayRules(sections(5), many.map((_, i) => `https://example.com/${i}.jpg`), { category: "화장품/뷰티", tags: many });
  const okPersona = ok.sections.find((s) => s.type === "target_persona") as unknown as { imageIndexes?: number[] } | undefined;
  if (!okPersona?.imageIndexes || okPersona.imageIndexes.length !== 4 || okPersona.imageIndexes.some((i) => i === 5 || i === 6 || i === 0)) fails.push(`후보 충분한데 칩 배정이 다름: ${okPersona?.imageIndexes}`);
  // 태그가 없거나 뷰티가 아니면 제한 없음(기존 동작)
  eq(fails, "태그 없음 → 제한 없음", personaChipAllow({ category: "화장품/뷰티" }), undefined);
  eq(fails, "비뷰티 → 제한 없음", personaChipAllow({ category: "의류/패션", tags: TAGS }), undefined);

  // export: 같은 구조(아이콘 타일 + 번호 목록 분리)
  const html = buildDetailPageHtml({ productName: "p", brandName: "b", category: "화장품/뷰티", sections: sections(), imageUrls: URLS, theme: getCategoryTheme("화장품/뷰티"), imageTags: TAGS });
  const tiles = (html.match(/data-pz-icon-tile/g) ?? []).length;
  if (tiles !== 2) fails.push(`export 아이콘 타일 수가 2가 아님: ${tiles}`);
  if (/<img[^>]*pagzly-compact-thumb[^>]*0\.jpg/.test(html) && html.includes("미스트 안개") && /pagzly-compact-thumb"[^>]*src="https:\/\/example.com\/1\.jpg/.test(html)) fails.push("export 퀵포인트에 뺀 손 컷이 다시 붙음");
  // 비뷰티: 퀵포인트 카드는 그대로 사진(불변)
  const fashion = applyDisplayRules(sections(), URLS, { category: "의류/패션", tags: TAGS });
  const fq = fashion.sections.filter((s) => s.type === "image_text" && s.slot === "quick_points") as unknown as Array<{ noPhoto?: boolean; imageIndex: number }>;
  if (fq.some((c) => c.noPhoto) || fq.map((c) => c.imageIndex).join() !== "1,1") fails.push("비뷰티 퀵포인트가 바뀜");
  // 높이 입력이 있으면 크기·휴대 카드는 손 컷을 유지(미스트 안개만 아이콘 카드)
  const sized = applyDisplayRules(sections(), URLS, { category: "화장품/뷰티", tags: TAGS, hasSizeInfo: true });
  const sq = sized.sections.filter((s) => s.type === "image_text" && s.slot === "quick_points") as unknown as Array<{ heading: string; noPhoto?: boolean }>;
  eq(fails, "높이 입력 있으면 휴대 카드는 사진 유지", sq.map((c) => [c.heading, !!c.noPhoto]), [["미스트 안개", true], ["휴대 30mL", false]]);
  return fails;
}

function eq(fails: string[], label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
}
