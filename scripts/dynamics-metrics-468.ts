/**
 * 468차 — "진짜 다이나믹" 대리 지표(문자열 전용: 말뭉치 export HTML을 읽을 뿐, 브라우저·네트워크 없음). 본문 섹션(히어로 제외)만 센다.
 *  ① 보이는 진한 면 비율: 466차 darkShare는 사진 배너(스크림)를 빼고 쟀다 → 배너를 포함한 "추정 높이 가중" 비율로 재정의.
 *  ② 읽히는 초점 비율: aria-hidden·pointer-events:none·svg·고스트 글자를 뺀 글자 노드의 최대 글자 크기 ÷ 14px(섹션별, 페이지 중앙값).
 *  ③ 구도: 섹션을 단일 컬럼 / 풀블리드 / 비대칭 / 겹침으로 나눈다(겹침·풀블리드·비대칭은 겹쳐 셀 수 있고 하나도 아니면 단일).
 *  ④ 빈 틀: 사진이 못 불러올 때 남는 틀(사진 상자)의 추정 높이(750폭, 컨테이너 576 기준) — 최대·평균, 사진 틀 수.
 *  ⑤ 사진 틀 종류 비율: 페이지의 고유 틀 서명 수 ÷ 사진 틀 수.
 * 한계: 높이는 문자 수·사진 수 어림이고 실제 렌더 높이가 아니다. 배너 어두움 비율은 구조 상수(docs/dynamics-audit-468.md §1).
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { topSections } from "./variety-metrics-463";
import { darkShare } from "./variety-metrics-466";

const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);
const BODY_PX = 14;

// ── 공통 ─────────────────────────────────────────────────────────────────────
type Txt = { text: string; size: number };

/** 선언 값에서 글자 크기(px). clamp·min·max는 안의 가장 큰 px/rem 값, 상속(em·없음)은 null */
export function sizeOf(st: string): number | null {
  const all = [...st.matchAll(/(?:^|;)\s*font-size:\s*([^;]+)/g)];
  const m = all[all.length - 1]; // CSS는 뒤의 선언이 이긴다
  if (!m) return null;
  const v = m[1]!;
  const vals = [...v.matchAll(/(\d+(?:\.\d+)?)(px|rem)/g)].map((x) => parseFloat(x[1]!) * (x[2] === "rem" ? 16 : 1));
  return vals.length ? Math.max(...vals) : null;
}

