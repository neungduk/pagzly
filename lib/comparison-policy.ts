/**
 * 427차 1-2 — 비교 차트 제거·자동 대체 정책(표시 단계, 세션 JSON은 그대로).
 * 사용자 결정(2026-10-21): 비교 차트는 **판매자가 비교 데이터를 입력했을 때만** 만든다. 없으면 만들지 않고 다른 섹션이 자동으로 채운다.
 *
 *  - 입력 없음: comparison_chart·comparison_table(생성 단계에서 AI가 만든 비교 수치·표)을 모두 뺀다. 비교를 전제로 한 카드 문장("일반 제품보다 …")도 문장 단위로 지운다.
 *    빈 자리는 lib/section-backfill의 우선순위 큐로 채운다(입력 근거가 있을 때만).
 *  - 입력 있음(2행 이상): AI가 만든 비교 섹션은 모두 빼고, 판매자 입력을 **그대로** 옮긴 비교표 하나를 같은 자리에 둔다(수치를 바꾸거나 막대로 환산하지 않는다).
 *  - 편집 모드·claimFacts 없음(개발용 고정 데이터)·NEXT_PUBLIC_COMPARISON_POLICY=off 에서는 아무것도 바꾸지 않는다(출력이 정책 도입 전과 같다).
 * 라이브 렌더러(DetailSectionRenderer)와 export(lib/export-detail-html)가 둘 다 applyDisplayRules를 거치므로 같은 결과가 된다.
 */
import { hasComparisonInput } from "@/lib/comparison-input";
import { cleanSectionsByRule, type ClaimFacts, type ClaimViolation } from "@/lib/numeric-claim-gate";
import { BACKFILL_QUEUE, pickBackfill, type BackfillKind } from "@/lib/section-backfill";
import type { ComparisonTableSection, DetailSection } from "@/lib/types/generate";

/** 기본 켬. 오탐이 보이면 NEXT_PUBLIC_COMPARISON_POLICY=off 로 서버를 시작해 끈다 */
export const COMPARISON_POLICY_ENABLED = process.env.NEXT_PUBLIC_COMPARISON_POLICY !== "off";

/** 비교 정책이 이 입력에서 차트를 빼는가(= 저관여 표시 예산에서 차트를 근거 후보로 세지 않는다) */
export const comparisonPolicyRemovesChart = (facts: ClaimFacts | undefined): boolean =>
  COMPARISON_POLICY_ENABLED && !!facts && !hasComparisonInput(facts.source.comparisonRows);

const isComparisonSection = (s: DetailSection) => s.type === "comparison_chart" || s.type === "comparison_table";

/**
 * 비교를 전제로 한 문장 — "일반 제품보다", "다른 제품과 달리", "업계 평균", "경쟁사". 사이즈 비교·전후 비교처럼 입력 안의 비교는 대상이 아니다.
 * 오탐 가능: "기존 모델보다 가볍다"처럼 판매자가 쓴 문장이 생성 문장에 그대로 들어온 경우에도 지워진다(보고서에 기재).
 */
const COMPARATIVE_RE = /(?:일반|타|다른|기존|시중|보통|흔한|평범한|여느)\s*[가-힣A-Za-z]{0,6}\s*(?:제품|상품|브랜드|모델|옷|니트|티|티셔츠|미스트|크림|화장품)?\s*(?:들)?\s*(?:보다|대비|에\s*비해|와\s*달리|과\s*달리|와\s*비교|과\s*비교|와의\s*차이|과의\s*차이)|업계\s*평균|경쟁\s*(?:사|제품|브랜드)/;
export const isComparativeClaim = (text: string): boolean => COMPARATIVE_RE.test(text);

export type PolicyChange =
  | { type: "removed"; index: number; sectionType: string; heading: string }
  | { type: "sentence"; index: number; sectionType: string; text: string }
  | { type: "table"; index: number; rows: number }
  | { type: "filled"; index: number; kind: BackfillKind; reason: string; slot: string };

export type PolicyResult = {
  sections: DetailSection[];
  /** sourceIndexes[i] = 표시 i번째 섹션의 입력 인덱스(끼워 넣은 섹션은 바로 앞 섹션 번호) */
  sourceIndexes: number[];
  changes: PolicyChange[];
  /** 남는 사진 갤러리로 채울 자리가 남았는가(표시 마지막 단계에서 사진 사용 현황을 보고 정한다) */
  pendingPhotos: { anchorKey: string | null } | null;
};

