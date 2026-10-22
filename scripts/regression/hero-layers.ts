/**
 * 회귀 — 439차 2-4 히어로 v3 레이어: 레이어 표(z 순서)가 정의 순서와 단조, 마크업의 장식 레이어 z가 표와 같은 순서,
 * 장식(모티프·고스트)은 글 블록보다 아래 z·스티커는 사진 영역(사진 실패 시 함께 접힘), 글자는 입력(제품명·배지·가격)만,
 * 고스트 위 글자 대비 ≥4.5, 스티커·가격 태그 대비 ≥4.5, 가격 스트립 카테고리는 가격 태그 없음, 사진 없음(E)·실패 폴백 유지. 호출 0.
 */
import { HERO_LAYER_ORDER, HERO_LAYER_Z, HERO_V2_VARIANTS, HERO_V3_LAYERS, darkenForWhite, ghostColor, ghostWordOf, heroPalette, heroV2Html, planHeroV2, type HeroV2Plan } from "../../lib/hero-spec";
import { getCategoryTheme } from "../../lib/category-theme";
import { buildClaimFacts } from "../../lib/numeric-claim-gate";
import { contrastRatioToken } from "../../lib/design-tokens";
import type { HeroSection } from "../../lib/types/generate";

export const name = "히어로 v3 레이어 — z 순서·장식은 글 아래·스티커 사진 영역·입력 글자만·대비·스트립 중복 없음·폴백";

const hero = { type: "hero", slot: "hero", headline: "건조한 날에도 촉촉하게", subheadline: "부제", imageIndex: 0, badge: "피부 테스트 완료" } as unknown as HeroSection;
const facts = buildClaimFacts({ productName: "Dream Mist (드림 미스트)", brandName: "b", price: 18900, keyFeatures: "동백, 휴대", certifications: "" } as never);
const base = (o: Partial<Parameters<typeof planHeroV2>[0]> = {}) =>
  planHeroV2({ hero, productName: "Dream Mist (드림 미스트)", brandName: "BRAND", imageUrls: ["https://example.com/a.jpg"], category: "식품", archetype: null, mood: "playful", facts, certifications: "", keyFeatures: "동백, 휴대", wornTop: false, price: 18900, ctaBadges: ["무료배송"], ...o })!;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  for (let i = 1; i < HERO_LAYER_ORDER.length; i += 1) if (HERO_LAYER_Z[HERO_LAYER_ORDER[i]!] < HERO_LAYER_Z[HERO_LAYER_ORDER[i - 1]!]) fails.push(`레이어 z 순서 역전 ${HERO_LAYER_ORDER[i]}`);
  for (const v of HERO_V2_VARIANTS) for (const l of HERO_V3_LAYERS[v]) if (l.id === "sticker" && l.region !== "photo") fails.push(`${v}: 스티커가 사진 영역 밖`);
  eq("고스트 = 짧은 쪽", ghostWordOf("드림 미스트", "Dream Mist"), "드림 미스트");
  eq("영문이면 대문자", ghostWordOf("가나다라마바사아자차카", "Mist"), "MIST");
  const p = base();
  if (!p.v3) { fails.push("v3 계획 없음"); return fails; }
  eq("스티커 = 입력 배지", p.v3.sticker, "피부 테스트 완료");
  eq("스티커로 쓴 배지는 배지 줄에서 뺌", p.badges.includes("피부 테스트 완료"), false);
  eq("가격 = 입력 가격(스트립 없는 카테고리)", p.v3.price, "18,900원");
  eq("뷰티(가격 스트립)는 가격 태그 없음", base({ category: "화장품/뷰티" }).v3?.price, undefined);
  eq("배지 없으면 혜택 배지", base({ hero: { ...hero, badge: "" } as HeroSection }).v3?.sticker, "무료배송");
  const pal = heroPalette(getCategoryTheme("식품"), "식품");
  for (const v of HERO_V2_VARIANTS) {
    const plan: HeroV2Plan = { ...p, variant: v, imageUrl: v === "E" ? "" : p.imageUrl };
    const html = heroV2Html(hero, plan, pal, "alt");
    // 장식 레이어 z(마크업 data-hz)는 표와 같고, 같은 사진 감싸개 안에서 모티프 < 고스트 < 스티커
    const marks = [...html.matchAll(/data-hl="([a-z]+)" data-hz="(\d+)"/g)].map((m) => ({ id: m[1]!, z: Number(m[2]) }));
    for (const m of marks) if (HERO_LAYER_Z[m.id as keyof typeof HERO_LAYER_Z] !== m.z) fails.push(`${v}: ${m.id} z ${m.z}`);
    const zIndex = (id: string) => Number(new RegExp(`data-hl="${id}"[^>]*?z-index:(-?\\d+)`).exec(html)?.[1] ?? NaN);
    if (html.includes('data-hl="ghost"') && html.includes('data-hl="sticker"') && !(zIndex("ghost") < zIndex("sticker"))) fails.push(`${v}: 고스트가 스티커 위`);
    if (html.includes('data-hl="motif"') && html.includes('data-hl="ghost"') && !(zIndex("motif") < zIndex("ghost"))) fails.push(`${v}: 모티프가 고스트 위`);
    if (/data-hl="ghost"/.test(html) && !/data-hl="ghost"[^>]*aria-hidden|aria-hidden="true" data-hl="ghost"/.test(html)) fails.push(`${v}: 고스트가 장식 표식 없음`);
    if (/data-hl="sticker"/.test(html) && !/data-hero-photo data-hl="sticker"/.test(html)) fails.push(`${v}: 스티커가 사진 실패 시 접히지 않음`);
    // 글자: 입력만
    const texts = [...html.matchAll(/data-hl="(ghost|price)"[^>]*>([^<]+)</g)].map((m) => m[2]!);
    for (const t of texts) if (![p.v3.ghost, p.v3.price].includes(t.replace(/&amp;/g, "&"))) fails.push(`${v}: 입력에 없는 글 ${t}`);
    if (v === "E" && /data-hl="sticker"/.test(html)) fails.push("E 사진 없음인데 스티커");
    if (!/data-hero-fail|HERO_FAIL|onerror=/.test(html) && plan.imageUrl) fails.push(`${v}: 사진 실패 폴백 없음`);
  }
  // 대비: 고스트 위 글자, 스티커·가격 태그
  for (const face of ["#B23A5B", "#2F9E8F", "#0E0E10", "#F4E9DC"]) {
    const light = contrastRatioToken("#FFFFFF", face) >= 4.5;
    const fg = light ? "#FFFFFF" : "#1B1B18";
    const g = ghostColor(face, fg, light ? "#FFFFFF" : "#2F4A7A");
    if (contrastRatioToken(fg, face) >= 4.5 && contrastRatioToken(fg, g) < 4.5) fails.push(`고스트 ${g} 위 글자 대비 부족(면 ${face})`);
  }
  for (const c of ["#F2D45C", "#7FD3F7", "#FFFFFF", "#D9466F"]) if (contrastRatioToken("#FFFFFF", darkenForWhite(c)) < 4.5) fails.push(`스티커 바탕 ${c} 대비 부족`);
  return fails;
}
