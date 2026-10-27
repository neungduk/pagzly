/**
 * 465차 V5 — 페이지 아키타입. 상품(카테고리·mood·시드)마다 8가지 "디자인 성격" 중 하나를 결정적으로 고르고, 그 성격의 토큰 한 벌이
 * ① 임팩트·v4 블록 마크업을 후처리(`applyArchetypeHtml` — 반경·테두리·그림자·종이색·여백 척도·제목 정렬·장식)하고
 * ② 일반 섹션 래퍼에 CSS(`archetypeCssV5` — 여백 척도·위쪽 선)를 입힌다.
 * 라이브·export는 같은 함수를 읽는다(토큰 단일 소스, 443차 방식). 새 문구는 만들지 않는다 — 장식은 선·점·SVG뿐.
 * 꺼짐(`DESIGN_V5_ENABLED` 아님)에서는 이 모듈의 어떤 함수도 호출되지 않는다(`getArchetypeTokens`가 null).
 *
 *  id         성격                                   바탕        반경   테두리        그림자   장식
 *  editorial  에디토리얼 매거진(가는 선·비대칭)           따뜻한 종이  0     1px 실선       없음     위쪽 가는 선
 *  catalog    카탈로그 그리드(각진 카드·굵은 구분)         차가운 회백  .25   2px 실선       없음     없음
 *  softlife   소프트 라이프스타일(큰 반경·파스텔)          크림        1.6   1px 부드러움   따뜻함    번지는 빛
 *  impact     하이콘트라스트 임팩트(하드 그림자)           흰색        .5    3px 실선       하드 4px  왼쪽 굵은 띠
 *  techsheet  클리닉/테크 스펙시트(헤어라인 그리드)         차가운 흰   .15   1px 진한 실선   없음     모서리 눈금
 *  narrative  스토리 스크롤(챕터·세로 척추)               따뜻한 흰   1     1px 실선       부드러움  왼쪽 세로 선
 *  luxe       프리미엄 미니멀(넓은 여백·얇은 선)           아이보리    .1    1px 옅은 실선  없음     가운데 짧은 선
 *  pop        플레이풀 팝(굵은 외곽선·스티커)              밝은 크림    1.8   2px 실선       하드 3px  기울어진 스티커
 */
import { designV5On } from "@/lib/design-v4";
import type { DividerKindAny } from "@/lib/dividers";
import type { FaceStrategy } from "@/lib/face-strategy-v5";

export const ARCHETYPE_IDS = ["editorial", "catalog", "softlife", "impact", "techsheet", "narrative", "luxe", "pop"] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export type FrameKind = "rect" | "round" | "arch" | "offset" | "tape" | "double";
export type DecorKind = "none" | "rule-top" | "corner-ticks" | "spine" | "bar-left" | "sticker" | "hair-center" | "glow"
  // 465차 V5 추가 장식 6종(코드 SVG·선만, 섹션 안쪽 여백 모서리에 놓여 글과 겹치지 않음)
  | "dots-grid" | "arc" | "squiggle" | "plus-field" | "bracket" | "ring";
export type BadgeShape = "circle" | "seal" | "ribbon" | "hex";
export type NumberStyle = "big" | "circle" | "roman" | "box";
export type MarkerKind = "check" | "dot" | "dash" | "arrow" | "square";
export type ShadowKind = "none" | "soft" | "warm" | "hard";

