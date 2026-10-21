/**
 * 427차 1-2 — 비교 차트를 뺀 자리를 채우는 자동 대체(순수 함수, 새 호출 없음).
 * 원칙: **판매자가 입력한 값에서만** 만든다. 입력에 없는 사실·수치·문장을 새로 쓰지 않고, 근거가 없으면 대체하지 않는다(빈 자리는 그대로 두면 다음 섹션이 이어진다).
 *
 * 우선순위 큐(위에서부터 처음 맞는 하나):
 *   1 후기 요약   — 업로드한 리뷰에서 뽑은 장점이 2개 이상일 때(review_highlight)
 *   2 소재·성분   — 소재/성분 입력이 있고 같은 내용의 섹션이 없을 때(입력 항목을 그대로 나열)
 *   3 케어        — 판매자 입력에 세탁·관리·보관 문장이 있을 때(그 문장 그대로)
 *   4 사용 팁     — 사용법 섹션이 없고 판매자 입력에 사용 문장이 있을 때
 *   5 추천 대상   — 추천 대상 입력이 있고 target_persona·tradeoff_card가 없을 때
 *   6 남는 사진   — 어떤 섹션도 쓰지 않은 사진이 2장 이상일 때(표시 마지막 단계에서 계산: backfillPhotoGallery)
 *   7 FAQ         — 판매자 입력에 질문·답변이 없으므로 현재 후보 없음(근거 없이 만들지 않는다)
 * 중복·모티프 반복 방지: 같은 종류 섹션이 이미 있으면 건너뛰고, 한 번 고른 종류는 다시 고르지 않으며, 대체 섹션은 바로 옆 섹션과 같은 종류가 되지 않게 한다.
 * 표시 예산: 저관여 카테고리에서는 근거형 섹션(통계·득실·후기)이 이미 있으면 후기 요약을 넣지 않는다(lib/section-display-budget의 상한 1개 유지).
 */
import type { ClaimSource } from "@/lib/numeric-claim-gate";
import { sectionImageIndexes } from "@/lib/image-source-cap";
import { isLowInvolvementCategory } from "@/lib/section-display-budget";
import type { DetailSection, GallerySection } from "@/lib/types/generate";

export type BackfillKind = "review" | "material" | "care" | "tip" | "audience" | "photos" | "faq";

export type BackfillChoice = { kind: BackfillKind; section: DetailSection; reason: string };

export const BACKFILL_QUEUE: readonly BackfillKind[] = ["review", "material", "care", "tip", "audience", "photos", "faq"];

const BEAUTY_LIKE = /(뷰티|화장품|식품|반려)/;
const EVIDENCE = new Set(["stat_infographic", "tradeoff_card", "review_highlight"]);
/** 같은 내용을 이미 다루는 슬롯: 소재·성분·원단 구성 / 세탁·관리 */
const MATERIAL_SLOT_RE = /ingredient|material|fabric|composition_detail|backfill_material/;
const CARE_SLOT_RE = /care|backfill_care/;
const USAGE_TYPES = new Set(["usage_steps", "step_card"]);
/** 세탁·보관 문구만(피부 "건조함"·"관리"처럼 다른 뜻으로 쓰이는 말은 제외) */
const CARE_RE = /세탁|드라이클리닝|물빨래|다림질|보관|관리법|관리 방법|자연\s*건조|그늘/;
/** 사용 팁은 판매자가 "사용법/사용 방법/팁" 표지를 붙여 쓴 문구만 */
const TIP_RE = /사용법|사용 방법|사용 팁|꿀팁|^팁/;

/** 괄호 밖의 쉼표·가운뎃점·줄바꿈·번호("1. 2.")로 항목을 나눈다 — "면 100% (싱글 저지, 20수)"의 괄호 속 쉼표는 나누지 않는다 */
export function splitInputItems(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const flush = () => {
    const t = cur.trim();
    if (t) out.push(t);
    cur = "";
  };
  const src = text.replace(/(^|[\s,])\d+\s*[.)]\s*(?=\S)/g, "$1,");
  for (const ch of src) {
    if (ch === "(" || ch === "（") depth += 1;
    if (ch === ")" || ch === "）") depth = Math.max(0, depth - 1);
    if (depth === 0 && /[,，、·\n]/.test(ch)) flush();
    else cur += ch;
  }
  flush();
  return out;
}

