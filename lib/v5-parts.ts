/**
 * 465차 V5 — 부품 라이브러리: 새 변형 24개 + 번호 양식·마커·사진 프레임 부품. `DESIGN_V5`가 켜졌을 때만 `v4Html`이 이 렌더를 부른다(`V5_PARTS`).
 * 문구는 모두 입력 원문(제목·본문·질문·답·항목·인용문)이다. 추가되는 글자는 순번(01, I)과 `lib/v5-labels.ts`의 닫힌 표지뿐이다.
 * 반경·테두리·그림자·종이색은 여기서 하드코딩해도 `applyArchetypeHtml`(impactHtml 끝)이 아키타입 토큰으로 다시 쓴다 — 같은 변형이 아키타입마다 다른 모양이 된다.
 * 극단 입력(0·1·12개, 150자 한글, 영문·숫자 혼합)에서 넘치지 않도록 `min-width:0`·`overflow-wrap:anywhere`를 쓴다. 사진 틀은 overflow:hidden + aspect-ratio라
 * 사진 실패 폴백(`photo-fallback`)이 그대로 동작한다.
 */
import type { ImpactSection, V4Block } from "@/lib/types/generate";
import { CHECK, NUM, faceRole, headingHtml, img, wrap, zigzagLabelColor, type V5Parts } from "@/lib/layout-variants";
import { depthShadow, hairline, type V4Palette } from "@/lib/palette-v4";
import { SANS_FF, TITLE_FF, esc, numberStatHtml, typeCss } from "@/lib/type-treatments";
import { contrastRatioToken, hexToRgba, mixHex } from "@/lib/design-tokens";
import { ARCHETYPES, type ArchetypeId, type ArchetypeTokens, type BadgeShape, type FrameKind, type MarkerKind, type NumberStyle } from "@/lib/page-archetype-v5";
import { romanOf, v5Label } from "@/lib/v5-labels";
import { splitLead } from "@/lib/info-style";
import { pickIconsV4, iconV4Svg } from "@/lib/icons";
import { gaugeRing, mosaic, polaroidStack, shadowPlate, statBlock, tickerBand } from "@/lib/dynamics-v5";
import { buildAnnotatedImageOverlaySvg } from "@/lib/annotated-image-overlay-svg";
import { bleedPhoto, cardFace, heroNumber, layerDeck, offsetStack, pullOut, splitAsym, staggerGrid } from "@/lib/compose-v5";
import { fitTitlePx } from "@/lib/page-archetype-v5";
import { SCENE_MIN_PX } from "@/lib/layout-variants";

/** 320폭 가용 폭(px) — page-archetype-v5.FIT_AVAIL_PX와 같은 값 */
const FIT_AVAIL = 272;
const SCENE_ALIGN = ["left", "center", "right"] as const;
const sceneAlign = (b: V4Block): (typeof SCENE_ALIGN)[number] => SCENE_ALIGN[b.sceneAt ?? 0]!;

/** 470차 장면(계열 공통, benefits·proof·concern): 첫 항목 제목이 화면을 채우는 큰 글자, 나머지 항목은 번호 줄. 모든 글은 입력 항목 그대로 */
function listScene(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  const items = b.items ?? [];
  if (items.length < 2) return null;
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  const [first, ...rest] = items;
  const ta = sceneAlign(b);
  const size = fitTitlePx(first!.title, 60, SCENE_MIN_PX, 6);
  const big = `<p style="margin:0;text-align:${ta};font-size:${size}px;line-height:1.2;font-weight:${Math.max(t.type.weight, 800)};letter-spacing:-0.03em;color:${on.text};word-break:keep-all;overflow-wrap:anywhere;--pz-fixed:1">${esc(first!.title)}</p>${first!.body ? `<p style="margin:16px 0 0;text-align:${ta};overflow-wrap:anywhere;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(first!.body)}</p>` : ""}`;
  const rows = rest.map((it, i) => `<div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-top:1px solid ${hexToRgba(p.ink, 0.16)}">${numberMark(t.number, i + 1, b, p)}<div style="flex:1 1 0%;min-width:0;padding-top:2px">${titleP(it.title, p, 17)}${bodyP(it.body, p, on.sub, 4)}</div></div>`).join("");
  return wrap(b, p, `${big}<div style="margin-top:30px">${rows}</div>`, { head, minH: 640, pad: "72px 24px" });
}

const tokensOf = (s: ImpactSection): ArchetypeTokens => ARCHETYPES[(s.ax && s.ax in ARCHETYPES ? s.ax : "editorial") as ArchetypeId];

/** 흰 글자가 올라가는 진한 면(4.5:1 미달이면 잉크) */
const darkOf = (p: V4Palette): string => (contrastRatioToken("#FFFFFF", p.deep) >= 4.5 ? p.deep : p.ink);

// ── 번호 양식 · 마커 ───────────────────────────────────────────────────────────
export function numberMark(style: NumberStyle, i: number, b: V4Block, p: V4Palette, big = false): string {
  const on = p.onFace[faceRole(b)];
  // 466차 — big=true(장점 stackbig처럼 번호가 주인공인 자리): 번호를 한 단계 크게(눈이 번호로 먼저 가게). 크기만 키우고 새 글자는 없다
  switch (style) {
    case "circle": { const d = big ? 46 : 34; return `<span aria-hidden="true" style="flex:none;display:flex;align-items:center;justify-content:center;width:${d}px;height:${d}px;border-radius:50%;background:${darkOf(p)};color:#FFFFFF;${SANS_FF};font-size:${big ? 18 : 14}px;font-weight:800">${i + 1}</span>`; }
    case "roman": return `<span aria-hidden="true" style="flex:none;min-width:${big ? 64 : 34}px;${TITLE_FF};font-size:${big ? 52 : 22}px;font-weight:700;line-height:1.05;color:${zigzagLabelColor(b, p, on.strong)}">${romanOf(i + 1)}</span>`;
    case "box": { const d = big ? 46 : 34; return `<span aria-hidden="true" style="flex:none;display:flex;align-items:center;justify-content:center;width:${d}px;height:${d}px;box-sizing:border-box;border:2px solid ${p.ink};${SANS_FF};font-size:${big ? 17 : 13}px;font-weight:800;color:${p.ink}">${NUM(i + 1)}</span>`; }
    default: return `<span aria-hidden="true" data-pz-deco style="flex:none;min-width:${big ? 64 : 48}px;${TITLE_FF};font-size:${big ? 56 : 40}px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:${p.tints[3]}">${NUM(i + 1)}</span>`;
  }
}

