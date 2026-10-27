/**
 * 439차 2-3 — 타이포 연출(입력 문구만 사용, 새 문구 없음).
 *  - 키워드 강조: 제목 안에서 입력 키워드(핵심 키워드·제품명 어절·입력 수치)와 같은 어절을 굵기 900 + 하이라이터(배경 하단 40%) 또는 색으로. 일치가 없으면 강조 없음.
 *  - 고스트 글자: 섹션 번호·큰 숫자(424 게이트 통과 값)·영문 제품명을 아주 옅은 색 채움의 배경 장식 글자로(외곽선 -webkit-text-stroke는 export·PNG에서 불안정해 쓰지 않는다).
 *  - 제목 위계 프리셋 3종(mood별): 큰 제목 + 작은 영문 라벨 / 번호 + 제목 / 라벨 알약 + 제목. 라벨은 섹션 종류 고정 라벨(POINT·CHECK·STORY·SPEC·DETAIL·FAQ·NOTICE)과 순번만.
 *  - 카드 제목 고아: 438차 bindTail을 굵은 카드 제목(15px 이상·굵기 600 이상)까지 넓힌다.
 *  - 행간·자간·굵기 위계: TYPE_SCALE_V4(mood 토큰과 함께) 한 곳에서 정한다.
 */
import { bindTail } from "@/lib/typo-rhythm";
import { DETAIL_FONT_STACK } from "@/lib/detail-typography";
import { hexToRgba } from "@/lib/design-tokens";
import { HEADING_SECTION_PX as HEADING_PX, MIN_BODY_PX, MIN_LABEL_PX, TYPE_V4 } from "@/lib/design-tokens-v4";

export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const TITLE_FF = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
export const SANS_FF = `font-family:${DETAIL_FONT_STACK.sans}`;

/** v4 타입 스케일(390 기준 px·행간·자간·굵기). 값의 원천은 lib/design-tokens-v4.ts(TYPE_V4) 한 곳 — 여기는 역할 이름만 붙인다. 본문 최소 14px, 라벨 최소 12px */
export const TYPE_SCALE_V4 = {
  display: TYPE_V4.display,
  title: TYPE_V4["heading-large"], // 441 — 섹션 제목(대)과 같은 26px
  card: TYPE_V4["heading-small"],
  body: TYPE_V4.body,
  small: TYPE_V4["body-small"],
  label: TYPE_V4.label,
} as const;
export type TypeRole = keyof typeof TYPE_SCALE_V4;
export { MIN_BODY_PX, MIN_LABEL_PX };

/** 역할 → 인라인 글꼴 스타일 */
export function typeCss(role: TypeRole, color: string, extra = ""): string {
  const t = TYPE_SCALE_V4[role];
  const ff = role === "display" || role === "title" ? TITLE_FF : SANS_FF;
  return `${ff};font-size:${t.size}px;font-weight:${t.w};letter-spacing:${t.ls};line-height:${t.lh};color:${color};word-break:keep-all;${extra}`;
}

