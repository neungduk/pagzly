/**
 * 508 — LabelCheckResult에 readStatus·쪽 통계를 붙이고 unreadable이면 판정 생략.
 */
import {
  assessReadStatus508,
  type ReadStatus508,
} from "@/lib/label-check/read-status-508";
import type { ExtractedPdf } from "@/lib/label-check/extract-pdf";
import type { LabelCheckResult } from "@/lib/label-check/types";

const EMPTY_SUMMARY = {
  possible: 0,
  attention: 0,
  unknown: 0,
  pass: 0,
  manual: 0,
};

export function attachReadStatus508(
  result: LabelCheckResult,
  extracted: Pick<
    ExtractedPdf,
    | "charCount"
    | "pageCount"
    | "emptyPages"
    | "avgOcrConfidence"
    | "ocrSizeUnknown"
    | "extractSource"
  >,
): LabelCheckResult {
  const assessed = assessReadStatus508({
    charCount: extracted.charCount,
    pageCount: extracted.pageCount,
    emptyPages: extracted.emptyPages,
    avgConfidence: extracted.avgOcrConfidence,
    source: extracted.extractSource || (extracted.ocrSizeUnknown ? "ocr" : "pdf"),
  });

  const next: LabelCheckResult = {
    ...result,
    readStatus: assessed.readStatus,
    pagesWithText: assessed.pagesWithText,
    pagesTotal: assessed.pagesTotal,
    avgOcrConfidence:
      extracted.avgOcrConfidence != null ? extracted.avgOcrConfidence : result.avgOcrConfidence,
    ocrFromPhoto: extracted.ocrSizeUnknown ? true : result.ocrFromPhoto,
  };

  if (assessed.readStatus === "unreadable") {
    return {
      ...next,
      readable: false,
      skipJudgment: true,
      findings: [],
      manualItems: [],
      summary: EMPTY_SUMMARY,
      // 기존 이미지/아웃라인 안내 문구 우선(회귀·고객 해결 안내)
      notice: result.notice || assessed.cause,
      fixSheet: undefined,
      compare: undefined,
    };
  }

  if (assessed.readStatus === "partial" && assessed.cause) {
    next.notice = [assessed.cause, result.notice].filter(Boolean).join(" ");
  }

  return next;
}

export function isUnreadableResult508(result: LabelCheckResult): boolean {
  return result.readStatus === "unreadable";
}

export type { ReadStatus508 };