export function markerSvg(kind: MarkerKind, color: string, size = 18): string {
  const open = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" style="display:block;flex:none">`;
  switch (kind) {
    case "dot": return `${open}<circle cx="12" cy="12" r="6" fill="${color}"/></svg>`;
    case "dash": return `${open}<path d="M5 12 H19" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
    case "arrow": return `${open}<path d="M9 5 L16 12 L9 19" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    case "square": return `${open}<rect x="6" y="6" width="12" height="12" fill="${color}"/></svg>`;
    default: return CHECK(color, size);
  }
}

// ── 사진 프레임 6종 ────────────────────────────────────────────────────────────
export function photoFrame(kind: FrameKind, url: string, alt: string, pos: string | undefined, p: V4Palette, aspect = "4 / 3"): string {
  const inner = (ar: string, extra = "") => `<div style="position:relative;aspect-ratio:${ar};overflow:hidden;background:${p.tints[1]};${extra}">${img(url, alt, pos)}</div>`;
  switch (kind) {
    case "round": return inner(aspect, "border-radius:28px");
    case "arch": return `<div style="width:80%;margin:0 auto">${inner("3 / 4", "border-radius:999px 999px 20px 20px")}</div>`;
    case "offset": return `<div style="position:relative;padding:0 14px 14px 0"><div aria-hidden="true" style="position:absolute;right:0;bottom:0;width:88%;height:88%;border-radius:12px;background:${p.tints[2]}"></div><div style="position:relative">${inner(aspect, "border-radius:12px")}</div></div>`;
    case "tape": return `<div style="position:relative;padding:10px 0 0">${inner(aspect, "border-radius:6px;border:6px solid #FFFFFF;box-sizing:border-box;box-shadow:" + depthShadow("soft", p.ink))}<span aria-hidden="true" style="position:absolute;left:14%;top:0;width:64px;height:18px;background:${hexToRgba(p.accent, 0.35)};transform:rotate(-6deg)"></span><span aria-hidden="true" style="position:absolute;right:14%;top:0;width:64px;height:18px;background:${hexToRgba(p.accent, 0.35)};transform:rotate(5deg)"></span></div>`;
    case "double": return `<div style="box-sizing:border-box;padding:8px;border:2px solid ${p.ink}">${inner(aspect)}</div>`;
    default: return inner(aspect, "border-radius:12px");
  }
}

/** 배지 4종(원·인장·리본·육각형) — 안에는 체크 기호만 */
export function badgeShape(shape: BadgeShape, p: V4Palette, size = 60): string {
  const dark = darkOf(p);
  const chk = (c: string) => CHECK(c, Math.round(size * 0.44));
  switch (shape) {
    case "seal": return `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;margin:0 auto;box-sizing:border-box;border-radius:50%;border:3px double ${p.deep};background:#FFFFFF">${chk(p.deep)}</span>`;
    case "ribbon": return `<span style="display:block;width:${size - 8}px;margin:0 auto"><span style="display:flex;align-items:center;justify-content:center;height:${size - 8}px;border-radius:10px 10px 0 0;background:${dark}">${chk("#FFFFFF")}</span><span aria-hidden="true" style="display:block;width:0;height:0;border-left:${(size - 8) / 2}px solid ${dark};border-right:${(size - 8) / 2}px solid ${dark};border-bottom:12px solid transparent"></span></span>`;
    case "hex": return `<span style="display:block;position:relative;width:${size}px;height:${size}px;margin:0 auto"><svg viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true" style="display:block"><polygon points="30,3 55,17 55,43 30,57 5,43 5,17" fill="${dark}"/></svg><span style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${chk("#FFFFFF")}</span></span>`;
    default: return `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;margin:0 auto;border-radius:50%;background:${dark}">${chk("#FFFFFF")}</span>`;
  }
}

const bodyP = (text: string | undefined, p: V4Palette, color: string, mt = 6): string => (text ? `<p style="margin:${mt}px 0 0;overflow-wrap:anywhere;${typeCss("small", color, "white-space:pre-line")}">${esc(text)}</p>` : "");
const titleP = (text: string, p: V4Palette, size = 16): string => `<p style="margin:0;overflow-wrap:anywhere;${typeCss("card", p.ink, `font-size:${size}px`)}">${esc(text)}</p>`;

