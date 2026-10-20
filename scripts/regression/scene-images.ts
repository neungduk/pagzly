/**
 * 회귀 — 419차 3-6 장면(합성) 이미지 슬롯. 호출 0(생성 연결은 421차). 슬롯 정규화·장수/비용 상한·폴백·프롬프트 빌더·표시 삽입·고정 고지·정책(전후 슬롯 없음).
 */
import { applyDisplayRules } from "../../lib/display-sections";
import { buildDetailPageHtml } from "../../lib/export-detail-html";
import { getCategoryTheme } from "../../lib/category-theme";
import { sectionImageIndexes } from "../../lib/image-source-cap";
import {
  BEAUTY_SCENE_SLOTS, RESERVED_SCENE_SLOTS, SCENE_COMMON_DIRECTIVES, SCENE_COST_CAP_USD, SCENE_MAX_COUNT, SCENE_NOTICE, SCENE_UNIT_USD,
  buildScenePrompt, insertSceneSlots, normalizeSceneImages, planSceneImages, safeSceneUrl, sceneImageCostUsd, sceneModelDescription, type SceneImageMap,
} from "../../lib/scene-images";
import type { DetailSection } from "../../lib/types/generate";

export const name = "장면(합성) 이미지 슬롯 — 정규화·상한·폴백·프롬프트·삽입 위치·고정 고지·전후 슬롯 없음";

const OK = "https://example.supabase.co/storage/v1/object/public/x/scene.png";
const S = (o: Record<string, unknown>) => o as unknown as DetailSection;
const base = (): DetailSection[] => [
  S({ type: "hero", slot: "hero", headline: "H", subheadline: "s", imageIndex: 0 }),
  S({ type: "gallery", slot: "gallery", heading: "여러 각도로 본 제품", imageIndexes: [1, 2] }),
  S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps: ["a", "b"] }),
  S({ type: "caution", slot: "caution", heading: "주의", body: "본문" }),
];
const scene = (u = OK) => ({ url: u, role: "scene" as const, aiGenerated: true as const });

