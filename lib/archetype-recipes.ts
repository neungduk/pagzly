/**
 * 436차 1-2 — 아키타입 레시피(데이터). 유형이 구성 자체를 바꾸도록, 코드는 이 표를 읽어 기존 표시 단계 엔진(433 스토리 순서·임팩트 회전·431 일러스트·사진 레이아웃)에 전달한다.
 *  - stageOverride/priority: 스토리 순서 엔진(lib/detail-story-order)의 단계 재배치(슬롯·종류 → 단계)와 같은 단계 안 우선순위(클수록 앞).
 *  - rotation/maxPerKind/skip: 433·431차 임팩트·사진 템플릿 선호(순서·상한·제외).
 *  - moods: 유형별 기본 분위기 1~2개. 입력 키워드(상품명·브랜드·핵심 키워드)가 허용된 mood와 맞으면 그 mood.
 *  - hero: 히어로 변형 선호(기존 변형 중에서 고름, 1-4).
 *  - specials: 유형 특화 섹션 종류 허용(1-3, 입력이 있을 때만 실제로 만들어진다).
 * 레시피는 입력에 근거한 섹션만 다룬다: 없는 슬롯은 무시되고, 레시피가 새 섹션·문구를 만들지 않는다.
 */
import type { ArchetypeId } from "@/lib/product-archetype";
import type { StoryStage } from "@/lib/detail-story-order";
import type { IllustStyle } from "@/lib/illustrations/core";
import type { HeroVariant, PackLayout } from "@/lib/style-packs";

export type MoodId = "minimal-luxe" | "natural" | "clinic" | "playful" | "street" | "warm";
export const MOOD_IDS: readonly MoodId[] = ["minimal-luxe", "natural", "clinic", "playful", "street", "warm"];
export const MOOD_LABEL: Record<MoodId, string> = { "minimal-luxe": "미니멀 럭셔리", natural: "내추럴/오가닉", clinic: "클리닉/신뢰", playful: "플레이풀/팝", street: "스트리트/볼드", warm: "따뜻한 일상" };

export type DividerKind = "wave" | "slant" | "line" | "none";
/** mood가 정하는 토큰 — 기존 값을 1.0(= 지금 화면)으로 둔 배율이라 mood가 없으면 지금과 같다 */
export type MoodTokens = {
  /** 섹션 상하 여백 배율(조밀 0.85 · 보통 1 · 여유 1.2) */
  pad: number;
  /** 모서리 반경 배율 */
  r: number;
  /** 그림자 세기 배율 */
  sh: number;
  divider: DividerKind;
  /** 임팩트 제목 굵기·자간 */
  titleWeight: 700 | 800 | 900;
  titleTracking: string;
  illust: IllustStyle;
};

export const MOODS: Record<MoodId, MoodTokens> = {
  "minimal-luxe": { pad: 1.2, r: 0.4, sh: 0.5, divider: "line", titleWeight: 700, titleTracking: "0.005em", illust: "line" },
  natural: { pad: 1.1, r: 1.5, sh: 0.8, divider: "wave", titleWeight: 700, titleTracking: "-0.01em", illust: "flat" },
  clinic: { pad: 0.95, r: 0.8, sh: 0.7, divider: "line", titleWeight: 800, titleTracking: "-0.02em", illust: "solid" },
  playful: { pad: 0.9, r: 1.8, sh: 1.3, divider: "wave", titleWeight: 900, titleTracking: "-0.02em", illust: "solid" },
  street: { pad: 0.85, r: 0.2, sh: 1.4, divider: "slant", titleWeight: 900, titleTracking: "-0.03em", illust: "flat" },
  warm: { pad: 1.05, r: 1.2, sh: 1, divider: "wave", titleWeight: 800, titleTracking: "-0.015em", illust: "solid" },
};

