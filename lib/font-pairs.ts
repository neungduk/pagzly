/**
 * 432차 — 상세페이지 폰트는 **Noto Sans KR 하나**다(사용자 결정 2026-10-22). 제목·본문·라벨·숫자·가격·버튼·표 전부 같은 폰트이고,
 * 430·430B에서 도입한 Pretendard·Hahmlet·Gowun Batang·Black Han Sans·Do Hyeon·Jua·Playfair·Montserrat는 상세 경로에서 쓰지 않는다.
 * 폰트가 하나이므로 개성은 **굵기·자간·줄간격 프리셋**으로만 낸다(카테고리당 2~3세트, 선택 로직·세트 이름은 430차 그대로 유지).
 *  - 굵기는 Noto Sans KR 파일이 있는 400·500·700·900만 쓴다(public/fonts의 @font-face가 300→400, 600·800→700 범위로 받아 합성 굵기가 생기지 않는다, scripts/build-detail-fonts.mjs).
 *  - 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 세트·같은 CSS 한 벌(fontPairCss)을 쓴다. export에 :has·컨테이너 쿼리·text-wrap 없음. 외부 CDN 호출 없음(같은 출처 /fonts).
 * 플래그: NEXT_PUBLIC_DESIGN_V3_FONTS=off 면 429차 폰트(Noto Sans/Serif)로 돌아간다(픽셀 동일).
 */
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { resolveTemplateCategory, type TemplateCategory } from "@/lib/section-templates";

export const DESIGN_V3_FONTS_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V3_FONTS !== "off";

/** 상세페이지가 쓰는 폰트 패밀리는 이것 하나 */
export type FontFamilyKey = "noto-sans-kr";

const SYS = "system-ui, -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

/** key → public/fonts/<css>.css 와 font-family 이름 */
export const FONT_FAMILIES: Record<FontFamilyKey, { css: string; name: string; display: boolean }> = {
  "noto-sans-kr": { css: "noto-sans-kr", name: "Noto Sans KR", display: false },
};

/** 파일이 있는 굵기(이 값만 토큰에서 쓴다) */
export const NOTO_WEIGHTS = [400, 500, 700, 900] as const;

export type FontPairId =
  | "beauty-elegant" | "beauty-soft" | "beauty-modern"
  | "fashion-classic" | "fashion-bold" | "fashion-mono"
  | "tech-clean" | "tech-display"
  | "food-warm" | "food-batang";

export type FontPair = {
  id: FontPairId;
  label: string;
  /** 대제목(.pagzly-display-headline): 700~900(강한 스타일) 또는 400~500(부드러운 스타일) */
  title: { family: FontFamilyKey; weight: number; letterSpacing: string; lineHeight: number; soft: boolean };
  body: { family: FontFamilyKey; weight: number };
  /** 숫자·가격·STEP/POINT·영문 라벨: 자간 +0.02~0.06em */
  label_: { family: FontFamilyKey; letterSpacing: string };
};

const NOTO: FontFamilyKey = "noto-sans-kr";
const pair = (id: FontPairId, label: string, weight: number, letterSpacing: string, lineHeight: number, labelSpacing: string): FontPair => ({
  id,
  label,
  title: { family: NOTO, weight, letterSpacing, lineHeight, soft: weight <= 500 },
  body: { family: NOTO, weight: 400 },
  label_: { family: NOTO, letterSpacing: labelSpacing },
});

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  // 뷰티: 소프트·엘레강스는 얇은 굵기(400·500)와 넓은 자간, 모던은 또렷한 700
  "beauty-elegant": pair("beauty-elegant", "뷰티 · 엘레강스(500·넓은 자간)", 500, "0.01em", 1.3, "0.06em"),
  "beauty-soft": pair("beauty-soft", "뷰티 · 소프트(400·넓은 자간)", 400, "0.02em", 1.3, "0.06em"),
  "beauty-modern": pair("beauty-modern", "뷰티 · 모던(700)", 700, "-0.02em", 1.28, "0.04em"),
  // 패션: 클래식 700, 볼드 900(큰 크기 대비), 모노 500
  "fashion-classic": pair("fashion-classic", "패션 · 클래식(700)", 700, "-0.02em", 1.28, "0.04em"),
  "fashion-bold": pair("fashion-bold", "패션 · 볼드(900)", 900, "-0.03em", 1.25, "0.04em"),
  "fashion-mono": pair("fashion-mono", "패션 · 모노(500)", 500, "-0.02em", 1.28, "0.04em"),
  // 전자·생활: 900/700, 식품·반려: 700/500(따뜻한 자간)
  "tech-clean": pair("tech-clean", "전자·생활 · 클린(900)", 900, "-0.03em", 1.25, "0.04em"),
  "tech-display": pair("tech-display", "전자·생활 · 디스플레이(700)", 700, "-0.02em", 1.25, "0.04em"),
  "food-warm": pair("food-warm", "식품·반려 · 따뜻함(700)", 700, "-0.01em", 1.3, "0.03em"),
  "food-batang": pair("food-batang", "식품·반려 · 부드러움(500)", 500, "0.01em", 1.3, "0.04em"),
};

