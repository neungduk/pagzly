/**
 * 430차 — 상세페이지 폰트 조합(디자인 V3 폰트). 제목 폰트 + 본문 폰트 + 숫자·영문 라벨 폰트 3종을 한 세트로 토큰화한다.
 * 모두 SIL OFL 1.1(상업 이용·임베드 허용, review/430-font-licenses.md)이고 셀프 호스팅(public/fonts, scripts/build-detail-fonts.mjs)이다 — 외부 CDN 호출 없음.
 *  - 한 페이지에서 쓰는 폰트 패밀리는 최대 3종(회귀가 확인). 디스플레이 폰트는 큰 제목에만, 본문은 항상 본문 폰트(Pretendard).
 *  - 카테고리당 2~3세트. 선택은 결정적이다(같은 입력 → 같은 세트): 패션은 스타일 팩의 제목 성격(세리프/굵은 고딕/가는 고딕)으로, 그 밖은 상품명·브랜드 시드로.
 *  - 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 세트·같은 CSS 한 벌(fontPairCss)을 쓴다. export에 :has·컨테이너 쿼리·text-wrap 없음.
 * 플래그: NEXT_PUBLIC_DESIGN_V3_FONTS=off 면 429차 폰트(Noto)로 돌아간다(픽셀 동일).
 */
import { resolveTemplateCategory, type TemplateCategory } from "@/lib/section-templates";

export const DESIGN_V3_FONTS_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V3_FONTS !== "off";

export type FontFamilyKey = "pretendard" | "hahmlet" | "gowun-batang" | "black-han-sans" | "do-hyeon" | "jua" | "playfair-display" | "montserrat";

const SYS = "system-ui, -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

/** key → public/fonts/<css>.css 와 font-family 이름 */
export const FONT_FAMILIES: Record<FontFamilyKey, { css: string; name: string; display: boolean }> = {
  pretendard: { css: "pretendard", name: "Pretendard", display: false },
  hahmlet: { css: "hahmlet", name: "Hahmlet Variable", display: true },
  "gowun-batang": { css: "gowun-batang", name: "Gowun Batang", display: true },
  "black-han-sans": { css: "black-han-sans", name: "Black Han Sans", display: true },
  "do-hyeon": { css: "do-hyeon", name: "Do Hyeon", display: true },
  jua: { css: "jua", name: "Jua", display: true },
  "playfair-display": { css: "playfair-display", name: "Playfair Display Variable", display: false },
  montserrat: { css: "montserrat", name: "Montserrat Variable", display: false },
};

export type FontPairId =
  | "beauty-elegant" | "beauty-soft" | "beauty-modern"
  | "fashion-classic" | "fashion-bold" | "fashion-mono"
  | "tech-clean" | "tech-display"
  | "food-warm" | "food-batang";

export type FontPair = {
  id: FontPairId;
  label: string;
  title: { family: FontFamilyKey; weight: number; letterSpacing: string; serif: boolean };
  body: { family: "pretendard" };
  /** 숫자·영문 라벨(한글은 본문 폰트로 이어진다) */
  label_: { family: "playfair-display" | "montserrat" | "pretendard" };
};

const pair = (id: FontPairId, label: string, title: FontPair["title"], labelFamily: FontPair["label_"]["family"]): FontPair => ({ id, label, title, body: { family: "pretendard" }, label_: { family: labelFamily } });

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  "beauty-elegant": pair("beauty-elegant", "뷰티 · 우아한 세리프", { family: "hahmlet", weight: 700, letterSpacing: "-0.015em", serif: true }, "playfair-display"),
  "beauty-soft": pair("beauty-soft", "뷰티 · 부드러운 바탕체", { family: "gowun-batang", weight: 700, letterSpacing: "-0.01em", serif: true }, "playfair-display"),
  "beauty-modern": pair("beauty-modern", "뷰티 · 모던 고딕", { family: "pretendard", weight: 700, letterSpacing: "-0.03em", serif: false }, "montserrat"),
  "fashion-classic": pair("fashion-classic", "패션 · 클래식 세리프", { family: "hahmlet", weight: 700, letterSpacing: "-0.01em", serif: true }, "playfair-display"),
  "fashion-bold": pair("fashion-bold", "패션 · 볼드 디스플레이", { family: "black-han-sans", weight: 400, letterSpacing: "-0.01em", serif: false }, "montserrat"),
  "fashion-mono": pair("fashion-mono", "패션 · 모노 고딕", { family: "pretendard", weight: 700, letterSpacing: "-0.035em", serif: false }, "montserrat"),
  "tech-clean": pair("tech-clean", "전자·생활 · 클린 고딕", { family: "pretendard", weight: 800, letterSpacing: "-0.04em", serif: false }, "montserrat"),
  "tech-display": pair("tech-display", "전자·생활 · 디스플레이", { family: "do-hyeon", weight: 400, letterSpacing: "-0.01em", serif: false }, "montserrat"),
  "food-warm": pair("food-warm", "식품·반려 · 둥근 따뜻함", { family: "jua", weight: 400, letterSpacing: "-0.01em", serif: false }, "montserrat"),
  "food-batang": pair("food-batang", "식품·반려 · 바탕체", { family: "gowun-batang", weight: 700, letterSpacing: "-0.01em", serif: true }, "playfair-display"),
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
  /** 패션 스타일 팩의 제목 성격(없으면 클래식=세리프) */
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