// ── benefits ──────────────────────────────────────────────────────────────────
function benefitsV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  if (b.variant === "scene") return listScene(s, b, p, t);
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  if (b.variant === "stackbig") {
    const rows = items.map((it, i) => `<div style="display:flex;gap:16px;align-items:flex-start;padding:18px 0;${i ? `border-top:1px solid ${hexToRgba(p.ink, 0.14)}` : `border-top:2px solid ${p.ink}`}">${numberMark(t.number, i, b, p, true)}<div style="flex:1 1 0%;min-width:0;padding-top:2px">${titleP(it.title, p, 17)}${bodyP(it.body, p, on.sub)}</div></div>`).join("");
    return wrap(b, p, `<div style="border-bottom:1px solid ${hexToRgba(p.ink, 0.14)}">${rows}</div>`, { head });
  }
  if (b.variant === "rows2") {
    const icons = pickIconsV4(items);
    const cards = items.map((it, i) => `<div style="flex:1 1 calc(50% - 5px);min-width:140px;box-sizing:border-box;padding:16px;border-radius:16px;background:${i % 3 === 1 ? mixHex(p.secondary, "#FFFFFF", 0.86) : p.tints[0]}"><span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${darkOf(p)}">${icons ? iconV4Svg(icons[i]!, { color: "#FFFFFF", px: 18 }) : markerSvg(t.marker, "#FFFFFF", 16)}</span><div style="margin-top:10px">${titleP(it.title, p, 15)}</div>${bodyP(it.body, p, on.sub, 4)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  if (b.variant === "stagger") {
    // 468차 구도: 두 열 카드를 엇갈리게(오른쪽 열 28px 아래) · 카드 크기 2종(첫 카드와 3의 배수째가 큼)
    const icons = pickIconsV4(items);
    const cards = items.map((it, i) => `<div style="box-sizing:border-box;padding:${i % 3 === 0 ? "22px 14px" : "14px"};border-radius:16px;background:${i % 2 ? "#FFFFFF" : p.tints[0]};border:${hairline(p.ink)}"><span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${darkOf(p)}">${icons ? iconV4Svg(icons[i]!, { color: "#FFFFFF", px: 18 }) : markerSvg(t.marker, "#FFFFFF", 16)}</span><div style="margin-top:10px">${titleP(it.title, p, i % 3 === 0 ? 17 : 15)}</div>${bodyP(it.body, p, on.sub, 4)}</div>`);
    return wrap(b, p, staggerGrid(cards), { head });
  }
  if (b.variant === "iconlist") {
    const icons = pickIconsV4(items);
    const rows = items.map((it, i) => `<div style="display:flex;gap:14px;align-items:flex-start;margin-top:${i ? 18 : 0}px"><span style="flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:${p.tints[0]}">${icons ? iconV4Svg(icons[i]!, { color: p.deep, px: 22, tint: p.tints[0] }) : markerSvg(t.marker, p.deep, 18)}</span><div style="flex:1 1 0%;min-width:0">${titleP(it.title, p, 16)}${bodyP(it.body, p, on.sub, 4)}</div></div>`).join("");
    return wrap(b, p, rows, { head });
  }
  return null;
}

// ── concern ───────────────────────────────────────────────────────────────────
function concernV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  if (b.variant === "scene") return listScene(s, b, p, t);
  const items = b.items ?? [];
  const head = headingHtml(s.text, b, p);
  if (b.variant === "memo") {
    const rows = items.map((it, i) => `<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;${i ? "" : "padding-top:4px;"}border-bottom:1px dashed ${hexToRgba(p.ink, 0.25)}"><span aria-hidden="true" style="flex:none;display:flex;align-items:center;justify-content:center;width:20px;height:20px;box-sizing:border-box;margin-top:2px;border:2px solid ${p.ink}">${CHECK(p.deep, 14)}</span><p style="flex:1 1 0%;min-width:0;margin:0;overflow-wrap:anywhere;${typeCss("small", p.ink, "font-size:16px;font-weight:600")}">${esc(it.title)}</p></div>`).join("");
    return wrap(b, p, `<div style="position:relative;padding:20px 18px 8px;border-radius:6px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("soft", p.ink)}"><span aria-hidden="true" style="position:absolute;left:50%;top:-9px;width:72px;height:18px;margin-left:-36px;background:${hexToRgba(p.accent, 0.3)}"></span>${rows}</div>`, { head });
  }
  if (b.variant === "offset") {
    const cards = items.map((it, i) => `<div style="display:flex;gap:12px;align-items:center;box-sizing:border-box;padding:14px 16px;border-radius:14px;${cardFace(p, "soft")}">${numberMark(t.number === "big" ? "circle" : t.number, i, b, p)}<p style="flex:1 1 0%;min-width:0;margin:0;overflow-wrap:anywhere;${typeCss("small", p.ink, "font-size:16px;font-weight:600")}">${esc(it.title)}</p></div>`);
    return wrap(b, p, offsetStack(cards, { inset: 32 }), { head });
  }
  if (b.variant === "deck") {
    const cards = items.map((it, i) => `<div style="position:relative;z-index:${items.length - i};display:flex;gap:12px;align-items:center;box-sizing:border-box;margin:${i ? -6 : 0}px ${(items.length - 1 - i) * 6}px 0 ${i * 6}px;padding:16px 16px;border-radius:14px;background:${i % 2 ? p.tints[0] : "#FFFFFF"};border:${hairline(p.ink)};box-shadow:${depthShadow("soft", p.ink)}">${numberMark(t.number === "big" ? "circle" : t.number, i, b, p)}<p style="flex:1 1 0%;min-width:0;margin:0;overflow-wrap:anywhere;${typeCss("small", p.ink, "font-size:16px;font-weight:600")}">${esc(it.title)}</p></div>`).join("");
    return wrap(b, p, `<div style="padding:4px 0 8px">${cards}</div>`, { head });
  }
  return null;
}