export async function run(): Promise<string[]> {
  const fails: string[] = [];

  // 슬롯 키·정책
  if (BEAUTY_SCENE_SLOTS.join() !== "use-person,use-hand-mist,scene-desk,scene-bag,scene-vanity") fails.push("뷰티 슬롯 키가 다름");
  if (BEAUTY_SCENE_SLOTS.some((k) => /before|after|전후|result/i.test(k))) fails.push("전후(효능 증거) 슬롯이 있음");
  if (!RESERVED_SCENE_SLOTS["전자제품"]?.includes("use-desk-device")) fails.push("전자제품 예약 키 없음");
  if (SCENE_NOTICE !== "연출 이미지(AI 생성)") fails.push("고정 고지 문구가 다름");

  // 정규화·주소
  const n = normalizeSceneImages({
    "use-person": scene(),
    "scene-desk": { url: "http://x/y.png", role: "scene", aiGenerated: true },
    "scene-bag": { url: OK, role: "scene", aiGenerated: false },
    "scene-vanity": { url: OK, role: "other", aiGenerated: true },
    "Bad Key": scene(),
    "scene-evil": { url: 'https://a/b.png");}', role: "scene", aiGenerated: true },
  });
  if (Object.keys(n).join() !== "use-person") fails.push(`정규화 결과가 다름: ${Object.keys(n)}`);
  if (Object.keys(normalizeSceneImages(null)).length || Object.keys(normalizeSceneImages("x")).length) fails.push("잘못된 입력이 슬롯을 만듦");
  for (const bad of ["javascript:x", "https://a/b c.png", "https://a/(x)", "", null]) if (safeSceneUrl(bad as string | null)) fails.push(`안전하지 않은 주소 통과: ${String(bad)}`);

  // 장수·비용 상한·폴백
  if (SCENE_MAX_COUNT !== 4 || SCENE_COST_CAP_USD !== 0.24) fails.push("기본 상한이 4장·$0.24가 아님");
  if (SCENE_MAX_COUNT * SCENE_UNIT_USD > SCENE_COST_CAP_USD + 1e-9) fails.push("상수가 서로 모순(최대 장수 × 단가 > 상한)");
  const p = planSceneImages([...BEAUTY_SCENE_SLOTS, "use-person", "weird-slot"]);
  if (p.slots.length !== 4 || p.slots.join() !== "use-person,use-hand-mist,scene-desk,scene-bag") fails.push(`계획이 다름: ${p.slots}`);
  if (p.fallbacks.map((f) => `${f.slot}:${f.reason}`).join() !== "scene-vanity:count,weird-slot:unknown") fails.push(`폴백이 다름: ${JSON.stringify(p.fallbacks)}`);
  if (p.estimateUsd > SCENE_COST_CAP_USD) fails.push("추정이 상한 초과");
  if (planSceneImages(["scene-desk"], "의류/패션").slots.length !== 0) fails.push("뷰티 아닌 카테고리가 슬롯을 받음");
  if (sceneImageCostUsd(2) !== 0.12 || sceneImageCostUsd(0) !== 0 || sceneImageCostUsd(-1) !== 0) fails.push("비용 합산이 다름");

  // 프롬프트 빌더
  for (const slot of BEAUTY_SCENE_SLOTS) {
    const pr = buildScenePrompt(slot, { productKind: "facial mist bottle", color: "pale gold and black", mood: "fresh and dewy", target: "20~30대 여성" });
    if (!pr.endsWith(SCENE_COMMON_DIRECTIVES) || /[가-힣]/.test(pr)) fails.push(`${slot} 프롬프트 형식 오류`);
    if (!/keep the product label and logo exactly as in the reference, do not alter text/.test(pr) || !/clean natural makeup, no celebrity likeness, no text overlay/.test(pr)) fails.push(`${slot} 공통 지시 누락`);
    if (!/facial mist bottle/.test(pr)) fails.push(`${slot} 상품 종류 누락`);
    if (/before|after (use|treatment)|wrinkle|acne|pore/i.test(pr.replace(/no before and after/, ""))) fails.push(`${slot} 프롬프트에 효능·전후 표현`);
  }
  if (!/Korean woman in her twenties to thirties/.test(buildScenePrompt("use-person", {}))) fails.push("기본 인물이 20~30대 한국 여성이 아님");
  if (sceneModelDescription("30~40대 여성") !== "a Korean woman in her thirties to forties" || sceneModelDescription("20~30대 여성") !== "a Korean woman in her twenties to thirties" || sceneModelDescription("40대 여성") !== "a Korean woman in her forties") fails.push("타깃 연령 반영이 다름");
  if (!/Korean man/.test(sceneModelDescription("20대 남성"))) fails.push("남성 타깃 반영 안 됨");
  if (/brand|glowiest/i.test(buildScenePrompt("scene-desk", { productKind: "x" }))) fails.push("입력 원문이 들어감");

  // 표시 삽입
  const all: SceneImageMap = { "use-person": scene(), "use-hand-mist": scene(), "scene-desk": scene(), "scene-bag": scene() };
  const ins = insertSceneSlots(base(), [0, 1, 2, 3], all, "화장품/뷰티");
  const types = ins.sections.map((s) => (s.type === "scene_image" ? `scene:${(s as unknown as { sceneSlot: string }).sceneSlot}` : s.type));
  if (types.join() !== "hero,gallery,scene:scene-desk,scene:scene-bag,scene:use-person,usage_steps,scene:use-hand-mist,caution") fails.push(`삽입 위치가 다름: ${types}`);
  if (ins.sourceIndexes.length !== ins.sections.length) fails.push("sourceIndexes 길이 불일치");
  if (ins.sections.filter((s) => s.type === "scene_image").some((s) => sectionImageIndexes(s).length)) fails.push("scene_image가 사진 번호를 씀(사용 상한에 영향)");
  const unchanged = base();
  for (const [label, c, sc] of [["패션", "의류/패션", all], ["빈 슬롯", "화장품/뷰티", {}], ["슬롯 없음", "화장품/뷰티", undefined]] as const) {
    const out = insertSceneSlots(unchanged, [0, 1, 2, 3], sc as SceneImageMap | undefined, c);
    if (out.sections !== unchanged) fails.push(`${label}인데 섹션이 바뀜`);
  }
  if (insertSceneSlots(unchanged, [0, 1, 2, 3], all, "화장품/뷰티", false).sections !== unchanged) fails.push("flag off인데 섹션이 바뀜");
  // 앵커가 없으면 넣지 않는다
  const noUsage = base().filter((s) => s.type !== "usage_steps");
  if (insertSceneSlots(noUsage, [0, 1, 2], { "use-person": scene() }, "화장품/뷰티").inserted.length) fails.push("사용법이 없는데 use-person을 넣음");
  // applyDisplayRules 통합: 뷰티만, 편집 모드 제외
  const urls = Array.from({ length: 4 }, (_, i) => `https://x.test/${i}.png`);
  const shown = applyDisplayRules(base(), urls, { category: "화장품/뷰티", sceneImages: all });
  if (shown.sections.filter((s) => s.type === "scene_image").length !== 4 || shown.sourceIndexes.length !== shown.sections.length) fails.push("applyDisplayRules가 장면을 끼우지 않음");
  const fashion = applyDisplayRules(base(), urls, { category: "의류/패션", sceneImages: all });
  if (fashion.sections.some((s) => s.type === "scene_image")) fails.push("패션에 장면이 끼워짐");
  if (applyDisplayRules(base(), urls, { category: "화장품/뷰티", sceneImages: all, editing: true }).sections.some((s) => s.type === "scene_image")) fails.push("편집 모드에 장면이 끼워짐");

  // export: 이미지 하단 고정 고지, 패션엔 없음
  const mk = (category: string) =>
    buildDetailPageHtml({ productName: "p", brandName: "b", category, sections: base(), imageUrls: urls, theme: getCategoryTheme(category), sceneImages: all });
  const beauty = mk("화장품/뷰티");
  if ((beauty.match(/연출 이미지\(AI 생성\)<\/figcaption>/g) ?? []).length !== 4) fails.push("뷰티 export에 장면 4장×고지가 없음");
  if (!/<img src="https:\/\/example[^>]*\/><figcaption[^>]*>연출 이미지\(AI 생성\)/.test(beauty)) fails.push("고지가 이미지 바로 아래가 아님");
  if (/font-size:1[01]px[^"]*">연출 이미지/.test(beauty)) fails.push("고지 글자가 12px 미만");
  if (mk("의류/패션").includes("연출 이미지(AI 생성)")) fails.push("패션 export에 장면 고지가 나옴");
  return fails;
}
