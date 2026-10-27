/**
 * 465차 V5 — 스토리보드 구성기. 섹션 시퀀스를 박자(beat)로 읽고 강도(1~5) 곡선을 점검·보정한다.
 *   박자: hook(히어로·한눈에 보기) → empathy(고민·페르소나) → proof(스펙·성분·후기·인증·비교) → desire(장점·사진+글·스토리) → objection(FAQ·주의·배송/환불) → action(접점·구매 카드)
 *   강도: 전폭 사진·큰 숫자·진한 면 = 높음(4~5), 표·목록·FAQ = 낮음(1~2).
 * 이 모듈은 **섹션 순서를 바꾸지 않는다** — 순서는 기존 규칙(433 스토리 순서·436 레시피·405/409 패션 첫 갤러리·439 첫 3화면)이 정하고, 그 결과 위에서
 *  ① 일반 섹션 래퍼 표식(`data-pz-ax="<박자>.<강도>"`) = 위아래 여백 단계로 강약을 표현하고
 *  ② 곡선 규칙 위반(높음/낮음 3연속·처음 1/3 높음 부족·마무리 직전 높음 없음)을 표식 강도 ±로 보정하며
 *  ③ 못 고치는 위반(고정된 임팩트/v4 블록끼리)은 숫자로 보고한다.
 * 우선순위: 기존 규칙이 항상 이긴다. 편집 모드·V5 꺼짐에서는 호출되지 않는다(호출한 쪽이 막는다).
 */
import type { DetailSection } from "@/lib/types/generate";

export type Beat = "hook" | "empathy" | "proof" | "desire" | "objection" | "action" | "neutral";
export const BEAT_ORDER: Record<Beat, number> = { hook: 0, empathy: 1, proof: 2, desire: 3, objection: 4, action: 5, neutral: -1 };

const IMPACT_STRENGTH: Record<string, number> = {
  bleed: 5, zoom: 5, number: 5, split: 4, inset: 4, frame: 4, statement: 4, asym2: 4, mosaic3: 4, stagger: 4, callout: 3,
  "illust-side": 3, "illust-center": 3, story: 3, fit: 2, note: 1, textboost: 2, bubbles: 3, checkrows: 2, chat: 3, checkgrid: 3, proof: 3, reviewstat: 3,
  faqcards: 1, spectable: 1, specstrip: 2, swatch: 3, timeline: 2, chipwall: 2, sizebars: 2,
};
const V4_STRENGTH: Record<string, number> = {
  "benefits.bento": 4, "benefits.numcards": 3, "benefits.iconstrip": 3, "benefits.zigzag": 4, "benefits.linelist": 2,
  "story.editorial": 3, "story.quote": 3, "story.linetime": 2, "story.pullband": 4,
  "spec.strip": 3, "spec.grid": 2, "spec.line": 1, "spec.cards": 2,
  "concern.bubbles": 3, "concern.checkrows": 2, "concern.stack": 3, "concern.tiles2": 2,
  "phototext.overlap": 4, "phototext.offset": 4, "phototext.arch": 4, "phototext.caption": 5, "phototext.collage": 4,
  "touch.band": 3, "breather.motif": 1, "statement.band": 4, "statement.quote": 4, "statement.rule": 4,
  "steps.vtimeline": 2, "steps.bignum": 3, "steps.chipflow": 2,
};
const TYPE_STRENGTH: Record<string, number> = {
  hero: 5, gallery: 4, image_text: 3, spec_table: 1, faq: 1, checklist: 2, target_persona: 3, stat_infographic: 4, comparison_chart: 3, comparison_table: 2,
  tradeoff_card: 2, usage_steps: 2, step_card: 3, color_variation: 3, illustration_banner: 4, caution: 1, ai_disclosure: 1, cta_price: 5, review_highlight: 3,
  highlight_box: 3, brand_story: 3, certificate_evidence: 2, before_after: 4, custom_gif: 3, scene_image: 4,
};

/** 섹션의 본래 강도(1~5) */
export function intrinsicStrength(s: DetailSection): number {
  if (s.type === "impact") {
    if (s.kind === "v4" && s.v4) return V4_STRENGTH[`${s.v4.family}.${s.v4.variant}`] ?? 3;
    return IMPACT_STRENGTH[s.kind] ?? 3;
  }
  if (s.type === "image_text") return s.layout === "compact" ? 2 : s.layout === "text_only" ? 2 : 4;
  return TYPE_STRENGTH[s.type] ?? 3;
}

/** 박자 분류(구조 이름 기준). 분류 못 하면 neutral */
export function beatOf(s: DetailSection): Beat {
  switch (s.type) {
    case "hero": return "hook";
    case "target_persona": return "empathy";
    case "spec_table": case "comparison_chart": case "comparison_table": case "stat_infographic": case "review_highlight": case "certificate_evidence": case "tradeoff_card": return "proof";
    case "highlight_box": case "brand_story": case "gallery": case "illustration_banner": case "step_card": case "color_variation": case "before_after": case "scene_image": return "desire";
    case "faq": case "caution": return "objection";
    case "cta_price": return "action";
    case "usage_steps": return "proof";
    case "checklist": return "empathy";
    case "image_text": return "desire";
    case "impact": {
      if (s.kind === "v4" && s.v4) {
        const f = s.v4.family;
        if (f === "concern") return "empathy";
        if (f === "spec") return "proof";
        if (f === "touch") return "action";
        if (f === "benefits") return s.v4.glance ? "hook" : "desire";
        if (f === "steps") return "proof";
        return "desire";
      }
      if (s.kind === "bubbles" || s.kind === "checkrows" || s.kind === "checkgrid" || s.kind === "chat") return "empathy";
      if (s.kind === "faqcards" || s.kind === "note") return "objection";
      if (s.kind === "spectable" || s.kind === "specstrip" || s.kind === "sizebars" || s.kind === "proof" || s.kind === "reviewstat" || s.kind === "timeline" || s.kind === "number") return "proof";
      return "desire";
    }
    default: return "neutral";
  }
}