// ── story ─────────────────────────────────────────────────────────────────────
function storyV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p, "color");
  const chip = s.chip ? `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${darkOf(p)};${typeCss("label", "#FFFFFF", "letter-spacing:0.06em")}">${esc(s.chip)}</span>` : "";
  if (b.variant === "chapter") {
    // 468차 구도: 큰 장 번호가 왼쪽 28% 칸에 서고 글이 오른쪽 칸을 쓴다(번호 칸 폭이 글 칸과 다른 비대칭). 번호 글자 수에 맞춰 크기를 줄여 칸 안에 든다
    const lbl = v5Label("chapter");
    const no = t.number === "roman" ? romanOf(b.no || 1) : NUM(b.no || 1);
    const nsz = Math.max(30, Math.min(72, Math.floor(88 / (0.74 * [...no].length))));
    const num = `<div style="${TITLE_FF};font-size:${nsz}px;font-weight:900;line-height:1;color:${p.tints[3]};overflow-wrap:anywhere" aria-hidden="true">${no}</div>${lbl ? `<p style="margin:8px 0 0;${typeCss("label", on.strong)}">${lbl}</p>` : ""}`;
    const text =
      (chip ? `<div style="margin:0 0 12px">${chip}</div>` : "") + (head ? `<p style="margin:0 0 14px;${typeCss("card", on.strong)}">${head}</p>` : "") +
      (s.quote ? `<p style="margin:0;padding-left:14px;border-left:4px solid ${p.deep};overflow-wrap:anywhere;${typeCss("title", on.text, "font-size:20px")}">${esc(s.quote)}</p>` : "") +
      (s.body ? `<p style="margin:16px 0 0;overflow-wrap:anywhere;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(s.body)}</p>` : "");
    return wrap(b, p, `<div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:0 0 28%;min-width:0">${num}</div><div style="flex:1 1 0%;min-width:0">${text}</div></div>`, { head: "" });
  }
  if (b.variant === "scene" && s.quote) {
    // 469차 장면: 인용 한 문장이 한 화면(min-height 640)을 차지한다. 글자는 36px 이상(fitTitlePx), 긴 어절은 overflow-wrap이 받는다
    const size = fitTitlePx(s.quote, 64, SCENE_MIN_PX, 6);
    const ta = sceneAlign(b);
    const mark = `<span aria-hidden="true" style="display:block;margin:0 0 6px;text-align:${ta};font-size:110px;line-height:0.7;font-weight:900;color:${hexToRgba(p.deep, 0.22)}">\u201C</span>`;
    const quote = `<p style="margin:0;text-align:${ta};font-size:${size}px;line-height:1.22;font-weight:${Math.max(t.type.weight, 800)};letter-spacing:-0.03em;color:${on.text};word-break:keep-all;overflow-wrap:anywhere;--pz-fixed:1">${esc(s.quote)}</p>`;
    const body = s.body ? `<p style="margin:22px 0 0;overflow-wrap:anywhere;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(s.body)}</p>` : "";
    return wrap(b, p, mark + quote + body, { head, minH: 640, pad: "72px 24px" });
  }
  if (b.variant === "pullout" && s.quote) {
    // 468차 구도: 인용문이 섹션 가장자리까지 번지는 띠 위에 크게(한쪽으로 몰림), 본문은 반대쪽으로 들여 쓴다
    const left = b.no % 2 === 1;
    const size = fitTitlePx(s.quote, t.type.display, 24, 5);
    const body = s.body ? `<div style="max-width:576px;margin:18px auto 0"><p style="margin:0 ${left ? "0 0 36px" : "36px 0 0"};overflow-wrap:anywhere;${typeCss("body", on.sub, "white-space:pre-line")}">${esc(s.body)}</p></div>` : "";
    const lead = [chip ? `<div style="margin:0 0 12px">${chip}</div>` : "", head ? `<p style="margin:0 0 14px;${typeCss("card", on.strong)}">${head}</p>` : ""].join("");
    return wrap(b, p, `${lead ? `<div style="max-width:576px;margin:0 auto">${lead}</div>` : ""}${pullOut(s.quote, p, { size, side: left ? "left" : "right", ink: on.text, mark: "\u201C" })}${body}`, { head: "", bleed: true });
  }
  if (b.variant === "letter") {
    const body = s.body ?? "";
    const first = [...body][0] ?? "";
    const rest = body.slice(first.length);
    const inner =
      (chip ? `<div style="margin:0 0 12px">${chip}</div>` : "") + (head ? `<p style="margin:0 0 14px;${typeCss("card", on.strong)}">${head}</p>` : "") +
      `<div style="box-sizing:border-box;padding:22px 20px;border-radius:6px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("soft", p.ink)}">` +
      (s.quote ? `<p style="margin:0 0 14px;overflow-wrap:anywhere;${typeCss("title", on.text, "font-size:20px")}">${esc(s.quote)}</p>` : "") +
      `<p style="margin:0;overflow-wrap:anywhere;${typeCss("body", p.ink, "white-space:pre-line")}"><span style="float:left;${TITLE_FF};font-size:44px;font-weight:900;line-height:0.95;padding:2px 8px 0 0;color:${p.deep}">${esc(first)}</span>${esc(rest)}</p>` +
      `<div aria-hidden="true" style="clear:both;display:flex;align-items:center;gap:8px;margin-top:18px"><span style="width:36px;height:1px;background:${hexToRgba(p.ink, 0.4)}"></span><span style="width:6px;height:6px;border-radius:50%;background:${p.deep}"></span></div></div>`;
    return wrap(b, p, inner, { head: "" });
  }
  return null;
}

// ── spec ──────────────────────────────────────────────────────────────────────
function specV5(s: ImpactSection, b: V4Block, p: V4Palette): string | null {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p, "color");
  if (b.variant === "panel") {
    const rows = items.map((it, i) => `<div style="display:flex;align-items:stretch;${i ? `border-top:1px solid ${hexToRgba(p.ink, 0.14)}` : ""}"><span style="flex:0 0 34%;min-width:0;box-sizing:border-box;padding:12px 12px;background:${p.tints[0]};overflow-wrap:anywhere;${typeCss("small", p.ink, "font-weight:700")}">${esc(it.title)}</span><span style="flex:1 1 0%;min-width:0;box-sizing:border-box;padding:12px 12px;background:#FFFFFF;overflow-wrap:anywhere;${typeCss("body", p.ink, "white-space:pre-line")}">${esc(it.body ?? "")}</span></div>`).join("");
    return wrap(b, p, `<div style="overflow:hidden;border-radius:12px;border:${hairline(p.ink)};border-top:4px solid ${p.deep}">${rows}</div>`, { head });
  }
  if (b.variant === "tags") {
    const tags = items.map((it) => `<span style="display:inline-flex;align-items:baseline;gap:8px;max-width:100%;box-sizing:border-box;padding:8px 12px;border-radius:999px;border:${hairline(p.ink)};background:#FFFFFF"><span style="${typeCss("label", on.strong, "letter-spacing:0.04em")}">${esc(it.title)}</span><span style="min-width:0;overflow-wrap:anywhere;${typeCss("small", p.ink, "font-size:15px;font-weight:700")}">${esc(it.body ?? "")}</span></span>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:8px">${tags}</div>`, { head });
  }
  if (b.variant === "big3") {
    const cols = items.map((it, i) => `<div style="flex:1 1 0%;min-width:96px;box-sizing:border-box;padding:18px 8px;text-align:center;${i ? `border-left:1px solid ${hexToRgba(p.ink, 0.14)}` : ""}"><p style="margin:0;line-height:1.1;overflow-wrap:anywhere">${numberStatHtml(it.body ?? "", on.strong, 34)}</p><p style="margin:8px 0 0;overflow-wrap:anywhere;${typeCss("label", on.sub, "letter-spacing:0.04em")}">${esc(it.title)}</p></div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;border-top:2px solid ${p.ink};border-bottom:1px solid ${hexToRgba(p.ink, 0.2)}">${cols}</div>`, { head });
  }
  return null;
}

