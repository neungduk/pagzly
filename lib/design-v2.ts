/**
 * 428차 — 디자인 V2(벤치마크 423차 §④⑤ 상위 개선). 모두 한 플래그로 감싼다: NEXT_PUBLIC_DESIGN_V2=off 로 서버를 시작하면 427차 결과와 같은 화면·HTML이 나온다.
 * 대상 카테고리는 뷰티·패션뿐이고(그 밖은 출력 불변), 라이브(DetailSectionRenderer)와 export(buildDetailPageHtml)가 같은 함수·같은 CSS 한 벌을 쓴다.
 * export에 쓰지 않던 CSS 기법(:has·컨테이너 쿼리·text-wrap)은 쓰지 않는다 — 속성 선택자·linear-gradient만.
 *
 * 이 파일의 내용
 *  2-1 타이포 밀도: 큰 제목 크기·굵기 상한(제목 스케일 변수 덮어쓰기 + 인포 구간 큰 글자 축소) — 화면당 큰 글줄 수를 줄인다.
 *  2-2 배경 띠 전환 상한: 하드 색 면(진한/포인트색 채움) 반전을 페이지당 6회 이내로 두고, 나머지 인포 구간은 연한 틴트 그라데이션으로 바꾼다.
 *  2-4 가격·혜택 스트립: 히어로 직후 한 줄(lib/price-strip) — CSS는 여기, 마크업은 라이브·export 공통 함수.
 *  2-3 강조 연출: 라벨 칩(STEP·포인트 번호)·형광펜 마커(핵심 구절 아래 40%)·큰 수치 배지 — 새 문구 없이 기존 라벨·본문 구절·입력 수치에만 스타일을 입힌다.
 */
import type { InfoColors, InfoLevel } from "@/lib/info-style";
import type { InfoBackdropMap, InfoZone } from "@/lib/info-backdrop";
import { infoZonesOfSections } from "@/lib/info-backdrop";
import { V3_COLOR_TINT, hexToRgba, mixHex, type TitleScaleOverrides } from "@/lib/design-tokens";
import { DESIGN_V4_ENABLED } from "@/lib/design-v4";
import { TYPE_V4 } from "@/lib/design-tokens-v4";
import { stripCss } from "@/lib/price-strip";
import { heroStageCss } from "@/lib/hero-variants";

/** 기본 켬. 끄려면 NEXT_PUBLIC_DESIGN_V2=off 로 서버를 시작한다(427차와 같은 화면 — 전/후 캡처·되돌리기용) */
export const DESIGN_V2_ENABLED = process.env.NEXT_PUBLIC_DESIGN_V2 !== "off";

export const V2_CATEGORIES = ["화장품/뷰티", "의류/패션"] as const;

/** enabled는 테스트가 flag off를 흉내 낼 때만 넘긴다 */
export const designV2On = (category: string | undefined | null, enabled: boolean = DESIGN_V2_ENABLED): boolean =>
  enabled && !!category && (V2_CATEGORIES as readonly string[]).includes(category);

/** 인포(bold/dramatic) 구간이 있는 레이아웃에서만 타이포 밀도 규칙을 건다 */
export const designV2Typo = (category: string | undefined | null, info: InfoLevel | undefined, enabled: boolean = DESIGN_V2_ENABLED): boolean =>
  designV2On(category, enabled) && !!info && info !== "calm";

// ── 2-1 타이포 밀도 ──────────────────────────────────────────────────────────

/**
 * 구간 제목 크기 상한: base(칸 폭 640 미만) 2rem → 1.75rem(28px), wide 2.75rem → 2.25rem. 히어로·배너·가격 크기는 그대로.
 * 423차 지표: 큰 글줄/화면 뷰티 1.9~2.1(레퍼런스 중앙 0.9). 390px에서 32px 제목은 거의 매 화면에 한 줄씩 들어와 있었다.
 */
export const V2_TITLE_SCALE: TitleScaleOverrides = {
  section: { base: "1.75rem", wide: "2.25rem" },
  statNumber: { base: "2.5rem", wide: "3.25rem" },
};

const remOf = (v: string | undefined): number => (v && v.endsWith("rem") ? parseFloat(v) : NaN);

