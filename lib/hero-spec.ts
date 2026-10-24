/**
 * 437차 — 첫 화면(히어로) 재설계 사양·변형·마크업. 레퍼런스(제작사 상세페이지 예시)의 공통점 — 브랜드 소형 + **제품명 대형** + 한 줄 훅 + 사진이 화면 대부분 + 배지·해시태그 — 를 따른다.
 * 새 문구·수치 없음: 제품명·브랜드명·훅(기존 히어로 제목/부제)·키워드·인증 문구는 모두 입력·기존 생성 문구를 재배치하고, 인증·수상 배지는 판매자 입력에 있을 때만(텍스트 알약, 이미지·로고 생성 없음).
 * 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 heroV2Html 한 벌을 그대로 쓴다(패리티 0). 인라인 스타일·aspect-ratio·flex·position·linear/radial-gradient·mix-blend-mode(B 변형 흰 배경 컷만, 아니면 폴백)만 쓴다.
 *
 * 390×844 기준 사양(HERO_SPEC): 제품명 32~44px·굵기 800~900·2줄 상한, 훅 18~22px, 사진 영역 첫 화면의 55~70%, 가격 스트립이 히어로 하단 경계에 걸침.
 * 428차 구간 제목 28px 상한은 히어로에는 적용하지 않는다(히어로 전용 예외 — 이 파일의 제품명 크기).
 *
 * 변형(사진 종류·제품 유형(436 아키타입)·mood로 결정적으로 선택, 불확실하면 안전한 A→E):
 *   A 라이프스타일 풀블리드 · B 컬러 필드(대표색 포화 면 + 사진이 하단에서 걸쳐 올라옴) · C 다크 시네마 · D 스플릿 · E 타이포
 * 플래그 NEXT_PUBLIC_HERO_V2=off 이면 436차 히어로 그대로.
 */
import type { DetailSection, HeroSection } from "@/lib/types/generate";
import type { ProductImageOrigin } from "@/lib/image-origins";
import type { MoodId } from "@/lib/archetype-recipes";
import type { ArchetypeId } from "@/lib/product-archetype";
import { contrastRatioToken, hexToRgba, mixHex, pastelFace } from "@/lib/design-tokens";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import type { CategoryTheme } from "@/lib/category-theme";
import { buildProofRows } from "@/lib/evidence-modules";
import { checkText, type ClaimFacts } from "@/lib/numeric-claim-gate";
import { DESIGN_POLISH_ENABLED } from "@/lib/design-polish";
import { polishTitles } from "@/lib/typo-rhythm";
import { DESIGN_V4_ENABLED, designV4On } from "@/lib/design-v4";
import { HERO_FACE_CAP, ghostFadeBackground } from "@/lib/design-tokens-v4";
import { designV2On } from "@/lib/design-v2";
import { motifSvg } from "@/lib/motifs";
import { v4Palette } from "@/lib/palette-v4";

export const HERO_V2_ENABLED = process.env.NEXT_PUBLIC_HERO_V2 !== "off";
/** 438차 조정(사진 면적 확보·텍스트 압축·스크림·실패 폴백). NEXT_PUBLIC_HERO_V2=prev 이면 437차 사양 그대로, off 이면 436차 히어로 */
export const HERO_V2_TUNED = process.env.NEXT_PUBLIC_HERO_V2 !== "off" && process.env.NEXT_PUBLIC_HERO_V2 !== "prev";

export const HERO_SPEC = {
  nameMinPx: 32, nameMaxPx: 44, nameWeights: [800, 900] as const, nameMaxLines: 2,
  hookMinPx: 18, hookMaxPx: 22,
  badgeMax: 3, tagMax: 4,
  /** 첫 화면(844) 안에서 히어로 사진 영역 비율 목표 */
  photoShareMin: 0.55, photoShareMax: 0.7,
  /** 사진 위 스크림: 텍스트 영역의 최소 불투명도(어두운 스크림 위 흰 글자 4.5:1 보장 — 최악 흰 사진 기준) */
  scrimTextAlpha: 0.6,
} as const;

export type HeroV2Variant = "A" | "B" | "C" | "D" | "E";
export const HERO_V2_VARIANTS: readonly HeroV2Variant[] = ["A", "B", "C", "D", "E"];
export const HERO_V2_LABEL: Record<HeroV2Variant, string> = { A: "라이프스타일 풀블리드", B: "컬러 필드", C: "다크 시네마", D: "스플릿", E: "타이포" };

export type HeroPhotoKind = "person" | "product" | "unknown";

/** 438차 1-3 — 포화 면 색 힌트: 사진 지배색(테마 대표색)이 무채색에 가까울 때만 쓰는 색상(상품명·브랜드·키워드의 색상어 → mood 순) */
export type HeroHueHint = { hue: number | "dark"; source: "keyword" | "mood" };

export type HeroV2Plan = {
  /** 438차 — 포화 면 색 힌트(DESIGN_POLISH). 없으면 대표색 그대로 */
  hueHint?: HeroHueHint;
  variant: HeroV2Variant;
  photoKind: HeroPhotoKind;
  /** 사진 종류 판별 신뢰도(0~1) — 낮으면 안전 변형 */
  confidence: number;
  /** 제품명(입력). 괄호 안 한글이 있으면 한글을 주 제품명으로, 나머지를 작은 보조줄로(둘 다 입력 그대로) */
  name: string;
  nameSub?: string;
  brand?: string;
  imageUrl: string;
  /** 흰 배경 제품 컷이라 multiply 블렌드를 쓸 수 있다고 본 경우(B) */
  whiteBg: boolean;
  badges: string[];
  tags: string[];
  /** 사진 object-position */
  pos: string;
  /** 439차 2-4 — 히어로 v3 레이어(DESIGN_V4). 없으면 438차 히어로 */
  v3?: HeroV3;
};

/**
 * 439차 2-4 — 히어로 v3: 레이어 합성. 레이어 순서(아래 → 위)를 데이터로 두고 변형 A~E에 매핑한다.
 *  face(배경 면) → motif(모티프) → ghost(거대 고스트 제품명, 옅게) → photo(제품 사진: 고스트 글자 앞으로 겹쳐 올라옴) → name·hook(제품명·훅) → chips·price(칩·가격 태그) → sticker(원형 스티커 배지)
 * 장식 레이어(motif·ghost·sticker)는 사진 영역에만 겹치고(sticker는 사진 위, ghost·motif는 사진 뒤), 글 블록은 그보다 위 z에 있어 가려지지 않는다.
 * 글자는 모두 입력: 고스트=제품명(영문/한글 중 짧은 쪽), 스티커=입력 배지(인증·시험) 또는 구매 혜택 한 개, 가격=입력 가격(가격 스트립이 없는 카테고리에서만 — 중복 방지).
 * 사진 실패 폴백(438)은 그대로: 사진·스티커가 함께 접히고(data-hero-photo), 고스트·글은 남는다.
 */
export type HeroLayerId = "face" | "motif" | "ghost" | "photo" | "name" | "hook" | "chips" | "price" | "sticker";
export const HERO_LAYER_ORDER: readonly HeroLayerId[] = ["face", "motif", "ghost", "photo", "name", "hook", "chips", "price", "sticker"];
/** 레이어 z(같은 값은 같은 층) */
export const HERO_LAYER_Z: Record<HeroLayerId, number> = { face: 0, motif: 1, ghost: 2, photo: 3, name: 4, hook: 4, chips: 5, price: 5, sticker: 6 };
/** 변형별로 쓰는 v3 레이어와 그 영역(photo = 사진 영역에만 겹침, text = 글 블록 안 흐름) */
export const HERO_V3_LAYERS: Record<HeroV2Variant, Array<{ id: "motif" | "ghost" | "sticker" | "price"; region: "photo" | "text" }>> = {
  A: [{ id: "sticker", region: "photo" }, { id: "price", region: "text" }],
  B: [{ id: "motif", region: "photo" }, { id: "ghost", region: "photo" }, { id: "sticker", region: "photo" }, { id: "price", region: "text" }],
  C: [{ id: "motif", region: "photo" }, { id: "ghost", region: "photo" }, { id: "sticker", region: "photo" }, { id: "price", region: "text" }],
  D: [{ id: "ghost", region: "text" }, { id: "sticker", region: "photo" }, { id: "price", region: "text" }],
  E: [{ id: "motif", region: "text" }, { id: "ghost", region: "text" }, { id: "sticker", region: "photo" }, { id: "price", region: "text" }],
};
export type HeroV3 = { ghost?: string; sticker?: string; price?: string; motifVariant: number; mood: string | null };