// ── phototext ─────────────────────────────────────────────────────────────────
function phototextV5(s: ImpactSection, b: V4Block, p: V4Palette, alt: string, t: ArchetypeTokens): string | null {
  const it = (b.items ?? [])[0];
  if (!it?.img) return null;
  const on = p.onFace[faceRole(b)];
  const title = `<p style="margin:0;overflow-wrap:anywhere;${typeCss("title", p.ink, "font-size:22px")}">${headingHtml(it.title, b, p)}</p>`;
  const text = (center = false) => `<div${center ? ' style="text-align:center"' : ""}>${title}${bodyP(it.body, p, on.sub, 10)}</div>`;
  const frame = t.frames[0] ?? "rect";
  if (b.variant === "stack") {
    return wrap(b, p,
      `${photoFrame(frame === "arch" ? "rect" : frame, it.img.url, alt, it.img.pos, p, "16 / 10")}` +
      `<div style="position:relative;z-index:2;margin:-22px 12px 0 ${frame === "offset" ? 12 : 0}px;box-sizing:border-box;padding:20px 18px;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("float", p.ink)}"><div style="display:flex;gap:14px;align-items:flex-start">${numberMark(t.number, 0, b, p)}<div style="flex:1 1 0%;min-width:0">${title}${bodyP(it.body, p, on.sub, 8)}</div></div></div>`);
  }
  if (b.variant === "callout") {
    // 470차 콜아웃: 사진 위에 기존 주석(선+라벨 3~5개)을 얹는다. 사진이 실패하면 노포토 폴백 CSS가 오버레이를 숨기고 제목·본문 카드만 남는다
    const overlay = it.img.ann?.length ? buildAnnotatedImageOverlaySvg(it.img.ann.slice(0, 5), p.deep).replace("<div style=", "<div data-pz-callout style=") : ""; // 주석이 없으면 오버레이 없이 사진+카드(요건 함수가 이 경우 선택을 막는다)
    const photo = `<div style="position:relative;aspect-ratio:1 / 1;overflow:hidden;border-radius:12px;background:${p.tints[1]}">${img(it.img.url, alt, it.img.pos)}${overlay}</div>`;
    return wrap(b, p, `${photo}<div style="margin-top:20px;display:flex;gap:14px;align-items:flex-start">${numberMark(t.number, 0, b, p)}<div style="flex:1 1 0%;min-width:0">${title}${bodyP(it.body, p, on.sub, 8)}</div></div>`);
  }
  if (b.variant === "scene") {
    // 469차 장면: 풀블리드 사진(높이 380) 아래로 큰 제목 카드가 걸친다. 제목 36px 이상, 섹션 min-height 640
    const size = fitTitlePx(it.title, 48, SCENE_MIN_PX, 6);
    const photo = `<div style="margin:0 -24px;position:relative;height:380px;overflow:hidden;background:${p.tints[1]}">${img(it.img.url, alt, it.img.pos)}</div>`;
    const sa = b.sceneAt ?? 0;
    const panel = `<div style="position:relative;z-index:2;max-width:576px;margin:${sa === 0 ? "-56px auto 0 0;width:88%" : sa === 2 ? "-56px 0 0 auto;width:88%" : "-56px auto 0"};box-sizing:border-box;padding:24px 22px;border-radius:16px;${cardFace(p)}"><p style="margin:0;font-size:${size}px;line-height:1.2;font-weight:${Math.max(t.type.weight, 800)};letter-spacing:-0.03em;color:${p.ink};word-break:keep-all;overflow-wrap:anywhere;--pz-fixed:1">${headingHtml(it.title, b, p)}</p>${bodyP(it.body, p, on.sub, 12)}</div>`;
    return wrap(b, p, photo + panel, { bleed: true, minH: 640, pad: "0 24px 56px" });
  }
  if (b.variant === "bleed") {
    const card = `<div style="display:flex;gap:14px;align-items:flex-start">${numberMark(t.number, 0, b, p)}<div style="flex:1 1 0%;min-width:0">${title}${bodyP(it.body, p, on.sub, 8)}</div></div>`;
    return wrap(b, p, bleedPhoto(it.img, alt, card, p, { side: b.no % 2 ? "left" : "right" }), { bleed: true });
  }
  if (b.variant === "split") {
    const small = `<p style="margin:0;overflow-wrap:anywhere;${typeCss("card", p.ink, "font-size:17px")}">${headingHtml(it.title, b, p)}</p>${bodyP(it.body, p, on.sub, 6)}`;
    return wrap(b, p, splitAsym(it.img, alt, small, p, { flip: b.no % 2 === 0 }));
  }
  if (b.variant === "polaroid") {
    return wrap(b, p,
      `<div style="width:84%;margin:8px auto 0;box-sizing:border-box;padding:10px 10px 36px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("float", p.ink)};transform:rotate(-2deg)"><div style="position:relative;aspect-ratio:1 / 1;overflow:hidden;background:${p.tints[1]}">${img(it.img.url, alt, it.img.pos)}</div></div>` +
      `<div style="margin-top:26px">${text(false)}</div>`); // 466차: 캡션 왼쪽(중앙 정렬 비율)
  }
  if (b.variant === "dframe") {
    return wrap(b, p, `${photoFrame("double", it.img.url, alt, it.img.pos, p, "4 / 5")}<div style="margin-top:22px;display:flex;gap:14px;align-items:flex-start">${numberMark(t.number, 0, b, p)}<div style="flex:1 1 0%;min-width:0">${title}${bodyP(it.body, p, on.sub, 8)}</div></div>`);
  }
  return null;
}

