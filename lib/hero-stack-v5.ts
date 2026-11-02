/**
 * 471~472차 V5 — 첫 화면 구간 배치 레시피 + 시각 시그니처.
 * 471: 가격 줄·한눈에 보기·탭 칩·히어로 비율·장식 숫자 위치를 아키타입마다 CSS로 덮어씀.
 * 472: "눈으로 다름" — 배경 색 계열·제목 정렬/위치·사진 틀·면적·가격 표시·한눈에 보기 7칸 시각 시그니처.
 * DOM·문구·핸들러는 그대로, CSS·히어로 면 색만. V5 꺼짐에서는 호출되지 않는다.
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";

export type StripKind = "chip" | "bar" | "float" | "dark" | "badge" | "hair" | "grid" | "rule";
export type GlanceKind = "list" | "grid2" | "pills" | "scroll" | "airy" | "rule" | "cards" | "bignum";
export type NavKind = "underline" | "box" | "pill" | "dark" | "sticker" | "spaced" | "tab" | "dotted";
/** 장식 숫자 위치: tl 왼쪽 위 안쪽 · tc 위 가운데 · bl/bc/br 아래 여백 · le/re 왼쪽/오른쪽 가장자리에 반쯤 걸침 — 우상단 고정 없음 */
export type GhostPos = "tl" | "tc" | "bl" | "bc" | "br" | "le" | "re";

/** 472 시각 시그니처 칸 */
export type TitlePos = "above" | "overlay" | "below" | "beside";
export type PhotoFrame = "fullbleed" | "card" | "circle" | "arch" | "split" | "tilt";
export type PhotoArea = "sm" | "md" | "lg" | "xl";
export type PriceShow = "chip" | "big" | "sticker" | "inline";
export type FaceMode = "white" | "pastel" | "sat" | "dark" | "paper";

export type HeroStackRecipe = {
  strip: StripKind;
  glance: GlanceKind;
  nav: NavKind;
  ratio: string;
  ghost: GhostPos;
  /** 472 — 시각 시그니처(자동 지표 V1) */
  titleAlign: "left" | "center" | "right";
  titlePos: TitlePos;
  frame: PhotoFrame;
  photoArea: PhotoArea;
  priceShow: PriceShow;
  faceMode: FaceMode;
  /** 상품 accent에 더하는 hue(도). 아키타입 액센트용 */
  hueShift: number;
};

export const HERO_STACK: Record<ArchetypeId, HeroStackRecipe> = {
  // 흰 바탕 + 사진 위/정보 아래(스플릿 D), 스펙형 바·2열 칩
  catalog: { strip: "bar", glance: "grid2", nav: "box", ratio: "1 / 1", ghost: "bl", titleAlign: "left", titlePos: "below", frame: "split", photoArea: "xl", priceShow: "inline", faceMode: "white", hueShift: 0 },
  // 파스텔 + 아치 사진 + 둥근 떠 있는 가격
  softlife: { strip: "float", glance: "pills", nav: "pill", ratio: "4 / 5", ghost: "br", titleAlign: "center", titlePos: "above", frame: "arch", photoArea: "lg", priceShow: "chip", faceMode: "pastel", hueShift: 90 },
  // 원색 + 기울인 스티커 틀 + 별 배지 가격 + 가로 스크롤 칩
  // 원색 대비: 상품 파랑과 겹치지 않게 따뜻한 적황 계열(320→35)
  pop: { strip: "badge", glance: "scroll", nav: "sticker", ratio: "5 / 4.4", ghost: "tl", titleAlign: "left", titlePos: "above", frame: "tilt", photoArea: "lg", priceShow: "sticker", faceMode: "sat", hueShift: 35 },
  // 풀블리드 사진 위 거대 제목 + 어두운 그라데이션 + 큰 가격
  impact: { strip: "dark", glance: "bignum", nav: "dark", ratio: "4 / 5.4", ghost: "le", titleAlign: "left", titlePos: "overlay", frame: "fullbleed", photoArea: "xl", priceShow: "big", faceMode: "dark", hueShift: 180 },
  // 에디토리얼: 카드 옆 제목 + 칩 가격 + 목록
  editorial: { strip: "chip", glance: "list", nav: "underline", ratio: "4 / 4.8", ghost: "tl", titleAlign: "left", titlePos: "beside", frame: "card", photoArea: "md", priceShow: "chip", faceMode: "sat", hueShift: 15 },
  // 테크시트: lightOnly라 진한 sat 면 금지 → 쿨 청록 파스텔(pop 적황 sat·narrative paper와 bin 분리)
  techsheet: { strip: "grid", glance: "rule", nav: "tab", ratio: "3 / 2.4", ghost: "bl", titleAlign: "left", titlePos: "above", frame: "card", photoArea: "sm", priceShow: "big", faceMode: "pastel", hueShift: 175 },
  // 서사: 아래 제목·큰 분할 사진·인라인 가격
  narrative: { strip: "rule", glance: "cards", nav: "dotted", ratio: "4 / 5.6", ghost: "bc", titleAlign: "center", titlePos: "beside", frame: "card", photoArea: "lg", priceShow: "inline", faceMode: "paper", hueShift: 150 },
  // 럭스: 가운데·원형 소형·여유 한눈에
  luxe: { strip: "hair", glance: "airy", nav: "spaced", ratio: "1 / 1.15", ghost: "re", titleAlign: "center", titlePos: "below", frame: "circle", photoArea: "sm", priceShow: "chip", faceMode: "pastel", hueShift: 270 },
};

