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
};

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
  if (!hint || !isNearNeutral(accent)) return { face: saturatedFace(accent), source: hint ? "photo" : "accent" };
  if (hint.hue === "dark") return { face: "#1F2026", source: hint.source };
  return { face: saturatedFace(hslToHex(hint.hue, 0.7, 0.45)), source: hint.source };
}

/** 사진 위 스크림 불투명도 곡선(0=아래 끝). 텍스트 영역(아래 약 45%)에서 최소 scrimTextAlpha 이상 */
export function scrimGradient(tuned: boolean = HERO_V2_TUNED): string {
  // 438차: 알파 ≥0.6 구간을 텍스트 영역(하단 약 44%)에만 두고 그 위는 빠르게 투명하게 — 얼굴·상체가 덜 가려진다(대비는 텍스트 영역 기준 유지)
  if (tuned) return "linear-gradient(0deg,rgba(10,10,10,0.9) 0%,rgba(10,10,10,0.74) 30%,rgba(10,10,10,0.6) 46%,rgba(10,10,10,0) 100%)";
  return "linear-gradient(0deg,rgba(10,10,10,0.9) 0%,rgba(10,10,10,0.78) 34%,rgba(10,10,10,0.62) 48%,rgba(10,10,10,0) 78%)";
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

export function heroV2Html(hero: HeroSection, p: HeroV2Plan, pal: HeroPalette, alt: string): string {
  const size = heroNameSizePx(p.name);
  const failAttrs = HERO_V2_TUNED ? ` onerror="${HERO_FAIL_ONERROR}" onload="${HERO_FAIL_ONLOAD}"` : "";
  const img = (extra: string) => `<img src="${esc(p.imageUrl)}" alt="${esc(alt)}" fetchpriority="high" decoding="async"${failAttrs} style="${extra}"/>`;
  const wrapOpen = (v: HeroV2Variant, style: string) => `${HERO_V2_TUNED ? STRIP_OVERLAP_CSS_TUNED + HERO_FAIL_CSS : STRIP_OVERLAP_CSS}<section data-hero-v2="${v}" class="hero pagzly-hero" style="position:relative;width:100%;box-sizing:border-box;overflow:hidden;border-radius:0 0 24px 24px;${style}">`;
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
      `<div style="background:${face};padding:28px 24px 44px">${nameHtml(p, "#1B1B18", size, 900)}${subNameHtml(p, hexToRgba("#1B1B18", 0.65))}${hookHtml(hero, deep, hexToRgba("#1B1B18", 0.78))}${p.badges.length ? `<div style="margin-top:14px">${badgeRow(p, "#FFFFFF", "#1B1B18", hexToRgba("#1B1B18", 0.2))}</div>` : ""}${tagRow(p, "#1B1B18", hexToRgba("#1B1B18", 0.3))}</div></section>`
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
  return {
    ...(DESIGN_POLISH_ENABLED ? hueHintOf(`${raw} ${brand} ${i.keyFeatures}`, i.mood) : {}),
    variant, photoKind: est.kind, confidence: est.confidence, name: main, ...(sub ? { nameSub: sub } : {}), ...(brand && brand.length <= 24 ? { brand } : {}),
    imageUrl: url, whiteBg: est.whiteBg && variant === "B",
    badges: heroBadgesFrom(i.hero, i.certifications, i.category, i.facts),
    tags: tunedTags(hashtagsFrom(i.keyFeatures, i.facts), heroBadgesFrom(i.hero, i.certifications, i.category, i.facts).length, variant, est.kind),
    pos: i.wornTop ? "50% 18%" : HERO_V2_TUNED && est.kind === "product" ? "50% 28%" : "50% 40%",
  };
}

export const isHero = (s: DetailSection): s is HeroSection => s.type === "hero";