// ── faq (질문 title · 답 body) ─────────────────────────────────────────────────
function faqV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  const q = v5Label("q");
  const a = v5Label("a");
  const dark = darkOf(p);
  const qText = (txt: string, color = p.ink) => `<p style="margin:0;overflow-wrap:anywhere;${typeCss("card", color, "font-size:16px")}">${esc(txt)}</p>`;
  const aText = (txt: string | undefined, color = on.sub, mt = 8) => (txt ? `<p style="margin:${mt}px 0 0;overflow-wrap:anywhere;${typeCss("small", color, "white-space:pre-line")}">${esc(txt)}</p>` : "");
  if (b.variant === "numlist") {
    const rows = items.map((it, i) => `<div style="display:flex;gap:16px;align-items:flex-start;padding:16px 0;${i ? `border-top:1px solid ${hexToRgba(p.ink, 0.14)}` : `border-top:2px solid ${p.ink}`}">${numberMark(t.number, i, b, p)}<div style="flex:1 1 0%;min-width:0;padding-top:2px">${qText(it.title)}${aText(it.body)}</div></div>`).join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "twocol") {
    const cards = items.map((it) => `<div style="flex:1 1 calc(50% - 5px);min-width:150px;box-sizing:border-box;padding:16px;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)}">${q ? `<span style="${typeCss("label", on.strong)}">${q}</span>` : ""}<div style="margin-top:6px">${qText(it.title)}</div><div aria-hidden="true" style="height:1px;margin:10px 0;background:${hexToRgba(p.ink, 0.14)}"></div>${aText(it.body, on.sub, 0)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  if (b.variant === "qband") {
    const rows = items.map((it, i) => `<div style="margin-top:${i ? 14 : 0}px"><div style="padding:12px 14px;border-radius:12px 12px 0 0;background:${dark}">${qText(it.title, "#FFFFFF")}</div><div style="padding:12px 14px;border-radius:0 0 12px 12px;background:#FFFFFF;border:${hairline(p.ink)};border-top:none">${aText(it.body, p.ink, 0)}</div></div>`).join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "chat") {
    const rows = items.map((it, i) => `<div style="margin-top:${i ? 16 : 0}px"><div style="display:flex;justify-content:flex-start"><div style="max-width:88%;box-sizing:border-box;padding:11px 14px;border-radius:16px 16px 16px 4px;background:${p.tints[1]}">${qText(it.title)}</div></div>${it.body ? `<div style="display:flex;justify-content:flex-end;margin-top:8px"><div style="max-width:88%;box-sizing:border-box;padding:11px 14px;border-radius:16px 16px 4px 16px;background:${dark}"><p style="margin:0;overflow-wrap:anywhere;${typeCss("small", "#FFFFFF", "white-space:pre-line")}">${esc(it.body)}</p></div></div>` : ""}</div>`).join("");
    return wrap(b, p, rows, { head });
  }
  if (b.variant === "tabs") {
    const rows = items.map((it, i) => `<div style="display:flex;align-items:stretch;margin-top:${i ? 12 : 0}px"><span aria-hidden="true" style="flex:0 0 44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:12px 0 0 12px;background:${dark};color:#FFFFFF;${SANS_FF};font-size:13px;font-weight:800">${q || ""}<span>${NUM(i + 1)}</span></span><div style="flex:1 1 0%;min-width:0;box-sizing:border-box;padding:12px 14px;border-radius:0 12px 12px 0;background:#FFFFFF;border:${hairline(p.ink)};border-left:none">${qText(it.title)}${aText(it.body)}</div></div>`).join("");
    return wrap(b, p, rows, { head });
  }
  return null;
}

// ── proof (신뢰 근거 강조 박스) ─────────────────────────────────────────────────
function proofV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  if (b.variant === "scene") return listScene(s, b, p, t);
  const items = b.items ?? [];
  const on = p.onFace[faceRole(b)];
  const head = headingHtml(s.text, b, p);
  const dark = darkOf(p);
  const lbl = v5Label("check");
  if (b.variant === "lead") {
    const [first, ...rest] = items;
    const big = first ? `<div style="box-sizing:border-box;padding:22px 20px;border-radius:18px;background:${p.tints[0]};border-left:6px solid ${p.deep}">${markerSvg(t.marker, p.deep, 22)}<p style="margin:10px 0 0;overflow-wrap:anywhere;${typeCss("title", p.ink, "font-size:22px")}">${esc(first.title)}</p>${bodyP(first.body, p, on.sub, 8)}</div>` : "";
    const small = rest.map((it) => `<div style="display:flex;gap:10px;align-items:flex-start;margin-top:14px">${markerSvg(t.marker, p.deep, 18)}<div style="flex:1 1 0%;min-width:0">${titleP(it.title, p, 15)}${bodyP(it.body, p, on.sub, 2)}</div></div>`).join("");
    return wrap(b, p, big + small, { head });
  }
  if (b.variant === "wall") {
    const cards = items.map((it, i) => `<div style="flex:1 1 ${i % 3 === 0 ? "100%" : "calc(50% - 5px)"};min-width:140px;box-sizing:border-box;padding:16px;border-radius:16px;background:${i % 2 ? "#FFFFFF" : p.tints[0]};border:${hairline(p.ink)}">${titleP(it.title, p, 16)}${bodyP(it.body, p, on.sub, 6)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:10px">${cards}</div>`, { head });
  }
  if (b.variant === "badges") {
    const cols = items.map((it) => `<div style="flex:1 1 96px;min-width:96px;max-width:50%;box-sizing:border-box;text-align:center">${badgeShape(t.badge, p, 60)}<p style="margin:10px 0 0;overflow-wrap:anywhere;${typeCss("small", p.ink, "font-weight:700")}">${esc(it.title)}</p>${bodyP(it.body, p, on.sub, 4)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:18px 12px">${cols}</div>`, { head });
  }
  if (b.variant === "seal") {
    const cols = items.map((it) => `<div style="flex:1 1 calc(50% - 8px);min-width:140px;box-sizing:border-box;text-align:center"><span style="display:flex;align-items:center;justify-content:center;width:72px;height:72px;margin:0 auto;box-sizing:border-box;border-radius:50%;border:3px double ${p.deep};background:#FFFFFF">${CHECK(p.deep, 28)}</span>${lbl ? `<p style="margin:8px 0 0;${typeCss("label", on.strong)}">${lbl}</p>` : ""}<p style="margin:6px 0 0;overflow-wrap:anywhere;${typeCss("card", p.ink, "font-size:16px")}">${esc(it.title)}</p>${bodyP(it.body, p, on.sub, 4)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:20px 16px">${cols}</div>`, { head });
  }
  return null;
}

