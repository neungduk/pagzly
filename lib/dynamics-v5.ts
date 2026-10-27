/**
 * 467차 V5 — 다이나믹 부품 라이브러리. "사각 상자 + 같은 반경 + 같은 그림자"의 정적인 상세페이지를 깊이·겹침·스케일 대비·기울임·도형 전환으로 움직이게 하는 순수 함수 모음
 * (입력 → 인라인 HTML 문자열). `DESIGN_V5`가 켜졌을 때 v5 부품·후처리만 부른다 — 꺼짐에서는 이 모듈의 어떤 함수도 호출되지 않는다.
 *
 * 규칙(전 부품 공통, 회귀가 검사):
 *  · 글자는 항상 장식 위(z-index 1), 장식은 `aria-hidden="true"`·`pointer-events:none`·`data-pz-dyn-deco`. 장식이 넘칠 수 있는 부품은 `overflow:hidden` 래퍼를 안에 둔다(`clip`).
 *  · 새 문구·수치 없음: 글자는 인자로 받은 입력 원문뿐(반복 띠도 받은 단어를 그대로 반복). 장식은 도형·선·점·번호뿐.
 *  · 금지: clip-path·mask·filter·mix-blend-mode·textPath·foreignObject·<filter>·외부 주소·position:fixed·애니메이션. 사용: 인라인 스타일·transform(translate/rotate/scale)·
 *    음수 margin(overflow:hidden 안)·SVG(path·circle·ellipse·polygon·rect·linearGradient·radialGradient)·CSS gradient.
 *  · 750 초과 고정 폭 없음, `min-width:0`·`overflow-wrap:anywhere`로 320폭 안전. 결정적(시드 인자).
 *
 * 부품 표(인자 → 극단 입력 동작 → 대비 쌍):
 *  스케일 대비  bigWord · numeralStack · statBlock
 *  겹침·깊이    overlapStack · layeredCard · shadowPlate · floatingObject
 *  기울임·스티커 tiltCard · tape · sticker · ribbon · stampBadge
 *  면 전환      slantSeam · waveSeam · scallopSeam · zigzagSeam · stepSeam · overlapSeam
 *  강조 필기    highlighter · scribbleCircle · squiggleUnderline · arrowCallout
 *  구성         mosaic · polaroidStack · stepPath · gaugeRing · tickerBand · dotGrid · stripeField · gridPaper
 *  극단 입력: 빈 문자열은 빈 문자열을 돌려주고(장식만 남기지 않음), 긴 글은 `overflow-wrap:anywhere`·`overflow:hidden`·줄 수 제한으로 막는다.
 *  `v5-labels` 사용: 없음(번호·기호만).
 */
import type { V4Palette } from "@/lib/palette-v4";
import { SANS_FF, TITLE_FF, esc } from "@/lib/type-treatments";
import { contrastRatioToken, hexToRgba, mixHex } from "@/lib/design-tokens";

