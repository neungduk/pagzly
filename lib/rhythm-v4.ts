/**
 * 444차 3 — 인접 섹션 간격 해석 규칙(DESIGN_V4). 이웃 섹션 사이 빈 간격은 앞 섹션 아래 여백 + 뒤 섹션 위 여백이 더해진 값이라(겹치지 않음)
 * 면 색이 같은 이웃(경계로 구분되지 않아 빈 칸처럼 읽히는 쌍)은 64+64 = 128px까지 벌어졌다(443차 gapBig).
 *  - 같은 면이 이어질 때: 뒤 섹션 위 여백을 3단 스케일의 가장 작은 값(32)으로 줄인다 → 앞 아래 64 + 32 = 96 이하. 구분선·모티프가 쓰는 위 가장자리 띠(≤24px)는 그대로 들어간다.
 *  - 면이 바뀔 때: 그대로(구획으로 읽히게).
 * 계산은 표시 계획 한 곳에서 한다(markTightTops → 임팩트 섹션 rhythm:"tight"): 라이브와 export가 같은 임팩트 마크업(impactHtml)을 쓰므로 같은 결과가 된다.
 * 임팩트가 아닌 이전 섹션(라이브 Tailwind 클래스·export 변수)은 444차에 면 정보가 계획에 없어 규칙 밖이었다.
 * 445차 3 — 섹션 타입 → 면·여백 표(LEGACY_SECTION_V4) 한 곳을 라이브·export가 같이 읽는다. 면은 본문 순번의 패턴(A·D 흰 면 / B·E 옅은 색 면)에서 계획 단계에 알 수 있고,
 * 위 여백 해석 결과는 계획이 `topPads`(섹션 번호 → px)로 내보내 두 렌더러가 같은 값을 `data-pz-top` 표식과 같은 CSS(topPadCssV4)로 적용한다.
 */
import type { DetailSection } from "@/lib/types/generate";
import { SPACE_V4 } from "@/lib/design-tokens-v4";
import { getSectionPattern } from "@/lib/design-tokens";
import { getRhythmTokens } from "@/lib/rhythm-tokens";

/** 같은 면 이웃의 뒤 섹션 위 여백(스케일 가장 작은 단) */
export const TIGHT_TOP_PX = SPACE_V4.sm;
/** 같은 면 이웃 사이 허용 최대 간격: 가장 큰 두 단 64 + 32 */
export const MAX_SAME_FACE_GAP_PX = SPACE_V4.lg + SPACE_V4.sm;

/** 뒤 섹션의 위 여백 해석(순수 함수): 같은 면이 아니면 그대로, 같은 면이면 앞 아래 여백과 합쳐 96 이하가 되는 가장 큰 스케일 값(최소 32) */
export function resolveTopPad(prevBottom: number, nextTop: number, sameFace: boolean): number {
  if (!sameFace || nextTop <= TIGHT_TOP_PX || prevBottom + nextTop <= MAX_SAME_FACE_GAP_PX) return nextTop;
  const scale = [SPACE_V4.md, SPACE_V4.sm].filter((v) => v <= nextTop && prevBottom + v <= MAX_SAME_FACE_GAP_PX);
  return scale[0] ?? TIGHT_TOP_PX;
}

/**
 * 구매 유도 접점 띠(v4 touch): 면 역할 없이 그라데이션 풀의 색으로 그려져 이웃 블록과 같은 색으로 시작하는 일이 잦다(443차 측정 gapBig의 남은 3건).
 * 띠는 이웃에 붙어 읽히는 요소라 바로 뒤 섹션을 "같은 면"으로 본다.
 */
const isTouchBand = (s: DetailSection | undefined): boolean => !!s && s.type === "impact" && s.kind === "v4" && s.v4?.family === "touch";

/** 모티프가 있는 v4 블록은 위 여백이 모티프 안전 영역(40)보다 커야 글과 안 겹친다(회귀 motifs: 위·아래 모티프 모두 표식이 있으면 검사) → 줄이지 않는다 */
const hasMotif = (s: DetailSection): boolean => s.type === "impact" && !!s.v4?.motifs?.length;

/** 계획 단계: 앞 섹션과 면이 같은 임팩트 섹션(또는 접점 띠 바로 뒤)에 rhythm:"tight"를 단다(입력 배열은 바꾸지 않는다) */
export function markTightTops(sections: DetailSection[], faceKey: (s: DetailSection | undefined) => string | null): DetailSection[] {
  return sections.map((s, i) => {
    if (s.type !== "impact" || i === 0 || hasMotif(s)) return s;
    const a = faceKey(sections[i - 1]);
    const b = faceKey(s);
    return (a !== null && a === b) || isTouchBand(sections[i - 1]) ? ({ ...s, rhythm: "tight" } as DetailSection) : s;
  });
}

/**
 * 렌더 단계: 임팩트 마크업 첫 태그의 위 여백(padding 첫 값)을 줄인다. 앞 아래 여백은 이 함수가 모르므로 최악(64)을 가정해
 * resolveTopPad(64, top, true)를 쓴다(앞이 더 작으면 간격이 더 줄어 스케일 안이다). 위 여백이 이미 32 이하면 그대로.
 */
export function tightenTopPad(html: string): string {
  return html.replace(/^(<section[^>]*?style="[^"]*?padding:)(\d+)px/, (all, pre: string, top: string) => {
    const t = Number(top);
    const next = resolveTopPad(SPACE_V4.lg, t, true);
    return next === t ? all : `${pre}${next}px`;
  });
}

// ── 445차 3: 이전(비임팩트) 섹션 확장 ───────────────────────────────────────────

