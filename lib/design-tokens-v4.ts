/**
 * 443차 1 — v4 디자인 토큰 단일 소스. 441·442차에 흩어져 있던 값(제목 위계 3단, 여백 32·48·64, 반경 3단, 그림자 none/soft/float,
 * hairline, 행간 단계, 구분선 선 농도)을 이 파일 한 곳에서 export한다. 이 파일은 다른 모듈을 import하지 않는다(순환 방지, 라이브·export 공용).
 *
 * 라이브(React)와 export(인라인 문자열)는 같은 토큰 키를 두 헬퍼로 읽는다. 둘은 같은 선언(DECL)에서 나와 값이 같을 수밖에 없다.
 *   tokenStyle("heading-mid")        → "font-size:20px;font-weight:800;line-height:1.5;letter-spacing:-0.02em"   (export 인라인 스타일)
 *   tokenStyleObject("heading-mid")  → { fontSize: "20px", fontWeight: "800", lineHeight: "1.5", letterSpacing: "-0.02em" }   (라이브 style)
 * 그림자·테두리 토큰은 잉크색이 필요하다: tokenStyle("shadow-soft", ink). 이후 항목은 이 헬퍼만 쓰고 하드코딩을 새로 만들지 않는다.
 * 값을 바꾸면 v4 on 화면이 바뀐다 — off(438차)는 이 파일을 읽지 않는다(호출 쪽이 DESIGN_V4일 때만 읽는다).
 */

// ── 제목 위계 3단 + 본문·라벨 ────────────────────────────────────────────────
/** 위계: 대(섹션 제목) 26·800 / 중(카드 큰 제목) 20·800 / 소(카드 제목) 17·700. 인용·큰 문구(display 30·900)는 별도 */
export const TYPE_V4 = {
  display: { size: 30, lh: 1.25, ls: "-0.03em", w: 900 },
  "heading-large": { size: 26, lh: 1.3, ls: "-0.02em", w: 800 },
  "heading-mid": { size: 20, lh: 1.4, ls: "-0.02em", w: 800 },
  "heading-small": { size: 17, lh: 1.45, ls: "-0.01em", w: 700 },
  body: { size: 15, lh: 1.7, ls: "0", w: 400 },
  "body-small": { size: 14, lh: 1.6, ls: "0", w: 500 },
  label: { size: 12, lh: 1.2, ls: "0.14em", w: 700 },
} as const;
export type TypeTokenKey = keyof typeof TYPE_V4;
export const MIN_BODY_PX = 14;
export const MIN_LABEL_PX = 12;
export const HEADING_SECTION_PX = TYPE_V4["heading-large"].size;

/** 행간 단계 — 새 마크업은 숫자를 쓰지 않고 이 단계를 고른다 */
export const LINE_HEIGHT_V4 = { tight: 1.25, snug: 1.3, normal: 1.45, relaxed: 1.6, loose: 1.7 } as const;

// ── 여백 스케일 32·48·64 ─────────────────────────────────────────────────────
export const SPACE_V4 = { sm: 32, md: 48, lg: 64 } as const;
export const PAD_TIERS = [SPACE_V4.sm, SPACE_V4.md, SPACE_V4.lg] as const; // 조밀 · 보통 · 여유
/** 스타일 팩 배율 뒤 좁은 폭 값을 3단으로 스냅하는 경계: 40 미만 → 32, 56 미만 → 48, 그 외 64(경계값은 위 단) */
export const SPACE_SNAP_BOUNDS = [40, 56] as const;
/** mood 임팩트 블록 여백 스냅 경계: 36 이하 → 32, 52 이하 → 48, 그 외 64 */
export const MOOD_PAD_BOUNDS = [36, 52] as const;

/**
 * 447차 2-c — 히어로 포화 면 상한(OKLCH). HSL 채도 0.6~0.85로 올린 면은 색상마다 지각 채도가 크게 달라(청록 0.09 ↔ 파랑·보라·마젠타 0.26) 실사진 옆에서 형광처럼 튄다.
 * 색상과 명도는 두고 채도(C)만 이 값까지 줄인다. 명도(L)는 이 값을 넘지 않는다(흰 글자 4.5:1은 그대로 확인). 값 한 곳: 라이브·export 같은 값.
 */
export const HERO_FACE_CAP = { chroma: 0.19, lightness: 0.58 } as const;

/** 요소 사이 간격(섹션 여백 스케일과 별개의 작은 단) */
export const GAP_V4 = { xs: 8, sm: 12, md: 16 } as const;

