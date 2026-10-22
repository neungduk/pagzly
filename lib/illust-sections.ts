/**
 * 431차 1-3 — 인포 구간의 SVG 일러스트 배치(표시 전용 section type impact의 illust-side·illust-center, number의 일러스트 곁들이기).
 * 키워드가 매핑되는 구간에만 넣는다(억지로 넣지 않음): 텍스트(text_only 카드)·체크리스트 항목은 기존 문구 그대로, 일러스트는 장식(aria-hidden).
 *  - illust-side   : 좌 텍스트·우 일러스트(좌우 번갈아). 제목+본문을 그대로 옮기고 일러스트가 구간 폭의 약 40%를 차지.
 *  - illust-center : 중앙 큰 일러스트(폭 약 56%) + 모서리 라벨 칩(체크리스트 항목 3~4개, 입력 문구 그대로).
 *  - number+일러스트: 433차 Number hero에 같은 키워드 일러스트를 곁들인다(impact-templates).
 * 상한 4개/페이지, 같은 일러스트·같은 레이아웃 연속 금지, 사이 간격 ≥1,200px(추정), 변형(구도·색 슬롯)은 순서대로 회전.
 * 텍스트는 흰 바탕 위 ink/deep 색(대비 4.5:1 이상)이고 일러스트는 텍스트 칸과 겹치지 않는 별도 칸이다(안전 영역).
 * 라이브·export는 impactHtml(= 이 파일의 illustHtml)을 그대로 쓴다(패리티 0). 인라인 SVG만 — foreignObject·filter·외부 참조 없음.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import { estimateSectionHeight } from "@/lib/impact-templates";
import { illustrationSvg, type IllustId } from "@/lib/illustrations/library";
import { ILLUSTRATION_V1_ENABLED, illustStyleFor, pickIllustration } from "@/lib/illustration-map";
import { hexToRgba } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";

export const ILLUST_MAX_PER_PAGE = 4;
export const ILLUST_MIN_GAP_PX = 1200;
const SIDE_BODY_MAX = 90;
const CHIP_MAX = 22;

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** impact 섹션이 가진 일러스트 정보로 SVG 문자열 */
export function illustFor(s: ImpactSection, pal: ImpactPalette): string {
  if (!s.illust) return "";
  return illustrationSvg(s.illust.id as IllustId, s.illust.style, pal.illust, s.illust.variant, `${s.kind}|${s.text}`);
}

export function illustHtml(s: ImpactSection, pal: ImpactPalette): string {
  const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
  const sans = `font-family:${DETAIL_FONT_STACK.sans}`;
  const svg = illustFor(s, pal);
  if (s.kind === "illust-side") {
    const right = s.imagePosition !== "left"; // imagePosition = 일러스트가 있는 쪽
    return (
      `<section data-pz-impact="illust-side" style="padding:48px 24px;background:#FFFFFF">` +
      `<div style="display:flex;flex-direction:${right ? "row" : "row-reverse"};align-items:center;gap:20px;max-width:576px;margin:0 auto">` +
      `<div style="flex:1 1 0%;min-width:0"><p style="margin:0;${title};font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` +
      (s.body ? `<p style="margin:12px 0 0;${sans};font-size:15px;line-height:1.8;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${esc(s.body)}</p>` : "") +
      `</div><div style="flex:0 0 38%;max-width:220px;min-width:0">${svg}</div></div></section>`
    );
  }
  // illust-center: 제목 + 중앙 일러스트 + 모서리 칩
  const pos = ["top:4%;left:0", "top:4%;right:0", "bottom:4%;left:0", "bottom:4%;right:0"];
  const chips = (s.labels ?? [])
    .slice(0, 4)
    .map((l, i) => `<span style="position:absolute;${pos[i]};max-width:40%;box-sizing:border-box;padding:8px 12px;border-radius:14px;background:#FFFFFF;border:1px solid ${hexToRgba(pal.ink, 0.12)};box-shadow:0 4px 12px ${hexToRgba(pal.ink, 0.08)};${sans};font-size:12.5px;font-weight:700;line-height:1.35;color:${pal.ink};word-break:keep-all">${esc(l)}</span>`)
    .join("");
  return (
    `<section data-pz-impact="illust-center" style="padding:48px 20px;background:#FFFFFF">` +
    `<div style="max-width:576px;margin:0 auto">` +
    (s.text ? `<p style="margin:0 0 20px;text-align:center;${title};font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` : "") +
    `<div style="position:relative;width:100%;max-width:420px;margin:0 auto;aspect-ratio:1 / 1"><div style="position:absolute;left:17%;right:17%;top:8%;bottom:8%">${svg}</div>${chips}</div>` +
    `</div></section>`
  );
}

