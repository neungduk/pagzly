/**
 * 415차 — 인포 구간(사용 3단계·포인트 카드·혼방 막대·비교표·세탁 관리) 표현 강화.
 * 문구는 그대로 두고 크기·색·카드 모양만 바꾼다. info 축: calm(지금 모습) · bold · dramatic.
 *  - calm이면 마크업에 어떤 속성도 붙이지 않고 CSS도 내지 않는다(기존 화면·HTML 바이트 그대로).
 *  - bold/dramatic이면 렌더러가 data-info(구간)·data-ip(조각) 속성을 붙이고, 같은 CSS 한 벌(infoCss)이 라이브와 export 양쪽에 걸린다.
 * export에 새 CSS 기능을 쓰지 않는다(:has·컨테이너 쿼리·text-wrap 없음 — 속성 선택자·::before·카운터만).
 */
import type { CategoryTheme } from "@/lib/category-theme";
import { BRAND, ensureReadableOnPaper } from "@/lib/design-tokens";
import { infoBackdropCss, type InfoBackdropMap, type InfoZone } from "@/lib/info-backdrop";

export type InfoLevel = "calm" | "bold" | "dramatic";
export const INFO_LEVELS = ["calm", "bold", "dramatic"] as const;
export const INFO_LABEL: Record<InfoLevel, string> = { calm: "차분", bold: "또렷", dramatic: "강조" };

type HasInfo = { info?: InfoLevel } | null | undefined;

export const infoOn = (layout: HasInfo): boolean => !!layout && (layout.info ?? "calm") !== "calm";

/** 라이브(JSX 스프레드)용 — calm이면 빈 객체 */
export const infoData = (layout: HasInfo, key: string): Record<string, string> => (infoOn(layout) ? { "data-info": key } : {});
export const ipData = (layout: HasInfo, key: string): Record<string, string> => (infoOn(layout) ? { "data-ip": key } : {});
/** export(문자열)용 — calm이면 빈 문자열 */
export const infoAttr = (layout: HasInfo, key: string): string => (infoOn(layout) ? ` data-info="${key}"` : "");
export const ipAttr = (layout: HasInfo, key: string): string => (infoOn(layout) ? ` data-ip="${key}"` : "");

/**
 * 문장 앞 절(첫 콜론 또는 첫 쉼표 앞)과 나머지. 문구는 그대로 두고 마크업만 나눈다.
 * 앞 절이 너무 길거나(28자 초과) 나머지가 없으면 null(굵게 하지 않는다).
 */
export function splitLead(text: string): { lead: string; rest: string } | null {
  const colon = text.indexOf(":");
  const comma = text.indexOf(",");
  const cut = colon >= 0 && (comma < 0 || colon < comma) ? colon : comma;
  if (cut <= 0) return null;
  const lead = text.slice(0, cut + (cut === colon ? 0 : 1)).trim();
  const rest = text.slice(cut + 1).trim();
  if (!lead || !rest || lead.length > 28) return null;
  return { lead: cut === colon ? `${lead}:` : lead, rest };
}

export type InfoColors = {
  /** 흰 글자가 4.5:1로 읽히는 포인트색(채움용) */
  accent: string;
  /** 흰 글자가 4.5:1로 읽히는 진한 색 */
  deep: string;
  soft: string;
  base: string;
  paper: string;
  ink: string;
};

export function infoColorsOf(theme: Pick<CategoryTheme, "accent" | "deepAccent" | "accentSoft" | "baseNeutral">): InfoColors {
  return {
    accent: ensureReadableOnPaper(theme.accent, 4.5),
    deep: ensureReadableOnPaper(theme.deepAccent, 4.5),
    soft: theme.accentSoft,
    base: theme.baseNeutral,
    paper: "#FFFFFF",
    ink: BRAND.ink,
  };
}

/** 인포 본문 최소 글자 크기(px) — 린트가 같은 값으로 검사한다 */
export const INFO_BODY_MIN_PX = 15;

const IMP = "!important";

