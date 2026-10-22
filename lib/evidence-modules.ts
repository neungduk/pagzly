/**
 * 433차 1-4 — 증빙 모듈(표시 전용, 판매자 입력이 있을 때만). 423차 백로그 #1·#2.
 *  - 시험·인증 카드(proof): 입력의 인증·시험 문구 중 "시험·검사·테스트·성적서·인증·특허·수상" 표지가 있는 것만. 문구는 입력 그대로, 출처는 괄호 안 표기가 있으면 그것, 없으면 "판매자 제공 정보".
 *  - 후기 통계 카드(reviewstat): 업로드한 후기 파일에서 센 건수(reviewLineCount ≥ 5)와 장점 키워드별 언급 건수. 별점·비율·새 문구 없음(별점은 파싱하지 않는다).
 * 표시광고 안전: 카테고리 규제 정규식(sanitizeText)이 문구를 바꾸는(= 금지 표현이 든) 항목은 카드에서 뺀다. 인증 마크 이미지는 만들지 않는다.
 * 입력이 없으면 입력 배열을 그대로 돌려준다(현재 출력과 동일). 뷰티·패션만 적용.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";
import { parseCertificationTokens } from "@/lib/enrich-product-sections";
import { sanitizeText as sanitizeCosmetics } from "@/lib/cosmetics-compliance";
import { sanitizeText as sanitizeFashion } from "@/lib/fashion-compliance";
import { storyStageOf, storyOrderOn } from "@/lib/detail-story-order";

const PROOF_CUE = /시험|검사|테스트|성적서|인증|특허|수상|어워드|1위/;
const TEST_CUE = /시험|검사|테스트|성적서/;
const AWARD_CUE = /수상|어워드|1위/;
export const REVIEW_STAT_MIN_LINES = 5;
export const PROOF_MAX_ROWS = 3;
export const REVIEW_STAT_MAX_ROWS = 3;
const SOURCE_FALLBACK = "판매자 제공 정보";

/** 카테고리 규제 정규식: 문구가 바뀌면(금지·과장 표현) 안전하지 않다 */
function adSafe(category: string | undefined, text: string): boolean {
  const san = category === "화장품/뷰티" ? sanitizeCosmetics : category === "의류/패션" ? sanitizeFashion : null;
  return !san || san(text).text === text;
}

export type ProofRow = { tag: string; label: string; value: string };

export function buildProofRows(certifications: string, category: string | undefined, facts: ClaimFacts): ProofRow[] {
  const rows: ProofRow[] = [];
  for (const token of parseCertificationTokens(certifications)) {
    const raw = token.trim();
    if (!raw || !PROOF_CUE.test(raw) || raw.length > 60) continue;
    const m = /^(.*?)\s*[(（]([^)）]*)[)）]\s*$/.exec(raw);
    const label = (m ? m[1]! : raw).trim();
    const source = (m ? m[2]! : "").trim();
    if (!label || !adSafe(category, raw) || checkText(raw, facts).bad) continue;
    rows.push({ tag: TEST_CUE.test(label) ? "시험 결과" : AWARD_CUE.test(label) ? "수상" : "인증", label, value: source || SOURCE_FALLBACK });
    if (rows.length >= PROOF_MAX_ROWS) break;
  }
  return rows;
}

export function buildReviewStat(facts: ClaimFacts, category: string | undefined): ImpactSection | null {
  const n = facts.source.reviewLineCount;
  if (!Number.isFinite(n) || n < REVIEW_STAT_MIN_LINES) return null;
  const stats = facts.source.praises
    .map((label, i) => ({ label, count: facts.source.praiseMatchCounts[i] ?? 0 }))
    .filter((p) => p.count > 0 && p.label.length <= 40 && adSafe(category, p.label))
    .slice(0, REVIEW_STAT_MAX_ROWS)
    .map((p) => ({ label: p.label, value: `${p.count}건` }));
  return { type: "impact", slot: "impact", kind: "reviewstat", text: String(n), unit: "건", sub: "업로드한 후기를 분석한 건수입니다", stats };
}

/** 근거 단계 앞(해결 구간 뒤)에 증빙 카드를 끼운다. 후기 요약(review_highlight)이 있으면 그 바로 앞에 후기 통계를 둔다 */
export function planEvidence(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: { category?: string; facts: ClaimFacts },
): { sections: DetailSection[]; sourceIndexes: number[]; added: Array<"proof" | "reviewstat"> } {
  const none = { sections, sourceIndexes, added: [] as Array<"proof" | "reviewstat"> };
  if (!storyOrderOn(ctx.category) || sections[0]?.type !== "hero") return none;
  if (sections.some((s) => s.type === "impact" && (s.kind === "proof" || s.kind === "reviewstat"))) return none;
  const rows = buildProofRows(ctx.facts.source.certifications, ctx.category, ctx.facts);
  const stat = buildReviewStat(ctx.facts, ctx.category);
  if (rows.length === 0 && !stat) return none;
  const isQp = (s: DetailSection | undefined) => s?.type === "image_text" && s.slot === "quick_points";
  // 근거 단계(4) 첫 섹션 앞. 없으면 정보 단계(6) 앞. 퀵포인트 묶음 한가운데는 피한다
  let at = sections.findIndex((s, i) => i >= 2 && (storyStageOf(s) ?? 0) >= 4 && !(isQp(sections[i - 1]) && isQp(s)));
  if (at < 0) at = sections.findIndex((s) => s.type === "cta_price");
  if (at < 0) return none;
  const review = sections.findIndex((s) => s.type === "review_highlight");
  const added: Array<"proof" | "reviewstat"> = [];
  const proof: ImpactSection | null = rows.length ? { type: "impact", slot: "impact", kind: "proof", text: "", stats: rows.map((r) => ({ tag: r.tag, label: r.label, value: r.value })) } : null;
  const out = [...sections];
  const src = [...sourceIndexes];
  if (stat && review >= 0) {
    out.splice(review, 0, stat);
    src.splice(review, 0, sourceIndexes[review]!);
    added.push("reviewstat");
    if (proof) { const a = at > review ? at + 1 : at; out.splice(a, 0, proof); src.splice(a, 0, src[Math.min(a, src.length - 1)]!); added.push("proof"); }
  } else {
    const items = [proof, stat].filter((x): x is ImpactSection => x !== null);
    out.splice(at, 0, ...items);
    src.splice(at, 0, ...items.map(() => sourceIndexes[at]!));
    for (const it of items) added.push(it.kind as "proof" | "reviewstat");
  }
  return { sections: out, sourceIndexes: src, added };
}