/** 레시피 기준 배경 토큰(실측 hex의 무채색 붕괴를 피함). faceMode+hueShift로 8종 ≥5 bin */
export function recipeBgToken(mode: FaceMode, shift: number): string {
  if (mode === "white") return "h0L2";
  if (mode === "dark") return "h5L0";
  const hBin = Math.min(5, Math.floor((((shift % 360) + 360) % 360) / 60));
  const lBin = mode === "pastel" || mode === "paper" ? 2 : 1;
  return `h${hBin}L${lBin}`;
}

/** 472 시각 시그니처 7칸(지표 V1). 정의 완화 금지 */
export type VisualSig = {
  bg: string; // hueBin0-5 + L0-2
  titleAlign: string;
  titlePos: string;
  frame: string;
  photoArea: string;
  priceShow: string;
  glance: string;
};
export const VISUAL_SIG_KEYS: Array<keyof VisualSig> = ["bg", "titleAlign", "titlePos", "frame", "photoArea", "priceShow", "glance"];

const stripToPrice = (s: StripKind): PriceShow => (s === "badge" ? "sticker" : s === "dark" || s === "grid" ? "big" : s === "chip" || s === "float" || s === "hair" ? "chip" : "inline");

/** 레시피 → 시각 시그니처(배경 칸은 호출측에서 face hex로 채움) */
export function visualSigOf(id: ArchetypeId, bgToken: string): VisualSig {
  const r = HERO_STACK[id];
  return {
    bg: bgToken,
    titleAlign: r.titleAlign,
    titlePos: r.titlePos,
    frame: r.frame,
    photoArea: r.photoArea,
    priceShow: r.priceShow ?? stripToPrice(r.strip),
    glance: r.glance,
  };
}