/** 한 페이지에서 쓰는 패밀리(본문·제목·라벨, 중복 제거) — 3종 이하여야 한다 */
export function pairFamilies(p: FontPair): FontFamilyKey[] {
  return [...new Set<FontFamilyKey>([p.body.family, p.title.family, p.label_.family])];
}

const q = (key: FontFamilyKey) => `'${FONT_FAMILIES[key].name}'`;
// 430B: Pretendard가 늦게 오는 동안 쓰는 폴백(Pretendard Fallback = 시스템 한글 폰트를 폭 보정)을 바로 뒤에 둔다
const bodyStack = () => `${q("pretendard")}, 'Pretendard Fallback', 'Noto Sans KR', ${SYS}`;
export const pairStacks = (p: FontPair) => ({
  body: bodyStack(),
  title: `${q(p.title.family)}, ${p.title.family === "pretendard" ? "'Noto Sans KR'" : p.title.serif ? "'Noto Serif KR'" : "'Noto Sans KR'"}, ${p.title.serif ? "serif" : SYS}`,
  label: `${q(p.label_.family)}, ${bodyStack()}`,
});

/**
 * 430B CLS 완화 — 폰트별 폴백 메트릭 보정. Pretendard는 Malgun Gothic보다 한글 폭이 약 12.6% 좁다(Windows·Chromium에서 같은 한글·영숫자 문장 폭을 측정: 575.9px / 658.8px = 0.874).
 * 로드 전 폴백이 같은 폭으로 그려지게 size-adjust 87.4%를 준다. Apple SD Gothic Neo·Noto Sans CJK KR의 폭은 이 기계에서 측정하지 못해 같은 값을 근사로 쓴다(맥·리눅스는 확인 못 함).
 */
export const PRETENDARD_FALLBACK_CSS =
  "@font-face{font-family:'Pretendard Fallback';src:local('Malgun Gothic'),local('Apple SD Gothic Neo'),local('Noto Sans CJK KR');size-adjust:87.4%}";

/** 첫 화면 라틴 글자(가격·영문 라벨·숫자)용 Pretendard Regular·Bold 라틴 서브셋(각 약 20KB) — preload 주소(같은 출처). 한글은 글 내용마다 조각이 달라 preload하지 않는다 */
export const PRETENDARD_PRELOAD_FILES = ["Pretendard-Regular.subset.91.woff2", "Pretendard-Bold.subset.91.woff2"] as const;
export function fontPreloadHrefs(origin = ""): string[] {
  return PRETENDARD_PRELOAD_FILES.map((f) => `${origin.replace(/\/+$/, "")}/fonts/pretendard/${f}`);
}

/** 같은 CSS 한 벌(라이브 `[data-pz-v3]`·export `.pagzly-wrap`/`:root` 공용). 본문 15px·줄간격은 건드리지 않는다 */
export function fontPairCss(scope: string, p: FontPair): string {
  const s = pairStacks(p);
  const t = p.title;
  return (
    PRETENDARD_FALLBACK_CSS +
    `${scope}{--pz-f-title:${s.title};--pz-f-body:${s.body};--pz-f-label:${s.label};font-family:var(--pz-f-body)}` +
    `${scope} .font-sans{font-family:var(--pz-f-body)!important}` +
    `${scope} .font-heading,${scope} .font-mono{font-family:var(--pz-f-label)!important}` +
    // 430B: 세리프 라벨(Playfair)은 x-height가 작아 영문·숫자 라벨이 작아 보인다 — 영문 라벨(.font-mono)만 크기 +4%·자간 +0.06em로 키워 Noto와 구분되게
    (p.label_.family === "playfair-display" ? `${scope} .font-mono{letter-spacing:0.06em!important;font-size:1.04em}` : "") +
    `${scope} .pagzly-display-headline{font-family:var(--pz-f-title)!important;font-weight:${t.weight}!important;letter-spacing:${t.letterSpacing}!important}`
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
