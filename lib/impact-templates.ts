/**
 * 433차 1-2 — 임팩트 화면 템플릿 5종(표시 전용). 같은 모양의 카드가 이어지는 스크롤에 "멈추게 하는 장면"을 끼운다.
 * 새 문구·수치·사진을 만들지 않는다: 기존 섹션의 문구·입력 수치·사진을 재배치할 뿐이다. 입력 요건이 안 맞으면 그 템플릿은 건너뛴다.
 *
 *  statement  Big statement    — feature_callout(text_only)의 말풍선 문구(callout, 화면에 안 나오던 문구) 한 문장을 큰 글자로. (삽입)
 *  number     Number hero      — 입력 수치(424 숫자 게이트 통과)를 거대한 숫자로 + 그 수치가 든 기존 한 줄. (삽입)
 *  bleed      Full-bleed photo — 사진이 든 image_text(full)를 풀폭 사진 + 하단 그라데이션 + 제목 한 줄 캡션으로. 본문은 그 아래에 그대로. (교체)
 *  split      Split 50/50      — 같은 조건의 image_text(full)를 사진 반 + 텍스트 반(연한 색 면)으로, 좌우 번갈아. (교체)
 *  callout    Callout 사진     — 이어진 퀵포인트 카드 3~4장을 사진 한 장 + 번호 붙은 특징 목록으로. 점선·좌표 없이 번호만. (교체)
 *
 * 마크업은 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 이 파일의 impactHtml 한 벌을 그대로 쓴다(패리티 0).
 * 인라인 스타일 + flex·aspect-ratio·position·min()만 — :has·컨테이너 쿼리·text-wrap 없음. 색 면은 연한 틴트(하드 면 아님)라 428차 하드 면 예산에 영향 없다.
 */
import type { DetailSection, ImpactSection } from "@/lib/types/generate";
import type { CategoryTheme } from "@/lib/category-theme";
import type { ProductImageOrigin } from "@/lib/image-origins";
import { BRAND, contrastRatioToken, flatAccentTint, hexToRgba, mixHex, pastelFace, readableTextAccent, readableTextDeep } from "@/lib/design-tokens";
import { IMPACT_BOOST_ENABLED, boostHtml } from "@/lib/impact-boost";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";
import type { IllustColors } from "@/lib/illustrations/core";
import { illustFor, illustHtml } from "@/lib/illust-sections";
import { NEUTRAL_MOOD, applyMood, moodOf } from "@/lib/mood";
import { tightenTopPad } from "@/lib/rhythm-v4";
import { designV4On, designV5On } from "@/lib/design-v4";
import { tierHeadingWeights } from "@/lib/type-treatments";
import { polishTitles } from "@/lib/typo-rhythm";
import { HERO_V2_TUNED } from "@/lib/hero-spec";
import { specialHtml } from "@/lib/special-sections";
import { referenceHtml } from "@/lib/reference-sections";
import { polishHtml } from "@/lib/polish-sections";
import { v4Html } from "@/lib/layout-variants";
import { V5_PARTS } from "@/lib/v5-parts";
import { ARCHETYPES, applyArchetypeHtml, type ArchetypeId } from "@/lib/page-archetype-v5";
import { PHOTO_LAYOUT_V2_ENABLED, photoLayoutHtml } from "@/lib/photo-layouts";
import { ILLUSTRATION_V1_ENABLED, illustStyleFor, pickIllustration } from "@/lib/illustration-map";
import { isWornFashionPhoto } from "@/lib/fashion-composite-policy";
import type { StripImageHints } from "@/lib/persona-strip";

export type ImpactKind = "statement" | "number" | "bleed" | "split" | "callout" | "inset" | "frame" | "zoom";

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ImpactPalette = { ink: string; deep: string; accent: string; tint: string; /** 435차 — 슬롯 파스텔 면·따뜻한 중립 면 */ face: string; warm: string; /** 431차 — 일러스트용 팔레트 슬롯 4색(해당 섹션 슬롯 테마) */ illust: IllustColors };
export function impactPalette(theme: CategoryTheme, category?: string): ImpactPalette {
  const face = pastelFace(theme, category);
  return {
    ink: BRAND.ink, deep: readableTextDeep(theme, 4.5), accent: readableTextAccent(theme, 3), tint: flatAccentTint(theme, 0.6), face, warm: mixHex(theme.baseNeutral, "#FFFFFF", 0.55),
    illust: IMPACT_BOOST_ENABLED ? boostIllustColors(theme, face) : { a: theme.accent, b: theme.deepAccent, c: theme.accentSoft, n: theme.baseNeutral },
  };
}