export type ArchetypeTokens = {
  id: ArchetypeId;
  /** 모서리 반경 배율(0 = 각짐). 100px 이상(알약)은 `pill`을 쓴다 */
  radius: number;
  /** 알약(999px) 대신 쓸 반경(px). "keep"이면 알약 그대로 */
  pill: number | "keep";
  /** 테두리: 굵기(px)·선 종류·진하기 배율 */
  border: { w: 1 | 2 | 3; style: "solid" | "dashed"; alphaMul: number };
  shadow: { kind: ShadowKind; offset: number };
  /** 흰 바탕(#FFFFFF)을 대신할 종이색 — 글자 대비는 회귀가 전수 확인 */
  paper: string;
  /** 466차 면 전략(lib/face-strategy-v5.ts): lightOnly 밝은 종이 / tintAlt 옅은 틴트 교대 / blockAlt 진한 면 교대 / colorCollide 포인트·진한 면 충돌 */
  face: FaceStrategy;
  /** 임팩트 블록 위아래 여백 3단(조밀·보통·여유) */
  pad: [number, number, number];
  /** 제목 정렬(아이브로·제목 줄) */
  titleAlign: "left" | "center";
  eyebrow: "enlabel" | "number" | "pill";
  frames: FrameKind[];
  dividers: DividerKindAny[];
  number: NumberStyle;
  marker: MarkerKind;
  decor: DecorKind;
  /** 같은 아키타입 안에서 섹션마다 번갈아 쓰는 보조 장식(문자열 해시로 결정적) */
  decorAlt: DecorKind[];
  badge: BadgeShape;
  density: "tight" | "normal" | "airy";
  /** 계열별 선호 변형(앞이 우선) — 스토리보드가 변형 순서 맨 앞으로 끌어온다 */
  prefer: Partial<Record<"benefits" | "concern" | "story" | "spec" | "phototext" | "steps" | "faq" | "proof" | "touch", string[]>>;
};

