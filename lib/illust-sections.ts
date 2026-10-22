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
import { ILLUSTRATION_V1_ENABLED, illustKeyword, illustStyleFor, pickIllustration } from "@/lib/illustration-map";
import { IMPACT_BOOST_ENABLED, markHeading } from "@/lib/impact-boost";
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

/** 435차 — 일러스트 구간 강화: 파스텔 면 위 진한 오브젝트(대비 ≥3:1)·큰 그림·채움 알약 라벨+연결선·큰 제목+마커 */
function illustBoostHtml(s: ImpactSection, pal: ImpactPalette): string {
  const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
  const sans = `font-family:${DETAIL_FONT_STACK.sans}`;
  const svg = illustFor(s, pal);
  const head = s.text ? `<p style="margin:0;${title};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${markHeading(s.text, s.illust ? illustKeyword(s.illust.id as IllustId) : null, pal.accent)}</p>` : "";
  if (s.kind === "illust-side") {
    const first = s.imagePosition === "left";
    return (
      `<section data-pz-impact="illust-side" style="padding:32px 20px;background:${pal.face}">` +
      `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px;max-width:576px;margin:0 auto">` +
      `<div style="flex:1 1 240px;max-width:300px;min-width:0;margin:0 auto;order:${first ? 0 : 1}">${svg}</div>` +
      `<div style="flex:1 1 240px;min-width:0;order:${first ? 1 : 0}">${head}` +
      (s.body ? `<p style="margin:12px 0 0;${sans};font-size:16px;line-height:1.7;color:${hexToRgba(pal.ink, 0.84)};white-space:pre-line;word-break:keep-all">${esc(s.body)}</p>` : "") +
      `</div></div></section>`
    );
  }
  // illust-center: 큰 그림 + 모서리 채움 알약(번호) + 연결선(SVG 직선·점, 고정 좌표)
  const labels = (s.labels ?? []).slice(0, 4);
  const slots = [
    { box: "top:0;left:0", from: [22, 11], to: [38, 33] },
    { box: "top:0;right:0", from: [78, 11], to: [62, 33] },
    { box: "bottom:0;left:0", from: [22, 89], to: [38, 67] },
    { box: "bottom:0;right:0", from: [78, 89], to: [62, 67] },
  ];
  const lines = labels.map((_, i) => `<line x1="${slots[i]!.from[0]}" y1="${slots[i]!.from[1]}" x2="${slots[i]!.to[0]}" y2="${slots[i]!.to[1]}" stroke="${pal.deep}" stroke-opacity="0.6" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`).join("");
  const dots = labels.map((_, i) => `<span style="position:absolute;left:${slots[i]!.to[0]}%;top:${slots[i]!.to[1]}%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:${pal.deep}"></span>`).join("");
  const pills = labels
    .map((l, i) => `<span style="position:absolute;${slots[i]!.box};max-width:46%;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:7px 12px 7px 7px;border-radius:999px;background:${pal.deep};box-shadow:0 4px 10px ${hexToRgba(pal.ink, 0.16)};${sans};font-size:14px;font-weight:700;line-height:1.3;color:#FFFFFF;word-break:keep-all"><span style="flex:none;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#FFFFFF;color:${pal.deep};font-size:12px;font-weight:800">${i + 1}</span><span style="min-width:0">${esc(l)}</span></span>`)
    .join("");
  return (
    `<section data-pz-impact="illust-center" style="padding:32px 20px;background:${pal.face}"><div style="max-width:576px;margin:0 auto">` +
    (head ? `<div style="text-align:center;margin:0 0 16px">${head}</div>` : "") +
    `<div style="position:relative;width:100%;max-width:420px;margin:0 auto;aspect-ratio:1 / 1"><div style="position:absolute;left:8%;right:8%;top:8%;bottom:8%">${svg}</div>` +
    `<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%;display:block">${lines}</svg>${dots}${pills}</div>` +
    `</div></section>`
  );
}

export function illustHtml(s: ImpactSection, pal: ImpactPalette): string {
  if (IMPACT_BOOST_ENABLED) return illustBoostHtml(s, pal);
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
      // 제목에 키워드가 있으면 제목 기준, 없을 때만 본문 기준(본문의 곁가지 단어가 그림을 정하지 않게)
      const pick = pickIllustration(heading, used) ?? pickIllustration(body, used);
      if (pick) out.push({ at: i, layout: "side", id: pick.id, text: heading, body, labels: [] });
    } else if (s.type === "checklist") {
      const items = s.items.map((x) => x.trim()).filter(Boolean);
      const heading = (s.heading ?? "").trim();
      if (items.length < 3 || items.length > 4 || items.some((x) => x.length > CHIP_MAX) || heading.length > 24) return;
      // 체크리스트는 제목 자체가 개념 키워드일 때만(항목이 고민 나열이면 그림이 의미 없다)
      if (!pickIllustration(heading)) return;
      const pick = pickIllustration(heading, used);
      if (pick) out.push({ at: i, layout: "center", id: pick.id, text: heading, body: "", labels: items });
    }
  });
  return out;
}

/** 표시 규칙의 뒤쪽에서 부른다(임팩트 템플릿보다 먼저). 키워드가 매핑되는 구간만 일러스트 구간으로 바꾼다. 없으면 입력을 그대로 돌려준다 */
export function planIllustrations(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: { category?: string; style?: "solid" | "flat" | "line" | null },
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ id: IllustId; layout: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ id: IllustId; layout: string; at: number }> };
  if (!ILLUSTRATION_V1_ENABLED || sections.length < 6 || sections[0]!.type !== "hero") return none;
  const ys: number[] = [];
  let acc = 0;
  for (const s of sections) { ys.push(acc); acc += estimateSectionHeight(s); }
  const style = ctx.style ?? illustStyleFor(ctx.category);
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
