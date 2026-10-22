/**
 * 435차 — 밋밋한 섹션 임팩트 보강(표시 전용 section type impact의 story·fit·note·textboost, 일러스트 구간 강화).
 * 새 문구·수치를 만들지 않는다: 기존 문구를 재배치·강조할 뿐이다. 마크업은 impactHtml 한 벌을 라이브·export가 그대로 쓴다(패리티 0).
 *
 *  story     브랜드 스토리 — 브랜드 라벨 칩 + 제목 + 첫 문장(12~40자) 큰 인용 + 나머지 본문(16px) + 슬롯 파스텔 면 + 상·하단 곡선 + 걸친 부분 크롭 사진.
 *            문장 1~2개의 짧은 글(70자 이하)은 433차 Big statement로 바꾼다. 텍스트는 원문 그대로(문장 분리만).
 *  fit       "이런 분께 잘 맞아요" — 추천 대상 항목만(큰 체크 아이콘 + 슬롯 색 채움 카드).
 *  note      "이런 점은 참고하세요" — 주의·유의 문구만(따뜻한 중립 면 + 느낌표 아이콘 + 좌측 강조 선). 효능을 암시하지 않는 중립 아이콘.
 *  textboost 글만 있는 카드(text_only) — 제목 크게 + 좌측 강조 선 + 슬롯 파스텔 면 + 본문 16px.
 * 제목-내용 불일치 원인(422 "이런 분께 잘 맞아요"): lib/detail-visual-rhythm dropDuplicateRecommendColumn이 고민(target_persona)이 있으면 "추천" 열을 비우는데
 * 카드 제목은 그대로여서, 제목은 "잘 맞아요"인데 안에는 "이런 점은 참고하세요" 항목만 남았다(데이터에 추천 항목이 없던 것도, 제목 선택 오류도 아님).
 * 여기서는 같은 중복 제거를 먼저 적용해 남은 열마다 맞는 제목·톤의 블록으로 분리한다(둘 다 남으면 두 블록).
 * 플래그 NEXT_PUBLIC_IMPACT_BOOST=off 이면 433·431차 화면 그대로.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import type { ProductImageOrigin } from "@/lib/image-origins";
import { dropDuplicateRecommendColumn } from "@/lib/detail-visual-rhythm";
import { emphasisMarkerGradient } from "@/lib/body-emphasis";
import { hexToRgba } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";

/** 기본 켬. 끄려면 NEXT_PUBLIC_IMPACT_BOOST=off 로 서버를 시작한다(433·431차와 같은 화면) */
export const IMPACT_BOOST_ENABLED = process.env.NEXT_PUBLIC_IMPACT_BOOST !== "off";

export const STORY_QUOTE_MIN = 12;
export const STORY_QUOTE_MAX = 40;
export const STORY_SHORT_MAX = 44;
/** 기존 라벨(렌더러 tradeoff 카드가 쓰던 문구)만 쓴다 */
export const NOTE_LABEL = "이런 점은 참고하세요";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const sans = `font-family:${DETAIL_FONT_STACK.sans}`;

/** 문장 나누기(마침표·물음표·느낌표 뒤 공백) */
export function splitSentences(body: string): string[] {
  return body.trim().split(/(?<=[.!?。])\s+/).map((s) => s.trim()).filter(Boolean);
}

/** 본문 첫 문장이 인용에 알맞으면(12~40자) 그 문장과 나머지(원문 그대로)를 돌려준다 */
export function splitQuote(body: string): { quote: string; rest: string } | null {
  const text = body.trim();
  const first = splitSentences(text)[0];
  if (!first || first.length < STORY_QUOTE_MIN || first.length > STORY_QUOTE_MAX) return null;
  return { quote: first, rest: text.slice(first.length).replace(/^\s+/, "") };
}

/** 제목 속 마커 구간(형광펜 1개) — 키워드가 있으면 그 단어, 없으면 마지막 어절 */
export function markHeading(text: string, keyword: RegExp | null, accent: string): string {
  const m = keyword ? keyword.exec(text) : null;
  let start: number, end: number;
  if (m) { start = m.index; end = m.index + m[0].length; }
  else {
    const lastSpace = text.trimEnd().lastIndexOf(" ");
    if (lastSpace < 0) return esc(text);
    start = lastSpace + 1; end = text.trimEnd().length;
  }
  return `${esc(text.slice(0, start))}<span style="background-image:${emphasisMarkerGradient(accent)};box-decoration-break:clone;-webkit-box-decoration-break:clone">${esc(text.slice(start, end))}</span>${esc(text.slice(end))}`;
}