/** 팩이 이미 구간 제목을 더 작게 잡았으면 그 값을 존중하고, 더 크면 상한으로 줄인다 */
export function v2TitleOverrides(base: TitleScaleOverrides, only?: Array<keyof typeof V2_TITLE_SCALE>): TitleScaleOverrides {
  const out: TitleScaleOverrides = { ...base };
  for (const key of (only ?? (Object.keys(V2_TITLE_SCALE) as Array<keyof typeof V2_TITLE_SCALE>))) {
    const cap = V2_TITLE_SCALE[key]!;
    const cur = base[key];
    const b = remOf(cur?.base), w = remOf(cur?.wide);
    out[key] = {
      base: Number.isFinite(b) && b < remOf(cap.base) ? cur!.base : cap.base,
      wide: Number.isFinite(w) && w < remOf(cap.wide) ? cur!.wide : cap.wide,
    };
  }
  return out;
}

/** 인포 구간의 큰 글자 크기 목표(px) — 회귀가 같은 값을 본다 */
export const V2_TYPE = {
  stepNumeral: 40,
  pointTitle: 24,
  statValue: 36,
  statTopValue: 48,
  buyPrice: 44,
} as const;

/**
 * 429차 — 패션 클래식(info calm)에도 구간 제목 크기 상한(28px)만 적용한다(굵기·막대 수치·그 밖의 요소는 기존 그대로).
 * 428차: 411 큰 글줄/화면 2.2가 그대로였던 곳. 팩(모노·에디토리얼)·뷰티·비대상은 해당 없음(팩은 428차 규칙 또는 팩 자체 값).
 */
export const designV2ClassicFashionCap = (category: string | undefined | null, classicPack: boolean, info: InfoLevel | undefined, enabled: boolean = DESIGN_V2_ENABLED): boolean =>
  designV2On(category, enabled) && category === "의류/패션" && classicPack && (!info || info === "calm");

// ── 2-2 배경 띠 전환 상한 ────────────────────────────────────────────────────

/** 하드 색 면 반전 상한(페이지당). 진한/포인트색 채움 한 덩어리 = 들어갈 때·나올 때 2회 */
export const V2_MAX_HARD_FLIPS = 6;

type SectionLike = { type: string; slot?: string; presentationStyle?: string };

export type BandPlan = {
  /** 색 면을 그대로 두는 구간(진한/포인트색 또는 AI 배경 이미지) */
  hard: InfoZone[];
  /** 연한 틴트 그라데이션으로 바꾸는 구간(밝은 면이라 반전이 아닌 구간 포함) */
  tinted: InfoZone[];
  /** dramatic에서 하드 면 예산을 넘겨 bold 표현으로 낮추는 구간 */
  demoted: InfoZone[];
  /** 페이지 전체 하드 반전 횟수(구매 카드 포함) */
  flips: number;
};

/**
 * 구간별로 "하드 면"인지 정한다. 하드 후보: points(진한 색, bold·dramatic), stat·statnum(dramatic만 진한/포인트색), 구매 카드(맨 끝, 항상 포인트색 — 뷰티 전용),
 * 그리고 AI 배경 이미지가 있는 구간(이미지가 있는 구간은 반전 횟수에 포함하되 우선 유지, 417차).
 * 우선순위: AI 배경 구간 → 구매 카드 → points → stat → statnum. 예산(6회)을 넘는 후보는 dramatic이면 bold 표현으로 낮추고 틴트로 바꾼다.
 */
export function planBands(sections: ReadonlyArray<SectionLike>, level: InfoLevel | undefined, backdrops: InfoBackdropMap | undefined, opts: { buyCard: boolean }): BandPlan {
  if (!level || level === "calm") return { hard: [], tinted: [], demoted: [], flips: 0 };
  const dr = level === "dramatic";
  const zones = infoZonesOfSections(sections);
  const hasBackdrop = (z: InfoZone) => !!backdrops?.[z];
  const candidates: InfoZone[] = [];
  const add = (z: InfoZone) => { if (zones.includes(z) && !candidates.includes(z)) candidates.push(z); };
  for (const z of zones) if (hasBackdrop(z)) add(z);
  add("points");
  if (dr) add("stat");
  const hard: InfoZone[] = [];
  const demoted: InfoZone[] = [];
  // 구매 카드는 맨 끝이라 들어갈 때 1회만 센다
  let flips = opts.buyCard ? 1 : 0;
  for (const z of candidates) {
    if (flips + 2 <= V2_MAX_HARD_FLIPS || hasBackdrop(z)) { hard.push(z); flips += 2; }
    else if (z === "stat") demoted.push(z);
  }
  // statnum(dramatic 포인트색 면)은 stat과 같이 움직인다: stat이 하드가 아니면 statnum도 bold 표현
  if (dr && zones.includes("stat") && !hard.includes("stat")) demoted.push("stat");
  const tinted = zones.filter((z) => !hard.includes(z) && z !== "compare");
  return { hard, tinted, demoted: [...new Set(demoted)], flips };
}

