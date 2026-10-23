/**
 * 431차 2-2 — 새 사진 레이아웃 6종(표시 전용 section type impact). 같은 비율·같은 크기·같은 모서리가 반복되는 밋밋함을 줄인다.
 * 새 사진·새 문구를 만들지 않는다: 기존 사진 주소(같은 사진의 확대 크롭 포함)와 기존 제목·본문만 쓴다. CSS는 grid/flex·aspect-ratio·position·transform만(export 안전).
 *
 *  asym2   비대칭 2장  — 큰 사진 + 작은 사진 오프셋, 겹침 14%.                           (갤러리 2장)
 *  mosaic3 3장 모자이크 — 1 큰 + 2 작은, 높이 다르게.                                  (갤러리 3장)
 *  stagger 스태거 2열   — 세로 2열 높이 어긋남(매거진).                                (갤러리 4장 이상, 짝수로 자름)
 *  inset   풀블리드 + 인셋 카드 — 큰 사진 위에 제목·본문 카드가 걸침.                     (사진이 든 image_text full)
 *  frame   아치/원/라운드 프레임 — 뷰티·감성, 프레임 모양 변주.                          (같은 조건)
 *  zoom    디테일 확대 컷 — 같은 사진을 크롭해 원형 확대 배지로 얹음(새 이미지 아님).       (같은 조건)
 * 플래그 NEXT_PUBLIC_PHOTO_LAYOUT_V2=off 이면 433차 화면 그대로. 갤러리가 히어로 바로 뒤(첫 구간, 패션 룩북)이면 건드리지 않는다.
 * 포커스 크롭: 착용컷은 위쪽(50% 20%), 그 밖은 약간 위쪽(50% 40%)을 우선해 제품·얼굴이 잘리지 않게 한다. 사진 분석 데이터가 없는 한계는 보고서에 기록.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { ImpactPalette } from "@/lib/impact-templates";
import type { ProductImageOrigin } from "@/lib/image-origins";
import { FASHION_CATEGORY, isWornFashionPhoto } from "@/lib/fashion-composite-policy";
import type { StripImageHints } from "@/lib/persona-strip";
import type { ProductImageRole } from "@/lib/image-roles";
import { hexToRgba } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { designV4On } from "@/lib/design-v4";
import { toneOverlayStyle } from "@/lib/design-tokens-v4";

/** 기본 켬. 끄려면 NEXT_PUBLIC_PHOTO_LAYOUT_V2=off 로 서버를 시작한다(433차와 같은 화면) */
export const PHOTO_LAYOUT_V2_ENABLED = process.env.NEXT_PUBLIC_PHOTO_LAYOUT_V2 !== "off";

export type PhotoSingleKind = "inset" | "frame" | "zoom";
export const GALLERY_KINDS = ["asym2", "mosaic3", "stagger"] as const;

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const img = (url: string, alt: string, pos: string, extra = ""): string =>
  `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${pos};${extra}"/>`;