/** 카테고리당 후보 세트(2~3개). 첫 번째가 기본 */
export const CATEGORY_FONT_PAIRS: Record<TemplateCategory, FontPairId[]> = {
  "화장품/뷰티": ["beauty-elegant", "beauty-soft", "beauty-modern"],
  "패션/의류": ["fashion-classic", "fashion-bold", "fashion-mono"],
  식품: ["food-warm", "food-batang"],
  "전자/가전": ["tech-clean", "tech-display"],
  "생활/리빙": ["tech-clean", "tech-display"],
  반려동물: ["food-warm", "tech-clean"],
};

/** FNV-1a + 마무리 섞기 — 같은 입력이면 같은 값(라이브·export·재불러오기가 같은 세트를 고르게). 작은 modulo(2~4)에서도 고르게 퍼진다 */
export function fontSeed(...parts: Array<string | null | undefined>): number {
  let h = 2166136261;
  for (const ch of parts.filter(Boolean).join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

export type FontPairInput = {
  category: string | undefined | null;
  /** 패션 스타일 팩의 제목 성격(없으면 클래식) */
  packHeadline?: { kind: "serif" | "sans-display"; weight: number } | null;
  productName?: string | null;
  brandName?: string | null;
};

/** 결정적 선택. 패션은 팩의 제목 성격을 따르고(세리프→클래식, 굵은 고딕→볼드, 가는 고딕→모노), 그 밖은 시드로 고른다 */
export function pickFontPair(input: FontPairInput): FontPair {
  // 비교 캡처 전용(운영에서 설정하지 않는다): NEXT_PUBLIC_DESIGN_V3_FONT_PAIR=<세트 id> 로 세트를 강제한다
  const forced = process.env.NEXT_PUBLIC_DESIGN_V3_FONT_PAIR as FontPairId | undefined;
  if (forced && FONT_PAIRS[forced]) return FONT_PAIRS[forced];
  const cat = resolveTemplateCategory(input.category ?? "");
  const ids = CATEGORY_FONT_PAIRS[cat];
  if (cat === "패션/의류") {
    const h = input.packHeadline;
    if (!h || h.kind === "serif") return FONT_PAIRS["fashion-classic"];
    return FONT_PAIRS[h.weight >= 800 ? "fashion-bold" : "fashion-mono"];
  }
  return FONT_PAIRS[ids[fontSeed(input.productName, input.brandName) % ids.length]!];
}

/** 한 페이지에서 쓰는 패밀리(1종) */
export function pairFamilies(p: FontPair): FontFamilyKey[] {
  return [...new Set<FontFamilyKey>([p.body.family, p.title.family, p.label_.family])];
}

const NOTO_STACK = `'Noto Sans KR', 'Noto Sans KR Fallback', ${SYS}`;
export const pairStacks = (_p: FontPair) => ({ body: NOTO_STACK, title: NOTO_STACK, label: NOTO_STACK });

/**
 * 로드 전 폴백 폭 보정 — 'Noto Sans KR Fallback'(시스템 한글 폰트를 Noto 폭에 맞춤)을 Noto 바로 뒤에 둔다.
 * 값은 이 기계(Windows·Chromium)에서 같은 한글·영숫자 문장을 Noto Sans KR 400과 Malgun Gothic으로 그려 폭 비율을 측정해 정한다(scripts/_432-measure.ts).
 * 맥(Apple SD Gothic Neo)·리눅스 폴백은 측정하지 못해 같은 값을 근사로 쓴다.
 */
export const NOTO_FALLBACK_SIZE_ADJUST = 0.925; // 측정: Noto Sans KR 609.7px ÷ Malgun Gothic 658.8px = 0.925
export const NOTO_FALLBACK_CSS = `@font-face{font-family:'Noto Sans KR Fallback';src:local('Malgun Gothic'),local('Apple SD Gothic Neo'),local('Noto Sans CJK KR');size-adjust:${(NOTO_FALLBACK_SIZE_ADJUST * 100).toFixed(1)}%}`;

/**
 * 첫 화면 preload(같은 출처): 라틴(가격·숫자·영문 라벨) 400·700 + **자주 쓰는 한글 조각**(Noto 한글 조각 116~119번이 저장 세션 5종·랜딩 문구의 한글 음절 87%를 덮는다,
 * scripts/_432-chunks.mjs로 계산). 히어로 제목·가격 스트립·요약 문구의 조각을 글자마다 서버에서 계산하는 것은 클라이언트 렌더라 하지 않았다.
 */
export const NOTO_PRELOAD_FILES = [
  "noto-sans-kr-latin-400-normal.woff2",
  "noto-sans-kr-latin-700-normal.woff2",
  "noto-sans-kr-118-400-normal.woff2",
  "noto-sans-kr-119-400-normal.woff2",
  "noto-sans-kr-117-400-normal.woff2",
  "noto-sans-kr-118-700-normal.woff2",
  "noto-sans-kr-119-700-normal.woff2",
  "noto-sans-kr-117-700-normal.woff2",
] as const;
export function fontPreloadHrefs(origin = ""): string[] {
  return NOTO_PRELOAD_FILES.map((f) => `${origin.replace(/\/+$/, "")}/fonts/noto-sans-kr/${f}`);
}

/** 같은 CSS 한 벌(라이브 `[data-pz-v3]`·export `.pagzly-wrap` 공용). 본문 15px는 건드리지 않는다 */
export function fontPairCss(scope: string, p: FontPair): string {
  const s = pairStacks(p);
  const t = p.title;
  return (
    NOTO_FALLBACK_CSS +
    `${scope}{--pz-f-title:${s.title};--pz-f-body:${s.body};--pz-f-label:${s.label};font-family:var(--pz-f-body)}` +
    `${scope} .font-sans,${scope} .font-heading,${scope} .font-mono{font-family:var(--pz-f-body)!important}` +
    // 숫자·가격은 같은 폭 숫자(tabular-nums), 영문 라벨(.font-mono)은 자간을 넓힌다
    `${scope} .font-heading{font-variant-numeric:tabular-nums}` +
    `${scope} .font-mono{letter-spacing:${p.label_.letterSpacing}!important}` +
    // 446차 5 — export의 STEP 라벨(.pagzly-step-tag)은 font-mono 클래스가 없어 이 자간이 라이브에만 걸렸다(인라인 .32em). v4에서 같은 자간을 건다(라이브는 해당 클래스가 없어 영향 없음)
    (DESIGN_V4_ENABLED ? `${scope} .pagzly-step-tag{letter-spacing:${p.label_.letterSpacing}!important}` : "") +
    `${scope} .pagzly-display-headline{font-family:var(--pz-f-title)!important;font-weight:${t.weight}!important;letter-spacing:${t.letterSpacing}!important;line-height:${t.lineHeight}!important}`
  );
}

/** 조합이 쓰는 폰트 CSS 링크 주소(같은 출처 /fonts/*.css). origin을 주면 절대 주소(export용) */
export function fontLinkHrefs(p: FontPair, origin = ""): string[] {
  return pairFamilies(p).map((k) => `${origin.replace(/\/+$/, "")}/fonts/${FONT_FAMILIES[k].css}.css`);
}

/** export가 폰트 CSS를 불러올 출처: 브라우저면 현재 출처, 서버면 NEXT_PUBLIC_SITE_URL(없으면 빈 값 = 상대 주소) */
export function fontOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
}