/** 435차 — 일러스트 오브젝트는 파스텔 면 위에서 읽히도록 진한 색(면 대비 ≥3:1)을 주색으로 쓴다 */
export function boostIllustColors(theme: CategoryTheme, face: string): IllustColors {
  const dark = [theme.deepAccent, readableTextDeep(theme, 4.5), "#1B1B18"].find((c) => contrastRatioToken(c, face) >= 3) ?? "#1B1B18";
  // 변형 1·2는 b·c가 주색이 되므로 셋 다 면 대비 3:1 이상을 보장한다(포인트색을 어둡게 눌러 후보를 만든다)
  const ok = (c: string) => contrastRatioToken(c, face) >= 3;
  const pick = (cands: string[]) => cands.find(ok) ?? dark;
  const b = pick([theme.accent, mixHex(theme.accent, "#000000", 0.25), mixHex(theme.accent, "#000000", 0.45)]);
  const c = pick([mixHex(theme.accent, "#000000", 0.15), mixHex(theme.accent, "#000000", 0.35), mixHex(theme.accent, "#000000", 0.5)]);
  return { a: dark, b, c, n: theme.baseNeutral };
}

/** 439차 — 흰 면 연속을 끊는 따뜻한 중립 면(잉크·진한 색 글자 대비 4.5 이상 유지되는 아주 옅은 면) */
export const WARM_FACE = "#F7F3EE";

/** 마크업 한 벌(라이브 dangerouslySetInnerHTML·export 문자열 공용) */
export function impactHtml(s: ImpactSection, pal: ImpactPalette, alt: string): string {
  const html0 = impactHtmlBase(s, pal, alt);
  // 438차 — 본문 사진 실패 폴백: 로드 실패 시 사진을 숨겨(alt 텍스트 노출 금지) 컨테이너의 색 면만 남긴다
  const html = HERO_V2_TUNED ? html0.replace(/<img (?![^>]*onerror)([^>]*?)(\s*\/?>)/g,"<img $1 onerror=\"this.style.display='none'\"$2") : html0;
  // 436차 — 아키타입 mood 토큰(여백·반경·그림자·제목 굵기). mood가 없으면 지금 마크업 그대로
  const toned = s.faceTone === "warm" ? html.replace(/^(<section[^>]*?style="[^"]*?)background:#FFFFFF/, `$1background:${WARM_FACE}`) : html;
  // 441차 1-6 — v4에서는 mood가 없는 페이지도 중립 mood 토큰을 거쳐 여백 3단·반경·그림자 단계를 같게(이전엔 40·44·56px가 남음)
  const moodHtml = s.mood ? applyMood(toned, moodOf(s.mood)) : designV4On() ? applyMood(toned, NEUTRAL_MOOD) : toned;
  // 438차 1-5 — 제목 줄 끝 고아 줄이기(DESIGN_POLISH)
  // 441차 1-1 — 제목 굵기 위계 3단(v4)
  // 444차 3 — 같은 면 이웃이면 위 여백을 스케일 가장 작은 값으로(간격 해석 규칙, lib/rhythm-v4.ts)
  const spaced = s.rhythm === "tight" && designV4On() ? tightenTopPad(moodHtml) : moodHtml;
  // 465차 V5 — 페이지 아키타입 후처리(반경·테두리·그림자·종이색·여백 척도·제목 정렬·장식). 표식(s.ax)이 없거나 V5가 꺼져 있으면 지금 마크업 그대로
  const archetyped = s.ax && designV5On() && s.ax in ARCHETYPES ? applyArchetypeHtml(spaced, ARCHETYPES[s.ax as ArchetypeId], { ink: pal.ink, accent: pal.accent, deep: pal.deep }) : spaced;
  return polishTitles(designV4On() ? tierHeadingWeights(archetyped) : archetyped);
}

