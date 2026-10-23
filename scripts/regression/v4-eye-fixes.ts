/**
 * 회귀 — 440차 눈 검수 결함 수정(DESIGN_V4): H1 고스트 띠(칩·가격 띠와 겹치지 않음), H2 B·C 사진 실패 시 아래 여백·장식 접힘,
 * D1 큰 숫자 카드 값 한 줄 맞춤 폭, D2 v4 스펙 안내 행 "확인 필요 항목" 한 줄, D3 접점 띠 제품명(괄호 병기면 짧은 쪽). 호출 0.
 */
import { heroPalette, heroV2Html, planHeroV2 } from "../../lib/hero-spec";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { longestTokenEm, statFitEm } from "../../lib/detail-typography";
import { touchName } from "../../lib/layout-variants";
import { isPlaceholderValue } from "../../lib/spec-placeholder";
import { corpus, displayOf } from "../design-corpus";
import type { HeroSection } from "../../lib/types/generate";

export const name = "v4 눈 검수 수정 — 히어로 고스트 띠·사진 실패 여백·숫자 카드 맞춤·스펙 안내 행 묶음·접점 띠 제품명";

const hero = { type: "hero", slot: "hero", headline: "건조한 날에도 촉촉하게", subheadline: "부제", imageIndex: 0 } as unknown as HeroSection;
const facts = buildClaimFacts({ productName: "벨벳 워터 틴트 립", brandName: "b", price: 18900, keyFeatures: "촉촉", certifications: "" } as never);

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  // H1·H2: 변형별 마크업
  const theme = getCategoryTheme("화장품/뷰티");
  for (const variant of ["B", "C", "D", "E"] as const) {
    const p = planHeroV2({ hero, productName: "벨벳 워터 틴트 립", brandName: "BRAND", imageUrls: ["https://example.com/a.jpg"], category: "식품", archetype: null, mood: "playful", facts, certifications: "", keyFeatures: "촉촉", wornTop: false, price: 18900, ctaBadges: [] });
    if (!p?.v3?.ghost) { fails.push(`${variant}: v3 고스트 계획 없음`); continue; }
    const html = heroV2Html(hero, { ...p, variant }, heroPalette(theme), "alt");
    if (/data-hl="ghost"[^>]*bottom:-0\.1/.test(html)) fails.push(`${variant}: 고스트가 패널 바닥 밖(가격 띠 겹침에 잘림)`);
    if ((variant === "B" || variant === "C") && !/\[data-hero-v2="B"\]\[data-hero-fail\][^{]*\{padding-bottom:40px/.test(html)) fails.push(`${variant}: 사진 실패 시 아래 여백 규칙 없음`);
    if (variant === "B" && /data-hero-photo style="position:relative;margin:16px auto 0/.test(html)) fails.push("B: 고스트 띠만큼 사진 위 여백이 늘지 않음");
  }
  // D1: 값 전체 한 줄 기준이 어절 기준보다 넓다(끊김 방지)
  for (const v of ["50~56cm", "20수 싱글 저지", "S~XL 4종"]) if (statFitEm(v) <= longestTokenEm(v, -0.05)) fails.push(`D1: ${v} 맞춤 폭이 어절 기준 이하`);
  // D3
  if (touchName("Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)") !== "드림 글로우 카멜리아 에센스 미스트") fails.push("D3: 괄호 병기 제품명이 짧은 쪽이 아님");
  if (touchName("벨벳 워터 틴트 립 4호") !== "벨벳 워터 틴트 립 4호") fails.push("D3: 괄호 없는 제품명이 바뀜");
  // D2: 말뭉치 v4 스펙 블록에 안내 문구 행이 2개 이상 남지 않음
  for (const [id, f] of corpus()) {
    for (const s of displayOf(f).sections as Array<{ type: string; kind?: string; v4?: { family: string }; stats?: Array<{ value: string }> }>) {
      if (s.type !== "impact" || s.kind !== "v4" || s.v4?.family !== "spec") continue;
      // 438 규칙과 같게: 모든 행이 안내 문구면(배송 표 등) 섹션이 비지 않도록 그대로 둔다
      const rows = s.stats ?? [];
      const pending = rows.filter((r) => isPlaceholderValue(r.value)).length;
      if (pending >= 2 && pending < rows.length) fails.push(`D2: ${id} v4 스펙에 안내 행 ${pending}개`);
    }
  }
  return fails;
}