/** 틴트 면 색 — 포인트 연한 색을 흰색과 섞어 밝기 L>205(밝은 면)로 둔다. 글자(잉크·진한 색) 대비는 더 좋아진다 */
export function v2Tint(c: InfoColors, strength = 0.5): string {
  return mixHex("#FFFFFF", c.soft, strength);
}

const IMP = "!important";
const rule = (sel: string, decl: string) => `${sel}{${decl.split(";").filter(Boolean).map((d) => `${d}${IMP}`).join(";")}}`;

/** 연한 틴트 그라데이션: 위는 흰색(앞 섹션과 부드럽게 이어짐), 아래는 틴트 */
const tintGradient = (c: InfoColors, strength = 0.5) => `linear-gradient(180deg,#FFFFFF 0%,${v2Tint(c, strength)} 100%)`;

/** #RRGGBB → "r,g,b" */
const rgbOf = (hex: string): string => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/** 형광펜 마커 상수: 본문 핵심 구절(생성 카피의 emphasis·수치 구절, lib/body-emphasis)의 아래쪽 48%를 포인트색 36%로 */
export const V2_MARKER = { fromPct: 52, alpha: 0.36 } as const;

/**
 * 2-3 강조 연출(CSS만, 새 문구·새 요소 없음).
 *  ① 라벨 칩 — 사용 단계의 "STEP 01" 라벨(기존 문구)을 포인트색 알약으로(단계 수 = 페이지당 최대 칩 수, 3~4개). POINT 알약은 이미 채움 알약이라 그대로.
 *  ② 형광펜 마커 — 기존 emphasis 구절(섹션당 1개)의 마커를 더 진하고 두껍게. 인라인 style의 linear-gradient(transparent 60%…)를 속성 선택자로 덮는다(라이브·export 같은 값).
 *  ③ 큰 수치 배지 — 숫자 칸(사이즈 종수·용량 등 입력 수치가 들어간 statnum 구간)의 숫자를 포인트색 알약 배지로. 숫자는 424차 숫자 게이트를 통과한 값만 화면에 있다.
 */
export function emphasisCss(S: string, c: InfoColors, info: boolean): string {
  const out: string[] = [];
  if (V3_COLOR_TINT) {
    // 430차: 마커 색은 섹션 슬롯 색(인라인)이므로 건드리지 않고, 마커 띠만 40% → 50%로 키운다(그라데이션을 125%로 늘려 아래에 맞춤)
    out.push(rule(`${S} strong[style*="linear-gradient(transparent 60%"]`, `background-size:100% 125%;background-position:0 100%;background-repeat:no-repeat;border-radius:2px`));
  } else {
    out.push(rule(`${S} strong[style*="linear-gradient(transparent 60%"]`, `background-image:linear-gradient(transparent ${V2_MARKER.fromPct}%,rgba(${rgbOf(c.accent)},${V2_MARKER.alpha}) ${V2_MARKER.fromPct}%);border-radius:2px`));
  }
  if (info) {
    const st = `${S} [data-info="steps"] ol>li>div:last-child>p`;
    out.push(rule(st, `display:inline-block;margin:0 0 8px;padding:4px 12px;border-radius:999px;background:${c.accent};color:${c.paper};font-size:12px;font-weight:700;letter-spacing:0.14em`));
    const sn = `${S} [data-info="statnum"]>div>div>:first-child`;
    out.push(rule(sn, `display:inline-block;padding:6px 18px;border-radius:999px;background:${c.accent};color:${c.paper}`));
    out.push(rule(`${sn},${sn} *`, `color:${c.paper}`));
  }
  return out.join("");
}

export type V2CssOpts = {
  scope: string;
  colors: InfoColors;
  level: InfoLevel | undefined;
  category: string | undefined | null;
  /** 구매 카드가 포인트색 채움인가(뷰티 인포 강화) */
  beautyInfo: boolean;
  sections: ReadonlyArray<SectionLike>;
  backdrops?: InfoBackdropMap;
  enabled?: boolean;
};