export const ARCHETYPES: Record<ArchetypeId, ArchetypeTokens> = {
  editorial: {
    id: "editorial", radius: 0, pill: 2, border: { w: 1, style: "solid", alphaMul: 1.6 }, shadow: { kind: "none", offset: 0 }, paper: "#FAF7F1", face: "lightOnly",
    pad: [40, 64, 88], titleAlign: "left", eyebrow: "number", frames: ["rect", "double"], dividers: ["thin2", "double", "fade"], number: "roman", marker: "dash", decor: "rule-top", decorAlt: ["bracket","plus-field"], badge: "seal", density: "airy",
    prefer: { benefits: ["stackbig", "linelist", "iconlist"], story: ["chapter", "editorial", "letter"], spec: ["panel", "line", "cards"], phototext: ["dframe", "offset", "stack"], steps: ["vtimeline", "bignum"], concern: ["memo", "checkrows"], faq: ["numlist", "qband"], proof: ["lead", "wall"], touch: ["ledger", "band"] },
  },
  catalog: {
    id: "catalog", radius: 0.6, pill: 6, border: { w: 2, style: "solid", alphaMul: 2.2 }, shadow: { kind: "none", offset: 0 }, paper: "#F3F2EE", face: "tintAlt",
    pad: [28, 40, 56], titleAlign: "left", eyebrow: "number", frames: ["rect"], dividers: ["stripe", "slant"], number: "box", marker: "square", decor: "bracket", decorAlt: ["plus-field","dots-grid"], badge: "hex", density: "tight",
    prefer: { benefits: ["rows2", "numcards", "linelist"], concern: ["memo", "tiles2"], story: ["chapter", "editorial"], spec: ["panel", "tags", "grid"], phototext: ["stack", "caption"], steps: ["bignum", "vtimeline"], faq: ["twocol", "tabs"], proof: ["wall", "badges"], touch: ["ticket", "band"] },
  },
  softlife: {
    id: "softlife", radius: 1.6, pill: "keep", border: { w: 1, style: "solid", alphaMul: 0.8 }, shadow: { kind: "warm", offset: 0 }, paper: "#FFFBF6", face: "tintAlt",
    pad: [40, 56, 72], titleAlign: "center", eyebrow: "pill", frames: ["arch", "round"], dividers: ["wave2", "fade", "dotwave"], number: "circle", marker: "dot", decor: "glow", decorAlt: ["arc","squiggle"], badge: "circle", density: "normal",
    prefer: { benefits: ["iconlist", "rows2", "zigzag"], concern: ["bubbles", "deck"], story: ["letter", "quote"], spec: ["tags", "cards"], phototext: ["arch", "polaroid", "overlap"], steps: ["chipflow", "vtimeline"], faq: ["chat", "qband"], proof: ["seal", "lead"], touch: ["band", "ticket"] },
  },
  impact: {
    id: "impact", radius: 0.5, pill: 6, border: { w: 3, style: "solid", alphaMul: 5 }, shadow: { kind: "hard", offset: 4 }, paper: "#FFFFFF", face: "blockAlt",
    pad: [32, 48, 64], titleAlign: "left", eyebrow: "number", frames: ["offset", "rect"], dividers: ["slant", "zigzag", "stripe"], number: "big", marker: "arrow", decor: "bar-left", decorAlt: ["dots-grid","plus-field"], badge: "hex", density: "tight",
    prefer: { benefits: ["stackbig", "bento"], concern: ["deck", "stack"], story: ["pullband", "chapter"], spec: ["big3", "strip", "cards"], phototext: ["stack", "offset", "collage"], steps: ["bignum", "vtimeline"], faq: ["tabs", "qband"], proof: ["wall", "badges"], touch: ["ticket", "band"] },
  },
  techsheet: {
    id: "techsheet", radius: 0, pill: 0, border: { w: 1, style: "dashed", alphaMul: 2.4 }, shadow: { kind: "none", offset: 0 }, paper: "#EEF3F8", face: "lightOnly",
    pad: [28, 40, 52], titleAlign: "left", eyebrow: "enlabel", frames: ["rect", "double"], dividers: ["stitch", "dotted"], number: "box", marker: "square", decor: "corner-ticks", decorAlt: ["bracket","dots-grid"], badge: "hex", density: "tight",
    prefer: { spec: ["panel", "big3", "strip"], benefits: ["rows2", "iconlist", "numcards"], concern: ["memo", "checkrows"], story: ["chapter", "linetime"], phototext: ["dframe", "caption"], steps: ["vtimeline", "bignum"], faq: ["twocol", "numlist"], proof: ["badges", "wall"], touch: ["ledger", "band"] },
  },
  narrative: {
    id: "narrative", radius: 1, pill: "keep", border: { w: 1, style: "solid", alphaMul: 1 }, shadow: { kind: "soft", offset: 0 }, paper: "#FDFBF8", face: "tintAlt",
    pad: [48, 72, 96], titleAlign: "left", eyebrow: "number", frames: ["rect", "round"], dividers: ["dotwave", "fade", "wave"], number: "big", marker: "dot", decor: "spine", decorAlt: ["squiggle","arc"], badge: "circle", density: "airy",
    prefer: { story: ["letter", "chapter", "linetime"], benefits: ["stackbig", "iconlist", "zigzag"], concern: ["deck", "stack"], spec: ["line", "tags"], phototext: ["stack", "overlap"], steps: ["vtimeline", "chipflow"], faq: ["numlist", "chat"], proof: ["lead", "seal"], touch: ["band", "ledger"] },
  },
  luxe: {
    id: "luxe", radius: 0.1, pill: 2, border: { w: 1, style: "solid", alphaMul: 0.7 }, shadow: { kind: "none", offset: 0 }, paper: "#FBFAF6", face: "lightOnly",
    pad: [56, 80, 104], titleAlign: "center", eyebrow: "enlabel", frames: ["rect", "double"], dividers: ["thin2", "dotted"], number: "roman", marker: "dash", decor: "hair-center", decorAlt: ["arc","ring"], badge: "seal", density: "airy",
    prefer: { story: ["quote", "letter", "pullband"], benefits: ["linelist", "iconlist"], concern: ["tiles2", "memo"], spec: ["tags", "line", "cards"], phototext: ["dframe", "arch", "caption"], steps: ["vtimeline", "chipflow"], faq: ["numlist", "qband"], proof: ["lead", "seal"], touch: ["ledger", "band"] },
  },
  pop: {
    id: "pop", radius: 1.8, pill: "keep", border: { w: 2, style: "solid", alphaMul: 4 }, shadow: { kind: "hard", offset: 3 }, paper: "#FFFDF4", face: "colorCollide",
    pad: [32, 44, 60], titleAlign: "center", eyebrow: "pill", frames: ["tape", "round", "offset"], dividers: ["zigzag", "tape", "wave2"], number: "circle", marker: "arrow", decor: "sticker", decorAlt: ["squiggle","ring","dots-grid"], badge: "ribbon", density: "normal",
    prefer: { benefits: ["bento", "rows2", "zigzag"], concern: ["bubbles", "deck"], story: ["quote", "pullband"], spec: ["big3", "cards", "grid"], phototext: ["polaroid", "collage", "offset"], steps: ["bignum", "chipflow"], faq: ["chat", "twocol"], proof: ["badges", "wall"], touch: ["ticket", "band"] },
  },
};

