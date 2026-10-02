import type { DetailSection } from "@/lib/types/generate";
import { shouldUseEditorialBleed } from "@/lib/designer-detail-patterns";
import { FLAT_SECTION_SURFACES } from "@/lib/design-tokens";

const SECTION_KICKERS: Partial<Record<DetailSection["type"], string>> = {
  checklist: "OVERVIEW",
  highlight_box: "KEY POINTS",
  image_text: "FEATURE",
  gallery: "GALLERY",
  brand_story: "STORY",
  target_persona: "FOR YOU",
  step_card: "HOW TO",
  spec_table: "INFO",
  stat_infographic: "DATA",
  comparison_chart: "COMPARE",
  tradeoff_card: "FIT CHECK",
  faq: "FAQ",
  usage_steps: "GUIDE",
  caution: "NOTICE",
};

export function getSectionKicker(section: DetailSection): string | null {
  if (section.type === "hero" || FLAT_SECTION_SURFACES) return null;
  const slotLabel = section.slot
    ? section.slot.replace(/_/g, " ").toUpperCase()
    : null;
  return SECTION_KICKERS[section.type] ?? slotLabel ?? "DETAIL";
}

export function formatSectionIndex(bodyIndex: number): string {
  return String(bodyIndex + 1).padStart(2, "0");
}

export function resolveSplitImageLeft(
  section: Extract<DetailSection, { type: "image_text" }>,
  pointIndex?: number,
): boolean {
  if (section.imagePosition === "right") return false;
  if (section.imagePosition === "left") return true;
  return (pointIndex ?? 0) % 2 === 0;
}

/**
 * 156차 — 154차가 "다음 라운드 후보"로 남겨둔 "레이아웃 비대칭 확대" 구현.
 * image_text 메인 2단 레이아웃이 항상 50/50 그리드였던 것을, POINT 순번에 따라
 * 60/40(이미지 강조)·40/60(텍스트 강조)·50/50을 3개 주기로 순환시켜 리듬을 준다.
 * 기존에 이미 쓰이던 Tailwind 임의값 문법(`grid-cols-[...]`, 예: `min-h-[85svh]`)만
 * 사용했고, 텍스트 컬럼이 너무 좁아져 line-clamp 본문이 읽기 힘들어지지 않도록
 * 40%를 하한으로 유지한다(154차가 우려한 회귀 위험 최소화 — annotated/callout 등
 * 다른 image_text 레이아웃에는 적용하지 않고, 가장 빈도 높은 기본 2단 레이아웃
 * 하나에만 한정).
 *
 * 주의(구현 중 직접 발견한 버그, 고쳐서 반영함): 이 레이아웃은 이미지/텍스트를
 * 좌우로 바꿔치기할 때 DOM 순서를 그대로 두고 `order` 클래스만 바꾼다
 * (`resolveSplitImageLeft` 참고). CSS Grid의 명시적 트랙(`grid-cols-[3fr_2fr]`)은
 * "몇 번째 DOM 자식인가"가 아니라 "order로 정렬된 이후 몇 번째 트랙에 들어가는가"로
 * 크기가 정해지므로, imageLeft 값을 무시하고 항상 같은 문자열을 반환하면 이미지가
 * 오른쪽으로 뒤집힌 절반의 경우 오히려 텍스트가 커지는 정반대 결과가 나온다.
 * 그래서 imageLeft를 받아 "이미지가 실제로 앉는 트랙"에 큰 fr이 가도록 뒤집어준다.
 */
export function resolveSplitColumnRatio(pointIndex: number | undefined, imageLeft: boolean): string {
  const cycle = (pointIndex ?? 0) % 3;
  // 렌더러 루트 container(`@container/pz`) 폭 기준 — 좁은 프리뷰 칼럼에서는 1단 유지
  if (cycle === 0) return "@min-[640px]/pz:grid-cols-2"; // 기본 50/50 — 좌우 무관
  const imageGetsThreeFr = cycle === 1; // 1주기=이미지 60%, 2주기=이미지 40%(텍스트 60%)
  const firstTrackGetsThreeFr = imageLeft ? imageGetsThreeFr : !imageGetsThreeFr;
  return firstTrackGetsThreeFr
    ? "@min-[640px]/pz:grid-cols-[3fr_2fr]"
    : "@min-[640px]/pz:grid-cols-[2fr_3fr]";
}

/**
 * 위와 같은 3주기 로직을 마켓 업로드용 정적 export(`lib/export-detail-html.ts`,
 * Tailwind 클래스가 아니라 인라인 flex 스타일 사용)에서 쓰기 위한 숫자 버전.
 * grid-cols의 fr 비율과 동일한 값을 flex-grow로 재현한다.
 */
export function resolveSplitFlexRatio(pointIndex?: number): { image: number; text: number } {
  const cycle = (pointIndex ?? 0) % 3;
  if (cycle === 1) return { image: 3, text: 2 };
  if (cycle === 2) return { image: 2, text: 3 };
  return { image: 1, text: 1 };
}

export function shouldUseSplitLayout(section: DetailSection): boolean {
  if (section.type !== "image_text") return false;
  if (section.layout === "compact" || section.layout === "callout") return false;
  if (section.slot === "quick_points" || section.slot === "feature_callout") return false;
  if (shouldUseEditorialBleed(section)) return false;
  return true;
}

/**
 * AI 스키마가 imagePosition을 항상 채워 resolveSplitImageLeft의 순번 교대가 무력화된다.
 * split 섹션 순번(라이브·export pointIndex와 같은 카운트)대로 left/right를 덮어써 지그재그를 보장한다.
 */