const CHECK_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:block"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BANG_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:block"><path d="M12 5 V14" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/><circle cx="12" cy="19" r="1.9" fill="#FFFFFF"/></svg>`;

/** 상·하단 곡선(색 면이 이웃 섹션 위로 살짝 번지는 아치). CSS·SVG path만 */
function curve(face: string, where: "top" | "bottom"): string {
  const d = where === "top" ? "M0 20 Q50 -6 100 20 Z" : "M0 0 Q50 26 100 0 Z";
  return `<svg aria-hidden="true" viewBox="0 0 100 20" preserveAspectRatio="none" style="position:absolute;left:0;width:100%;height:18px;display:block;${where === "top" ? "top:0;transform:translateY(-99%)" : "bottom:0;transform:translateY(99%)"}"><path d="${d}" fill="${face}"/></svg>`;
}

/** 스토리·추천·참고·글 카드 마크업 */
export function boostHtml(s: ImpactSection, pal: ImpactPalette, alt: string): string {
  const e = esc;
  if (s.kind === "story") {
    const photo = s.images?.[0];
    return (
      `<section data-pz-impact="story" style="position:relative;z-index:1;padding:56px 24px 48px;background:${pal.face}">${curve(pal.face, "top")}${curve(pal.face, "bottom")}` +
      `<div style="max-width:576px;margin:0 auto">` +
      (s.chip ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${pal.deep};color:#FFFFFF;${sans};font-size:12px;font-weight:700;letter-spacing:0.06em;line-height:1.2">${e(s.chip)}</span>` : "") +
      (s.text ? `<p style="margin:${s.chip ? "16px" : "0"} 0 0;${title};font-size:18px;font-weight:700;letter-spacing:-0.01em;line-height:1.4;color:${pal.deep};word-break:keep-all">${e(s.text)}</p>` : "") +
      (s.quote
        ? `<div style="margin:20px 0 0;padding:2px 0 2px 18px;border-left:5px solid ${pal.accent}"><p style="margin:0;${title};font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1.4;color:${pal.ink};word-break:keep-all">${e(s.quote)}</p></div>`
        : "") +
      (s.body ? `<p style="margin:20px 0 0;${sans};font-size:16px;line-height:1.7;text-align:left;color:${hexToRgba(pal.ink, 0.84)};white-space:pre-line;word-break:keep-all">${e(s.body)}</p>` : "") +
      (photo ? `<div style="margin:28px -24px 0 14%;aspect-ratio:4 / 3;overflow:hidden;border-radius:18px 0 0 18px;box-shadow:0 10px 24px ${hexToRgba(pal.ink, 0.14)}"><img src="${e(photo.url)}" alt="${e(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${photo.pos ?? "50% 40%"}"/></div>` : "") +
      `</div></section>`
    );
  }
  if (s.kind === "fit") {
    const cards = (s.labels ?? [])
      .map(
        (l) =>
          `<div style="flex:1 1 260px;min-width:0;display:flex;align-items:center;gap:12px;box-sizing:border-box;padding:16px 16px;border-radius:14px;background:${pal.face}">` +
          `<span style="flex:none;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:${pal.deep}">${CHECK_SVG}</span>` +
          `<span style="min-width:0;${sans};font-size:16px;font-weight:600;line-height:1.5;color:${pal.ink};word-break:keep-all">${e(l)}</span></div>`,
      )
      .join("");
    return (
      `<section data-pz-impact="fit" style="padding:48px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">` +
      (s.text ? `<p style="margin:0 0 24px;${title};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${markHeading(s.text, /잘 ?맞/, pal.accent)}</p>` : "") +
      `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div></div></section>`
    );
  }
  if (s.kind === "note") {
    const rows = (s.labels ?? [])
      .map(
        (l, i) =>
          `<div style="display:flex;align-items:flex-start;gap:12px;${i > 0 ? `margin-top:14px;padding-top:14px;border-top:1px solid ${hexToRgba(pal.ink, 0.1)}` : ""}">` +
          `<span style="flex:none;display:flex;align-items:center;justify-content:center;width:26px;height:26px;margin-top:1px;border-radius:999px;background:${pal.deep}">${BANG_SVG}</span>` +
          `<span style="min-width:0;${sans};font-size:16px;font-weight:600;line-height:1.6;color:${pal.ink};word-break:keep-all">${e(l)}</span></div>`,
      )
      .join("");
    return (
      `<section data-pz-impact="note" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto;box-sizing:border-box;padding:22px 22px 24px;border-radius:14px;border-left:6px solid ${pal.deep};background:${pal.warm}">` +
      (s.text ? `<p style="margin:0 0 16px;${title};font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${e(s.text)}</p>` : "") +
      `${rows}</div></section>`
    );
  }
  // textboost
  return (
    `<section data-pz-impact="textboost" style="padding:44px 24px;background:${pal.face}"><div style="max-width:576px;margin:0 auto;padding-left:18px;border-left:5px solid ${pal.accent}">` +
    `<p style="margin:0;${title};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${e(s.text)}</p>` +
    (s.body ? `<p style="margin:14px 0 0;${sans};font-size:16px;line-height:1.7;color:${hexToRgba(pal.ink, 0.84)};white-space:pre-line;word-break:keep-all">${e(s.body)}</p>` : "") +
    `</div></section>`
  );
}

