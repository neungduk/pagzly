/**
 * 467차 V5 — 다이나믹 레이어. ① 계획(`planDynamicsV5`, 표시 단계: 섹션 순서가 정해진 뒤 한 번, 결정적) → 임팩트 섹션의 `dyn` 필드(저장 안 함),
 * ② 적용(`applyDynamicsHtml`, `impactHtml` 끝: 라이브·export 같은 함수). `lib/dynamics-v5.ts` 부품으로 큰 순번 배경·스티커·테이프·카드 변주·이음새 도형·걸침을 얹는다.
 *
 * 대상: v4 블록(touch·breather·statement 제외 — 가격·접점·띠는 건드리지 않는다). 히어로·구매 카드·고지·주의·일반 섹션은 대상이 아니다(안전 여백).
 * 안전: 장식은 섹션 안쪽 `overflow:hidden` 상자(inset 0) 안에 두어 가로 넘침이 없고, 글자(`wrap`의 내용 상자 z-index 1)는 항상 장식 위. 새 글자는 순번·입력 키워드뿐.
 * 꺼짐(`DESIGN_V5` 아님)·편집 모드(`ax` 없음)에서는 호출되지 않는다.
 */
import type { ArchetypeTokens } from "@/lib/page-archetype-v5";
import type { DetailSection, ImpactSection, V4Block } from "@/lib/types/generate";
import { v4Palette, type FaceRole, type V4Palette } from "@/lib/palette-v4";
import { hexToRgba } from "@/lib/design-tokens";
import { TITLE_FF, esc } from "@/lib/type-treatments";
import { dotGrid, gridPaper, seamShape, stripeField, sticker, tape, rnd } from "@/lib/dynamics-v5";
import { darkPaletteOf } from "@/lib/face-strategy-v5";

type Dyn = NonNullable<ImpactSection["dyn"]>;
const SKIP_FAMILY = new Set(["touch", "breather", "statement"]);
/** 글 위주 기존 임팩트 종류(사진 위 글자·사진 오버레이 종류는 제외) — 장식 층은 이 섹션 뒤(z-index -1)에 깔려 글을 가리지 않는다 */
const LEGACY_OK = new Set(["note", "textboost", "bubbles", "checkrows", "checkgrid", "chat", "chipwall", "sizebars", "illust-center", "illust-side", "swatch", "timeline", "spectable", "specstrip", "faqcards", "proof", "reviewstat", "story", "fit", "number"]);
export const dynEligible = (s: DetailSection | undefined): s is ImpactSection => !!s && s.type === "impact" && (s.kind === "v4" ? !!s.v4 && !SKIP_FAMILY.has(s.v4.family) : LEGACY_OK.has(s.kind));
const bandLike = (s: DetailSection | undefined): boolean => !!s && s.type === "impact" && s.kind === "v4" && !!s.v4 && (s.v4.family === "statement" || s.v4.family === "breather");
/** 큰 배경 글자: v4 블록은 순번(눈썹 번호와 같은 값), 기존 임팩트는 제목의 첫 단어(입력 원문, ≤8자) */
const firstWord = (text: string | undefined): string => ([...(text ?? "").trim().split(/\s+/)[0] ?? ""].slice(0, 8)).join("");
const roleOf = (b: V4Block | undefined): FaceRole => !b ? "bgA" : (b.face === "grad0" || b.face === "grad1" ? "emphasis" : ((b.face ?? "bgA") as FaceRole));
const CARD_FAMILIES = new Set(["benefits", "concern", "spec", "proof", "faq", "steps"]);

