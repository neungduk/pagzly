/**
 * 413차 — 스타일 디렉터: 제품 신호(카테고리·타깃·가격대·컨셉 무드·상품 색·사진 구성·글 분량)를 보고 스타일 스펙을 자동으로 고른다.
 * 규칙 기반·무료·결정적: 같은 입력은 같은 결과(시드 = 상품 id 또는 상품명·브랜드), 신호가 비슷한 다른 제품은 시드에 따라 허용 범위 안에서 다르게 나온다.
 * 세션에 이미 있는 값만 읽는 순수 함수다 — 서버·프롬프트·생성·DB를 건드리지 않는다. 패션만 지원(다른 카테고리는 호출부가 classic을 쓴다).
 *
 * 구조: 신호 → 특징(0~1) → "스타일 계열" 5개를 시드로 고름 → 축별로 계열 값 가산 + 특징 가중치로 점수 → 시드 소프트맥스로 뽑기
 *       → 연속 값(톤·여백·본문·모서리)은 특징에서 계산 → 호환 규칙으로 걸러냄 → 후보 K개는 구조 서명이 서로 달라야 한다.
 */
import { decodeSpec, encodeSpec, specLabel, type SpecAxes } from "@/lib/style-packs";
import { makeTone, TYPE_PRESETS, type NeutralBand, type TypePresetName } from "@/lib/style-axes";

/** 자동 적용 켜기/끄기 — false면 결과 화면은 지금처럼 classic 기본(판매자가 직접 고르는 것은 그대로) */
export const STYLE_AUTO_ENABLED = true;

export const FASHION = "의류/패션";

export type DirectorInput = {
  category: string;
  targetCustomer?: string | null;
  price?: number | null;
  hasBrand?: boolean;
  productName?: string;
  /** conceptBrief.mood + copy_tone + motif_keywords 를 이은 글 */
  moodText?: string;
  accentHex?: string | null;
  photos?: { total: number; worn: number; detail: number; flat: number; other: number; heroWorn: boolean; galleryCount: number };
  text?: { sectionCount: number; bodyChars: number; hasSizeTable: boolean };
  /** 시드: 상품 id가 있으면 그것, 없으면 상품명·브랜드 */
  seed?: string;
};

export type DirectorFeatures = {
  premium: number;
  young: number;
  mature: number;
  calm: number;
  elegant: number;
  trendy: number;
  sat: number;
  worn: number;
  heroWorn: number;
  galleryRich: number;
  textHeavy: number;
  lowPhoto: number;
};

export type DirectorCandidate = { axes: SpecAxes; code: string; label: string };
export type DirectorResult = DirectorCandidate & { candidates: DirectorCandidate[]; reasons: string[]; missing: string[]; family: string; features: DirectorFeatures };

// ---------------------------------------------------------------------------
// 신호 → 특징
// ---------------------------------------------------------------------------

const CALM = ["담백", "미니멀", "깨끗", "차분", "정돈", "절제", "심플", "단정", "고요", "모노", "기본"];
const ELEGANT = ["우아", "고급", "클래식", "따뜻", "포근", "부드러", "자연", "감성", "세련", "은은", "품격", "프리미엄", "섬세"];
const TRENDY = ["트렌디", "힙", "경쾌", "활기", "캐주얼", "스트릿", "빈티지", "개성", "컬러풀", "발랄", "유니크", "볼드", "팝"];
const count = (text: string, words: string[]) => words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function hslSat(hex: string | null | undefined): number | null {
  if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return null;
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (l > 0.5 ? 2 - max - min : max + min);
}

export function featuresOf(input: DirectorInput): { f: DirectorFeatures; missing: string[] } {
  const missing: string[] = [];
  const price = typeof input.price === "number" && Number.isFinite(input.price) && input.price > 0 ? input.price : null;
  if (price === null) missing.push("가격");
  const premium = price === null ? 0.4 : clamp01((price - 15000) / 135000);
  const t = (input.targetCustomer ?? "").trim();
  if (!t) missing.push("타깃");
  const young = t === "20~30대 여성" ? 1 : t === "30~40대 여성" ? 0 : t === "남녀 공용" ? 0.5 : t === "전 연령대" ? 0.4 : 0.5;
  const mood = input.moodText ?? "";
  if (!mood.trim()) missing.push("컨셉 무드");
  const m = mood.trim()
    ? { calm: clamp01(count(mood, CALM) / 3), elegant: clamp01(count(mood, ELEGANT) / 3), trendy: clamp01(count(mood, TRENDY) / 3) }
    : { calm: 0.35, elegant: 0.35, trendy: 0.35 };
  const sat = hslSat(input.accentHex);
  if (sat === null) missing.push("상품 색");
  const p = input.photos;
  if (!p) missing.push("사진 구성");
  const total = p?.total ?? 0;
  const worn = p && total > 0 ? p.worn / total : 0.4;
  const text = input.text;
  if (!text) missing.push("글 분량");
  return {
    f: {
      premium,
      young,
      mature: 1 - young,
      calm: m.calm,
      elegant: m.elegant,
      trendy: m.trendy,
      sat: sat ?? 0.4,
      worn,
      heroWorn: p?.heroWorn ? 1 : 0,
      galleryRich: p ? clamp01((p.galleryCount - 2) / 3) : 0.3,
      textHeavy: text ? clamp01((text.bodyChars - 2500) / 5000) : 0.4,
      lowPhoto: p ? clamp01(1 - total / 8) : 0.3,
    },
    missing,
  };
}