/** 래퍼 표식을 붙이지 않는 섹션(히어로·구매 카드·고지·규정/주의 박스·후기 집계·임팩트/v4 — 임팩트는 마크업 후처리가 따로 처리) */
export function markable(s: DetailSection): boolean {
  if (s.type === "impact" || s.type === "hero" || s.type === "cta_price" || s.type === "ai_disclosure" || s.type === "caution" || s.type === "review_highlight") return false;
  return true;
}

export type Marks = Record<number, string>;
export type StoryboardReport = {
  strengths: number[];
  beats: Beat[];
  /** 높음(≥4)/낮음(≤2) 3연속 시작 위치 수 */
  highRuns: number;
  lowRuns: number;
  /** 처음 1/3(히어로 제외)의 높음 개수가 2 미만이면 1 */
  earlyHighShort: number;
  /** 마무리 직전(구매 카드 앞 3개) 높음이 없으면 1 */
  closingHighMissing: number;
  /** 박자 역전: 앞에서 이미 나온 박자보다 3단계 이상 앞선 박자가 뒤늦게 나온 횟수(정보용 — 순서는 기존 규칙이 정한다) */
  beatInversions: number;
  /** 보정에 쓴 표식 수 */
  adjusted: number;
};

const cls = (n: number): "hi" | "lo" | "mid" => (n >= 4 ? "hi" : n <= 2 ? "lo" : "mid");

/** 곡선 점검·보정. marks[i] = "<박자>.<강도>" (표식 가능한 일반 섹션만). 반환 report는 보정 후 수치 */
export function planStoryboard(sections: DetailSection[]): { marks: Marks; report: StoryboardReport } {
  const n = sections.length;
  const eff = sections.map(intrinsicStrength);
  const canAdjust = sections.map(markable);
  const beats = sections.map(beatOf);
  let adjusted = 0;
  const set = (i: number, v: number) => { if (canAdjust[i] && eff[i] !== v) { eff[i] = v; adjusted += 1; } };

  // 1) 3연속 같은 부류 깨기: 가운데(없으면 앞·뒤) 표식 가능 섹션을 중간 강도로
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (let i = 1; i < n - 1; i += 1) {
      const c = cls(eff[i]!);
      if (c === "mid" || cls(eff[i - 1]!) !== c || cls(eff[i + 1]!) !== c) continue;
      const pick = [i, i + 1, i - 1].find((k) => canAdjust[k]);
      if (pick !== undefined) { set(pick, 3); changed = true; }
    }
    if (!changed) break;
  }
  // 2) 처음 1/3(히어로 제외)에 높음 2개 이상
  const third = Math.max(3, Math.floor(n / 3));
  const hiIn = (a: number, b: number) => eff.slice(a, b).filter((v) => v >= 4).length;
  for (let i = 1; i < third && hiIn(1, third) < 2; i += 1) if (canAdjust[i] && eff[i]! < 4 && cls(eff[i - 1]!) !== "hi" && cls(eff[i + 1] ?? 3) !== "hi") set(i, 4);
  // 3) 마무리 직전(구매 카드 앞 3개)에 높음 1개 이상
  const ctaAt = sections.findIndex((s) => s.type === "cta_price");
  const endAt = ctaAt >= 0 ? ctaAt : n;
  if (hiIn(Math.max(1, endAt - 3), endAt) < 1) for (let i = endAt - 1; i >= Math.max(1, endAt - 3); i -= 1) if (canAdjust[i] && cls(eff[i - 1]!) !== "hi" && cls(eff[i + 1] ?? 3) !== "hi") { set(i, 4); break; }

  const marks: Marks = {};
  sections.forEach((s, i) => { if (canAdjust[i]) marks[i] = `${beats[i]}.${eff[i]}`; });

  // 점검
  let highRuns = 0;
  let lowRuns = 0;
  for (let i = 0; i + 2 < n; i += 1) {
    const a = cls(eff[i]!);
    if (a === "mid") continue;
    if (cls(eff[i + 1]!) === a && cls(eff[i + 2]!) === a) { if (a === "hi") highRuns += 1; else lowRuns += 1; }
  }
  const earlyHighShort = hiIn(1, third) < 2 ? 1 : 0;
  const closingHighMissing = hiIn(Math.max(1, endAt - 3), endAt) < 1 ? 1 : 0;
  let maxRank = -1;
  let beatInversions = 0;
  beats.forEach((b) => { const r = BEAT_ORDER[b]; if (r < 0) return; if (maxRank - r >= 3) beatInversions += 1; maxRank = Math.max(maxRank, r); });
  return { marks, report: { strengths: eff, beats, highRuns, lowRuns, earlyHighShort, closingHighMissing, beatInversions, adjusted } };
}
