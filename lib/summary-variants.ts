/**
 * 409차 — 요약 띠("한눈에 보기") 변형 토큰: inline-strip(한 줄 이어짐) / spec-list(줄 목록).
 * 칩 문구는 지금 데이터 그대로(아이콘만 뺀다). 라이브·export가 같은 숫자를 쓴다.
 */
export const SUMMARY_VARIANT = {
  borderColor: "rgba(27,27,24,0.14)",
  labelSizePx: 11,
  labelTracking: "0.2em",
  labelGapPx: 14,
  stripSizePx: 13,
  stripColGapPx: 16,
  stripRowGapPx: 8,
  dividerHeightPx: 12,
  listSizePx: 14,
  listRowPadPx: 10,
  listMaxWidthPx: 560,
  /** 410차 — spec-list는 2열(칩 3개 이상)로 압축 */
  listCols: 2,
  listColGapPx: 24,
} as const;

/** 글자 폭 근사(px): 한글·한자 1em, 숫자·영문·기호 0.6em */
function textWidthPx(text: string, sizePx: number): number {
  let w = 0;
  for (const ch of text) w += /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/.test(ch) ? sizePx : ch === " " ? sizePx * 0.3 : sizePx * 0.6;
  return w;
}

/**
 * 410차 — inline-strip은 칩이 한 줄에 다 들어갈 때만 쓴다(좁은 폭 342px 기준 근사). 안 들어가면 칩이 두 줄로 접혀 어수선하므로
 * 글자가 잘리지 않는 spec-list(2열 줄 목록)로 바꾼다. 칩 문구는 자르지 않는다. 라이브·export가 같은 함수를 쓴다.
 */
export const SUMMARY_STRIP_MAX_PX = 330;
export function resolveSummaryVariant(
  variant: "icon-grid" | "spec-list" | "inline-strip",
  chips: string[],
): "icon-grid" | "spec-list" | "inline-strip" {
  if (variant !== "inline-strip") return variant;
  const widths = chips.reduce((s, c) => s + textWidthPx(c, SUMMARY_VARIANT.stripSizePx), 0);
  const gaps = Math.max(0, chips.length - 1) * (SUMMARY_VARIANT.stripColGapPx * 2 + 1);
  return widths + gaps <= SUMMARY_STRIP_MAX_PX ? "inline-strip" : "spec-list";
}
