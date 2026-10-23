/**
 * 436차 1-3 — 유형 특화 섹션 5종(표시 전용 section type impact). 입력에 있는 데이터를 다른 방식으로 보여 줄 뿐 새 문구·수치가 없다.
 * 아키타입 레시피가 허용한 종류만, 입력 요건이 맞을 때만 만들어진다(아니면 입력 그대로).
 *
 *  종류       입력 요건                                              동작               적용 유형(레시피 specials)
 *  swatch     color_variation 옵션 ≥3, 색상값(#RRGGBB) 유효           섹션 앞에 칩 그리드  메이크업·패션·전자·생활·반려 등
 *  timeline   usage_steps 단계 3~6개                                  섹션을 세로 타임라인 스스로 교체(큰 번호 + 세로 선 + STEP 라벨)  스킨케어·헤어바디·이너·메이크업·식품
 *  chipwall   성분·원재료 목록 ≥4개(입력 ingredients)                 칩 월(앞 칩 강조)    스킨케어·헤어·이너·식품·반려
 *  specstrip  spec_table(슬롯 spec_table) 숫자 값 행 ≥3, 424 게이트 통과  큰 숫자 스트립 3~4칸  전자·잡화·생활
 *  sizebars   size_table 행 ≥3, 행마다 공통 측정 항목 숫자 파싱 가능     사이즈별 막대        패션
 * 값은 입력 그대로(막대 길이만 비율로 계산하고 값 글자는 원문). 라이브·export는 impactHtml(= specialHtml) 한 벌.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import type { Recipe } from "@/lib/archetype-recipes";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";
import { hexToRgba } from "@/lib/design-tokens";
import { v4TextOn } from "@/lib/palette-v4";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";

export type SpecialKind = "swatch" | "timeline" | "chipwall" | "specstrip" | "sizebars";
export const SPECIAL_KINDS: readonly SpecialKind[] = ["swatch", "timeline", "chipwall", "specstrip", "sizebars"];
export const isSpecialKind = (k: string): k is SpecialKind => (SPECIAL_KINDS as readonly string[]).includes(k);

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const sans = `font-family:${DETAIL_FONT_STACK.sans}`;

export function specialHtml(s: ImpactSection, pal: ImpactPalette): string {
  const head = (center = false) =>
    s.text ? `<p style="margin:0 0 24px;${center ? "text-align:center;" : ""}${title};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.3;color:${pal.ink};word-break:keep-all">${esc(s.text)}</p>` : "";
  if (s.kind === "swatch") {
    const chips = (s.stats ?? [])
      .map(
        (c) =>
          `<div style="flex:0 0 auto;width:84px;text-align:center"><div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:${esc(c.value)};box-shadow:inset 0 0 0 1px ${hexToRgba(pal.ink, 0.14)},0 6px 14px ${hexToRgba(pal.ink, 0.12)}"></div>` +
          `<p style="margin:10px 0 0;${sans};font-size:14px;font-weight:600;line-height:1.35;color:${pal.ink};word-break:keep-all">${esc(c.label)}</p></div>`,
      )
      .join("");
    return `<section data-pz-impact="swatch" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head()}<div style="display:flex;flex-wrap:wrap;gap:16px 12px">${chips}</div></div></section>`;
  }
  if (s.kind === "timeline") {
    const steps = s.labels ?? [];
    // 439차 — STEP 라벨 4.5:1(DESIGN_V4). 바탕은 흰 면 또는 v4 면 리듬의 따뜻한 중립 면(#F7F3EE) — 더 어두운 쪽 기준
    const stepLabel = v4TextOn(pal.accent, "#F7F3EE");
    const rows = steps
      .map((t, i) => {
        const last = i === steps.length - 1;
        return (
          `<div style="position:relative;padding:0 0 ${last ? 0 : 28}px 64px;min-height:44px">` +
          `<span style="position:absolute;left:0;top:0;width:44px;height:44px;border-radius:50%;background:${pal.deep};color:#FFFFFF;${title};font-size:20px;font-weight:800;line-height:44px;text-align:center">${i + 1}</span>` +
          (last ? "" : `<span aria-hidden="true" style="position:absolute;left:21px;top:48px;bottom:4px;width:2px;background:${hexToRgba(pal.deep, 0.28)}"></span>`) +
          `<p style="margin:0;${sans};font-size:11px;font-weight:700;letter-spacing:0.14em;color:${stepLabel}">STEP ${String(i + 1).padStart(2, "0")}</p>` +
          `<p style="margin:4px 0 0;${sans};font-size:16px;font-weight:600;line-height:1.6;color:${pal.ink};word-break:keep-all">${esc(t)}</p></div>`
        );
      })
      .join("");
    return `<section data-pz-impact="timeline" style="padding:48px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head()}${rows}</div></section>`;
  }
  if (s.kind === "chipwall") {
    const chips = (s.labels ?? [])
      .map((l, i) => {
        const big = i < 2;
        const mid = i >= 2 && i < 5;
        const bg = big ? pal.deep : mid ? pal.face : "#FFFFFF";
        const color = big ? "#FFFFFF" : pal.ink;
        const border = big ? "none" : `1px solid ${hexToRgba(pal.ink, mid ? 0.08 : 0.2)}`;
        return `<span style="display:inline-block;padding:${big ? "12px 20px" : mid ? "9px 16px" : "7px 13px"};border-radius:999px;background:${bg};border:${border};color:${color};${sans};font-size:${big ? 18 : mid ? 15 : 14}px;font-weight:${big ? 800 : 600};line-height:1.3;word-break:keep-all">${esc(l)}</span>`;
      })
      .join("");
    return `<section data-pz-impact="chipwall" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head()}<div style="display:flex;flex-wrap:wrap;gap:10px">${chips}</div></div></section>`;
  }
  if (s.kind === "specstrip") {
    const cells = (s.stats ?? [])
      .map((c, i) => {
        const m = /^(\D*?)(\d[\d,.]*)\s*(.*)$/.exec(c.value);
        const num = m ? m[2]! : c.value;
        // 숫자 앞 글자(예: "하이브리드 ANC")는 단위가 아니라 라벨 뒤에 덧붙인다(입력 글자 그대로)
        const unit = m ? (m[3] ?? "").trim() : "";
        const prefix = m ? (m[1] ?? "").trim() : "";
        const label = prefix ? `${c.label} · ${prefix}` : c.label;
        return (
          `<div style="flex:1 1 42%;min-width:0;box-sizing:border-box;padding:6px 8px 6px ${i % 2 === 0 ? 0 : 16}px">` +
          `<p style="margin:0;display:flex;align-items:baseline;gap:4px;${title};font-weight:900;letter-spacing:-0.03em;line-height:1;font-size:44px;color:${pal.accent};font-variant-numeric:tabular-nums"><span>${esc(num)}</span>${unit ? `<span style="font-size:17px;font-weight:700;letter-spacing:0;color:${pal.ink}">${esc(unit)}</span>` : ""}</p>` +
          `<p style="margin:8px 0 0;${sans};font-size:14px;font-weight:600;line-height:1.4;color:${hexToRgba(pal.ink, 0.75)};word-break:keep-all">${esc(label)}</p></div>`
        );
      })
      .join("");
    return `<section data-pz-impact="specstrip" style="padding:40px 24px;background:${pal.face}"><div style="max-width:576px;margin:0 auto">${head()}<div style="display:flex;flex-wrap:wrap;gap:18px 0">${cells}</div></div></section>`;
  }
  // sizebars
  const groups = (s.bars ?? [])
    .map((g) => {
      const max = Math.max(...g.rows.map((r) => r.v), 1);
      // 사이즈 간 차이가 보이도록 막대 길이는 최소값 기준(40~100%)으로 그린다. 값 글자는 입력 원문 그대로
      const min = Math.min(...g.rows.map((r) => r.v));
      const rows = g.rows
        .map(
          (r) =>
            `<div style="display:flex;align-items:center;gap:10px;margin-top:8px"><span style="flex:0 0 44px;${sans};font-size:14px;font-weight:700;color:${pal.ink}">${esc(r.size)}</span>` +
            `<span style="flex:1 1 0%;min-width:0;height:12px;border-radius:6px;background:${hexToRgba(pal.ink, 0.07)}"><span style="display:block;width:${max > min ? Math.round(40 + 60 * ((r.v - min) / (max - min))) : 70}%;height:100%;border-radius:6px;background:${pal.deep}"></span></span>` +
            `<span style="flex:0 0 52px;text-align:right;${sans};font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;color:${hexToRgba(pal.ink, 0.8)}">${esc(r.raw)}</span></div>`,
        )
        .join("");
      return `<div style="margin-top:20px"><p style="margin:0;${sans};font-size:15px;font-weight:800;color:${pal.deep}">${esc(g.metric)}</p>${rows}</div>`;
    })
    .join("");
  return `<section data-pz-impact="sizebars" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head()}${groups}</div></section>`;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
/** 성분·원재료 문자열을 항목으로(쉼표·가운뎃점·줄바꿈·번호) */
export function splitIngredients(raw: string): string[] {
  // 번호 목록("1. 가 2. 나")이면 번호로, 아니면 쉼표·가운뎃점·줄바꿈으로 나눈다
  const numbered = (raw.match(/\d+\s*[.)]\s*\S/g) ?? []).length >= 3;
  return (numbered ? raw.split(/\s*\d+\s*[.)]\s*/) : raw.split(/[,，、·\n]/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 20);
}
/** "총장 60 · 어깨너비 54" → {총장:60, 어깨너비:54} */
export function parseMeasures(text: string): Record<string, { v: number; raw: string }> {
  const out: Record<string, { v: number; raw: string }> = {};
  for (const m of text.matchAll(/([가-힣A-Za-z]+)\s*(\d+(?:\.\d+)?)/g)) if (!(m[1]! in out)) out[m[1]!] = { v: Number(m[2]), raw: m[2]! };
  return out;
}

