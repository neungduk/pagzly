/**
 * 437차 1-4 — 레퍼런스(제작사 상세페이지 예시) 반영 섹션 3종(표시 전용 section type impact). 입력이 있을 때만, 새 문구 없음, 페이지당 각 1개.
 *
 *  종류        입력 요건                                              동작
 *  checkgrid   퀵포인트(image_text, slot quick_points) 연속 4~6개      2열 채색 면 아이콘 그리드(제목·본문 원문, 아이콘은 431차 일러스트 키워드 매핑 또는 중립 체크). 3개짜리 묶음은 433차 콜아웃이 계속 맡는다.
 *  bubbles     target_persona 3~5개, 각 40자 이하, 사진 띠 없음         기존 고민 문구를 따옴표 말풍선(좌우 번갈아)으로. 감정 얼굴 아이콘 없음(중립 따옴표 도형)
 *  chat        업로드 후기 ≥5건 + 장점 문구 ≥2개, review_highlight 없음  채팅 말풍선 UI에 장점 문구 2~3개. "판매자 제공 후기" 표기, 실제 메신저 캡처·로고를 흉내 내지 않는 일반 말풍선(라벨 "후기 요약")
 * 후기 원문은 저장되지 않아(요약 문구만 있음) chat은 "원문"이 아니라 업로드 후기에서 정리된 장점 문구를 보여 준다 — 그렇게 표기한다.
 * 라이브·export는 impactHtml(= referenceHtml) 한 벌. CSS는 flex·border 삼각형·인라인 SVG만.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import { illustrationSvg, type IllustId } from "@/lib/illustrations/library";
import { pickIllustration } from "@/lib/illustration-map";
import { hexToRgba } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { HERO_V2_ENABLED } from "@/lib/hero-spec";
import type { ClaimFacts } from "@/lib/numeric-claim-gate";

export const REFERENCE_KINDS = ["checkgrid", "bubbles", "chat"] as const;
export const isReferenceKind = (k: string): k is (typeof REFERENCE_KINDS)[number] => (REFERENCE_KINDS as readonly string[]).includes(k);
export const CHAT_MIN_REVIEW_LINES = 5;
export const CHAT_LABEL = "후기 요약";
export const CHAT_NOTICE = "판매자 제공 후기";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const sans = `font-family:${DETAIL_FONT_STACK.sans}`;

const CHECK_DARK = (c: string): string => `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" style="display:block"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const QUOTE = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="display:block"><path d="M5 17 C5 12 6 9 9 7 L10 9 C8.5 10 8 11.5 8 13 H11 V18 H5 Z M14 17 C14 12 15 9 18 7 L19 9 C17.5 10 17 11.5 17 13 H20 V18 H14 Z" fill="#FFFFFF"/></svg>`;
const PERSON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="display:block"><circle cx="12" cy="9" r="4" fill="#FFFFFF"/><path d="M4 20 C4 15 8 13.5 12 13.5 C16 13.5 20 15 20 20 Z" fill="#FFFFFF"/></svg>`;

export function referenceHtml(s: ImpactSection, pal: ImpactPalette): string {
  if (s.kind === "checkgrid") {
    const cells = (s.labels ?? [])
      .map((l, i) => {
        const [head, ...rest] = l.split("\n");
        const body = rest.join("\n");
        const id = s.illust && i === 0 ? null : (pickIllustration(head ?? "")?.id as IllustId | undefined);
        const inner = id ? `<div style="width:46px;height:46px">${illustrationSvg(id, "flat", pal.illust, i % 3, `cg${i}`)}</div>` : CHECK_DARK(pal.deep);
        const icon = `<span style="display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;background:#FFFFFF;box-shadow:0 2px 8px ${hexToRgba(pal.ink, 0.1)}">${inner}</span>`;
        return (
          `<div style="flex:1 1 calc(50% - 5px);min-width:0;box-sizing:border-box;padding:18px 14px 20px;border-radius:16px;background:${pal.face};text-align:center">` +
          `<div style="display:flex;justify-content:center">${icon}</div>` +
          `<p style="margin:12px 0 0;${title};font-size:16px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${esc(head ?? "")}</p>` +
          (body ? `<p style="margin:6px 0 0;${sans};font-size:14px;line-height:1.55;color:${hexToRgba(pal.ink, 0.76)};word-break:keep-all">${esc(body)}</p>` : "") +
          `</div>`
        );
      })
      .join("");
    return (
      `<section data-pz-impact="checkgrid" style="padding:48px 20px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">` +
      `<p style="margin:0 0 16px;text-align:center;${sans};font-size:12px;font-weight:700;letter-spacing:0.2em;color:${pal.accent}">POINT</p>` +
      `<div style="display:flex;flex-wrap:wrap;gap:10px">${cells}</div></div></section>`
    );
  }
  if (s.kind === "bubbles") {
    const rows = (s.labels ?? [])
      .map((l, i) => {
        const right = i % 2 === 1;
        const bg = right ? pal.deep : pal.face;
        const color = right ? "#FFFFFF" : pal.ink;
        return (
          `<div style="display:flex;${right ? "justify-content:flex-end" : "justify-content:flex-start"};margin-top:${i === 0 ? 0 : 14}px">` +
          `<div style="position:relative;max-width:86%;box-sizing:border-box;padding:16px 18px 16px 18px;border-radius:${right ? "20px 20px 4px 20px" : "20px 20px 20px 4px"};background:${bg}">` +
          `<span aria-hidden="true" style="position:absolute;top:-12px;${right ? "right:14px" : "left:14px"};display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${right ? pal.accent : pal.deep}">${QUOTE}</span>` +
          `<p style="margin:0;${sans};font-size:16px;font-weight:600;line-height:1.6;color:${color};word-break:keep-all">“${esc(l)}”</p></div></div>`
        );
      })
      .join("");
    return (
      `<section data-pz-impact="bubbles" style="padding:48px 20px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">` +
      (s.text ? `<p style="margin:0 0 28px;${title};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${esc(s.text)}</p>` : "") +
      `${rows}</div></section>`
    );
  }
  // chat
  const msgs = (s.labels ?? [])
    .map(
      (l, i) =>
        `<div style="display:flex;align-items:flex-end;gap:8px;margin-top:${i === 0 ? 0 : 10}px"><span aria-hidden="true" style="flex:none;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${pal.deep}">${PERSON}</span>` +
        `<div style="position:relative;max-width:80%;box-sizing:border-box;padding:12px 16px;border-radius:18px 18px 18px 4px;background:#FFFFFF;box-shadow:0 2px 8px ${hexToRgba(pal.ink, 0.1)}"><p style="margin:0;${sans};font-size:15px;font-weight:500;line-height:1.55;color:${pal.ink};word-break:keep-all">${esc(l)}</p></div></div>`,
    )
    .join("");
  return (
    `<section data-pz-impact="chat" style="padding:44px 20px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">` +
    `<p style="margin:0 0 16px;${title};font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink}">${esc(s.text || CHAT_LABEL)}</p>` +
    `<div style="box-sizing:border-box;padding:20px 16px;border-radius:20px;background:${pal.face}">${msgs}</div>` +
    `<p style="margin:12px 0 0;${sans};font-size:12px;line-height:1.5;color:${hexToRgba(pal.ink, 0.62)}">${esc(CHAT_NOTICE)} · ${esc(s.sub ?? "")}</p></div></section>`
  );
}

const isQp = (s: DetailSection | undefined): boolean => !!s && s.type === "image_text" && s.slot === "quick_points" && (s.layout === "compact" || s.layout === "text_only");

export function planReference(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: { facts: ClaimFacts },
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ kind: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ kind: string; at: number }> };
  if (!HERO_V2_ENABLED || sections[0]?.type !== "hero") return none;
  const placed: Array<{ kind: string; at: number }> = [];
  const outS: DetailSection[] = [];
  const outI: number[] = [];
  const used = new Set<string>();
  const hasReviewHighlight = sections.some((s) => s.type === "review_highlight");
  const push = (kind: "checkgrid" | "bubbles" | "chat", sec: ImpactSection, src: number) => { placed.push({ kind, at: outS.length }); outS.push(sec as DetailSection); outI.push(src); used.add(kind); };
  for (let i = 0; i < sections.length; i += 1) {
    const s = sections[i]!;
    // checkgrid: 퀵포인트 연속 4~6개
    if (isQp(s) && !isQp(sections[i - 1]) && !used.has("checkgrid") && i >= 2) {
      let j = i;
      while (j < sections.length && j - i < 6 && isQp(sections[j])) j += 1;
      const run = sections.slice(i, j);
      const after = sections[j];
      if (run.length >= 4 && !isQp(after) && run.every((r) => r.type === "image_text" && r.heading.trim().length > 0 && r.heading.trim().length <= 16)) {
        const labels = run.map((r) => (r.type === "image_text" ? (r.body?.trim() ? `${r.heading.trim()}\n${r.body.trim()}` : r.heading.trim()) : ""));
        push("checkgrid", { type: "impact", slot: "impact", kind: "checkgrid", text: "", labels }, sourceIndexes[i]!);
        i = j - 1;
        continue;
      }
    }
    // bubbles: 고민 3~5개(각 40자 이하), 사진 띠 없음
    if (s.type === "target_persona" && !used.has("bubbles")) {
      const ps = (s.personas ?? []).map((p) => p.trim()).filter(Boolean);
      if (ps.length >= 3 && ps.length <= 5 && ps.every((p) => p.length <= 40) && !(s.imageIndexes && s.imageIndexes.length > 0)) {
        push("bubbles", { type: "impact", slot: "impact", kind: "bubbles", text: (s.heading ?? "").trim(), labels: ps }, sourceIndexes[i]!);
        continue;
      }
    }
    outS.push(s);
    outI.push(sourceIndexes[i]!);
  }
  // chat: 후기 ≥5건 + 장점 ≥2, review_highlight가 없을 때 — 근거 단계(성분·질감) 앞에
  const praises = ctx.facts.source.praises.filter((p) => p.length <= 40).slice(0, 3);
  if (!hasReviewHighlight && ctx.facts.source.reviewLineCount >= CHAT_MIN_REVIEW_LINES && praises.length >= 2) {
    const at = outS.findIndex((s, i) => i >= 3 && ["ingredient_highlight", "texture_feel", "stat_infographic", "how_it_works", "usage_steps", "spec_table"].includes((s as { slot?: string }).slot ?? s.type));
    const pos = at >= 0 ? at : outS.findIndex((s) => s.type === "cta_price");
    if (pos > 0) {
      const sec: ImpactSection = { type: "impact", slot: "impact", kind: "chat", text: CHAT_LABEL, labels: praises, sub: `업로드한 후기 ${ctx.facts.source.reviewLineCount}건에서 정리한 장점 문구` };
      outS.splice(pos, 0, sec as DetailSection);
      outI.splice(pos, 0, outI[Math.min(pos, outI.length - 1)]!);
      placed.push({ kind: "chat", at: pos });
    }
  }
  return placed.length ? { sections: outS, sourceIndexes: outI, placed } : none;
}
