/**
 * 474차 V5 — 아키타입별 제목·본문 서체 짝.
 * V5 켜짐에서만 사용. 폰트는 scripts/build-v5-fonts.mjs + Noto Sans KR(기존).
 */
import type { ArchetypeId } from "@/lib/page-archetype-v5";

export type V5FontKey =
  | "noto-sans-kr"
  | "noto-serif-kr"
  | "gowun-batang"
  | "gowun-dodum"
  | "black-han-sans"
  | "do-hyeon"
  | "jua";

export type TypePairV5 = {
  title: V5FontKey;
  body: V5FontKey;
  /** 숫자·탭 */
  num: V5FontKey;
  titleWeight: number;
  titleTracking: string;
  titleLh: number;
  bodySize: number;
  bodyLh: number;
  /** 한글 문단 폭(문자 수 상한 → ch) */
  measureCh: number;
};

/** CSS font-family + 짧은 폴백(export 다이어트). 라이선스·출처는 docs/fonts-license-474.md */
export const V5_FONT_CSS: Record<V5FontKey, { family: string; stack: string; css: string }> = {
  "noto-sans-kr": { family: "Noto Sans KR", stack: "'Noto Sans KR',sans-serif", css: "noto-sans-kr" },
  "noto-serif-kr": { family: "Noto Serif KR", stack: "'Noto Serif KR',serif", css: "noto-serif-kr" },
  "gowun-batang": { family: "Gowun Batang", stack: "'Gowun Batang',serif", css: "gowun-batang" },
  "gowun-dodum": { family: "Gowun Dodum", stack: "'Gowun Dodum',sans-serif", css: "gowun-dodum" },
  "black-han-sans": { family: "Black Han Sans", stack: "'Black Han Sans',sans-serif", css: "black-han-sans" },
  "do-hyeon": { family: "Do Hyeon", stack: "'Do Hyeon',sans-serif", css: "do-hyeon" },
  jua: { family: "Jua", stack: "'Jua',sans-serif", css: "jua" },
};

/**
 * 8종 제목 서체: editorial 고운바탕 · catalog 노토산스 · softlife 고운돋움 · impact 블랙한산스
 * · techsheet 도현 · narrative 노토세리프 · luxe 노토세리프(자간만 다름, 패밀리는 narrative와 같음)
 * · pop 주아 → 서로 다른 패밀리 7종(≥5).
 */
export const TYPE_PAIR_V5: Record<ArchetypeId, TypePairV5> = {
  editorial: { title: "gowun-batang", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 700, titleTracking: "-0.02em", titleLh: 1.28, bodySize: 15, bodyLh: 1.7, measureCh: 30 },
  catalog: { title: "noto-sans-kr", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 800, titleTracking: "-0.03em", titleLh: 1.22, bodySize: 15, bodyLh: 1.65, measureCh: 28 },
  softlife: { title: "gowun-dodum", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 400, titleTracking: "-0.01em", titleLh: 1.35, bodySize: 16, bodyLh: 1.75, measureCh: 32 },
  impact: { title: "black-han-sans", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 400, titleTracking: "-0.04em", titleLh: 1.15, bodySize: 16, bodyLh: 1.65, measureCh: 26 },
  techsheet: { title: "do-hyeon", body: "noto-sans-kr", num: "do-hyeon", titleWeight: 400, titleTracking: "0", titleLh: 1.2, bodySize: 15, bodyLh: 1.65, measureCh: 28 },
  narrative: { title: "noto-serif-kr", body: "gowun-batang", num: "noto-sans-kr", titleWeight: 700, titleTracking: "-0.02em", titleLh: 1.3, bodySize: 16, bodyLh: 1.8, measureCh: 34 },
  luxe: { title: "noto-serif-kr", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 400, titleTracking: "0.04em", titleLh: 1.35, bodySize: 15, bodyLh: 1.75, measureCh: 30 },
  pop: { title: "jua", body: "noto-sans-kr", num: "noto-sans-kr", titleWeight: 400, titleTracking: "-0.02em", titleLh: 1.2, bodySize: 16, bodyLh: 1.65, measureCh: 26 },
};

export function titleFamiliesDistinct(ids: ArchetypeId[] = Object.keys(TYPE_PAIR_V5) as ArchetypeId[]): number {
  return new Set(ids.map((a) => TYPE_PAIR_V5[a].title)).size;
}

export function typePairFamilies(id: ArchetypeId): V5FontKey[] {
  const p = TYPE_PAIR_V5[id];
  return [...new Set<V5FontKey>([p.title, p.body, p.num, "noto-sans-kr"])];
}

/** V5 서체 CSS — :is·var 재사용으로 export 다이어트. 제목·본문·숫자·문단 폭 */
export function typeSystemCssV5(scope: string, id: ArchetypeId): string {
  const p = TYPE_PAIR_V5[id];
  const t = V5_FONT_CSS[p.title].stack;
  const b = p.body === p.title ? "var(--pz-v5-title)" : V5_FONT_CSS[p.body].stack;
  const n = p.num === p.title ? "var(--pz-v5-title)" : p.num === p.body ? "var(--pz-v5-body)" : V5_FONT_CSS[p.num].stack;
  const r = `${scope}[data-pz-bsig=${id}]`;
  // tw/tt/tlh는 값 인라인(변수 반복 절약). measure는 max-width에 직접.
  return (
    `${r}{--pz-v5-title:${t};--pz-v5-body:${b};--pz-v5-num:${n};font:${p.bodySize}px/${p.bodyLh} var(--pz-v5-body)}` +
    `${r} :is(h1,h2,[data-pz-title],[data-hero-name],.pagzly-display-headline){font-family:var(--pz-v5-title)!important;font-weight:${p.titleWeight}!important;letter-spacing:${p.titleTracking};line-height:${p.titleLh}}` +
    `${r} :is(.pagzly-run-num,[data-pz-bs-stat]){font-family:var(--pz-v5-num)!important}` +
    `${r} [data-pz-body]{max-width:${p.measureCh}ch}`
  );
}

/** export/live가 링크할 V5 폰트 CSS(같은 출처). noto-sans는 기존 경로 */
export function typeSystemFontHrefs(id: ArchetypeId, origin = ""): string[] {
  const base = origin.replace(/\/+$/, "");
  return typePairFamilies(id)
    .filter((k) => k !== "noto-sans-kr")
    .map((k) => `${base}/fonts/${V5_FONT_CSS[k].css}.css`);
}