export function photoLayoutHtml(s: ImpactSection, pal: ImpactPalette, alt: string): string {
  const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
  const sans = `font-family:${DETAIL_FONT_STACK.sans}`;
  const imgs = s.images ?? [];
  const pos0 = imgs[0]?.pos ?? "50% 40%";
  const head = (centered: boolean) =>
    s.text ? `<p style="margin:0 0 16px;${centered ? "text-align:center;" : ""}${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` : "";
  const ph = `background:${pal.tint}`;
  // 443차 4-1 — v4에서 mood가 있으면 본문 사진마다 틴트 그라데이션 오버레이 한 장(없으면 빈 문자열 → 마크업 불변). 오버레이가 사진 칸 안에 놓이도록 칸에 position:relative
  const toneStyle = designV4On() ? toneOverlayStyle(s.mood) : "";
  const tone = toneStyle ? `<span aria-hidden="true" data-pz-tone style="display:block;${toneStyle}"></span>` : "";
  const rel = toneStyle ? "position:relative;" : "";
  switch (s.kind) {
    case "asym2":
      return (
        `<section data-pz-impact="asym2" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head(false)}` +
        `<div style="position:relative;padding-bottom:20%">` +
        `<div style="${rel}width:70%;aspect-ratio:4 / 5;overflow:hidden;border-radius:6px;${ph}">${img(imgs[0]?.url ?? "", alt, pos0)}${tone}</div>` +
        `<div style="position:absolute;right:0;bottom:0;width:44%;aspect-ratio:1 / 1;overflow:hidden;border-radius:6px;border:5px solid #FFFFFF;box-sizing:border-box;box-shadow:0 8px 20px ${hexToRgba(pal.ink, 0.14)};${ph}">${img(imgs[1]?.url ?? "", alt, imgs[1]?.pos ?? "50% 40%")}${tone}</div>` +
        `</div></div></section>`
      );
    case "mosaic3":
      return (
        `<section data-pz-impact="mosaic3" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head(false)}` +
        `<div style="display:grid;grid-template-columns:1.3fr 1fr;grid-template-rows:auto auto;gap:8px">` +
        `<div style="grid-row:1 / span 2;position:relative;min-height:0;overflow:hidden;border-radius:6px;${ph}"><div style="position:absolute;left:0;top:0;width:100%;height:100%">${img(imgs[0]?.url ?? "", alt, pos0)}${tone}</div></div>` +
        `<div style="${rel}aspect-ratio:1 / 1;overflow:hidden;border-radius:6px;${ph}">${img(imgs[1]?.url ?? "", alt, imgs[1]?.pos ?? "50% 40%")}${tone}</div>` +
        `<div style="${rel}aspect-ratio:4 / 3;overflow:hidden;border-radius:6px;${ph}">${img(imgs[2]?.url ?? "", alt, imgs[2]?.pos ?? "50% 40%")}${tone}</div>` +
        `</div></div></section>`
      );
    case "stagger": {
      const col = (from: number) =>
        imgs
          .filter((_, i) => i % 2 === from)
          .map((p, k) => `<div style="${rel}aspect-ratio:${(k + from) % 2 === 0 ? "4 / 5" : "1 / 1"};overflow:hidden;border-radius:6px;${ph}">${img(p.url, alt, p.pos ?? "50% 40%")}${tone}</div>`)
          .join("");
      return (
        `<section data-pz-impact="stagger" style="padding:40px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">${head(false)}` +
        `<div style="display:flex;gap:8px;align-items:flex-start">` +
        `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;gap:8px">${col(0)}</div>` +
        `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column;gap:8px;margin-top:40px">${col(1)}</div>` +
        `</div></div></section>`
      );
    }
    case "inset":
      return (
        `<section data-pz-impact="inset" style="padding-bottom:8px;background:#FFFFFF">` +
        `<div style="${rel}width:100%;aspect-ratio:4 / 5;overflow:hidden;${ph}">${img(imgs[0]?.url ?? "", alt, pos0)}${tone}</div>` +
        `<div style="position:relative;margin:-64px 20px 0;max-width:536px;box-sizing:border-box;padding:22px 22px 24px;background:#FFFFFF;border-radius:10px;box-shadow:0 10px 28px ${hexToRgba(pal.ink, 0.14)}">` +
        `<p style="margin:0;${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` +
        (s.body ? `<p style="margin:10px 0 0;${sans};font-size:14.5px;line-height:1.8;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${esc(s.body)}</p>` : "") +
        `</div></section>`
      );
    case "frame": {
      const shape = s.shape ?? "arch";
      const radius = shape === "circle" ? "50%" : shape === "round" ? "28px" : "999px 999px 18px 18px";
      const ratio = shape === "circle" ? "1 / 1" : "4 / 5";
      return (
        `<section data-pz-impact="frame" style="padding:48px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto;text-align:center">` +
        `<div style="${rel}width:${shape === "circle" ? "74%" : "78%"};aspect-ratio:${ratio};margin:0 auto;overflow:hidden;border-radius:${radius};${ph};box-shadow:0 12px 28px ${hexToRgba(pal.ink, 0.12)}">${img(imgs[0]?.url ?? "", alt, pos0)}${tone}</div>` +
        `<p style="margin:24px 0 0;${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` +
        (s.body ? `<p style="margin:10px auto 0;max-width:420px;${sans};font-size:14.5px;line-height:1.8;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${esc(s.body)}</p>` : "") +
        `</div></section>`
      );
    }
    case "zoom":
      return (
        `<section data-pz-impact="zoom" style="padding:0 0 8px;background:#FFFFFF">` +
        `<div style="position:relative;width:100%;aspect-ratio:4 / 5;overflow:hidden;${ph}">${img(imgs[0]?.url ?? "", alt, pos0)}${tone}` +
        `<div style="position:absolute;right:20px;bottom:20px;width:38%;aspect-ratio:1 / 1;overflow:hidden;border-radius:50%;border:4px solid #FFFFFF;box-sizing:border-box;box-shadow:0 8px 20px ${hexToRgba(pal.ink, 0.28)};${ph}">${img(imgs[0]?.url ?? "", alt, "50% 45%", "transform:scale(2.4);transform-origin:50% 45%")}</div></div>` +
        `<div style="padding:24px 24px 0"><div style="max-width:576px;margin:0 auto"><p style="margin:0;${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${esc(s.text)}</p>` +
        (s.body ? `<p style="margin:10px 0 0;${sans};font-size:14.5px;line-height:1.8;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${esc(s.body)}</p>` : "") +
        `</div></div></section>`
      );
    default:
      return "";
  }
}

