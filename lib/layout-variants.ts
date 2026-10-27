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
import { darkPaletteOf, faceCycleOf, invertFixHtml, isDarkStrategy } from "@/lib/face-strategy-v5";
import { designUp1On, designV4On, designV5On } from "@/lib/design-v4";
import type { ArchetypeTokens } from "@/lib/page-archetype-v5";
import { intrinsicStrength, planStoryboard, variantStrength } from "@/lib/storyboard-v5";
import { contrastRatioToken, hexToRgba, mixHex } from "@/lib/design-tokens";
import { depthShadow, ensureContrast, hairline, v4Palette, type FaceRole, type V4Palette } from "@/lib/palette-v4";
import { dividerFor, dividerHtml, type DividerKind } from "@/lib/dividers";
import { motifHtml, motifSvg, planMotifs, type MotifColors, type MotifPlacement } from "@/lib/motifs";
import { EYEBROW_LABEL, SANS_FF, TITLE_FF, esc, ghostHtml, highlightKeyword, keywordCandidates, numberStatHtml, polishCardTitles, titleBlock, titlePresetFor, typeCss } from "@/lib/type-treatments";
import { splitSentences } from "@/lib/impact-boost";
import { splitLead } from "@/lib/info-style";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";
import { groupPendingSpecRows, isPlaceholderValue, PENDING_SPEC_ROW_LABEL } from "@/lib/spec-placeholder";
import { extraIconFor, iconV4Svg, pickIconsV4 } from "@/lib/icons";
import { pickSummaryIcon } from "@/lib/summary-line-icons";

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
  // 463차 — UP1 전용 계열(꺼짐에서는 후보를 만들지 않으므로 기존 변형 목록·감사에는 나타나지 않는다)
  steps: [],
  statement: [],
  faq: [],
  proof: [],
  // 467차 — V5 전용 계열(일반 섹션 stat_infographic·gallery를 임팩트 v4 블록으로 다시 그림)
  stats: [],
  gallery: [],
};

/**
 * 463차 — UP1(NEXT_PUBLIC_DESIGN_V4_UP1=on)에서만 쓰는 추가 변형. 기존 계열은 선호 순서의 3번째 자리에 끼워 시드 회전에 들게 하고(기존 상위 2개는 그대로),
 * 새 계열(steps·statement)은 이 목록만 쓴다. UP1이 꺼져 있으면 variantOrder가 이 목록을 보지 않는다(출력 불변).
 */
/**
 * 465차 V5 — V5(NEXT_PUBLIC_DESIGN_V5=on)에서만 쓰는 새 변형. 렌더는 lib/v5-parts.ts. UP1 변형과 합쳐 variantOrder가 회전에 넣는다.
 * 새 계열 faq(정적으로 펼친 FAQ 카드를 다시 그림 — 접힘 인터랙션이 아닌 faqcards 임팩트가 원본)·proof(신뢰 근거 강조 박스)는 V5에서만 후보가 생긴다.
 */
export const V4_V5_VARIANTS: Partial<Record<V4Family, string[]>> = {
  benefits: ["stackbig", "rows2", "iconlist"],
  concern: ["memo", "deck"],
  story: ["chapter", "letter"],
  spec: ["panel", "tags", "big3"],
  phototext: ["stack", "polaroid", "dframe"],
  faq: ["numlist", "twocol", "qband", "chat", "tabs"],
  proof: ["lead", "wall", "badges", "seal"],
  touch: ["ticket", "ledger"],
  stats: ["bignum", "trio", "rings"],
  gallery: ["mosaic", "polaroid"],
};

export const V4_UP1_VARIANTS: Partial<Record<V4Family, string[]>> = {
  benefits: ["linelist"],
  story: ["pullband"],
  spec: ["cards"],
  steps: ["vtimeline", "bignum", "chipflow"],
  statement: ["band", "quote", "rule"],
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
export function variantOrder(family: V4Family, mood: string | null | undefined, seed: number, prefer?: readonly string[]): string[] {
  let pref = (mood && MOOD_PREF[mood]?.[family]) || V4_VARIANTS[family];
  const extra = [...(designUp1On() ? V4_UP1_VARIANTS[family] ?? [] : []), ...(designV5On() ? V4_V5_VARIANTS[family] ?? [] : [])];
  if (extra.length) pref = pref.length ? [...pref.slice(0, 2), ...extra, ...pref.slice(2)] : [...extra]; // 463차 UP1: 기존 상위 2개 뒤에 끼운다
  // 465차 V5 — 아키타입 선호 변형을 순서 맨 앞으로(선호 목록에 있고 후보에도 있는 것만, 선호 순서 유지)
  if (prefer?.length) pref = [...prefer.filter((x) => pref.includes(x)), ...pref.filter((x) => !prefer.includes(x))];
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
    // 440차 5 — 값 ≤14자(2열 칸 24px에서 2줄 이내). 12자일 때는 전자 스펙 띠("하이브리드 ANC 42dB" 14자)가 늘 탈락해 strip이 말뭉치 0회였다
    case "spec.strip": return n >= 2 && n <= 4 && d.items.every((i) => len(i.body) <= 14 && len(i.title) <= 10);
    case "spec.grid": return n >= 2 && n <= 8 && d.items.every((i) => len(i.body) <= 40);
    case "spec.line": return n >= 1;
    case "phototext.overlap": case "phototext.offset": case "phototext.arch": case "phototext.caption": return n === 1 && photos === 1;
    case "phototext.collage": return n === 2 && photos === 2;
    // 463차 UP1 — 새 변형의 입력 요건(글 길이는 한 줄·두 줄 안에 들어가는 범위). 요건 미달이면 다른 변형이나 기존 레이아웃으로 폴백
    case "benefits.linelist": return designUp1On() && n >= 3 && n <= 6 && d.items.every((i) => len(i.title) <= 36 && len(i.body) <= 70);
    case "story.pullband": return designUp1On() && len(d.quote) >= 8 && len(d.quote) <= 80;
    case "spec.cards": return designUp1On() && n >= 2 && n <= 6 && d.items.every((i) => len(i.title) <= 20 && len(i.body) >= 1 && len(i.body) <= 48 && !isPlaceholderValue(i.body ?? ""));
    case "steps.vtimeline": return designUp1On() && n >= 2 && n <= 6 && d.items.every((i) => len(i.title) >= 2 && len(i.title) <= 90);
    case "steps.bignum": return designUp1On() && n >= 2 && n <= 6 && d.items.every((i) => len(i.title) >= 2 && len(i.title) <= 60);
    case "steps.chipflow": return designUp1On() && n >= 2 && n <= 5 && d.items.every((i) => len(i.title) >= 2 && len(i.title) <= 32);
    // 465차 V5 — 새 변형 요건(글 길이는 한두 줄에 들어가는 범위). 미달이면 다른 변형·기존 레이아웃으로 폴백
    case "benefits.stackbig": return designV5On() && n >= 2 && n <= 5 && d.items.every((i) => len(i.title) <= 40 && len(i.body) <= 90);
    case "benefits.rows2": return designV5On() && n >= 4 && n <= 6 && d.items.every((i) => len(i.title) <= 24 && len(i.body) <= 60);
    case "benefits.iconlist": return designV5On() && n >= 3 && n <= 6 && d.items.every((i) => len(i.title) <= 40 && len(i.body) <= 90);
    case "concern.memo": return designV5On() && n >= 3 && n <= 6 && d.items.every((i) => len(i.title) <= 40);
    case "concern.deck": return designV5On() && n >= 3 && n <= 5 && d.items.every((i) => len(i.title) <= 36);
    case "story.chapter": return designV5On() && (len(d.quote) >= 8 || len(d.body) >= 40);
    case "story.letter": return designV5On() && len(d.body) >= 60;
    case "spec.panel": return designV5On() && n >= 2 && n <= 8 && d.items.every((i) => len(i.title) <= 20 && len(i.body) <= 60 && !isPlaceholderValue(i.body ?? ""));
    case "spec.tags": return designV5On() && n >= 2 && n <= 8 && d.items.every((i) => len(i.title) <= 12 && len(i.body) >= 1 && len(i.body) <= 16 && !isPlaceholderValue(i.body ?? ""));
    // 467차 V5 — 숫자 카드(stat_infographic style:number 전부)·갤러리 다시 그리기. 값은 입력 원문, 비율 링은 값이 "NN%"일 때만
    case "stats.bignum": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 24 && len(i.body) >= 1 && len(i.body) <= 20);
    case "stats.trio": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 24 && len(i.body) >= 1 && len(i.body) <= 14);
    case "stats.rings": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 24 && /^\d{1,3}(?:\.\d+)?\s*%$/.test((i.body ?? "").trim()) && parseFloat(i.body ?? "") <= 100);
    case "gallery.mosaic": return designV5On() && photos >= 3 && photos <= 5 && n === photos;
    case "gallery.polaroid": return designV5On() && photos >= 2 && photos <= 3 && n === photos;
    case "spec.big3": return designV5On() && n >= 2 && n <= 3 && d.items.every((i) => len(i.title) <= 14 && len(i.body) >= 1 && len(i.body) <= 10 && !isPlaceholderValue(i.body ?? ""));
    case "phototext.stack": case "phototext.polaroid": case "phototext.dframe": return designV5On() && n === 1 && photos === 1;
    case "faq.numlist": case "faq.qband": case "faq.tabs": return designV5On() && n >= 2 && n <= 8 && d.items.every((i) => len(i.title) <= 70 && len(i.body) <= 200);
    case "faq.twocol": return designV5On() && n >= 2 && n <= 6 && d.items.every((i) => len(i.title) <= 50 && len(i.body) <= 120);
    case "faq.chat": return designV5On() && n >= 2 && n <= 6 && d.items.every((i) => len(i.title) <= 60 && len(i.body) <= 160);
    case "proof.lead": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 30 && len(i.body) <= 100);
    case "proof.wall": return designV5On() && n >= 3 && n <= 4 && d.items.every((i) => len(i.title) <= 30 && len(i.body) <= 100);
    case "proof.badges": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 14);
    case "proof.seal": return designV5On() && n >= 2 && n <= 4 && d.items.every((i) => len(i.title) <= 20);
    default: return false;
  }
}