// ── 키워드 강조 ──────────────────────────────────────────────────────────────
/** 입력에서 강조 후보 어절: 핵심 키워드(쉼표·# 구분, 2~10자) + 제품명 어절(2자 이상) + 입력 수치 토큰. 중복 제거, 긴 것 먼저 */
export function keywordCandidates(input: { keyFeatures?: string | null; productName?: string | null; numbers?: Iterable<string> }): string[] {
  const out = new Set<string>();
  for (const raw of (input.keyFeatures ?? "").replace(/#/g, ",").split(/[,，、·\/\n:：]/)) {
    const t = raw.trim();
    if (t.length >= 2 && t.length <= 10 && !/[()（）[\]]/.test(t)) out.add(t);
  }
  for (const w of (input.productName ?? "").split(/[\s()（）]+/)) if (w.length >= 2 && /[가-힣]/.test(w)) out.add(w);
  for (const n of input.numbers ?? []) if (n.length >= 2) out.add(n);
  return [...out].sort((a, b) => b.length - a.length);
}

/** 제목(이스케이프 전 원문)에서 첫 일치 키워드 하나를 강조한 HTML. 일치 없으면 이스케이프만 */
export function highlightKeyword(text: string, keywords: readonly string[], style: "marker" | "color", color: string): { html: string; hit: string | null } {
  for (const k of keywords) {
    const at = text.indexOf(k);
    if (at < 0) continue;
    const span =
      style === "marker"
        ? `<span data-pz-kw style="font-weight:900;background-image:linear-gradient(transparent 60%,${hexToRgba(color, 0.32)} 60%);box-decoration-break:clone;-webkit-box-decoration-break:clone">${esc(k)}</span>`
        : `<span data-pz-kw style="font-weight:900;color:${color}">${esc(k)}</span>`;
    return { html: `${esc(text.slice(0, at))}${span}${esc(text.slice(at + k.length))}`, hit: k };
  }
  return { html: bindTail(esc(text)), hit: null };
}

// ── 고스트 글자 ─────────────────────────────────────────────────────────────
/**
 * 배경 장식 글자(aria-hidden). 섹션 오른쪽 위 여백 띠에 걸치게 두고, 옅은 채움 색(면과 거의 같은 틴트)이라 위의 글 대비에 영향이 없다.
 * 글자는 입력값(번호·수치·영문 제품명)만.
 */
export function ghostHtml(text: string, color: string, sizePx: number, pos: "tr" | "tl" | "br" = "tr"): string {
  const where = pos === "tr" ? "top:-6px;right:12px" : pos === "tl" ? "top:-6px;left:12px" : "bottom:-10px;right:12px";
  return `<span aria-hidden="true" data-pz-ghost style="position:absolute;${where};${TITLE_FF};font-size:${sizePx}px;font-weight:900;letter-spacing:-0.04em;line-height:1;color:${color};white-space:nowrap;pointer-events:none;z-index:0">${esc(text)}</span>`;
}

// ── 제목 위계 프리셋 ────────────────────────────────────────────────────────
export type TitlePreset = "enlabel" | "number" | "pill";
export const MOOD_TITLE_PRESET: Record<string, TitlePreset> = { "minimal-luxe": "enlabel", clinic: "number", natural: "enlabel", playful: "pill", street: "number", warm: "pill" };
export const titlePresetFor = (mood: string | null | undefined): TitlePreset => (mood && MOOD_TITLE_PRESET[mood]) || "number";

/** 섹션 종류 고정 라벨(이미 화면에 쓰던 표기 계열: POINT·STEP·FAQ·INFO 등) */
export const EYEBROW_LABEL: Record<string, string> = { benefits: "POINT", concern: "CHECK", story: "STORY", spec: "SPEC", phototext: "DETAIL", faq: "FAQ", note: "NOTICE", steps: "STEP" };

/** 아이브로우 + 제목. 제목이 없으면 아이브로우만(번호 프리셋은 번호만) */
export function titleBlock(preset: TitlePreset, label: string, no: number, titleHtml: string, c: { ink: string; deep: string; pillBg: string; pillFg: string }): string {
  const num = String(no).padStart(2, "0");
  const eyebrow =
    preset === "enlabel"
      ? `<p data-pz-eyebrow style="margin:0 0 10px;${typeCss("label", c.deep)}">${esc(label)}</p>`
      : preset === "number"
        ? `<p data-pz-eyebrow style="margin:0 0 8px;display:flex;align-items:center;gap:10px;${typeCss("label", c.deep)}"><span style="${TITLE_FF};font-size:22px;font-weight:900;letter-spacing:-0.02em;line-height:1">${num}</span><span style="display:block;width:28px;height:2px;background:${c.deep}"></span><span>${esc(label)}</span></p>`
        : `<p data-pz-eyebrow style="margin:0 0 12px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${c.pillBg};${typeCss("label", c.pillFg, "letter-spacing:0.1em")}">${esc(label)} ${num}</span></p>`;
  const title = titleHtml ? `<p data-pz-title style="margin:0 0 24px;${typeCss("title", c.ink)}">${titleHtml}</p>` : "";
  return eyebrow + title;
}

// ── 카드 제목 고아 ───────────────────────────────────────────────────────────
const CARD_TITLE_RE = /(<p\b[^>]*font-size:(\d+(?:\.\d+)?)px;font-weight:(\d+)[^>]*>)([^<]+)(<\/p>)/g;
/** 굵은 카드 제목(15px 이상·굵기 600 이상)의 끝 짧은 어절을 앞 어절과 묶는다. 태그 섞인 글은 그대로 */
export function polishCardTitles(html: string): string {
  return html.replace(CARD_TITLE_RE, (all, open: string, size: string, weight: string, text: string, close: string) =>
    Number(size) >= 15 && Number(weight) >= 600 && !text.includes('style="white-space:nowrap"') ? `${open}${bindTail(text)}${close}` : all,
  );
}

// ── 글자 크기 하한(라이브·export 공용 CSS) ────────────────────────────────────
/**
 * 439차 2-7 린트 1회차 수정 — 이전 차수 마크업에 남은 9~11px 라벨(STEP·한눈에 보기·각주 등)을 12px로 올린다.
 * 인라인 스타일(export "font-size:11px", 라이브 CSSOM "font-size: 11px")과 라이브 Tailwind 클래스(text-[11px] 등)를 함께 잡는다.
 * scope 요소에 data-pz-typefloor를 달아 린터가 하한 적용 여부를 안다. SVG 도식 안 글자(font-size 속성)는 건드리지 않는다.
 */
export function typeFloorCss(scope: string): string {
  const sizes = ["9px", "10px", "10.5px", "11px", "11.5px"];
  const sels = [
    ...sizes.flatMap((v) => [`${scope} [style*="font-size:${v}"]`, `${scope} [style*="font-size: ${v}"]`]),
    ...["9px", "10px", "11px"].map((v) => `${scope} .text-\[${v}\]`),
  ];
  return `${sels.join(",")}{font-size:12px!important}`;
}

// ── 섹션 제목 시스템(라이브·export 공용 CSS) ──────────────────────────────────
/**
 * 441차 1-1 — 제목 위계 통일(DESIGN_V4). 감사(24종 456개): 스타일 10종, 굵기 400·500 제목 26개 — 뷰티 서체 짝(lib/font-pairs.ts)이
 * `.pagzly-display-headline`을 400·500 !important로 덮어 "이런 고민 있으신가요?"·"숫자로 보는 구성" 같은 얇고 연한 제목이 굵은 v4 제목과 섞였다.
 * 위계 3단: 대(섹션 제목) 26px·800 / 중(카드 큰 제목) 20~22·800 / 소(카드 제목) 16~18·700. 인용·큰 문구(display 30·900)는 별도.
 * 선택자에 `section`을 넣어 서체 짝 규칙(같은 클래스 2단)보다 구체도를 높인다 — 스타일 태그 순서와 무관하게 이긴다.
 * 크기는 좁은 폭(390)만 26px: 라이브는 컨테이너 쿼리 변수 `--pz-t-section-b`, export는 640 미만 미디어 쿼리의 `--pz-t-section`(design-tokens 369행 규칙).
 * 넓은 폭(750) 제목 36px는 그대로 — 처음엔 export 변수 하나만 덮어 750 폭까지 26px로 눌렀고 라이브와 어긋났다(패리티 -10).
 */
export const HEADING_SECTION_PX = HEADING_PX;
export function headingSystemCss(scope: string, mode: "live" | "export"): string {
  const size = `${HEADING_SECTION_PX / 16}rem`;
  return (
    (mode === "live" ? `${scope}{--pz-t-section-b:${size}!important}` : `@media (max-width:639px){${scope}{--pz-t-section:${size}!important}}`) +
    `${scope} section .pagzly-display-headline{font-weight:800!important}`
  );
}

/**
 * 441차 1-1 — 이전 임팩트 템플릿 카드 제목 굵기를 위계 3단에 맞춘다(DESIGN_V4, 임팩트 마크업 한 벌이라 라이브·export 같음).
 * 중(20~22px)인데 700, 소(18~19px)인데 600이던 제목이 한 페이지 제목 스타일을 4~5종으로 늘렸다(린트 R16). style 속성 단위로 크기·굵기를 함께 본다.
 */
export function tierHeadingWeights(html: string): string {
  return html.replace(/style="([^"]*)"/g, (all, st: string) => {
    const size = Number(/(?:^|;)font-size:(\d+)px/.exec(st)?.[1] ?? 0);
    const w = /(?:^|;)font-weight:(\d+)/.exec(st)?.[1];
    if (!w) return all;
    const want = size >= 20 && size <= 22 && w === "700" ? "800" : size >= 18 && size <= 19 && w === "600" ? "700" : null;
    return want ? `style="${st.replace(/((?:^|;)font-weight:)\d+/, `$1${want}`)}"` : all;
  });
}