// ── 선택 ─────────────────────────────────────────────────────────────────────
/** 카테고리 적합도(앞이 우선). 말뭉치에 없는 카테고리는 리빙 취급 */
export const CATEGORY_FIT: Record<string, ArchetypeId[]> = {
  "화장품/뷰티": ["softlife", "luxe", "editorial", "narrative"],
  "패션/의류": ["editorial", "luxe", "impact", "narrative"],
  "식품": ["softlife", "pop", "narrative", "catalog"],
  "전자/가전": ["techsheet", "catalog", "impact", "luxe"],
  "생활/리빙": ["softlife", "narrative", "catalog", "editorial"],
  "반려동물": ["pop", "softlife", "narrative", "catalog"],
};
/** mood → 보너스 후보(기존 436차 mood 6종과 겹치는 성격) */
const MOOD_FIT: Record<string, ArchetypeId[]> = {
  "minimal-luxe": ["luxe", "editorial"],
  clinic: ["techsheet", "catalog"],
  natural: ["softlife", "narrative"],
  playful: ["pop", "softlife"],
  street: ["impact", "pop"],
  warm: ["softlife", "narrative"],
};

function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** 강제 선택(환경변수/테스트). 값이 없으면 자동. NEXT_PUBLIC_*는 빌드 때 들어가므로 리터럴로 읽는다 */
let forced: ArchetypeId | null = null;
export function setV5ArchetypeForTests(id: ArchetypeId | null): void {
  forced = id;
}
const envForced = (): ArchetypeId | null => {
  const v = process.env.NEXT_PUBLIC_V5_ARCHETYPE;
  return v && (ARCHETYPE_IDS as readonly string[]).includes(v) ? (v as ArchetypeId) : null;
};

export type ArchetypeCtx = { category?: string; mood?: string | null; seedKey: string };

/** 카테고리 순위 + mood 보너스로 점수를 매겨 상위 3개 중 시드로 하나. 같은 상품 = 항상 같은 결과 */
export function pickArchetype(ctx: ArchetypeCtx): ArchetypeId {
  const fit = CATEGORY_FIT[ctx.category ?? ""] ?? CATEGORY_FIT["생활/리빙"]!;
  const bonus = new Set(MOOD_FIT[ctx.mood ?? ""] ?? []);
  const score = new Map<ArchetypeId, number>();
  fit.forEach((id, i) => score.set(id, 10 - i * 2));
  for (const id of bonus) score.set(id, (score.get(id) ?? 0) + 5);
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1] || ARCHETYPE_IDS.indexOf(a[0]) - ARCHETYPE_IDS.indexOf(b[0])).map(([id]) => id);
  const top = ranked.slice(0, 3);
  return top[seedOf(`${ctx.seedKey}|v5`) % top.length]!;
}

/** 토큰 단일 소스. V5가 꺼져 있거나 편집 모드면 null(호출한 쪽은 아무것도 하지 않는다) */
export function getArchetypeTokens(ctx: ArchetypeCtx & { editing?: boolean }): ArchetypeTokens | null {
  if (!designV5On() || ctx.editing) return null;
  return ARCHETYPES[forced ?? envForced() ?? pickArchetype(ctx)];
}

// ── 마크업 후처리(임팩트·v4 블록) ───────────────────────────────────────────────
export type ArchetypeColors = { ink: string; accent: string; deep: string };