/** 사진 틀 모서리 6종(반경만 바꾸므로 어떤 비율에서도 안전): rect=기본 · soft=크게 · leaf=대각 · notch=반대 대각 · tab=위만 · cut=아래만 */
export type FrameCorner = "rect" | "soft" | "leaf" | "notch" | "tab" | "cut";
const FRAME_SETS: Record<ArchetypeTokens["id"], FrameCorner[]> = {
  editorial: ["rect", "notch", "cut", "tab"], catalog: ["rect", "tab", "cut", "notch"], softlife: ["soft", "leaf", "rect", "tab"], impact: ["cut", "tab", "leaf", "notch"],
  techsheet: ["rect", "cut", "notch", "tab"], narrative: ["soft", "leaf", "tab", "rect"], luxe: ["rect", "soft", "notch", "cut"], pop: ["leaf", "notch", "tab", "soft", "cut"],
};
export function frameRadius(kind: FrameCorner, r: number): string {
  const a = Math.max(6, r); const b = Math.round(a * 2);
  switch (kind) {
    case "soft": return `${Math.round(a * 1.7)}px`;
    case "leaf": return `${b}px 2px ${b}px 2px`;
    case "notch": return `2px ${b}px 2px ${b}px`;
    case "tab": return `${b}px ${b}px 2px 2px`;
    case "cut": return `2px 2px ${b}px ${b}px`;
    default: return `${a}px`;
  }
}
/** 사진 틀(overflow:hidden + img를 바로 품은 div)의 모서리를 아키타입 틀 목록으로 번갈아 바꾼다. 원·알약(50%·999px)·이미 비대칭인 틀은 그대로 */
function reframe(html: string, t: ArchetypeTokens, salt: number): string {
  const set = FRAME_SETS[t.id];
  let k = salt;
  const WR = /(<div[^>]*style=")([^"]*overflow:hidden[^"]*)("[^>]*>\s*(?:<(?:div|span)[^>]*>\s*)?<img)/g;
  return html.replace(WR, (m, pre: string, st: string, post: string) => {
    const rad = /(^|;)border-radius:(\d+)px(?=;|$)/.exec(st);
    // 반경이 없는 사진 틀(각진 사진)은 기본 10px로 보고 변주한다. 원·알약·이미 비대칭인 틀(숫자 하나가 아닌 값)은 건드리지 않는다
    if (!rad && /border-radius:/.test(st)) return m;
    const kind = set[k % set.length]!;
    const tilted = t.dyn.tilt && !/transform:/.test(st) && k % 3 === 1;
    const deg = k % 2 ? 1.2 : -1.2;
    k += 1;
    let out = kind === "rect" ? st : rad ? st.replace(/(^|;)border-radius:\d+px/, `$1border-radius:${frameRadius(kind, Number(rad[2]))}`) : `${st};border-radius:${frameRadius(kind, 10)}`;
    if (tilted) out = `${out};transform:rotate(${deg}deg)`;
    return out === st ? m : `${pre}${out}${post}`;
  });
}

/** 페이지당 상한(과다 방지): [이음새·걸침, 스티커, 테이프] */
const CAPS: Record<3 | 4 | 5, { seams: number; stickers: number; tapes: number }> = { 3: { seams: 5, stickers: 0, tapes: 0 }, 4: { seams: 7, stickers: 1, tapes: 1 }, 5: { seams: 9, stickers: 2, tapes: 2 } };
export const DYN_CAPS = CAPS;

/** 시험용: 467차 다이나믹 레이어를 끄고(466차 끝 상태) 기준선을 잰다 */
let dynOff = false;
export function setDynamicsOffForTests(off: boolean): void { dynOff = off; }