function impactHtmlBase(s: ImpactSection, pal: ImpactPalette, alt: string): string {
  const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
  const sans = `font-family:${DETAIL_FONT_STACK.sans}`;
  const e = escapeHtml;
  const pos = s.anchorTop ? "50% 20%" : "50% 50%";
  switch (s.kind) {
    case "illust-side":
    case "illust-center":
      return illustHtml(s, pal);
    case "story":
    case "fit":
    case "note":
    case "textboost":
      return boostHtml(s, pal, alt);
    case "checkgrid":
    case "bubbles":
    case "chat":
      return referenceHtml(s, pal);
    case "faqcards":
    case "spectable":
    case "checkrows":
      return polishHtml(s, pal);
    case "v4":
      return v4Html(s, pal, alt, V5_PARTS);
    case "swatch":
    case "timeline":
    case "chipwall":
    case "specstrip":
    case "sizebars":
      return specialHtml(s, pal);
    case "statement": {
      const thin = s.tone === "thin";
      return (
        `<section data-pz-impact="statement" style="padding:64px 24px;background:#FFFFFF">` +
        `<div style="max-width:576px;margin:0 auto">` +
        `<span aria-hidden="true" style="display:block;width:40px;height:3px;background:${pal.accent};margin:0 0 24px"></span>` +
        `<p style="margin:0;${title};font-size:clamp(28px,8.6vw,44px);font-weight:${thin ? 500 : 900};letter-spacing:${thin ? "-0.01em" : "-0.02em"};line-height:1.25;color:${pal.ink};word-break:keep-all">${e(s.text)}</p>` +
        `</div></section>`
      );
    }
    case "number": {
      const chars = s.text.replace(/[,.]/g, "").length + (s.text.match(/[,.]/g)?.length ?? 0) * 0.4;
      const units = Math.max(2.6, chars);
      const vw = s.illust ? 40 : 62;
      const inner =
        `<p style="margin:0;display:flex;align-items:baseline;gap:6px;${title};font-weight:900;letter-spacing:-0.04em;line-height:0.95;font-size:min(calc(${vw}vw / ${units.toFixed(1)}),160px);color:${pal.accent};font-variant-numeric:tabular-nums"><span>${e(s.text)}</span>` +
        (s.unit ? `<span style="font-size:0.28em;font-weight:700;letter-spacing:0;color:${pal.ink}">${e(s.unit)}</span>` : "") +
        `</p>` +
        (s.sub ? `<p style="margin:20px 0 0;${sans};font-size:16px;font-weight:500;line-height:1.6;color:${hexToRgba(pal.ink, 0.8)};word-break:keep-all">${e(s.sub)}</p>` : "");
      // 431차 — 숫자 배지와 일러스트 조합: 같은 키워드 일러스트를 오른쪽에 곁들인다
      const body = s.illust
        ? `<div style="display:flex;align-items:center;gap:16px;max-width:576px;margin:0 auto"><div style="flex:1 1 0%;min-width:0">${inner}</div><div style="flex:0 0 36%;max-width:180px;min-width:0">${illustFor(s, pal)}</div></div>`
        : `<div style="max-width:576px;margin:0 auto">${inner}</div>`;
      return `<section data-pz-impact="number" style="padding:56px 24px;background:#FFFFFF">${body}</section>`;
    }
    case "bleed":
      return (
        `<section data-pz-impact="bleed" style="background:#FFFFFF">` +
        `<div style="position:relative;width:100%;aspect-ratio:4 / 5;overflow:hidden;background:${pal.tint}">` +
        `<img src="${e(s.imageUrl ?? "")}" alt="${e(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;object-position:${pos}"/>` +
        `<div aria-hidden="true" style="position:absolute;left:0;right:0;bottom:0;height:58%;background:linear-gradient(0deg,rgba(27,27,24,0.86) 0%,rgba(27,27,24,0.72) 22%,rgba(27,27,24,0) 100%)"></div>` +
        `<p style="position:absolute;left:0;right:0;bottom:0;margin:0;padding:0 24px 24px;${title};font-size:clamp(20px,5.2vw,24px);font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:#FFFFFF;word-break:keep-all">${e(s.text)}</p>` +
        `</div>` +
        (s.body ? `<div style="padding:28px 24px 8px"><p style="max-width:576px;margin:0 auto;${sans};font-size:15px;line-height:1.85;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${e(s.body)}</p></div>` : "") +
        `</section>`
      );
    case "split": {
      const right = s.imagePosition === "right";
      return (
        `<section data-pz-impact="split" style="display:flex;flex-direction:${right ? "row-reverse" : "row"};align-items:stretch;min-height:380px;background:${pal.tint}">` +
        `<div style="position:relative;flex:0 0 50%;min-width:0;overflow:hidden"><img src="${e(s.imageUrl ?? "")}" alt="${e(alt)}" loading="lazy" decoding="async" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${pos}"/></div>` +
        `<div style="flex:1 1 50%;min-width:0;box-sizing:border-box;padding:32px 20px;display:flex;flex-direction:column;justify-content:center">` +
        `<p style="margin:0;${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${pal.deep};word-break:keep-all">${e(s.text)}</p>` +
        (s.body ? `<p style="margin:14px 0 0;${sans};font-size:14px;line-height:1.8;color:${hexToRgba(pal.ink, 0.78)};white-space:pre-line;word-break:keep-all">${e(s.body)}</p>` : "") +
        `</div></section>`
      );
    }
    case "proof": {
      // 433차 1-4 — 시험·인증 카드: 라벨 칩 + 판매자 입력 문구(그대로) + 출처 칸. 출처가 없으면 "판매자 제공 정보"
      const rows = (s.stats ?? [])
        .map(
          (r, i) =>
            `<div style="padding:18px 0;${i > 0 ? `border-top:1px solid ${hexToRgba(pal.ink, 0.1)}` : ""}">` +
            (r.tag ? `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${pal.deep};color:#FFFFFF;${sans};font-size:11px;font-weight:700;letter-spacing:0.04em">${e(r.tag)}</span>` : "") +
            `<p style="margin:10px 0 0;${title};font-size:clamp(20px,5.6vw,26px);font-weight:700;letter-spacing:-0.02em;line-height:1.35;color:${pal.ink};word-break:keep-all">${e(r.label)}</p>` +
            `<p style="margin:8px 0 0;${sans};font-size:12px;line-height:1.5;color:${hexToRgba(pal.ink, 0.66)}">출처 · ${e(r.value)}</p></div>`,
        )
        .join("");
      return `<section data-pz-impact="proof" style="padding:40px 24px;background:${pal.tint}"><div style="max-width:576px;margin:0 auto">${rows}</div></section>`;
    }
    case "reviewstat": {
      // 433차 1-4 — 후기 통계 카드: 업로드한 후기에서 센 건수와 장점 키워드별 언급 건수(새 문구·별점·비율 없음)
      const rows = (s.stats ?? [])
        .map(
          (r, i) =>
            `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 0;${i > 0 ? `border-top:1px solid ${hexToRgba(pal.ink, 0.1)}` : ""}">` +
            `<span style="min-width:0;${sans};font-size:15px;font-weight:500;line-height:1.5;color:${pal.ink};word-break:keep-all">${e(r.label)}</span>` +
            `<span style="flex:none;${sans};font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;color:${pal.deep}">${e(r.value)}</span></div>`,
        )
        .join("");
      return (
        `<section data-pz-impact="reviewstat" style="padding:48px 24px;background:#FFFFFF"><div style="max-width:576px;margin:0 auto">` +
        `<p style="margin:0;display:flex;align-items:baseline;gap:6px;${title};font-weight:900;letter-spacing:-0.04em;line-height:0.95;font-size:min(calc(70vw / ${Math.max(2, s.text.length).toFixed(1)}),150px);color:${pal.accent};font-variant-numeric:tabular-nums"><span>${e(s.text)}</span><span style="font-size:0.28em;font-weight:700;letter-spacing:0;color:${pal.ink}">${e(s.unit ?? "")}</span></p>` +
        (s.sub ? `<p style="margin:16px 0 0;${sans};font-size:14px;line-height:1.6;color:${hexToRgba(pal.ink, 0.72)}">${e(s.sub)}</p>` : "") +
        (rows ? `<div style="margin-top:24px">${rows}</div>` : "") +
        `</div></section>`
      );
    }
    case "callout": {
      const items = s.labels ?? [];
      const n = Math.max(1, items.length);
      const chips = items
        .map((_, i) => `<span style="position:absolute;right:10px;top:calc(${(((i + 0.5) / n) * 100).toFixed(2)}% - 13px);width:26px;height:26px;border-radius:999px;background:${pal.deep};color:#FFFFFF;${sans};font-size:13px;font-weight:700;line-height:26px;text-align:center">${i + 1}</span>`)
        .join("");
      const rows = items
        .map((l, i) => {
          const [head, ...rest] = l.split("\n");
          const body = rest.join("\n");
          return (
            `<div style="flex:1 1 0%;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:10px 0;${i < n - 1 ? `border-bottom:1px solid ${hexToRgba(pal.ink, 0.1)}` : ""}">` +
            `<p style="margin:0;${sans};font-size:15px;font-weight:700;line-height:1.35;color:${pal.ink};word-break:keep-all"><span style="color:${pal.deep};margin-right:6px">${i + 1}</span>${e(head ?? "")}</p>` +
            (body ? `<p style="margin:6px 0 0;${sans};font-size:13px;line-height:1.65;color:${hexToRgba(pal.ink, 0.72)};word-break:keep-all">${e(body)}</p>` : "") +
            `</div>`
          );
        })
        .join("");
      return (
        `<section data-pz-impact="callout" style="padding:40px 20px;background:#FFFFFF">` +
        `<div style="display:flex;align-items:stretch;gap:16px;max-width:576px;margin:0 auto;min-height:340px">` +
        `<div style="position:relative;flex:0 0 52%;min-width:0;overflow:hidden;border-radius:12px;background:${pal.tint}"><img src="${e(s.imageUrl ?? "")}" alt="${e(alt)}" loading="lazy" decoding="async" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover"/>${chips}</div>` +
        `<div style="flex:1 1 0%;min-width:0;display:flex;flex-direction:column">${rows}</div>` +
        `</div></section>`
      );
    }
    default:
      return photoLayoutHtml(s, pal, alt);
  }
}