// ---------------------------------------------------------------------------
// 시드 난수
// ---------------------------------------------------------------------------

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: string): () => number {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softmaxPick<T extends string>(scores: Array<[T, number]>, rand: () => number, temp: number): T {
  const max = Math.max(...scores.map(([, s]) => s));
  const w = scores.map(([k, s]) => [k, Math.exp((s - max) / temp)] as const);
  const sum = w.reduce((a, [, x]) => a + x, 0);
  let r = rand() * sum;
  for (const [k, x] of w) {
    r -= x;
    if (r <= 0) return k;
  }
  return w[w.length - 1]![0];
}

// ---------------------------------------------------------------------------
// 가중치 표 (신호 특징 → 축 옵션). 값은 시험으로 조정한다(review/413cha-report.md 5절).
// ---------------------------------------------------------------------------

type W = Partial<Record<keyof DirectorFeatures | "base", number>>;
export const WEIGHTS = {
  hero: {
    "bleed-bottom": { base: 0.35, heroWorn: 0.3, trendy: 0.5, young: 0.2, sat: 0.2, lowPhoto: 0.3 },
    "caption-below": { base: 0.2, premium: 0.5, elegant: 0.6, calm: 0.15, heroWorn: 0.1 },
    "caption-above": { base: 0.15, calm: 0.8, premium: 0.1, mature: 0.1 },
    framed: { base: 0.1, premium: 0.4, elegant: 0.6, mature: 0.2, heroWorn: 0.2 },
    split: { base: 0.1, young: 0.3, trendy: 0.3, calm: 0.2, textHeavy: 0.2 },
  },
  flow: {
    default: { base: 0.35, lowPhoto: 0.6, mature: 0.2 },
    "photo-first": { base: 0.1, worn: 0.5, galleryRich: 0.2, calm: 0.2 },
    "photo-lead": { base: 0.15, worn: 0.5, galleryRich: 0.3, young: 0.1 },
    "story-after-photo": { base: 0.05, worn: 0.5, textHeavy: 0.4, calm: 0.3, galleryRich: 0.2 },
  },
  gallery: {
    "duo-grid": { base: 0.35, lowPhoto: 0.5, young: 0.1 },
    "lookbook-stack": { base: 0.1, calm: 0.7, galleryRich: 0.1, worn: 0.2 },
    "lead-plus-two": { base: 0.15, elegant: 0.4, premium: 0.4, galleryRich: 0.3 },
    mosaic: { base: 0.05, trendy: 0.5, young: 0.5, galleryRich: 0.5 },
  },
  summary: {
    "icon-grid": { base: 0.35, young: 0.4, trendy: 0.2 },
    "inline-strip": { base: 0.1, calm: 0.6 },
    "spec-list": { base: 0.1, elegant: 0.4, premium: 0.4, textHeavy: 0.2 },
  },
  heading: {
    "center-stack": { base: 0.35, young: 0.4, trendy: 0.3 },
    "left-eyebrow": { base: 0.1, calm: 0.6, textHeavy: 0.2 },
    "center-rule": { base: 0.1, elegant: 0.5, premium: 0.3 },
  },
  type: {
    base: { base: 0.25, young: 0.2 },
    "serif-bold": { base: 0.05, premium: 0.5, elegant: 0.4, mature: 0.2 },
    "serif-mid": { base: 0.1, elegant: 0.6, premium: 0.2 },
    "serif-regular": { base: 0.05, elegant: 0.4, calm: 0.4, premium: 0.3 },
    "sans-black": { base: 0.05, trendy: 0.6, young: 0.5 },
    "sans-semi": { base: 0.15, calm: 0.3, young: 0.2 },
    "sans-medium": { base: 0.05, calm: 0.6, premium: 0.2 },
  },
  family: {
    "bold-pop": { base: 0, trendy: 0.6, young: 0.5, sat: 0.2, worn: 0.2 },
    editorial: { base: 0, elegant: 0.6, premium: 0.5, mature: 0.2 },
    mono: { base: 0, calm: 0.7, premium: 0.1 },
    "soft-classic": { base: 0.4, lowPhoto: 0.5, mature: 0.1 },
    "gallery-led": { base: 0, galleryRich: 0.5, worn: 0.4, elegant: 0.2, young: 0.1 },
  },
} satisfies Record<string, Record<string, W>>;

type FamilyName = keyof typeof WEIGHTS.family;
/** 계열이 가리키는 축 값(여러 개면 모두 가산) */
const FAMILY_VALUES: Record<FamilyName, Partial<Record<"hero" | "flow" | "gallery" | "summary" | "heading" | "type", string[]>>> = {
  "bold-pop": { hero: ["bleed-bottom", "split"], flow: ["photo-lead", "default"], gallery: ["mosaic"], summary: ["icon-grid"], heading: ["center-stack"], type: ["sans-black"] },
  editorial: { hero: ["caption-below", "framed"], flow: ["default", "photo-lead"], gallery: ["lead-plus-two"], summary: ["spec-list"], heading: ["center-rule"], type: ["serif-mid", "serif-bold"] },
  mono: { hero: ["caption-above"], flow: ["story-after-photo", "photo-first"], gallery: ["lookbook-stack"], summary: ["inline-strip"], heading: ["left-eyebrow"], type: ["sans-medium", "sans-semi"] },
  "soft-classic": { hero: ["bleed-bottom"], flow: ["default"], gallery: ["duo-grid"], summary: ["icon-grid"], heading: ["center-stack"], type: ["base", "serif-regular"] },
  "gallery-led": { hero: ["split", "framed"], flow: ["photo-lead"], gallery: ["mosaic", "lead-plus-two"], summary: ["inline-strip"], heading: ["center-rule"], type: ["serif-regular", "sans-semi"] },
};
const FAMILY_BONUS = 0.6;
const TEMP = 0.22;
const FAMILY_TEMP = 0.3;

const score = (w: W, f: DirectorFeatures): number => {
  let s = w.base ?? 0;
  for (const k of Object.keys(w) as Array<keyof DirectorFeatures | "base">) if (k !== "base") s += (w[k] ?? 0) * f[k];
  return s;
};

// ---------------------------------------------------------------------------
// 호환 규칙 — 이 규칙 밖의 조합은 고르지 않는다(회귀 style-director가 점검, 오프라인 린트가 허용 조합을 검증)
// ---------------------------------------------------------------------------

export function isAllowed(axes: SpecAxes, input: DirectorInput): boolean {
  const p = input.photos;
  const gal = p?.galleryCount ?? 0;
  if (!p || p.total < 1) return axes.hero === "bleed-bottom" && axes.gallery === "duo-grid" && axes.flow === "default";
  if (axes.hero === "framed" && !p.heroWorn) return false; // framed: 히어로가 인물 원본일 때만
  if (axes.gallery === "mosaic" && gal < 3) return false;
  if (axes.gallery === "lead-plus-two" && gal < 3) return false;
  if (axes.gallery === "lookbook-stack" && gal < 2) return false;
  if (axes.flow !== "default" && (gal < 2 || p.worn < 1)) return false;
  if (axes.flow === "story-after-photo" && (input.text?.sectionCount ?? 0) < 8) return false;
  return true;
}

// ---------------------------------------------------------------------------
// 선택
// ---------------------------------------------------------------------------

const STRUCT_KEYS = ["hero", "flow", "gallery", "summary", "heading"] as const;
export const structSignature = (a: SpecAxes) => STRUCT_KEYS.map((k) => a[k]).join("|");
export function structDistance(a: SpecAxes, b: SpecAxes): number {
  return STRUCT_KEYS.filter((k) => a[k] !== b[k]).length / STRUCT_KEYS.length;
}

function buildAxes(input: DirectorInput, f: DirectorFeatures, rand: () => number, familyPick?: FamilyName): { axes: SpecAxes; family: FamilyName; reasons: string[] } {
  const reasons: string[] = [];
  const family =
    familyPick ?? softmaxPick(Object.entries(WEIGHTS.family).map(([k, w]) => [k as FamilyName, score(w as W, f)]), rand, FAMILY_TEMP);
  const fam = FAMILY_VALUES[family];
  const pick = <K extends "hero" | "flow" | "gallery" | "summary" | "heading" | "type">(axis: K): string => {
    const table = WEIGHTS[axis] as Record<string, W>;
    const scores = Object.entries(table).map(([opt, w]) => [opt, score(w, f) + (((fam[axis] as string[] | undefined) ?? []).includes(opt) ? FAMILY_BONUS : 0)] as [string, number]);
    return softmaxPick(scores, rand, TEMP);
  };
  const hero = pick("hero") as SpecAxes["hero"];
  const flow = pick("flow") as SpecAxes["flow"];
  const gallery = pick("gallery") as SpecAxes["gallery"];
  const summary = pick("summary") as SpecAxes["summary"];
  const heading = pick("heading") as SpecAxes["heading"];
  const typeName = pick("type") as TypePresetName;
  const type = TYPE_PRESETS[typeName];

  const sharp = family === "mono" || family === "editorial" || family === "gallery-led"; // 모서리 0·가는 선 계열
  const photoLed = hero === "caption-below" || hero === "framed" || hero === "split" || flow !== "default";
  // 연속 값
  const sat = clamp01(0.25 + 0.45 * f.trendy + 0.2 * f.young + 0.1 * (1 - f.premium) + 0.15 * f.sat);
  const depth = clamp01(0.3 + 0.5 * f.premium + 0.2 * f.elegant);
  const neutral: NeutralBand = f.elegant + f.premium > 0.9 ? "ivory" : f.calm > 0.6 && f.sat < 0.35 ? "plain" : f.calm > 0.5 ? "cool" : "tinted";
  const padY = Math.round((1 + 0.3 * f.premium + 0.15 * f.calm - 0.05 * f.young) * 20) / 20;
  const calmDense = family === "mono";
  const axes: SpecAxes = {
    hero,
    flow,
    gallery,
    summary,
    summaryPlacement: photoLed && gallery !== "duo-grid" ? "after-gallery" : "after-hero",
    anchor: sharp ? "tabs" : "pills",
    checklist: sharp ? "plain-list" : "cards",
    heading,
    radius: sharp ? 0 : null,
    rule: sharp || heading !== "center-stack" ? "hairline" : "none",
    density: calmDense ? "compact" : "full",
    body: sharp ? (calmDense ? { sizePx: 15, line: 1.7 } : { sizePx: 16, line: 1.8 }) : null,
    headline: type.headline,
    scale: type.scale,
    padY: Math.min(1.35, Math.max(0.9, padY)),
    heroGrad: hero === "bleed-bottom" ? 0.7 : 0.85,
    tone: makeTone(sat, depth, neutral),
  };
  reasons.push(`계열 ${family}`);
  return { axes, family, reasons };
}

/** 자동 선택. 어떤 입력에서도 예외 없이 유효한 스펙을 돌려준다 */
export function directStyle(input: DirectorInput, opts: { k?: number; seedSalt?: string } = {}): DirectorResult {
  const { f, missing } = featuresOf(input);
  const baseSeed = `${opts.seedSalt ?? ""}|${input.seed ?? `${input.productName ?? ""}|${input.hasBrand ? "b" : ""}`}`;
  const K = opts.k ?? 4;
  const accepted: Array<{ axes: SpecAxes; family: FamilyName }> = [];
  const MIN_DIST = 0.4; // 5축 중 2축 이상 달라야 한다
  for (let i = 0; i < 80 && accepted.length < K; i++) {
    const { axes, family } = buildAxes(input, f, rng(`${baseSeed}#${i}`));
    const decoded = decodeSpec(encodeSpec(axes));
    if (!decoded || !isAllowed(decoded, input)) continue;
    if (accepted.some((a) => structDistance(a.axes, decoded) < MIN_DIST)) continue;
    accepted.push({ axes: decoded, family });
  }
  if (accepted.length === 0) {
    // 안전망: 호환 규칙을 모두 만족하는 가장 단순한 스펙(classic 구조 + 기본 서체)
    const { axes, family } = buildAxes({ ...input, photos: undefined }, f, rng(baseSeed), "soft-classic");
    accepted.push({ axes: { ...axes, hero: "bleed-bottom", flow: "default", gallery: "duo-grid", summary: "icon-grid", heading: "center-stack" }, family });
  }
  const top = accepted[0]!;
  const toCand = (a: SpecAxes): DirectorCandidate => ({ axes: a, code: encodeSpec(a), label: specLabel(a) });
  const reasons = [
    `계열 ${top.family}`,
    `가격 ${f.premium.toFixed(2)} · 타깃(젊음) ${f.young.toFixed(2)} · 무드 차분 ${f.calm.toFixed(2)}/우아 ${f.elegant.toFixed(2)}/트렌디 ${f.trendy.toFixed(2)}`,
    `착용컷 비중 ${f.worn.toFixed(2)} · 갤러리 ${f.galleryRich.toFixed(2)} · 글 분량 ${f.textHeavy.toFixed(2)}`,
    ...(missing.length ? [`신호 부족: ${missing.join(", ")} → 중립 가중치`] : []),
  ];
  return { ...toCand(top.axes), candidates: accepted.map((a) => toCand(a.axes)), reasons, missing, family: top.family, features: f };
}

// ---------------------------------------------------------------------------
// 세션 → 입력
// ---------------------------------------------------------------------------

type AnySession = Record<string, unknown>;
const asObj = (v: unknown): AnySession => (v && typeof v === "object" ? (v as AnySession) : {});

function textLen(s: AnySession): number {
  let n = 0;
  for (const v of Object.values(s)) {
    if (typeof v === "string") n += v.length;
    else if (Array.isArray(v)) for (const x of v) n += typeof x === "string" ? x.length : textLen(asObj(x));
  }
  return n;
}

/** 저장된 세션(또는 결과 화면 data)에서 디렉터 입력을 읽는다. 없는 값은 비워 둔다(디렉터가 중립으로 처리) */
export function directorInputFromSession(session: unknown): DirectorInput {
  const s = asObj(session);
  const g = asObj(s.generated);
  const sections = ((g.sections ?? s.sections) as AnySession[] | undefined) ?? [];
  const roles = ((s.imageRoles ?? g.imageRoles) as string[] | undefined) ?? [];
  const urls = ((g.imageUrls ?? s.imageUrls) as unknown[] | undefined) ?? [];
  const brief = asObj(s.conceptBrief);
  const theme = asObj(s.theme ?? g.theme);
  const gal = sections.find((x) => x.type === "gallery");
  const galleryCount = Array.isArray(gal?.imageIndexes) ? (gal!.imageIndexes as unknown[]).length : 0;
  const hero = sections.find((x) => x.type === "hero");
  const heroIdx = typeof hero?.imageIndex === "number" ? (hero.imageIndex as number) : 0;
  const origins = ((g.imageOrigins ?? s.imageOrigins) as string[] | undefined) ?? [];
  const wornRole = (r: string) => r === "hero" || r === "lifestyle";
  const total = roles.length || urls.length;
  const priceRaw = s.price;
  const price = typeof priceRaw === "number" ? priceRaw : typeof priceRaw === "string" ? Number(priceRaw.replace(/[^0-9.]/g, "")) || null : null;
  const productId = typeof g.productId === "string" ? g.productId : typeof s.productId === "string" ? s.productId : "";
  const moodText = [brief.mood, brief.copy_tone, Array.isArray(brief.motif_keywords) ? (brief.motif_keywords as string[]).join(" ") : ""].filter((x) => typeof x === "string" && x).join(" ");
  const category = (s.category as string | undefined) ?? (g.category as string | undefined) ?? FASHION;
  return {
    category,
    targetCustomer: (s.targetCustomer as string | undefined) ?? null,
    price,
    hasBrand: Boolean((s.brandName as string | undefined)?.trim()),
    productName: (s.productName as string | undefined) ?? "",
    moodText,
    accentHex: (theme.accent as string | undefined) ?? null,
    photos: total
      ? {
          total,
          worn: roles.filter(wornRole).length,
          detail: roles.filter((r) => r === "detail").length,
          flat: roles.filter((r) => r === "other").length,
          other: roles.filter((r) => !wornRole(r) && r !== "detail" && r !== "other").length,
          heroWorn: wornRole(roles[heroIdx] ?? "") && (origins[heroIdx] ?? "original") === "original",
          galleryCount,
        }
      : undefined,
    text: sections.length ? { sectionCount: sections.length, bodyChars: textLen({ sections }), hasSizeTable: sections.some((x) => x.slot === "size_table") } : undefined,
    seed: productId || `${(s.productName as string | undefined) ?? ""}|${(s.brandName as string | undefined) ?? ""}`,
  };
}

/** 결과 화면·미리보기가 쓰는 한 줄: 세션 → 추천 결과 */
export function recommendForSession(session: unknown): DirectorResult | null {
  const input = directorInputFromSession(session);
  if (input.category !== FASHION) return null;
  return directStyle(input);
}