export function planDynamicsV5(sections: DetailSection[], t: ArchetypeTokens, seed: number): DetailSection[] {
  if (dynOff) return sections;
  const lv = t.dyn.level;
  const cap = CAPS[lv];
  const dyn = new Map<number, Dyn>();
  const get = (i: number): Dyn => { let d = dyn.get(i); if (!d) { d = {}; dyn.set(i, d); } return d; };
  const elig = sections.map((s, i) => (dynEligible(s) ? i : -1)).filter((i) => i >= 0);
  // 큰 배경 글자(v4=순번, 기존 임팩트=제목 첫 단어): 강도별 크기·농도만 다르다
  elig.forEach((i, k) => {
    const sec = sections[i] as ImpactSection;
    const b = sec.v4;
    if (b ? b.ghost || b.no <= 0 : !firstWord(sec.text)) return;
    { get(i).ghost = true; if (!b) get(i).word = firstWord(sec.text); }
  });
  // 기울인 판: 적격 섹션 중 번갈아(방향도 번갈아)
  const every = lv === 5 ? 3 : 2; // 강도 5는 세 번째마다(기울임은 이미 스티커·테이프·티커로 충분하고 크기 상한 때문)
  elig.forEach((i, k) => { if (k % every === 0) get(i).plate = (k / every) % 2 ? 1 : -1; });
  // 배경 질감: 아키타입이 질감을 가지면 적격 섹션 중 세 번째마다(이음새·걸침이 없는 섹션만)
  if (t.dyn.texture) elig.forEach((i, k) => { if (k % 3 === 1 && !dyn.get(i)?.seam && !dyn.get(i)?.rise) get(i).texture = t.dyn.texture!; });
  // 카드 변주(반경 한 모서리 변주 — 같은 카드 서명이 이어지지 않게): 강도 ≥ 4, 카드 계열
  if (lv >= 4) for (const i of elig) if (CARD_FAMILIES.has((sections[i] as ImpactSection).v4?.family ?? "")) get(i).cards = 1;
  // 스티커·테이프(기울임 성격만): 스티커 글자는 입력 키워드(≤6자), 테이프는 사진 글 블록
  if (t.dyn.tilt) {
    let st = 0; let tp = 0;
    for (const i of elig) {
      const b = (sections[i] as ImpactSection).v4;
      if (!b) continue;
      const kw = (b.keywords ?? []).find((x) => [...x].length >= 2 && [...x].length <= 6);
      if (st < cap.stickers && kw && (b.family === "benefits" || b.family === "phototext") && rnd(seed, i) > 0.2) { get(i).sticker = kw; st += 1; }
      else if (tp < cap.tapes && b.family === "phototext") { get(i).tape = true; tp += 1; }
    }
  }
  // 이음새·걸침: 앞뒤가 모두 적격 임팩트인 경계에서(히어로 바로 뒤·구매 카드 앞뒤·고지/주의 옆 제외). 이음새 도형은 이 섹션 자기 색으로 위 섹션 아래 여백 쪽으로 솟는다 → 앞 섹션 아래 여백을 h만큼 늘린다
  let used = 0;
  let flip = rnd(seed, 99) > 0.5;
  for (let i = 2; i < sections.length - 2 && used < cap.seams; i += 1) {
    const a = sections[i - 1]; const bb = sections[i];
    // 이음새·걸침은 띠(statement)·숨 고르기(breather)도 받을 수 있다(자기 색 도형일 뿐). 접점(touch=가격)·히어로·구매 카드는 아니다
    if (!(dynEligible(a) || bandLike(a)) || !(dynEligible(bb) || bandLike(bb))) continue;
    if (dyn.get(i - 1)?.rise) continue; // 걸침 바로 다음 경계는 건너뜀(음수 마진이 겹치지 않게)
    const wantRise = t.dyn.rise && (!t.dyn.seam || flip);
    flip = !flip;
    if (wantRise) { const r = lv >= 4 ? 28 : 22; get(i).rise = r; get(i - 1).extraBottom = r; used += 1; }
    else if (t.dyn.seam) { const h = lv === 5 ? 34 : 28; get(i).seam = { kind: t.dyn.seam }; get(i - 1).extraBottom = h; used += 1; }
  }
  if (dyn.size === 0) return sections;
  return sections.map((s, i) => (dyn.has(i) ? ({ ...s, dyn: dyn.get(i) } as DetailSection) : s));
}

