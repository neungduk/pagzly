import type { DetailSection } from "@/lib/types/generate";
import { designV4On } from "@/lib/design-v4";
import { faceKeyOf } from "@/lib/layout-variants";
import { faceKeysFor, legacyTopPads, markTightTops } from "@/lib/rhythm-v4";
import { orderSectionsForFlow } from "@/lib/section-flow-order";
import { limitBoldBlocks } from "@/lib/detail-visual-rhythm";
import { enforceImageSourceCapIndexed } from "@/lib/image-source-cap";
import { assignPersonaStrip, type StripImageHints } from "@/lib/persona-strip";
import { imageSourceGroups, type ImageHashByUrl } from "@/lib/gallery-dedupe";
import { FASHION_CATEGORY, isWornFashionPhoto } from "@/lib/fashion-composite-policy";
import type { FlowVariant } from "@/lib/style-packs";
import { insertCompositionGallery, matchPhotosToText, personaChipAllow } from "@/lib/photo-text-match";
import { insertSceneSlots, type SceneImageMap } from "@/lib/scene-images";
import { NUMERIC_GATE_ENABLED, numericClaimGate, type ClaimFacts } from "@/lib/numeric-claim-gate";
import { COMPARISON_POLICY_ENABLED, applyComparisonPolicy, type PolicyChange } from "@/lib/comparison-policy";
import { backfillPhotoGallery } from "@/lib/section-backfill";
import { COMPOSITION_V2_ENABLED, applyRecipeOrder, applyStoryOrder, storyOrderOn } from "@/lib/detail-story-order";
import { planImpact } from "@/lib/impact-templates";
import { planEvidence } from "@/lib/evidence-modules";
import { planIllustrations } from "@/lib/illust-sections";
import { planBoost } from "@/lib/impact-boost";
import { planSpecials } from "@/lib/special-sections";
import { planHeroV2 } from "@/lib/hero-spec";
import { planReference } from "@/lib/reference-sections";
import { planPolish } from "@/lib/polish-sections";
import { ARCHETYPE_V1_ENABLED, detectArchetype, type ArchetypeResult } from "@/lib/product-archetype";
import { MOODS, pickMood, recipeFor, type MoodId } from "@/lib/archetype-recipes";
import type { HeroVariant } from "@/lib/style-packs";
import { planPhotoLayouts } from "@/lib/photo-layouts";
import { planV4 } from "@/lib/layout-variants";
import { estimateSectionHeight } from "@/lib/impact-templates";

export type DisplaySections = {
  sections: DetailSection[];
  /** sourceIndexes[i] = 표시 i번째 섹션의 입력 인덱스 (편집 콜백을 원본 위치로 되돌릴 때) */
  sourceIndexes: number[];
  /** 436차 — 판별한 제품 유형(아키타입)과 mood. 보고·검증용, 렌더에는 쓰지 않는다 */
  archetype?: { result: ArchetypeResult; mood: MoodId | null; hero: HeroVariant | null };
  /** 427차 — 비교 정책이 한 일(제거·문장 삭제·판매자 표·대체·사진 갤러리). 보고·검증용, 렌더에는 쓰지 않는다 */
  policyChanges?: PolicyChange[];
  /** 445차 3 — 이전(비임팩트) 섹션 중 위 여백을 줄일 곳(섹션 번호 → px, DESIGN_V4). 라이브·export가 같은 값을 data-pz-top 표식과 같은 CSS로 적용 */
  topPads?: Record<number, number>;
};

const DANGLING_TAIL = /[\s,，、·;:\-–—]+$/u;

/** 말풍선은 긴 문구를 잘라 만든 경우가 많아 끝에 쉼표·가운뎃점이 남는다 — 표시할 때만 떼어낸다 */
function trimCalloutTail(section: DetailSection): DetailSection {
  if (section.type !== "image_text" || !section.callout || !DANGLING_TAIL.test(section.callout)) return section;
  const callout = section.callout.replace(DANGLING_TAIL, "");
  return callout ? { ...section, callout } : section;
}