// ── 숫자 강조 컴포넌트 ──────────────────────────────────────────────────────
/**
 * 441차 1-4 — 큰 숫자 + 작은 단위(+ 라벨은 호출 쪽). "30mL"·"4가지"·"15cm"·"42dB"처럼 숫자로 시작하면 숫자는 크게(900), 단위는 절반 크기(800).
 * 숫자로 시작하지 않는 글 값("하이브리드 ANC 42dB")은 숫자처럼 키우지 않고 0.72배·800으로 — 큰 글자 여러 줄이 되지 않게.
 * 값은 입력(424 게이트를 통과한 표·스펙 값) 그대로, 계산·반올림 없음.
 */
export function numberStatHtml(value: string, color: string, px: number): string {
  const v = value.trim();
  const m = /^([0-9][0-9.,~∼\-]*)\s*([^\s].{0,5})?$/.exec(v);
  if (m) {
    const unit = m[2] ? `<span style="font-size:${Math.round(px * 0.5)}px;font-weight:800;letter-spacing:0;margin-left:2px">${esc(m[2])}</span>` : "";
    return `<span style="${TITLE_FF};font-size:${px}px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;color:${color};white-space:nowrap">${esc(m[1]!)}${unit}</span>`;
  }
  return `<span style="${TITLE_FF};font-size:${Math.round(px * 0.72)}px;font-weight:800;letter-spacing:-0.02em;line-height:1.25;color:${color};word-break:keep-all">${esc(v)}</span>`;
}
