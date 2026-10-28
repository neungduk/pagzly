/**
 * 471차 V5 — 첫 화면 구간 배치 레시피. 어떤 아키타입이든 "히어로 → 가격 줄 → 한눈에 보기 → 탭 칩" 4단이 같은 높이·같은 모양이었다.
 * 히어로 변형(A~D, 466차 선호표)은 이미 다르지만 그 아래 세 단은 공통이어서, 여기서 세 단과 히어로 사진 비율, 장식 숫자 위치를 아키타입마다 정한다.
 *
 * 방식: DOM·문구·핸들러는 그대로 두고 CSS만 덮어쓴다(가격 줄 `[data-pz-strip]`, 그 바로 뒤 형제 `한눈에 보기` 블록, 탭 칩 `nav.pagzly-anchor-nav a`).
 *  - 가격·배송 칩·가격 문구·구매 위치는 이동·숨김 없음(보이는 모양만), 탭 칩의 href(앵커 이동)·sticky는 그대로, 터치 대상 44px 이상, 글자 ≥12px.
 *  - 규칙 선택자에 `:not([data-pz-hs="…"])`를 붙인다 — 어떤 요소에도 없는 속성이라 항상 참인 **표식**이며 특이도를 올려 기존 규칙을 이긴다. 지표 도구는 이 표식으로 V5 규칙을 찾는다.
 * V5 꺼짐·편집 모드에서는 호출되지 않는다(`archetypeCssV5`와 같은 자리).
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";

export type StripKind = "chip" | "bar" | "float" | "dark" | "badge" | "hair" | "grid" | "rule";
export type GlanceKind = "list" | "grid2" | "pills" | "scroll" | "airy" | "rule";
export type NavKind = "underline" | "box" | "pill" | "dark" | "sticker" | "spaced" | "tab" | "dotted";
/** 장식 숫자 위치: tl 왼쪽 위 안쪽 · tc 위 가운데 · bl/bc/br 아래 여백 · le/re 왼쪽/오른쪽 가장자리에 반쯤 걸침(위쪽 여백 안) — 우상단 고정 없음 */
export type GhostPos = "tl" | "tc" | "bl" | "bc" | "br" | "le" | "re";

export const HERO_STACK: Record<ArchetypeId, { strip: StripKind; glance: GlanceKind; nav: NavKind; ratio: string; ghost: GhostPos }> = {
  editorial: { strip: "chip", glance: "list", nav: "underline", ratio: "4 / 4.8", ghost: "tl" },
  catalog: { strip: "bar", glance: "grid2", nav: "box", ratio: "1 / 1", ghost: "bl" },
  softlife: { strip: "float", glance: "pills", nav: "pill", ratio: "4 / 5", ghost: "br" },
  impact: { strip: "dark", glance: "scroll", nav: "dark", ratio: "4 / 5.4", ghost: "le" },
  techsheet: { strip: "grid", glance: "rule", nav: "tab", ratio: "3 / 2.4", ghost: "tc" },
  narrative: { strip: "rule", glance: "list", nav: "dotted", ratio: "4 / 5.6", ghost: "bc" },
  luxe: { strip: "hair", glance: "airy", nav: "spaced", ratio: "1 / 1.15", ghost: "re" },
  pop: { strip: "badge", glance: "scroll", nav: "sticker", ratio: "5 / 4.4", ghost: "tl" },
};