export function enforceSplitZigzag(sections: DetailSection[]): DetailSection[] {
  let point = 0;
  return sections.map((section) => {
    if (section.type !== "image_text" || !shouldUseSplitLayout(section)) return section;
    const imagePosition: "left" | "right" = point++ % 2 === 0 ? "left" : "right";
    return section.imagePosition === imagePosition ? section : { ...section, imagePosition };
  });
}

function showsPointBadge(section: DetailSection): boolean {
  if (section.type === "checklist") return section.compactFollow !== true;
  if (section.type === "highlight_box") {
    return section.slot !== "seller_trust_evidence" || Boolean(section.heading?.trim());
  }
  if (section.type === "image_text") {
    const annotated =
      section.layout === "annotated" &&
      Array.isArray(section.annotations) &&
      section.annotations.length > 0;
    return shouldUseSplitLayout(section) && !annotated;
  }
  return false;
}

/**
 * POINT 배지를 실제로 다는 섹션(checklist·highlight_box·split image_text)만 1부터 연속 번호.
 * 라이브·export가 같은 번호를 쓰도록 양쪽에서 공유한다.
 */
export function buildPointOrdinals(sections: DetailSection[]): (number | undefined)[] {
  let ordinal = 0;
  return sections.map((section) => (showsPointBadge(section) ? ++ordinal : undefined));
}

export { shouldUseEditorialBleed, EDITORIAL_BLEED_SLOTS } from "@/lib/designer-detail-patterns";

/**
 * 어두운 강조 면(패턴 C)은 페이지당 1개 — 첫 highlight_box 우선, 없으면 첫 비압축 checklist.
 * 판매자 판매 근거 카드(seller_trust_evidence)는 별도 규칙이라 세지 않는다. 인덱스는 보존(map).
 */
export function limitBoldBlocks(sections: DetailSection[]): DetailSection[] {
  const counts = (s: DetailSection) =>
    (s.type === "highlight_box" && s.slot !== "seller_trust_evidence") ||
    (s.type === "checklist" && !s.compactFollow);
  const highlightIdx = sections.findIndex(
    (s) => s.type === "highlight_box" && counts(s) && s.boldBlock === true,
  );
  const keep =
    highlightIdx >= 0
      ? highlightIdx
      : sections.findIndex((s) => s.type === "checklist" && counts(s) && s.boldBlock === true);
  let changed = false;
  const out = sections.map((s, i) => {
    if (i === keep || !counts(s)) return s;
    if ((s.type === "highlight_box" || s.type === "checklist") && s.boldBlock) {
      changed = true;
      return { ...s, boldBlock: false };
    }
    return s;
  });
  return changed ? out : sections;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "#나이아신아마이드5" 처럼 해시태그 헤드라인이 숫자로 끝나면 본문의 같은 수치 단위(5%)를 되살린다. */
export function restoreHashtagHeadingUnit(heading: string, body: string | undefined): string {
  const m = heading.match(/^#(\S*?)(\d+(?:\.\d+)?)$/);
  if (!m || !body) return heading;
  const word = m[1].replace(/[^\p{L}\p{N}]/gu, "");
  const pattern = new RegExp(
    `${word ? `${escapeRegExp(word)}\\s*` : ""}${escapeRegExp(m[2])}\\s*(%|mg|ml|mL|g|ppm|배)`,
  );
  const unit = body.match(pattern)?.[1];
  return unit ? `${heading}${unit}` : heading;
}

export function restoreHashtagHeadingUnits(sections: DetailSection[]): DetailSection[] {
  let changed = false;
  const out = sections.map((s) => {
    if (!("heading" in s) || typeof s.heading !== "string" || !s.heading.startsWith("#")) return s;
    const body = "body" in s && typeof s.body === "string" ? s.body : undefined;
    const next = restoreHashtagHeadingUnit(s.heading, body);
    if (next === s.heading) return s;
    changed = true;
    return { ...s, heading: next } as DetailSection;
  });
  return changed ? out : sections;
}

/**
 * 같은 페이지에 target_persona(이런 분께)가 이미 있으면 tradeoff_card의 "이런 분께 추천" 열은
 * 같은 대상을 한 번 더 나열하는 중복 — 참고 열만 남긴다(참고 열이 비면 그대로 둔다).
 */
export function dropDuplicateRecommendColumn(sections: DetailSection[]): DetailSection[] {
  const hasPersona = sections.some(
    (s) =>
      s.type === "target_persona" &&
      (Array.isArray(s.personas) ? s.personas.filter((p) => p.trim()).length : 0) >= 2,
  );
  if (!hasPersona) return sections;
  let changed = false;
  const out = sections.map((s) => {
    if (s.type !== "tradeoff_card") return s;
    const recommend = Array.isArray(s.recommendFor) ? s.recommendFor.filter((t) => t.trim()) : [];
    const consider = Array.isArray(s.considerIf) ? s.considerIf.filter((t) => t.trim()) : [];
    if (recommend.length === 0 || consider.length === 0) return s;
    changed = true;
    return { ...s, recommendFor: [] };
  });
  return changed ? out : sections;
}

export function shouldInsertBreather(
  prev: DetailSection | undefined,
  current: DetailSection,
): boolean {
  if (FLAT_SECTION_SURFACES) return false;
  if (!prev || prev.type === "hero" || current.type === "hero") return false;

  const breaksAfter = new Set<DetailSection["type"]>([
    "checklist",
    "highlight_box",
    "gallery",
    "step_card",
    "stat_infographic",
    "comparison_chart",
  ]);
  const breaksBefore = new Set<DetailSection["type"]>([
    "gallery",
    "brand_story",
    "target_persona",
    "faq",
    "spec_table",
  ]);

  return breaksAfter.has(prev.type) || breaksBefore.has(current.type);
}