/** 결정적 의사난수(0~1). 같은 시드·색인이면 같은 값 */
export function rnd(seed: number, i = 0): number {
  let h = (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const DECO = `aria-hidden="true" data-pz-dyn-deco style="pointer-events:none;`;
const deco = (css: string, inner = ""): string => `<span ${DECO}${css}">${inner}</span>`;
/** 넘칠 수 있는 장식을 담는 래퍼 — 섹션 안 어디서든 가로 스크롤을 만들지 않는다 */
export const clip = (inner: string, css = ""): string => `<div data-pz-dyn-clip style="position:relative;overflow:hidden;${css}">${inner}</div>`;
const text = (inner: string, css = ""): string => `<div style="position:relative;z-index:1;min-width:0;${css}">${inner}</div>`;
const darkOf = (p: V4Palette): string => (contrastRatioToken("#FFFFFF", p.deep) >= 4.5 ? p.deep : p.ink);
const onColor = (bg: string): string => (contrastRatioToken("#FFFFFF", bg) >= contrastRatioToken("#1B1B18", bg) ? "#FFFFFF" : "#1B1B18");
const mark = (name: string): string => `data-pz-dyn="${name}"`;
const ellipsis = (lines: number): string => `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${lines};overflow:hidden`;

// ── 스케일 대비 ───────────────────────────────────────────────────────────────
/** 입력 단어/숫자를 120~220px급으로 배경에 깐다(가장자리 잘림 허용 — clip 래퍼 안). 글자 대비 쌍: 장식(투명도 낮은 색)이라 읽는 글자가 아니다 → aria-hidden */
export function bigWord(word: string, p: V4Palette, o: { size?: number; align?: "left" | "right" | "center"; top?: number; opacity?: number; seed?: number } = {}): string {
  const w = word.trim().slice(0, 14);
  if (!w) return "";
  const size = Math.max(120, Math.min(220, o.size ?? 160));
  const align = o.align ?? "right";
  const x = align === "left" ? "left:-6px" : align === "right" ? "right:-10px" : "left:50%;transform:translateX(-50%)";
  return deco(`position:absolute;${x};top:${o.top ?? 0}px;z-index:0;${TITLE_FF};font-size:${size}px;font-weight:900;letter-spacing:-0.06em;line-height:0.85;white-space:nowrap;color:${hexToRgba(p.deep, o.opacity ?? 0.1)}`, esc(w));
}

/** 큰 번호 + 작은 제목(번호가 먼저 눈에 들어온다). 번호색 대비: p.deep on 면(호출부가 면 위에 놓음, 큰 글자 3:1) */
export function numeralStack(no: string, title: string, p: V4Palette, o: { size?: number; ink?: string } = {}): string {
  const n = no.trim().slice(0, 4);
  if (!n && !title.trim()) return "";
  const size = Math.max(56, Math.min(120, o.size ?? 88));
  return `<div ${mark("numeralStack")} style="display:flex;align-items:flex-end;gap:14px;min-width:0"><span aria-hidden="true" style="flex:none;${TITLE_FF};font-size:${size}px;font-weight:900;letter-spacing:-0.06em;line-height:0.82;color:${p.deep}">${esc(n)}</span>` +
    `<span style="flex:1 1 0%;min-width:0;overflow-wrap:anywhere;${SANS_FF};font-size:17px;font-weight:700;line-height:1.35;color:${o.ink ?? p.ink};${ellipsis(3)}">${esc(title)}</span></div>`;
}

/** 입력 숫자를 크게 + 단위/라벨을 작게. 호출부가 `numeric-claim-gate`(checkText)를 통과시킨 값만 넘긴다(여기서는 새 수치를 만들지 않음) */
export function statBlock(value: string, unit: string, p: V4Palette, o: { size?: number; ink?: string } = {}): string {
  const v = value.trim().slice(0, 12);
  if (!v) return "";
  const size = Math.max(48, Math.min(112, o.size ?? 76));
  return `<div ${mark("statBlock")} style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;min-width:0"><span style="${TITLE_FF};font-size:${size}px;font-weight:900;letter-spacing:-0.05em;line-height:0.95;color:${p.deep};overflow-wrap:anywhere">${esc(v)}</span>` +
    (unit.trim() ? `<span style="${SANS_FF};font-size:16px;font-weight:700;line-height:1.3;color:${o.ink ?? p.ink};overflow-wrap:anywhere">${esc(unit.trim().slice(0, 16))}</span>` : "") + `</div>`;
}

// ── 겹침·깊이 ─────────────────────────────────────────────────────────────────
/** 사진 위로 글 카드가 걸친다(음수 마진) + 뒤에 어긋난 색 블록. photoHtml·cardHtml은 호출부가 만든 마크업. 카드 대비 쌍: 카드 안 글자(호출부)×카드 면 */
export function overlapStack(photoHtml: string, cardHtml: string, p: V4Palette, o: { lift?: number; side?: "left" | "right"; seed?: number } = {}): string {
  if (!photoHtml || !cardHtml) return photoHtml || cardHtml || "";
  const lift = Math.max(16, Math.min(64, o.lift ?? 36));
  const side = o.side ?? "right";
  const r = rnd(o.seed ?? 1, 0);
  return clip(
    deco(`position:absolute;${side}:0;top:${Math.round(10 + r * 12)}px;width:46%;height:62%;background:${p.tints[2]};border-radius:14px;z-index:0`) +
    `<div ${mark("overlapStack")} style="position:relative;z-index:1;padding:0 ${side === "right" ? "14px 0 0" : "0 0 14px"}">${photoHtml}</div>` +
    `<div style="position:relative;z-index:2;margin:-${lift}px ${side === "right" ? "0 0 14px" : "14px 0 0"};min-width:0">${cardHtml}</div>`,
    "padding-top:12px",
  );
}

/** 뒤 카드 1~2장이 살짝 어긋나 보이는 덱. 앞 카드 대비 쌍은 호출부 */
export function layeredCard(inner: string, p: V4Palette, o: { layers?: 1 | 2; seed?: number } = {}): string {
  if (!inner) return "";
  const n = o.layers ?? 2;
  const back = (i: number): string => deco(`position:absolute;left:${6 + i * 6}px;right:${-4 - i * 6}px;top:${8 + i * 8}px;bottom:${-8 - i * 8}px;border-radius:18px;background:${i ? p.tints[1] : p.tints[2]};transform:rotate(${(i ? -1.4 : 1.6) * (rnd(o.seed ?? 3, i) > 0.5 ? 1 : -1)}deg);z-index:0`);
  return clip(`<div ${mark("layeredCard")} style="position:relative;padding:0 10px 16px 0">${[...Array(n).keys()].map(back).join("")}<div style="position:relative;z-index:1;min-width:0">${inner}</div></div>`);
}

export type PlateKind = "hard" | "soft" | "float";
/** 그림자 3단계 접시(카드 깊이). hard=하드 오프셋, soft=번짐, float=떠 있음 */
export function shadowPlate(inner: string, p: V4Palette, kind: PlateKind = "soft", o: { bg?: string; radius?: number } = {}): string {
  if (!inner) return "";
  const sh = kind === "hard" ? `6px 6px 0 ${p.ink}` : kind === "float" ? `0 22px 34px -16px ${hexToRgba(p.ink, 0.38)}` : `0 8px 22px ${hexToRgba(p.ink, 0.12)}`;
  return `<div ${mark("shadowPlate")} style="box-sizing:border-box;padding:18px;border-radius:${o.radius ?? 16}px;background:${o.bg ?? "#FFFFFF"};border:${kind === "hard" ? `2px solid ${p.ink}` : `1px solid ${hexToRgba(p.ink, 0.1)}`};box-shadow:${sh};min-width:0">${inner}</div>`;
}

/** 제품 사진 뒤 컬러 원(블롭) + 바닥 그림자 타원 — 사진은 사각 그대로여도 뒤 레이어로 입체감. 사진 위 글자 없음 */
export function floatingObject(photoHtml: string, p: V4Palette, o: { seed?: number } = {}): string {
  if (!photoHtml) return "";
  const r = rnd(o.seed ?? 5, 1);
  return clip(
    deco(`position:absolute;left:${Math.round(8 + r * 14)}%;top:4%;width:74%;aspect-ratio:1 / 1;border-radius:50%;background:radial-gradient(circle at 35% 30%,${p.tints[1]} 0%,${p.tints[3]} 100%);z-index:0`) +
    `<div ${mark("floatingObject")} style="position:relative;z-index:1;width:78%;margin:0 auto">${photoHtml}</div>` +
    deco(`position:absolute;left:18%;right:18%;bottom:2px;height:18px;border-radius:50%;background:radial-gradient(ellipse at center,${hexToRgba(p.ink, 0.28)} 0%,${hexToRgba(p.ink, 0)} 70%);z-index:0`),
    "padding:8px 0 22px",
  );
}

// ── 기울임·스티커 ─────────────────────────────────────────────────────────────
/** ±1~4도 기울인 카드. 넘침 방지를 위해 호출부는 clip 안에 둔다 */
export function tiltCard(inner: string, p: V4Palette, o: { deg?: number; bg?: string } = {}): string {
  if (!inner) return "";
  const deg = Math.max(-4, Math.min(4, o.deg ?? -2));
  return `<div ${mark("tiltCard")} style="box-sizing:border-box;padding:18px;border-radius:12px;background:${o.bg ?? "#FFFFFF"};border:1px solid ${hexToRgba(p.ink, 0.12)};box-shadow:0 12px 22px -12px ${hexToRgba(p.ink, 0.35)};transform:rotate(${deg}deg);min-width:0">${inner}</div>`;
}

/** 모서리 테이프(반투명 띠). 장식 */
export function tape(p: V4Palette, o: { side?: "left" | "right"; top?: number; deg?: number } = {}): string {
  const side = o.side ?? "left";
  return deco(`position:absolute;${side}:12%;top:${o.top ?? -8}px;width:64px;height:20px;background:${hexToRgba(p.tints[3], 0.78)};border-left:2px dotted ${hexToRgba(p.ink, 0.12)};border-right:2px dotted ${hexToRgba(p.ink, 0.12)};transform:rotate(${o.deg ?? (side === "left" ? -6 : 6)}deg);z-index:3`);
}

/** 원/별형 스티커 + 입력 짧은 단어/번호(가로 글자). 글자색은 면 대비 4.5:1 자동 */
export function sticker(label: string, p: V4Palette, o: { shape?: "circle" | "star"; deg?: number; size?: number; pos?: string } = {}): string {
  const t = label.trim().slice(0, 8);
  if (!t) return "";
  const size = Math.max(56, Math.min(96, o.size ?? 76));
  const bg = o.shape === "star" ? p.point : darkOf(p);
  const fg = onColor(bg);
  const shape = o.shape === "star"
    ? `<polygon points="50,2 61,22 84,16 80,40 98,56 77,67 76,92 52,84 36,98 28,75 4,70 18,50 6,30 28,28" fill="${bg}"/>`
    : `<circle cx="50" cy="50" r="48" fill="${bg}"/><circle cx="50" cy="50" r="41" fill="none" stroke="${fg}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  return `<span ${mark("sticker")} style="position:absolute;${o.pos ?? "right:6%;top:-10px"};z-index:4;width:${size}px;height:${size}px;transform:rotate(${o.deg ?? -8}deg)"><svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false" style="display:block">${shape}</svg>` +
    `<span style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:10px;${SANS_FF};font-size:13px;font-weight:800;line-height:1.15;color:${fg};overflow:hidden;overflow-wrap:anywhere">${esc(t)}</span></span>`;
}

/** 코너 리본(가로 글자). clip 래퍼 안에서 카드 모서리에 */
export function ribbon(label: string, p: V4Palette, o: { corner?: "tl" | "tr" } = {}): string {
  const t = label.trim().slice(0, 10);
  if (!t) return "";
  const bg = darkOf(p);
  const left = o.corner === "tl";
  return `<span ${mark("ribbon")} style="position:absolute;${left ? "left:-34px" : "right:-34px"};top:14px;z-index:4;width:132px;padding:5px 0;text-align:center;${SANS_FF};font-size:12px;font-weight:800;letter-spacing:0.04em;line-height:1.2;color:${onColor(bg)};background:${bg};transform:rotate(${left ? -40 : 40}deg);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(t)}</span>`;
}

/** 원형 인장(글자는 가로, textPath 금지): 이중 원 + 짧은 단어 */
export function stampBadge(label: string, p: V4Palette, o: { size?: number; deg?: number } = {}): string {
  const t = label.trim().slice(0, 6);
  if (!t) return "";
  const size = Math.max(64, Math.min(104, o.size ?? 84));
  const c = p.deep;
  return `<span ${mark("stampBadge")} style="display:inline-flex;position:relative;width:${size}px;height:${size}px;transform:rotate(${o.deg ?? -10}deg)"><svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false" style="display:block"><circle cx="50" cy="50" r="47" fill="none" stroke="${c}" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="2 3"/></svg>` +
    `<span style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;padding:14px;${TITLE_FF};font-size:15px;font-weight:900;line-height:1.1;color:${c};overflow:hidden;overflow-wrap:anywhere">${esc(t)}</span></span>`;
}

// ── 면 전환 도형(이음새) ──────────────────────────────────────────────────────
export type SeamKind = "slant" | "wave" | "scallop" | "zigzag" | "step";
/** 위 면(top)에서 아래 면(bottom)으로 이어지는 도형 띠. 섹션 맨 위에 높이 h 로 깔면 위 면 색이 아래 면 색으로 도형을 따라 바뀐다 */
export function seam(kind: SeamKind, top: string, bottom: string, o: { h?: number; seed?: number; flip?: boolean } = {}): string {
  const h = Math.max(16, Math.min(72, o.h ?? 36));
  const W = 400;
  let d = "";
  if (kind === "slant") d = o.flip ? `M0 0 H${W} V${h} Z` : `M0 ${h} L${W} 0 V${h} Z`;
  else if (kind === "wave") d = `M0 ${h} V${h * 0.55} C${W * 0.15} ${h * 0.05} ${W * 0.3} ${h * 0.05} ${W * 0.5} ${h * 0.5} S${W * 0.85} ${h * 0.95} ${W} ${h * 0.4} V${h} Z`;
  else if (kind === "scallop") { const n = 6; const w = W / n; d = `M0 ${h} V${h * 0.5}` + [...Array(n).keys()].map((i) => ` A${w / 2} ${h * 0.5} 0 0 1 ${(i + 1) * w} ${h * 0.5}`).join("") + ` V${h} Z`; }
  else if (kind === "zigzag") { const n = 6; const w = W / n; d = `M0 ${h} V${h * 0.4}` + [...Array(n).keys()].map((i) => ` L${i * w + w / 2} ${h * 0.05} L${(i + 1) * w} ${h * 0.4}`).join("") + ` V${h} Z`; }
  else { const n = 4; const w = W / n; d = `M0 ${h}` + [...Array(n).keys()].map((i) => ` V${h * (1 - (i + 1) / (n + 1))} H${(i + 1) * w}`).join("") + ` V${h} Z`; }
  return `<span aria-hidden="true" data-pz-dyn-deco data-pz-seam="${kind}" style="display:block;pointer-events:none;width:100%;height:${h}px;line-height:0;background:${top}"><svg viewBox="0 0 ${W} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="display:block"><path d="${d}" fill="${bottom}"/></svg></span>`;
}
/** 이 섹션 자기 색(own)만 칠한 가장자리 도형: 위쪽 가장자리가 도형을 이루고 그 위는 투명(위 섹션이 비친다). 이음새 레이어 전용 */
export function seamShape(kind: SeamKind, own: string, h: number): string {
  // seam()과 같은 path를 쓰되 바깥 span 없이 svg만(크기 절약 — 이음새 레이어가 위치를 잡는다)
  const full = seam(kind, "transparent", own, { h });
  return full.replace(/^<span[^>]*>/, "").replace(/<\/span>$/, "");
}
export const slantSeam = (top: string, bottom: string, h?: number): string => seam("slant", top, bottom, { h });
export const waveSeam = (top: string, bottom: string, h?: number): string => seam("wave", top, bottom, { h });
export const scallopSeam = (top: string, bottom: string, h?: number): string => seam("scallop", top, bottom, { h });
export const zigzagSeam = (top: string, bottom: string, h?: number): string => seam("zigzag", top, bottom, { h });
export const stepSeam = (top: string, bottom: string, h?: number): string => seam("step", top, bottom, { h });

/** 다음 섹션 첫 요소를 이전 면으로 끌어올린다(음수 마진). 호출부는 이전 섹션 아래 여백이 rise 이상이어야 한다 */
export function overlapSeam(inner: string, rise = 28): string {
  if (!inner) return "";
  const r = Math.max(12, Math.min(56, rise));
  return `<div ${mark("overlapSeam")} style="position:relative;z-index:2;margin-top:-${r}px;min-width:0">${inner}</div>`;
}

// ── 강조 필기 ─────────────────────────────────────────────────────────────────
/** 형광펜 띠(기울어진 그라디언트 바). 글자 대비 쌍: 잉크 × 옅은 띠(알파 0.38 이하) */
export function highlighter(textStr: string, p: V4Palette, o: { seed?: number } = {}): string {
  const t = textStr.trim();
  if (!t) return "";
  const a = 0.34 + rnd(o.seed ?? 7, 0) * 0.04;
  return `<span ${mark("highlighter")} style="background-image:linear-gradient(100deg,${hexToRgba(p.point, 0)} 0%,${hexToRgba(p.point, a)} 6%,${hexToRgba(p.point, a)} 94%,${hexToRgba(p.point, 0)} 100%);background-repeat:no-repeat;background-size:100% 46%;background-position:0 88%;box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 4px">${esc(t)}</span>`;
}

/** 입력 키워드를 둘러싼 손그림 같은 타원(시드로 결정적 흔들림). 글자는 위(z 1) */
export function scribbleCircle(textStr: string, p: V4Palette, o: { seed?: number } = {}): string {
  const t = textStr.trim();
  if (!t) return "";
  const s = o.seed ?? 11;
  const j = (i: number) => Math.round((rnd(s, i) - 0.5) * 6);
  const d = `M${14 + j(0)} ${28 + j(1)} C${6 + j(2)} ${6 + j(3)} ${70 + j(4)} ${-2 + j(5)} ${108 + j(6)} ${10 + j(7)} C${126 + j(8)} ${22 + j(9)} ${112 + j(10)} ${46 + j(11)} ${64 + j(12)} ${48 + j(13)} C${20 + j(14)} ${50 + j(15)} ${4 + j(16)} ${34 + j(17)} ${28 + j(18)} ${14 + j(19)}`;
  return `<span ${mark("scribbleCircle")} style="position:relative;display:inline-block;padding:2px 10px"><span style="position:relative;z-index:1">${esc(t)}</span>${deco(`position:absolute;left:-4px;right:-4px;top:-6px;bottom:-6px;z-index:0`, `<svg viewBox="0 0 120 52" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="display:block"><path d="${d}" fill="none" stroke="${p.point}" stroke-width="2.4" stroke-linecap="round"/></svg>`)}</span>`;
}

/** 물결 밑줄(SVG path) */
export function squiggleUnderline(textStr: string, p: V4Palette, o: { seed?: number } = {}): string {
  const t = textStr.trim();
  if (!t) return "";
  const amp = 2 + rnd(o.seed ?? 13, 0) * 1.5;
  const d = `M0 5 ` + [...Array(10).keys()].map((i) => `Q${i * 12 + 3} ${5 - amp} ${i * 12 + 6} 5 T${i * 12 + 12} 5`).join(" ");
  return `<span ${mark("squiggleUnderline")} style="position:relative;display:inline-block;padding-bottom:7px"><span>${esc(t)}</span>${deco(`position:absolute;left:0;right:0;bottom:0;height:8px`, `<svg viewBox="0 0 120 10" width="100%" height="8" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="display:block"><path d="${d}" fill="none" stroke="${p.deep}" stroke-width="2" stroke-linecap="round"/></svg>`)}</span>`;
}

/** 곡선 화살표(SVG) + 입력 짧은 문구 */
export function arrowCallout(textStr: string, p: V4Palette, o: { dir?: "down-left" | "down-right" } = {}): string {
  const t = textStr.trim().slice(0, 28);
  if (!t) return "";
  const right = o.dir === "down-right";
  const d = right ? "M4 6 C30 0 52 22 50 46 M50 46 l-7 -9 M50 46 l9 -7" : "M56 6 C30 0 8 22 10 46 M10 46 l-9 -7 M10 46 l9 -9";
  return `<div ${mark("arrowCallout")} style="display:flex;align-items:flex-start;gap:8px;min-width:0;flex-direction:${right ? "row" : "row-reverse"};justify-content:flex-end"><span style="${SANS_FF};font-size:15px;font-weight:700;line-height:1.35;color:${p.ink};overflow-wrap:anywhere;${ellipsis(2)}">${esc(t)}</span>` +
    `<span aria-hidden="true" data-pz-dyn-deco style="flex:none;pointer-events:none;width:58px;height:50px"><svg viewBox="0 0 60 52" width="58" height="50" aria-hidden="true" focusable="false" style="display:block"><path d="${d}" fill="none" stroke="${p.deep}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>`;
}

// ── 구성 부품 ─────────────────────────────────────────────────────────────────
type Img = { url: string; pos?: string };
const tile = (im: Img | undefined, css: string, p: V4Palette, alt: string): string =>
  `<div style="position:relative;overflow:hidden;background:${p.tints[1]};${css}">${im?.url ? `<img src="${esc(im.url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${im.pos ?? "50% 45%"}"/>` : ""}</div>`;

/** 사진 3~5장을 크기·오프셋이 다른 타일로. 사진이 부족하면 빈 타일(폴백 톤 + 사선은 photo-fallback이 입힌다)로 채운다 */
export function mosaic(imgs: Img[], p: V4Palette, alt: string, o: { seed?: number } = {}): string {
  const list = imgs.filter((x) => x?.url).slice(0, 5);
  if (!list.length) return "";
  const n = Math.max(3, list.length);
  const at = (i: number) => list[i];
  const flip = rnd(o.seed ?? 17, 0) > 0.5;
  return `<div ${mark("mosaic")} style="display:flex;gap:8px;align-items:flex-start;min-width:0;${flip ? "flex-direction:row-reverse" : ""}">` +
    `<div style="flex:0 0 58%;min-width:0">${tile(at(0), "aspect-ratio:4 / 5;border-radius:14px", p, alt)}</div>` +
    `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;gap:8px;margin-top:${flip ? 18 : 28}px">${tile(at(1), "aspect-ratio:1 / 1;border-radius:50%", p, alt)}${n > 2 ? tile(at(2), "aspect-ratio:3 / 4;border-radius:12px", p, alt) : ""}</div></div>` +
    (n > 3 ? `<div style="display:flex;gap:8px;margin-top:8px;padding-left:${flip ? 0 : 14}%;min-width:0"><div style="flex:1 1 0%;min-width:0">${tile(at(3), "aspect-ratio:16 / 10;border-radius:10px", p, alt)}</div>${list[4] ? `<div style="flex:0 0 30%;min-width:0">${tile(at(4), "aspect-ratio:1 / 1;border-radius:10px", p, alt)}</div>` : ""}</div>` : "");
}

/** 폴라로이드 2~3장 겹침(기울임). clip 래퍼 안에서 */
export function polaroidStack(imgs: Img[], p: V4Palette, alt: string, o: { seed?: number } = {}): string {
  const list = imgs.filter((x) => x?.url).slice(0, 3);
  if (!list.length) return "";
  const degs = [-5, 3, -2];
  const card = (im: Img, i: number): string => `<div style="position:${i ? "absolute" : "relative"};${i ? `left:${i === 1 ? 34 : 18}%;top:${i * 14}px;` : ""}width:66%;box-sizing:border-box;padding:8px 8px 26px;background:#FFFFFF;border:1px solid ${hexToRgba(p.ink, 0.1)};box-shadow:0 14px 24px -14px ${hexToRgba(p.ink, 0.45)};transform:rotate(${degs[i]! + Math.round((rnd(o.seed ?? 19, i) - 0.5) * 2)}deg);z-index:${i + 1}">${tile(im, "aspect-ratio:1 / 1", p, alt)}</div>`;
  return clip(`<div ${mark("polaroidStack")} style="position:relative;padding-bottom:${list.length > 1 ? 40 : 8}px">${list.map(card).join("")}</div>`, "padding:10px 4px");
}

/** 번호 원들을 점선 곡선으로 연결(사용 순서). 번호는 1..n(최대 6) — 새 문구 없음 */
export function stepPath(n: number, p: V4Palette): string {
  const k = Math.max(2, Math.min(6, Math.floor(n)));
  const W = 320; const H = 64; const gap = (W - 40) / (k - 1);
  const pts = [...Array(k).keys()].map((i) => [20 + i * gap, i % 2 ? 44 : 20] as const);
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < k; i += 1) { const [x0, y0] = pts[i - 1]!; const [x1, y1] = pts[i]!; d += ` C${x0 + gap / 2} ${y0} ${x1 - gap / 2} ${y1} ${x1} ${y1}`; }
  const fg = onColor(darkOf(p));
  return `<div ${mark("stepPath")} aria-hidden="true" style="position:relative;max-width:${W}px;margin:0 auto;height:${H}px;pointer-events:none"><svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-hidden="true" focusable="false" style="display:block;position:absolute;left:0;top:0"><path d="${d}" fill="none" stroke="${p.tints[4]}" stroke-width="2.4" stroke-dasharray="2 6" stroke-linecap="round"/>` +
    pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="13" fill="${darkOf(p)}"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="${fg}">${i + 1}</text>`).join("") + `</svg></div>`;
}

/** 링 게이지 — 입력이 비율(0~100)을 직접 줄 때만. 호출부가 `numeric-claim-gate`를 통과시킨 값만 넘긴다. 범위 밖이면 빈 문자열 */
export function gaugeRing(pct: number, p: V4Palette, o: { size?: number; label?: string } = {}): string {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return "";
  const size = Math.max(72, Math.min(140, o.size ?? 104));
  const r = 42; const c = 2 * Math.PI * r;
  return `<span ${mark("gaugeRing")} style="position:relative;display:inline-block;width:${size}px;height:${size}px"><svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false" style="display:block;transform:rotate(-90deg)"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${p.tints[1]}" stroke-width="9"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${p.deep}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>` +
    `<span style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;${TITLE_FF};font-size:${Math.round(size * 0.24)}px;font-weight:900;color:${p.ink}">${esc(o.label ?? String(pct))}</span></span>`;
}

/** 입력에 이미 있는 단어(상품명·브랜드·키워드)를 반복한 기울어진 띠. 반복 횟수 고정, 문구 가공 금지. clip 래퍼 안, 글자 대비 쌍: 띠 글자 × 띠 면(자동) */
export function tickerBand(words: string[], p: V4Palette, o: { deg?: number; repeat?: number } = {}): string {
  const ws = words.map((w) => w.trim()).filter(Boolean).slice(0, 4);
  if (!ws.length) return "";
  const rep = Math.max(2, Math.min(4, o.repeat ?? 3));
  const bg = darkOf(p);
  const fg = onColor(bg);
  const line = [...Array(rep).keys()].flatMap(() => ws).map((w) => `<span style="flex:none">${esc(w)}</span><span aria-hidden="true" style="flex:none;align-self:center;width:7px;height:7px;border-radius:50%;background:currentColor;opacity:0.7"></span>`).join("");
  return clip(`<div ${mark("tickerBand")} style="margin:0 -12px;transform:rotate(${o.deg ?? -2}deg);background:${bg};color:${fg};padding:10px 0;overflow:hidden"><div style="display:flex;gap:18px;white-space:nowrap;${TITLE_FF};font-size:18px;font-weight:900;letter-spacing:0.02em;line-height:1.2">${line}</div></div>`, "padding:10px 0");
}

/** 점 격자 배경(CSS gradient). 면 위에 깔 때 `background:`에 그대로 */
export function dotGrid(p: V4Palette, o: { step?: number; alpha?: number } = {}): string {
  const s = o.step ?? 18;
  return `radial-gradient(${hexToRgba(p.deep, o.alpha ?? 0.16)} 1.5px,transparent 1.6px) 0 0 / ${s}px ${s}px`;
}
/** 줄무늬 배경(CSS gradient) */
export function stripeField(p: V4Palette, o: { step?: number; alpha?: number; deg?: number } = {}): string {
  const s = o.step ?? 14;
  return `repeating-linear-gradient(${o.deg ?? 135}deg,${hexToRgba(p.deep, o.alpha ?? 0.07)} 0 2px,transparent 2px ${s}px)`;
}
/** 모눈 배경(CSS gradient) */
export function gridPaper(p: V4Palette, o: { step?: number; alpha?: number } = {}): string {
  const s = o.step ?? 24;
  const c = hexToRgba(p.deep, o.alpha ?? 0.09);
  return `linear-gradient(${c} 1px,transparent 1px) 0 0 / ${s}px ${s}px,linear-gradient(90deg,${c} 1px,transparent 1px) 0 0 / ${s}px ${s}px`;
}

/** 위 면과 아래 면을 이어 주는 이음새를 mixHex 로 중간 톤까지 쓰고 싶을 때(두 면 색의 평균) */
export const midTone = (a: string, b: string): string => mixHex(a, b, 0.5);

export const DYN_PARTS = [
  "bigWord", "numeralStack", "statBlock", "overlapStack", "layeredCard", "shadowPlate", "floatingObject", "tiltCard", "tape", "sticker", "ribbon", "stampBadge",
  "slantSeam", "waveSeam", "scallopSeam", "zigzagSeam", "stepSeam", "overlapSeam", "highlighter", "scribbleCircle", "squiggleUnderline", "arrowCallout",
  "mosaic", "polaroidStack", "stepPath", "gaugeRing", "tickerBand", "dotGrid", "stripeField", "gridPaper",
] as const;