const IMP = "!important";
const rule = (sel: string, decl: string): string => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;
const rgba = (ink: string, a: number): string => {
  const n = parseInt(ink.replace("#", "").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function heroStackCssV5(scope: string, id: ArchetypeId, ink: string): string {
  const r = HERO_STACK[id];
  const out: string[] = [];
  // ── 히어로 사진 비율(스플릿 D의 사진 칸; 그 밖의 히어로는 자기 틀 비율 그대로). 높이 상한 640px은 인라인 max-height가 그대로 건다
  out.push(rule(`${scope} [data-hero-v2="D"]:not([data-pz-hs="ratio"])>[data-hero-photo]`, `aspect-ratio:${r.ratio}`));
  // ── 가격 줄
  const S = `${scope} [data-pz-strip]:not([data-pz-hs="strip"])`;
  const P = `${S} [data-pz-strip-price]`; const N = `${S} [data-pz-strip-name]`; const C = `${S} [data-pz-strip-chip]`;
  switch (r.strip) {
    case "chip":
      out.push(rule(S, `margin:-54px 0 0 20px;width:fit-content;max-width:calc(100% - 40px);border-radius:999px;padding:8px 16px;background:#FFFFFF;border:1px solid ${rgba(ink, 0.14)};box-shadow:0 8px 24px ${rgba(ink, 0.16)}`));
      out.push(rule(P, "font-size:20px;font-weight:900"));
      break;
    case "bar":
      out.push(rule(S, `margin-top:0;border-radius:0;border-top:2px solid ${ink};border-bottom:2px solid ${ink};box-shadow:none;background:#FFFFFF`));
      out.push(rule(P, "font-size:26px;font-weight:900"));
      break;
    case "float":
      out.push(rule(S, `margin:-30px 16px 0;border-radius:22px;padding:14px 18px;background:#FFFFFF;box-shadow:0 14px 34px ${rgba(ink, 0.16)}`));
      out.push(rule(P, "font-size:22px;font-weight:900"));
      break;
    case "dark":
      out.push(rule(S, `margin-top:0;border-radius:0;background:${ink};box-shadow:none`));
      out.push(rule(P, "font-size:34px;font-weight:900;color:#FFFFFF"));
      out.push(rule(N, "color:rgba(255,255,255,0.88)"));
      out.push(rule(C, "background:rgba(255,255,255,0.18);color:#FFFFFF"));
      break;
    case "badge":
      out.push(rule(S, `margin:-24px 18px 0;transform:rotate(-1.5deg);border:3px solid ${ink};border-radius:14px;background:#FFFFFF;box-shadow:5px 5px 0 ${ink}`));
      out.push(rule(P, "font-size:26px;font-weight:900"));
      break;
    case "hair":
      out.push(rule(S, `justify-content:center;text-align:center;border-radius:0;background:transparent;box-shadow:none;border-top:1px solid ${rgba(ink, 0.25)};border-bottom:1px solid ${rgba(ink, 0.25)};letter-spacing:0.06em`));
      out.push(rule(P, "font-size:17px;font-weight:600"));
      break;
    case "grid":
      out.push(rule(S, `display:grid;grid-template-columns:auto 1fr;gap:0;border-radius:0;box-shadow:none;background:#FFFFFF;border:1px solid ${ink}`));
      out.push(rule(P, `font-size:30px;font-weight:900;padding-right:14px;margin-right:14px;border-right:1px solid ${ink}`));
      break;
    default:
      out.push(rule(S, `margin:0 20px;border-radius:0;background:transparent;box-shadow:none;border-left:4px solid ${ink};padding-left:16px`));
      out.push(rule(P, "font-size:22px;font-weight:800"));
  }
  // ── 한눈에 보기(가격 줄 바로 뒤 형제 블록): 바깥 블록 B, 항목을 담는 flex 상자 B>div, 항목 B>div>div
  const B = `${scope} [data-pz-strip]+div:not([data-pz-hs="glance"])`;
  switch (r.glance) {
    case "list":
      out.push(rule(B, "text-align:left"));
      out.push(rule(`${B}>div`, "flex-direction:column;align-items:flex-start;row-gap:12px;max-width:none;margin:0"));
      break;
    case "grid2":
      out.push(rule(`${B}>div`, "display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:none;margin:0"));
      break;
    case "pills":
      out.push(rule(`${B}>div`, "justify-content:center;gap:8px;row-gap:8px"));
      out.push(rule(`${B}>div>div`, `padding:8px 14px;border-radius:999px;background:#FFFFFF;border:1px solid ${rgba(ink, 0.14)}`));
      break;
    case "scroll":
      out.push(rule(`${B}>div`, "flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;scroll-snap-type:x mandatory;padding-bottom:6px;max-width:none;margin:0;-webkit-overflow-scrolling:touch"));
      out.push(rule(`${B}>div>div`, "flex:0 0 auto;scroll-snap-align:start"));
      break;
    case "airy":
      out.push(rule(B, "padding-top:44px;padding-bottom:44px"));
      out.push(rule(`${B}>div`, "row-gap:30px;column-gap:28px"));
      break;
    default:
      out.push(rule(B, `text-align:left;background:transparent;border-left:4px solid ${ink}`));
  }
  // ── 탭 칩(앵커 이동·sticky 불변; 모양만)
  const A = `${scope} nav.pagzly-anchor-nav:not([data-pz-hs="nav"]) a`;
  const base = "min-height:44px;display:inline-flex;align-items:center;padding:0 14px;white-space:nowrap";
  switch (r.nav) {
    case "underline": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:2px solid ${ink};font-weight:700`)); break;
    case "box": out.push(rule(A, `${base};border-radius:0;background:#FFFFFF;border:2px solid ${ink}`)); break;
    case "pill": out.push(rule(A, `${base};border-radius:999px;background:#FFFFFF;border:1px solid ${rgba(ink, 0.16)}`)); break;
    case "dark": out.push(rule(A, `${base};border-radius:6px;background:${ink};border:0;color:#FFFFFF`)); break;
    case "sticker": out.push(rule(A, `${base};border-radius:12px;background:#FFFFFF;border:2px solid ${ink};box-shadow:2px 2px 0 ${ink}`)); break;
    case "spaced": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;letter-spacing:0.16em;font-size:12px`)); break;
    case "tab": out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:3px solid ${rgba(ink, 0.3)}`)); break;
    default: out.push(rule(A, `${base};border-radius:0;background:transparent;border:0;border-bottom:2px dotted ${ink}`));
  }
  return out.join("");
}