/** 이미지 대체 텍스트(라이브·export 공통) */
export const impactAlt = (productName: string | undefined | null, s: ImpactSection): string => `${(productName ?? "").trim()} ${s.text}`.trim();

// ── 배치 계획 ──────────────────────────────────────────────────────────────

const IMPACT_HEIGHT: Partial<Record<ImpactSection["kind"], number>> = { statement: 300, number: 330, bleed: 780, split: 380, callout: 420, proof: 420, reviewstat: 460, "illust-side": 300, "illust-center": 520, story: 640, fit: 420, note: 360, textboost: 420, swatch: 300, timeline: 520, chipwall: 320, specstrip: 300, sizebars: 520, checkgrid: 640, bubbles: 460, chat: 420, faqcards: 700, spectable: 560, checkrows: 400, asym2: 600, mosaic3: 640, inset: 700, frame: 560, stagger: 800, zoom: 600 };

/** 439차 — v4 블록 높이(계열별 대략) */
const V4_HEIGHT: Record<string, number> = { benefits: 620, concern: 420, story: 620, spec: 460, phototext: 720, touch: 200, breather: 90, steps: 420, statement: 240 };

/** 섹션 높이 추정(px, 390 폭 기준 대략) — 간격 규칙용. 정확할 필요는 없고 같은 입력이면 같은 결과가 나오면 된다 */
export function estimateSectionHeight(s: DetailSection): number {
  switch (s.type) {
    case "hero": return 720;
    case "gallery": return 560;
    case "target_persona": return 440;
    case "brand_story": return 520;
    case "checklist": return 400;
    case "highlight_box": return 360;
    case "step_card": return 560;
    case "usage_steps": return 460;
    case "stat_infographic": return 480;
    case "comparison_chart": case "comparison_table": case "tradeoff_card": return 520;
    case "spec_table": return 560;
    case "faq": return 700;
    case "caution": return 360;
    case "cta_price": return 520;
    case "ai_disclosure": return 160;
    case "illustration_banner": return 300;
    case "scene_image": return 640;
    case "image_text":
      return s.layout === "compact" ? 190 : s.layout === "text_only" ? 330 : s.layout === "annotated" ? 600 : 680;
    case "impact":
      if (s.kind === "v4") return V4_HEIGHT[s.v4?.family ?? ""] ?? 480;
      return IMPACT_HEIGHT[s.kind] ?? 420;
    default: return 400;
  }
}