// ── 렌더 ──────────────────────────────────────────────────────────────────────
export const faceBg = (b: V4Block, p: V4Palette): string => (b.face === "grad0" ? p.gradients[0] : b.face === "grad1" ? p.gradients[1] : p.faces[(b.face ?? "bgA") as FaceRole]);
export const faceRole = (b: V4Block): FaceRole => (b.face === "grad0" || b.face === "grad1" ? "emphasis" : ((b.face ?? "bgA") as FaceRole));
const motifColors = (p: V4Palette): MotifColors => ({ a: p.tints[3], b: p.deep, c: p.secondary });

/** 448차 — 지그재그 번호 라벨은 진한 대표색(p.deep)을 썼는데 연한 색 면(emphasis 등) 위에서 4.5:1에 못 미치는 팔레트가 있었다(퍼징 R7 4.30). 못 미칠 때만 면 위 강한 글자색으로 */
export const zigzagLabelColor = (b: V4Block, p: V4Palette, strong: string): string => (contrastRatioToken(p.deep, p.faces[faceRole(b)]) >= 4.5 ? p.deep : strong);
export const NUM = (n: number) => String(n).padStart(2, "0");
export const CHECK = (c: string, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" style="display:block"><path d="M5 12.5 L10 17 L19 7" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const img = (url: string, alt: string, pos = "50% 45%", extra = "") => `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${pos};${extra}"/>`;

/** 제목(키워드 강조) */
export function headingHtml(text: string, b: V4Block, p: V4Palette, style: "marker" | "color" = "marker"): string {
  if (!text) return "";
  return highlightKeyword(text, b.keywords ?? [], style, style === "marker" ? p.accent : p.deep).html;
}

export function wrap(b: V4Block, p: V4Palette, inner: string, opts: { pad?: string; head?: string; label?: string } = {}): string {
  const role = faceRole(b);
  const on = p.onFace[role];
  const motifs = (b.motifs ?? []).map((m) => motifHtml(m as MotifPlacement, motifColors(p))).join("");
  const ghost = b.ghost ? ghostHtml(b.ghost, mixHex(p.faces[role] === "#FFFFFF" ? p.tints[0] : p.tints[1], p.accent, 0.12), 88, "tr") : "";
  const title = opts.head !== undefined ? titleBlock(b.preset ?? "number", opts.label ?? EYEBROW_LABEL[b.family] ?? "", b.no, opts.head, { ink: on.text, deep: on.strong, pillBg: p.deep, pillFg: "#FFFFFF" }) : "";
  return (
    `<section data-pz-impact="v4" data-pz-v4="${b.family}.${b.variant}" style="position:relative;padding:${opts.pad ?? "64px 24px"};background:${faceBg(b, p)}">` +
    motifs + ghost + (b.divider ? dividerHtml(b.divider as DividerKind, p.ink) : "") +
    `<div style="position:relative;z-index:1;max-width:576px;margin:0 auto">${title}${inner}</div></section>`
  );
}

function benefitsHtml(s: ImpactSection, b: V4Block, p: V4Palette, alt: string): string {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  if (b.variant === "linelist") {
    // 463차 UP1 — 번호 + 제목 + (있으면) 설명을 한 줄에 늘어놓는 목록. 아이콘·카드 없이 가는 선으로만 나눈다(글이 길면 설명이 아래 줄로 내려간다)
    const rows = items
      .map(
        (it, i) =>
          `<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:16px 0;border-top:${i ? `1px solid ${hexToRgba(p.ink, 0.12)}` : `2px solid ${p.ink}`}${i === items.length - 1 ? `;border-bottom:1px solid ${hexToRgba(p.ink, 0.12)}` : ""}">` +
          `<span aria-hidden="true" style="flex:none;${TITLE_FF};font-size:15px;font-weight:800;color:${zigzagLabelColor(b, p, on.strong)}">${NUM(i + 1)}</span>` +
          `<span style="flex:1 1 9em;min-width:0;overflow-wrap:anywhere;${typeCss("card", p.ink, "font-size:17px")}">${esc(it.title)}</span>` +
          (it.body ? `<span style="flex:1 1 12em;min-width:0;overflow-wrap:anywhere;${typeCss("small", on.sub)}">${esc(it.body)}</span>` : "") +
          `</div>`,
      )
      .join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "bento") {
    const [first, ...rest] = items;
    const big =
      `<div style="flex:1 1 100%;min-width:0;box-sizing:border-box;position:relative;overflow:hidden;display:flex;align-items:stretch;gap:14px;min-height:180px;padding:22px;border-radius:24px;background:${p.tints[2]}">` +
      `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;justify-content:flex-end"><span aria-hidden="true" style="${TITLE_FF};font-size:44px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:${p.deep}">01</span>` +
      `<p style="margin:12px 0 0;${typeCss("card", p.ink, "font-size:20px;font-weight:800")}">${esc(first!.title)}</p>` +
      (first!.body ? `<p style="margin:8px 0 0;${typeCss("small", mixHex(p.ink, "#FFFFFF", 0.12))}">${esc(first!.body)}</p>` : "") +
      `</div>` +
      (first!.img ? `<div style="flex:0 0 40%;min-width:0;position:relative;border-radius:18px;overflow:hidden;background:${p.tints[1]};box-shadow:${depthShadow("float", p.ink)}">${img(first!.img.url, alt, first!.img.pos, "position:absolute;inset:0")}</div>` : "") +
      `</div>`;
    const faces = ["#FFFFFF", p.tints[0], mixHex(p.secondary, "#FFFFFF", 0.84), p.tints[1]];
    // 440차 3 — 작은 칸 전부 키워드 근거가 있으면 번호 대신 아이콘(흰 선 + 진한 면), 하나라도 없으면 번호 그대로
    const icons = pickIconsV4(rest);
    const small = rest
      .map((it, i) => {
        const bg = faces[i % faces.length]!;
        const right = i % 2 === 1;
        return (
          `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;display:flex;flex-direction:column;align-items:${right ? "flex-end" : "flex-start"};text-align:${right ? "right" : "left"};padding:18px;border-radius:20px;background:${bg};${bg === "#FFFFFF" ? `border:${hairline(p.ink)};` : ""}">` +
          `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${i % 3 === 2 ? "10px" : "50%"};background:${p.deep};color:#FFFFFF;${SANS_FF};font-size:13px;font-weight:800">${icons ? iconV4Svg(icons[i]!, { color: "#FFFFFF", px: 18 }) : NUM(i + 2)}</span>` +
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
          `<div style="position:relative;display:flex;align-items:flex-start;gap:16px;padding:20px 20px 20px 16px;margin-top:${i ? 12 : 0}px;border-radius:18px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("soft", p.ink)}">` +
          `<span aria-hidden="true" data-pz-deco style="flex:none;width:64px;${TITLE_FF};font-size:52px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${p.tints[3]}">${NUM(i + 1)}</span>` +
          `<div style="flex:1 1 0%;min-width:0;padding-top:4px"><p style="margin:0;${typeCss("card", p.ink)}">${esc(it.title)}</p>` +
          (it.body ? `<p style="margin:6px 0 0;${typeCss("body", on.sub)}">${esc(it.body)}</p>` : "") +
          `</div></div>`,
      )
      .join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "iconstrip") {
    // 440차 3 — 항목 전부 키워드 근거가 있으면 체크·번호 번갈이 대신 항목별 아이콘(듀오톤), 없으면 이전 그대로
    const icons = pickIconsV4(items);
    const strip = `<div aria-hidden="true" style="display:flex;gap:6px;margin:0 0 18px">${items.map((_, i) => `<span style="flex:1 1 0%;height:6px;border-radius:999px;background:${i === 0 ? p.deep : p.tints[2]}"></span>`).join("")}</div>`;
    const rows = items
      .map(
        (it, i) =>
          `<div style="display:flex;align-items:center;gap:14px;padding:16px 0;${i ? `border-top:1px solid ${hexToRgba(p.ink, 0.1)}` : ""}">` +
          `<span style="flex:none;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:${i % 2 ? p.tints[1] : p.deep}">${icons ? iconV4Svg(icons[i]!, i % 2 ? { color: p.deep, px: 26, tint: p.tints[0] } : { color: "#FFFFFF", px: 26 }) : i % 2 ? `<span style="${SANS_FF};font-size:15px;font-weight:800;color:${designV5On() ? ensureContrast(p.deep, p.tints[1], 4.6) : p.deep}">${NUM(i + 1)}</span>` : CHECK("#FFFFFF", 20)}</span>` +
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
        `<div style="flex:1 1 0%;min-width:0;text-align:${right ? "right" : "left"}"><p style="margin:0;${typeCss("label", zigzagLabelColor(b, p, on.strong))}">${NUM(i + 1)}</p>` +
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
          `<div style="position:relative;z-index:${items.length - i};display:flex;align-items:flex-start;gap:12px;box-sizing:border-box;margin:${i ? -4 : 0}px ${i % 2 ? 0 : 12}px 0 ${i % 2 ? 12 : 0}px;padding:18px 18px;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("float", p.ink)};transform:rotate(${tilt[i % tilt.length]}deg)">` +
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
  const photoHtml = photo ? `<div style="margin:28px 0 0;aspect-ratio:4 / 3;overflow:hidden;border-radius:20px;box-shadow:${depthShadow("float", p.ink)}">${img(photo.url, alt, photo.pos)}</div>` : "";
  const head = headingHtml(s.text, b, p, "color");
  if (b.variant === "pullband") {
    // 463차 UP1 — 인용문 한 줄을 어두운 띠에 크게(왼쪽 정렬), 본문은 띠 아래에 그대로. 가운데 정렬 인용(quote)과 구조가 다르다
    const bandBg = contrastRatioToken("#FFFFFF", p.deep) >= 4.5 ? p.deep : p.ink;
    const inner =
      `${chip ? `<div style="margin:0 0 14px">${chip}</div>` : ""}${head ? `<p style="margin:0 0 16px;${typeCss("card", on.strong)}">${head}</p>` : ""}` +
      `<div style="position:relative;box-sizing:border-box;padding:28px 22px 26px 26px;border-radius:22px;background:${bandBg};box-shadow:${depthShadow("float", p.ink)}">` +
      `<span aria-hidden="true" data-pz-deco style="display:block;${TITLE_FF};font-size:56px;font-weight:900;line-height:0.6;height:26px;color:${hexToRgba("#FFFFFF", 0.5)}">“</span>` +
      `<p style="margin:0;text-align:left;overflow-wrap:anywhere;${typeCss("display", "#FFFFFF", "font-size:26px")}">${esc(s.quote ?? "")}</p></div>` +
      (s.body ? `<p style="margin:22px 0 0;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(s.body)}</p>` : "") +
      photoHtml;
    return wrap(b, p, inner, { head: "" });
  }
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
  // 441차 1-2 — 모든 행이 안내 문구(배송·교환 "판매자 정책을 확인해주세요" 등)면 같은 카드 반복 대신 압축 안내 카드 한 장(입력 문구 원문).
  // 문구가 모두 같으면 라벨을 한 줄로 묶고 문구는 한 번, 다르면 "라벨 — 문구" 목록
  if (items.length >= 2 && items.every((it) => isPlaceholderValue(it.body ?? ""))) {
    const same = new Set(items.map((it) => (it.body ?? "").trim())).size === 1;
    const lines = same
      ? `<p style="margin:0;${typeCss("card", p.ink, "font-size:16px")}">${items.map((it) => esc(it.title)).join(" · ")}</p><p style="margin:6px 0 0;${typeCss("small", on.sub)}">${esc(items[0]!.body ?? "")}</p>`
      : items.map((it, i) => `<p style="margin:${i ? 8 : 0}px 0 0;${typeCss("small", on.text)}"><b style="font-weight:700;color:${p.ink}">${esc(it.title)}</b> — ${esc(it.body ?? "")}</p>`).join("");
    return wrap(b, p, `<div style="display:flex;gap:14px;align-items:flex-start;padding:18px 18px 20px;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)}"><span style="flex:none;margin-top:2px">${iconV4Svg("info", { color: p.deep, px: 22, tint: p.tints[0] })}</span><div style="flex:1 1 0%;min-width:0">${lines}</div></div>`, { head });
  }
  if (b.variant === "cards") {
    // 463차 UP1 — 값을 먼저 크게, 라벨은 아래 작은 글. 색 면 카드(테두리 없음) 2열 — 표·줄무늬(line)나 흰 카드(grid)와 다르다
    const cards = items
      .map(
        (it, i) =>
          `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;padding:18px 16px 16px;border-radius:18px;background:${i % 2 ? mixHex(p.secondary, "#FFFFFF", 0.86) : p.tints[0]};border-top:4px solid ${p.deep}">` +
          // 짧은 값(8자 이하)만 큰 숫자 꼴(줄바꿈 없는 한 덩어리). 긴 값은 줄바꿈이 되는 일반 글로 — 2열 칸(320폭에서 140px 안팎)을 넘지 않게
          `<p style="margin:0;overflow-wrap:anywhere;line-height:1.2">${len((it.body ?? "").trim()) <= 8 ? numberStatHtml(it.body ?? "", p.ink, 26) : `<span style="overflow-wrap:anywhere;${typeCss("card", p.ink, "font-size:19px")}">${esc((it.body ?? "").trim())}</span>`}</p>` +
          `<p style="margin:8px 0 0;overflow-wrap:anywhere;${typeCss("label", on.sub, "letter-spacing:0.04em")}">${esc(it.title)}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  if (b.variant === "strip") {
    const cells = items
      .map(
        (it, i) =>
          `<div style="flex:1 1 calc(50% - 1px);min-width:120px;box-sizing:border-box;padding:18px 12px;text-align:center;${i ? `border-left:1px solid ${hexToRgba(p.ink, 0.1)}` : ""}">` +
          // 441차 1-4 — 숫자 강조 컴포넌트(큰 숫자 + 작은 단위, 글 값은 한 단계 작게)
          `<p style="margin:0;line-height:1.15">${numberStatHtml(it.body ?? "", on.strong, 26)}</p>` +
          `<p style="margin:6px 0 0;${typeCss("label", on.sub, "letter-spacing:0.04em")}">${esc(it.title)}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;border-radius:20px;background:#FFFFFF;border:${hairline(p.ink)}">${cells}</div>`, { head });
  }
  if (b.variant === "grid") {
    // 440차 3 — 라벨 전부 키워드 근거가 있으면 라벨 앞에 작은 아이콘
    const icons = pickIconsV4(items.map((it) => ({ title: it.title })));
    const cards = items
      .map(
        (it, i) =>
          `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;padding:16px;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)}">` +
          `<p style="margin:0;display:flex;align-items:center;gap:6px;${typeCss("label", p.deep, "letter-spacing:0.04em")}">${icons ? `<span style="flex:none">${iconV4Svg(icons[i]!, { color: p.deep, px: 18 })}</span>` : ""}${esc(it.title)}</p>` +
          `<p style="margin:8px 0 0;${typeCss("small", p.ink, "font-size:15px;font-weight:600;white-space:pre-line")}">${esc(it.body ?? "")}</p></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  // line
  const rows = items
    .map(
      (it, i) =>
        // 441차 1-2 — 표 줄무늬 면(짝수 행 옅은 틴트), 좌우 여백으로 면이 글에 붙지 않게
        `<div style="display:flex;gap:12px;padding:14px 10px;border-bottom:1px solid ${hexToRgba(p.ink, 0.12)}${i % 2 ? `;background:${hexToRgba(p.deep, 0.04)}` : ""}">` +
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
      `<div style="position:relative;z-index:2;margin:-24px 14px 0;box-sizing:border-box;padding:22px 20px;border-radius:20px;background:#FFFFFF;box-shadow:${depthShadow("float", p.ink)}">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "offset") {
    return wrap(b, p,
      `<div style="position:relative;padding:0 16px 16px 0"><div aria-hidden="true" style="position:absolute;right:0;bottom:0;width:86%;height:86%;border-radius:22px;background:${p.tints[2]}"></div>` +
      `<div style="position:relative;aspect-ratio:4 / 4.6;border-radius:22px;overflow:hidden;background:${p.tints[1]}">${img(it.img!.url, alt, it.img!.pos)}</div></div>` +
      `<div style="margin-top:24px">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "arch") {
    return wrap(b, p,
      `<div style="width:78%;margin:0 auto;aspect-ratio:3 / 4;border-radius:999px 999px 24px 24px;overflow:hidden;background:${p.tints[1]};box-shadow:${depthShadow("float", p.ink)}">${img(it.img!.url, alt, it.img!.pos)}</div>` +
      `<div style="margin-top:26px;text-align:center">${label}${title(it.title)}${body(it.body)}</div>`);
  }
  if (b.variant === "caption") {
    return wrap(b, p,
      `<div style="margin:0 -24px;aspect-ratio:4 / 5;overflow:hidden;background:${p.tints[1]}">${img(it.img!.url, alt, it.img!.pos)}</div>` +
      `<div style="display:flex;gap:14px;margin-top:22px;padding-top:18px;border-top:2px solid ${p.ink}"><div style="flex:0 0 auto;${TITLE_FF};font-size:28px;font-weight:900;line-height:1;color:${p.deep}">${NUM(b.no)}</div><div style="flex:1 1 0%;min-width:0">${title(it.title, 20)}${body(it.body)}</div></div>`,
      { pad: "0 24px 64px" });
  }
  // collage: 사진 2장 비대칭 + 항목 2개
  const [a, c] = items;
  return wrap(b, p,
    `<div style="position:relative;height:0;padding-bottom:96%">` +
    `<div style="position:absolute;left:0;top:0;width:62%;height:86%;border-radius:22px;overflow:hidden;background:${p.tints[1]}">${img(a!.img!.url, alt, a!.img!.pos)}</div>` +
    `<div style="position:absolute;right:0;bottom:0;width:44%;height:58%;border-radius:22px;overflow:hidden;background:${p.tints[2]};border:6px solid ${faceBg(b, p).startsWith("#") ? faceBg(b, p) : "#FFFFFF"};box-sizing:border-box">${img(c!.img!.url, alt, c!.img!.pos)}</div></div>` +
    [a!, c!].map((x, i) => `<div style="display:flex;gap:12px;margin-top:${i ? 18 : 24}px"><span style="flex:none;${typeCss("label", on.strong)}">${NUM(i + 1)}</span><div style="flex:1 1 0%;min-width:0">${title(x.title, 19)}${body(x.body)}</div></div>`).join(""));
}

/**
 * 441차 1-5 — 구매 직전 신뢰 스트립. 입력에 있는 신뢰 문구만(구매 카드 배지 중 배송·교환·반품·보증·A/S·인증·결제, 부족하면 같은 성격의 스펙 행 "라벨 값").
 * 아이콘은 요약 칩과 같은 규칙(근거 없으면 체크). 제목 문구는 만들지 않는다. 배지가 더 자세한 행에 들어 있으면 행 하나만, 2개 미만이면 생략.
 */
const TRUST_RE = /배송|출고|교환|반품|환불|보증|보장|a\/s|무상|인증|결제|무이자|할부|정품/i;
/**
 * 442차 2-B — 신뢰 문구를 구매 카드 안(제품명 → 가격 → 혜택 → 신뢰 → 버튼)에 그린다. 라이브·export가 같은 함수를 부른다(문자열 한 벌).
 * v4가 꺼져 있거나 2개 미만이면 빈 문자열 — 구매 카드는 이전 마크업 그대로.
 */
export function ctaTrustHtml(items: readonly string[] | undefined, theme: { accent: string; deepAccent: string }): string {
  if (!designV4On() || !items || items.length < 2) return "";
  const p = v4Palette({ ink: "#1B1B18", accent: theme.accent, deep: theme.deepAccent }, null);
  const cells = items
    .map((title) => {
      const it = { title };
      // 요약 칩과 같은 규칙(신규 키워드 → 요약 규칙: 교환=되돌리기·배송=트럭·보증=방패, 근거 없으면 체크) — 아이콘·점이 섞이지 않게
      const mark = iconV4Svg(extraIconFor(it.title) ?? pickSummaryIcon(it.title), { color: p.deep, px: 22, tint: p.tints[0] });
      return `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:#FFFFFF;border:${hairline(p.ink)}"><span style="flex:none">${mark}</span><span style="min-width:0;${typeCss("small", p.ink, "font-weight:700")}">${esc(it.title)}</span></div>`;
    })
    .join("");
  return `<div data-pz-trust style="display:flex;flex-wrap:wrap;gap:10px;max-width:480px;margin:20px auto 0;text-align:left">${cells}</div>`;
}

/** 하단 구매 카드 바로 위 신뢰 스트립 삽입 + 옮긴 배지는 구매 카드 칩에서 뺀다(중복 방지, 데이터 단계라 라이브·export 같음) */
function applyTrust(r: { sections: DetailSection[]; sourceIndexes: number[]; inserted: string[] }, ctx: V4Ctx): { sections: DetailSection[]; sourceIndexes: number[]; inserted: string[] } {
  const S = [...r.sections];
  const I = [...r.sourceIndexes];
  const ci = S.findIndex((s) => s.type === "cta_price");
  if (ci < 1) return r;
  const cta = S[ci] as Extract<DetailSection, { type: "cta_price" }>;
  const badges = (cta.badges ?? []).filter((x) => TRUST_RE.test(x));
  const titles: string[] = [...badges];
  if (titles.length < 2) {
    for (const s of S) {
      const rows = s.type === "impact" ? (s.kind === "v4" && s.v4?.family === "spec" ? (s.v4.items ?? []).map((x) => ({ label: x.title, value: x.body ?? "" })) : s.kind === "spectable" || s.kind === "specstrip" ? s.stats ?? [] : []) : [];
      for (const row of rows) {
        const t = `${row.label} ${row.value}`.trim();
        if (!TRUST_RE.test(row.label) || isPlaceholderValue(row.value) || [...t].length > 16 || titles.includes(t)) continue; // 442차 — 16자 이하(요약 문구만, 위 배송 표 문장을 3줄로 되풀이하던 것)
        // 배지 문구가 더 자세한 행 안에 그대로 있으면("5만원 이상 무료배송" ⊂ "배송비 3,000원 (5만원 이상 무료배송)") 자세한 행 하나만
        const dup = titles.findIndex((x) => t.includes(x));
        if (dup >= 0) titles[dup] = t;
        else if (titles.length < 4) titles.push(t);
      }
    }
  }
  if (titles.length < 2) return r;
  void ctx;
  // 442차 2-B — 별도 블록이 아니라 구매 카드 데이터에 싣는다(카드 안 배지 아래). 스트립에 그대로 있거나 더 자세한 행으로 바뀐 배지는 칩에서 뺀다
  S[ci] = { ...cta, trust: titles.slice(0, 4), badges: (cta.badges ?? []).filter((x) => !(badges.includes(x) && titles.some((t) => t.includes(x)))) } as DetailSection;
  return { sections: S, sourceIndexes: I, inserted: [...r.inserted, `신뢰 문구 → 구매 카드 @${ci}`] };
}

function touchHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  return wrap(b, p,
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;box-sizing:border-box;padding:20px 22px;border-radius:22px;background:#FFFFFF;box-shadow:${depthShadow("float", p.ink)}">` +
    `<p style="flex:1 1 0%;min-width:0;margin:0;${typeCss("card", p.ink, "font-size:16px")}">${esc(s.text)}</p>` +
    `<p style="flex:none;margin:0;${TITLE_FF};font-size:24px;font-weight:900;letter-spacing:-0.02em;line-height:1.2;color:${p.onFace.card.strong};white-space:nowrap;word-break:keep-all">${esc(b.price ?? "")}</p></div>`,
    { pad: "48px 24px" });
}

/** v4 블록 마크업(impactHtml이 부른다 — mood·고아·사진 실패 폴백은 impactHtml이 이어서 적용) */
/** 465차 V5 — V5 전용 변형 렌더 훅(lib/v5-parts.ts). 해당 변형이 아니면 null. v5-parts가 이 파일을 가져오므로 순환을 피하려고 인자로 받는다 */
export type V5Parts = (s: ImpactSection, b: V4Block, p: V4Palette, alt: string) => string | null;

export function v4Html(s: ImpactSection, pal: ImpactPalette, alt: string, parts?: V5Parts): string {
  const b = s.v4;
  if (!b) return "";
  const p0 = v4Palette({ ink: pal.ink, accent: pal.accent, deep: pal.deep }, s.mood);
  // 466차 V5 — 진한 면(invert): 렌더러는 팔레트 의미값만 읽으므로 어두운 면용으로 뒤집은 팔레트를 준다(꺼짐에서는 face가 invert일 수 없다)
  const p = designV5On() && b.face === "invert" ? darkPaletteOf(p0) : p0;
  let html: string = designV5On() && parts ? parts(s, b, p, alt) ?? "" : "";
  if (!html) switch (b.family) {
    case "benefits": html = benefitsHtml(s, b, p, alt); break;
    case "concern": html = concernHtml(s, b, p); break;
    case "story": html = storyHtml(s, b, p, alt); break;
    case "spec": html = specHtml(s, b, p); break;
    case "phototext": html = phototextHtml(b, p, alt); break;
    case "touch": html = touchHtml(s, b, p); break;
    case "steps": html = stepsHtml(s, b, p); break;
    case "statement": html = statementHtml(s, b, p); break;
    default: html = wrap({ ...b, motifs: [] }, p, `<div aria-hidden="true" style="display:flex;align-items:center;justify-content:center;gap:18px">${motifSvg("wave", 96, 20, motifColors(p), b.no)}${motifSvg("sparkle", 18, 18, motifColors(p))}${motifSvg("wave", 96, 20, motifColors(p), b.no + 1)}</div>`, { pad: "32px 24px" });
  }
  if (designV5On() && b.face === "invert") html = invertFixHtml(html, p);
  return polishCardTitles(html);
}

/** 463차 UP1 — 사용 순서(usage_steps 원문 문장 그대로). 번호만 붙인다 */
function stepsHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  const dot = contrastRatioToken("#FFFFFF", p.deep) >= 4.5 ? p.deep : p.ink; // 흰 숫자가 올라가는 원
  // "라벨: 설명" 꼴이면 라벨을 굵게 한 줄, 설명을 아래 줄로(원문 그대로 나눌 뿐). 아니면 한 문장 그대로
  const stepText = (t: string, strong: string, body: string): string => {
    const sp = splitLead(t);
    return sp
      ? `<span style="display:block;overflow-wrap:anywhere;${typeCss("card", strong, "font-size:16px")}">${esc(sp.lead)}</span><span style="display:block;margin-top:4px;overflow-wrap:anywhere;${typeCss("small", body)}">${esc(sp.rest)}</span>`
      : `<span style="display:block;overflow-wrap:anywhere;${typeCss("body", strong, "font-weight:600")}">${esc(t)}</span>`;
  };
  if (b.variant === "bignum") {
    const cards = items
      .map(
        (it, i) =>
          `<div style="flex:1 1 calc(50% - 5px);min-width:150px;box-sizing:border-box;padding:16px 16px 18px;border-radius:18px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("soft", p.ink)}">` +
          `<span aria-hidden="true" data-pz-deco style="display:block;${TITLE_FF};font-size:44px;font-weight:900;letter-spacing:-0.05em;line-height:1;color:${p.tints[3]}">${NUM(i + 1)}</span>` +
          `<div style="margin:10px 0 0">${stepText(it.title, p.ink, mixHex(p.ink, "#FFFFFF", 0.18))}</div></div>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  if (b.variant === "chipflow") {
    const arrow = `<span aria-hidden="true" style="flex:none;display:flex;align-items:center">${`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="display:block"><path d="M9 6 L15 12 L9 18" fill="none" stroke="${p.deep}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`}</span>`;
    const chips = items
      .map(
        (it, i) =>
          (i ? arrow : "") +
          `<span style="display:inline-flex;align-items:center;gap:8px;box-sizing:border-box;max-width:100%;padding:10px 14px 10px 10px;border-radius:20px;background:${p.tints[0]};border:${hairline(p.ink)}">` +
          `<span aria-hidden="true" style="flex:none;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${dot};color:#FFFFFF;${SANS_FF};font-size:13px;font-weight:800">${i + 1}</span>` +
          `<span style="min-width:0;overflow-wrap:anywhere;${typeCss("body", p.ink, "font-weight:600")}">${esc(it.title)}</span></span>`,
      )
      .join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 8px">${chips}</div>`, { head });
  }
  // vtimeline: 세로 선 + 번호 원
  const nodes = items
    .map(
      (it, i) =>
        `<div style="position:relative;padding:0 0 ${i === items.length - 1 ? 0 : 24}px 46px;min-height:32px">` +
        (i < items.length - 1 ? `<span aria-hidden="true" style="position:absolute;left:15px;top:32px;bottom:0;width:2px;background:${p.tints[2]}"></span>` : "") +
        `<span aria-hidden="true" style="position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${dot};color:#FFFFFF;${SANS_FF};font-size:14px;font-weight:800">${i + 1}</span>` +
        `<div style="padding-top:3px">${stepText(it.title, on.text, on.sub)}</div></div>`,
    )
    .join("");
  return wrap(b, p, nodes, { head });
}

/**
 * 463·464차 UP1 — 강조 띠: 입력에 이미 있는 문장 한 줄을 원문 그대로 크게(가공 없음). 형태 3가지(시드로 선택):
 *  band  — 왼쪽 정렬 + 왼쪽 세로 띠 / quote — 가운데 정렬 짧은 인용(따옴표 장식) / rule — 위아래 가는 선 사이 왼쪽 정렬
 */
function statementHtml(s: ImpactSection, b: V4Block, p: V4Palette): string {
  const on = p.onFace[faceRole(b)];
  const text = highlightKeyword(s.text, b.keywords ?? [], "color", p.deep).html;
  const pad = { pad: "56px 24px" };
  if (b.variant === "quote") {
    return wrap(b, p,
      `<div style="text-align:center"><span aria-hidden="true" data-pz-deco style="display:block;${TITLE_FF};font-size:56px;font-weight:900;line-height:0.6;height:26px;color:${hexToRgba(p.deep, 0.55)}">“</span>` +
        `<p style="margin:0 auto;max-width:20em;overflow-wrap:anywhere;${typeCss("display", on.text, "font-size:26px")}">${text}</p></div>`,
      pad);
  }
  if (b.variant === "rule") {
    const line = `<span aria-hidden="true" style="display:block;height:2px;background:${p.ink}"></span>`;
    return wrap(b, p, `${line}<p style="margin:20px 0;text-align:left;overflow-wrap:anywhere;${typeCss("display", on.text, "font-size:28px")}">${text}</p><span aria-hidden="true" style="display:block;height:1px;background:${hexToRgba(p.ink, 0.25)}"></span>`, pad);
  }
  return wrap(
    b,
    p,
    `<div style="display:flex;align-items:stretch;gap:18px"><span aria-hidden="true" style="flex:none;width:5px;border-radius:3px;background:${p.deep}"></span>` +
      `<p style="flex:1 1 0%;min-width:0;margin:0;text-align:left;overflow-wrap:anywhere;${typeCss("display", on.text, "font-size:28px")}">${text}</p></div>`,
    pad,
  );
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
  /** 465차 V5 — 페이지 아키타입 토큰(변형 선호·면 교대·아이브로·구분선). 없으면 기존 동작 */
  v5?: ArchetypeTokens | null;
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
    // 463차 UP1 — 사용 순서(usage_steps) 문장 2~6개를 steps 계열 변형으로. 원 섹션 종류는 origin으로 남겨 앵커 내비가 그대로 동작한다
    if (designUp1On() && s.type === "usage_steps") {
      const steps = (s.steps ?? []).map((t) => (t ?? "").trim()).filter(Boolean);
      if (steps.length >= 2 && steps.length <= 6) out.push({ family: "steps", at: i, len: 1, text: (s.heading ?? "").trim(), items: steps.map((t) => ({ title: t })), origin: { type: "usage_steps", slot: s.slot }, from: "usage_steps" });
      continue;
    }
    // 465차 V5 — 구조 이름이 faqcards인 임팩트(이미 정적으로 펼친 FAQ 카드): 질문/답 쌍을 faq 계열 변형으로. 원 섹션 종류는 origin으로 남겨 앵커 내비 유지
    if (designV5On() && s.type === "impact" && s.kind === "faqcards" && (s.stats ?? []).length >= 2) {
      out.push({ family: "faq", at: i, len: 1, text: s.text, items: (s.stats ?? []).map((x) => ({ title: x.label, body: x.value })), ...(s.origin ? { origin: s.origin } : {}), from: "faqcards" });
      continue;
    }
    // 467차 V5 — 숫자 카드: stat_infographic 중 모든 수치가 style "number"(실측/기본)이고 출처 각주·자체 평가가 없는 것만(디스클레이머·각주가 필요한 막대/링은 기존 렌더러 그대로). 값은 숫자 게이트 통과분만
    if (designV5On() && s.type === "stat_infographic") {
      const ms = s.metrics ?? [];
      if (ms.length >= 2 && ms.length <= 4 && ms.every((m) => m.style === "number" && m.basis !== "self_assessed" && !m.sourceNote && m.label.trim() && m.value.trim() && !checkText(`${m.label} ${m.value}`, ctx.facts).bad)) {
        out.push({ family: "stats", at: i, len: 1, text: (s.heading ?? "").trim(), items: ms.map((m) => ({ title: m.label.trim(), body: m.value.trim() })), origin: { type: "stat_infographic", slot: s.slot }, from: "stat_infographic" });
        continue;
      }
    }
    // 467차 V5 — 글만 있는 이미지-글(text_only, 강조 구절·말풍선 없음, 본문 40~420자)을 스토리 블록(chapter·letter)으로. 문구는 제목·본문 그대로
    if (designV5On() && s.type === "image_text" && s.layout === "text_only" && s.slot !== "quick_points" && !s.callout && !s.emphasis && s.heading.trim() && len(s.heading.trim()) <= 40 && len(s.body?.trim()) >= 40 && len(s.body?.trim()) <= 420 && !checkText(`${s.heading} ${s.body}`, ctx.facts).bad) {
      out.push({ family: "story", at: i, len: 1, text: s.heading.trim(), items: [], body: s.body.trim(), origin: { type: "image_text", slot: s.slot }, from: "text_only" });
      continue;
    }
    // 467차 V5 — 갤러리(사진 번호만 가진 섹션)를 모자이크·폴라로이드 블록으로. 원 섹션 종류는 origin으로 남겨 앵커 내비 유지
    if (designV5On() && s.type === "gallery") {
      const urls = (s.imageIndexes ?? []).map((k) => urlOf(k)).filter(Boolean);
      if (urls.length >= 2 && urls.length <= 5 && new Set(urls).size === urls.length) {
        out.push({ family: "gallery", at: i, len: 1, text: (s.heading ?? "").trim(), items: urls.map((u) => ({ title: "", img: { url: u, pos: "50% 45%" } })), origin: { type: "gallery", slot: s.slot }, from: "gallery" });
        continue;
      }
    }
    // 465차 V5 — 판매자 신뢰 근거 강조 박스(slot seller_trust_evidence)는 benefits 대신 proof 계열 변형으로
    if (designV5On() && s.type === "highlight_box" && s.slot === "seller_trust_evidence" && !s.boldBlock && s.cards.length >= 2 && s.cards.length <= 4) {
      const items = s.cards.map((c) => ({ title: c.title.trim(), ...(c.body?.trim() ? { body: c.body.trim() } : {}) })).filter((c) => c.title);
      if (items.length >= 2) { out.push({ family: "proof", at: i, len: 1, text: (s.heading ?? "").trim(), items, from: "trust_evidence" }); continue; }
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
      // 440차 눈 검수 D2 — "판매자 확인 필요" 같은 안내 행이 2개 이상이면 438차 표처럼 "확인 필요 항목" 한 줄로 모은다(문구는 원래 라벨 그대로)
      const { shown, pendingLabels } = groupPendingSpecRows(s.stats ?? []);
      const rows = pendingLabels.length ? [...shown, { label: PENDING_SPEC_ROW_LABEL, value: pendingLabels.join(" · ") }] : shown;
      out.push({ family: "spec", at: i, len: 1, text: s.text, items: rows.map((r) => ({ title: r.label, body: r.value })), ...(s.origin ? { origin: s.origin } : {}), from: s.kind });
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
  // 465차 V5 — 아키타입 면 교대 전략(paper: 종이 위주 / tint: 색 면 위주 / alt: 중립·색 교대). 없으면 기존 순환
  const faceCycle: NonNullable<V4Block["face"]>[] = ctx.v5 ? faceCycleOf(ctx.v5.face) : ["bgA", "emphasis", "bgB", "grad0", "bgA", "grad1"];
  let faceIdx = seed % faceCycle.length;
  let invertCount = 0;
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
      // 440차 5 — 선호 4위까지(5개 중). 3위까지일 때는 이웃 사진 카드 쌍이 있는 페이지(전자 4종)에서도 collage가 한 번도 안 나왔다
      if (variantOrder("phototext", ctx.mood, seed + i).indexOf("collage") <= 3 && (counts.get("phototext.collage") ?? 0) < 1) { cc = pair; consumed = 2; pairWith = true; }
    }
    // 페이지 안에서 덜 쓴 변형을 먼저(같은 순위면 mood·시드 순서) — 같은 모양이 반복되지 않게
    const order0 = variantOrder(cc.family, ctx.mood, seed + i * 7, (ctx.v5?.prefer as Partial<Record<string, string[]>> | undefined)?.[cc.family]);
    // 465차 V5 — 스토리보드: 페이지 앞 1/3 자리는 강도 4 이상(큰 변형)을 먼저(곡선 규칙 "처음 1/3에 높음 2회 이상"). V5 꺼짐이면 기존 정렬 그대로
    // 앞 섹션이 낮은 강도(≤2)면 낮은 것이 3연속 되지 않게 강도 3 이상을 먼저
    const prevLow = Boolean(ctx.v5) && outS.length > 0 && intrinsicStrength(outS[outS.length - 1]!) <= 2;
    const need = ctx.v5 ? (i / sections.length < 0.34 ? 4 : prevLow ? 3 : 0) : 0;
    // 466차 V5 — 아키타입 확정 선호: 선호 목록에 있는 변형이 먼저(1순위·2순위), 그 안에서는 강도 요구 → 순위. 선호 밖은 기존 정렬. 요건·상한·이웃 규칙은 아래 find가 그대로 건다
    const prefList = (ctx.v5?.prefer as Partial<Record<string, string[]>> | undefined)?.[cc.family];
    const prefRank = (v: string): number => { const r = prefList ? prefList.indexOf(v) : -1; return r < 0 ? 99 : r; };
    const order = ctx.v5 && prefList?.length
      ? [...order0].sort((a, b) => Number(prefRank(a) === 99) - Number(prefRank(b) === 99) || (prevLow ? Number(variantStrength(cc.family, a) < 3) - Number(variantStrength(cc.family, b) < 3) : 0) || prefRank(a) - prefRank(b) || (counts.get(`${cc.family}.${a}`) ?? 0) - (counts.get(`${cc.family}.${b}`) ?? 0) || order0.indexOf(a) - order0.indexOf(b))
      : [...order0].sort((a, b) => (need ? Number(variantStrength(cc.family, a) < need) - Number(variantStrength(cc.family, b) < need) : 0) || (counts.get(`${cc.family}.${a}`) ?? 0) - (counts.get(`${cc.family}.${b}`) ?? 0) || order0.indexOf(a) - order0.indexOf(b));
    const okVariant = (v: string): boolean => variantFits(cc.family, v, cc) && `${cc.family}.${v}` !== prevKey && (counts.get(`${cc.family}.${v}`) ?? 0) < MAX_SAME_VARIANT && (pairWith ? v === "collage" : v !== "collage");
    const variant = order.find((v) => okVariant(v));
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
    let face = cc.family === "phototext" && variant === "caption" ? "bgA" : faceCycle[faceIdx++ % faceCycle.length]!;
    // 466차 V5 — 진한 면(invert) 상한·이웃 규칙: 페이지당 blockAlt 5·colorCollide 6, 바로 앞이 진한 면(invert·boldBlock)이면 옅은 강조 면으로
    if (face === "invert") {
      const prevS = outS[outS.length - 1];
      const prev2 = outS[outS.length - 2];
      const isInv = (x: DetailSection | undefined): boolean => !!x && x.type === "impact" && x.kind === "v4" && x.v4?.face === "invert";
      const otherDark = (x: DetailSection | undefined): boolean => !!x && (((x.type === "highlight_box" || x.type === "checklist") && !!x.boldBlock) || x.type === "illustration_banner");
      // 진한 면은 최대 2개까지 이어 한 덩어리(띠)로 읽히게 하고(명암 전환 수를 아낀다), 일반 진한 블록·배너와는 붙이지 않는다
      const prevDark = otherDark(prevS) || (isInv(prevS) && isInv(prev2));
      if (!ctx.v5 || invertCount >= (ctx.v5.face === "colorCollide" ? 6 : 5) || prevDark || cc.family === "touch") face = "emphasis";
      else invertCount += 1;
    }
    const block: V4Block = {
      family: cc.family, variant, no, items: cc.items, face, keywords: keywords.slice(0, 12), preset: ctx.v5 ? ctx.v5.eyebrow : titlePresetFor(ctx.mood),
      ...(ghostAllowed(cc.family, variant) ? { ghost: String(no).padStart(2, "0") } : {}),
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
  const rhythm0 = applyRhythm(hooked.sections, hooked.sourceIndexes, ctx, seed);
  const rhythm1 = applyTrust(rhythm0, ctx);
  // 463차 UP1 — 강조 띠 1개(입력에 이미 있는 문장 원문). 꺼짐이면 건너뛴다(출력 불변)
  const band = designUp1On() ? insertStatementBand(rhythm1.sections, rhythm1.sourceIndexes, sections, keywords, ctx, seed) : null;
  const rhythm0b = band ? { ...rhythm1, sections: band.sections, sourceIndexes: band.sourceIndexes, inserted: [...rhythm1.inserted, band.note] } : rhythm1;
  // 465차 V5 — 마무리 띠: 구매 카드 바로 앞에 큰 문장 한 줄(곡선 규칙 "마무리 직전 높음 1회"). 가운데 띠와 다른 문장, 시드 약 60%
  const closing = ctx.v5 ? insertClosingStatement(rhythm0b.sections, rhythm0b.sourceIndexes, sections, keywords, ctx, seed) : null;
  const rhythm1b = closing ? { ...rhythm0b, sections: closing.sections, sourceIndexes: closing.sourceIndexes, inserted: [...rhythm0b.inserted, closing.note] } : rhythm0b;
  // 467차 V5 — 티커 띠(최대 1개)
  const ticker = ctx.v5 ? insertTickerV5(rhythm1b.sections, rhythm1b.sourceIndexes, keywords, ctx, seed) : null;
  const rhythm = ticker ? { ...rhythm1b, sections: ticker.sections, sourceIndexes: ticker.sourceIndexes, inserted: [...rhythm1b.inserted, ticker.note] } : rhythm1b;
  const withMotifs0 = assignMotifs(assignFaces(rhythm.sections, seed), ctx.mood, seed, ctx.v5 ?? null);
  const withMotifs = ctx.v5 ? boostEarlyHighV5(withMotifs0, ctx, seed) : withMotifs0;
  const finalPlaced: V4Placed[] = [];
  withMotifs.forEach((s, at) => { if (s.type === "impact" && s.kind === "v4" && s.v4) finalPlaced.push({ family: s.v4.family, variant: s.v4.variant, at, from: "" }); });
  return { sections: withMotifs, sourceIndexes: rhythm.sourceIndexes, placed: finalPlaced, moved: hooked.moved, inserted: rhythm.inserted };
}

/**
 * 463·464차 UP1 — 강조 띠. 문장은 입력에 이미 있는 것만 원문 그대로 8~48자 한 줄, 수치 검사(checkText) 통과.
 * 464차 쏠림 해소: ① 시드 기반으로 약 절반 페이지에서만(결정적) ② 위치는 높이의 45~65%를 시드로 ③ 형태 3가지를 시드로 ④ 후보도 여러 개 중 시드로 고른다.
 * 중복 방지: 후보 문장이 같은 페이지의 다른 섹션에 **한 글 노드 그대로**(필드 값이 문장과 같거나 타임라인 변형이 문장 단위로 쪼개 보이는 경우) 이미 있으면 제외한다 —
 *   긴 본문 문단 안의 한 문장은 그 문단과 다른 글 노드이므로 허용한다(브랜드 스토리 인용문은 필드 값이 그대로 보이므로 항상 제외된다).
 * 위치는 히어로·접점·숨 고르기·기존 강조 띠·구매 카드와 맞닿지 않는 경계. 우선순위: 기존 규칙(INFO_RUN_MAX·MAX_BREATHERS·TOUCH_AT로 이미 놓인 접점·모티프 면)이 먼저 놓이고 남는 경계에만 끼운다 — 충돌하면 만들지 않는다.
 */
export const STATEMENT_MIN_AT = 0.45;
export const STATEMENT_MAX_AT = 0.65;
export const STATEMENT_FORMS = ["band", "quote", "rule"] as const;
/** 후보 문장(원문 그대로, 8~48자 한 줄): 브랜드 스토리 본문의 문장 → 강조 박스 카드 본문 → 강조 박스 카드 제목 → 스토리 인용문 순으로 모은다 */
export function statementCandidates(orig: DetailSection[]): string[] {
  const out: string[] = [];
  for (const s of orig) if (s.type === "impact" && s.kind === "story" && s.body) for (const t of splitSentences(s.body)) out.push(t.trim());
  for (const s of orig) if (s.type === "highlight_box") for (const c of s.cards) if (c.body) out.push(c.body.trim());
  for (const s of orig) if (s.type === "highlight_box") for (const c of s.cards) out.push((c.title ?? "").trim());
  for (const s of orig) if (s.type === "impact" && s.kind === "story" && s.quote) out.push(s.quote.trim());
  return out.filter((t, i) => out.indexOf(t) === i);
}
/** 화면에 한 글 노드로 이미 보이는 문장 집합(섹션의 모든 문자열 필드 값 + 타임라인 변형이 문장 단위로 쪼갠 글) */
function shownNodes(secs: DetailSection[]): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") out.add(v.trim());
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  for (const s of secs) {
    walk(s);
    if (s.type === "impact" && s.kind === "v4" && s.v4?.family === "story" && s.v4.variant === "linetime") for (const t of splitSentences(`${s.quote ?? ""} ${s.body ?? ""}`.trim())) out.add(t.trim());
  }
  return out;
}
/** 제목·본문을 가운데 정렬로 그리는 경향이 있는 섹션 종류(말뭉치 마크업에서 관찰한 것 — 추정) */
const CENTER_IMPACT = new Set(["frame", "inset", "zoom", "statement", "number", "illust-center", "bleed", "textboost"]);
function leansCenter(s: DetailSection | undefined): boolean {
  if (!s) return false;
  if (s.type === "impact") return s.kind === "v4" ? (s.v4?.family === "phototext" && s.v4.variant === "arch") || s.v4?.family === "breather" : CENTER_IMPACT.has(s.kind);
  return s.type === "gallery" || s.type === "illustration_banner" || s.type === "usage_steps" || s.type === "ai_disclosure" || s.type === "hero" || (s.type === "image_text" && s.layout === "text_only");
}
/** 시드로 이 페이지에 띠를 만들지 — 결정적 */
/** 후보가 없는 페이지(작은 상품 등)가 빠지므로 시드 통과율은 60%로 둔다(전체 등장 비율이 약 절반 안팎이 되게) */
export const statementWanted = (seed: number): boolean => ((seed >>> 7) % 5) < 3;
export function insertStatementBand(secs: DetailSection[], idx: number[], orig: DetailSection[], keywords: readonly string[], ctx: V4Ctx, seed = 0): { sections: DetailSection[]; sourceIndexes: number[]; note: string } | null {
  if (!statementWanted(seed) || secs.length < 8) return null;
  const shown = shownNodes(secs.filter((x) => x.type === "impact")); // 지시: 같은 페이지의 다른 임팩트/스토리 섹션에 그대로 보이는 문장만 제외
  const cands = statementCandidates(orig).filter((t) => len(t) >= 8 && len(t) <= 48 && !/[\r\n]/.test(t) && !checkText(t, ctx.facts).bad && !shown.has(t));
  if (!cands.length) return null;
  const text = cands[(seed >>> 11) % cands.length]!;
  const at = STATEMENT_MIN_AT + (((seed >>> 5) % 21) / 100); // 0.45 ~ 0.65
  const form0 = statementFormV5(ctx, seed, 0) ?? STATEMENT_FORMS[(seed >>> 17) % STATEMENT_FORMS.length]!;
  const hs = secs.map((s) => ctx.height(s));
  const total = hs.reduce((a, b) => a + b, 0);
  const blocked = (s: DetailSection | undefined): boolean => !s || s.type === "hero" || s.type === "cta_price" || (s.type === "impact" && s.kind === "v4" && (s.v4?.family === "touch" || s.v4?.family === "breather" || s.v4?.family === "statement"));
  let y = 0;
  let best = -1;
  let bestD = Infinity;
  for (let k = 0; k < secs.length; k += 1) {
    const d = Math.abs(y - total * at);
    if (k >= 4 && k <= secs.length - 3 && !blocked(secs[k - 1]) && !blocked(secs[k]) && d < bestD) { bestD = d; best = k; }
    y += hs[k]!;
  }
  if (best < 0) return null;
  // 가운데 정렬 인용 형태는 이웃이 가운데 정렬 쪽 섹션이면 정렬 연속을 늘리므로 왼쪽 정렬 띠로 바꾼다(이웃의 실제 정렬은 모르는 일반 섹션이 있어 종류로 추정)
  const variant = form0 === "quote" && (leansCenter(secs[best - 1]) || leansCenter(secs[best])) ? "band" : form0;
  const sec = { type: "impact", slot: "impact", kind: "v4", text, ...(ctx.mood ? { mood: ctx.mood } : {}), v4: { family: "statement", variant, no: 0, face: bandFace(ctx, secs[best - 1], secs[best]), keywords: keywords.slice(0, 12) } } as ImpactSection;
  const S = [...secs];
  const I = [...idx];
  S.splice(best, 0, sec as DetailSection);
  I.splice(best, 0, I[best - 1]!);
  return { sections: S, sourceIndexes: I, note: `강조 띠(${variant}) @${best}` };
}



/** 466차 V5 — 강조 띠 형태: 아키타입 선호 목록(앞이 우선)에서 시드로(가운데 띠 shift 0 → 1순위 쪽, 마무리 띠 shift 1 → 2순위 쪽). V5가 아니면 null */
function statementFormV5(ctx: V4Ctx, seed: number, shift: number): (typeof STATEMENT_FORMS)[number] | null {
  const list = (ctx.v5?.prefer.statement ?? []).filter((v): v is (typeof STATEMENT_FORMS)[number] => (STATEMENT_FORMS as readonly string[]).includes(v));
  if (!ctx.v5 || list.length === 0) return null;
  return list[((seed >>> 17) + shift) % list.length]!;
}
/**
 * 466차 V5 — 곡선 규칙 보정(최종 순서 기준). 아키타입 선호가 조용한 변형뿐이라 처음 1/3(히어로 제외)에 높음(강도 ≥4)이 2개 미만이면(planStoryboard 점검과 같은 기준),
 * 그 구간 v4 블록 하나를 요건이 맞는 강한 변형으로 바꾼다. 1차: 아키타입 선호 목록 안 → 2차: 목록 밖(장점·스토리 제외, 구간 뒤쪽부터) → 3차: 장점·스토리 포함.
 * 선호 1순위 변형을 지켜야 하는 만큼 바꾸는 블록 수를 최소로(필요할 때만, 한 번에 하나).
 */
function boostEarlyHighV5(sections: DetailSection[], ctx: V4Ctx, seed: number): DetailSection[] {
  const prefAll = (ctx.v5!.prefer as Partial<Record<string, string[]>>);
  let out = sections;
  for (let guard = 0; guard < 3 && planStoryboard(out).report.earlyHighShort; guard += 1) {
    const third = Math.max(3, Math.floor(out.length / 3));
    let changed = false;
    for (const round of [1, 2, 3] as const) {
      const ks = [...Array(Math.max(0, third - 1)).keys()].map((x) => x + 1);
      if (round >= 2) ks.reverse();
      for (const k of ks) {
        const cur = out[k]!;
        if (cur.type !== "impact" || cur.kind !== "v4" || !cur.v4 || cur.v4.variant === "collage") continue;
        const fam = cur.v4.family;
        if (fam === "breather" || fam === "statement" || fam === "touch" || variantStrength(fam, cur.v4.variant) >= 4) continue;
        if (round === 2 && (fam === "benefits" || fam === "story")) continue;
        const prevK = structureKey(out[k - 1]!);
        const nextK = k + 1 < out.length ? structureKey(out[k + 1]!) : "";
        const used = (v: string): number => out.filter((x) => x.type === "impact" && x.kind === "v4" && x.v4 && `${x.v4.family}.${x.v4.variant}` === `${fam}.${v}`).length;
        const pl = prefAll[fam] ?? [];
        const d = { items: (cur.v4.items ?? []) as Item[], ...(cur.quote ? { quote: cur.quote } : {}), ...(cur.body ? { body: cur.body } : {}) };
        const alts = variantOrder(fam, ctx.mood, seed + k * 7, pl)
          .filter((v) => v !== "collage" && (round >= 2 || pl.includes(v)) && variantStrength(fam, v) >= 4 && variantFits(fam, v, d) && `${fam}.${v}` !== prevK && `${fam}.${v}` !== nextK && used(v) < MAX_SAME_VARIANT)
          .sort((x, y) => (pl.indexOf(x) < 0 ? 99 : pl.indexOf(x)) - (pl.indexOf(y) < 0 ? 99 : pl.indexOf(y)));
        const v = alts[0];
        if (!v) continue;
        const { ghost: _g, ...restB } = cur.v4;
        out = out.map((x, i) => (i === k ? ({ ...cur, v4: { ...restB, variant: v, ...(ghostAllowed(fam, v) && cur.v4!.ghost ? { ghost: cur.v4!.ghost } : {}) } } as DetailSection) : x));
        changed = true;
        break;
      }
      if (changed) break;
    }
    if (!changed) break;
  }
  return out;
}

/** 466차 V5 — 진한 면 전략(blockAlt·colorCollide)이면 띠(statement)를 진한 면으로. 이웃이 이미 진한 면(invert·boldBlock·배너)이면 옅은 면 */
function bandFace(ctx: V4Ctx, a: DetailSection | undefined, b: DetailSection | undefined): NonNullable<V4Block["face"]> {
  if (!ctx.v5 || !isDarkStrategy(ctx.v5.face)) return "emphasis";
  const dark = (x: DetailSection | undefined): boolean => !!x && ((x.type === "impact" && x.kind === "v4" && x.v4?.face === "invert") || ((x.type === "highlight_box" || x.type === "checklist") && !!x.boldBlock) || x.type === "illustration_banner");
  return dark(a) || dark(b) ? "emphasis" : "invert";
}


/** 466차 V5 — 접점 띠 변형: 아키타입 1순위 약 60%, 2순위 약 40%(시드, 결정적). 선호가 없으면 3종 시드 순환 */
function touchVariantV5(prefer: readonly string[] | undefined, seed: number): string {
  const list = (prefer ?? []).filter((v) => v === "band" || v === "ticket" || v === "ledger");
  if (list.length === 0) return (["band", "ticket", "ledger"] as const)[seed % 3]!;
  return list[(seed % 5) < 3 ? 0 : Math.min(1, list.length - 1)]!;
}
/**
 * 467차 V5 — 티커 띠(기울어진 반복 띠). 입력에 이미 있는 상품명 앞부분과 키워드 2~3개를 그대로 반복할 뿐 문구를 만들지 않는다. 페이지당 최대 1개,
 * 아키타입 `prefer.statement`에 ticker가 있을 때 시드로 약 70%. 위치는 높이의 55~65% 근처 경계 — 히어로·구매 카드·접점·숨 고르기·다른 띠 옆은 피한다.
 */
export function insertTickerV5(secs: DetailSection[], idx: number[], keywords: readonly string[], ctx: V4Ctx, seed = 0): { sections: DetailSection[]; sourceIndexes: number[]; note: string } | null {
  if (!ctx.v5 || !(ctx.v5.prefer.statement ?? []).includes("ticker") || (seed >>> 7) % 10 >= 7 || secs.length < 12) return null;
  const name = (ctx.facts.productName ?? "").trim().split(/\s+/).slice(0, 2).join(" ");
  const words = [name, ...keywords].map((w) => w.trim()).filter((w) => w && len(w) >= 2 && len(w) <= 12 && !checkText(w, ctx.facts).bad);
  const uniq = [...new Set(words)].slice(0, 3);
  if (uniq.length < 2) return null;
  const hs = secs.map((x) => ctx.height(x));
  const total = hs.reduce((a, b) => a + b, 0);
  const blocked = (x: DetailSection | undefined): boolean => !x || x.type === "hero" || x.type === "cta_price" || x.type === "ai_disclosure" || x.type === "caution" || (x.type === "impact" && x.kind === "v4" && (x.v4?.family === "touch" || x.v4?.family === "breather" || x.v4?.family === "statement"));
  let y = 0; let best = -1; let bestD = Infinity;
  for (let k = 0; k < secs.length; k += 1) {
    const d = Math.abs(y - total * (0.55 + ((seed >>> 9) % 11) / 100));
    if (k >= 5 && k <= secs.length - 4 && !blocked(secs[k - 1]) && !blocked(secs[k]) && d < bestD) { bestD = d; best = k; }
    y += hs[k]!;
  }
  if (best < 0) return null;
  const sec = { type: "impact", slot: "impact", kind: "v4", text: uniq.join(" · "), ...(ctx.mood ? { mood: ctx.mood } : {}), v4: { family: "statement", variant: "ticker", no: 0, face: bandFace(ctx, secs[best - 1], secs[best]), items: uniq.map((w) => ({ title: w })), keywords: [] } } as ImpactSection;
  const S = [...secs]; const I = [...idx];
  S.splice(best, 0, sec as DetailSection);
  I.splice(best, 0, I[best - 1]!);
  return { sections: S, sourceIndexes: I, note: `티커 띠 @${best}` };
}

/**
 * 465차 V5 — 마무리 띠. 구매 카드(cta_price) 바로 앞 경계에 입력 문장 한 줄을 원문 그대로 크게(형태는 시드로). 가운데 띠와 같은 규칙(8~48자·수치 검사·다른 임팩트에 같은 글 노드가 없음)이고
 * 가운데 띠에 쓴 문장은 제외한다. 앞 섹션이 접점·숨 고르기·띠·히어로면 만들지 않는다.
 */
export function insertClosingStatement(secs: DetailSection[], idx: number[], orig: DetailSection[], keywords: readonly string[], ctx: V4Ctx, seed = 0): { sections: DetailSection[]; sourceIndexes: number[]; note: string } | null {
  if (((seed >>> 19) % 5) >= 3 || secs.length < 8) return null;
  const at = secs.findIndex((x) => x.type === "cta_price");
  if (at < 4) return null;
  const prev = secs[at - 1];
  if (!prev || prev.type === "hero" || (prev.type === "impact" && prev.kind === "v4" && (prev.v4?.family === "touch" || prev.v4?.family === "breather" || prev.v4?.family === "statement"))) return null;
  const shown = shownNodes(secs.filter((x) => x.type === "impact"));
  const cands = statementCandidates(orig).filter((t) => len(t) >= 8 && len(t) <= 48 && !/[\r\n]/.test(t) && !checkText(t, ctx.facts).bad && !shown.has(t));
  if (!cands.length) return null;
  const text = cands[(seed >>> 23) % cands.length]!;
  const variant = statementFormV5(ctx, seed, 1) ?? STATEMENT_FORMS[((seed >>> 17) + 1) % STATEMENT_FORMS.length]!;
  const sec = { type: "impact", slot: "impact", kind: "v4", text, ...(ctx.mood ? { mood: ctx.mood } : {}), v4: { family: "statement", variant, no: 0, face: bandFace(ctx, prev, secs[at]), keywords: keywords.slice(0, 12) } } as ImpactSection;
  const S = [...secs];
  const I = [...idx];
  S.splice(at, 0, sec as DetailSection);
  I.splice(at, 0, I[at - 1]!);
  return { sections: S, sourceIndexes: I, note: `마무리 띠(${variant}) @${at}` };
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
    ({ type: "impact", slot: "impact", kind: "v4", text: "", ...(ctx.mood ? { mood: ctx.mood } : {}), ...extra, v4: { family, variant: family === "touch" ? (ctx.v5 ? touchVariantV5(ctx.v5.prefer.touch, seed) : "band") : "motif", no: 0, face: family === "touch" ? "grad0" : "bgA", ...b } }) as DetailSection;
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
      S.splice(best, 0, mk("touch", { text: touchName(ctx.facts.productName) }, { price }));
      I.splice(best, 0, I[best - 1]!);
      inserted.push(`구매 유도 접점 @${best}`);
    }
  }
  void seed;
  return { sections: S, sourceIndexes: I, inserted };
}

/**
 * 440차 눈 검수 D3 — 접점 띠의 제품명. "Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)"처럼 괄호 병기면 띠가 4줄이 되므로
 * 괄호 밖·안 중 짧은 쪽(2자 이상)만 쓴다. 입력 제품명의 일부만 쓰고 새 문구는 만들지 않는다.
 */
export function touchName(name: string): string {
  const n = name.trim();
  const m = /^(.+?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(n);
  if (!m) return n;
  const parts = [m[1]!.trim(), m[2]!.trim()].filter((x) => [...x].length >= 2);
  return parts.length ? parts.sort((a, b) => [...a].length - [...b].length)[0]! : n;
}

/**
 * 441차 1-3 — 고스트 글자(배경 장식 번호)를 허용하는 블록. 사진 위 글 카드·오버레이 카드가 있는 블록(phototext 전부)과
 * 큰 번호·카드가 이미 있는 블록(bento·numcards)에는 두지 않는다 — 카드 밖으로 글자가 새어 보이거나 번호가 겹친다. 린트 R9가 같은 규칙을 본다.
 */
export const ghostAllowed = (family: string, variant: string): boolean => family === "benefits" && variant !== "bento" && variant !== "numcards";

/** 늘 어두운 면으로 그려지는 섹션(색면 강조 박스·일러스트 배너) — 접점 위치 고를 때만 쓴다 */
const isDarkFace = (s: DetailSection | undefined): boolean => !!s && (s.type === "illustration_banner" || (s.type === "highlight_box" && !!s.boldBlock));

/** 임팩트 종류별 섹션 바탕(템플릿 마크업 기준): 색 면(틴트·파스텔)인 종류. 나머지 임팩트는 흰 바탕 */
const TINT_KINDS = new Set(["faqcards", "proof", "specstrip", "story", "textboost", "split"]);
type FaceClass = "white" | "tint" | "unknown";
/**
 * 445차 6 — 아이브로우 번호를 화면에 나오는 순서로 다시 매긴다. 번호는 계획 순서(placeV4)로 붙는데 블록이 이후 앞당겨지거나(첫 3화면 규칙·이동) 해서
 * 화면에는 03 → 01 → 02처럼 뒤섞여 보였다(디자이너 눈 검수 5종 중 4종). 번호 0(접점 띠·숨 고르기)은 그대로, 번호와 같은 고스트 글자도 같이 바꾼다. 입력 배열은 바꾸지 않는다.
 */
export function renumberV4Blocks(sections: DetailSection[]): DetailSection[] {
  let next = 0;
  return sections.map((s) => {
    if (s.type !== "impact" || s.kind !== "v4" || !s.v4 || s.v4.no <= 0) return s;
    next += 1;
    if (s.v4.no === next) return s;
    const oldGhost = String(s.v4.no).padStart(2, "0");
    return { ...s, v4: { ...s.v4, no: next, ...(s.v4.ghost === oldGhost ? { ghost: String(next).padStart(2, "0") } : {}) } } as DetailSection;
  });
}

/** 444차 — 인접 섹션 간격 규칙(lib/rhythm-v4.ts)이 "같은 면"을 판정하는 키. 임팩트만(그 밖은 null = 같은 면으로 보지 않음). 흰 면(bgA·card·기본)은 한 키 */
export function faceKeyOf(s: DetailSection | undefined): string | null {
  if (!s || s.type !== "impact") return null;
  // 446차 4-3 — 옅은 색 면은 한 키("tint"): 색 예산(v4 슬롯 2군)으로 면 색이 한 계열이 되어 faqcards·emphasis·legacy 색 면이 눈으로는 같은 면이다. 웜 중립(bgB·warm)은 따로, 어두운 면(invert)은 그대로
  if (s.kind === "v4" && s.v4) {
    const f = s.v4.face;
    if (f === "bgA" || f === "card" || !f || f === "grad0" || f === "grad1") return "white"; // 그라데이션 면은 흰 쪽에서 시작해 위 가장자리가 흰 이웃과 이어져 읽힌다(444차 측정)
    if (designV4On()) return f === "bgB" ? "warm" : f === "emphasis" ? "tint" : `v4:${f}`;
    return `v4:${f}`;
  }
  if (TINT_KINDS.has(s.kind)) return designV4On() ? "tint" : `tint:${s.kind}`;
  return s.faceTone === "warm" ? "warm" : "white";
}
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
    if (s.v4.face === "invert") continue; // 466차 V5 — 진한 면은 계획기가 정한 대로
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
  // 463차 UP1 3회차: 흰 면(임팩트 흰 면 + 흰 바탕인 일반 섹션 종류)이 3개 이상 이어지면 그 안의 바꿀 수 있는 임팩트 하나를 색 면으로(한 구간에 하나)
  if (designUp1On()) {
    const WHITE_TYPES = new Set(["spec_table", "caution", "faq", "usage_steps", "ai_disclosure"]);
    const whiteish = (t: DetailSection | undefined): boolean => !!t && (t.type === "impact" ? faceClass(t) === "white" : WHITE_TYPES.has(t.type) || (t.type === "image_text" && t.layout === "text_only"));
    const changeable = (t: DetailSection): boolean => t.type === "impact" && faceClass(t) === "white" && t.kind !== "note" && t.kind !== "number" && t.kind !== "statement" && t.kind !== "reviewstat" && !PHOTO_KINDS.has(t.kind) && !(t.kind === "v4" && t.v4 && (t.v4.family === "touch" || (t.v4.family === "phototext" && t.v4.variant === "caption")));
    for (let i = 0; i < out.length; ) {
      if (!whiteish(out[i])) { i += 1; continue; }
      let j = i;
      while (j < out.length && whiteish(out[j])) j += 1;
      if (j - i >= 3) {
        const mid = (i + j - 1) / 2;
        const pick = [...Array(j - i).keys()].map((k) => i + k).filter((k) => changeable(out[k]!)).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
        if (pick !== undefined) {
          const t = out[pick] as ImpactSection;
          out[pick] = (t.kind === "v4" && t.v4 ? { ...t, v4: { ...t.v4, face: "bgB" } } : { ...t, faceTone: "warm" }) as DetailSection;
        }
      }
      i = j;
    }
    // 숨 고르기 면이 색 면과 흰 면 사이에서 흰 면(bgA)이 되면 뒤의 흰 면과 같은 바탕이 된다 → 따뜻한 중립 면(bgB)으로(세 번째 면이라 이웃과 모두 다르다)
    for (let i = 1; i < out.length - 1; i += 1) {
      const t = out[i]!;
      if (t.type !== "impact" || t.kind !== "v4" || t.v4?.family !== "breather" || (t.v4.face ?? "bgA") !== "bgA") continue;
      const a = faceClass(out[i - 1]);
      const c = faceClass(out[i + 1]);
      if ((a === "tint" && c === "white") || (a === "white" && c === "tint")) out[i] = { ...t, v4: { ...t.v4, face: "bgB" } } as DetailSection;
    }
  }
  return out;
}
const PHOTO_KINDS = new Set(["bleed", "inset", "frame", "zoom", "asym2", "mosaic3", "stagger", "callout"]);

/** 모티프: v4 블록마다 1개(스토리·접점·모티프 면은 2개), 격번으로 위 경계 걸침 — 앞 섹션이 사진 하단 캡션형(bleed·caption)이면 걸치지 않는다 */
function assignMotifs(secs: DetailSection[], mood: string | null, seed: number, v5: ArchetypeTokens | null = null): DetailSection[] {
  let k = 0;
  return secs.map((s, i) => {
    if (s.type !== "impact" || s.kind !== "v4" || !s.v4) return s;
    k += 1;
    const prev = secs[i - 1];
    const prevPhotoBottom = prev?.type === "impact" && (prev.kind === "bleed" || (prev.kind === "v4" && prev.v4?.variant === "caption"));
    const two = s.v4.family === "story" || s.v4.family === "touch" || s.v4.family === "breather";
    const cross = !prevPhotoBottom && prev?.type !== "hero" && k % 2 === 1;
    const motifs = planMotifs(mood, seed + i, { count: two ? 2 : 1, cross });
    // 441차 1-4 — 걸치는 모티프가 없는 경계(짝수 번째·히어로·사진 하단 캡션 뒤 제외)에는 mood 구분선을 번갈아
    const divider = !cross && k % 2 === 0 && !prevPhotoBottom && prev && prev.type !== "hero" ? (v5 ? v5.dividers[Math.floor(k / 2) % v5.dividers.length]! : dividerFor(mood, k / 2)) : undefined;
    // 442차 1 — 구분선이 있는 경계에서는 위쪽 모티프를 뺀다(점 격자·블롭과 구분선이 겹쳐 보이던 것, 눈 검수 s411·s418·makeup). 아래쪽 모티프는 유지
    const placed = divider ? motifs.filter((m) => m.anchor !== "top") : motifs;
    return { ...s, v4: { ...s.v4, motifs: placed, ...(divider ? { divider } : {}) } } as DetailSection;
  });
}