const HEADING_NOISE = /[\s.,!?·:;'"“”‘’()\[\]-]+/gu;
/** 제목이 같은지 볼 때 띄어쓰기·문장부호는 무시한다 */
const headingKey = (heading: string) => heading.replace(HEADING_NOISE, "").toLowerCase();
/** 바로 앞 제목 있는 섹션 2곳 안에 같은 제목이 있으면 겹친 것으로 본다(사이에 짧은 띠 섹션이 끼는 경우 포함) */
const REPEAT_WINDOW = 2;

/** 제목을 빼도 빈 머리 여백이 남지 않는 섹션(라이브 TwoToneTitle·export twoToneDh2가 빈 제목이면 아무것도 그리지 않음) */
function canHideHeading(section: DetailSection): boolean {
  return section.type === "image_text" && (section.layout === "callout" || section.slot === "feature_callout");
}

/** 같은 제목이 연달아 나오면 뒤쪽 제목만 표시에서 뺀다 — 새 문구를 만들지 않고, 섹션·번호는 그대로 둔다 */
function hideRepeatedHeadings(sections: DetailSection[]): DetailSection[] {
  const recent: string[] = [];
  return sections.map((section) => {
    if (section.type === "hero" || !("heading" in section) || typeof section.heading !== "string") return section;
    const key = headingKey(section.heading);
    if (!key) return section;
    const repeated = recent.includes(key);
    recent.push(key);
    if (recent.length > REPEAT_WINDOW) recent.shift();
    return repeated && canHideHeading(section) ? ({ ...section, heading: "" } as DetailSection) : section;
  });
}

/** 요약 카드(compact)와 바로 옆 말풍선 카드가 같은 본문이면 요약 카드는 같은 사실을 한 번 더 읊는 것뿐이다 */
const ECHO_WINDOW = 2;
const isCompactSummary = (s: DetailSection) => s.type === "image_text" && s.layout === "compact";
const isCallout = (s: DetailSection) => s.type === "image_text" && (s.layout === "callout" || s.slot === "feature_callout");
const bodyKey = (s: DetailSection) => (s.type === "image_text" ? headingKey(s.body ?? "") : "");

function echoSummaryIndexes(sections: DetailSection[]): Set<number> {
  const out = new Set<number>();
  sections.forEach((s, i) => {
    if (!isCompactSummary(s)) return;
    const key = bodyKey(s);
    if (!key) return;
    for (let j = Math.max(0, i - ECHO_WINDOW); j <= Math.min(sections.length - 1, i + ECHO_WINDOW); j += 1) {
      if (j !== i && isCallout(sections[j]!) && bodyKey(sections[j]!) === key) out.add(i);
    }
  });
  return out;
}

/**
 * 405차 — 패션 초반 구성: 착용컷이 든 첫 갤러리를 히어로 바로 뒤(요약 띠·내비 다음 첫 본문)로 앞당긴다.
 * 패션 상세는 착용 사진으로 첫 화면을 이어 가는데, 생성 순서대로면 히어로 뒤에 고민·브랜드·포인트 글 카드가 먼저 온다.
 * 갤러리는 앞 섹션을 가리키는 문구가 없는 사진 묶음이라 옮겨도 글 흐름이 깨지지 않는다. 섹션·문구는 그대로, 순서만 바꾼다.
 * 패션이 아니거나, 히어로가 맨 앞이 아니거나, 착용컷이 든 갤러리가 없으면 그대로 둔다.
 */
export function pullWornGalleryForward(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  if (category !== FASHION_CATEGORY || sections[0]?.type !== "hero") return sections;
  const at = sections.findIndex(
    (s, i) => i > 1 && s.type === "gallery" && s.imageIndexes.some((n) => isWornFashionPhoto(category, roles?.[n])),
  );
  if (at < 0) return sections;
  const out = [...sections];
  const [gallery] = out.splice(at, 1);
  out.splice(1, 0, gallery!);
  return out;
}

/**
 * 406차 — 패션 갤러리 안에서 착용컷(착장·코디)이 디테일·평면컷보다 앞 칸을 먼저 받게 순서만 바꾼다(안정 정렬).
 * 갤러리 첫 칸이 큰 사진이라, 착용컷이 앞에 와야 "모델 착용 사진 연속"으로 보인다. 사진을 빼거나 더하지 않는다.
 * 역할 정보가 없거나 패션이 아니면 그대로 둔다.
 */
function wornFirstInGallery(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  if (category !== FASHION_CATEGORY || !roles?.length) return sections;
  return sections.map((section) => {
    if (section.type !== "gallery") return section;
    const worn = section.imageIndexes.filter((n) => isWornFashionPhoto(category, roles[n]));
    if (worn.length === 0 || worn.length === section.imageIndexes.length) return section;
    const rest = section.imageIndexes.filter((n) => !isWornFashionPhoto(category, roles[n]));
    const next = [...worn, ...rest];
    return next.every((n, i) => n === section.imageIndexes[i]) ? section : { ...section, imageIndexes: next };
  });
}

/**
 * 405차 — 패션 히어로가 착용컷이면 사진을 위쪽 기준으로 맞춘다. 세로 전신 원본(2:3)이 4:5 히어로 칸에 가운데 기준으로
 * 들어가면 넓은 폭(750)에서 위아래가 잘려 머리가 브랜드 알약 높이까지 올라간다. 좁은 폭(390)은 좌우만 잘려 영향이 없다.
 */
function anchorWornHeroTop(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  return sections.map((section) =>
    section.type === "hero" && isWornFashionPhoto(category, roles?.[section.imageIndex])
      ? { ...section, photoTopAnchored: true }
      : section,
  );
}

/**
 * 404차 — 패션 착용컷(착장·코디)은 원본 그대로 쓰여 얼굴이 사진 위쪽에 들어 있다. STEP 태그(사진 왼쪽 위)가
 * 얼굴을 덮으므로, 단계 사진 중 착용컷이 하나라도 있으면 그 섹션의 태그를 모두 글 칸으로 옮긴다(섹션 안 모양 통일).
 * 인물 검출이 꺼져 있어 사진 내용 대신 역할로 판단한다. 문구는 그대로("STEP 0N"), 위치만 바뀐다.
 */
function markStepBadgesOffPeople(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
): DetailSection[] {
  return sections.map((section) => {
    if (section.type !== "step_card") return section;
    const hasPerson = section.steps.some((step) => isWornFashionPhoto(category, roles?.[step.imageIndex]));
    return hasPerson ? { ...section, stepBadgeOffImage: true } : section;
  });
}

/**
 * 표시 단계 공용 규칙 — 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 입력으로 부른다.
 * 저장 데이터는 바꾸지 않는다: 흐름 순서 → (패션: 착용컷 갤러리 앞당김) → 굵은 블록 1개 → 같은 촬영본 사진 상한 → 말풍선과 본문이 같은 요약 카드 숨김 → 말풍선 끝 문장부호 → 고민 사진 띠 → 겹친 제목 숨김.
 * 옛 세션(생성 당시 규칙이 없던 것)도 열 때 같은 결과가 된다. 새 세션에는 결과가 그대로다(멱등).
 * 편집 중에는 섹션 내용이 원본과 같아야 저장이 안전하므로 순서만 맞춘다.
 */
/** 409차 — 팩 흐름 변형 photo-first에서 착용 사진이 든 "단독 사진 블록"만 앞(갤러리 바로 뒤)으로 옮길 수 있는 슬롯 */
const PHOTO_FIRST_SLOTS = new Set(["coordination", "fit_guide"]);

/**
 * 409차 — photo-first(모노 팩): 갤러리 뒤, 글 위주 섹션(고민·브랜드·체크리스트) 앞으로 착용 사진 블록을 최대 2개 당긴다.
 * 순서만 바꾼다(섹션 추가·삭제·문구 변경 없음). 고민 → 해결 같은 글 흐름이 있는 섹션은 건드리지 않고,
 * 슬롯이 코디·핏 안내(앞 섹션을 가리키는 문구가 없는 독립 사진 블록)이고 사진이 착용컷일 때만 옮긴다. 패션 외·갤러리 없음은 그대로.
 */
export function photoFirstFlow(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
  flow: FlowVariant | undefined,
): DetailSection[] {
  if ((flow !== "photo-first" && flow !== "story-after-photo") || category !== FASHION_CATEGORY || sections[0]?.type !== "hero") return sections;
  const g = sections.findIndex((s, i) => i > 0 && s.type === "gallery");
  if (g < 0) return sections;
  const picks: number[] = [];
  sections.forEach((s, i) => {
    if (picks.length >= 2 || i <= g + 1) return;
    if (
      s.type === "image_text" &&
      s.layout === "full" &&
      PHOTO_FIRST_SLOTS.has(String(s.slot)) &&
      typeof s.imageIndex === "number" &&
      isWornFashionPhoto(category, roles?.[s.imageIndex])
    ) {
      picks.push(i);
    }
  });
  if (picks.length === 0) return sections;
  const moved = picks.map((i) => sections[i]!);
  const rest = sections.filter((_, i) => !picks.includes(i));
  rest.splice(g + 1, 0, ...moved);
  return rest;
}

/** 410차 — story-after-photo의 "글 위주 묶음"에 들어가는 섹션: 고민 → 해결(체크리스트·포인트 요약 카드)과 브랜드 소개 */
const STORY_UNIT_TYPES = new Set(["target_persona", "brand_story", "checklist"]);
const isStoryUnitMember = (s: DetailSection): boolean =>
  STORY_UNIT_TYPES.has(s.type) ||
  (s.type === "image_text" && (s.layout === "compact" || s.layout === "callout" || s.slot === "feature_callout" || s.slot === "quick_points"));
/** 사진이 이끄는 블록: 사진이 든 단독 image_text(전폭·분할), STEP 카드 */
const isPhotoLed = (s: DetailSection): boolean =>
  (s.type === "image_text" && (s.layout === "full" || s.layout === undefined) && typeof s.imageIndex === "number") ||
  (s.type === "step_card" && s.steps.some((st) => typeof st.imageIndex === "number")) ||
  (s.type === "color_variation" && s.options.some((o) => typeof o.imageIndex === "number"));
const STORY_PHOTO_LIMIT = 3;

/**
 * 410차 — story-after-photo(모노 팩): photo-first(착용 사진 블록을 갤러리 뒤로)에 더해, 히어로·갤러리 뒤에 오는
 * "고민 → 해결 글 묶음"(고민·브랜드·체크리스트·포인트 요약 카드)을 통째로 사진 블록 뒤로 옮긴다.
 *  - 묶음은 갤러리 바로 뒤에서 이어지는 연속 구간이며 고민(target_persona)과 체크리스트가 모두 있어야 한다(없으면 그대로).
 *  - 묶음 안의 순서는 그대로, 묶음 뒤에 오던 사진 블록(최대 3개)만 묶음 앞으로 당긴다. 섹션 추가·삭제·문구 변경 없음.
 *  - 사이즈·소재·세탁·주의·FAQ·배송·구매(확인 영역)는 건드리지 않는다. 하이라이트 요약(highlight_box)은 묶음 뒤에 그대로 있다.
 */
export function storyAfterPhotoFlow(
  sections: DetailSection[],
  category: string | undefined,
  flow: FlowVariant | undefined,
): DetailSection[] {
  if (flow !== "story-after-photo" || category !== FASHION_CATEGORY || sections[0]?.type !== "hero") return sections;
  // 첫 갤러리 뒤(+ photo-first가 당긴 사진 블록 뒤)에서 글 묶음이 시작되는 곳
  let start = 1;
  while (start < sections.length && (sections[start]!.type === "gallery" || isPhotoLed(sections[start]!))) start += 1;
  if (!sections[start] || !isStoryUnitMember(sections[start]!)) return sections;
  let end = start;
  while (end < sections.length && isStoryUnitMember(sections[end]!)) end += 1;
  const unit = sections.slice(start, end);
  if (!unit.some((s) => s.type === "target_persona") || !unit.some((s) => s.type === "checklist")) return sections;
  // 묶음 뒤, 확인 영역 앞에서 사진 블록을 찾는다
  const picks: number[] = [];
  for (let i = end; i < sections.length && picks.length < STORY_PHOTO_LIMIT; i += 1) {
    const s = sections[i]!;
    if (isPhotoLed(s)) picks.push(i);
  }
  if (picks.length === 0) return sections;
  const moved = picks.map((i) => sections[i]!);
  const rest = sections.filter((_, i) => !picks.includes(i));
  rest.splice(start, 0, ...moved);
  return rest;
}

/**
 * 413차 — photo-lead: 사진 블록(착용 STEP 카드 또는 착용 코디·핏 사진) 하나만 갤러리 바로 뒤로 당긴다. 나머지 순서는 그대로.
 * story-after-photo·photo-first보다 약한 변형이다. 고민 → 해결(target_persona → checklist·포인트 요약 카드) 짝은 쪼개지 않는다:
 * 갤러리 바로 뒤가 체크리스트·요약 카드(짝의 뒤쪽)이면 옮기지 않는다. 섹션 추가·삭제·문구 변경 없음. 패션 외·갤러리 없음은 그대로.
 */
export function photoLeadFlow(
  sections: DetailSection[],
  category: string | undefined,
  roles: StripImageHints["roles"],
  flow: FlowVariant | undefined,
): DetailSection[] {
  if (flow !== "photo-lead" || category !== FASHION_CATEGORY || sections[0]?.type !== "hero") return sections;
  const g = sections.findIndex((s, i) => i > 0 && s.type === "gallery");
  if (g < 0) return sections;
  const at = g + 1;
  const next = sections[at];
  if (!next) return sections;
  // 짝의 뒤쪽(체크리스트·요약 카드)이 바로 뒤에 오면 짝 사이에 끼어들 수 있으니 그대로 둔다
  if (next.type === "checklist" || (next.type === "image_text" && (next.layout === "compact" || next.slot === "quick_points"))) return sections;
  const isWornPhotoBlock = (s: DetailSection): boolean =>
    (s.type === "step_card" && s.steps.some((st) => typeof st.imageIndex === "number" && isWornFashionPhoto(category, roles?.[st.imageIndex]))) ||
    (s.type === "image_text" &&
      s.layout === "full" &&
      PHOTO_FIRST_SLOTS.has(String(s.slot)) &&
      typeof s.imageIndex === "number" &&
      isWornFashionPhoto(category, roles?.[s.imageIndex]));
  const pick = sections.findIndex((s, i) => i > at && isWornPhotoBlock(s));
  if (pick < 0) return sections;
  const rest = sections.filter((_, i) => i !== pick);
  rest.splice(at, 0, sections[pick]!);
  return rest;
}

/** 439차 — 히어로 v3 가격 태그·스티커용 입력(cta_price 가격·혜택 배지) */
function ctaOf(sections: DetailSection[]): { price?: number; ctaBadges?: string[] } {
  const cta = sections.find((s) => s.type === "cta_price");
  if (!cta || cta.type !== "cta_price") return {};
  return { ...(typeof cta.price === "number" ? { price: cta.price } : {}), ...(Array.isArray(cta.badges) ? { ctaBadges: cta.badges.filter((b): b is string => typeof b === "string") } : {}) };
}

export function applyDisplayRules(
  sectionsInput: DetailSection[],
  imageUrls: readonly string[],
  opts: {
    editing?: boolean;
    imageHashByUrl?: ImageHashByUrl;
    category?: string;
    flow?: FlowVariant;
    /** 419차 — 사진별 비전 태그(뷰티 글·사진 일치 게이트용). 없으면 게이트가 아무것도 바꾸지 않는다 */
    tags?: ReadonlyArray<ReadonlyArray<string> | undefined>;
    /** 419차 — 장면(합성) 이미지가 채워진 슬롯이 있는지 */
    hasSceneImage?: boolean;
    /** 422차 — 제품 높이(cm) 입력이 있는지(크기·휴대 카드의 손에 든 컷 허용 조건) */
    hasSizeInfo?: boolean;
    /** 424차 — 숫자 주장 게이트용 입력 사실(lib/numeric-claim-gate buildClaimFacts). 없으면 게이트를 건너뛴다(기존 출력 그대로) */
    claimFacts?: ClaimFacts;
    /** 419차 — 장면(합성) 이미지 슬롯(세션 sceneImages). 뷰티에서만 scene_image 섹션이 끼워진다 */
    sceneImages?: SceneImageMap;
    /** 435차 — 브랜드 스토리 라벨 칩용 브랜드명(입력) */
    brandName?: string | null;
  } & StripImageHints = {},
): DisplaySections {
  // 427차 — 비교 정책: 판매자가 비교 데이터를 넣지 않았으면 비교 차트·표를 빼고 입력 근거가 있는 섹션으로 채운다(편집 모드·claimFacts 없음은 그대로)
  const policy = COMPARISON_POLICY_ENABLED && opts.claimFacts && !opts.editing ? applyComparisonPolicy(sectionsInput, opts.claimFacts, { category: opts.category, imageCount: imageUrls.length }) : null;
  const gateInput = policy ? policy.sections : sectionsInput;
  // 424차 — 숫자 주장 코드 게이트: 입력에 없는 수치·빈도·시간 문구를 지운다(편집 모드는 원문 그대로). 위반이 없으면 원본 배열을 그대로 쓴다
  const gate = NUMERIC_GATE_ENABLED && opts.claimFacts && !opts.editing ? numericClaimGate(gateInput, opts.claimFacts) : null;
  const gated = gate !== null && gate.violations.length > 0;
  const sections = gated ? gate.sections : gateInput;
  // 표시 번호 → 입력 번호: 게이트가 뺀 섹션과 정책이 끼운·뺀 섹션을 차례로 되돌린다
  const keptMap = gated || policy ? (i: number) => { const a = gated ? gate.keptIndexes[i] ?? i : i; return policy ? policy.sourceIndexes[a] ?? a : a; } : null;
  // 433차 — 스토리 순서(훅 → 공감 → 해결 → 근거 → 사용 → 정보 → 신뢰 → 구매). 뷰티·패션만, 편집 모드·claimFacts 없음은 그대로. 순서만 바꾸고 섹션 객체는 같은 참조
  const storyOrdered = opts.claimFacts && !opts.editing && storyOrderOn(opts.category) ? applyStoryOrder(sections).sections : sections;
  const ordered = storyAfterPhotoFlow(
    photoLeadFlow(
      photoFirstFlow(
        pullWornGalleryForward(orderSectionsForFlow(storyOrdered), opts.category, opts.roles),
        opts.category,
        opts.roles,
        opts.flow,
      ),
      opts.category,
      opts.roles,
      opts.flow,
    ),
    opts.category,
    opts.flow,
  );
  // 436차 — 제품 유형(아키타입): 규칙 기반 판별 → 레시피(섹션 우선순위·임팩트/사진 선호)·mood. 못 정하면(폴백) 현재 구성 그대로
  const arche = ARCHETYPE_V1_ENABLED && opts.claimFacts && !opts.editing ? detectArchetype({ category: opts.category, productName: opts.claimFacts.productName, brandName: opts.brandName, keyFeatures: opts.claimFacts.source.keyFeatures, targetCustomer: opts.claimFacts.source.targetCustomer, ingredients: opts.claimFacts.source.ingredients }) : null;
  const recipe = arche && !arche.fallback ? recipeFor(arche.id) : null;
  const mood: MoodId | null = recipe ? pickMood(recipe, `${opts.claimFacts?.productName ?? ""} ${opts.brandName ?? ""} ${opts.claimFacts?.source.keyFeatures ?? ""}`) : null;
  const recipeOrdered = recipe ? applyRecipeOrder(ordered, recipe) : ordered;
  const orderIndexes = recipeOrdered.map((s) => sections.indexOf(s));
  if (opts.editing) return { sections: recipeOrdered, sourceIndexes: orderIndexes };
  const sourceOf = imageSourceGroups(imageUrls, opts.imageHashByUrl);
  // 419차 — 뷰티 글·사진 일치(개수·순서 불변이라 sourceIndexes가 그대로 맞는다)
  const photoCtx = { category: opts.category, roles: opts.roles, origins: opts.origins, tags: opts.tags, hasSceneImage: opts.hasSceneImage, hasSizeInfo: opts.hasSizeInfo };
  const matched = matchPhotosToText(recipeOrdered, imageUrls.length, photoCtx).sections;
  const capped = enforceImageSourceCapIndexed(limitBoldBlocks(matched), imageUrls.length, undefined, sourceOf);
  const echoes = echoSummaryIndexes(capped.sections);
  const kept = capped.sections.filter((_, i) => !echoes.has(i));
  // 패션 사람 사진 규칙(404~406차): STEP 태그를 사진 밖으로 → 착용컷 히어로 위쪽 기준 → 갤러리 착용컷 먼저
  const finalSections = [markStepBadgesOffPeople, anchorWornHeroTop, wornFirstInGallery].reduce(
    (acc, rule) => rule(acc, opts.category, opts.roles),
    hideRepeatedHeadings(
      assignPersonaStrip(kept.map(trimCalloutTail), imageUrls.length, sourceOf, {
        roles: opts.roles,
        origins: opts.origins,
        allow: personaChipAllow(photoCtx),
      }),
    ),
  );
  const finalSources = capped.sourceIndexes.filter((_, i) => !echoes.has(i)).map((i) => orderIndexes[i]!);
  // 419차 — 상자 컷이 있을 때만 뷰티 구성 갤러리(표시 전용, 편집 모드 아님)
  const withComposition = insertCompositionGallery(finalSections, finalSources, imageUrls.length, photoCtx);
  const withScenes = insertSceneSlots(withComposition.sections, withComposition.sourceIndexes, opts.sceneImages, opts.category);
  // 427차 — 비교 차트 자리를 텍스트 근거로 못 채웠으면, 어떤 섹션도 쓰지 않은 사진이 2장 이상일 때만 갤러리로 채운다(뷰티 태그가 있으면 정면·근접 컷만)
  const photo = policy?.pendingPhotos
    ? backfillPhotoGallery(withScenes.sections, withScenes.sourceIndexes, imageUrls.length, { anchorKey: policy.pendingPhotos.anchorKey, sourceOf, allow: personaChipAllow(photoCtx) })
    : null;
  const afterBackfill = photo ?? withScenes;
  // 433차 — 임팩트 화면 템플릿(표시 전용, 편집 모드·claimFacts 없음은 그대로). 기존 문구·입력 수치·사진만 재배치
  // 433차 1-4 — 증빙 모듈(시험·인증 카드·후기 통계 카드): 판매자 입력이 있을 때만
  const evidence = opts.claimFacts && !opts.editing && COMPOSITION_V2_ENABLED ? planEvidence(afterBackfill.sections, afterBackfill.sourceIndexes, { category: opts.category, facts: opts.claimFacts }) : null;
  const withEvidence = evidence && evidence.added.length > 0 ? evidence : afterBackfill;
  // 431차 1-3 — 인포 구간 SVG 일러스트(키워드가 매핑되는 구간만)
  // 435차 — 브랜드 스토리·추천/참고 카드 임팩트 보강(제목-내용 일치)
  // 431차 1-3 — 인포 구간 SVG 일러스트(키워드가 매핑되는 구간만). 435차: 일러스트가 글 카드 후보를 먼저 가져가도록 보강보다 앞에서 한다
  const illust = opts.claimFacts && COMPOSITION_V2_ENABLED ? planIllustrations(withEvidence.sections, withEvidence.sourceIndexes, { category: opts.category, style: mood ? MOODS[mood].illust : null }) : null;
  const withIllust0 = illust && illust.placed.length > 0 ? illust : withEvidence;
  // 435차 — 브랜드 스토리·추천/참고 카드·주의 카드·글 카드 임팩트 보강(제목-내용 일치)
  const boost = opts.claimFacts && COMPOSITION_V2_ENABLED ? planBoost(withIllust0.sections, withIllust0.sourceIndexes, { brandName: opts.brandName, imageUrls, origins: opts.origins }) : null;
  const withBoost = boost && boost.placed.length > 0 ? boost : withIllust0;
  // 436차 1-3 — 아키타입 특화 섹션(스와치·타임라인·칩 월·스펙 스트립·사이즈 막대): 레시피가 허용하고 입력 요건이 맞을 때만
  const specials = opts.claimFacts && COMPOSITION_V2_ENABLED && recipe ? planSpecials(withBoost.sections, withBoost.sourceIndexes, { recipe, facts: opts.claimFacts }) : null;
  const withSpecials = specials && specials.placed.length > 0 ? specials : withBoost;
  // 437차 1-4 — 레퍼런스 반영 섹션(체크포인트 그리드·고민 말풍선·후기 요약 채팅): 입력 요건이 맞을 때만
  const reference = opts.claimFacts && COMPOSITION_V2_ENABLED ? planReference(withSpecials.sections, withSpecials.sourceIndexes, { facts: opts.claimFacts }) : null;
  const withReference = reference && reference.placed.length > 0 ? reference : withSpecials;
  // 438차 1-4 — 기존 섹션(FAQ·표·체크리스트·사용 단계)을 mood 디자인 언어 블록으로(DESIGN_POLISH, 문구 원문)
  const polish = opts.claimFacts && COMPOSITION_V2_ENABLED ? planPolish(withReference.sections, withReference.sourceIndexes) : null;
  const withIllust = polish && polish.placed.length > 0 ? polish : withReference;
  // 431차 2-2 — 갤러리를 사진 수에 맞는 새 레이아웃(비대칭 2장·모자이크 3장·스태거 2열)으로
  const photos = opts.claimFacts && COMPOSITION_V2_ENABLED ? planPhotoLayouts(withIllust.sections, withIllust.sourceIndexes, { category: opts.category, imageUrls, roles: opts.roles, origins: opts.origins }) : null;
  const withPhotos = photos && photos.placed.length > 0 ? photos : withIllust;
  const impact = opts.claimFacts && COMPOSITION_V2_ENABLED ? planImpact(withPhotos.sections, withPhotos.sourceIndexes, { category: opts.category, imageUrls, facts: opts.claimFacts, origins: opts.origins, roles: opts.roles, recipe, illustStyle: mood ? MOODS[mood].illust : null }) : null;
  const finalOut0 = impact && impact.placed.length > 0 ? { sections: impact.sections, sourceIndexes: impact.sourceIndexes } : withPhotos;
  // 436차 — mood를 모든 임팩트 블록에 찍는다(여백·반경·그림자·구분선·제목 굵기 토큰). mood가 없으면(유형 미정·플래그 off) 지금 화면 그대로
  const finalOut1a = mood ? { sections: finalOut0.sections.map((s) => (s.type === "impact" && !s.mood ? ({ ...s, mood } as DetailSection) : s)), sourceIndexes: finalOut0.sourceIndexes } : finalOut0;
  // 439차 — 디자인 엔진 v4(레이아웃 변주·후킹 구조·모티프·타이포 연출). DESIGN_V4=off면 입력 그대로(438차와 같은 화면)
  const v4 = opts.claimFacts && COMPOSITION_V2_ENABLED ? planV4(finalOut1a.sections, finalOut1a.sourceIndexes, { mood, seedKey: `${opts.claimFacts.productName}|${opts.category ?? ""}`, imageUrls, origins: opts.origins, facts: opts.claimFacts, category: opts.category, height: estimateSectionHeight }) : null;
  const finalOut1 = v4 && (v4.placed.length > 0 || v4.moved.length > 0 || v4.inserted.length > 0) ? { sections: v4.sections, sourceIndexes: v4.sourceIndexes } : finalOut1a;
  // 437차 — 첫 화면 히어로 재설계 계획(제품명이 입력에 있을 때만, 편집 모드·claimFacts 없음은 기존 히어로)
  const heroSec = finalOut1.sections[0];
  const heroPlan = opts.claimFacts && !opts.editing && heroSec?.type === "hero" ? planHeroV2({ hero: heroSec, productName: opts.claimFacts.productName, brandName: opts.brandName, imageUrls, origins: opts.origins, tags: opts.tags, roles: opts.roles, category: opts.category, archetype: arche && !arche.fallback ? arche.id : null, mood, facts: opts.claimFacts, certifications: opts.claimFacts.source.certifications, keyFeatures: opts.claimFacts.source.keyFeatures, wornTop: heroSec.photoTopAnchored === true, ...ctaOf(finalOut1.sections) }) : null;
  const finalOut = heroPlan && heroSec?.type === "hero" ? { sections: [({ ...heroSec, v2: heroPlan } as DetailSection), ...finalOut1.sections.slice(1)], sourceIndexes: finalOut1.sourceIndexes } : finalOut1;
  const policyChanges = policy ? [...policy.changes, ...(photo ? [{ type: "filled" as const, index: 0, kind: "photos" as const, reason: `사용하지 않은 사진 ${photo.indexes.join(",")}번`, slot: "backfill_photos" }] : [])] : undefined;
  // 444차 3 — 같은 면 이웃의 위 여백 해석(DESIGN_V4, lib/rhythm-v4.ts). v4 off면 그대로
  // 445차 3 — 이전(비임팩트) 섹션도 면 키를 읽어 같은 규칙: 임팩트 위 여백은 rhythm:"tight", 이전 섹션 위 여백은 topPads(섹션 번호 → px)로 내보낸다
  const rhythmKey = designV4On() ? faceKeysFor(finalOut.sections, faceKeyOf) : faceKeyOf;
  const rhythmSections = designV4On() ? markTightTops(finalOut.sections, rhythmKey) : finalOut.sections;
  const topPads = designV4On() ? legacyTopPads(finalOut.sections, rhythmKey, opts.category ?? "") : {};
  return { sections: rhythmSections, ...(Object.keys(topPads).length ? { topPads } : {}), sourceIndexes: keptMap ? finalOut.sourceIndexes.map((i) => keptMap(i)) : finalOut.sourceIndexes, ...(policyChanges ? { policyChanges } : {}), ...(arche ? { archetype: { result: arche, mood, hero: recipe?.hero ?? null } } : {}) };
}