// ── touch (구매 유도 접점 — 가격은 입력 가격 그대로) ────────────────────────────────
function touchV5(s: ImpactSection, b: V4Block, p: V4Palette): string | null {
  const price = `<p style="flex:none;margin:0;${TITLE_FF};font-size:24px;font-weight:900;letter-spacing:-0.02em;line-height:1.2;color:${p.onFace.card.strong};white-space:nowrap;word-break:keep-all">${esc(b.price ?? "")}</p>`;
  const name = `<p style="flex:1 1 0%;min-width:0;margin:0;overflow-wrap:anywhere;${typeCss("card", p.ink, "font-size:16px")}">${esc(s.text)}</p>`;
  if (b.variant === "ticket") {
    return wrap(b, p, `<div style="position:relative;display:flex;align-items:stretch;border-radius:16px;background:#FFFFFF;border:${hairline(p.ink)};box-shadow:${depthShadow("float", p.ink)}"><div style="flex:1 1 0%;min-width:0;display:flex;align-items:center;padding:20px 18px">${name}</div><span aria-hidden="true" style="flex:none;width:0;border-left:2px dashed ${hexToRgba(p.ink, 0.3)};margin:10px 0"></span><div style="flex:none;display:flex;align-items:center;padding:20px 18px">${price}</div></div>`, { pad: "48px 24px" });
  }
  if (b.variant === "ledger") {
    return wrap(b, p, `<div style="display:flex;align-items:baseline;gap:10px;padding:18px 4px;border-top:2px solid ${p.ink};border-bottom:1px solid ${hexToRgba(p.ink, 0.25)}">${name}<span aria-hidden="true" style="flex:1 1 24px;min-width:16px;border-bottom:2px dotted ${hexToRgba(p.ink, 0.35)};transform:translateY(-4px)"></span>${price}</div>`, { pad: "48px 24px" });
  }
  return null;
}

/** v4Html에 넘기는 렌더 훅: V5 전용 변형이면 마크업, 아니면 null(기존 렌더로) */
// ── stats(숫자 카드)·gallery(사진 묶음) — 467차: 일반 섹션을 임팩트 블록으로 단일 소스 ───────────────────────────
/** "30mL"·"4가지"·"98%" → 큰 숫자 + 단위. 숫자로 시작하지 않으면 값 전체를 한 덩어리로 */
const splitStat = (v: string): { num: string; unit: string } => {
  const m = /^([\d][\d.,]*)\s*(.*)$/.exec(v.trim());
  return m ? { num: m[1]!, unit: m[2]! } : { num: v.trim(), unit: "" };
};