const rgbOf = (hex: string): string => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};
const rgba = (hex: string, a: number): string => `rgba(${rgbOf(hex)},${a})`;

/** 장식(선·점·SVG만, 글자 없음). 섹션 안쪽 여백 영역에만 놓여 글과 겹치지 않는다 */
export function decorHtml(kind: DecorKind, c: ArchetypeColors): string {
  const base = `aria-hidden="true" data-pz-ax-decor="${kind}"`;
  switch (kind) {
    case "rule-top": return `<span ${base} style="position:absolute;left:24px;right:24px;top:0;height:1px;background:${rgba(c.ink, 0.4)};pointer-events:none"></span>`;
    case "hair-center": return `<span ${base} style="position:absolute;left:50%;top:18px;width:40px;height:1px;margin-left:-20px;background:${rgba(c.ink, 0.4)};pointer-events:none"></span>`;
    case "bar-left": return `<span ${base} style="position:absolute;left:0;top:28px;bottom:28px;width:6px;background:${c.accent};pointer-events:none"></span>`;
    case "spine": return `<span ${base} style="position:absolute;left:10px;top:24px;bottom:24px;width:2px;background:${rgba(c.accent, 0.35)};pointer-events:none"></span><span ${base} style="position:absolute;left:6px;top:20px;width:10px;height:10px;border-radius:50%;background:${c.accent};pointer-events:none"></span>`;
    case "corner-ticks": {
      const t = (pos: string, b: string) => `<span ${base} style="position:absolute;${pos};width:12px;height:12px;${b};pointer-events:none"></span>`;
      const line = `1px solid ${rgba(c.ink, 0.45)}`;
      return t("left:8px;top:8px", `border-left:${line};border-top:${line}`) + t("right:8px;top:8px", `border-right:${line};border-top:${line}`);
    }
    case "sticker": return `<span ${base} style="position:absolute;right:10px;top:8px;width:34px;height:34px;border-radius:50%;background:${c.accent};transform:rotate(-12deg);border:2px solid ${c.ink};box-sizing:border-box;pointer-events:none"></span>`;
    case "glow": return `<span ${base} style="position:absolute;right:0;top:0;width:140px;height:140px;background:radial-gradient(circle at 70% 30%,${rgba(c.accent, 0.16)},transparent 70%);pointer-events:none"></span>`;
    // ── 465차 V5 추가 6종: 섹션 위쪽 안쪽 모서리(여백 안, 높이 ≤ 28px)
    case "dots-grid": {
      let d = "";
      for (let r = 0; r < 3; r += 1) for (let k = 0; k < 5; k += 1) d += `<circle cx="${6 + k * 12}" cy="${5 + r * 8}" r="1.6" fill="${rgba(c.ink, 0.4)}"/>`;
      return `<span ${base} style="position:absolute;right:16px;top:4px;width:64px;height:26px;pointer-events:none"><svg viewBox="0 0 64 26" width="64" height="26" aria-hidden="true" style="display:block">${d}</svg></span>`;
    }
    case "arc": return `<span ${base} style="position:absolute;left:0;top:0;width:44px;height:22px;pointer-events:none"><svg viewBox="0 0 44 22" width="44" height="22" aria-hidden="true" style="display:block"><path d="M0 22 A22 22 0 0 1 44 22" fill="none" stroke="${rgba(c.accent, 0.55)}" stroke-width="2"/></svg></span>`;
    case "squiggle": return `<span ${base} style="position:absolute;left:20px;top:8px;width:72px;height:14px;pointer-events:none"><svg viewBox="0 0 72 14" width="72" height="14" aria-hidden="true" style="display:block"><path d="M2 7 Q11 0 20 7 T38 7 T56 7 T70 7" fill="none" stroke="${rgba(c.accent, 0.6)}" stroke-width="2" stroke-linecap="round"/></svg></span>`;
    case "plus-field": {
      const plus = (x: number, y: number) => `<path d="M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}" stroke="${rgba(c.ink, 0.45)}" stroke-width="1.5" stroke-linecap="round"/>`;
      return `<span ${base} style="position:absolute;right:20px;top:6px;width:60px;height:22px;pointer-events:none"><svg viewBox="0 0 60 22" width="60" height="22" aria-hidden="true" style="display:block">${plus(8, 8)}${plus(30, 14)}${plus(52, 6)}</svg></span>`;
    }
    case "bracket": {
      const line = `1px solid ${rgba(c.ink, 0.45)}`;
      return `<span ${base} style="position:absolute;left:8px;bottom:8px;width:12px;height:12px;border-left:${line};border-bottom:${line};pointer-events:none"></span><span ${base} style="position:absolute;right:8px;bottom:8px;width:12px;height:12px;border-right:${line};border-bottom:${line};pointer-events:none"></span>`;
    }
    case "ring": return `<span ${base} style="position:absolute;right:14px;top:4px;width:30px;height:30px;pointer-events:none"><svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true" style="display:block"><circle cx="15" cy="15" r="13" fill="none" stroke="${rgba(c.accent, 0.5)}" stroke-width="1.5"/><circle cx="15" cy="15" r="7" fill="none" stroke="${rgba(c.accent, 0.5)}" stroke-width="1.5"/></svg></span>`;
    default: return "";
  }
}