// ── 반경 3단 ────────────────────────────────────────────────────────────────
export const RADIUS_V4 = { sm: 8, md: 16, lg: 24 } as const; // 알약 999px·원 50%는 그대로
export const RADIUS_TIERS = [RADIUS_V4.sm, RADIUS_V4.md, RADIUS_V4.lg] as const;
/** mood 반경 스냅 경계: 9 이하 → 8, 20 이하 → 16, 그 외 24 */
export const RADIUS_SNAP_BOUNDS = [9, 20] as const;

// ── 깊이: none / soft / float, hairline, 구분선 ──────────────────────────────
export const SHADOW_ALPHA_TIERS = [0.1, 0.18] as const; // mood가 곱하는 약 · 강
export const SHADOW_V4 = {
  soft: { y: 6, blur: 16, alpha: 0.07 }, // 목록 속 카드(번호 카드 등)
  float: { y: 12, blur: 28, alpha: 0.13 }, // 사진·겹침 카드처럼 면 위에 떠 있는 것
} as const;
/** spec_table 라벨 글자 잉크 알파 — 라벨 면(accent 10%, 줄무늬 행은 7% 위에 10%) 위 4.5:1을 만족하는 가장 약한 값(합성 21종 최악 0.64 → 0.65, 444차 판단 2). 443차 0.72는 과했다 */
export const SPEC_LABEL_INK_ALPHA = 0.65;
export const HAIRLINE_ALPHA = 0.1; // 카드 테두리 한 가지(잉크 10%)
export const DIVIDER_ALPHA = 0.18; // 구분선 선: 잉크 18% — 면 위 비텍스트 장식

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
export function inkRgba(ink: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type DepthLevel = "none" | "soft" | "float";
export const depthShadowOf = (level: DepthLevel, ink: string): string => {
  if (level === "none") return "none";
  const s = SHADOW_V4[level];
  return `0 ${s.y}px ${s.blur}px ${inkRgba(ink, s.alpha)}`;
};
export const hairlineOf = (ink: string): string => `1px solid ${inkRgba(ink, HAIRLINE_ALPHA)}`;

/** CSS 선언 목록(속성은 kebab-case, 값은 문자열) → export 인라인 문자열 / 라이브 style 객체. 섹션별 쌍둥이 함수(lib/twin-styles-v4.ts)도 이 둘을 쓴다 */
export type Decl = Array<[string, string]>;
export const declStyle = (d: Decl): string => d.map(([p, v]) => `${p}:${v}`).join(";");
export function declObject(d: Decl): Record<string, string> {
  const camel = (p: string) => p.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  return Object.fromEntries(d.map(([p, v]) => [camel(p), v]));
}

/** 토큰 키 → CSS 선언(속성은 kebab-case, 값은 문자열). 라이브·export 두 헬퍼가 같은 이 표를 읽는다 */
const STATIC_DECL = (() => {
  const out: Record<string, Array<[string, string]>> = {};
  for (const [key, t] of Object.entries(TYPE_V4)) {
    out[key] = [["font-size", `${t.size}px`], ["font-weight", String(t.w)], ["line-height", String(t.lh)], ["letter-spacing", t.ls]];
  }
  for (const [k, v] of Object.entries(SPACE_V4)) out[`space-${k}`] = [["padding-top", `${v}px`], ["padding-bottom", `${v}px`]];
  for (const [k, v] of Object.entries(GAP_V4)) out[`gap-${k}`] = [["gap", `${v}px`]];
  for (const [k, v] of Object.entries(RADIUS_V4)) out[`radius-${k}`] = [["border-radius", `${v}px`]];
  for (const [k, v] of Object.entries(LINE_HEIGHT_V4)) out[`line-${k}`] = [["line-height", String(v)]];
  return out;
})();
/** 잉크색이 있어야 만들 수 있는 토큰 */
const INK_DECL: Record<string, (ink: string) => Array<[string, string]>> = {
  "shadow-none": () => [["box-shadow", "none"]],
  "shadow-soft": (ink) => [["box-shadow", depthShadowOf("soft", ink)]],
  "shadow-float": (ink) => [["box-shadow", depthShadowOf("float", ink)]],
  hairline: (ink) => [["border", hairlineOf(ink)]],
};

export type TokenKey = TypeTokenKey | `space-${keyof typeof SPACE_V4}` | `gap-${keyof typeof GAP_V4}` | `radius-${keyof typeof RADIUS_V4}` | `line-${keyof typeof LINE_HEIGHT_V4}` | "shadow-none" | "shadow-soft" | "shadow-float" | "hairline";
export const TOKEN_KEYS: readonly TokenKey[] = [...Object.keys(STATIC_DECL), ...Object.keys(INK_DECL)] as TokenKey[];

function declOf(key: TokenKey, ink?: string): Array<[string, string]> {
  const fixed = STATIC_DECL[key];
  if (fixed) return fixed;
  const inked = INK_DECL[key];
  if (!inked) throw new Error(`알 수 없는 v4 토큰: ${key}`);
  if (key !== "shadow-none" && !ink) throw new Error(`v4 토큰 ${key}에는 잉크색이 필요합니다`);
  return inked(ink ?? "#000000");
}

/** export용 인라인 스타일 문자열(끝 세미콜론 없음) */
export const tokenStyle = (key: TokenKey, ink?: string): string => declStyle(declOf(key, ink));

/** 라이브(React style)용 객체. 값은 문자열 — tokenStyle과 같은 선언에서 나온다 */
export const tokenStyleObject = (key: TokenKey, ink?: string): Record<string, string> => declObject(declOf(key, ink));

/** 토큰 여러 개를 한 선언 목록으로(앞 토큰의 같은 속성은 뒤 토큰이 덮는다) */
export function tokenDecl(key: TokenKey, ink?: string): Decl {
  return declOf(key, ink);
}

// ── 본문 사진 톤 통일 오버레이(443차 4-1) ─────────────────────────────────────
/**
 * mood별 은은한 틴트 — 사진 위 그라데이션 오버레이 한 장(filter·mix-blend-mode 없음, 알파 합성만이라 export·PNG 안전).
 * 위는 옅게, 아래로 갈수록 조금 진하게(사진 간 밝기·색 차이를 줄이되 제품 색을 덮지 않는 상한 0.16). mood가 없으면 오버레이 자체를 만들지 않는다(입력 없음 = 불변).
 */
export const TONE_V4 = {
  alphaTop: 0.06,
  alphaBottom: 0.16,
  tint: {
    "minimal-luxe": "#CFC6B8",
    natural: "#BFD0B0",
    clinic: "#B9D3E8",
    playful: "#F2B8CF",
    street: "#8E9AA8",
    warm: "#E8C79B",
  },
} as const;
export type ToneMood = keyof typeof TONE_V4.tint;
export const toneOverlayStyle = (mood: string | undefined | null): string => {
  const tint = mood && Object.prototype.hasOwnProperty.call(TONE_V4.tint, mood) ? TONE_V4.tint[mood as ToneMood] : null;
  return tint
    ? `position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;background:linear-gradient(180deg,${inkRgba(tint, TONE_V4.alphaTop)} 0%,${inkRgba(tint, TONE_V4.alphaBottom)} 100%)`
    : "";
};

// ── 히어로 B형 고스트 글자 가장자리 페이드(443차 4-2) ─────────────────────────
/** 고스트 글자 박스(좌우 -2%, 위 -0.55em, overflow:hidden)에 잘린 가장자리를 면 색 그라데이션 덮개로 녹인다 — mask·clip-path 없음 */
export const GHOST_FADE_V4 = { sidePct: 22, topPct: 40, bottomPct: 30 } as const; // 444차: 14 → 22 (D형 눈 검수에서 왼쪽 잘린 글자가 아직 또렷)
export const ghostFadeBackground = (face: string, vertical: "top" | "bottom" = "top"): string =>
  `linear-gradient(90deg,${face} 0%,${inkRgba(face, 0)} ${GHOST_FADE_V4.sidePct}%,${inkRgba(face, 0)} ${100 - GHOST_FADE_V4.sidePct}%,${face} 100%),` +
  (vertical === "top" ? `linear-gradient(180deg,${face} 0%,${inkRgba(face, 0)} ${GHOST_FADE_V4.topPct}%)` : `linear-gradient(0deg,${face} 0%,${inkRgba(face, 0)} ${GHOST_FADE_V4.bottomPct}%)`);

// ── 일러스트 배너 글 스크림 카드(444차 눈 검수) ────────────────────────────────
/** 글 블록 뒤 스크림 카드의 번짐: 위아래 10%, 좌우 4% — 좁은 폭(390)에서 좌우 10%는 카드가 화면 가장자리를 넘어 잘려 보였다 */
export const BANNER_SCRIM_INSET_V4 = "-10% -4%";
