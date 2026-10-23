/**
 * 439차 2-1·2-6 — 디자인 엔진 v4: 섹션 레이아웃 변주 + 후킹 구조(입력 기반 재배치만).
 *
 * 왜: 지금은 섹션 종류 1개 = 레이아웃 1개라 상품이 달라도 "같은 구조"로 보인다(말뭉치 16건이 모두 hero → 말풍선 → 스토리 → 체크 → 퀵포인트×3 …).
 * 그래서 섹션 계열마다 변형 3~5개를 코드로 두고, 페이지 시드(상품명+카테고리)와 mood로 결정적으로 고른다.
 *
 *  계열         변형(앞이 기본 선호, mood가 순서를 바꿈)                         원 섹션(문구 원문 그대로)
 *  benefits     bento · numcards · iconstrip · zigzag                         이어진 퀵포인트 카드 2~6장, 강조 박스(highlight_box, 색면 블록 제외)
 *  concern      bubbles · checkrows(기존) · stack · tiles2                     고민 말풍선(bubbles)·체크 행(checkrows) 임팩트, 사진 띠 없는 고민(target_persona)
 *  story        editorial · quote · linetime                                  브랜드 스토리(story) 임팩트
 *  spec         strip · grid · line                                           스펙 표(spectable·specstrip 임팩트, 사진 없는 spec_table)
 *  phototext    overlap · offset · arch · caption · collage(이웃 2개를 한 블록)   사진이 든 image_text(full) — 임팩트가 안 가져간 것
 *  touch        band                                                          페이지 40% 지점 구매 유도 접점(입력 가격 + 제품명)
 *  breather     motif                                                         정보 섹션 3연속을 끊는 모티프 면(글 없음)
 *
 * 선택 규칙: ① 입력 요건(항목 수·사진·글 길이)을 만족하는 변형만 ② mood 선호 순서를 시드로 회전 ③ 바로 앞 섹션과 같은 구조(계열.변형/종류) 금지
 * ④ 같은 변형 페이지당 ≤2. 요건을 만족하는 변형이 없으면 원래 섹션 그대로(현재 레이아웃 폴백).
 *
 * 후킹 구조(2-6) 우선순위 — 충돌 시 위가 이긴다(주석·보고서 기록):
 *  1) 405·409차 패션 첫 갤러리(착용컷) 히어로 바로 뒤 유지 → 2) v4 첫 3화면 규칙(① 히어로 ② 한눈에 보기 ③ 고민/결과 약속)
 *  → 3) 433차 스토리 순서·436차 레시피(나머지 구간 순서는 그대로). 첫 3화면 규칙은 이미 있는 블록을 앞으로 옮길 뿐 새 블록을 만들지 않는다.
 *  스크롤 리듬: 정보 섹션 3연속 금지(모티프 면 삽입, 페이지당 ≤3), 구매 유도 접점은 페이지 높이 40% 근처 1개(가격 입력이 있을 때만).
 *  하단 구매 카드(cta_price)는 가격 스트립·스티키 바·규정 문구 등 30여 곳이 참조해 이번 라운드에서 바꾸지 않았다.
 *
 * 마크업은 v4Html 한 벌(impactHtml 경유)을 라이브·export가 그대로 쓴다(패리티 0). 인라인 스타일 + flex·position·transform·border-radius·SVG·gradient만.
 */
import type { DetailSection, ImpactSection, V4Block } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import type { ProductImageOrigin } from "@/lib/image-origins";
import { designV4On } from "@/lib/design-v4";
import { hexToRgba, mixHex } from "@/lib/design-tokens";
import { v4Palette, type FaceRole, type V4Palette } from "@/lib/palette-v4";
import { motifHtml, motifSvg, planMotifs, type MotifColors, type MotifPlacement } from "@/lib/motifs";
import { EYEBROW_LABEL, SANS_FF, TITLE_FF, esc, ghostHtml, highlightKeyword, keywordCandidates, polishCardTitles, titleBlock, titlePresetFor, typeCss } from "@/lib/type-treatments";
import { splitSentences } from "@/lib/impact-boost";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";

export type V4Family = V4Block["family"];

/** 계열별 변형과 입력 요건 */
export const V4_VARIANTS: Record<V4Family, string[]> = {
  benefits: ["bento", "numcards", "iconstrip", "zigzag"],
  concern: ["bubbles", "checkrows", "stack", "tiles2"],
  story: ["editorial", "quote", "linetime"],
  spec: ["strip", "grid", "line"],
  phototext: ["overlap", "offset", "arch", "caption", "collage"],
  touch: ["band"],
  breather: ["motif"],
};

/** mood별 선호 순서(앞이 우선). 없는 mood는 기본 순서 */
const MOOD_PREF: Record<string, Partial<Record<V4Family, string[]>>> = {
  "minimal-luxe": { benefits: ["numcards", "iconstrip", "bento", "zigzag"], concern: ["tiles2", "checkrows", "stack", "bubbles"], story: ["editorial", "linetime", "quote"], spec: ["line", "strip", "grid"], phototext: ["offset", "caption", "arch", "overlap", "collage"] },
  clinic: { benefits: ["iconstrip", "bento", "numcards", "zigzag"], concern: ["checkrows", "tiles2", "bubbles", "stack"], story: ["linetime", "editorial", "quote"], spec: ["line", "grid", "strip"], phototext: ["overlap", "offset", "caption", "arch", "collage"] },
  natural: { benefits: ["zigzag", "bento", "iconstrip", "numcards"], concern: ["bubbles", "tiles2", "stack", "checkrows"], story: ["editorial", "quote", "linetime"], spec: ["grid", "line", "strip"], phototext: ["arch", "offset", "collage", "overlap", "caption"] },
  playful: { benefits: ["bento", "zigzag", "numcards", "iconstrip"], concern: ["bubbles", "stack", "tiles2", "checkrows"], story: ["quote", "editorial", "linetime"], spec: ["grid", "strip", "line"], phototext: ["arch", "collage", "overlap", "offset", "caption"] },
  street: { benefits: ["numcards", "bento", "iconstrip", "zigzag"], concern: ["stack", "tiles2", "checkrows", "bubbles"], story: ["quote", "linetime", "editorial"], spec: ["strip", "grid", "line"], phototext: ["caption", "overlap", "collage", "offset", "arch"] },
  warm: { benefits: ["bento", "zigzag", "iconstrip", "numcards"], concern: ["bubbles", "stack", "checkrows", "tiles2"], story: ["quote", "editorial", "linetime"], spec: ["grid", "strip", "line"], phototext: ["overlap", "arch", "offset", "collage", "caption"] },
};

