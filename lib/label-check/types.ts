/** 483 — 화장품 표시사항 검수 타입 (참고용 사전 점검) */

export type ProductKind = "rinse_off" | "leave_on";

export type CheckStatus = "pass" | "possible" | "attention" | "unknown";

export type CheckType = "code" | "ai" | "manual";

export type LabelCheckInput = {
  rinseOff: boolean;
  functional: boolean;
};

export type Finding = {
  /** 화면용 한글 라벨만 — 내부 id는 API 응답에 넣지 않음 */
  category: string;
  label: string;
  status: CheckStatus;
  found: string;
  suggest: string;
  checkType: CheckType;
};

export type LabelCheckSummary = {
  possible: number;
  attention: number;
  unknown: number;
  pass: number;
  manual: number;
};

export type LabelCheckResult = {
  disclaimer: string;
  readable: boolean;
  charCount: number;
  summary: LabelCheckSummary;
  findings: Finding[];
  manualItems: Array<{ category: string; label: string; suggest: string }>;
};

export const DISCLAIMER_483 =
  "본 결과는 참고용 사전 점검이며 법적 판단이 아닙니다. ‘위반’이 아니라 ‘위반 가능/확인 필요’로만 안내합니다.";

export const MIN_CHARS_483 = 40;
export const MAX_PDF_BYTES_483 = 10 * 1024 * 1024;