/** hue 0~360 → 6분, 명도 → 3단 → "hNL M" */
export function bgTokenFromHex(hex: string): string {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (!Number.isFinite(n)) return "h0L1";
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const L = (mx + mn) / 2;
  let h = 0;
  if (mx !== mn) {
    const d = mx - mn;
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  // 무채색(채도 낮음)은 hue bin 고정하지 않고 명도만 — 흰/검은 면이 같은 bin에 뭉치지 않게 L로 구분
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  const hBin = sat < 0.12 ? (L > 0.7 ? 0 : L < 0.25 ? 5 : 3) : Math.min(5, Math.floor(((h % 360) + 360) % 360 / 60));
  const lBin = L < 0.28 ? 0 : L < 0.62 ? 1 : 2;
  return `h${hBin}L${lBin}`;
}

export const visualSigDiff = (a: VisualSig, b: VisualSig): number => VISUAL_SIG_KEYS.filter((k) => a[k] !== b[k]).length;

const IMP = "!important";
const rule = (sel: string, decl: string): string => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;
const rgba = (ink: string, a: number): string => {
  const n = parseInt(ink.replace("#", "").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function heroStackCssV5(scope: string, id: ArchetypeId, ink: string): string {
  const r = HERO_STACK[id];
  const out: string[] = [];
  // 시각 시그니처 표식 — CSS 변수에는 !important를 붙이지 않음(지표가 값을 그대로 읽음)
  out.push(`${scope} [data-pz-vsig="${id}"]{--pz-vsig-ta:${r.titleAlign};--pz-vsig-tp:${r.titlePos};--pz-vsig-fr:${r.frame};--pz-vsig-pa:${r.photoArea};--pz-vsig-pr:${r.priceShow};--pz-vsig-gl:${r.glance}}`);
  // hs 게이트는 회귀(hero-471)가 data-pz-hs="…" 따옴표 형을 검사 — 유지. 그 외 선택자·#fff 압축.
  const hs = (k: string) => `:not([data-pz-hs="${k}"])`;
  // ── 히어로 사진 비율(스플릿 D)
  out.push(rule(`${scope} [data-hero-v2="D"]${hs("ratio")}>[data-hero-photo]`, `aspect-ratio:${r.ratio}`));
  // ── 틀 모양(아키타입별 사진 감싸개)
  const photo = `${scope} [data-hero-v2] [data-hero-photo]`;
  switch (r.frame) {
    case "arch":
      out.push(rule(`${photo}${hs("frame")}`, "border-radius:50% 50% 18% 18%/62% 62% 18% 18%;overflow:hidden;box-shadow:0 18px 40px rgba(10,10,10,.18)"));
      break;
    case "tilt":
      out.push(rule(`${photo}${hs("frame")}`, `transform:rotate(-2.8deg);border:4px solid ${ink};border-radius:18px;box-shadow:8px 8px 0 ${ink};overflow:hidden`));
      break;
    case "circle":
      out.push(rule(`${photo}${hs("frame")}`, "border-radius:50%;overflow:hidden;aspect-ratio:1/1;max-width:70%;margin:0 auto"));
      break;
    case "card":
      out.push(rule(`${photo}${hs("frame")}`, "border-radius:20px;overflow:hidden;box-shadow:0 12px 28px rgba(10,10,10,.16)"));
      break;
    case "split": {
      // 흰 바탕 + 사진 좌 / 정보 우(좁은 폭 flex-wrap)
      const D = `${scope} [data-hero-v2="D"]`;
      out.push(rule(`${D}${hs("frame")}`, "background:#fff;display:flex;flex-wrap:wrap;align-items:stretch"));
      out.push(rule(`${D}>[data-hero-photo]${hs("frame")}`, "border-radius:0;flex:1 1 280px;width:48%;max-width:100%;max-height:none;background:#F3F1EC"));
      out.push(rule(`${D}>div:not([data-hero-photo])${hs("frame")}`, "flex:1 1 280px;width:52%;max-width:100%;box-sizing:border-box;background:#fff;padding:28px 22px"));
      break;
    }
    case "fullbleed":
      out.push(rule(`${scope} [data-hero-v2="A"]${hs("frame")}`, "border-radius:0"));
      out.push(rule(`${scope} [data-hero-v2="A"] [data-hero-scrim]${hs("frame")}`, "height:100%;background:linear-gradient(0deg,rgba(10,10,10,.82) 0%,rgba(10,10,10,.45) 42%,rgba(10,10,10,.2))"));
      break;
    default:
      break;
  }
  // impact 오버레이: 473 — 고정 56px+말줄임 금지. 마크업 fit 크기를 존중(최소만 보강)
  if (r.titlePos === "overlay") {
    out.push(rule(`${scope} [data-hero-v2="A"] [data-hero-a-text] h1${hs("title")}`, "line-height:1.18;font-weight:900;overflow-wrap:anywhere;word-break:keep-all"));
    out.push(rule(`${scope} [data-hero-v2="A"] [data-hero-a-text] [data-hero-hook]${hs("title")}`, "font-weight:800;overflow-wrap:anywhere;word-break:keep-all"));
  }
  // ── 가격 줄
  const S = `${scope} [data-pz-strip]${hs("strip")}`;
  const P = `${S} [data-pz-strip-price]`; const N = `${S} [data-pz-strip-name]`; const C = `${S} [data-pz-strip-chip]`;
  switch (r.strip) {
    case "chip":
      out.push(rule(S, `margin:-54px 0 0 20px;width:fit-content;max-width:calc(100% - 40px);border-radius:999px;padding:8px 16px;background:#fff;border:1px solid ${rgba(ink, 0.14)};box-shadow:0 8px 24px ${rgba(ink, 0.16)}`));
      out.push(rule(P, "font-size:20px;font-weight:900"));
      break;
    case "bar":
      out.push(rule(S, `margin-top:0;border-radius:0;border-top:2px solid ${ink};border-bottom:2px solid ${ink};box-shadow:none;background:#fff`));
      out.push(rule(P, "font-size:26px;font-weight:900"));
      break;
    case "float":
      out.push(rule(S, `margin:-36px 20px 0;border-radius:999px;padding:16px 22px;background:#fff;box-shadow:0 16px 36px ${rgba(ink, 0.18)}`));
      out.push(rule(P, "font-size:22px;font-weight:900"));
      break;
    case "dark":
      out.push(rule(S, `margin-top:0;border-radius:0;background:${ink};box-shadow:none`));
      out.push(rule(P, "font-size:40px;font-weight:900;color:#fff"));
      out.push(rule(N, "color:rgba(255,255,255,.88)"));
      out.push(rule(C, "background:rgba(255,255,255,.18);color:#fff"));
      break;
    case "badge":
      out.push(rule(S, `margin:-28px 18px 0;transform:rotate(-2deg);border:3px solid ${ink};border-radius:14px;background:#fff;box-shadow:6px 6px 0 ${ink}`));
      out.push(rule(P, "font-size:28px;font-weight:900"));
      break;
    case "hair":
      out.push(rule(S, `justify-content:center;text-align:center;border-radius:0;background:transparent;box-shadow:none;border-top:1px solid ${rgba(ink, 0.25)};border-bottom:1px solid ${rgba(ink, 0.25)};letter-spacing:.06em`));
      out.push(rule(P, "font-size:17px;font-weight:600"));
      break;
    case "grid":
      out.push(rule(S, `display:grid;grid-template-columns:auto 1fr;gap:0;border-radius:0;box-shadow:none;background:#fff;border:1px solid ${ink}`));
      out.push(rule(P, `font-size:30px;font-weight:900;padding-right:14px;margin-right:14px;border-right:1px solid ${ink}`));
      break;
    default:
      out.push(rule(S, `margin:0 20px;border-radius:0;background:transparent;box-shadow:none;border-left:4px solid ${ink};padding-left:16px`));
      out.push(rule(P, "font-size:22px;font-weight:800"));
  }
  // ── 한눈에 보기 (473: 2=1×2, 3=1×3, 4=2×2). 열 규칙은 짧은 선택자(게이트는 장식 규칙에만) — 474 다이어트
  const g = `${scope} [data-pz-glance-grid]`;
  const G = `${scope} [data-pz-glance]${hs("glance")}`;
  out.push(rule(g, "display:grid;gap:12px;width:100%"));
  out.push(`${scope} [data-pz-glance="2"] [data-pz-glance-grid],${scope} [data-pz-glance="4"] [data-pz-glance-grid]{grid-template-columns:1fr 1fr${IMP}}`);
  out.push(`${scope} [data-pz-glance="3"] [data-pz-glance-grid],${scope} [data-pz-glance="5"] [data-pz-glance-grid],${scope} [data-pz-glance="6"] [data-pz-glance-grid]{grid-template-columns:1fr 1fr 1fr${IMP}}`);
  out.push(rule(`${g}>*`, "min-width:0"));
  switch (r.glance) {
    case "list":
      out.push(rule(`${G} [data-pz-glance-grid]>*`, `padding:10px 12px;border-left:3px solid ${ink};background:transparent`));
      break;
    case "grid2":
      out.push(rule(`${G} [data-pz-glance-grid]>*`, `padding:10px 12px;border:1px solid ${rgba(ink, 0.2)};border-radius:8px;background:#fff`));
      break;
    case "pills":
      out.push(rule(`${G} [data-pz-glance-grid]`, "justify-items:center"));
      out.push(rule(`${G} [data-pz-glance-grid]>*`, `padding:8px 14px;border-radius:999px;background:#fff;border:1px solid ${rgba(ink, 0.14)};text-align:center`));
      break;
    case "scroll":
      out.push(rule(`${G} [data-pz-glance-grid]`, "display:flex;flex-wrap:nowrap;overflow-x:auto;gap:10px;scroll-snap-type:x mandatory;padding-bottom:6px;-webkit-overflow-scrolling:touch"));
      out.push(rule(`${G} [data-pz-glance-grid]>*`, "flex:0 0 auto;scroll-snap-align:start;min-width:42%"));
      break;
    case "cards":
      out.push(rule(`${G} [data-pz-glance-grid]>*`, `padding:14px;border-radius:16px;background:#fff;box-shadow:0 8px 20px ${rgba(ink, 0.12)}`));
      break;
    case "bignum":
      out.push(rule(`${G} [data-pz-glance-grid]>*`, `padding:12px 10px;font-size:20px;font-weight:900;letter-spacing:-.03em;border-bottom:2px solid ${ink}`));
      break;
    case "airy":
      out.push(rule(G, "padding:28px 0"));
      out.push(rule(`${G} [data-pz-glance-grid]`, "gap:20px 24px"));
      break;
    default:
      out.push(rule(G, `border-left:4px solid ${ink}`));
  }
  // ── 탭 칩 (hero-471: nav.pagzly-anchor-nav:not([data-pz-hs="nav"]) a{…min-height:44px)
  const A = `${scope} nav.pagzly-anchor-nav${hs("nav")} a`;
  const base = "min-height:44px;display:inline-flex;align-items:center;padding:0 14px;white-space:nowrap";
  switch (r.nav) {
    case "underline": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:2px solid ${ink};font-weight:700`)); break;
    case "box": out.push(rule(A, `${base};border-radius:0;background:#fff;border:2px solid ${ink}`)); break;
    case "pill": out.push(rule(A, `${base};border-radius:999px;background:#fff;border:1px solid ${rgba(ink, 0.16)}`)); break;
    case "dark": out.push(rule(A, `${base};border-radius:6px;background:${ink};border:0;color:#fff`)); break;
    case "sticker": out.push(rule(A, `${base};border-radius:12px;background:#fff;border:2px solid ${ink};box-shadow:2px 2px 0 ${ink}`)); break;
    case "spaced": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;letter-spacing:.16em;font-size:12px`)); break;
    case "tab": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:3px solid ${rgba(ink, 0.3)}`)); break;
    default: out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:2px dotted ${ink}`));
  }
  return out.join("");
}

// ── 장식 숫자(고스트 글자) 배치 ────────────────────────────────────────────────
const GHOST_MAX = { 5: 110, 4: 96, 3: 84 } as const;
export const GHOST_MIN_BAND = 50;

export function resolveGhostV5(pos: GhostPos, padTop: number, padBottom: number): { pos: GhostPos; band: number } | null {
  const wantTop = pos === "tl" || pos === "tc" || pos === "le";
  const want = wantTop ? padTop : padBottom;
  if (want >= GHOST_MIN_BAND) return { pos, band: want };
  const other = wantTop ? padBottom : padTop;
  if (other < GHOST_MIN_BAND) return null;
  const map: Record<GhostPos, GhostPos> = { tl: "bl", tc: "bc", le: "re", bl: "tl", bc: "tc", br: "tl", re: "le" };
  return { pos: map[pos], band: other };
}

export type GhostBox = { x: number; y: number; w: number; h: number; size: number };
export function ghostBoxV5(pos: GhostPos, band: number, text: string, W: number, H: number, level: 3 | 4 | 5): GhostBox {
  const size = Math.max(36, Math.min(GHOST_MAX[level], band - 14));
  const w = [...text].length * 0.62 * size; const h = size * 0.9;
  const top = pos === "tl" || pos === "tc" || pos === "le";
  const y = top ? 6 : H - 6 - h;
  const x = pos === "tl" || pos === "bl" ? 16 : pos === "tc" || pos === "bc" ? (W - w) / 2 : pos === "br" ? W - 16 - w : pos === "le" ? -w * 0.22 : W - w * 0.78;
  return { x, y, w, h, size };
}

export function overlapRatioV5(g: GhostBox, o: { W: number; H: number; padTop: number; padBottom: number; titleSize: number; titleLines: number }): { titleOverlap: number; contentOverlap: number; cutRatio: number } {
  const colW = Math.min(576, o.W - 48);
  const colX = (o.W - colW) / 2;
  const inter = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const title = { x: colX, y: o.padTop, w: colW, h: 30 + o.titleLines * o.titleSize * 1.25 };
  const last = { x: colX, y: o.H - o.padBottom - 60, w: colW, h: 60 };
  const gb = { x: g.x, y: g.y, w: g.w, h: g.h };
  const outside = Math.max(0, -g.x) + Math.max(0, g.x + g.w - o.W);
  return { titleOverlap: inter(gb, title) / (title.w * title.h), contentOverlap: inter(gb, last) / (last.w * last.h), cutRatio: Math.min(1, outside / Math.max(1, g.w)) };
}
