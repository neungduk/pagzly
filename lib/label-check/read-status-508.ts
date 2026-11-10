/**
 * 508 — 추출 품질 → readStatus (판정 규칙과 분리).
 */
export type ReadStatus508 = "ok" | "partial" | "unreadable";

export type ReadAssessment508 = {
  readStatus: ReadStatus508;
  pagesWithText: number;
  pagesTotal: number;
  /** 고객 원인 한 줄 */
  cause?: string;
};

export const UNREADABLE_HEADLINE_508 = "글자를 읽지 못해 점검하지 못했어요";
export const PARTIAL_EMPTY_HEADLINE_508 = "읽은 부분에서는 발견된 항목이 없어요";
export const PARTIAL_BANNER_508 = (n: number) =>
  `${n}쪽은 글자를 읽지 못했어요. 이 부분은 점검되지 않았습니다`;

export const CAUSE_TOO_FEW_CHARS_508 =
  "파일에서 읽은 글자가 거의 없어요. 이미지·캡처본이거나 글자가 그림으로만 들어간 PDF일 수 있어요.";
export const CAUSE_MOSTLY_IMAGE_508 =
  "대부분의 쪽에 글자가 없어 점검을 진행할 수 없어요.";
export const CAUSE_LOW_OCR_CONF_508 =
  "사진에서 읽은 글자의 신뢰도가 낮아 점검하지 못했어요.";

const MIN_CHARS_UNREADABLE = 20;
const MIN_CHARS_MOSTLY_IMAGE = 200;

export function assessReadStatus508(input: {
  charCount: number;
  pageCount?: number;
  emptyPages?: number[];
  /** OCR 평균 신뢰도 0~1. 없으면 무시 */
  avgConfidence?: number | null;
  /** text=붙여넣기 — 짧은 문구도 점검. pdf/ocr=파일 추출 */
  source?: "pdf" | "text" | "ocr";
}): ReadAssessment508 {
  const pagesTotal = Math.max(1, input.pageCount ?? 1);
  const emptyCount = (input.emptyPages || []).filter(
    (p) => Number.isFinite(p) && p >= 1 && p <= pagesTotal,
  ).length;
  const pagesWithText = Math.max(0, pagesTotal - emptyCount);
  const textRatio = pagesWithText / pagesTotal;
  const chars = input.charCount || 0;
  const source = input.source || "pdf";

  if (
    (source === "ocr" || source === "pdf") &&
    input.avgConfidence != null &&
    Number.isFinite(input.avgConfidence) &&
    input.avgConfidence < 0.6 &&
    chars < MIN_CHARS_MOSTLY_IMAGE
  ) {
    return {
      readStatus: "unreadable",
      pagesWithText,
      pagesTotal,
      cause: CAUSE_LOW_OCR_CONF_508,
    };
  }

  // 붙여넣기: 완전 빈 문자열만 unreadable
  if (source === "text") {
    if (chars < 1) {
      return {
        readStatus: "unreadable",
        pagesWithText,
        pagesTotal,
        cause: CAUSE_TOO_FEW_CHARS_508,
      };
    }
    return { readStatus: "ok", pagesWithText, pagesTotal };
  }

  if (chars < MIN_CHARS_UNREADABLE) {
    return {
      readStatus: "unreadable",
      pagesWithText,
      pagesTotal,
      cause: CAUSE_TOO_FEW_CHARS_508,
    };
  }

  if (textRatio < 0.5 && chars < MIN_CHARS_MOSTLY_IMAGE) {
    return {
      readStatus: "unreadable",
      pagesWithText,
      pagesTotal,
      cause: CAUSE_MOSTLY_IMAGE_508,
    };
  }

  if (emptyCount > 0 && pagesWithText > 0) {
    return {
      readStatus: "partial",
      pagesWithText,
      pagesTotal,
      cause: PARTIAL_BANNER_508(emptyCount),
    };
  }

  return { readStatus: "ok", pagesWithText, pagesTotal };
}