type Cand = { at: number; layout: "side" | "center"; id: IllustId; text: string; body: string; labels: string[] };

function candidates(secs: DetailSection[], used: Set<IllustId>): Cand[] {
  const out: Cand[] = [];
  secs.forEach((s, i) => {
    if (i < 2) return;
    if (s.type === "image_text" && s.layout === "text_only" && s.slot !== "feature_callout" && s.slot !== "quick_points") {
      const heading = s.heading.trim();
      const body = (s.body ?? "").trim();
      if (!heading || heading.length > 24 || !body || body.length > SIDE_BODY_MAX) return;
      const pick = pickIllustration(`${heading} ${body}`, used);
      if (pick) out.push({ at: i, layout: "side", id: pick.id, text: heading, body, labels: [] });
    } else if (s.type === "checklist") {
      const items = s.items.map((x) => x.trim()).filter(Boolean);
      const heading = (s.heading ?? "").trim();
      if (items.length < 3 || items.length > 4 || items.some((x) => x.length > CHIP_MAX) || heading.length > 24) return;
      const pick = pickIllustration(`${heading} ${items.join(" ")}`, used);
      if (pick) out.push({ at: i, layout: "center", id: pick.id, text: heading, body: "", labels: items });
    }
  });
  return out;
}

/** 표시 규칙의 뒤쪽에서 부른다(임팩트 템플릿보다 먼저). 키워드가 매핑되는 구간만 일러스트 구간으로 바꾼다. 없으면 입력을 그대로 돌려준다 */
export function planIllustrations(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: { category?: string },
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ id: IllustId; layout: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ id: IllustId; layout: string; at: number }> };
  if (!ILLUSTRATION_V1_ENABLED || sections.length < 6 || sections[0]!.type !== "hero") return none;
  const ys: number[] = [];
  let acc = 0;
  for (const s of sections) { ys.push(acc); acc += estimateSectionHeight(s); }
  const style = illustStyleFor(ctx.category);
  const used = new Set<IllustId>();
  const chosen = new Map<number, ImpactSection>();
  const placed: Array<{ id: IllustId; layout: string; at: number }> = [];
  let lastY = -1e9;
  let lastId: IllustId | null = null;
  let lastLayout = "";
  let sideRight = true;
  const cands = candidates(sections, new Set());
  for (const c of cands) {
    if (chosen.size >= ILLUST_MAX_PER_PAGE) break;
    if (ys[c.at]! - lastY < ILLUST_MIN_GAP_PX) continue;
    if (c.id === lastId || used.has(c.id) || c.layout === lastLayout && placed.length > 0 && c.layout === "center") continue;
    const variant = chosen.size % 3;
    let section: ImpactSection;
    if (c.layout === "side") {
      section = { type: "impact", slot: "impact", kind: "illust-side", text: c.text, body: c.body, imagePosition: sideRight ? "right" : "left", illust: { id: c.id, variant, style } };
      sideRight = !sideRight;
    } else {
      section = { type: "impact", slot: "impact", kind: "illust-center", text: c.text, labels: c.labels, illust: { id: c.id, variant, style } };
    }
    chosen.set(c.at, section);
    placed.push({ id: c.id, layout: c.layout, at: c.at });
    used.add(c.id);
    lastId = c.id;
    lastLayout = c.layout;
    lastY = ys[c.at]!;
  }
  if (chosen.size === 0) return none;
  return {
    sections: sections.map((s, i) => chosen.get(i) ?? s),
    sourceIndexes,
    placed,
  };
}