/** 임팩트 사이 최소 간격과, 이 값을 넘기면 "비어 있는 구간"으로 보고하는 상한(약 4화면) */
export const IMPACT_MIN_GAP_PX = 1500;
export const IMPACT_WINDOW_PX = 3400;
const MAX_PER_KIND: Record<ImpactKind, number> = { statement: 2, number: 1, callout: 1, bleed: 2, split: 2, inset: 1, frame: 1, zoom: 1 };
/** 431차 — 사진 한 장 템플릿 회전 순서(뷰티는 프레임부터, 그 밖은 풀블리드부터). 연속 같은 템플릿 금지 */
const PHOTO_ROTATION_BEAUTY: ImpactKind[] = ["frame", "bleed", "zoom", "split", "inset"];
const PHOTO_ROTATION_DEFAULT: ImpactKind[] = ["bleed", "inset", "split", "zoom", "frame"];

const NUM_UNIT_RE = /(\d[\d,]*(?:\.\d+)?)\s*(mL|ml|ML|L|g|kg|cm|mm|%|종|개|매|W|시간|분|색|가지|사이즈|인치|oz|cc|GB|TB|mAh|Wh)/;

export type ImpactCtx = {
  category?: string;
  imageUrls: readonly string[];
  facts: ClaimFacts;
  origins?: ReadonlyArray<ProductImageOrigin | undefined>;
  roles?: StripImageHints["roles"];
  /** 436차 — 아키타입 레시피의 임팩트·사진 템플릿 선호(순서·상한·제외)와 mood의 일러스트 스타일 */
  recipe?: { rotation: ImpactKind[]; maxPerKind: Partial<Record<ImpactKind, number>>; skip: ImpactKind[] } | null;
  illustStyle?: "solid" | "flat" | "line" | null;
};