/** 고스트 글자: 영문 보조줄과 한글 주 제품명 중 짧은 쪽(2자 이상) */
export function ghostWordOf(name: string, nameSub?: string): string {
  const cands = [name, nameSub ?? ""].map((s) => s.trim()).filter((s) => [...s].length >= 2);
  if (!cands.length) return "";
  const best = cands.reduce((a, b) => ([...b].length < [...a].length ? b : a));
  return /[가-힣]/.test(best) ? best : best.toUpperCase();
}

/**
 * 447차 2-a — 긴 한글 제품명 고스트 대체(DESIGN_V4). 제품명이 길어 폭 맞춤(ghostFitPx)이 0(끔)이 되면 입력 글자만으로 다른 후보를 고른다:
 * 제품명 첫 단어 · 영문 보조줄 · 브랜드 중 폭에 맞는(44px 이상) 가장 짧은 것. 맞는 후보가 없으면 끈다. 원래 단어가 맞으면 그대로(예전 결과 유지).
 * 라이브·export가 같은 계획(heroV3Of)을 쓰므로 같은 값.
 */
export function ghostFitWordOf(name: string, nameSub?: string, brand?: string): string {
  const first = ghostWordOf(name, nameSub);
  if (!first || ghostFitPx(first) > 0) return first;
  const cands = [name.trim().split(/\s+/)[0] ?? "", nameSub ?? "", brand ?? ""]
    .map((c) => c.trim())
    .filter((c) => [...c].length >= 2)
    .map((c) => (/[가-힣]/.test(c) ? c : c.toUpperCase()))
    .filter((c) => ghostFitPx(c) > 0);
  return cands.length ? cands.reduce((a, b) => ([...b].length < [...a].length ? b : a)) : "";
}

/** 스티커 글: 12자 이하 한 개 */
export const STICKER_MAX = 12;

/** 흰 글자가 4.5:1 이상이 될 때까지 검정 쪽으로 섞은 면(스티커·가격 태그 바탕) */
export function darkenForWhite(hex: string, min = 4.5): string {
  for (let k = 0; k <= 1.0001; k += 0.05) { const c = mixHex(hex, "#000000", k); if (contrastRatioToken("#FFFFFF", c) >= min) return c; }
  return "#000000";
}
/** 글자색 fg가 고스트 위에서도 4.5:1이 되는 가장 진한 고스트 섞기(면에서 흰색/잉크 쪽으로 t만큼) */
export function ghostColor(face: string, fg: string, toward: string, ts: readonly number[] = [0.16, 0.12, 0.08, 0.05, 0.03]): string {
  for (const t of ts) { const c = mixHex(face, toward, t); if (contrastRatioToken(fg, c) >= 4.5) return c; }
  return face;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── 제품명 ────────────────────────────────────────────────────────────────
/** "Dream Glow Camellia Essence Mist (드림 글로우 카멜리아 에센스 미스트)" → 한글 괄호 안을 주 제품명으로, 앞부분은 작은 보조줄 */
export function splitProductName(raw: string): { main: string; sub?: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  const m = /^(.*?)\s*[(（]([^)）]*[가-힣][^)）]*)[)）]\s*$/.exec(name);
  if (m && m[1]!.trim() && !/[가-힣]/.test(m[1]!)) return { main: m[2]!.trim(), sub: m[1]!.trim() };
  return { main: name };
}

/** 제품명 글자 크기(px): 길수록 작게, 32~44 범위 */
export function heroNameSizePx(main: string): number {
  const n = [...main].length;
  return n <= 10 ? 44 : n <= 16 ? 40 : n <= 24 ? 36 : 32;
}

// ── 사진 종류·변형 선택 ─────────────────────────────────────────────────────
const PERSON_TAG = /착용|인물|모델|전신|사람|손|포즈|앉은|서 있/;
const PRODUCT_TAG = /단독|정면|제품컷|누끼|패키지|병|용기/;
const WHITE_BG_TAG = /흰\s?배경|화이트\s?배경|누끼|배경\s?없/;

/** 사진 종류를 규칙으로 추정(비전 태그·역할이 있을 때). 모르면 unknown */
export function estimatePhotoKind(tags: ReadonlyArray<string> | undefined, role: string | undefined): { kind: HeroPhotoKind; confidence: number; whiteBg: boolean } {
  const t = (tags ?? []).join(" ");
  const person = PERSON_TAG.test(t);
  const product = PRODUCT_TAG.test(t);
  const whiteBg = WHITE_BG_TAG.test(t);
  if (person && !product) return { kind: "person", confidence: 0.85, whiteBg: false };
  if (product && !person) return { kind: "product", confidence: 0.8, whiteBg };
  if (role === "lifestyle") return { kind: "person", confidence: 0.5, whiteBg: false };
  if (role === "hero" || role === "package") return { kind: "product", confidence: 0.5, whiteBg };
  return { kind: "unknown", confidence: 0, whiteBg: false };
}

const GROUP_OF = (archetype: ArchetypeId | null, category: string | undefined): "beauty" | "fashion" | "tech" | "food" | "living" | "other" => {
  const id = archetype && archetype !== "default" ? archetype.split("-")[0] : null;
  if (id === "beauty" || id === "fashion" || id === "tech" || id === "food" || id === "living") return id;
  const c = category ?? "";
  if (/뷰티|화장품/.test(c)) return "beauty";
  if (/패션|의류/.test(c)) return "fashion";
  if (/전자|가전/.test(c)) return "tech";
  if (/식품/.test(c)) return "food";
  if (/생활|리빙|반려/.test(c)) return "living";
  return "other";
};

/**
 * 변형 선택(결정적). 사진이 없으면 E, 사진 종류를 모르거나 신뢰도가 낮으면 안전 변형 A, 사람 사진은 풀블리드 A,
 * 제품 단독 컷은 유형·mood로 B(컬러 필드)·C(다크 시네마)·D(스플릿).
 */
export function selectHeroVariant(i: { hasPhoto: boolean; kind: HeroPhotoKind; confidence: number; archetype: ArchetypeId | null; mood: MoodId | null; category?: string }): HeroV2Variant {
  if (!i.hasPhoto) return "E";
  if (i.kind === "person") return "A";
  if (i.kind === "unknown" || i.confidence < 0.45) return "A";
  const g = GROUP_OF(i.archetype, i.category);
  if (g === "beauty") return i.mood === "minimal-luxe" ? "D" : "B";
  if (g === "fashion") return "D";
  if (g === "tech") return i.archetype === "tech-appliance" ? "D" : "C";
  if (g === "food") return "B";
  if (g === "living") return i.archetype === "living-petkids" ? "B" : "D";
  return "D";
}