// ── 장식 숫자(고스트 글자) 배치 ────────────────────────────────────────────────
/** 위쪽/아래쪽 여백 띠 안에 들어가는 최대 글자 크기(강도별) */
const GHOST_MAX = { 5: 110, 4: 96, 3: 84 } as const;
export const GHOST_MIN_BAND = 50;

/** 여백 띠 안에 놓을 수 있는 위치로 정한다: 요청한 위치의 띠가 작으면 더 큰 띠로 옮기고, 둘 다 작으면 null(장식 숫자 없음) */
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
/** 섹션 로컬 좌표(폭 W, 높이 H)에서 장식 숫자 상자. 글자 폭 ≈ 글자 수 × 0.62em, 높이 ≈ 0.9em */
export function ghostBoxV5(pos: GhostPos, band: number, text: string, W: number, H: number, level: 3 | 4 | 5): GhostBox {
  const size = Math.max(36, Math.min(GHOST_MAX[level], band - 14));
  const w = [...text].length * 0.62 * size; const h = size * 0.9;
  const top = pos === "tl" || pos === "tc" || pos === "le";
  const y = top ? 6 : H - 6 - h;
  const x = pos === "tl" || pos === "bl" ? 16 : pos === "tc" || pos === "bc" ? (W - w) / 2 : pos === "br" ? W - 16 - w : pos === "le" ? -w * 0.22 : W - w * 0.78;
  return { x, y, w, h, size };
}

/**
 * 장식 숫자와 제목 상자의 겹침: 제목 상자 = 가운데 열(최대 576, 좌우 24) × (여백 위 padTop부터 눈썹 30px + 제목 줄 수 × 제목 크기 × 1.25).
 * 반환: titleOverlap(겹친 면적 ÷ 제목 면적), contentOverlap(아래 여백 쪽: 마지막 내용 60px 띠와 겹침 ÷ 그 면적), cutRatio(섹션 밖으로 나간 비율)
 */
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