/** 입력 문단을 문장·쉼표 단위(괄호 밖)로 나눠 조건에 맞는 조각만 그대로 뽑는다(다시 쓰지 않음) */
function pickSentences(text: string, re: RegExp, max: number): string[] {
  return text
    .split(/(?<=[.!?。…])\s+|\n+/)
    .flatMap((sentence) => splitInputItems(sentence))
    .map((s) => s.trim().replace(/^[-•·]\s*/, ""))
    .filter((s) => s.length >= 4 && s.length <= 80 && re.test(s))
    .slice(0, max);
}

const has = (sections: readonly DetailSection[], f: (s: DetailSection) => boolean) => sections.some(f);

type Ctx = { category?: string; source: ClaimSource };

function review(sections: readonly DetailSection[], c: Ctx): BackfillChoice | null {
  if (c.source.praises.length < 2) return null;
  if (has(sections, (s) => s.type === "review_highlight")) return null;
  if (isLowInvolvementCategory(c.category ?? "") && has(sections, (s) => EVIDENCE.has(s.type))) return null;
  const concerns = c.source.complaints.slice(0, 2);
  return {
    kind: "review",
    reason: `리뷰에서 뽑은 장점 ${c.source.praises.length}개`,
    section: {
      type: "review_highlight",
      slot: "review_highlight",
      heading: "후기에서 자주 나온 이야기",
      praises: c.source.praises.slice(0, 3),
      ...(concerns.length > 0 ? { concerns } : {}),
      ...(c.source.reviewLineCount > 0 ? { sourceReviewCount: c.source.reviewLineCount } : {}),
    },
  };
}

function material(sections: readonly DetailSection[], c: Ctx): BackfillChoice | null {
  const items = splitInputItems(c.source.ingredients).slice(0, 6);
  if (items.length === 0) return null;
  if (has(sections, (s) => MATERIAL_SLOT_RE.test(s.slot))) return null;
  // 같은 내용을 이미 보여 주는 섹션(제목에 소재·성분이 있는 체크리스트/카드)이 있으면 반복하지 않는다
  if (has(sections, (s) => "heading" in s && typeof s.heading === "string" && /소재|성분|원료/.test(s.heading) && s.type !== "spec_table")) return null;
  const heading = BEAUTY_LIKE.test(c.category ?? "") ? "성분 구성" : "소재 구성";
  const base = { slot: "backfill_material", heading };
  return {
    kind: "material",
    reason: `입력한 ${heading === "성분 구성" ? "성분" : "소재"} ${items.length}항목`,
    section:
      items.length >= 2
        ? { type: "checklist", ...base, items, hubPhoto: false }
        : { type: "image_text", ...base, body: items[0]!, imageIndex: 0, imagePosition: "left", layout: "text_only" },
  };
}

function care(sections: readonly DetailSection[], c: Ctx): BackfillChoice | null {
  const items = pickSentences(c.source.keyFeatures, CARE_RE, 4);
  if (items.length === 0) return null;
  if (has(sections, (s) => CARE_SLOT_RE.test(s.slot) || ("heading" in s && typeof s.heading === "string" && /세탁|관리법|관리 방법|케어/.test(s.heading)))) return null;
  return { kind: "care", reason: `입력 문장 ${items.length}개(세탁·관리)`, section: { type: "checklist", slot: "backfill_care", heading: "관리 방법", items, hubPhoto: false } };
}

function tip(sections: readonly DetailSection[], c: Ctx): BackfillChoice | null {
  if (has(sections, (s) => USAGE_TYPES.has(s.type))) return null;
  const items = pickSentences(c.source.keyFeatures, TIP_RE, 3);
  if (items.length === 0) return null;
  return { kind: "tip", reason: `입력 문장 ${items.length}개(사용)`, section: { type: "checklist", slot: "backfill_tip", heading: "사용 팁", items, hubPhoto: false } };
}

