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

export const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const TITLE_FF = `font-family:${DETAIL_FONT_STACK.sansDisplayHeadline}`;
export const SANS_FF = `font-family:${DETAIL_FONT_STACK.sans}`;

/** v4 타입 스케일(390 기준 px·행간·자간·굵기). 본문 최소 14px, 라벨 최소 12px */
export const TYPE_SCALE_V4 = {
  display: { size: 30, lh: 1.25, ls: "-0.03em", w: 900 },
  title: { size: 24, lh: 1.3, ls: "-0.02em", w: 800 },
  card: { size: 17, lh: 1.45, ls: "-0.01em", w: 700 },
  body: { size: 15, lh: 1.7, ls: "0", w: 400 },
  small: { size: 14, lh: 1.6, ls: "0", w: 500 },
  label: { size: 12, lh: 1.2, ls: "0.14em", w: 700 },
} as const;
export type TypeRole = keyof typeof TYPE_SCALE_V4;
export const MIN_BODY_PX = 14;
export const MIN_LABEL_PX = 12;

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
export const EYEBROW_LABEL: Record<string, string> = { benefits: "POINT", concern: "CHECK", story: "STORY", spec: "SPEC", phototext: "DETAIL", faq: "FAQ", note: "NOTICE" };

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