export type SpecialCtx = { recipe: Recipe | null; facts: ClaimFacts };

/** 레시피가 허용하고 입력 요건이 맞는 특화 섹션을 끼운다(없으면 입력 그대로) */
export function planSpecials(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: SpecialCtx,
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ kind: SpecialKind; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ kind: SpecialKind; at: number }> };
  const allow = ctx.recipe?.specials;
  if (!allow || allow.length === 0 || sections[0]?.type !== "hero") return none;
  const placed: Array<{ kind: SpecialKind; at: number }> = [];
  const outS: DetailSection[] = [];
  const outI: number[] = [];
  const used = new Set<SpecialKind>();
  const impact = (sec: ImpactSection): DetailSection => sec as DetailSection;
  const pushSpecial = (kind: SpecialKind, sec: ImpactSection, src: number) => { placed.push({ kind, at: outS.length }); outS.push(impact(sec)); outI.push(src); used.add(kind); };
  // chipwall: 성분 목록이 ≥4개면 성분 섹션(ingredient_highlight) 뒤, 없으면 근거 단계 앞
  const ings = allow.includes("chipwall") ? splitIngredients(ctx.facts.source.ingredients) : [];
  const ingAfter = sections.findIndex((s) => s.type === "image_text" && s.slot === "ingredient_highlight");
  const chipAt = ings.length >= 4 ? (ingAfter >= 0 ? ingAfter + 1 : sections.findIndex((s, i) => i >= 3 && ["texture_feel", "stat_infographic", "how_it_works", "usage_steps", "spec_table"].includes((s as { slot?: string }).slot ?? s.type))) : -1;
  sections.forEach((s, i) => {
    if (chipAt === i && !used.has("chipwall")) {
      const heading = ingAfter >= 0 ? "" : "";
      pushSpecial("chipwall", { type: "impact", slot: "impact", kind: "chipwall", text: heading, labels: ings.slice(0, 12) }, sourceIndexes[i]!);
    }
    if (s.type === "color_variation" && allow.includes("swatch") && !used.has("swatch")) {
      const opts = (s.options ?? []).filter((o) => HEX.test(o.colorHex) && o.label.trim());
      if (opts.length >= 3) pushSpecial("swatch", { type: "impact", slot: "impact", kind: "swatch", text: (s.heading ?? "").trim(), stats: opts.slice(0, 8).map((o) => ({ label: o.label.trim(), value: o.colorHex })) }, sourceIndexes[i]!);
    }
    if (s.type === "spec_table" && s.slot === "spec_table" && allow.includes("specstrip") && !used.has("specstrip")) {
      const rows = (s.rows ?? [])
        .map((r) => ({ label: (r.label ?? "").trim(), value: (r.value ?? "").trim() }))
        .filter((r) => r.label && /\d/.test(r.value) && r.value.length <= 14 && !checkText(r.value, ctx.facts).bad);
      if (rows.length >= 3) pushSpecial("specstrip", { type: "impact", slot: "impact", kind: "specstrip", text: "", stats: rows.slice(0, 4) }, sourceIndexes[i]!);
    }
    if (s.type === "spec_table" && s.slot === "size_table" && allow.includes("sizebars") && !used.has("sizebars")) {
      const SIZE_LABEL = /^(XXS|XS|S|M|L|XL|XXL|[2-5]XL|FREE|F|\d{2,3})$/i;
      const rows = (s.rows ?? []).map((r) => ({ size: (r.label ?? "").trim(), m: parseMeasures(r.value ?? "") })).filter((r) => SIZE_LABEL.test(r.size) && Object.keys(r.m).length > 0);
      if (rows.length >= 3) {
        const common = Object.keys(rows[0]!.m).filter((k) => rows.every((r) => k in r.m)).slice(0, 3);
        if (common.length > 0) pushSpecial("sizebars", { type: "impact", slot: "impact", kind: "sizebars", text: "", bars: common.map((metric) => ({ metric, rows: rows.map((r) => ({ size: r.size, v: r.m[metric]!.v, raw: r.m[metric]!.raw })) })) }, sourceIndexes[i]!);
      }
    }
    if (s.type === "usage_steps" && allow.includes("timeline") && !used.has("timeline") && Array.isArray(s.steps) && s.steps.length >= 3 && s.steps.length <= 6) {
      pushSpecial("timeline", { type: "impact", slot: "impact", kind: "timeline", text: (s.heading ?? "").trim(), labels: s.steps.map((x) => x.trim()).filter(Boolean) }, sourceIndexes[i]!);
      return; // 타임라인이 사용 단계 섹션을 대신한다(문구 그대로)
    }
    outS.push(s);
    outI.push(sourceIndexes[i]!);
  });
  return placed.length ? { sections: outS, sourceIndexes: outI, placed } : none;
}