/** scope: 라이브 `[data-pz-pack]`, export `.pagzly-wrap`. calm이면 빈 문자열 */
export function infoCss(level: InfoLevel | undefined, scope: string, c: InfoColors, backdrops?: InfoBackdropMap, opts?: { skipHeadline?: boolean; demote?: InfoZone[] }): string {
  if (!level || level === "calm") return "";
  const dr = level === "dramatic";
  const S = scope;
  const sec = (k: string) => `${S} [data-info="${k}"]`;
  const ip = (k: string) => `[data-ip="${k}"]`;
  const W = c.paper;
  const out: string[] = [];
  const rule = (sel: string, decl: string) => out.push(`${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`);

  // ── 모든 인포 구간: 위 액센트 띠 + 제목 크게(칸 폭에 맞춰 줄이는 pz-fit 규칙은 그대로 둔다) ──
  const mult = dr ? 1.3 : 1.2;
  for (const k of ["steps", "points", "stat", "statnum", "compare", "care"]) {
    rule(sec(k), `border-top:${dr ? 8 : 6}px solid ${c.accent}`);
  }
  const head = ["steps", "points", "stat", "compare", "care"].map((k) => `${sec(k)} .pagzly-display-headline`).join(",");
  // 419차 — classic(뷰티)는 --pz-fs 변수가 없어 제목 규칙이 글자 크기를 무효로 만든다 → skipHeadline
  if (!opts?.skipHeadline) {
    rule(
      head,
      `font-size:max(min(calc(var(--pz-fs) * ${mult}),0.6875rem),min(calc(var(--pz-fs) * ${mult}),calc(100cqi / var(--pz-fit-em,0.01))));line-height:1.18`,
    );
  }

  // ── 1. 사용 3단계 ──
  rule(sec("steps"), `background:${c.base}`);
  rule(`${sec("steps")} ol`, `display:flex;flex-direction:column;gap:30px;max-width:34rem;margin:44px auto 0;padding:0;list-style:none`);
  rule(`${sec("steps")} ol>div[aria-hidden]`, "display:none");
  rule(
    `${sec("steps")} ol>li`,
    `position:relative;display:flex;flex-direction:row;align-items:flex-start;gap:18px;text-align:left;padding:24px 22px 24px 20px;border-radius:16px;background:${W};border-left:6px solid ${c.accent};box-shadow:0 8px 24px rgba(27,27,24,0.1)`,
  );
  // 세로 연결선(3px, 포인트색) — 카드와 카드 사이
  out.push(`${sec("steps")} ol>li+li::before{content:"";position:absolute;left:44px;top:-30px;width:3px;height:30px;background:${c.accent}}`);
  rule(
    `${sec("steps")} ol>li>div:first-child>span,${sec("steps")} ol>li>span:first-child`,
    `flex-shrink:0;display:block;width:auto;height:auto;min-width:40px;background:none;border-radius:0;text-align:center;font-size:${dr ? 64 : 56}px;font-weight:900;line-height:1;letter-spacing:-0.04em;color:${c.accent}`,
  );
  rule(`${sec("steps")} ol>li>div:last-child`, `flex:1 1 0%;min-width:0;padding-top:0;text-align:left`);
  rule(`${sec("steps")} ol>li>div:last-child>p`,`margin:0 0 6px;font-size:13px;font-weight:800;letter-spacing:0.2em;color:${c.accent}`);
  rule(`${sec("steps")} ol>li>div:last-child>span`, `display:block;max-width:none;margin:0;font-size:16px;font-weight:400;line-height:1.6;color:${c.ink}`);
  rule(`${S} [data-info] b[data-ip="lead"]`, `display:block;margin-bottom:4px;font-size:20px;font-weight:800;line-height:1.35;color:${c.deep}`);
  if (dr) {
    // 마지막 단계 = 도착점: 반전색 카드
    const last = `${sec("steps")} ol>li:last-child`;
    rule(last, `background:${c.deep};border-left-color:${c.soft}`);
    rule([`>div:first-child>span`,`>span:first-child`,`>div:last-child>p`,`>div:last-child>span`,`>div:last-child>span b[data-ip="lead"]`].map((t)=>`${last}${t}`).join(","), `color:${W}`);
  }

  // ── 2. 포인트 카드 ──  (카드 = pgrid의 직계 자식, 제목 = 첫 <p>, 본문 = 나머지 <p>)
  const PG = `${sec("points")} ${ip("pgrid")}`;
  rule(sec("points"), `background:${c.deep};border-top-color:${c.accent}`);
  rule(`${sec("points")} .pagzly-display-headline,${sec("points")} .pagzly-display-headline span`, `color:${W}`);
  rule(PG, `display:grid;grid-template-columns:1fr;gap:${dr ? 44 : 22}px;max-width:34rem;margin:44px auto 0;counter-reset:pz-pt`);
  rule(
    `${PG}>div`,
    `position:relative;counter-increment:pz-pt;display:flex;flex-direction:column;gap:8px;padding:32px 24px;border-radius:16px;text-align:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.3);box-shadow:none`,
  );
  out.push(`${PG}>div::before{content:counter(pz-pt,decimal-leading-zero);display:block;margin-bottom:6px;font-size:13px;font-weight:800;letter-spacing:0.24em;color:rgba(255,255,255,0.78)}`);
  rule(`${PG}>div[data-em]`, `padding:44px 26px;background:${c.accent};border:2px solid rgba(255,255,255,0.6);box-shadow:0 16px 36px rgba(0,0,0,0.38)`);
  rule(`${PG}>div>p`, `margin:0;font-size:16px;line-height:1.65;font-weight:400;text-transform:none;letter-spacing:0;color:rgba(255,255,255,0.92)`);
  rule(`${PG}>div>p:first-of-type`, `font-size:30px;font-weight:900;line-height:1.2;color:${W}`);
  if (dr) {
    out.push(
      `${PG}>div:not(:last-child)::after{content:"\\2193";position:absolute;left:50%;top:100%;width:44px;height:44px;margin-left:-22px;font-size:26px;font-weight:900;line-height:44px;text-align:center;color:${W}}`,
    );
  }

  // 428차: 하드 면 예산을 넘으면 dramatic이어도 stat·statnum은 bold 표현(옅은 면)으로 그린다(lib/design-v2 planBands)
  const drS = dr && !opts?.demote?.includes("stat");
  // ── 3. 혼방 비율(막대) ──  (행 = bars의 직계 자식: 첫 div = 라벨+수치, 둘째 div = 트랙)
  const sBg = drS ? c.deep : c.soft;
  const fg = drS ? W : c.ink;
  const trackBg = drS ? "rgba(255,255,255,0.22)" : "rgba(27,27,24,0.12)";
  const fillTop = drS ? `linear-gradient(90deg,${c.soft},${W})` : `linear-gradient(90deg,${c.deep},${c.accent})`;
  const fillOther = drS ? "rgba(255,255,255,0.5)" : "rgba(27,27,24,0.38)";
  const valTop = drS ? W : c.accent;
  const BR = `${sec("stat")} ${ip("bars")}>div`;
  rule(sec("stat"), `background:${sBg}`);
  if (drS) rule(`${sec("stat")} .pagzly-display-headline,${sec("stat")} .pagzly-display-headline span`, `color:${W}`);
  rule(`${sec("stat")} ${ip("bars")}`, `display:flex;flex-direction:column;gap:32px;max-width:36rem;margin:44px auto 0`);
  rule(BR, "margin:0");
  rule(`${BR}>div:first-child span:not(:last-child),${BR}>div:first-child>div span`, `font-size:18px;font-weight:700;color:${fg}`);
  rule(`${BR}>div:first-child>span:last-child>*`, `font-size:44px;font-weight:900;color:${fg}`);
  rule(`${BR}[data-top]>div:first-child>span:last-child>*`, `font-size:${drS ? 72 : 64}px;color:${valTop}`);
  rule(`${BR}>div:nth-child(2)`, `height:24px;margin-top:12px;border-radius:999px;background:${trackBg}`);
  rule(`${BR}>div:nth-child(2)>div`, `background:${fillOther};box-shadow:none;border-radius:999px`);
  rule(`${BR}[data-top]>div:nth-child(2)>div`, `background:${fillTop}`);
  if (drS) rule(`${sec("stat")}>p`, `color:rgba(255,255,255,0.75)`);

  // 혼방 구간 밖으로 분리된 숫자 칸(사이즈 종수 등)
  rule(sec("statnum"), `background:${drS ? c.accent : c.base};padding-top:36px;padding-bottom:36px`);
  rule(`${sec("statnum")}>div`, `margin:0 auto;border-top:0;border-bottom:0`);
  rule(`${sec("statnum")} *`, `color:${drS ? W : c.deep}`);
  rule(`${sec("statnum")}>div>div>:last-child`, "font-size:16px;font-weight:700");

  // ── 4. 비교표(우리 칸 = 세로 기둥) ──  (행 = crows의 직계 div: p(항목명) + span(우리) + span(일반))
  const CR = `${sec("compare")} ${ip("crows")}>div`;
  rule(sec("compare"), `background:${W}`);
  rule(`${sec("compare")} ${ip("crows")}`, `display:flex;flex-direction:column;gap:0;max-width:30rem;margin:44px auto 0`);
  rule(CR, `display:grid;grid-template-columns:1fr 7.5rem 6rem;column-gap:0;row-gap:0;align-items:stretch;margin:0;padding:0;border:0`);
  rule(`${CR}>p`, `align-self:center;margin:0;padding:22px 12px 22px 4px;font-size:18px;font-weight:800;line-height:1.35;color:${c.ink}`);
  out.push(`${CR}:not(:last-child)>p,${CR}:not(:last-child)>span:nth-child(3){border-bottom:1px solid rgba(27,27,24,0.12)!important}`);
  rule(
    `${CR}>span:nth-child(2)`,
    `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;padding:20px 8px;border:0;border-radius:0;background:${c.accent};${dr ? "box-shadow:10px 0 20px -10px rgba(27,27,24,0.45),-10px 0 20px -10px rgba(27,27,24,0.45)" : "box-shadow:none"}`,
  );
  rule(`${CR}:first-child>span:nth-child(2)`, "border-radius:16px 16px 0 0");
  rule(`${CR}:last-child>span:nth-child(2)`, "border-radius:0 0 16px 16px");
  rule(`${CR}:only-child>span:nth-child(2)`, "border-radius:16px");
  rule(`${CR}>span:nth-child(2)>span`, `font-size:13px;font-weight:800;line-height:1.3;letter-spacing:0.02em;color:${W}`);
  rule(`${CR}>span:nth-child(2) svg`, `display:block;width:30px;height:30px;color:${W};stroke:${W};stroke-width:3.2`);
  rule(`${CR}>span:nth-child(3)`, `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:0;padding:20px 8px;border:0;border-radius:0;background:transparent`);
  rule(`${CR}>span:nth-child(3)>span`, `font-size:13px;font-weight:600;line-height:1.3;color:rgba(27,27,24,0.62)`);
  rule(`${sec("compare")}>p`, `font-size:13px;color:rgba(27,27,24,0.72)`);
  rule(`${CR}>span:nth-child(3) svg`, `display:block;width:24px;height:24px;color:rgba(27,27,24,0.55);stroke:rgba(27,27,24,0.55);stroke-width:2.6`);

  // ── 5. 세탁·관리 ──  (항목 li = 아이콘 span + 글 span)
  const CL = `${sec("care")} [data-caution-list]`;
  rule(sec("care"), `background:${c.soft}`);
  rule(CL, `max-width:34rem;margin:40px auto 0;padding:0;border:0;border-radius:0;background:transparent;font-size:16px`);
  rule(`${CL} ul`, `display:grid;gap:16px;margin:0;padding:0;list-style:none`);
  rule(`${CL} li`, `display:flex;align-items:flex-start;gap:16px;margin:0;padding:20px;border-radius:16px;background:${W};border:1px solid rgba(27,27,24,0.1);box-shadow:0 6px 18px rgba(27,27,24,0.08)`);
  rule(`${CL} li>span:first-child`, `flex-shrink:0;display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin:0;border-radius:9999px;background:${c.accent}`);
  rule(`${CL} li>span:first-child svg`, `display:block;width:24px;height:24px;color:${W};stroke:${W}`);
  rule(`${CL} li>span:last-child`, `display:block;min-width:0;font-size:16px;line-height:1.6;color:${c.ink}`);

  // 417차 선행 — AI 배경 슬롯(맵이 없으면 빈 문자열이라 바이트 불변)
  out.push(infoBackdropCss(backdrops, level, scope, c));
  return out.join("");
}

/** 체크 아이콘(인라인 SVG, 라이브·export 같은 마크업) — 세탁·관리 카드용 */
export const INFO_CHECK_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