/** 문자열 해시(결정적) — 보조 장식을 섹션마다 번갈아 고르는 데만 쓴다 */
const hash32 = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
};

const hexTier = (n: number, pad: [number, number, number]): number => (n <= 40 ? pad[0] : n <= 56 ? pad[1] : pad[2]);

/**
 * 임팩트·v4 블록 마크업 후처리(문자열). 순서: 반경 → 테두리 → 그림자 → 종이색 → 여백 → 제목 정렬 → 장식.
 * 모두 정규식이며 글자(텍스트 노드)는 건드리지 않는다. 이미 처리한 마크업(`data-pz-ax-done`)은 다시 처리하지 않는다.
 */
export function applyArchetypeHtml(html: string, t: ArchetypeTokens, c: ArchetypeColors): string {
  if (!html || html.includes("data-pz-ax-done")) return html;
  let out = html;
  // 1) 반경: 100px 이상은 알약, % 는 원(그대로)
  out = out.replace(/border-radius:([^;"]+)/g, (_m, v: string) => {
    if (v.includes("%")) return `border-radius:${v}`;
    return `border-radius:${v.replace(/(\d+(?:\.\d+)?)px/g, (mm, n: string) => {
      const x = Number(n);
      if (x === 0) return mm;
      if (x >= 100) return t.pill === "keep" ? mm : `${t.pill}px`;
      return `${Math.max(0, Math.round(x * t.radius))}px`;
    })}`;
  });
  // 2) 테두리: `border:1px solid <색>` (카드 테두리) — 굵기·선 종류·진하기
  if (t.border.w !== 1 || t.border.style !== "solid" || t.border.alphaMul !== 1) {
    out = out.replace(/border:1px solid (rgba\([^)]*\)|#[0-9a-fA-F]{3,8})/g, (_m, col: string) => {
      const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(col);
      const color = m ? `rgba(${m[1]},${m[2]},${m[3]},${Math.min(1, Number(m[4]) * t.border.alphaMul).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})` : col;
      return `border:${t.border.w}px ${t.border.style} ${color}`;
    });
  }
  // 3) 그림자: 안쪽(inset)·진한(알파 ≥0.3) 의도된 값은 그대로
  if (t.shadow.kind !== "soft") {
    out = out.replace(/box-shadow:([^;"]+)/g, (m, v: string) => {
      if (/inset/.test(v)) return m;
      const alphas = [...v.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((x) => Number(x[1]));
      if (alphas.length === 0 || alphas.some((a) => a >= 0.3)) return m;
      if (t.shadow.kind === "none") return "box-shadow:none";
      if (t.shadow.kind === "hard") return `box-shadow:${t.shadow.offset}px ${t.shadow.offset}px 0 ${c.ink}`;
      return `box-shadow:0 10px 28px ${rgba(c.accent, 0.2)}`; // warm
    });
  }
  // 4) 종이색
  if (t.paper.toUpperCase() !== "#FFFFFF") out = out.replace(/background:#FFFFFF\b/gi, `background:${t.paper}`);
  // 5) 루트 위아래 여백(32/48/64 → 아키타입 3단). 0은 그대로
  out = out.replace(/^(\s*<section[^>]*?style="[^"]*?padding:)(\d+)px(?: (\d+)px)?(?: (\d+)px)?(?: (\d+)px)?/, (_m, pre: string, a: string, b?: string, cc?: string, d?: string) => {
    const sc = (v: string) => (Number(v) === 0 ? "0px" : `${hexTier(Number(v), t.pad)}px`);
    return `${pre}${sc(a)}${b ? ` ${b}px` : ""}${cc ? ` ${sc(cc)}` : ""}${d ? ` ${d}px` : ""}`;
  });
  // 6) 제목 정렬(아이브로·제목 줄만)
  if (t.titleAlign === "center") {
    out = out.replace(/<p data-pz-eyebrow style="/g, `<p data-pz-eyebrow style="text-align:center;justify-content:center;`).replace(/<p data-pz-title style="/g, `<p data-pz-title style="text-align:center;`);
  }
  // 7) 장식(루트 position:relative 보장 후 닫는 태그 앞에)
  // 주 장식 + 보조 장식 목록에서 섹션 마크업 해시로 하나(같은 섹션 = 항상 같은 장식). 보조가 없으면 주 장식
  const kinds: DecorKind[] = [t.decor, ...t.decorAlt];
  const deco = decorHtml(kinds[hash32(html) % kinds.length]!, c);
  if (deco) {
    out = out.replace(/^(\s*<section[^>]*?style=")([^"]*)"/, (_m, pre: string, st: string) => `${pre}${/position:/.test(st) ? st : `position:relative;${st}`}"`);
    const end = out.lastIndexOf("</section>");
    if (end > 0) out = `${out.slice(0, end)}${deco}${out.slice(end)}`;
  }
  return out.replace(/^(\s*<section)/, `$1 data-pz-ax-done="${t.id}"`);
}

// ── 일반 섹션 래퍼 CSS ──────────────────────────────────────────────────────────
/** 박자.강도 표식(`data-pz-ax`)이 붙은 일반 섹션의 위아래 여백 단계 — 강도 4·5는 여유, 3은 보통, 1·2는 조밀 */
export const AX_STRENGTHS = [1, 2, 3, 4, 5] as const;
const padForStrength = (t: ArchetypeTokens, s: number): number => (s >= 4 ? t.pad[2] : s === 3 ? t.pad[1] : t.pad[0]);

/**
 * 일반 섹션(두 벌 마크업)을 건드리지 않고 래퍼 표식만으로: 위아래 여백 척도 + 위쪽 가는 선(선 있는 성격만).
 * `mode`: export는 `section[data-pz-ax]`, 라이브는 래퍼 `div[data-pz-ax] > section`. 이미 topPads/bottomPads가 정한 쪽(`data-pz-top/bot`)은 건드리지 않는다.
 */
export function archetypeCssV5(scope: string, mode: "live" | "export", t: ArchetypeTokens, ink: string): string {
  const sel = (s: number, extra = ""): string => (mode === "export" ? `${scope} section[data-pz-ax$=".${s}"]${extra}` : `${scope} [data-pz-ax$=".${s}"]${extra} > section`);
  const rules: string[] = [];
  for (const s of AX_STRENGTHS) {
    const p = padForStrength(t, s);
    rules.push(`${sel(s, ":not([data-pz-top])")}{padding-top:${p}px!important}`);
    rules.push(`${sel(s, ":not([data-pz-bot])")}{padding-bottom:${p}px!important}`);
  }
  if (t.decor === "rule-top" || t.decor === "hair-center" || t.decor === "corner-ticks") {
    const line = `border-top:1px solid ${rgba(ink, 0.3)}`;
    for (const s of AX_STRENGTHS) rules.push(`${sel(s)}{${line}}`);
  }
  return rules.join("");
}