// ── 해시태그·배지 ───────────────────────────────────────────────────────────
/** 핵심 키워드에서 짧은 키워드(2~8자)만 해시태그로. `#`로 주어진 것은 그대로. 숫자 게이트 위반 토큰은 제외 */
export function hashtagsFrom(keyFeatures: string | null | undefined, facts: ClaimFacts | null, max: number = HERO_SPEC.tagMax): string[] {
  const raw = (keyFeatures ?? "").trim();
  if (!raw) return [];
  const explicit = [...raw.matchAll(/#([가-힣A-Za-z0-9_]{2,12})/g)].map((m) => m[1]!);
  const pieces = explicit.length > 0 ? explicit : raw.replace(/[:：]/g, ",").split(/[,，、·\/\n]/).map((s) => s.trim());
  const out: string[] = [];
  for (const p of pieces) {
    const t = p.replace(/\s+/g, "");
    if (t.length < 2 || t.length > 8 || /[()（）[\]]/.test(t) || /\d/.test(t) || /(입니다|합니다|있음|없음|가능|용량|사용법|성분)$/.test(t) || /^(용량|사용법|핏|계절|색상|소재)$/.test(t)) continue;
    if (facts && checkText(t, facts).bad) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** 히어로 배지: 기존 히어로 배지(hero.badge) + 입력 인증·시험·수상 문구(433 증빙 규칙·규제 정규식 통과분)만, 최대 3개 */
export function heroBadgesFrom(hero: HeroSection, certifications: string, category: string | undefined, facts: ClaimFacts): string[] {
  const out: string[] = [];
  if (hero.badge?.trim()) out.push(hero.badge.trim());
  for (const r of buildProofRows(certifications, category, facts)) if (!out.includes(r.label)) out.push(r.label);
  return out.slice(0, HERO_SPEC.badgeMax);
}

// ── 색 ─────────────────────────────────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** 포화 면(B): 대표색의 색상은 유지하고 채도 ≥0.6·명도 0.22~0.46으로 올린 뒤, 흰 글자 대비 4.5:1이 될 때까지 명도를 낮춘다 */
export function saturatedFace(accent: string): string {
  const [h, s0] = hexToHsl(accent);
  const s = Math.max(0.6, Math.min(0.85, s0 + 0.15));
  for (let l = 0.46; l >= 0.2; l -= 0.02) {
    const face = hslToHex(h, s, l);
    if (contrastRatioToken("#FFFFFF", face) >= 4.5) return face;
  }
  return hslToHex(h, s, 0.2);
}

// ── 447차 2-c: OKLCH 상한 ──
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLin = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
export function hexToOklch(hex: string): { L: number; C: number; h: number } {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = toLin(((n >> 16) & 255) / 255), g = toLin(((n >> 8) & 255) / 255), b = toLin((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
export function oklchToHex(L: number, C: number, h: number): string {
  const a = C * Math.cos((h * Math.PI) / 180), b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, fromLin(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
/** 포화 면에 채도·명도 상한을 건다(DESIGN_V4만). 상한 안이면 그대로, 넘으면 색상 유지·채도만 상한으로(명도는 상한 이하로) 두고 흰 글자 4.5:1이 안 되면 명도를 낮춘다 */
export function capFaceChroma(face: string): string {
  if (!designV4On() || !/^#[0-9a-f]{6}$/i.test(face)) return face;
  const o = hexToOklch(face);
  if (o.C <= HERO_FACE_CAP.chroma && o.L <= HERO_FACE_CAP.lightness) return face;
  let L = Math.min(o.L, HERO_FACE_CAP.lightness);
  const C = Math.min(o.C, HERO_FACE_CAP.chroma);
  let out = oklchToHex(L, C, o.h);
  for (let k = 0; k < 40 && contrastRatioToken("#FFFFFF", out) < 4.5; k += 1) { L -= 0.01; out = oklchToHex(L, C, o.h); }
  return out;
}

/** 색상어 → 색상(도). 무채색어는 dark만 */
const COLOR_WORDS: Array<[RegExp, number | "dark"]> = [
  [/코랄/, 10], [/체리|레드|빨강|버건디|와인/, 352], [/핑크|로즈|장미/, 338], [/오렌지|주황|살구/, 24], [/옐로|노랑|레몬|머스터드/, 46],
  [/올리브|카키/, 75], [/민트/, 165], [/그린|초록|녹차|말차|쑥/, 128], [/스카이|하늘/, 200], [/네이비|남색/, 225], [/블루|파랑/, 212],
  [/라벤더|퍼플|보라|바이올렛/, 270], [/브라운|갈색|카멜|모카|초코|커피/, 26], [/블랙|검정|차콜/, "dark"],
];
const MOOD_HUE: Record<string, number | "dark"> = { natural: 128, clinic: 205, playful: 336, warm: 24, street: "dark", "minimal-luxe": "dark" };

/** 입력 문구의 색상어 → mood 순으로 색 힌트(둘 다 없으면 없음) */
export function hueHintOf(text: string, mood: string | null | undefined): { hueHint?: HeroHueHint } {
  for (const [re, hue] of COLOR_WORDS) if (re.test(text)) return { hueHint: { hue, source: "keyword" } };
  if (mood && mood in MOOD_HUE) return { hueHint: { hue: MOOD_HUE[mood]!, source: "mood" } };
  return {};
}

/** 대표색이 무채색에 가깝다(채도 낮음·너무 밝음·너무 어두움) */
export function isNearNeutral(hex: string): boolean {
  const [, s, l] = hexToHsl(hex);
  return s < 0.22 || l > 0.88 || l < 0.1;
}

/** 포화 면 색 결정: ① 사진 지배색(테마 대표색)이 유채색이면 그것 ② 아니면 색상어 ③ 아니면 mood ④ 신호 없으면 대표색 그대로(437차 동작) */
export function heroFaceColor(accent: string, hint: HeroHueHint | undefined): { face: string; source: "photo" | "keyword" | "mood" | "accent" } {
  if (!hint || !isNearNeutral(accent)) return { face: capFaceChroma(saturatedFace(accent)), source: hint ? "photo" : "accent" };
  if (hint.hue === "dark") return { face: "#1F2026", source: hint.source };
  return { face: capFaceChroma(saturatedFace(hslToHex(hint.hue, 0.7, 0.45))), source: hint.source };
}

/** 사진 위 스크림 불투명도 곡선(0=아래 끝). 텍스트 영역(아래 약 45%)에서 최소 scrimTextAlpha 이상 */
export function scrimGradient(tuned: boolean = HERO_V2_TUNED): string {
  // 438차: 알파 ≥0.6 구간을 텍스트 영역(하단 약 44%)에만 두고 그 위는 빠르게 투명하게 — 얼굴·상체가 덜 가려진다(대비는 텍스트 영역 기준 유지)
  if (tuned) return "linear-gradient(0deg,rgba(10,10,10,0.9) 0%,rgba(10,10,10,0.74) 30%,rgba(10,10,10,0.6) 46%,rgba(10,10,10,0) 100%)";
  return "linear-gradient(0deg,rgba(10,10,10,0.9) 0%,rgba(10,10,10,0.78) 34%,rgba(10,10,10,0.62) 48%,rgba(10,10,10,0) 78%)";
}
/**
 * 448차 1-3 — 히어로 A 글 블록 자체 스크림(DESIGN_V4). 아래 62% 스크림은 글 블록(이름·보조줄·훅·태그·가격)이 길어지면 윗줄(제품명)이 알파 ≥0.6 구간 위로 올라가
 * 흰 사진·밝은 하늘·파스텔에서 흰 제목 대비가 2:1대로 떨어졌다. 글 블록이 자기 뒤에 항상 알파 0.62 이상의 면을 깔면 사진 밝기·블록 높이와 무관하게 보장된다
 * (위 FEATHER px는 부드러운 가장자리). 사진 분석 없이 정적으로 보장 — 라이브·export가 같은 마크업 함수.
 */
export const HERO_TEXT_SCRIM_FEATHER_PX = 40;
export const HERO_TEXT_SCRIM_ALPHA = 0.62;
export function heroTextScrim(): string {
  const f = HERO_TEXT_SCRIM_FEATHER_PX;
  return `linear-gradient(180deg,rgba(10,10,10,0) 0,rgba(10,10,10,${HERO_TEXT_SCRIM_ALPHA}) ${f}px,rgba(10,10,10,0.78) 100%)`;
}

/** 최악의 사진(흰색) 위 스크림 알파 a에서 흰 글자의 대비 — 회귀가 ≥4.5를 확인 */
export function worstCaseScrimContrast(alpha: number): number {
  const v = Math.round(255 * (1 - alpha) + 10 * alpha);
  return contrastRatioToken("#FFFFFF", `#${v.toString(16).padStart(2, "0").repeat(3)}`);
}

// ── 마크업 ─────────────────────────────────────────────────────────────────
export type HeroPalette = Pick<CategoryTheme, "accent" | "deepAccent" | "accentSoft" | "baseNeutral"> & { /** 슬롯 파스텔 면 */ face: string };
export const heroPalette = (theme: CategoryTheme, category?: string): HeroPalette => ({ accent: theme.accent, deepAccent: theme.deepAccent, accentSoft: theme.accentSoft, baseNeutral: theme.baseNeutral, face: pastelFace(theme, category) });

const title = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
const sans = `font-family:${DETAIL_FONT_STACK.sans}`;

const nameHtml = (p: HeroV2Plan, color: string, size: number, weight: number): string =>
  `<h1 data-hero-name="${size}" style="margin:0;${title};font-size:${size}px;font-weight:${weight};letter-spacing:-0.03em;line-height:1.14;color:${color};word-break:keep-all;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${HERO_SPEC.nameMaxLines};overflow:hidden">${esc(p.name)}</h1>`;
const ONE_LINE = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
const subNameHtml = (p: HeroV2Plan, color: string): string => (p.nameSub ? `<p style="margin:8px 0 0;${HERO_V2_TUNED ? ONE_LINE : ""}${sans};font-size:12px;font-weight:600;letter-spacing:0.08em;line-height:1.3;color:${color};text-transform:uppercase">${esc(p.nameSub)}</p>` : "");
const hookHtml = (hero: HeroSection, color: string, sub: string): string =>
  `<p data-hero-hook style="margin:14px 0 0;${title};font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.35;color:${color};word-break:keep-all">${esc(hero.headline)}</p>` +
  (hero.subheadline ? `<p style="margin:8px 0 0;${HERO_V2_TUNED ? ONE_LINE : ""}${sans};font-size:15px;font-weight:500;line-height:1.6;color:${sub};word-break:keep-all">${esc(hero.subheadline)}</p>` : "");
const brandPill = (p: HeroV2Plan, bg: string, color: string): string =>
  p.brand ? `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${bg};color:${color};${sans};font-size:12px;font-weight:700;letter-spacing:0.08em;line-height:1.2;text-transform:uppercase">${esc(p.brand)}</span>` : "";
const badgeRow = (p: HeroV2Plan, bg: string, color: string, border: string): string =>
  p.badges.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${p.badges.map((b) => `<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:${bg};border:1px solid ${border};color:${color};${sans};font-size:12px;font-weight:700;line-height:1.2">${esc(b)}</span>`).join("")}</div>` : "";
const tagRow = (p: HeroV2Plan, color: string, border: string): string =>
  p.tags.length ? `<div style="display:flex;flex-wrap:${HERO_V2_TUNED ? "nowrap;overflow:hidden" : "wrap"};gap:6px;margin-top:${HERO_V2_TUNED ? 12 : 16}px">${p.tags.map((t) => `<span style="display:inline-block;padding:6px 12px;border-radius:999px;border:1px solid ${border};color:${color};${sans};font-size:13px;font-weight:600;line-height:1.2">#${esc(t)}</span>`).join("")}</div>` : "";
/** 가격 스트립(428)이 히어로 하단 경계에 걸쳐 한 덩어리로 보이게: 위로 20px 올리고 위쪽 모서리를 둥글게 */
const STRIP_OVERLAP_CSS = `<style>[data-pz-strip]{position:relative;z-index:2;margin-top:-20px;border-radius:20px 20px 0 0;box-shadow:0 -6px 16px rgba(27,27,24,0.08)}</style>`;
const STRIP_OVERLAP_CSS_TUNED = `<style>[data-pz-strip]{position:relative;z-index:2;margin-top:-12px;border-radius:16px 16px 0 0;box-shadow:0 -4px 12px rgba(27,27,24,0.08)}</style>`;

/** 438차 1-2 — 사진 실패 안전 폴백. onerror(로드 실패)·onload 검사(초소형 240px 미만·종횡비 3:1 초과)면 히어로에 data-hero-fail을 달고 이미지를 숨긴다(alt는 접근성용으로 남지만 시각 노출 없음). CSS가 변형별로 사진 자리를 접어 타이포 히어로처럼 남긴다 */
export const HERO_FAIL_ONERROR = "var s=this.closest('[data-hero-v2]');if(s)s.setAttribute('data-hero-fail','1');this.style.display='none'";
export const HERO_FAIL_ONLOAD = "if(this.naturalWidth<240||this.naturalHeight<240||this.naturalWidth/this.naturalHeight>3||this.naturalHeight/this.naturalWidth>3){this.onerror()}";
export const HERO_FAIL_CSS = `<style>[data-hero-fail] [data-hero-scrim],[data-hero-fail] [data-hero-photo]{display:none}[data-hero-v2="A"][data-hero-fail]{aspect-ratio:auto!important;max-height:none!important;padding:0 0 8px}[data-hero-v2="A"][data-hero-fail] [data-hero-a-text]{position:static!important;padding-bottom:0!important}[data-hero-v2="A"][data-hero-fail] [data-hero-a-text]:last-child{padding:24px 24px 44px!important}[data-hero-v2="D"][data-hero-fail]{background:transparent!important}</style>`;
/** 439차 1-(d) — D형은 브랜드 알약이 사진 위에 있어 사진 실패 시 함께 사라졌다 → 글 블록에 숨겨 둔 알약을 실패 때만 보인다(DESIGN_V4) */
/**
 * 440차 눈 검수 H2 — v3 B·C형은 사진이 실패해 사진 자리가 접히면 글 블록(가격 태그)이 히어로 맨 아래에 붙어, 가격 띠 겹침(-12px)과 아래 둥근 모서리에 가려졌다.
 * 아래 여백을 주고, 사진 영역에 걸려 있던 고스트·모티프는 사진과 함께 접는다.
 */
const HERO_FAIL_CSS_V3 = `<style>[data-hero-v3][data-hero-v2="B"][data-hero-fail],[data-hero-v3][data-hero-v2="C"][data-hero-fail]{padding-bottom:40px!important}${["B", "C"].flatMap((v) => ["ghost", "motif"].map((l) => `[data-hero-v3][data-hero-v2="${v}"][data-hero-fail] [data-hl=${l}]`)).join(",")}{display:none}</style>`;
const HERO_FAIL_CSS_V4 = `<style>[data-hero-brand-fallback]{display:none}[data-hero-fail] [data-hero-brand-fallback]{display:block}</style>`;

/** 히어로 마크업(438차: 제목 줄 끝 고아 줄이기를 함께 적용 — DESIGN_POLISH) */
export function heroV2Html(hero: HeroSection, p: HeroV2Plan, pal: HeroPalette, alt: string): string {
  return polishTitles(heroV2HtmlBase(hero, p, pal, alt));
}

// ── 439차 2-4 히어로 v3 레이어 마크업 ─────────────────────────────────────────
/** 고스트 글자 크기(px): 짧을수록 크게 */
export const ghostPx = (word: string): number => { const n = [...word].length; return n <= 4 ? 120 : n <= 6 ? 96 : n <= 9 ? 76 : 60; };
/**
 * 446차 3 — 고스트 글자 폭 맞춤(DESIGN_V4). 크기를 글자 수로만 정해서 9자(76px)면 폭이 약 650px로 좁은 화면(390)에서 사진 가장자리에 반쯤 잘려 보였다.
 * 글자별 폭(em)을 어림해(한글·한자 0.95, 대문자 0.68, 숫자 0.58, 공백 0.28, 그 밖 0.6, 자간 -0.05em) 좁은 화면 폭의 84%(좌우 안전 여백 8%) 안에 들어오는 크기로 줄이고,
 * 44px 아래로 내려가야 하면 고스트를 끈다(0). v4 off면 예전 크기 그대로. 라이브·export가 같은 마크업 함수를 쓰므로 같은 값.
 */
export const GHOST_SAFE_WIDTH_PX = Math.floor(390 * 0.84);
export const GHOST_MIN_PX = 44;
/** 사진 뒤(B·C형) 고스트는 면 쪽으로 더 옅게 섞는다(사진 가장자리에서 글자가 사진과 경쟁하지 않게) */
export const GHOST_ON_PHOTO_MIX = [0.1, 0.08, 0.05, 0.03] as const;
export function ghostEm(word: string): number {
  let em = 0;
  for (const ch of [...word]) {
    em += /[가-힣ㄱ-ㅎ一-龥]/.test(ch) ? 0.95 : /[A-Z]/.test(ch) ? 0.68 : /[0-9]/.test(ch) ? 0.58 : ch === " " ? 0.28 : 0.6;
    em -= 0.05;
  }
  return Math.max(0.1, em);
}
export function ghostFitPx(word: string): number {
  const base = ghostPx(word);
  if (!designV4On()) return base;
  const fit = Math.min(base, Math.floor(GHOST_SAFE_WIDTH_PX / ghostEm(word)));
  return fit < GHOST_MIN_PX ? 0 : fit;
}
/**
 * 446차 3 — 히어로 B형 사진 프레임 변주(DESIGN_V4). 아치 + 원형 스티커가 히어로마다 같은 문법이던 것을 아치·원형 컷·직사각 오프셋 이중 프레임 3종으로.
 * 선택은 결정적(같은 상품은 항상 같은 프레임): 계획의 시드값(motifVariant = seed % 8)을 3으로 나눈 나머지. 흰 배경 컷아웃(whiteBg)·v4 off는 기존 아치/컷아웃 그대로.
 * 같은 카테고리의 다른 상품끼리 겹치지 않게 하는 것은 페이지 사이 상태가 필요해 보장하지 않는다(시드 분포로 섞음 — 회귀가 말뭉치에서 3종 모두 쓰이는지 확인).
 */
export type HeroFrame = "arch" | "circle" | "offset";
export const HERO_FRAMES: readonly HeroFrame[] = ["arch", "circle", "offset"];
export function heroFrameOf(p: { v3?: { motifVariant: number } }): HeroFrame {
  return designV4On() ? HERO_FRAMES[(p.v3?.motifVariant ?? 0) % HERO_FRAMES.length]! : "arch";
}
const layerAttrs = (id: HeroLayerId) => `data-hl="${id}" data-hz="${HERO_LAYER_Z[id]}"`;
/** 443차 4-2 — 히어로 B형 고스트 글자 가장자리 페이드: 고스트와 같은 박스에 면 색 그라데이션 덮개(고스트 바로 뒤 형제, 같은 z). 고스트가 없으면 빈 문자열 */
function v3GhostFade(p: HeroV2Plan, face: string, geom: "top" | "bottom" = "top"): string {
  const g = p.v3?.ghost;
  if (!g || !designV4On() || !/^#[0-9a-f]{6}$/i.test(face)) return "";
  const px = ghostFitPx(g);
  if (!px) return "";
  // top: B·C형(고스트가 위 가장자리에 걸침, 좌우 -2%·위 -0.55em) → 좌우+위. bottom: D형(면 아래쪽 구간에서 오른쪽 아래로 앉아 왼쪽이 잘리고 글자 아래가 구간 끝에서 평평하게 잘림) → 좌우+아래
  const place = geom === "top" ? `left:-2%;right:-2%;top:${-0.55 * px}px;z-index:-1` : `left:0;right:0;bottom:16px;z-index:0`;
  return `<span aria-hidden="true" data-hl-fade="ghost" style="position:absolute;${place};height:${Math.round(px * 0.9)}px;background:${ghostFadeBackground(face, geom)};pointer-events:none"></span>`;
}
function v3Ghost(p: HeroV2Plan, color: string, place: string): string {
  const g = p.v3?.ghost;
  const px = g ? ghostFitPx(g) : 0;
  return g && px ? `<span aria-hidden="true" ${layerAttrs("ghost")} style="position:absolute;${place};${title};font-size:${px}px;font-weight:900;letter-spacing:-0.05em;line-height:0.9;color:${color};white-space:nowrap;pointer-events:none">${esc(g)}</span>` : "";
}
function v3Motif(p: HeroV2Plan, pal: HeroPalette, color: string, place: string, id: "blob" | "rings" | "dots", w: number, h: number): string {
  if (!p.v3) return "";
  return `<span aria-hidden="true" ${layerAttrs("motif")} style="position:absolute;${place};width:${w}px;height:${h}px;pointer-events:none">${motifSvg(id, w, h, { a: color, b: color, c: color }, p.v3.motifVariant)}</span>`;
}
function v3Sticker(p: HeroV2Plan, pal: HeroPalette, place: string): string {
  const s = p.v3?.sticker;
  if (!s) return "";
  const bg = darkenForWhite(v4Palette({ accent: pal.accent, deep: pal.deepAccent }, p.v3!.mood).point);
  const words = s.split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const lines = words.length >= 2 ? [words.slice(0, half).join(" "), words.slice(half).join(" ")] : [s];
  return (
    `<span data-hero-photo ${layerAttrs("sticker")} style="position:absolute;${place};width:84px;height:84px;transform:rotate(-8deg)">${motifSvg("sticker", 84, 84, { a: bg, b: bg, c: bg })}` +
    `<span style="position:absolute;left:0;top:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:12px;text-align:center;${sans};font-size:12px;font-weight:800;line-height:1.2;color:#FFFFFF;word-break:keep-all">${lines.map(esc).join("<br/>")}</span></span>`
  );
}
function v3Price(p: HeroV2Plan, bg: string, fg: string): string {
  return p.v3?.price ? `<div style="margin-top:14px"><span ${layerAttrs("price")} style="display:inline-block;padding:7px 18px 7px 12px;border-radius:4px 999px 999px 4px;background:${bg};${title};font-size:18px;font-weight:900;letter-spacing:-0.01em;line-height:1.2;color:${fg};white-space:nowrap">${esc(p.v3.price)}</span></div>` : "";
}

function heroV2HtmlBase(hero: HeroSection, p: HeroV2Plan, pal: HeroPalette, alt: string): string {
  if (p.v3) return heroV3Html(hero, p, pal, alt);
  const size = heroNameSizePx(p.name);
  const failAttrs = HERO_V2_TUNED ? ` onerror="${HERO_FAIL_ONERROR}" onload="${HERO_FAIL_ONLOAD}"` : "";
  const img = (extra: string) => `<img src="${esc(p.imageUrl)}" alt="${esc(alt)}" fetchpriority="high" decoding="async"${failAttrs} style="${extra}"/>`;
  const wrapOpen = (v: HeroV2Variant, style: string) => `${HERO_V2_TUNED ? STRIP_OVERLAP_CSS_TUNED + HERO_FAIL_CSS + (DESIGN_V4_ENABLED && v === "D" && p.brand ? HERO_FAIL_CSS_V4 : "") : STRIP_OVERLAP_CSS}<section data-hero-v2="${v}" class="hero pagzly-hero" style="position:relative;width:100%;box-sizing:border-box;overflow:hidden;border-radius:0 0 24px 24px;${style}">`;
  if (p.variant === "A") {
    return (
      wrapOpen("A", "aspect-ratio:4 / 5.4;max-height:760px;background:#1B1B18") +
      img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`) +
      `<div aria-hidden="true" data-hero-scrim style="position:absolute;left:0;right:0;top:0;height:${HERO_V2_TUNED ? 14 : 22}%;background:linear-gradient(180deg,rgba(10,10,10,${HERO_V2_TUNED ? 0.3 : 0.5}),rgba(10,10,10,0))"></div>` +
      `<div aria-hidden="true" data-hero-scrim style="position:absolute;left:0;right:0;bottom:0;height:${HERO_V2_TUNED ? 62 : 68}%;background:${scrimGradient()}"></div>` +
      `<div data-hero-a-text style="position:absolute;left:0;right:0;top:0;padding:20px 20px 0">${brandPill(p, "rgba(10,10,10,0.5)", "#FFFFFF")}${p.badges.length ? `<div style="margin-top:10px">${badgeRow(p, "rgba(10,10,10,0.38)", "#FFFFFF", "rgba(255,255,255,0.55)")}</div>` : ""}</div>` +
      `<div data-hero-a-text style="position:absolute;left:0;right:0;bottom:0;padding:0 24px 44px">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "rgba(255,255,255,0.92)")}${hookHtml(hero, "#FFFFFF", "rgba(255,255,255,0.96)")}${tagRow(p, "#FFFFFF", "rgba(255,255,255,0.55)")}</div></section>`
    );
  }
  if (p.variant === "B") {
    const face = heroFaceColor(pal.accent, p.hueHint).face;
    const photo = p.whiteBg
      ? `<div data-hero-photo style="position:relative;margin:24px auto 0;width:84%;aspect-ratio:4 / 4.6">${img("position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply")}</div>`
      : `<div data-hero-photo style="position:relative;margin:${HERO_V2_TUNED ? 16 : 20}px auto 0;width:${HERO_V2_TUNED ? 96 : 90}%;aspect-ratio:${HERO_V2_TUNED ? "4 / 5.2" : "4 / 4.9"};border-radius:999px 999px 0 0;overflow:hidden;box-shadow:0 -10px 30px rgba(10,10,10,0.25);background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>`;
    return (
      wrapOpen("B", `background:${face};isolation:isolate`) +
      `<div style="padding:28px 24px 0">${brandPill(p, "rgba(255,255,255,0.2)", "#FFFFFF")}<div style="margin-top:16px">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "#FFFFFF")}${hookHtml(hero, "#FFFFFF", "#FFFFFF")}${tagRow(p, "#FFFFFF", "rgba(255,255,255,0.6)")}</div>${p.badges.length ? `<div style="margin-top:14px">${badgeRow(p, "rgba(255,255,255,0.18)", "#FFFFFF", "rgba(255,255,255,0.55)")}</div>` : ""}</div>` +
      `${photo}</section>`
    );
  }
  if (p.variant === "C") {
    const glow = hexToRgba(pal.accent, 0.5);
    return (
      wrapOpen("C", `background:#0E0E10 radial-gradient(60% 45% at 50% 66%,${hexToRgba(pal.accent, 0.4)},rgba(14,14,16,0) 70%)`) +
      `<div style="padding:28px 24px 0;text-align:center">${brandPill(p, "rgba(255,255,255,0.14)", "#FFFFFF")}<div style="margin-top:16px">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "rgba(255,255,255,0.75)")}${hookHtml(hero, "#FFFFFF", "rgba(255,255,255,0.82)")}<div style="display:flex;justify-content:center">${tagRow(p, "#FFFFFF", "rgba(255,255,255,0.5)")}</div></div>${p.badges.length ? `<div style="margin-top:14px;display:flex;justify-content:center">${badgeRow(p, "rgba(255,255,255,0.12)", "#FFFFFF", "rgba(255,255,255,0.45)")}</div>` : ""}</div>` +
      `<div data-hero-photo style="position:relative;margin:${HERO_V2_TUNED ? 16 : 24}px auto ${HERO_V2_TUNED ? 32 : 44}px;width:${HERO_V2_TUNED ? 96 : 92}%;aspect-ratio:${HERO_V2_TUNED ? "1 / 1.3" : "1 / 1"};border-radius:24px;overflow:hidden;box-shadow:0 0 70px ${glow};background:#1B1B18">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div></section>`
    );
  }
  if (p.variant === "D") {
    const face = pal.face;
    const deep = mixHex(pal.deepAccent, "#000000", 0.35);
    return (
      wrapOpen("D", "background:#FFFFFF") +
      `<div data-hero-photo style="position:relative;width:100%;aspect-ratio:${HERO_V2_TUNED ? "4 / 4.8" : "4 / 4.2"};overflow:hidden;background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}<div style="position:absolute;left:0;top:0;padding:18px 20px">${brandPill(p, "rgba(255,255,255,0.9)", "#1B1B18")}</div></div>` +
      `<div style="background:${face};padding:28px 24px 44px">${DESIGN_V4_ENABLED && p.brand ? `<div data-hero-brand-fallback style="margin:0 0 14px">${brandPill(p, "#FFFFFF", "#1B1B18")}</div>` : ""}${nameHtml(p, "#1B1B18", size, 900)}${subNameHtml(p, hexToRgba("#1B1B18", 0.65))}${hookHtml(hero, deep, hexToRgba("#1B1B18", 0.78))}${p.badges.length ? `<div style="margin-top:14px">${badgeRow(p, "#FFFFFF", "#1B1B18", hexToRgba("#1B1B18", 0.2))}</div>` : ""}${tagRow(p, "#1B1B18", hexToRgba("#1B1B18", 0.3))}</div></section>`
    );
  }
  // E 타이포: 큰 제품명·훅 중심 + 사진 작게(원형)
  const face = pal.face;
  return (
    wrapOpen("E", `background:${face};padding:36px 24px 52px`) +
    `<div>${brandPill(p, "#FFFFFF", "#1B1B18")}</div><div style="margin-top:20px">${nameHtml(p, "#1B1B18", size, 900)}${subNameHtml(p, hexToRgba("#1B1B18", 0.65))}${hookHtml(hero, mixHex(pal.deepAccent, "#000000", 0.35), hexToRgba("#1B1B18", 0.78))}</div>` +
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:24px"><div style="flex:1 1 0%;min-width:0">${badgeRow(p, "#FFFFFF", "#1B1B18", hexToRgba("#1B1B18", 0.2))}${tagRow(p, "#1B1B18", hexToRgba("#1B1B18", 0.3))}</div>` +
    (p.imageUrl ? `<div data-hero-photo style="flex:0 0 36%;max-width:180px;aspect-ratio:1 / 1;border-radius:50%;overflow:hidden;box-shadow:0 10px 24px rgba(10,10,10,0.18);background:${pal.baseNeutral}">${img(`display:block;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>` : "") +
    `</div></section>`
  );
}

/**
 * 439차 2-4 — 히어로 v3 마크업. 438차 변형 A~E의 글·사진 배치를 그대로 두고 레이어(모티프·고스트·스티커·가격 태그)를 얹는다.
 * z 규칙: 사진 감싸개(z 3) 안에서 모티프(-2) < 고스트(-1) < 사진(흐름) < 스티커(6) · 글 블록(z 4) — 장식은 글 위로 올라오지 않는다.
 */
/** 440차 눈 검수 H1 — 고스트 글자가 튀어나오거나 깔리는 높이(px). 그만큼 사진 위·패널 아래 여백을 늘려 칩·가격 띠(-12px 겹침)와 겹치지 않는 자기 띠를 준다 */
const ghostBand = (p: HeroV2Plan): number => (p.v3?.ghost ? Math.round(ghostFitPx(p.v3.ghost) * 0.55) : 0);

/** 448차 4 — 히어로(포화·어두운 면) 위 태그·배지 칩 테두리 알파. 0.5~0.6은 면과 2.4~2.8:1이라 칩 경계가 흐렸다 → 3:1 이상(R21). v3 히어로는 v4에서만 쓰인다 */
const HERO_CHIP_BORDER_V4 = "rgba(255,255,255,0.8)";
function heroV3Html(hero: HeroSection, p: HeroV2Plan, pal: HeroPalette, alt: string): string {
  const size = heroNameSizePx(p.name);
  const failAttrs = ` onerror="${HERO_FAIL_ONERROR}" onload="${HERO_FAIL_ONLOAD}"`;
  const img = (extra: string) => `<img src="${esc(p.imageUrl)}" alt="${esc(alt)}" fetchpriority="high" decoding="async"${failAttrs} style="${extra}"/>`;
  const wrapOpen = (v: HeroV2Variant, style: string) => `${STRIP_OVERLAP_CSS_TUNED + HERO_FAIL_CSS + HERO_FAIL_CSS_V3 + (v === "D" && p.brand ? HERO_FAIL_CSS_V4 : "")}<section data-hero-v2="${v}" data-hero-v3 class="hero pagzly-hero" style="position:relative;width:100%;box-sizing:border-box;overflow:hidden;border-radius:0 0 24px 24px;${style}">`;
  const vp = v4Palette({ accent: pal.accent, deep: pal.deepAccent }, p.v3!.mood);
  const priceBg = "#FFFFFF";
  const priceFg = "#1B1B18";
  if (p.variant === "A") {
    return (
      wrapOpen("A", "aspect-ratio:4 / 5.4;max-height:760px;background:#1B1B18") +
      img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`) +
      `<div aria-hidden="true" data-hero-scrim style="position:absolute;left:0;right:0;top:0;height:14%;background:linear-gradient(180deg,rgba(10,10,10,0.3),rgba(10,10,10,0))"></div>` +
      `<div aria-hidden="true" data-hero-scrim style="position:absolute;left:0;right:0;bottom:0;height:62%;background:${scrimGradient(true)}"></div>` +
      `<div data-hero-a-text style="position:absolute;left:0;right:0;top:0;padding:20px ${p.v3!.sticker ? 112 : 20}px 0 20px">${brandPill(p, "rgba(10,10,10,0.5)", "#FFFFFF")}${p.badges.length ? `<div style="margin-top:10px">${badgeRow(p, "rgba(10,10,10,0.38)", "#FFFFFF", "rgba(255,255,255,0.55)")}</div>` : ""}</div>` +
      v3Sticker(p, pal, "top:18px;right:18px;z-index:6") +
      `<div data-hero-a-text style="position:absolute;left:0;right:0;bottom:0;z-index:4;padding:${HERO_TEXT_SCRIM_FEATHER_PX}px 24px 44px;background:${heroTextScrim()}">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "rgba(255,255,255,0.92)")}${hookHtml(hero, "#FFFFFF", "rgba(255,255,255,0.96)")}${tagRow(p, "#FFFFFF", HERO_CHIP_BORDER_V4)}${v3Price(p, priceBg, priceFg)}</div></section>`
    );
  }
  if (p.variant === "B" || p.variant === "C") {
    const isB = p.variant === "B";
    const band = ghostBand(p);
    const face = isB ? heroFaceColor(pal.accent, p.hueHint).face : "#0E0E10";
    const ghost = v3Ghost(p, ghostColor(isB ? face : mixHex(face, pal.accent, 0.22), "#FFFFFF", "#FFFFFF", designV4On() ? GHOST_ON_PHOTO_MIX : undefined), "left:-2%;right:-2%;top:-0.55em;text-align:center;overflow:hidden;z-index:-1") + v3GhostFade(p, isB ? face : "#0E0E10");
    const motif = v3Motif(p, pal, isB ? mixHex(face, "#FFFFFF", 0.1) : mixHex("#0E0E10", pal.accent, 0.35), "left:50%;top:14%;margin-left:-230px;z-index:-2", "blob", 460, 380);
    const photo = isB
      ? p.whiteBg
        ? `<div data-hero-photo style="position:relative;margin:${24 + band}px auto 0;width:84%;aspect-ratio:4 / 4.6">${img("position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply")}</div>`
        : heroFrameOf(p) === "circle"
          ? `<div data-hero-photo data-hero-frame="circle" style="position:relative;margin:${24 + band}px auto 40px;width:78%;aspect-ratio:1 / 1;border-radius:50%;overflow:hidden;box-shadow:0 14px 40px rgba(10,10,10,0.28);background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>`
          : heroFrameOf(p) === "offset"
            ? `<div data-hero-photo data-hero-frame="offset" style="position:relative;margin:${20 + band}px auto 44px;width:80%;aspect-ratio:4 / 4.8"><span aria-hidden="true" style="position:absolute;left:14px;top:14px;right:-14px;bottom:-14px;border:2px solid rgba(255,255,255,0.6);border-radius:6px;pointer-events:none"></span><div style="position:absolute;left:0;top:0;width:100%;height:100%;border-radius:6px;overflow:hidden;box-shadow:0 12px 32px rgba(10,10,10,0.3);background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div></div>`
            : `<div data-hero-photo style="position:relative;margin:${16 + band}px auto 0;width:96%;aspect-ratio:4 / 5.2;border-radius:999px 999px 0 0;overflow:hidden;box-shadow:0 -10px 30px rgba(10,10,10,0.25);background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>`
      : `<div data-hero-photo style="position:relative;margin:${16 + band}px auto 32px;width:96%;aspect-ratio:1 / 1.3;border-radius:24px;overflow:hidden;box-shadow:0 0 70px ${hexToRgba(pal.accent, 0.5)};background:#1B1B18">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>`;
    const text = isB
      ? `<div style="position:relative;z-index:4;padding:28px 24px 0">${brandPill(p, "rgba(255,255,255,0.2)", "#FFFFFF")}<div style="margin-top:16px">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "#FFFFFF")}${hookHtml(hero, "#FFFFFF", "#FFFFFF")}${tagRow(p, "#FFFFFF", HERO_CHIP_BORDER_V4)}</div>${p.badges.length ? `<div style="margin-top:14px">${badgeRow(p, "rgba(255,255,255,0.18)", "#FFFFFF", HERO_CHIP_BORDER_V4)}</div>` : ""}${v3Price(p, priceBg, priceFg)}</div>`
      : `<div style="position:relative;z-index:4;padding:28px 24px 0;text-align:center">${brandPill(p, "rgba(255,255,255,0.14)", "#FFFFFF")}<div style="margin-top:16px">${nameHtml(p, "#FFFFFF", size, 900)}${subNameHtml(p, "rgba(255,255,255,0.75)")}${hookHtml(hero, "#FFFFFF", "rgba(255,255,255,0.82)")}<div style="display:flex;justify-content:center">${tagRow(p, "#FFFFFF", HERO_CHIP_BORDER_V4)}</div></div>${p.badges.length ? `<div style="margin-top:14px;display:flex;justify-content:center">${badgeRow(p, "rgba(255,255,255,0.12)", "#FFFFFF", HERO_CHIP_BORDER_V4)}</div>` : ""}${v3Price(p, priceBg, priceFg)}</div>`;
    return (
      wrapOpen(p.variant, isB ? `background:${face};isolation:isolate` : `background:#0E0E10 radial-gradient(60% 45% at 50% 66%,${hexToRgba(pal.accent, 0.4)},rgba(14,14,16,0) 70%);isolation:isolate`) +
      text +
      `<div style="position:relative;z-index:3">${motif}${ghost}${photo}${v3Sticker(p, pal, `top:${isB ? -10 : 2}px;right:5%;z-index:6`)}</div></section>`
    );
  }
  if (p.variant === "D") {
    const face = pal.face;
    const deep = mixHex(pal.deepAccent, "#000000", 0.35);
    return (
      wrapOpen("D", "background:#FFFFFF") +
      `<div data-hero-photo style="position:relative;width:100%;aspect-ratio:4 / 4.8;overflow:hidden;background:${pal.baseNeutral}">${img(`position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}<div style="position:absolute;left:0;top:0;padding:18px 20px">${brandPill(p, "rgba(255,255,255,0.9)", "#1B1B18")}</div>${v3Sticker(p, pal, "right:16px;bottom:16px;z-index:6")}</div>` +
      `<div style="position:relative;overflow:hidden;background:${face};padding:28px 24px ${44 + ghostBand(p)}px">${v3Ghost(p, ghostColor(face, "#1B1B18", vp.deep), designV4On() ? "right:8%;bottom:16px;z-index:0" : "right:-6px;bottom:16px;z-index:0")}${v3GhostFade(p, face, "bottom")}` +
      `<div style="position:relative;z-index:4">${p.brand ? `<div data-hero-brand-fallback style="margin:0 0 14px">${brandPill(p, "#FFFFFF", "#1B1B18")}</div>` : ""}${nameHtml(p, "#1B1B18", size, 900)}${subNameHtml(p, hexToRgba("#1B1B18", 0.65))}${hookHtml(hero, deep, hexToRgba("#1B1B18", 0.78))}${p.badges.length ? `<div style="margin-top:14px">${badgeRow(p, "#FFFFFF", "#1B1B18", hexToRgba("#1B1B18", 0.2))}</div>` : ""}${tagRow(p, "#1B1B18", hexToRgba("#1B1B18", 0.3))}${v3Price(p, darkenForWhite(vp.deep), "#FFFFFF")}</div></div></section>`
    );
  }
  // E 타이포
  const face = pal.face;
  return (
    wrapOpen("E", `background:${face};padding:36px 24px ${52 + ghostBand(p)}px`) +
    v3Motif(p, pal, vp.tints[3], "top:-18px;right:-18px;z-index:1", "rings", 96, 96) +
    v3Ghost(p, ghostColor(face, "#1B1B18", vp.deep), "left:16px;bottom:16px;z-index:2") +
    `<div style="position:relative;z-index:4"><div>${brandPill(p, "#FFFFFF", "#1B1B18")}</div><div style="margin-top:20px">${nameHtml(p, "#1B1B18", size, 900)}${subNameHtml(p, hexToRgba("#1B1B18", 0.65))}${hookHtml(hero, mixHex(pal.deepAccent, "#000000", 0.35), hexToRgba("#1B1B18", 0.78))}</div>` +
    `<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:24px"><div style="flex:1 1 0%;min-width:0">${badgeRow(p, "#FFFFFF", "#1B1B18", hexToRgba("#1B1B18", 0.2))}${tagRow(p, "#1B1B18", hexToRgba("#1B1B18", 0.3))}${v3Price(p, darkenForWhite(vp.deep), "#FFFFFF")}</div>` +
    (p.imageUrl ? `<div style="position:relative;flex:0 0 36%;max-width:180px"><div data-hero-photo style="aspect-ratio:1 / 1;border-radius:50%;overflow:hidden;box-shadow:0 10px 24px rgba(10,10,10,0.18);background:${pal.baseNeutral}">${img(`display:block;width:100%;height:100%;object-fit:cover;object-position:${p.pos}`)}</div>${v3Sticker(p, pal, "top:-26px;left:-26px;z-index:6")}</div>` : "") +
    `</div></div></section>`
  );
}

/** 438차: 배지+해시태그 합쳐 최대 3개(배지 우선), 모델 사진 풀블리드(A)는 태그 최대 2개 — 줄바꿈 없이 한 줄 */
function tunedTags(tags: string[], badgeCount: number, variant: HeroV2Variant, kind: HeroPhotoKind): string[] {
  if (!HERO_V2_TUNED) return tags;
  const room = Math.max(0, 3 - badgeCount);
  return tags.slice(0, variant === "A" && kind === "person" ? Math.min(2, room) : room);
}

// ── 계획 만들기 ─────────────────────────────────────────────────────────────
export type HeroPlanInput = {
  hero: HeroSection;
  productName: string;
  brandName?: string | null;
  imageUrls: readonly string[];
  origins?: ReadonlyArray<ProductImageOrigin | undefined>;
  tags?: ReadonlyArray<ReadonlyArray<string> | undefined>;
  roles?: ReadonlyArray<string | undefined>;
  category?: string;
  archetype: ArchetypeId | null;
  mood: MoodId | null;
  facts: ClaimFacts;
  certifications: string;
  keyFeatures: string;
  wornTop: boolean;
  /** 439차 — 입력 가격(cta_price)·구매 혜택 배지(cta_price.badges). v3 가격 태그·스티커용 */
  price?: number;
  ctaBadges?: string[];
};

const okUrl = (u: string | undefined): string => (u && (/^(https?:)?\/\//i.test(u) || u.startsWith("/")) ? u : "");

/** 히어로 계획(없으면 null = 기존 히어로 유지): 제품명이 없거나 편집 모드면 만들지 않는다 */
export function planHeroV2(i: HeroPlanInput): HeroV2Plan | null {
  const raw = i.productName.trim();
  if (!HERO_V2_ENABLED || !raw) return null;
  const url = okUrl(i.imageUrls[i.hero.imageIndex]);
  const t = i.tags?.[i.hero.imageIndex] ?? undefined;
  const est = estimatePhotoKind(t, i.roles?.[i.hero.imageIndex]);
  const variant = selectHeroVariant({ hasPhoto: Boolean(url), kind: est.kind, confidence: est.confidence, archetype: i.archetype, mood: i.mood, category: i.category });
  const { main, sub } = splitProductName(raw);
  const brand = (i.brandName ?? "").trim();
  const badges = heroBadgesFrom(i.hero, i.certifications, i.category, i.facts);
  const v3 = designV4On() && HERO_V2_TUNED ? heroV3Of(i, main, sub, badges) : null;
  return {
    ...(DESIGN_POLISH_ENABLED ? hueHintOf(`${raw} ${brand} ${i.keyFeatures}`, i.mood) : {}),
    variant, photoKind: est.kind, confidence: est.confidence, name: main, ...(sub ? { nameSub: sub } : {}), ...(brand && brand.length <= 24 ? { brand } : {}),
    imageUrl: url, whiteBg: est.whiteBg && variant === "B",
    badges: v3?.sticker && badges[0] === v3.sticker ? badges.slice(1) : badges,
    tags: tunedTags(hashtagsFrom(i.keyFeatures, i.facts), badges.length, variant, est.kind),
    pos: i.wornTop ? "50% 18%" : HERO_V2_TUNED && est.kind === "product" ? "50% 28%" : "50% 40%",
    ...(v3 ? { v3 } : {}),
  };
}

/** 439차 2-4 — v3 레이어 내용(모두 입력): 고스트 제품명·스티커(입력 배지 → 혜택 배지 한 개, 12자 이하)·가격 태그(가격 스트립이 없는 카테고리) */
export function heroV3Of(i: HeroPlanInput, main: string, sub: string | undefined, badges: string[]): HeroV3 {
  const strip = designV2On(i.category);
  const benefit = strip ? undefined : (i.ctaBadges ?? []).map((b) => b.trim()).find((b) => b && [...b].length <= STICKER_MAX && !checkText(b, i.facts).bad);
  const sticker = badges[0] && [...badges[0]].length <= STICKER_MAX ? badges[0] : benefit;
  const price = !strip && typeof i.price === "number" && i.price > 0 ? `${i.price.toLocaleString("ko-KR")}원` : undefined;
  const ghost = ghostFitWordOf(main, sub, (i.brandName ?? "").trim());
  let seed = 0;
  for (const ch of main) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return { ...(ghost ? { ghost } : {}), ...(sticker ? { sticker } : {}), ...(price ? { price } : {}), motifVariant: seed % 8, mood: i.mood };
}

export const isHero = (s: DetailSection): s is HeroSection => s.type === "hero";