/** 입력 키워드 → mood(상품명·브랜드·핵심 키워드에서 센다) */
export const MOOD_KEYWORDS: Array<[MoodId, RegExp]> = [
  ["clinic", /더마|시카|저자극|피부과|테스트|무자극|순한|민감|진정|의료|병원/],
  ["natural", /천연|오가닉|비건|식물|내추럴|자연|유기농|허브|그린|동백|꽃/],
  ["minimal-luxe", /프리미엄|럭셔리|미니멀|클래식|심플|무지|고급|에디션|시그니처/],
  ["playful", /귀여|팝|컬러풀|캐릭터|젤리|키즈|아기|파스텔|러블리|말랑/],
  ["street", /스트릿|스트리트|오버핏|힙|볼드|그래픽|워싱|빈티지|와이드/],
  ["warm", /따뜻|포근|데일리|일상|집|가족|아늑|코지|도톰|니트/],
];

type Kind = "statement" | "number" | "callout" | "bleed" | "split" | "inset" | "frame" | "zoom";

export type Recipe = {
  id: Exclude<ArchetypeId, "default">;
  moods: MoodId[];
  /** 슬롯 또는 섹션 종류 → 스토리 단계(1훅 2공감 3해결 4근거 5사용 6정보 7신뢰·정책 8구매) */
  stageOverride: Record<string, StoryStage>;
  /** 같은 단계 안 우선순위(클수록 앞, 기본 0) */
  priority: Record<string, number>;
  /** 사진 한 장 템플릿 회전 순서와 종류별 상한, 제외 */
  rotation: Kind[];
  maxPerKind: Partial<Record<Kind, number>>;
  skip: Kind[];
  /** 히어로 변형 선호(기존 변형 중에서) */
  hero: HeroVariant | null;
  /** 허용하는 유형 특화 섹션(1-3) */
  specials: Array<"swatch" | "timeline" | "chipwall" | "specstrip" | "sizebars">;
  /** 한 줄 설명(보고서용) */
  note: string;
};