/** 판매자 입력을 그대로 옮긴 비교표 */
export function buildSellerComparisonTable(facts: ClaimFacts): ComparisonTableSection {
  return {
    type: "comparison_table",
    slot: "comparison_table",
    heading: "비교 정보",
    // 렌더러는 두 번째 열을 "우리 제품"으로 강조한다(라이브·export 공통) — [비교 대상, 우리 제품] 순서
    columns: ["일반 제품", "우리 제품"],
    rows: facts.source.comparisonRows.map((r) => ({ label: r.label, values: [r.other, r.ours] as [string, string] })),
  };
}

/** 앞뒤 섹션과 같은 종류가 되지 않는지(모티프 반복 방지) */
const motifOf = (s: DetailSection | undefined) => (s ? `${s.type}/${s.slot}` : "");

export function applyComparisonPolicy(input: DetailSection[], facts: ClaimFacts, ctx: { category?: string; imageCount: number }): PolicyResult {
  const changes: PolicyChange[] = [];
  const sellerInput = hasComparisonInput(facts.source.comparisonRows);
  // 1) 비교 섹션(AI가 만든 차트·표)을 먼저 뺀다. 빠진 자리는 대체·판매자 표가 들어갈 위치로 기억한다
  let work = input.map((s, i) => ({ s, src: i }));
  const removedAtRaw: number[] = [];
  const kept: typeof work = [];
  for (const w of work) {
    if (isComparisonSection(w.s)) {
      changes.push({ type: "removed", index: w.src, sectionType: w.s.type, heading: "heading" in w.s ? String(w.s.heading ?? "") : "" });
      removedAtRaw.push(kept.length);
    } else kept.push(w);
  }

  // 2) 남은 섹션의 비교 전제 문장 정리(문장 단위 삭제, 모두 지워진 섹션은 제거)
  const cleaned = cleanSectionsByRule(kept.map((w) => w.s), facts, isComparativeClaim);
  for (const v of cleaned.violations as ClaimViolation[]) {
    const src = kept[v.index]!.src;
    if (v.action === "section_removed") changes.push({ type: "removed", index: src, sectionType: v.type, heading: v.text });
    else changes.push({ type: "sentence", index: src, sectionType: v.type, text: v.text });
  }
  work = cleaned.sections.map((s, i) => ({ s, src: kept[cleaned.keptIndexes[i]!]!.src }));
  // 문장 정리로 앞쪽 섹션이 빠졌다면 기억해 둔 자리도 그만큼 당긴다
  const removedAt = removedAtRaw.map((pos) => cleaned.keptIndexes.filter((k) => k < pos).length);

  let pendingPhotos: PolicyResult["pendingPhotos"] = null;
  if (sellerInput) {
    const at = removedAt.length > 0 ? removedAt[0]! : defaultInsertAt(work.map((w) => w.s));
    const table = buildSellerComparisonTable(facts);
    const src = work[Math.max(0, at - 1)]?.src ?? 0;
    work = [...work.slice(0, at), { s: table, src }, ...work.slice(at)];
    changes.push({ type: "table", index: src, rows: table.rows.length });
  } else if (removedAt.length > 0) {
    // 3) 입력 없음 → 우리 자리마다 우선순위 큐로 채운다(근거 있는 것만, 종류 중복 없이, 바로 옆 섹션과 같은 모티프 금지)
    const used = new Set<BackfillKind>();
    // 뒤쪽 자리부터 넣어야 앞쪽 위치가 밀리지 않는다
    for (const pos of [...removedAt].reverse()) {
      const cur = work.map((w) => w.s);
      const pick = pickBackfill(cur, { category: ctx.category, source: facts.source }, used);
      if (!pick) continue;
      if ("pending" in pick) {
        used.add("photos");
        const next = work[pos]?.s;
        pendingPhotos = { anchorKey: next ? motifOf(next) : null };
        continue;
      }
      if (motifOf(work[pos - 1]?.s) === motifOf(pick.section) || motifOf(work[pos]?.s) === motifOf(pick.section)) continue;
      used.add(pick.kind);
      const src = work[Math.max(0, pos - 1)]?.src ?? 0;
      work = [...work.slice(0, pos), { s: pick.section, src }, ...work.slice(pos)];
      changes.push({ type: "filled", index: src, kind: pick.kind, reason: pick.reason, slot: pick.section.slot });
    }
  }
  return { sections: work.map((w) => w.s), sourceIndexes: work.map((w) => w.src), changes, pendingPhotos };
}

/** 원래 비교 섹션이 없는 구성에서 판매자 표를 넣을 자리: 득실·FAQ·스펙표·가격 앞 */
function defaultInsertAt(sections: DetailSection[]): number {
  const i = sections.findIndex((s) => s.type === "faq" || s.type === "tradeoff_card" || s.type === "spec_table" || s.type === "cta_price" || s.type === "ai_disclosure");
  return i < 0 ? sections.length : i;
}

export { BACKFILL_QUEUE };