/** V2 CSS 한 벌(라이브 `<style>`·export `<style>` 공용). 대상이 아니거나 flag off면 빈 문자열 */
export function designV2Css(o: V2CssOpts): string {
  if (!designV2On(o.category, o.enabled)) return "";
  const { scope: S, colors: c } = o;
  const out: string[] = [];
  const info = o.level && o.level !== "calm";

  if (designV2Typo(o.category, o.level, o.enabled)) {
    const dr = o.level === "dramatic";
    const sec = (k: string) => `${S} [data-info="${k}"]`;
    // 사용 단계 숫자·포인트 카드 제목·혼방 막대 수치는 굵기 900 → 700~800, 크기 한 단계 아래
    out.push(rule(`${sec("steps")} ol>li>div:first-child>span,${sec("steps")} ol>li>span:first-child`, `font-size:${V2_TYPE.stepNumeral}px;font-weight:700`));
    out.push(rule(`${sec("points")} [data-ip="pgrid"]>div>p:first-of-type`, `font-size:${V2_TYPE.pointTitle}px;font-weight:${DESIGN_V4_ENABLED ? TYPE_V4["heading-mid"].w : 700};line-height:1.25`)); // 442차 — v4는 제목 위계 '중' 800(R16 잔여 24px/700), 라이브·export 공용 CSS
    out.push(rule(`${sec("stat")} [data-ip="bars"]>div>div:first-child>span:last-child>*`, `font-size:${V2_TYPE.statValue}px;font-weight:800`));
    out.push(rule(`${sec("stat")} [data-ip="bars"]>div[data-top]>div:first-child>span:last-child>*`, `font-size:${V2_TYPE.statTopValue}px`));
    // 구간 제목 굵기: 인포 구간 안 제목은 700 이하(serif 600)로 — 굵은 제목이 줄마다 올라오는 느낌을 낮춘다
    out.push(rule(`${S} .pagzly-display-headline`, `font-weight:${o.beautyInfo ? 600 : 700}`));
    if (o.beautyInfo) out.push(rule(`${S} [data-info="buy"] [data-ip="price"]`, `font-size:${V2_TYPE.buyPrice}px;font-weight:800`));
    void dr;
  }

  if (info) {
    const plan = planBands(o.sections, o.level, o.backdrops, { buyCard: o.beautyInfo });
    const sec = (k: string) => `${S} [data-info="${k}"]`;
    const tint = tintGradient(c);
    // AI 배경 이미지가 있는 구간은 건드리지 않는다(이미지 우선 유지)
    const free = (z: InfoZone) => !o.backdrops?.[z];
    if (plan.tinted.includes("steps") && free("steps")) out.push(rule(sec("steps"), `background:${tint}`));
    if (plan.tinted.includes("care") && free("care")) out.push(rule(sec("care"), `background:${tint}`));
    if (plan.tinted.includes("stat") && free("stat")) {
      out.push(rule(sec("stat"), `background:${tint}`));
      out.push(rule(sec("statnum"), `background:${tint}`));
    } else if (free("stat")) {
      out.push(rule(sec("statnum"), `background:${tint}`));
    }
    // 뷰티: 퀵포인트(옅은 포인트색 면)와 히어로 캡션 띠도 같은 틴트로 — 밝은 면이 띠마다 달라 보이던 것을 줄인다
    if (o.beautyInfo) {
      // 445차 4 — v4: 퀵포인트 줄은 섹션마다 흰색에서 시작하는 그라데이션이라 줄 경계에서 흰 띠가 보였다(앞 줄은 틴트로 끝나고 뒤 줄은 흰색으로 다시 시작). 줄 전체를 같은 단색 틴트로
      out.push(rule(sec("quick"), `background:${DESIGN_V4_ENABLED ? v2Tint(c, 0.6) : tintGradient(c, 0.6)}`));
      out.push(rule(`${S} [data-hero-caption]`, `background:${tintGradient(c, 0.6)}`));
    }
  }
  out.push(emphasisCss(S, c, Boolean(info)));
  // 2-4 가격·혜택 스트립 CSS(마크업은 라이브·export가 lib/price-strip으로 같이 만든다)
  out.push(stripCss(S, c.ink, c.deep));
  // 2-5 product-stage 히어로 면(뷰티만 마크업이 생긴다; 규칙은 속성이 없으면 아무 데도 걸리지 않는다)
  out.push(heroStageCss(S, v2Tint(c, 0.9), "#FFFFFF"));
  return out.join("");
}

/** 위 규칙과 같은 수치를 쓰는 기본 틴트 불투명도(회귀·문서용) */
export const V2_TINT_ALPHA = 0.5;
export const v2Rgba = hexToRgba;