export type BoostCtx = { brandName?: string | null; imageUrls: readonly string[]; origins?: ReadonlyArray<ProductImageOrigin | undefined> };

const okUrl = (u: string | undefined): string => (u && (/^(https?:)?\/\//i.test(u) || u.startsWith("/")) ? u : "");

/** 브랜드 스토리·추천/참고 카드를 보강 블록으로 바꾼다. 해당 없으면 입력을 그대로 돌려준다 */
export function planBoost(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: BoostCtx,
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ kind: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ kind: string; at: number }> };
  if (!IMPACT_BOOST_ENABLED) return none;
  // 렌더러가 나중에 하는 중복 제거(고민이 있으면 추천 열 비움, caution과 겹치는 참고 항목 뺌)를 먼저 적용해 카드 내용을 확정한다
  const deduped = dropDuplicateRecommendColumn(sections);
  const outS: DetailSection[] = [];
  const outI: number[] = [];
  const placed: Array<{ kind: string; at: number }> = [];
  sections.forEach((orig, i) => {
    const s = deduped[i]!;
    const push = (sec: ImpactSection) => { placed.push({ kind: sec.kind, at: outS.length }); outS.push(sec as DetailSection); outI.push(sourceIndexes[i]!); };
    if (orig.type === "brand_story" && i > 0) {
      const body = (orig.body ?? "").trim();
      const heading = (orig.heading ?? "").trim();
      // 본문이 없거나 너무 짧으면(12자 미만) 원본 그대로 둔다
      if (body.length < STORY_QUOTE_MIN) { outS.push(orig); outI.push(sourceIndexes[i]!); return; }
      const sentences = splitSentences(body);
      if (sentences.length <= 2 && body.length >= STORY_QUOTE_MIN && body.length <= STORY_SHORT_MAX) {
        push({ type: "impact", slot: "impact", kind: "statement", text: body, tone: "bold" });
        return;
      }
      const sq = splitQuote(body);
      const idx = (orig.imageIndexes ?? []).find((n) => (ctx.origins?.[n] ?? "original") !== "ai-lifestyle" && okUrl(ctx.imageUrls[n]));
      const brand = (ctx.brandName ?? "").trim();
      push({
        type: "impact", slot: "impact", kind: "story", text: heading, ...(brand && brand.length <= 24 ? { chip: brand } : {}),
        ...(sq ? { quote: sq.quote, body: sq.rest } : { body }),
        ...(idx !== undefined ? { images: [{ url: okUrl(ctx.imageUrls[idx]), pos: "50% 40%" }] } : {}),
      });
      return;
    }
    if (orig.type === "tradeoff_card" && s.type === "tradeoff_card") {
      const rec = (Array.isArray(s.recommendFor) ? s.recommendFor : []).map((t) => t.trim()).filter(Boolean).slice(0, 4);
      const con = (Array.isArray(s.considerIf) ? s.considerIf : []).map((t) => t.trim()).filter(Boolean).slice(0, 4);
      if (rec.length === 0 && con.length === 0) { outS.push(orig); outI.push(sourceIndexes[i]!); return; }
      if (rec.length > 0) push({ type: "impact", slot: "impact", kind: "fit", text: (orig.heading ?? "").trim(), labels: rec });
      if (con.length > 0) push({ type: "impact", slot: "impact", kind: "note", text: NOTE_LABEL, labels: con });
      return;
    }
    // 주의 카드(caution): 규제 문구는 한 글자도 바꾸지 않고 줄 단위로 나열(느낌표 아이콘+따뜻한 중립 면)
    if (orig.type === "caution" && i > 0) {
      const lines = (orig.body ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
      if (lines.length > 0 && lines.length <= 6) { push({ type: "impact", slot: "impact", kind: "note", text: (orig.heading ?? "").trim(), labels: lines }); return; }
    }
    // 글만 있는 카드(text_only): 제목 크게 + 좌측 강조 선 + 슬롯 파스텔 면. 연속으로 같은 모양이 나오지 않게 바로 앞이 글 카드면 그대로 둔다
    if (orig.type === "image_text" && orig.layout === "text_only" && orig.slot !== "feature_callout" && orig.slot !== "quick_points" && i > 1 && (orig.heading ?? "").trim() && (orig.body ?? "").trim() && placed.every((p) => p.at !== outS.length - 1 || p.kind !== "textboost")) {
      push({ type: "impact", slot: "impact", kind: "textboost", text: orig.heading.trim(), body: orig.body.trim() });
      return;
    }
    outS.push(orig);
    outI.push(sourceIndexes[i]!);
  });
  return placed.length ? { sections: outS, sourceIndexes: outI, placed } : none;
}
