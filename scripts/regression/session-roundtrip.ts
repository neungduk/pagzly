/**
 * 회귀 — 424차 1-3 저장·재불러오기 왕복. 표시 상태(인포 배경·장면 이미지·켬/끔·스타일 팩)를 products.photo_cost_breakdown.display에 합쳐 저장하고
 * JSON(DB 왕복)을 거쳐 다시 꺼냈을 때 같은 값이 나오는지, 잘못된 값은 버려지는지, 비용 숫자 칸은 건드리지 않는지 확인한다. 호출 0, 순수 함수.
 */
import { displayStateOf, normalizeDisplayState, withDisplayState } from "../../lib/saved-display";
import { applyDisplayRules } from "../../lib/display-sections";
import { infoCss, infoColorsOf } from "../../lib/info-style";
import { getCategoryTheme } from "../../lib/category-theme";
import type { DetailSection } from "../../lib/types/generate";

export const name = "저장·재불러오기 왕복 — display(인포 배경·장면 이미지·켬/끔·스타일 팩) 정규화·병합·JSON 왕복·비용 칸 보존";

const OK = "https://example.supabase.co/storage/v1/object/public/x/a.png";
const scene = { url: OK, role: "scene" as const, aiGenerated: true as const, sizeMeta: { heightCm: 10, estimated: true } };
const S = (o: Record<string, unknown>) => o as unknown as DetailSection;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); };

  // 정규화: 알려진 구간·슬롯·https 주소만
  const n = normalizeDisplayState({
    infoBackdrops: { points: OK, stat: "http://x/y.png", bad: OK, care: 'https://a/b.png");}' },
    sceneImages: { "use-person": scene, "scene-x": { url: "javascript:x", role: "scene", aiGenerated: true } },
    sceneImagesOn: true, stylePackId: "editorial", extra: "버림",
  });
  eq("정규화 결과", n, { infoBackdrops: { points: OK }, sceneImages: { "use-person": scene }, sceneImagesOn: true, stylePackId: "editorial" });
  for (const bad of [null, undefined, 3, "x", {}, { infoBackdrops: {} }, { stylePackId: "Bad Id!" }, { sceneImagesOn: "yes" }]) if (normalizeDisplayState(bad) !== undefined) fails.push(`쓸모없는 값이 상태가 됨: ${JSON.stringify(bad)}`);

  // 저장(병합) → JSON 왕복 → 복원
  const cost = { claude: 0.2885, backdrop: 0.16, infoBackdrops: 0.1, sceneImages: 0.1 };
  const saved = withDisplayState(cost, { infoBackdrops: { points: OK, stat: OK }, sceneImages: { "use-person": scene } });
  eq("비용 숫자 칸 보존", [saved.claude, saved.backdrop, saved.infoBackdrops, saved.sceneImages], [0.2885, 0.16, 0.1, 0.1]);
  const roundtrip = JSON.parse(JSON.stringify(saved));
  eq("JSON 왕복 후 복원", displayStateOf(roundtrip), { infoBackdrops: { points: OK, stat: OK }, sceneImages: { "use-person": scene } });
  // 저장된 값 위에 토글·스타일 팩만 얹으면 나머지는 유지
  const toggled = withDisplayState(roundtrip, { sceneImagesOn: true });
  eq("토글 병합(인포·장면은 유지)", displayStateOf(toggled), { infoBackdrops: { points: OK, stat: OK }, sceneImages: { "use-person": scene }, sceneImagesOn: true });
  const styled = withDisplayState(toggled, { stylePackId: "mono-minimal", sceneImagesOn: false });
  eq("스타일 팩·끄기 병합", [displayStateOf(styled)?.stylePackId, displayStateOf(styled)?.sceneImagesOn, displayStateOf(styled)?.sceneImages ? "scenes" : ""], ["mono-minimal", false, "scenes"]);
  // undefined는 덮어쓰지 않는다
  eq("undefined는 기존 값 유지", displayStateOf(withDisplayState(styled, { sceneImagesOn: undefined, stylePackId: undefined }))?.stylePackId, "mono-minimal");
  // 비어 있으면 display 키 자체를 만들지 않는다(기존 행·패션 세션은 그대로)
  eq("빈 상태는 키 없음", "display" in withDisplayState({ claude: 0.1 }, undefined), false);
  eq("null·undefined 비용 JSON", [Object.keys(withDisplayState(undefined, undefined)).length, Object.keys(withDisplayState(null, undefined)).length], [0, 0]);
  eq("깨진 display는 무시", displayStateOf({ display: "oops" }), undefined);
  eq("기존 행(display 없음)", displayStateOf({ claude: 0.1 }), undefined);

  // 같은 저장 상태에서 라이브 표시 규칙·인포 CSS가 다시 같은 결과를 만든다(재불러오기 = 처음과 같은 화면)
  const restored = displayStateOf(roundtrip)!;
  const css = (map: typeof restored.infoBackdrops) => infoCss("bold", ".w", infoColorsOf(getCategoryTheme("화장품/뷰티")), map);
  if (!css(restored.infoBackdrops).includes(`url("${OK}")`)) fails.push("복원한 인포 배경이 CSS에 나오지 않음");
  if (css(undefined).includes("url(")) fails.push("인포 배경이 없는데 CSS에 이미지가 있음");
  const secs: DetailSection[] = [
    S({ type: "hero", slot: "hero", headline: "H", subheadline: "s", imageIndex: 0 }),
    S({ type: "usage_steps", slot: "step_card", heading: "사용법", steps: ["a", "b"] }),
  ];
  const withScene = applyDisplayRules(secs, ["https://example.com/a.jpg"], { category: "화장품/뷰티", sceneImages: restored.sceneImages });
  if (!withScene.sections.some((s) => s.type === "scene_image")) fails.push("복원한 장면 이미지가 표시 규칙에서 섹션이 되지 않음");
  const without = applyDisplayRules(secs, ["https://example.com/a.jpg"], { category: "화장품/뷰티" });
  if (without.sections.some((s) => s.type === "scene_image")) fails.push("장면 이미지가 없는데 섹션이 생김");
  return fails;
}