const R = (r: Recipe): Recipe => r;
export const RECIPES: Record<Exclude<ArchetypeId, "default">, Recipe> = {
  "beauty-skincare": R({
    id: "beauty-skincare", moods: ["natural", "clinic"],
    stageOverride: { usage_steps: 4, step_card: 4 },
    priority: { ingredient_highlight: 3, texture_feel: 2, usage_steps: 1, step_card: 1, how_it_works: 0, stat_infographic: -1 },
    rotation: ["frame", "zoom", "bleed", "split", "inset"], maxPerKind: { frame: 2, zoom: 1 }, skip: [],
    hero: null, specials: ["timeline", "chipwall"],
    note: "성분·사용감·루틴 앞세움, 프레임·확대 컷 선호",
  }),
  "beauty-makeup": R({
    id: "beauty-makeup", moods: ["playful", "minimal-luxe"],
    stageOverride: { color_variation: 3 },
    priority: { color_variation: 3, texture_feel: 2, detail_zoom: 1, usage_steps: 1 },
    rotation: ["zoom", "bleed", "split", "frame", "inset"], maxPerKind: { zoom: 2 }, skip: ["callout"],
    hero: "framed", specials: ["swatch", "timeline"],
    note: "색상·발색 앞세움, 확대 컷·큰 사진 선호",
  }),
  "beauty-hairbody": R({
    id: "beauty-hairbody", moods: ["natural", "warm"],
    stageOverride: { usage_steps: 4, step_card: 4 },
    priority: { ingredient_highlight: 2, texture_feel: 2, usage_steps: 2 },
    rotation: ["frame", "split", "bleed", "zoom", "inset"], maxPerKind: {}, skip: [],
    hero: "arch", specials: ["timeline", "chipwall"],
    note: "사용 루틴·성분, 프레임·분할",
  }),
  "beauty-inner": R({
    id: "beauty-inner", moods: ["clinic", "natural"],
    stageOverride: { usage_steps: 4, step_card: 4, certificate_evidence: 3 },
    priority: { ingredient_highlight: 3, certificate_evidence: 2, usage_steps: 1 },
    rotation: ["inset", "frame", "bleed", "split", "zoom"], maxPerKind: { number: 2 }, skip: [],
    hero: "arch", specials: ["chipwall", "timeline"],
    note: "성분·섭취법·인증 앞세움, 신뢰 톤",
  }),
  "fashion-top": R({
    id: "fashion-top", moods: ["warm", "minimal-luxe", "street"],
    stageOverride: { fabric_composition: 4, fit_guide: 4 },
    priority: { detail_zoom: 3, texture_feel: 2, fabric_composition: 2, fit_guide: 1 },
    rotation: ["bleed", "zoom", "inset", "split", "frame"], maxPerKind: { zoom: 2 }, skip: ["callout"],
    hero: null, specials: ["sizebars", "swatch"],
    note: "질감 클로즈업·소재·핏 앞세움, 풀블리드·확대",
  }),
  "fashion-bottom": R({
    id: "fashion-bottom", moods: ["street", "minimal-luxe"],
    stageOverride: { fit_guide: 4, size_table: 4 },
    priority: { fit_guide: 3, detail_zoom: 2, fabric_composition: 1 },
    rotation: ["inset", "bleed", "split", "zoom", "frame"], maxPerKind: {}, skip: ["callout"],
    hero: "caption-below", specials: ["sizebars", "swatch"],
    note: "핏·사이즈 앞세움, 인셋 카드",
  }),
  "fashion-outer": R({
    id: "fashion-outer", moods: ["warm", "minimal-luxe", "street"],
    stageOverride: { fabric_composition: 4 },
    priority: { detail_zoom: 3, fabric_composition: 2, seasonal_styling: 1, coordination: 1 },
    rotation: ["bleed", "inset", "zoom", "split", "frame"], maxPerKind: { bleed: 3 }, skip: ["callout"],
    hero: "arch", specials: ["sizebars", "swatch"],
    note: "소재·디테일·계절 코디 앞세움, 풀블리드",
  }),
  "fashion-dress": R({
    id: "fashion-dress", moods: ["playful", "minimal-luxe", "warm"],
    stageOverride: { fit_guide: 4 },
    priority: { coordination: 2, seasonal_styling: 2, fit_guide: 1 },
    rotation: ["frame", "bleed", "zoom", "inset", "split"], maxPerKind: { frame: 2 }, skip: ["callout"],
    hero: "framed", specials: ["sizebars", "swatch"],
    note: "코디·핏 장면, 프레임",
  }),
  "fashion-acc": R({
    id: "fashion-acc", moods: ["minimal-luxe", "street"],
    stageOverride: { size_table: 4, spec_table: 4 },
    priority: { detail_zoom: 3, size_table: 2 },
    rotation: ["zoom", "split", "bleed", "inset", "frame"], maxPerKind: { zoom: 2 }, skip: ["callout"],
    hero: "caption-above", specials: ["swatch", "specstrip"],
    note: "디테일 확대·크기 정보 앞세움",
  }),
  "tech-mobile": R({
    id: "tech-mobile", moods: ["clinic", "street"],
    stageOverride: { connectivity: 4, spec_table: 4, usage_scenario: 4 },
    priority: { feature_detail: 3, connectivity: 2, spec_table: 2, usage_scenario: 1 },
    rotation: ["split", "inset", "bleed", "zoom"], maxPerKind: { number: 2 }, skip: ["callout", "frame"],
    hero: "bleed-bottom", specials: ["specstrip", "swatch"],
    note: "기능·연결·스펙·사용 장면, 분할·큰 숫자(콜아웃 제외)",
  }),
  "tech-appliance": R({
    id: "tech-appliance", moods: ["clinic", "warm"],
    stageOverride: { usage_scenario: 4, install_scenario: 5, spec_table: 4 },
    priority: { feature_detail: 3, usage_scenario: 2, spec_table: 2 },
    rotation: ["split", "bleed", "inset", "zoom"], maxPerKind: {}, skip: ["callout", "frame"],
    hero: "bleed-bottom", specials: ["specstrip"],
    note: "사용 장면·설치·스펙",
  }),
  "tech-peripheral": R({
    id: "tech-peripheral", moods: ["street", "clinic"],
    stageOverride: { connectivity: 4, spec_table: 4 },
    priority: { connectivity: 3, spec_table: 3, design_detail: 2 },
    rotation: ["split", "zoom", "inset", "bleed"], maxPerKind: { number: 2 }, skip: ["callout", "frame"],
    hero: "bleed-bottom", specials: ["specstrip", "swatch"],
    note: "연결·스펙 앞세움",
  }),
  "food-meal": R({
    id: "food-meal", moods: ["warm", "natural"],
    stageOverride: { how_it_works: 5, customer_scenario: 5 },
    priority: { ingredient_highlight: 3, texture_feel: 2, how_it_works: 1 },
    rotation: ["bleed", "frame", "zoom", "inset", "split"], maxPerKind: { bleed: 3 }, skip: ["callout"],
    hero: "bleed-bottom", specials: ["chipwall", "timeline"],
    note: "원재료·조리·맛 표현, 큰 사진",
  }),
  "food-snack": R({
    id: "food-snack", moods: ["playful", "warm"],
    stageOverride: {},
    priority: { ingredient_highlight: 3, texture_feel: 3 },
    rotation: ["bleed", "zoom", "frame", "split", "inset"], maxPerKind: { zoom: 2 }, skip: ["callout"],
    hero: "arch", specials: ["chipwall", "specstrip"],
    note: "맛·원재료, 확대 컷",
  }),
  "living-home": R({
    id: "living-home", moods: ["warm", "minimal-luxe"],
    stageOverride: { size_options: 4, spec_table: 4, usage_scenario: 4 },
    priority: { size_options: 3, usage_scenario: 2, spec_table: 2 },
    rotation: ["split", "inset", "bleed", "zoom", "frame"], maxPerKind: {}, skip: ["callout"],
    hero: "caption-above", specials: ["specstrip", "swatch"],
    note: "크기·수납 시나리오 앞세움",
  }),
  "living-petkids": R({
    id: "living-petkids", moods: ["playful", "warm"],
    stageOverride: { certificate_evidence: 3 },
    priority: { ingredient_highlight: 3, certificate_evidence: 2 },
    rotation: ["frame", "inset", "bleed", "zoom", "split"], maxPerKind: { frame: 2 }, skip: [],
    hero: "arch", specials: ["chipwall", "swatch"],
    note: "안전·성분 앞세움, 프레임",
  }),
};