/** 읽히는 글자 노드(장식·svg·style·script 제외)의 크기 목록 */
export function readableTexts(sec: string): Txt[] {
  const out: Txt[] = [];
  const stack: Array<{ size: number; hidden: boolean }> = [{ size: 16, hidden: false }];
  const re = /<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let skip: string | null = null; let skipDepth = 0;
  for (let m = re.exec(sec); m; m = re.exec(sec)) {
    if (m[5] !== undefined) {
      const txt = m[5].replace(/&[a-z#0-9]+;/gi, " ").trim();
      const top = stack[stack.length - 1]!;
      if (txt && !top.hidden && !skip) out.push({ text: txt, size: top.size });
      continue;
    }
    const [, close, tag, attrs, self] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (skip) {
      if (!close && t === skip && !self) skipDepth += 1;
      else if (close && t === skip) { skipDepth -= 1; if (skipDepth === 0) skip = null; }
      continue;
    }
    if (close) { if (stack.length > 1 && !VOID.has(t)) stack.pop(); continue; }
    if (t === "svg" || t === "style" || t === "script") { if (!self) { skip = t; skipDepth = 1; } continue; }
    if (VOID.has(t) || self) continue;
    const top = stack[stack.length - 1]!;
    const st = /style="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const hidden = top.hidden || /aria-hidden="true"/.test(attrs) || /pointer-events:\s*none/.test(st) || /data-pz-ghost/.test(attrs);
    stack.push({ size: sizeOf(st) ?? top.size, hidden });
  }
  return out;
}

const bodiesOf = (html: string): string[] => topSections(expandDedupedStyles(html));
const rootOf = (sec: string): string => sec.slice(0, sec.indexOf(">") + 1);
const isBanner = (sec: string): boolean => /pagzly-illustration-banner/.test(rootOf(sec));

// ── ① 보이는 진한 면 ──────────────────────────────────────────────────────────
/** 추정 높이(px): 글자 수·사진 수 어림. 배너는 16:9(750폭 ≈ 422)로 고정 */
export function estHeight(sec: string): number {
  if (isBanner(sec)) return 422;
  const chars = readableTexts(sec).reduce((a, t) => a + t.text.length, 0);
  const photos = Math.min(3, (sec.match(/<img\b(?![^>]*aria-hidden="true")/g) ?? []).length);
  return 120 + 1.6 * chars + 300 * photos;
}

/** 배너가 "화면에서 어두운 면"으로 치는 비율: 전면 스크림=사진 전체가 짙게 덮임(1), 카드만=어두운 카드(≈.35), 분리 띠=아래 띠(≈.25) */
export function bannerDark(sec: string): number {
  if (!isBanner(sec)) return 0;
  const hasScrim = /position:absolute;inset:0;background:linear-gradient/.test(sec) || /pagzly-banner-scrim/.test(sec) && /position:absolute;inset:0;background:/.test(sec);
  const split = /aspect-ratio:16\/9;overflow:hidden">/.test(sec) && /rgba\(27,27,24,\.96\)|background:rgba\(\d+,\d+,\d+,\.9\d\)/.test(sec);
  if (split) return 0.25;
  return hasScrim ? 1 : 0.35;
}

export function visibleDark(html: string): number {
  let dark = 0; let all = 0;
  for (const sec of bodiesOf(html)) {
    const h = estHeight(sec);
    all += h;
    dark += h * (isBanner(sec) ? bannerDark(sec) : darkShare(sec));
  }
  return all ? dark / all : 0;
}

/** 페이지의 전면 스크림(어두운) 사진 배너 수 — 눈에 큰 진한 덩어리로 보이는 것(면 비율 지표는 배너가 페이지 높이에서 작아 이 덩어리를 못 드러낸다) */
export function darkBanners(html: string): number {
  return bodiesOf(html).filter((s) => isBanner(s) && bannerDark(s) === 1).length;
}
export function banners(html: string): number {
  return bodiesOf(html).filter(isBanner).length;
}

// ── ② 읽히는 초점 비율 ────────────────────────────────────────────────────────
export function readableFocal(html: string): number {
  const f: number[] = [];
  for (const sec of bodiesOf(html)) {
    const sizes = readableTexts(sec).map((t) => t.size).filter((s) => s < 120);
    if (sizes.length) f.push(Math.max(...sizes) / BODY_PX);
  }
  f.sort((a, b) => a - b);
  return f.length ? f[Math.floor(f.length / 2)]! : 0;
}

// ── ③ 구도 ───────────────────────────────────────────────────────────────────
export type Comp = "single" | "bleed" | "asym" | "overlap";
/** `margin` 단축형/개별 속성에서 [위, 오른, 아래, 왼] px(숫자가 아닌 값은 NaN) 목록 */
function marginsOf(x: string): number[][] {
  const out: number[][] = [];
  const num = (v: string): number => (/^-?\d+(?:\.\d+)?px$/.test(v) ? parseFloat(v) : /^0$/.test(v) ? 0 : NaN);
  for (const m of x.matchAll(/(?:^|[;"\s])margin:\s*([^;"]+)/g)) {
    const v = m[1]!.trim().split(/\s+/).map(num);
    const [t, r = t, b = t, l = r] = v as [number, number?, number?, number?];
    out.push([t, r!, b!, l!]);
  }
  for (const m of x.matchAll(/margin-(top|right|bottom|left):\s*(-?\d+(?:\.\d+)?)px/g)) {
    const o = [NaN, NaN, NaN, NaN]; o[{ top: 0, right: 1, bottom: 2, left: 3 }[m[1] as "top"]] = parseFloat(m[2]!); out.push(o);
  }
  return out;
}

export function compOf(sec: string): Set<Comp> {
  const x = expandDedupedStyles(sec);
  const out = new Set<Comp>();
  const root = rootOf(x);
  // 장식(aria-hidden 상자)은 빼고 본다
  const body = x.replace(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "").replace(/^[^>]*>/, "");
  const ms = marginsOf(body);
  // 겹침: 위·아래 음수 마진, 위로 올리는 translate, 루트가 위 섹션으로 솟음
  const vNeg = ms.some(([t, , b]) => t! < 0 || b! < 0);
  if (vNeg || /margin-top:\s*-\d/.test(root) || /transform:[^;"]*translate[XY]?\((?:-\d|[^)]*,\s*-\d)/.test(body)) out.add("overlap");
  // 풀블리드: 배너, 가로 음수 마진(컨테이너 밖으로), 가로 패딩 0 루트
  const hNeg = ms.some(([, r, , l]) => r! < 0 || l! < 0);
  if (isBanner(x) || hNeg || /(?:^|;)padding:\s*\d+px 0(?:px)?(?:;|")/.test(root)) out.add("bleed");
  // 비대칭: 열 폭이 다른 flex/grid, 어긋난 translate, 좌우 마진 차 ≥ 20px
  const flexPct = [...x.matchAll(/flex:\s*0 0 (\d+)%/g)].map((m) => Number(m[1])).filter((n) => n !== 50 && n !== 100);
  const grid = [...x.matchAll(/grid-template-columns:\s*([^;"]+)/g)].map((m) => m[1]!).filter((v) => !/repeat\(\d+,\s*1fr\)|^1fr( 1fr)*$/.test(v.trim()) && /fr|%/.test(v));
  const padAsym = [...body.matchAll(/max-width:576px;margin:0 auto[^"]*;padding-(?:left|right):(\d+)px/g)].some((m) => Number(m[1]) >= 24);
  const stagger = /transform:[^;"]*translate[XY]\(\d/.test(body);
  const offset = ms.some(([, r, , l]) => Number.isFinite(r) && Number.isFinite(l) && Math.abs(r! - l!) >= 20) || ms.some(([, r, , l]) => (Number.isFinite(l) && l! >= 20 && Number.isNaN(r!)) || (Number.isFinite(r) && r! >= 20 && Number.isNaN(l!)));
  const flexUneven = new Set([...x.matchAll(/flex:\s*(\d+(?:\.\d+)?) 1 (\d+)px/g)].map((m) => Number(m[2]))).size > 1;
  if (flexPct.length || grid.length || stagger || offset || flexUneven || padAsym) out.add("asym");
  if (out.size === 0) out.add("single");
  return out;
}

export function compShares(html: string): { single: number; bleedOrAsym: number; overlap: number; n: number } {
  const secs = bodiesOf(html);
  let s = 0; let ba = 0; let o = 0;
  for (const sec of secs) {
    const c = compOf(sec);
    if (c.has("single")) s += 1;
    if (c.has("bleed") || c.has("asym")) ba += 1;
    if (c.has("overlap")) o += 1;
  }
  const n = secs.length || 1;
  return { single: s / n, bleedOrAsym: ba / n, overlap: o / n, n: secs.length };
}

/** 연속 3개 섹션이 모두 단일 컬럼인 구간 수 */
export function singleRuns3(html: string): number {
  const flags = bodiesOf(html).map((s) => compOf(s).has("single"));
  let n = 0;
  for (let i = 0; i + 2 < flags.length; i += 1) if (flags[i] && flags[i + 1] && flags[i + 2]) n += 1;
  return n;
}

// ── ④⑤ 빈 틀·사진 틀 종류 ─────────────────────────────────────────────────────
const CONTAINER = 576;
export type FrameInfo = { sig: string; h: number; sec: number };

/** 사진 상자(overflow:hidden 안에 <img>가 있는 div)별 추정 높이·서명 */
export function photoFrames(html: string): FrameInfo[] {
  const out: FrameInfo[] = [];
  bodiesOf(html).forEach((sec0, si) => {
    if (isBanner(sec0)) return;
    const sec = expandDedupedStyles(sec0);
    for (const m of sec.matchAll(/<div[^>]*style="([^"]*overflow:hidden[^"]*)"[^>]*>\s*(?:<(?:div|span)[^>]*>\s*)?<img\b(?![^>]*aria-hidden="true")/g)) {
      const st = m[1]!;
      const ar = /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(st);
      const hpx = /(?:^|;)height:\s*(\d+)px/.exec(st);
      const wpx = /(?:^|;)width:\s*(\d+)px/.exec(st);
      const pct = /flex:\s*0 0 (\d+)%/.exec(st);
      const basis = /flex:\s*[\d.]+ [\d.]+ (\d+)px/.exec(st);
      const w = wpx ? Number(wpx[1]) : pct ? CONTAINER * Number(pct[1]) / 100 : basis ? Math.min(CONTAINER, Number(basis[1])) : CONTAINER;
      const h = hpx ? Number(hpx[1]) : ar ? w * Number(ar[2]) / Number(ar[1]) : 0;
      const sig = `${/border-radius:\s*([^;"]+)/.exec(st)?.[1] ?? "0"}|${ar ? `${ar[1]}/${ar[2]}` : "auto"}|${/transform:\s*([^;"]+)/.exec(st)?.[1] ?? ""}`;
      out.push({ sig, h, sec: si });
    }
  });
  return out;
}

export function frameStats(html: string): { max: number; mean: number; count: number; kinds: number; kindRatio: number } {
  const fr = photoFrames(html);
  if (!fr.length) return { max: 0, mean: 0, count: 0, kinds: 0, kindRatio: 1 };
  // V5 켜짐의 폴백 규칙(`[data-pz-np]{max-height:Npx!important}`)이 문서에 있으면 그 상한을 적용한다
  const cap = /\[data-pz-np\]\{[^}]*max-height:(\d+)px!important/.exec(html)?.[1];
  const hs = fr.map((f) => (cap ? Math.min(f.h, Number(cap)) : f.h));
  const kinds = new Set(fr.map((f) => f.sig)).size;
  return { max: Math.max(...hs), mean: hs.reduce((a, b) => a + b, 0) / hs.length, count: fr.length, kinds, kindRatio: kinds / fr.length };
}