/** 같은 변형 페이지당 상한 */
export const MAX_SAME_VARIANT = 2;
/** 정보 섹션 연속 상한(이 수에 닿으면 모티프 면을 끼운다)·페이지당 모티프 면 상한 */
export const INFO_RUN_MAX = 2;
export const MAX_BREATHERS = 3;
/** 구매 유도 접점 위치(페이지 높이 비율) */
export const TOUCH_AT = 0.4;

/** 문자열 → 32비트 시드(FNV-1a) */
export function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** mood 선호 순서를 시드로 회전(앞 3개 안에서) — 같은 mood라도 상품마다 첫 변형이 달라진다 */
export function variantOrder(family: V4Family, mood: string | null | undefined, seed: number): string[] {
  const pref = (mood && MOOD_PREF[mood]?.[family]) || V4_VARIANTS[family];
  const k = Math.min(3, pref.length);
  const r = seed % k;
  const head = pref.slice(0, k);
  return [...head.slice(r), ...head.slice(0, r), ...pref.slice(k)];
}

type Item = NonNullable<V4Block["items"]>[number];
const len = (s: string | undefined) => [...(s ?? "")].length;

/** 변형별 입력 요건 */
export function variantFits(family: V4Family, variant: string, d: { items: Item[]; quote?: string; body?: string; pairs?: number }): boolean {
  const n = d.items.length;
  const photos = d.items.filter((i) => i.img).length;
  switch (`${family}.${variant}`) {
    case "benefits.bento": return n >= 3 && n <= 5;
    case "benefits.numcards": return n >= 2 && n <= 5;
    case "benefits.iconstrip": return n >= 3 && n <= 6;
    case "benefits.zigzag": return n >= 2 && n <= 4 && photos >= 2;
    case "concern.bubbles": case "concern.checkrows": return n >= 2 && n <= 6;
    case "concern.stack": return n >= 3 && n <= 5 && d.items.every((i) => len(i.title) <= 40);
    case "concern.tiles2": return n >= 3 && n <= 6 && d.items.every((i) => len(i.title) <= 32);
    case "story.editorial": return Boolean(d.quote) || len(d.body) >= 40;
    case "story.quote": return Boolean(d.quote);
    case "story.linetime": return splitSentences(`${d.quote ?? ""} ${d.body ?? ""}`).length >= 3;
    case "spec.strip": return n >= 2 && n <= 4 && d.items.every((i) => len(i.body) <= 12 && len(i.title) <= 10);
    case "spec.grid": return n >= 2 && n <= 8 && d.items.every((i) => len(i.body) <= 40);
    case "spec.line": return n >= 1;
    case "phototext.overlap": case "phototext.offset": case "phototext.arch": case "phototext.caption": return n === 1 && photos === 1;
    case "phototext.collage": return n === 2 && photos === 2;
    default: return false;
  }
}

// ── 렌더 ──────────────────────────────────────────────────────────────────────
const faceBg = (b: V4Block, p: V4Palette): string => (b.face === "grad0" ? p.gradients[0] : b.face === "grad1" ? p.gradients[1] : p.faces[(b.face ?? "bgA") as FaceRole]);
const faceRole = (b: V4Block): FaceRole => (b.face === "grad0" || b.face === "grad1" ? "emphasis" : ((b.face ?? "bgA") as FaceRole));
const motifColors = (p: V4Palette): MotifColors => ({ a: p.tints[3], b: p.deep, c: p.secondary });