/** 팩이 히어로를 정하지 않은 classic(bleed-bottom)일 때만 아키타입 히어로로 바꾼다. 팩이 정한 히어로(패션 스타일 디렉터)는 그대로 */
export function archetypeHeroLayout(layout: PackLayout, hero: HeroVariant | null | undefined): PackLayout {
  return hero && layout.hero === "bleed-bottom" ? { ...layout, hero } : layout;
}

export function recipeFor(id: ArchetypeId): Recipe | null {
  return id === "default" ? null : RECIPES[id];
}

/** 입력 키워드와 맞는 허용 mood가 있으면 그것, 없으면 레시피 기본(첫 번째) */
export function pickMood(recipe: Recipe, text: string): MoodId {
  // 허용 mood 중 키워드가 가장 많이 맞는 것(동점이면 레시피 순서). 맞는 키워드가 없으면 기본(첫 번째)
  let best: { mood: MoodId; hits: number } | null = null;
  for (const mood of recipe.moods) {
    const re = MOOD_KEYWORDS.find(([m]) => m === mood)?.[1];
    const hits = re ? (text.match(new RegExp(re.source, "g"))?.length ?? 0) : 0;
    if (hits > 0 && (!best || hits > best.hits)) best = { mood, hits };
  }
  return best?.mood ?? recipe.moods[0]!;
}
