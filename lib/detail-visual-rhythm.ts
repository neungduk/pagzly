import type { DetailSection } from "@/lib/types/generate";
import { shouldUseEditorialBleed } from "@/lib/designer-detail-patterns";

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
  faq: "FAQ",
  usage_steps: "GUIDE",
  caution: "NOTICE",
};

export function getSectionKicker(section: DetailSection): string | null {
  if (section.type === "hero") return null;
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
  if (cycle === 0) return "sm:grid-cols-2"; // 기본 50/50 — 좌우 무관
  const imageGetsThreeFr = cycle === 1; // 1주기=이미지 60%, 2주기=이미지 40%(텍스트 60%)
  const firstTrackGetsThreeFr = imageLeft ? imageGetsThreeFr : !imageGetsThreeFr;
  return firstTrackGetsThreeFr ? "sm:grid-cols-[3fr_2fr]" : "sm:grid-cols-[2fr_3fr]";
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

export { shouldUseEditorialBleed, EDITORIAL_BLEED_SLOTS } from "@/lib/designer-detail-patterns";

export function shouldInsertBreather(
  prev: DetailSection | undefined,
  current: DetailSection,
): boolean {
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