/** 초점(object-position): 패션 착용컷은 위쪽, 그 밖은 약간 위쪽 */
export function focusPos(category: string | undefined, role: ProductImageRole | undefined): string {
  return category === FASHION_CATEGORY && isWornFashionPhoto(category, role) ? "50% 20%" : "50% 40%";
}

export type PhotoPlanCtx = {
  category?: string;
  imageUrls: readonly string[];
  roles?: StripImageHints["roles"];
  origins?: ReadonlyArray<ProductImageOrigin | undefined>;
};

const okUrl = (u: string | undefined): string => (u && (/^(https?:)?\/\//i.test(u) || u.startsWith("/")) ? u : "");

/** 갤러리 사진 수·위치에 맞는 레이아웃으로 바꾼다. 히어로 바로 뒤 첫 갤러리(패션 룩북)·사진 2장 미만·AI 연출컷은 그대로 */
export function planPhotoLayouts(
  sections: DetailSection[],
  sourceIndexes: number[],
  ctx: PhotoPlanCtx,
): { sections: DetailSection[]; sourceIndexes: number[]; placed: Array<{ kind: string; at: number }> } {
  const none = { sections, sourceIndexes, placed: [] as Array<{ kind: string; at: number }> };
  if (!PHOTO_LAYOUT_V2_ENABLED || sections[0]?.type !== "hero") return none;
  const placed: Array<{ kind: string; at: number }> = [];
  let last = "";
  const out = sections.map((s, i) => {
    if (i < 2 || s.type !== "gallery") return s;
    const picks = s.imageIndexes
      .filter((idx) => (ctx.origins?.[idx] ?? "original") !== "ai-lifestyle" && okUrl(ctx.imageUrls[idx]))
      .map((idx) => ({ url: okUrl(ctx.imageUrls[idx]), pos: focusPos(ctx.category, ctx.roles?.[idx]) }));
    if (picks.length < 2) return s;
    const kind: ImpactSection["kind"] = picks.length === 2 ? "asym2" : picks.length === 3 ? "mosaic3" : "stagger";
    let images = picks;
    if (kind === "stagger") images = picks.slice(0, picks.length % 2 === 0 ? picks.length : picks.length - 1).slice(0, 6);
    if (kind === last) return s; // 같은 레이아웃 연속 금지
    last = kind;
    placed.push({ kind, at: i });
    return { type: "impact", slot: "impact", kind, text: s.heading?.trim() ?? "", images } satisfies ImpactSection as DetailSection;
  });
  return placed.length ? { sections: out, sourceIndexes, placed } : none;
}

