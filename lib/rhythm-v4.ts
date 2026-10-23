/**
 * 444차 3 — 인접 섹션 간격 해석 규칙(DESIGN_V4). 이웃 섹션 사이 빈 간격은 앞 섹션 아래 여백 + 뒤 섹션 위 여백이 더해진 값이라(겹치지 않음)
 * 면 색이 같은 이웃(경계로 구분되지 않아 빈 칸처럼 읽히는 쌍)은 64+64 = 128px까지 벌어졌다(443차 gapBig).
 *  - 같은 면이 이어질 때: 뒤 섹션 위 여백을 3단 스케일의 가장 작은 값(32)으로 줄인다 → 앞 아래 64 + 32 = 96 이하. 구분선·모티프가 쓰는 위 가장자리 띠(≤24px)는 그대로 들어간다.
 *  - 면이 바뀔 때: 그대로(구획으로 읽히게).
 * 계산은 표시 계획 한 곳에서 한다(markTightTops → 임팩트 섹션 rhythm:"tight"): 라이브와 export가 같은 임팩트 마크업(impactHtml)을 쓰므로 같은 결과가 된다.
 * 임팩트가 아닌 이전 섹션(라이브 Tailwind 클래스·export 변수)은 면 정보가 계획에 없어 이번 규칙 밖이다(보고서 기재).
 */
import type { DetailSection } from "@/lib/types/generate";
import { SPACE_V4 } from "@/lib/design-tokens-v4";

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