/** 위·아래 여백이 어디서 오는지: 변수 이름(y = --pz-pad-y, ty = --pz-pad-ty, cy = --pz-pad-cy) 또는 고정 px */
type PadSource = "y" | "ty" | "cy" | number;
type LegacyRow = {
  /** surface = 본문 순번 패턴 면(흰 A·D / 옅은 색 B·E, boldBlock이면 어두운 면), own = 자기만의 면(이웃과 같은 면으로 보지 않음) */
  face: "surface" | "own";
  top: PadSource;
  bottom: PadSource;
};
/**
 * 섹션 타입 → 면·여백 표. 라이브(Tailwind py-N)와 export(--pz-pad-*)가 같은 카테고리 리듬 토큰에서 오는 값이라 여기서 숫자로 읽는다.
 * 표에 없는 타입(히어로·배너·사진 중심 image_text·tradeoff_card 등)은 면을 판정하지 않는다(= 같은 면으로 보지 않아 그대로).
 */
export const LEGACY_SECTION_V4: Readonly<Record<string, LegacyRow>> = {
  checklist: { face: "surface", top: "y", bottom: "y" },
  brand_story: { face: "surface", top: "y", bottom: "y" },
  highlight_box: { face: "surface", top: "y", bottom: "y" },
  step_card: { face: "surface", top: "y", bottom: "y" },
  stat_infographic: { face: "surface", top: "y", bottom: "y" },
  target_persona: { face: "surface", top: "y", bottom: "y" },
  comparison_chart: { face: "surface", top: "y", bottom: "y" },
  comparison_table: { face: "surface", top: "y", bottom: "y" },
  usage_steps: { face: "surface", top: "y", bottom: "y" },
  review_highlight: { face: "surface", top: "y", bottom: "y" },
  color_variation: { face: "surface", top: "y", bottom: "y" },
  faq: { face: "surface", top: "ty", bottom: "ty" },
  caution: { face: "surface", top: "ty", bottom: "ty" },
  spec_table: { face: "surface", top: "ty", bottom: "ty" },
  ai_disclosure: { face: "surface", top: SPACE_V4.sm, bottom: SPACE_V4.sm },
  gallery: { face: "surface", top: SPACE_V4.sm, bottom: 0 },
  cta_price: { face: "own", top: "cy", bottom: "cy" },
};

/** 이전 섹션의 면 키(순수). 임팩트·히어로는 faceKeyOf 담당이라 null. A·D = 흰 면, B·E = 옅은 색 면(두 패턴은 눈으로 같은 파스텔) */
export function legacyFaceKey(section: DetailSection, bodyIndex: number): string | null {
  const row = LEGACY_SECTION_V4[section.type];
  if (!row) return null;
  if (row.face === "own") return `own:${section.type}`;
  if ((section as { boldBlock?: boolean }).boldBlock) return `ink:${bodyIndex}`; // 어두운 강조 면은 구획으로 읽혀 이웃과 같은 면이 아니다
  const pattern = getSectionPattern(bodyIndex, section.type);
  return pattern === "A" || pattern === "D" ? "white" : "tint:legacy";
}

/** 임팩트(faceKeyOf)와 이전 섹션(legacyFaceKey)을 한 함수로 — 섹션 객체로 찾는 면 키 조회(markTightTops에 그대로 넘긴다) */
export function faceKeysFor(sections: DetailSection[], impactKey: (s: DetailSection | undefined) => string | null): (s: DetailSection | undefined) => string | null {
  const byObj = new Map<DetailSection, string | null>();
  let body = 0;
  for (const s of sections) {
    if (s.type !== "hero") {
      byObj.set(s, s.type === "impact" ? impactKey(s) : legacyFaceKey(s, body));
      body += 1;
    }
  }
  return (s) => (s ? (byObj.get(s) ?? null) : null);
}

/**
 * 이전 섹션의 위 여백 해석. 뒤 섹션이 이전(비임팩트) 섹션이고 앞 섹션과 면이 같으면 resolveTopPad로 좁은 폭 기준 위 여백을 3단 스케일 값으로 줄인다.
 * 앞이 이전 섹션이면 표의 아래 여백, 앞이 임팩트면 444차와 같이 최악(64)을 가정한다. 결과: 섹션 번호 → px(줄이는 곳만). 넓은 폭도 같은 값(두 렌더러가 같은 CSS 한 줄).
 */
export function legacyTopPads(sections: DetailSection[], faceKey: (s: DetailSection | undefined) => string | null, category: string): Record<number, number> {
  const t = getRhythmTokens(category, false);
  const px = (src: PadSource): number => (typeof src === "number" ? src : src === "y" ? t.padY : src === "ty" ? t.padTy : t.padCy);
  const out: Record<number, number> = {};
  for (let i = 1; i < sections.length; i += 1) {
    const s = sections[i]!;
    const row = LEGACY_SECTION_V4[s.type];
    const prev = sections[i - 1]!;
    if (!row || s.type === "hero" || prev.type === "hero") continue;
    const a = faceKey(prev);
    if (a === null || a !== faceKey(s)) continue;
    const prevRow = LEGACY_SECTION_V4[prev.type];
    const prevBottom = prev.type === "impact" ? SPACE_V4.lg : prevRow ? px(prevRow.bottom) : null;
    if (prevBottom === null) continue;
    const top = px(row.top);
    const next = resolveTopPad(prevBottom, top, true);
    if (next !== top) out[i] = next;
  }
  return out;
}

/** 표식 → CSS(라이브·export 공용 한 벌): 줄일 수 있는 두 단(32·48). selector(px)가 각 라이브/export의 선택자를 준다 */
export function topPadCssV4(selector: (px: number) => string): string {
  return [SPACE_V4.sm, SPACE_V4.md].map((px) => `${selector(px)}{padding-top:${px}px!important}`).join("");
}