// ── 적용(impactHtml 끝) ───────────────────────────────────────────────────────
const ROOT_RE = /^(\s*<section\b[^>]*?style=")([^"]*)(")/;
function patchRoot(html: string, fn: (style: string) => string): string {
  return html.replace(ROOT_RE, (_m, pre: string, st: string, post: string) => `${pre}${fn(st)}${post}`);
}
const ensureRel = (st: string): string => (/(^|;)\s*position:/.test(st) ? st : `position:relative;${st}`);
/** 루트 닫는 태그 앞에 장식 층을 넣는다(글 노드의 첫 text-align 등이 장식에 가려지지 않게 맨 뒤; 내용 상자 z-index 1이 장식 위) */
const appendLayer = (html: string, layer: string): string => {
  const end = html.lastIndexOf("</section>");
  return end > 0 ? `${html.slice(0, end)}${layer}${html.slice(end)}` : html;
};

export function applyDynamicsHtml(html: string, s: ImpactSection, t: ArchetypeTokens, pal: { ink: string; accent: string; deep: string }): string {
  const d = s.dyn;
  const b = s.v4;
  if (!d || !html || html.includes("data-pz-dyn-done")) return html;
  const p0: V4Palette = v4Palette({ ink: pal.ink, accent: pal.accent, deep: pal.deep }, s.mood);
  const dark = b?.face === "invert";
  const p = dark ? darkPaletteOf(p0) : p0;
  let out = html;
  // 카드 변주: 카드로 읽히는 div(배경 + 테두리/그림자 + 반경 10~28px)의 반경을 세 가지로 번갈아(한 모서리를 4px로)
  if (d.cards) {
    let k = 0;
    out = out.replace(/<div([^>]*?style="[^"]*?)border-radius:(1\d|2[0-8])px([^"]*")/g, (m, pre: string, r: string, post: string) => {
      if (!/background:/.test(pre + post) || !(/border:|box-shadow:/.test(pre + post)) || /overflow:hidden/.test(pre + post) && /aspect-ratio/.test(pre + post)) return m;
      const n = k % 3; k += 1;
      return n === 0 ? m : `<div${pre}border-radius:${n === 1 ? `${r}px ${r}px ${r}px 4px` : `4px ${r}px ${r}px ${r}px`}${post}`;
    });
  }
  // 배경 질감(단색 루트 배경 위에 반복 gradient를 겹침). 이음새·걸침이 있으면 하지 않는다
  if (d.texture && !d.seam && !d.rise) {
    const pat = d.texture === "dots" ? dotGrid(p) : d.texture === "grid" ? gridPaper(p) : stripeField(p);
    out = patchRoot(out, (st) => st.replace(/(^|;)background:(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/, (_m, pre: string, c: string) => `${pre}background:${pat},${c}`));
  }
  // 사진 틀 모서리 변주(전 강도)
  out = reframe(out, t, (b ? b.no : (d.word ?? "").length) * 3);
  // 장식 층: 섹션 안쪽 inset 0 상자(overflow:hidden) — z-index -1(루트가 isolation으로 쌓임 맥락을 가져 배경 위·글 아래에 깔림)
  const layers: string[] = [];
  if (d.ghost && !/data-pz-ghost/.test(out)) {
    const size = t.dyn.level === 5 ? 190 : t.dyn.level === 4 ? 150 : 120;
    const alpha = dark ? 0.1 : t.dyn.level === 5 ? 0.12 : t.dyn.level === 4 ? 0.09 : 0.07;
    const color = dark ? `rgba(255,255,255,${alpha})` : hexToRgba(p.deep, alpha);
    const label = b ? String(b.no).padStart(2, "0") : d.word ?? "";
    const left = rnd(b ? b.no * 7 : label.length * 13, 3) > 0.5;
    // 단어(기존 임팩트)는 길이에 맞춰 크기를 줄여 가로로 한 줄 안에 들게 한다(최대 폭 ≈ 글자 수 × 0.62em)
    const fit = b ? size : Math.max(72, Math.min(size, Math.floor(300 / Math.max(2, [...label].length) / 0.62)));
    if (label) layers.push(`<span style="position:absolute;${left ? "left:-8px" : "right:-10px"};top:${t.dyn.level === 5 ? -14 : -6}px;${TITLE_FF};font-size:${fit}px;font-weight:900;letter-spacing:-0.06em;line-height:0.9;color:${color}">${esc(label)}</span>`);
  }
  // 기울인 판: 내용 뒤에 살짝 기울어진 면(강도 3=가는 외곽선 ±1°, 4=옅은 면 ±1.5°, 5=진한 면+하드 테두리 ±2.5°). 섹션 순번 홀짝으로 기울임 방향을 번갈아
  if (d.plate) {
    const sign = d.plate;
    const lv = t.dyn.level;
    const deg = (lv === 5 ? 2.5 : lv === 4 ? 1.5 : 1) * sign;
    const face = lv === 3 ? "transparent" : lv === 4 ? p.tints[0] : p.tints[1];
    const border = lv === 3 ? `1.5px solid ${hexToRgba(p.deep, 0.22)}` : lv === 5 ? `2px solid ${hexToRgba(p.ink, 0.5)}` : "none";
    layers.push(`<span style="position:absolute;left:${sign > 0 ? 3 : 7}%;right:${sign > 0 ? 7 : 3}%;top:16px;bottom:12px;border-radius:${Math.round(18 * t.radius)}px;background:${face};border:${border};transform:rotate(${deg}deg)"></span>`);
  }
  if (d.tape) layers.push(tape(p, { side: "right", top: 6, deg: 5 }));
  if (d.sticker) layers.push(sticker(d.sticker, p, { shape: "star", deg: -10, size: 70, pos: "right:5%;top:8px" }));
  const needsIso = layers.length > 0 || !!d.seam;
  if (needsIso) out = patchRoot(out, (st) => `${ensureRel(st)}${/isolation:/.test(st) ? "" : ";isolation:isolate"}`);
  if (layers.length) out = appendLayer(out, `<span aria-hidden="true" data-pz-dyn-deco data-pz-dyn-clip style="position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:-1">${layers.join("")}</span>`);
  // 이음새: 이 섹션 자기 배경색(단색일 때만)의 도형이 위 섹션 아래 여백 쪽으로 솟는다(top:-h). 루트가 overflow:hidden이면 하지 않는다
  if (d.seam) {
    const rootStyle = ROOT_RE.exec(out)?.[2] ?? "";
    const own = /(?:^|;)background:(#[0-9a-fA-F]{6})\b/.exec(rootStyle)?.[1];
    const h = t.dyn.level === 5 ? 34 : 28;
    if (own && !/overflow:\s*hidden/.test(rootStyle)) {
      out = appendLayer(out, `<span aria-hidden="true" data-pz-dyn-deco data-pz-seam="${d.seam.kind}" style="position:absolute;left:0;right:0;top:1px;height:${h}px;transform:translateY(-100%);pointer-events:none;z-index:-1;line-height:0">${seamShape(d.seam.kind, own, h)}</span>`);
    }
  }
  // 걸침: 이 섹션을 앞 섹션 위로 rise px 끌어올림(윗모서리 둥글게 + 위쪽 그림자), 앞 섹션은 extraBottom 만큼 아래 여백을 늘려 내용이 가려지지 않게
  if (d.rise) out = patchRoot(out, (st) => `${ensureRel(st)};margin-top:-${d.rise}px;z-index:2;border-radius:${Math.round(26 * t.radius)}px ${Math.round(26 * t.radius)}px 0 0;box-shadow:0 -12px 24px -16px ${hexToRgba(pal.ink, 0.35)}`);
  if (d.extraBottom) out = patchRoot(out, (st) => st.replace(/padding:([^;"]+)/, (m, v: string) => {
    const parts = v.trim().split(/\s+/);
    const num = (x: string): number => parseFloat(x);
    if (parts.length === 1) return `padding:${num(parts[0]!)}px ${parts[0]} ${num(parts[0]!) + d.extraBottom!}px`;
    if (parts.length === 2) return `padding:${parts[0]} ${parts[1]} ${num(parts[0]!) + d.extraBottom!}px`;
    if (parts.length >= 3) { const p3 = [...parts]; p3[2] = `${num(p3[2]!) + d.extraBottom!}px`; return `padding:${p3.join(" ")}`; }
    return m;
  }));
  return out.replace(/^(\s*<section)/, `$1 data-pz-dyn-done="1"`);
}
