/**
 * 438차 1-4 — 기존 섹션을 아키타입 mood 디자인 언어로(표시 전용 section type impact). 첫 화면만 디자이너 느낌이고 이후가 평범해지는 낙차를 줄인다.
 * 문구·값은 원문 그대로(새 문구 없음). mood 토큰(여백 3단계·반경·그림자·제목 굵기)은 impactHtml 끝의 applyMood가 함께 적용한다.
 *
 *  원 섹션            → 종류         모양                                                   건너뛰는 경우
 *  faq                → faqcards     Q 배지 + 질문(굵게) + 답(좌측 선), 펼친 상태로 고정된 아코디언 카드   항목 0개
 *  spec_table(전 슬롯) → spectable    헤더 띠 + 라벨/값 2열, 줄무늬(팔레트 면), 둥근 표                  사진 썸네일(imageIndexes)이 있는 표
 *  checklist          → checkrows    체크 원 + 항목 카드(넓은 폭 2열)                                 사진 허브·강조 블록·compactFollow·3개 미만·7개 이상
 *  usage_steps 3~6단계 → timeline     436차 타임라인 재사용(STEP 라벨, 큰 번호 + 세로 선)                 2단계 이하·7단계 이상
 * 원 섹션 정보(origin)를 남겨 앵커 내비(FAQ·사이즈·배송·주의…)가 그대로 동작한다.
 * 렌더러가 나중에 하는 FAQ 스펙 중복 제거(dropSpecEchoFaqItems)를 먼저 적용해 내용이 같게 한다.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import { dropSpecEchoFaqItems } from "@/lib/detail-visual-rhythm";
import { hexToRgba } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { DESIGN_POLISH_ENABLED } from "@/lib/design-polish";

export const POLISH_KINDS = ["faqcards", "spectable", "checkrows"] as const;
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const sans = `font-family:${DETAIL_FONT_STACK.sans}`;
const CHEV = (c: string) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="display:block;flex:none"><path d="M6 15 L12 9 L18 15" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:block"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function polishHtml(s: ImpactSection, pal: ImpactPalette): string {
  const head = s.text ? `<p style="margin:0 0 20px;${title};font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${esc(s.text)}</p>` : "";
  if (s.kind === "faqcards") {
    const items = (s.stats ?? [])
      .map(
        (q, i) =>
          `<div style="margin-top:${i === 0 ? 0 : 12}px;box-sizing:border-box;padding:18px 18px 18px;border-radius:16px;background:#FFFFFF;border:1px solid ${hexToRgba(pal.ink, 0.1)};box-shadow:0 4px 12px ${hexToRgba(pal.ink, 0.06)}">` +
          `<div style="display:flex;align-items:flex-start;gap:12px"><span style="flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${pal.deep};color:#FFFFFF;${sans};font-size:14px;font-weight:800">Q</span>` +
          `<p style="flex:1 1 0%;min-width:0;margin:3px 0 0;${sans};font-size:16px;font-weight:700;line-height:1.5;color:${pal.ink};word-break:keep-all">${esc(q.label)}</p>${CHEV(pal.deep)}</div>` +
          `<p style="margin:12px 0 0 40px;padding-left:12px;border-left:3px solid ${hexToRgba(pal.accent, 0.5)};${sans};font-size:15px;line-height:1.7;color:${hexToRgba(pal.ink, 0.8)};word-break:keep-all">${esc(q.value)}</p></div>`,
      )
      .join("");
    return `<section data-pz-impact="faqcards" style="padding:48px 20px;background:${pal.face}"><div style="max-width:576px;margin:0 auto">${head}${items}</div></section>`;
  }
  if (s.kind === "spectable") {
    const rows = (s.stats ?? [])
      .map(
        (r, i) =>
          `<div style="display:flex;gap:12px;padding:13px 16px;background:${i % 2 === 0 ? "#FFFFFF" : pal.face}">` +
          `<span style="flex:0 0 34%;min-width:0;${sans};font-size:14px;font-weight:700;line-height:1.55;color:${pal.deep};word-break:keep-all">${esc(r.label)}</span>` +
          `<span style="flex:1 1 0%;min-width:0;${sans};font-size:15px;line-height:1.6;color:${pal.ink};white-space:pre-line;word-break:keep-all">${esc(r.value)}</span></div>`,
      )
      .join("");
    return (
      `<section data-pz-impact="spectable" style="padding:40px 20px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head}` +
      `<div style="border-radius:16px;overflow:hidden;border:1px solid ${hexToRgba(pal.ink, 0.1)};box-shadow:0 4px 12px ${hexToRgba(pal.ink, 0.06)}"><div style="height:6px;background:${pal.accent}"></div>${rows}</div></div></section>`
    );
  }
  // checkrows
  const items = (s.labels ?? [])
    .map(
      (l) =>
        `<div style="flex:1 1 260px;min-width:0;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:${pal.face}">` +
        `<span style="flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${pal.deep}">${CHECK}</span>` +
        `<span style="min-width:0;${sans};font-size:16px;font-weight:600;line-height:1.5;color:${pal.ink};word-break:keep-all">${esc(l)}</span></div>`,
    )
    .join("");
  return `<section data-pz-impact="checkrows" style="padding:44px 20px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head}<div style="display:flex;flex-wrap:wrap;gap:10px">${items}</div></div></section>`;
}

/** 기존 섹션을 디자인 언어 블록으로. 조건이 안 맞으면 원래 섹션 그대로 */
export function planPolish(sections: DetailSection[], sourceIndexes: number[]): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ kind: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ kind: string; at: number }> };
  if (!DESIGN_POLISH_ENABLED || sections[0]?.type !== "hero") return none;
  const echo = dropSpecEchoFaqItems(sections);
  const placed: Array<{ kind: string; at: number }> = [];
  const out = sections.map((orig, i) => {
    const s = echo[i]!;
    const mark = (sec: ImpactSection): DetailSection => { placed.push({ kind: sec.kind, at: i }); return sec as DetailSection; };
    if (i === 0) return orig;
    if (s.type === "faq") {
      const items = (s.items ?? []).filter((x) => (x.question ?? "").trim() && (x.answer ?? "").trim());
      if (items.length === 0) return orig;
      return mark({ type: "impact", slot: "impact", kind: "faqcards", text: (s.heading ?? "").trim(), stats: items.map((x) => ({ label: x.question.trim(), value: x.answer.trim() })), origin: { type: "faq", slot: s.slot } });
    }
    if (s.type === "spec_table") {
      const rows = (s.rows ?? []).filter((r) => (r.label ?? "").trim() || (r.value ?? "").trim());
      if (rows.length === 0 || (s.imageIndexes && s.imageIndexes.length > 0)) return orig;
      return mark({ type: "impact", slot: "impact", kind: "spectable", text: (s.heading ?? "").trim(), stats: rows.map((r) => ({ label: (r.label ?? "").trim(), value: (r.value ?? "").trim() })), origin: { type: "spec_table", slot: s.slot } });
    }
    if (s.type === "checklist") {
      const items = (s.items ?? []).map((x) => x.trim()).filter(Boolean);
      if (s.hubPhoto || s.boldBlock || s.compactFollow || items.length < 3 || items.length > 6) return orig;
      return mark({ type: "impact", slot: "impact", kind: "checkrows", text: (s.heading ?? "").trim(), labels: items, origin: { type: "checklist", slot: s.slot } });
    }
    if (s.type === "usage_steps" && Array.isArray(s.steps) && s.steps.length >= 3 && s.steps.length <= 6) {
      return mark({ type: "impact", slot: "impact", kind: "timeline", text: (s.heading ?? "").trim(), labels: s.steps.map((x) => x.trim()).filter(Boolean), origin: { type: "usage_steps", slot: s.slot } });
    }
    return orig;
  });
  return placed.length ? { sections: out, sourceIndexes, placed } : none;
}