const NUM = (n: number) => String(n).padStart(2, "0");
const CHECK = (c: string, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="display:block"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const img = (url: string, alt: string, pos = "50% 45%", extra = "") => `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${pos};${extra}"/>`;

/** 제목(키워드 강조) */
function headingHtml(text: string, b: V4Block, p: V4Palette, style: "marker" | "color" = "marker"): string {
  if (!text) return "";
  return highlightKeyword(text, b.keywords ?? [], style, style === "marker" ? p.accent : p.deep).html;
}

function wrap(b: V4Block, p: V4Palette, inner: string, opts: { pad?: string; head?: string; label?: string } = {}): string {
  const role = faceRole(b);
  const on = p.onFace[role];
  const motifs = (b.motifs ?? []).map((m) => motifHtml(m as MotifPlacement, motifColors(p))).join("");
  const ghost = b.ghost ? ghostHtml(b.ghost, mixHex(p.faces[role] === "#FFFFFF" ? p.tints[0] : p.tints[1], p.accent, 0.12), 88, "tr") : "";
  const title = opts.head !== undefined ? titleBlock(b.preset ?? "number", opts.label ?? EYEBROW_LABEL[b.family] ?? "", b.no, opts.head, { ink: on.text, deep: on.strong, pillBg: p.deep, pillFg: "#FFFFFF" }) : "";
  return (
    `<section data-pz-impact="v4" data-pz-v4="${b.family}.${b.variant}" style="position:relative;padding:${opts.pad ?? "56px 24px"};background:${faceBg(b, p)}">` +
    motifs + ghost +
    `<div style="position:relative;z-index:1;max-width:576px;margin:0 auto">${title}${inner}</div></section>`
  );
}

function benefitsHtml(s: ImpactSection, b: V4Block, p: V4Palette, alt: string): string {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  if (b.variant === "bento") {
    const [first, ...rest] = items;
    const big =
      `<div style="flex:1 1 100%;min-width:0;box-sizing:border-box;position:relative;overflow:hidden;display:flex;align-items:stretch;gap:14px;min-height:180px;padding:22px;border-radius:24px;background:${p.tints[2]}">` +
      `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;justify-content:flex-end"><span aria-hidden="true" style="${TITLE_FF};font-size:44px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:${p.deep}">01</span>` +
      `<p style="margin:12px 0 0;${typeCss("card", p.ink, "font-size:20px")}">${esc(first!.title)}</p>` +
      (first!.body ? `<p style="margin:8px 0 0;${typeCss("small", mixHex(p.ink, "#FFFFFF", 0.12))}">${esc(first!.body)}</p>` : "") +
      `</div>` +
      (first!.img ? `<div style="flex:0 0 40%;min-width:0;border-radius:18px;overflow:hidden;background:${p.tints[1]};box-shadow:0 8px 20px ${hexToRgba(p.ink, 0.12)}">${img(first!.img.url, alt, first!.img.pos)}</div>` : "") +
      `</div>`;
    const faces = ["#FFFFFF", p.tints[0], mixHex(p.secondary, "#FFFFFF", 0.84), p.tints[1]];
    const small = rest
      .map((it, i) => {
        const bg = faces[i % faces.length]!;
        const right = i % 2 === 1;
        return (
          `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;display:flex;flex-direction:column;align-items:${right ? "flex-end" : "flex-start"};text-align:${right ? "right" : "left"};padding:18px;border-radius:20px;background:${bg};${bg === "#FFFFFF" ? `border:1px solid ${hexToRgba(p.ink, 0.1)};` : ""}">` +
          `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${i % 3 === 2 ? "10px" : "50%"};background:${p.deep};color:#FFFFFF;${SANS_FF};font-size:13px;font-weight:800">${NUM(i + 2)}</span>` +
          `<p style="margin:12px 0 0;${typeCss("card", p.ink, "font-size:16px")}">${esc(it.title)}</p>` +
          (it.body ? `<p style="margin:6px 0 0;${typeCss("small", mixHex(p.ink, "#FFFFFF", 0.18))}">${esc(it.body)}</p>` : "") +
          `</div>`
        );
      })
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${big}${small}</div>`, { head });
  }
  if (b.variant === "numcards") {
    const rows = items
      .map(
        (it, i) =>
          `<div style="position:relative;display:flex;align-items:flex-start;gap:16px;padding:20px 20px 20px 16px;margin-top:${i ? 12 : 0}px;border-radius:18px;background:#FFFFFF;border:1px solid ${hexToRgba(p.ink, 0.1)};box-shadow:0 6px 16px ${hexToRgba(p.ink, 0.06)}">` +
          `<span aria-hidden="true" data-pz-deco style="flex:none;width:64px;${TITLE_FF};font-size:52px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${p.tints[3]}">${NUM(i + 1)}</span>` +
          `<div style="flex:1 1 0%;min-width:0;padding-top:4px"><p style="margin:0;${typeCss("card", p.ink)}">${esc(it.title)}</p>` +
          (it.body ? `<p style="margin:6px 0 0;${typeCss("body", on.sub)}">${esc(it.body)}</p>` : "") +
          `</div></div>`,
      )
      .join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "iconstrip") {
    const strip = `<div aria-hidden="true" style="display:flex;gap:6px;margin:0 0 18px">${items.map((_, i) => `<span style="flex:1 1 0%;height:6px;border-radius:999px;background:${i === 0 ? p.deep : p.tints[2]}"></span>`).join("")}</div>`;
    const rows = items
      .map(
        (it, i) =>
          `<div style="display:flex;align-items:center;gap:14px;padding:16px 0;${i ? `border-top:1px solid ${hexToRgba(p.ink, 0.1)}` : ""}">` +
          `<span style="flex:none;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:${i % 2 ? p.tints[1] : p.deep}">${i % 2 ? `<span style="${SANS_FF};font-size:15px;font-weight:800;color:${p.deep}">${NUM(i + 1)}</span>` : CHECK("#FFFFFF", 20)}</span>` +
          `<div style="flex:1 1 0%;min-width:0"><p style="margin:0;${typeCss("card", p.ink, "font-size:16px")}">${esc(it.title)}</p>` +
          (it.body ? `<p style="margin:4px 0 0;${typeCss("small", on.sub)}">${esc(it.body)}</p>` : "") +
          `</div></div>`,
      )
      .join("");
    return wrap(b, p, strip + rows, { head });
  }
  // zigzag
  const rows = items
    .map((it, i) => {
      const right = i % 2 === 1;
      const media = it.img
        ? `<div style="flex:0 0 44%;min-width:0;aspect-ratio:1 / 1;border-radius:20px;overflow:hidden;background:${p.tints[1]}">${img(it.img.url, alt, it.img.pos)}</div>`
        : `<div aria-hidden="true" style="flex:0 0 44%;min-width:0;aspect-ratio:1 / 1;border-radius:20px;display:flex;align-items:center;justify-content:center;background:${p.tints[1]};${TITLE_FF};font-size:48px;font-weight:900;color:${p.deep}">${NUM(i + 1)}</div>`;
      return (
        `<div style="display:flex;flex-direction:${right ? "row-reverse" : "row"};align-items:center;gap:16px;margin-top:${i ? 20 : 0}px">${media}` +
        `<div style="flex:1 1 0%;min-width:0;text-align:${right ? "right" : "left"}"><p style="margin:0;${typeCss("label", p.deep)}">${NUM(i + 1)}</p>` +
        `<p style="margin:6px 0 0;${typeCss("card", p.ink)}">${esc(it.title)}</p>` +
        (it.body ? `<p style="margin:6px 0 0;${typeCss("small", on.sub)}">${esc(it.body)}</p>` : "") +
        `</div></div>`
      );
    })
    .join("");
  return wrap(b, p, rows, { head });
}

function concernHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  const items = b.items ?? [];
  const head = headingHtml(s.text, b, p);
  if (b.variant === "stack") {
    const tilt = [-1.5, 1.2, -0.6, 1.5, -1.0];
    const cards = items
      .map(
        (it, i) =>
          `<div style="position:relative;z-index:${items.length - i};display:flex;align-items:flex-start;gap:12px;box-sizing:border-box;margin:${i ? -4 : 0}px ${i % 2 ? 0 : 12}px 0 ${i % 2 ? 12 : 0}px;padding:18px 18px;border-radius:16px;background:#FFFFFF;border:1px solid ${hexToRgba(p.ink, 0.08)};box-shadow:0 10px 22px ${hexToRgba(p.ink, 0.1)};transform:rotate(${tilt[i % tilt.length]}deg)">` +
          `<span aria-hidden="true" style="flex:none;${TITLE_FF};font-size:24px;font-weight:900;line-height:0.8;color:${p.accent}">“</span>` +
          `<p style="flex:1 1 0%;min-width:0;margin:0;${typeCss("card", p.ink, "font-size:16px;font-weight:600")}">${esc(it.title)}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="padding:4px 4px 8px">${cards}</div>`, { head });
  }
  // tiles2
  const tiles = items
    .map(
      (it, i) =>
        `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;padding:18px 16px;border-radius:18px;background:${i % 3 === 1 ? mixHex(p.secondary, "#FFFFFF", 0.86) : p.tints[0]}">` +
        `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${p.deep}">${CHECK("#FFFFFF", 15)}</span>` +
        `<p style="margin:12px 0 0;${typeCss("small", p.ink, "font-size:15px;font-weight:600")}">${esc(it.title)}</p></div>`,
    )
    .join("");
  return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${tiles}</div>`, { head });
}

function storyHtml(s: ImpactSection, b: V4Block, p: V4Palette, alt: string): string {
  const on = p.onFace[faceRole(b)];
  const chip = s.chip ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${p.deep};${typeCss("label", "#FFFFFF", "letter-spacing:0.06em")}">${esc(s.chip)}</span>` : "";
  const photo = s.images?.[0];
  const photoHtml = photo ? `<div style="margin:28px 0 0;aspect-ratio:4 / 3;overflow:hidden;border-radius:20px;box-shadow:0 10px 24px ${hexToRgba(p.ink, 0.12)}">${img(photo.url, alt, photo.pos)}</div>` : "";
  const head = headingHtml(s.text, b, p, "color");
  if (b.variant === "editorial") {
    const inner =
      `<div style="display:flex;gap:14px;align-items:flex-start"><span aria-hidden="true" data-pz-deco style="flex:0 0 48px;${TITLE_FF};font-size:96px;font-weight:900;line-height:0.75;color:${p.tints[3]}">“</span>` +
      `<div style="flex:1 1 0%;min-width:0">${chip}` +
      (head ? `<p style="margin:${chip ? 14 : 0}px 0 0;${typeCss("card", on.strong, "font-size:18px")}">${head}</p>` : "") +
      (s.quote ? `<p style="margin:14px 0 0;${typeCss("title", on.text, "font-size:22px")}">${esc(s.quote)}</p>` : "") +
      (s.body ? `<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid ${hexToRgba(p.ink, 0.12)};${typeCss("body", on.sub, "white-space:pre-line")}">${esc(s.body)}</p>` : "") +
      `</div></div>${photoHtml}`;
    return wrap(b, p, inner, { head: "" });
  }
  if (b.variant === "quote") {
    const inner =
      `<div style="text-align:center">${chip}` +
      (head ? `<p style="margin:${chip ? 14 : 0}px 0 0;${typeCss("card", on.strong)}">${head}</p>` : "") +
      `<p style="margin:18px auto 0;max-width:20em;${typeCss("display", on.text, "font-size:26px")}">“${esc(s.quote ?? "")}”</p></div>` +
      (s.body ? `<p style="margin:24px 0 0;box-sizing:border-box;padding:20px;border-radius:18px;background:#FFFFFF;${typeCss("body", p.ink, "white-space:pre-line")}">${esc(s.body)}</p>` : "") +
      photoHtml;
    return wrap(b, p, inner, { head: "" });
  }
  // linetime: 문장마다 마디(번호 + 세로 선)
  const sentences = splitSentences(`${s.quote ?? ""} ${s.body ?? ""}`.trim());
  const nodes = sentences
    .map(
      (t, i) =>
        `<div style="position:relative;padding:0 0 ${i === sentences.length - 1 ? 0 : 22}px 34px">` +
        (i < sentences.length - 1 ? `<span aria-hidden="true" style="position:absolute;left:9px;top:22px;bottom:0;width:2px;background:${p.tints[2]}"></span>` : "") +
        `<span aria-hidden="true" style="position:absolute;left:0;top:2px;width:20px;height:20px;border-radius:50%;background:${i === 0 ? p.deep : "#FFFFFF"};border:2px solid ${p.deep};box-sizing:border-box"></span>` +
        `<p style="margin:0;${typeCss("label", on.strong)}">${NUM(i + 1)}</p>` +
        `<p style="margin:6px 0 0;${i === 0 ? typeCss("card", on.text, "font-size:18px") : typeCss("body", on.text)}">${esc(t)}</p></div>`,
    )
    .join("");
  return wrap(b, p, `${chip ? `<div style="margin:0 0 14px">${chip}</div>` : ""}${head ? `<p style="margin:0 0 22px;${typeCss("title", on.text)}">${head}</p>` : ""}${nodes}${photoHtml}`, { head: "" });
}

function specHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p, "color");
  if (b.variant === "strip") {
    const cells = items
      .map(
        (it, i) =>
          `<div style="flex:1 1 calc(50% - 1px);min-width:120px;box-sizing:border-box;padding:18px 12px;text-align:center;${i ? `border-left:1px solid ${hexToRgba(p.ink, 0.1)}` : ""}">` +
          `<p style="margin:0;${TITLE_FF};font-size:24px;font-weight:900;letter-spacing:-0.03em;line-height:1.15;color:${on.strong};word-break:keep-all">${esc(it.body ?? "")}</p>` +
          `<p style="margin:6px 0 0;${typeCss("label", on.sub, "letter-spacing:0.04em")}">${esc(it.title)}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;border-radius:20px;background:#FFFFFF;border:1px solid ${hexToRgba(p.ink, 0.1)}">${cells}</div>`, { head });
  }
  if (b.variant === "grid") {
    const cards = items
      .map(
        (it) =>
          `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;padding:16px;border-radius:16px;background:#FFFFFF;border:1px solid ${hexToRgba(p.ink, 0.08)}">` +
          `<p style="margin:0;${typeCss("label", p.deep, "letter-spacing:0.04em")}">${esc(it.title)}</p>` +
          `<p style="margin:8px 0 0;${typeCss("small", p.ink, "font-size:15px;font-weight:600;white-space:pre-line")}">${esc(it.body ?? "")}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  // line
  const rows = items
    .map(
      (it) =>
        `<div style="display:flex;gap:12px;padding:14px 2px;border-bottom:1px solid ${hexToRgba(p.ink, 0.12)}">` +
        `<span style="flex:0 0 34%;min-width:0;${typeCss("small", on.strong, "font-weight:700")}">${esc(it.title)}</span>` +
        `<span style="flex:1 1 0%;min-width:0;${typeCss("body", on.text, "white-space:pre-line")}">${esc(it.body ?? "")}</span></div>`,
    )
    .join("");
  return wrap(b, p, `<div style="border-top:2px solid ${p.ink}">${rows}</div>`, { head });
}

function phototextHtml(b: V4Block, p: V4Palette, alt: string): string {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const it = items[0]!;
  const title = (t: string, size = 22) => `<p style="margin:0;${typeCss("title", p.ink, `font-size:${size}px`)}">${headingHtml(t, b, p)}</p>`;
  const body = (t: string | undefined) => (t ? `<p style="margin:10px 0 0;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(t)}</p>` : "");
  const label = `<p style="margin:0 0 8px;${typeCss("label", on.strong)}">${EYEBROW_LABEL.phototext} ${NUM(b.no)}</p>`;
  if (b.variant === "overlap") {
    return wrap(b, p,
      `<div style="aspect-ratio:4 / 5;border-radius:24px;overflow:hidden;background:${p.tints[1]}">${img(it.img!.url, alt, it.img!.pos)}</div>` +
      `<div style="position:relative;z-index:2;margin:-24px 14px 0;box-sizing:border-box;padding:22px 20px;border-radius:20px;background:#FFFFFF;box-shadow:0 12px 28px ${hexToRgba(p.ink, 0.14)}">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "offset") {
    return wrap(b, p,
      `<div style="position:relative;padding:0 16px 16px 0"><div aria-hidden="true" style="position:absolute;right:0;bottom:0;width:86%;height:86%;border-radius:22px;background:${p.tints[2]}"></div>` +
      `<div style="position:relative;aspect-ratio:4 / 4.6;border-radius:22px;overflow:hidden;background:${p.tints[1]}">${img(it.img!.url, alt, it.img!.pos)}</div></div>` +
      `<div style="margin-top:24px">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "arch") {
    return wrap(b, p,
      `<div style="width:78%;margin:0 auto;aspect-ratio:3 / 4;border-radius:999px 999px 24px 24px;overflow:hidden;background:${p.tints[1]};box-shadow:0 14px 30px ${hexToRgba(p.ink, 0.12)}">${img(it.img!.url, alt, it.img!.pos)}</div>` +
      `<div style="margin-top:26px;text-align:center">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "caption") {
    return wrap(b, p,
      `<div style="margin:0 -24px;aspect-ratio:4 / 5;overflow:hidden;background:${p.tints[1]}">${img(it.img!.url, alt, it.img!.pos)}</div>` +
      `<div style="display:flex;gap:14px;margin-top:22px;padding-top:18px;border-top:2px solid ${p.ink}"><div style="flex:0 0 auto;${TITLE_FF};font-size:28px;font-weight:900;line-height:1;color:${p.deep}">${NUM(b.no)}</div><div style="flex:1 1 0%;min-width:0">${title(it.title, 20)}${body(it.body)}</div></div>`,
      { pad: "0 24px 56px" });
  }
  // collage: 사진 2장 비대칭 + 항목 2개
  const [a, c] = items;
  return wrap(b, p,
    `<div style="position:relative;height:0;padding-bottom:96%">` +
    `<div style="position:absolute;left:0;top:0;width:62%;height:86%;border-radius:22px;overflow:hidden;background:${p.tints[1]}">${img(a!.img!.url, alt, a!.img!.pos)}</div>` +
    `<div style="position:absolute;right:0;bottom:0;width:44%;height:58%;border-radius:22px;overflow:hidden;background:${p.tints[2]};border:6px solid ${faceBg(b, p).startsWith("#") ? faceBg(b, p) : "#FFFFFF"};box-sizing:border-box">${img(c!.img!.url, alt, c!.img!.pos)}</div></div>` +
    [a!, c!].map((x, i) => `<div style="display:flex;gap:12px;margin-top:${i ? 18 : 24}px"><span style="flex:none;${typeCss("label", on.strong)}">${NUM(i + 1)}</span><div style="flex:1 1 0%;min-width:0">${title(x.title, 19)}${body(x.body)}</div></div>`).join(""));
}

function touchHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  return wrap(b, p,
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;box-sizing:border-box;padding:20px 22px;border-radius:22px;background:#FFFFFF;box-shadow:0 10px 24px ${hexToRgba(p.ink, 0.1)}">` +
    `<p style="flex:1 1 0%;min-width:0;margin:0;${typeCss("card", p.ink, "font-size:16px")}">${esc(s.text)}</p>` +
    `<p style="flex:none;margin:0;${TITLE_FF};font-size:24px;font-weight:900;letter-spacing:-0.02em;line-height:1.2;color:${p.onFace.card.strong};white-space:nowrap;word-break:keep-all">${esc(b.price ?? "")}</p></div>`,
    { pad: "48px 24px" });
}

/** v4 블록 마크업(impactHtml이 부른다 — mood·고아·사진 실패 폴백은 impactHtml이 이어서 적용) */
export function v4Html(s: ImpactSection, pal: ImpactPalette, alt: string): string {
  const b = s.v4;
  if (!b) return "";
  const p = v4Palette({ ink: pal.ink, accent: pal.accent, deep: pal.deep }, s.mood);
  let html: string;
  switch (b.family) {
    case "benefits": html = benefitsHtml(s, b, p, alt); break;
    case "concern": html = concernHtml(s, b, p); break;
    case "story": html = storyHtml(s, b, p, alt); break;
    case "spec": html = specHtml(s, b, p); break;
    case "phototext": html = phototextHtml(b, p, alt); break;
    case "touch": html = touchHtml(s, b, p); break;
    default: html = wrap({ ...b, motifs: [] }, p, `<div aria-hidden="true" style="display:flex;align-items:center;justify-content:center;gap:18px">${motifSvg("wave", 96, 20, motifColors(p), b.no)}${motifSvg("sparkle", 18, 18, motifColors(p))}${motifSvg("wave", 96, 20, motifColors(p), b.no + 1)}</div>`, { pad: "32px 24px" });
  }
  return polishCardTitles(html);
}

// ── 계획 ──────────────────────────────────────────────────────────────────────
export type V4Ctx = {
  mood: string | null;
  seedKey: string;
  imageUrls: readonly string[];
  origins?: ReadonlyArray<ProductImageOrigin | undefined>;
  facts: ClaimFacts;
  category?: string;
  /** 섹션 높이 추정(impact-templates.estimateSectionHeight — 순환 import를 피해 주입) */
  height: (s: DetailSection) => number;
};

export type V4Placed = { family: V4Family; variant: string; at: number; from: string };
export type V4Plan = { sections: DetailSection[]; sourceIndexes: number[]; placed: V4Placed[]; moved: string[]; inserted: string[] };

const okUrl = (u: string | undefined): string => (u && (/^(https?:)?\/\//i.test(u) || u.startsWith("/")) ? u : "");
const isQP = (s: DetailSection | undefined): boolean => s?.type === "image_text" && s.slot === "quick_points" && (s.layout === "compact" || s.layout === "text_only");

/** 구조 키(연속 동일 구조 판단) */
export function structureKey(s: DetailSection): string {
  if (s.type === "impact") return s.kind === "v4" && s.v4 ? `${s.v4.family}.${s.v4.variant}` : s.kind === "bubbles" ? "concern.bubbles" : s.kind === "checkrows" ? "concern.checkrows" : `impact.${s.kind}`;
  if (s.type === "image_text") return `image_text.${s.layout ?? "full"}`;
  return s.type;
}

const INFO_KEYS = /^(spec\.|impact\.(spectable|specstrip|faqcards|note|sizebars|chipwall)$|spec_table$|faq$|caution$)/;
export const isInfoSection = (s: DetailSection): boolean => INFO_KEYS.test(structureKey(s));

type Cand = { family: V4Family; at: number; len: number; text: string; items: Item[]; quote?: string; body?: string; chip?: string; images?: ImpactSection["images"]; origin?: ImpactSection["origin"]; keepKind?: "bubbles" | "checkrows"; from: string };

function findCandidates(secs: DetailSection[], ctx: V4Ctx): Cand[] {
  const out: Cand[] = [];
  const urlOf = (idx: unknown): string => (typeof idx === "number" && (ctx.origins?.[idx] ?? "original") !== "ai-lifestyle" ? okUrl(ctx.imageUrls[idx]) : "");
  for (let i = 1; i < secs.length; i += 1) {
    const s = secs[i]!;
    // benefits: 이어진 퀵포인트 2~6장
    if (isQP(s) && !isQP(secs[i - 1])) {
      let j = i;
      while (j < secs.length && isQP(secs[j]) && j - i < 6) j += 1;
      const run = secs.slice(i, j) as Extract<DetailSection, { type: "image_text" }>[];
      const items = run.map((t) => ({ title: t.heading.trim(), ...(t.body?.trim() ? { body: t.body.trim() } : {}), ...(t.layout === "compact" && !t.noPhoto && urlOf(t.imageIndex) ? { img: { url: urlOf(t.imageIndex), pos: "50% 45%" } } : {}) }));
      if (run.length >= 2 && items.every((x) => x.title)) out.push({ family: "benefits", at: i, len: run.length, text: "", items, from: `quick_points×${run.length}` });
      i = j - 1;
      continue;
    }
    if (s.type === "highlight_box" && !s.boldBlock && s.cards.length >= 2 && s.cards.length <= 4) {
      const items = s.cards.map((c) => ({ title: c.title.trim(), ...(c.body?.trim() ? { body: c.body.trim() } : {}) })).filter((c) => c.title);
      if (items.length >= 2) out.push({ family: "benefits", at: i, len: 1, text: (s.heading ?? "").trim(), items, from: "highlight_box" });
      continue;
    }
    if (s.type === "impact" && (s.kind === "bubbles" || s.kind === "checkrows") && (s.labels ?? []).length >= 2) {
      out.push({ family: "concern", at: i, len: 1, text: s.text, items: (s.labels ?? []).map((l) => ({ title: l })), keepKind: s.kind, ...(s.origin ? { origin: s.origin } : {}), from: s.kind });
      continue;
    }
    if (s.type === "impact" && s.kind === "story" && (s.quote || s.body)) {
      out.push({ family: "story", at: i, len: 1, text: s.text, items: [], ...(s.quote ? { quote: s.quote } : {}), ...(s.body ? { body: s.body } : {}), ...(s.chip ? { chip: s.chip } : {}), ...(s.images ? { images: s.images } : {}), from: "story" });
      continue;
    }
    if (s.type === "impact" && (s.kind === "spectable" || s.kind === "specstrip") && (s.stats ?? []).length >= 1) {
      out.push({ family: "spec", at: i, len: 1, text: s.text, items: (s.stats ?? []).map((r) => ({ title: r.label, body: r.value })), ...(s.origin ? { origin: s.origin } : {}), from: s.kind });
      continue;
    }
    if (s.type === "image_text" && (s.layout === "full" || s.layout === undefined) && !s.imageCrop && !s.sceneCrop && s.heading.trim() && s.heading.trim().length <= 30 && urlOf(s.imageIndex)) {
      out.push({ family: "phototext", at: i, len: 1, text: s.heading.trim(), items: [{ title: s.heading.trim(), ...(s.body?.trim() ? { body: s.body.trim() } : {}), img: { url: urlOf(s.imageIndex), pos: "50% 45%" } }], origin: { type: "image_text", slot: s.slot }, from: `image_text.${s.slot}` });
    }
  }
  return out;
}

/** 첫 3화면 규칙의 "한눈에 보기" 점수(길이·수치 포함·키워드 일치) */
export function glanceScore(c: { items: Item[] }, keywords: readonly string[]): number {
  const n = c.items.length;
  let sc = n >= 3 && n <= 4 ? 3 : n === 2 || n === 5 ? 1 : 0;
  const avg = c.items.reduce((a, x) => a + len(x.title), 0) / Math.max(1, n);
  sc += avg <= 14 ? 2 : avg <= 20 ? 1 : 0;
  sc += Math.min(2, c.items.filter((x) => /\d/.test(x.title)).length);
  sc += Math.min(2, c.items.filter((x) => keywords.some((k) => x.title.includes(k))).length);
  return sc;
}

/**
 * 표시 규칙 마지막 단계(히어로 계획 직전). DESIGN_V4가 꺼져 있거나 히어로가 없으면 입력 그대로.
 * 섹션 객체는 바꾸지 않고(새 객체), 문구는 원 섹션 그대로 옮긴다.
 */
export function planV4(sections: DetailSection[], sourceIndexes: number[], ctx: V4Ctx): V4Plan {
  const none: V4Plan = { sections, sourceIndexes, placed: [], moved: [], inserted: [] };
  if (!designV4On() || sections[0]?.type !== "hero" || sections.length < 5) return none;
  const seed = seedOf(ctx.seedKey);
  const keywords = keywordCandidates({ keyFeatures: ctx.facts.source.keyFeatures, productName: ctx.facts.productName, numbers: [] }).filter((k) => !checkText(k, ctx.facts).bad);
  const cands = findCandidates(sections, ctx);
  const byAt = new Map(cands.map((c) => [c.at, c]));
  const counts = new Map<string, number>();
  const outS: DetailSection[] = [];
  const outI: number[] = [];
  const placed: V4Placed[] = [];
  let no = 0;
  const faceCycle: NonNullable<V4Block["face"]>[] = ["bgA", "emphasis", "bgB", "grad0", "bgA", "grad1"];
  let faceIdx = seed % faceCycle.length;
  for (let i = 0; i < sections.length; i += 1) {
    const c = byAt.get(i);
    const prevKey = outS.length ? structureKey(outS[outS.length - 1]!) : "";
    if (!c) { outS.push(sections[i]!); outI.push(sourceIndexes[i]!); continue; }
    // collage: 이웃한 사진 카드 2개
    let cc = c;
    let consumed = c.len;
    let pairWith = false;
    const next = byAt.get(i + 1);
    if (c.family === "phototext" && next?.family === "phototext") {
      const pair = { ...c, items: [...c.items, ...next.items], from: `${c.from}+${next.from}` };
      if (variantOrder("phototext", ctx.mood, seed + i).indexOf("collage") <= 2 && (counts.get("phototext.collage") ?? 0) < 1) { cc = pair; consumed = 2; pairWith = true; }
    }
    // 페이지 안에서 덜 쓴 변형을 먼저(같은 순위면 mood·시드 순서) — 같은 모양이 반복되지 않게
    const order0 = variantOrder(cc.family, ctx.mood, seed + i * 7);
    const order = [...order0].sort((a, b) => (counts.get(`${cc.family}.${a}`) ?? 0) - (counts.get(`${cc.family}.${b}`) ?? 0) || order0.indexOf(a) - order0.indexOf(b));
    const variant = order.find((v) => variantFits(cc.family, v, cc) && `${cc.family}.${v}` !== prevKey && (counts.get(`${cc.family}.${v}`) ?? 0) < MAX_SAME_VARIANT && (pairWith ? v === "collage" : v !== "collage"));
    if (!variant) {
      for (let k = 0; k < c.len; k += 1) { outS.push(sections[i + k]!); outI.push(sourceIndexes[i + k]!); }
      i += c.len - 1;
      continue;
    }
    counts.set(`${cc.family}.${variant}`, (counts.get(`${cc.family}.${variant}`) ?? 0) + 1);
    // 기존 종류(말풍선·체크 행)를 고르면 원 블록 그대로
    if (cc.keepKind && variant === cc.keepKind) { outS.push(sections[i]!); outI.push(sourceIndexes[i]!); continue; }
    // 다른 기존 종류(말풍선 ↔ 체크 행)로 바꾸는 경우: 그 종류의 임팩트 블록으로(문구 그대로)
    if (cc.keepKind && (variant === "bubbles" || variant === "checkrows")) {
      const conv: ImpactSection = { type: "impact", slot: "impact", kind: variant, text: cc.text, labels: cc.items.map((x) => x.title), ...(cc.origin ? { origin: cc.origin } : {}), ...(ctx.mood ? { mood: ctx.mood } : {}) };
      placed.push({ family: "concern", variant, at: outS.length, from: cc.from });
      outS.push(conv as DetailSection);
      outI.push(sourceIndexes[i]!);
      continue;
    }
    no += 1;
    const face = cc.family === "phototext" && variant === "caption" ? "bgA" : faceCycle[faceIdx++ % faceCycle.length]!;
    const block: V4Block = {
      family: cc.family, variant, no, items: cc.items, face, keywords: keywords.slice(0, 12), preset: titlePresetFor(ctx.mood),
      ...(cc.family === "benefits" && variant !== "bento" && variant !== "numcards" ? { ghost: String(no).padStart(2, "0") } : {}),
    };
    const sec: ImpactSection = {
      type: "impact", slot: "impact", kind: "v4", text: cc.text, v4: block,
      ...(cc.quote ? { quote: cc.quote } : {}), ...(cc.body ? { body: cc.body } : {}), ...(cc.chip ? { chip: cc.chip } : {}), ...(cc.images ? { images: cc.images } : {}),
      ...(cc.origin ? { origin: cc.origin } : {}), ...(cc.family === "spec" ? { stats: cc.items.map((x) => ({ label: x.title, value: x.body ?? "" })) } : {}),
      ...(ctx.mood ? { mood: ctx.mood } : {}),
    };
    placed.push({ family: cc.family, variant, at: outS.length, from: cc.from });
    outS.push(sec as DetailSection);
    outI.push(sourceIndexes[i]!);
    i += consumed - 1;
  }
  const hooked = applyHookStructure(outS, outI, placed, keywords, ctx);
  const rhythm = applyRhythm(hooked.sections, hooked.sourceIndexes, ctx, seed);
  const withMotifs = assignMotifs(assignFaces(rhythm.sections, seed), ctx.mood, seed);
  const finalPlaced: V4Placed[] = [];
  withMotifs.forEach((s, at) => { if (s.type === "impact" && s.kind === "v4" && s.v4) finalPlaced.push({ family: s.v4.family, variant: s.v4.variant, at, from: "" }); });
  return { sections: withMotifs, sourceIndexes: rhythm.sourceIndexes, placed: finalPlaced, moved: hooked.moved, inserted: rhythm.inserted };
}

/** 첫 3화면: ① 히어로(+패션 첫 갤러리) ② 한눈에 보기(점수 최고 benefits) ③ 고민(concern 계열) — 이미 있는 블록을 앞으로 옮긴다 */
function applyHookStructure(secs: DetailSection[], idx: number[], placed: V4Placed[], keywords: readonly string[], ctx: V4Ctx): { sections: DetailSection[]; sourceIndexes: number[]; moved: string[] } {
  const S = [...secs];
  const I = [...idx];
  const moved: string[] = [];
  let at = 1;
  // 405·409차: 패션 첫 갤러리가 히어로 바로 뒤면 그 뒤부터
  if (S[1]?.type === "gallery") at = 2;
  const benefitsAt = S.map((s, i) => ({ s, i })).filter(({ s }) => s.type === "impact" && s.kind === "v4" && s.v4?.family === "benefits");
  if (benefitsAt.length) {
    const itemsOf = (s: DetailSection): Item[] => (s.type === "impact" ? s.v4?.items ?? [] : []);
    const best = benefitsAt.reduce((a, b) => (glanceScore({ items: itemsOf(b.s) }, keywords) > glanceScore({ items: itemsOf(a.s) }, keywords) ? b : a));
    if (best.i !== at && best.i > at) {
      const [s] = S.splice(best.i, 1);
      const [k] = I.splice(best.i, 1);
      S.splice(at, 0, s!);
      I.splice(at, 0, k!);
      moved.push(`한눈에 보기 ${best.i}→${at}`);
    }
    if (S[at]?.type === "impact") { const sec = S[at] as ImpactSection; S[at] = { ...sec, v4: { ...sec.v4!, glance: true } } as DetailSection; }
    at += 1;
  }
  const isConcern = (s: DetailSection) => (s.type === "impact" && (s.kind === "bubbles" || s.kind === "checkrows" || (s.kind === "v4" && s.v4?.family === "concern"))) || s.type === "target_persona";
  const ci = S.findIndex((s, i) => i >= at && i <= at + 6 && isConcern(s));
  if (ci > at) {
    const [s] = S.splice(ci, 1);
    const [k] = I.splice(ci, 1);
    S.splice(at, 0, s!);
    I.splice(at, 0, k!);
    moved.push(`고민 ${ci}→${at}`);
  }
  void placed; void ctx;
  return { sections: S, sourceIndexes: I, moved };
}

/** 정보 섹션 3연속 금지(모티프 면) + 40% 지점 구매 유도 접점(가격 입력이 있을 때) */
function applyRhythm(secs: DetailSection[], idx: number[], ctx: V4Ctx, seed: number): { sections: DetailSection[]; sourceIndexes: number[]; inserted: string[] } {
  const S: DetailSection[] = [];
  const I: number[] = [];
  const inserted: string[] = [];
  let run = 0;
  let breathers = 0;
  const mk = (family: "breather" | "touch", extra: Partial<ImpactSection> = {}, b: Partial<V4Block> = {}): DetailSection =>
    ({ type: "impact", slot: "impact", kind: "v4", text: "", ...(ctx.mood ? { mood: ctx.mood } : {}), ...extra, v4: { family, variant: family === "touch" ? "band" : "motif", no: 0, face: family === "touch" ? "grad0" : "bgA", ...b } }) as DetailSection;
  secs.forEach((s, i) => {
    const info = isInfoSection(s);
    // 같은 구조(임팩트 종류)가 바로 이어지면(예: 참고 카드 둘) 사이에 모티프 면 — 연속 동일 구조 0
    const prev = S[S.length - 1];
    const twin = prev && prev.type === "impact" && s.type === "impact" && structureKey(prev) === structureKey(s);
    if (twin && breathers < MAX_BREATHERS) {
      S.push(mk("breather"));
      I.push(idx[i]!);
      inserted.push(`모티프 면(같은 구조 사이) @${S.length - 1}`);
      breathers += 1;
      run = 0;
    }
    if (info && run >= INFO_RUN_MAX && breathers < MAX_BREATHERS) {
      S.push(mk("breather"));
      I.push(idx[i]!);
      inserted.push(`모티프 면 @${S.length - 1}`);
      breathers += 1;
      run = 0;
    }
    run = info ? run + 1 : 0;
    S.push(s);
    I.push(idx[i]!);
  });
  // 구매 유도 접점: 입력 가격(cta_price.price)이 있을 때 40% 지점 근처, 히어로·접점·모티프 면 옆이 아닌 경계.
  // 어두운 면(색면 강조 박스·일러스트 배너) 둘 사이에는 넣지 않는다 — 밝은 띠가 끼면 명암 반전이 2회 늘어 428 예산(≤6)을 넘긴다(린트 3회전, DOM 지표)
  const cta = S.find((s) => s.type === "cta_price") as Extract<DetailSection, { type: "cta_price" }> | undefined;
  const price = cta && typeof cta.price === "number" && cta.price > 0 ? `${cta.price.toLocaleString("ko-KR")}원` : "";
  if (price && ctx.facts.productName.trim()) {
    const hs = S.map((s) => ctx.height(s));
    const total = hs.reduce((a, b) => a + b, 0);
    let y = 0;
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < S.length; k += 1) {
      const d = Math.abs(y - total * TOUCH_AT);
      const prev = S[k - 1];
      const ok = k >= 3 && !(prev?.type === "impact" && prev.kind === "v4" && (prev.v4?.family === "breather")) && !isQP(prev) && !isQP(S[k]) && S[k]?.type !== "cta_price" && !(isDarkFace(prev) && isDarkFace(S[k]));
      if (ok && d < bestD) { bestD = d; best = k; }
      y += hs[k]!;
    }
    if (best > 0) {
      S.splice(best, 0, mk("touch", { text: ctx.facts.productName.trim() }, { price }));
      I.splice(best, 0, I[best - 1]!);
      inserted.push(`구매 유도 접점 @${best}`);
    }
  }
  void seed;
  return { sections: S, sourceIndexes: I, inserted };
}

/** 늘 어두운 면으로 그려지는 섹션(색면 강조 박스·일러스트 배너) — 접점 위치 고를 때만 쓴다 */
const isDarkFace = (s: DetailSection | undefined): boolean => !!s && (s.type === "illustration_banner" || (s.type === "highlight_box" && !!s.boldBlock));

/** 임팩트 종류별 섹션 바탕(템플릿 마크업 기준): 색 면(틴트·파스텔)인 종류. 나머지 임팩트는 흰 바탕 */
const TINT_KINDS = new Set(["faqcards", "proof", "specstrip", "story", "textboost", "split"]);
type FaceClass = "white" | "tint" | "unknown";
function faceClass(s: DetailSection | undefined): FaceClass {
  if (!s || s.type !== "impact") return "unknown";
  if (s.kind === "v4" && s.v4) return s.v4.face === "bgA" || s.v4.face === "card" || !s.v4.face ? "white" : "tint";
  return TINT_KINDS.has(s.kind) || s.faceTone === "warm" ? "tint" : "white";
}

/**
 * 면 리듬(린트 R2 1회차 수정): v4 블록 바탕을 이웃과 엇갈리게 — 앞이나 뒤가 흰 면이면 색 면(강조 틴트·따뜻한 중립·그라데이션 순환),
 * 앞이 색 면이면 흰 면. 흰 면이 3개 이어지는 "평평한 스크롤"을 줄인다. 반전(어두운) 면은 쓰지 않아 428 명암 반전 예산은 그대로.
 */
function assignFaces(secs: DetailSection[], seed: number): DetailSection[] {
  const tints: NonNullable<V4Block["face"]>[] = ["emphasis", "bgB", "grad0", "grad1"];
  let k = seed % tints.length;
  const out = [...secs];
  for (let i = 0; i < out.length; i += 1) {
    const s = out[i]!;
    if (s.type !== "impact" || s.kind !== "v4" || !s.v4) continue;
    const fam = s.v4.family;
    if (fam === "touch" || (fam === "phototext" && s.v4.variant === "caption")) continue;
    const prev = faceClass(out[i - 1]);
    const next = faceClass(out[i + 1]);
    const face: NonNullable<V4Block["face"]> = fam === "breather" ? (prev === "white" && next !== "tint" ? "bgB" : "bgA") : prev === "white" || next === "white" ? tints[k++ % tints.length]! : prev === "tint" ? "bgA" : s.v4.face ?? "bgA";
    out[i] = { ...s, v4: { ...s.v4, face } } as DetailSection;
  }
  // 2회차: 흰 바탕 임팩트가 흰 면 사이(앞뒤 모두 흰 면)에 끼면 따뜻한 중립 면으로 — 사진·참고 카드(note: 안쪽 카드가 같은 중립 면)는 제외
  for (let i = 1; i < out.length - 1; i += 1) {
    const s = out[i]!;
    if (s.type !== "impact" || s.kind === "v4" || s.kind === "note" || s.kind === "number" || s.kind === "statement" || s.kind === "reviewstat" || PHOTO_KINDS.has(s.kind) || faceClass(s) !== "white") continue;
    if (faceClass(out[i - 1]) === "white" && faceClass(out[i + 1]) !== "tint") out[i] = { ...s, faceTone: "warm" } as DetailSection;
  }
  return out;
}
const PHOTO_KINDS = new Set(["bleed", "inset", "frame", "zoom", "asym2", "mosaic3", "stagger", "callout"]);

/** 모티프: v4 블록마다 1개(스토리·접점·모티프 면은 2개), 격번으로 위 경계 걸침 — 앞 섹션이 사진 하단 캡션형(bleed·caption)이면 걸치지 않는다 */
function assignMotifs(secs: DetailSection[], mood: string | null, seed: number): DetailSection[] {
  let k = 0;
  return secs.map((s, i) => {
    if (s.type !== "impact" || s.kind !== "v4" || !s.v4) return s;
    k += 1;
    const prev = secs[i - 1];
    const prevPhotoBottom = prev?.type === "impact" && (prev.kind === "bleed" || (prev.kind === "v4" && prev.v4?.variant === "caption"));
    const two = s.v4.family === "story" || s.v4.family === "touch" || s.v4.family === "breather";
    const motifs = planMotifs(mood, seed + i, { count: two ? 2 : 1, cross: !prevPhotoBottom && prev?.type !== "hero" && k % 2 === 1 });
    return { ...s, v4: { ...s.v4, motifs } } as DetailSection;
  });
}