function audience(sections: readonly DetailSection[], c: Ctx): BackfillChoice | null {
  const t = c.source.targetCustomer;
  if (!t) return null;
  if (has(sections, (s) => s.type === "target_persona" || s.type === "tradeoff_card")) return null;
  return { kind: "audience", reason: "추천 대상 입력", section: { type: "target_persona", slot: "backfill_audience", heading: "이런 분께", personas: [t] } };
}

const BUILDERS: Partial<Record<BackfillKind, (s: readonly DetailSection[], c: Ctx) => BackfillChoice | null>> = { review, material, care, tip, audience };

/**
 * 큐를 위에서부터 보고 처음 맞는 텍스트형 후보 하나를 돌려준다. 사진 갤러리(photos)는 표시 마지막에 정하므로 여기서는 "pending"으로 알린다.
 * skip: 이미 쓴 종류(같은 페이지에서 두 번 채울 때 겹치지 않게).
 */
export function pickBackfill(
  sections: readonly DetailSection[],
  ctx: Ctx,
  skip: ReadonlySet<BackfillKind> = new Set(),
): BackfillChoice | { kind: "photos"; pending: true } | null {
  for (const kind of BACKFILL_QUEUE) {
    if (skip.has(kind)) continue;
    if (kind === "photos") return { kind: "photos", pending: true };
    if (kind === "faq") return null; // 입력에 질문·답변이 없다 — 근거 없이 만들지 않는다
    const hit = BUILDERS[kind]?.(sections, ctx);
    if (hit) return hit;
  }
  return null;
}

/**
 * 남는 사진 갤러리 — 어떤 섹션도 쓰지 않은 사진이 2장 이상일 때만, anchorKey(`type/slot`) 섹션 바로 앞에 넣는다(없으면 spec_table 앞).
 * 같은 원본(sourceOf)·이미 쓴 사진은 제외하고, 허용 판정(allow: 뷰티 정면·근접 컷만 등)이 있으면 그것을 따른다. 인접한 갤러리 옆에는 넣지 않는다.
 */
export function backfillPhotoGallery(
  sections: DetailSection[],
  sourceIndexes: number[],
  imageCount: number,
  opts: { anchorKey?: string | null; sourceOf?: readonly number[]; allow?: (i: number) => boolean },
): { sections: DetailSection[]; sourceIndexes: number[]; indexes: number[] } | null {
  const usedGroup = new Set<number>();
  const groupOf = (i: number) => opts.sourceOf?.[i] ?? i;
  for (const s of sections) for (const i of sectionImageIndexes(s)) if (i >= 0 && i < imageCount) usedGroup.add(groupOf(i));
  const free: number[] = [];
  const seen = new Set<number>();
  for (let i = 1; i < imageCount; i += 1) {
    const g = groupOf(i);
    if (usedGroup.has(g) || seen.has(g)) continue;
    if (opts.allow && !opts.allow(i)) continue;
    seen.add(g);
    free.push(i);
  }
  if (free.length < 2) return null;
  const indexes = free.slice(0, 4);
  let at = opts.anchorKey ? sections.findIndex((s) => `${s.type}/${s.slot}` === opts.anchorKey) : -1;
  if (at < 0) at = sections.findIndex((s) => s.type === "spec_table");
  if (at <= 0) return null;
  if (sections[at - 1]?.type === "gallery" || sections[at]?.type === "gallery") return null;
  const gallery: GallerySection = { type: "gallery", slot: "backfill_photos", heading: "상품 사진 더 보기", imageIndexes: indexes };
  return {
    sections: [...sections.slice(0, at), gallery, ...sections.slice(at)],
    sourceIndexes: [...sourceIndexes.slice(0, at), sourceIndexes[at - 1] ?? 0, ...sourceIndexes.slice(at)],
    indexes,
  };
}