type Cand =
  | { kind: "statement"; at: number; text: string }
  | { kind: "number"; at: number; num: string; unit: string; sub: string }
  | { kind: "photo"; at: number; text: string; body: string; url: string; anchorTop: boolean }
  | { kind: "callout"; at: number; len: number; url: string; labels: string[] };

const isQuickPoint = (s: DetailSection | undefined): boolean => s?.type === "image_text" && s.slot === "quick_points";
const safeUrl = (u: string | undefined): string => (u && /^(https?:)?\/\//i.test(u) ? u : u && u.startsWith("/") ? u : "");

function findCandidates(secs: DetailSection[], ctx: ImpactCtx): Cand[] {
  const out: Cand[] = [];
  const urlOf = (idx: unknown): string => (typeof idx === "number" ? safeUrl(ctx.imageUrls[idx]) : "");
  const originOk = (idx: unknown): boolean => typeof idx !== "number" || (ctx.origins?.[idx] ?? "original") !== "ai-lifestyle";
  let numberFound = false;
  const heroBadge = secs[0]?.type === "hero" ? (secs[0].badge ?? "") : "";
  secs.forEach((s, i) => {
    if (i < 2) return; // 히어로·바로 뒤 구간은 건드리지 않는다
    if (secs[i - 1]?.type === "impact" || secs[i + 1]?.type === "impact" || s.type === "impact") return; // 431차 — 일러스트·증빙 구간과 붙이지 않는다
    if (s.type === "image_text") {
      // statement: 화면에 나오지 않는 말풍선 문구(text_only 카드의 callout)
      if (s.slot === "feature_callout" && s.layout === "text_only" && typeof s.callout === "string" && !isQuickPoint(secs[i - 1])) {
        const t = s.callout.trim();
        if (t.length >= 6 && t.length <= 30 && !checkText(t, ctx.facts).bad) out.push({ kind: "statement", at: i, text: t });
      }
      // photo: 사진이 든 full 카드
      if (s.layout === "full" && !s.imageCrop && !s.sceneCrop && originOk(s.imageIndex) && urlOf(s.imageIndex) && s.heading.trim() && s.heading.trim().length <= 28 && !s.heading.trim().startsWith("#")) {
        out.push({ kind: "photo", at: i, text: s.heading.trim(), body: s.body ?? "", url: urlOf(s.imageIndex), anchorTop: isWornFashionPhoto(ctx.category, typeof s.imageIndex === "number" ? ctx.roles?.[s.imageIndex] : undefined) });
      }
      // callout: 이어진 퀵포인트 3~4장(첫 카드에 사진)
      if (s.slot === "quick_points" && (s.layout === "compact" || s.layout === "text_only") && !(secs[i - 1]?.type === "image_text" && (secs[i - 1] as { slot?: string }).slot === "quick_points")) {
        let j = i;
        while (j < secs.length && j - i < 4) {
          const t = secs[j]!;
          if (!(t.type === "image_text" && t.slot === "quick_points" && (t.layout === "compact" || t.layout === "text_only"))) break;
          j += 1;
        }
        const first = s;
        const runLen = j - i;
        const after = secs[j];
        const runEndsClean = !(after?.type === "image_text" && after.slot === "quick_points");
        if (runLen >= 3 && runEndsClean && first.layout === "compact" && !first.noPhoto && originOk(first.imageIndex) && urlOf(first.imageIndex)) {
          const labels = secs.slice(i, j).map((t) => (t.type === "image_text" ? (t.body?.trim() ? `${t.heading.trim()}\n${t.body.trim()}` : t.heading.trim()) : ""));
          if (labels.every((l) => l.length > 0)) out.push({ kind: "callout", at: i, len: runLen, url: urlOf(first.imageIndex), labels });
        }
      }
    }
    // number: 입력 수치(히어로 배지·체크리스트 항목·카드 제목)와 그 수치가 든 한 줄
    if (!numberFound) {
      const texts: string[] =
        s.type === "checklist" ? s.items : [];
      for (const t of texts) {
        const m = NUM_UNIT_RE.exec(t);
        if (!m || t.length > 32 || checkText(m[0], ctx.facts).bad) continue;
        const fromBadge = heroBadge && NUM_UNIT_RE.exec(heroBadge)?.[0] === m[0];
        // 입력에서 센 개수(사이즈·종 등)와 히어로 배지 수치만 인정(본문 속 임의 숫자는 쓰지 않는다)
        if (!fromBadge && !/사이즈|종|개|색|가지/.test(m[2]!)) continue;
        out.push({ kind: "number", at: i, num: m[1]!, unit: m[2]!, sub: t });
        numberFound = true;
        break;
      }
    }
  });
  // 폴백: 히어로 배지 수치가 히어로 부제에도 있으면(둘 다 입력 문구) 그 부제를 설명 줄로 쓴다. 퀵포인트 묶음 한가운데는 피한다
  const hero = secs[0];
  if (!numberFound && hero?.type === "hero" && heroBadge) {
    const m = NUM_UNIT_RE.exec(heroBadge);
    const sub = (hero.subheadline ?? "").trim();
    if (m && sub && sub.length <= 48 && sub.includes(m[0]) && !checkText(m[0], ctx.facts).bad) {
      let y = 0;
      for (let k = 0; k < secs.length; k += 1) {
        if (k >= 3 && y >= 2300 && !(isQuickPoint(secs[k - 1]) && isQuickPoint(secs[k])) && secs[k]!.type !== "cta_price") { out.push({ kind: "number", at: k, num: m[1]!, unit: m[2]!, sub }); break; }
        y += estimateSectionHeight(secs[k]!);
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export type ImpactPlacement = { kind: ImpactKind; at: number; mode: "insert" | "replace"; y: number };
export type ImpactPlan = { sections: DetailSection[]; sourceIndexes: number[]; placed: ImpactPlacement[]; maxGapPx: number };

/** 표시 규칙의 마지막 단계에서 부른다. 입력 수치·문구가 요건에 맞는 템플릿만 끼우고, 아니면 입력을 그대로 돌려준다 */
export function planImpact(sections: DetailSection[], sourceIndexes: number[], ctx: ImpactCtx): ImpactPlan {
  const none: ImpactPlan = { sections, sourceIndexes, placed: [], maxGapPx: 0 };
  if (sections.length < 6 || sections[0]!.type !== "hero") return none;
  const cands = findCandidates(sections, ctx);
  if (cands.length === 0) return none;
  const ys: number[] = [];
  let acc = 0;
  for (const s of sections) { ys.push(acc); acc += estimateSectionHeight(s); }
  const tone: "thin" | "bold" = ctx.category === "화장품/뷰티" ? "thin" : "bold";
  const counts: Record<ImpactKind, number> = { statement: 0, number: 0, callout: 0, bleed: 0, split: 0, inset: 0, frame: 0, zoom: 0 };
  const rotation = ctx.recipe ? ctx.recipe.rotation.filter((k) => !ctx.recipe!.skip.includes(k)) : ctx.category === "화장품/뷰티" ? PHOTO_ROTATION_BEAUTY : PHOTO_ROTATION_DEFAULT;
  const maxOf = (k: ImpactKind): number => ctx.recipe?.maxPerKind[k] ?? MAX_PER_KIND[k];
  const skipped = (k: ImpactKind): boolean => !!ctx.recipe?.skip.includes(k);
  let rotIdx = 0;
  let lastKind: ImpactKind | null = null;
  let lastY = ys[1] ?? 720; // 히어로 바로 뒤를 기준점으로
  let lastPhoto: "bleed" | "split" | null = null;
  let splitRight = false;
  const chosen: Array<{ cand: Cand; kind: ImpactKind; y: number; section: ImpactSection }> = [];
  for (const c of cands) {
    const y = ys[c.at]!;
    if (y - lastY < IMPACT_MIN_GAP_PX) continue;
    // 사진 템플릿은 풀폭·분할을 번갈아(같은 템플릿 연속 금지)
    let kind: ImpactKind = c.kind === "photo" ? (lastPhoto === "bleed" ? "split" : "bleed") : c.kind;
    if (kind === lastKind && c.kind === "photo") kind = kind === "bleed" ? "split" : "bleed";
    if (c.kind === "photo" && PHOTO_LAYOUT_V2_ENABLED) {
      // 431차 — 6종 회전(프레임·인셋·확대 포함). 연속 같은 템플릿·종류별 상한을 지키는 다음 템플릿
      const pick = [0, 1, 2, 3, 4].map((o) => (rotIdx + o) % rotation.length).find((k) => rotation[k] !== lastKind && counts[rotation[k]!] < maxOf(rotation[k]!));
      if (pick === undefined) continue;
      kind = rotation[pick]!;
      rotIdx = pick + 1;
    }
    if (kind === lastKind || counts[kind] >= maxOf(kind) || skipped(kind)) continue;
    let section: ImpactSection;
    if (c.kind === "statement") section = { type: "impact", slot: "impact", kind: "statement", text: c.text, tone };
    else if (c.kind === "number") {
      const ip = ILLUSTRATION_V1_ENABLED ? pickIllustration(c.sub) : null;
      section = { type: "impact", slot: "impact", kind: "number", text: c.num, unit: c.unit, sub: c.sub, ...(ip ? { illust: { id: ip.id, variant: 1, style: ctx.illustStyle ?? illustStyleFor(ctx.category) } } : {}) };
    }
    else if (c.kind === "callout") section = { type: "impact", slot: "impact", kind: "callout", text: "", imageUrl: c.url, labels: c.labels };
    else if (kind === "inset" || kind === "frame" || kind === "zoom") section = { type: "impact", slot: "impact", kind, text: c.text, body: c.body, images: [{ url: c.url, pos: c.anchorTop ? "50% 20%" : "50% 40%" }], ...(kind === "frame" ? { shape: ctx.category === "화장품/뷰티" ? "arch" : "round" } : {}) };
    else if (kind === "bleed") section = { type: "impact", slot: "impact", kind: "bleed", text: c.text, body: c.body, imageUrl: c.url, anchorTop: c.anchorTop };
    else { splitRight = !splitRight; section = { type: "impact", slot: "impact", kind: "split", text: c.text, body: c.body, imageUrl: c.url, imagePosition: splitRight ? "left" : "right", anchorTop: c.anchorTop }; }
    counts[kind] += 1;
    lastKind = kind;
    lastY = y;
    if (kind === "bleed" || kind === "split") lastPhoto = kind;
    chosen.push({ cand: c, kind, y, section });
  }
  if (chosen.length === 0) return none;
  const outS: DetailSection[] = [];
  const outI: number[] = [];
  const placed: ImpactPlacement[] = [];
  const byAt = new Map(chosen.map((c) => [c.cand.at, c]));
  for (let i = 0; i < sections.length; i += 1) {
    const hit = byAt.get(i);
    if (!hit) { outS.push(sections[i]!); outI.push(sourceIndexes[i]!); continue; }
    const insert = hit.cand.kind === "statement" || hit.cand.kind === "number";
    placed.push({ kind: hit.kind, at: outS.length, mode: insert ? "insert" : "replace", y: hit.y });
    outS.push(hit.section);
    outI.push(sourceIndexes[i]!);
    if (hit.cand.kind === "callout") { i += hit.cand.len - 1; continue; }
    if (insert) { outS.push(sections[i]!); outI.push(sourceIndexes[i]!); }
  }
  const stops = [ys[1] ?? 720, ...chosen.map((c) => c.y), acc];
  const maxGapPx = stops.slice(1).reduce((m, v, i) => Math.max(m, v - stops[i]!), 0);
  return { sections: outS, sourceIndexes: outI, placed, maxGapPx };
}