function statsV5(s: ImpactSection, b: V4Block, p: V4Palette, t: ArchetypeTokens): string | null {
  const items = b.items ?? [];
  if (items.length < 2) return null;
  const head = s.text.trim() ? headingHtml(s.text, b, p) : "";
  const on = p.onFace[faceRole(b)];
  const label = (txt: string): string => `<p style="margin:8px 0 0;overflow-wrap:anywhere;${typeCss("small", on.sub)}">${esc(txt)}</p>`;
  if (b.variant === "bignum") {
    const [first, ...rest] = items;
    const f0 = splitStat(first!.body ?? "");
    const big = `<div style="padding-bottom:18px;border-bottom:2px solid ${p.ink}">${statBlock(f0.num, f0.unit, p, { size: f0.num.length > 5 ? 56 : 96, ink: on.text })}${label(first!.title)}</div>`;
    const row = `<div style="display:flex;flex-wrap:wrap;gap:20px 24px;margin-top:20px">${rest.map((it) => { const x = splitStat(it.body ?? ""); return `<div style="flex:1 1 120px;min-width:0">${statBlock(x.num, x.unit, p, { size: x.num.length > 5 ? 30 : 46, ink: on.text })}${label(it.title)}</div>`; }).join("")}</div>`;
    return wrap(b, p, big + row, { head });
  }
  if (b.variant === "scene") {
    // 469차 장면: 첫 숫자 하나가 화면을 채운다(입력 숫자 그대로, 글자 수로 크기 제한 — 320폭에서 한 줄), 나머지는 아래 작은 줄
    const [first, ...rest] = items;
    const f0 = splitStat(first!.body ?? "");
    const px = Math.max(48, Math.min(112, Math.floor(FIT_AVAIL / (0.66 * Math.max(1, [...f0.num].length)))));
    const big = `<div style="padding-bottom:22px;border-bottom:2px solid ${p.ink}">${statBlock(f0.num, f0.unit, p, { size: px, ink: on.text })}<p style="margin:12px 0 0;overflow-wrap:anywhere;${typeCss("title", on.text, "font-size:22px")}">${esc(first!.title)}</p></div>`;
    const row = rest.length ? `<div style="display:flex;flex-wrap:wrap;gap:20px 24px;margin-top:22px">${rest.map((it) => { const x = splitStat(it.body ?? ""); return `<div style="flex:1 1 120px;min-width:0">${statBlock(x.num, x.unit, p, { size: x.num.length > 5 ? 48 : 56, ink: on.text })}${label(it.title)}</div>`; }).join("")}</div>` : "";
    return wrap(b, p, big + row, { head, minH: 640, pad: "72px 24px" });
  }
  if (b.variant === "trio") {
    const kinds = ["hard", "soft", "float"] as const;
    const cards = items.map((it, i) => { const x = splitStat(it.body ?? ""); const kind = t.shadow.kind === "hard" ? "hard" : kinds[(i + 1) % 3]!; return `<div style="flex:1 1 140px;min-width:0;transform:rotate(${i % 2 ? 1.2 : -1.2}deg)">${shadowPlate(`${statBlock(x.num, x.unit, p, { size: x.num.length > 5 ? 30 : 52, ink: p.ink })}${label(it.title).replace(on.sub, p.ink)}`, p, kind, { bg: i % 2 ? p.tints[0] : "#FFFFFF" })}</div>`; }).join("");
    return wrap(b, p, `<div data-pz-dyn-clip style="overflow:hidden;padding:6px 4px 10px"><div style="display:flex;flex-wrap:wrap;gap:14px">${cards}</div></div>`, { head });
  }
  if (b.variant === "rings") {
    const cols = items.map((it) => `<div style="flex:1 1 112px;min-width:0;text-align:center">${gaugeRing(parseFloat(it.body ?? "0"), p, { size: 104, label: (it.body ?? "").trim() })}${label(it.title)}</div>`).join("");
    return wrap(b, p, `<div style="display:flex;flex-wrap:wrap;gap:20px 12px;justify-content:center">${cols}</div>`, { head });
  }
  return null;
}

function galleryV5(s: ImpactSection, b: V4Block, p: V4Palette, alt: string): string | null {
  const imgs = (b.items ?? []).map((i) => i.img).filter((x): x is { url: string; pos?: string } => !!x?.url);
  if (imgs.length < 2) return null;
  const head = s.text.trim() ? headingHtml(s.text, b, p) : "";
  const a = alt || s.text || "";
  if (b.variant === "scene" && s.text.trim() && imgs.length >= 2 && imgs.length <= 3) {
    // 470차 장면: 갤러리 제목이 큰 글자(36px 이상)로 서고 아래에 크기·각도가 다른 사진 덱. 사진 수에 맞춰 작게(빈 틀 없음)
    const t0 = tokensOf(s);
    const ta = sceneAlign(b);
    const size = fitTitlePx(s.text, 52, SCENE_MIN_PX, 6);
    const title = `<p style="margin:0 0 26px;text-align:${ta};font-size:${size}px;line-height:1.2;font-weight:${Math.max(t0.type.weight, 800)};letter-spacing:-0.03em;color:${p.onFace[faceRole(b)].text};word-break:keep-all;overflow-wrap:anywhere;--pz-fixed:1">${esc(s.text)}</p>`;
    return wrap(b, p, title + layerDeck(imgs, a, p, { flip: b.no % 2 === 0 }), { head: "", minH: 640, pad: "72px 24px" });
  }
  if (b.variant === "mosaic") return wrap(b, p, mosaic(imgs, p, a, { seed: b.no * 31 }), { head });
  if (b.variant === "polaroid") return wrap(b, p, polaroidStack(imgs, p, a, { seed: b.no * 17 }), { head });
  if (b.variant === "deck") return wrap(b, p, layerDeck(imgs, a, p, { flip: b.no % 2 === 0 }), { head });
  return null;
}

export const V5_PARTS: V5Parts = (s, b, p, alt) => {
  const t = tokensOf(s);
  switch (b.family) {
    case "benefits": return benefitsV5(s, b, p, t);
    case "concern": return concernV5(s, b, p, t);
    case "story": return storyV5(s, b, p, t);
    case "spec": return specV5(s, b, p);
    case "phototext": return phototextV5(s, b, p, alt, t);
    case "faq": return faqV5(s, b, p, t);
    case "proof": return proofV5(s, b, p, t);
    case "touch": return touchV5(s, b, p);
    case "stats": return statsV5(s, b, p, t);
    case "gallery": return galleryV5(s, b, p, alt);
    case "statement":
      if (b.variant === "scene" && s.text.trim()) {
        // 469차 장면: 강조 문장 한 줄이 한 화면(min-height 600)을 차지한다. 글자 36px 이상
        const t0 = tokensOf(s);
        const on0 = p.onFace[faceRole(b)];
        const size = fitTitlePx(s.text, 64, SCENE_MIN_PX, 6);
        const ta0 = sceneAlign(b);
        const bar = `<span aria-hidden="true" style="display:block;width:64px;height:6px;margin:${ta0 === "left" ? "0 0 22px" : ta0 === "center" ? "0 auto 22px" : "0 0 22px auto"};background:${p.deep}"></span>`;
        return wrap(b, p, `${bar}<p style="margin:0;text-align:${ta0};font-size:${size}px;line-height:1.2;font-weight:${Math.max(t0.type.weight, 800)};letter-spacing:-0.03em;color:${on0.text};word-break:keep-all;overflow-wrap:anywhere;--pz-fixed:1">${headingHtml(s.text, b, p, "color")}</p>`, { minH: 640, pad: "72px 24px" });
      }
      return b.variant === "ticker" ? wrap(b, p, tickerBand((b.items ?? []).map((i) => i.title), p, { deg: -2, repeat: 3 }), { pad: "28px 24px" }) : null;
    default: return null;
  }
};
