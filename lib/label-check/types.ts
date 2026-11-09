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
  /** 한글 글자 수(공백 제외) — 안내 분기용 */
  hangulCount?: number;
  /** 판정 생략 시 전용 안내(아웃라인·영문만 등). findings는 비움 */
  notice?: string;
  /** true면 규칙 판정 안 함 */
  skipJudgment?: boolean;
  summary: LabelCheckSummary;
  findings: Finding[];
  manualItems: Array<{ category: string; label: string; suggest: string }>;
};

export const DISCLAIMER_483 =
  "본 결과는 참고용 사전 점검이며 법적 판단이 아닙니다. ‘위반’이 아니라 ‘위반 가능/확인 필요’로만 안내합니다.";

export const DISCLAIMER_PRINT_485 =
  "참고용 사전 점검이며 법적 판단이 아닙니다.";

export const MIN_CHARS_483 = 40;
/** 한글이 이 미만이면 아웃라인/스캔으로 보고 판정 생략 */
export const MIN_HANGUL_CHARS_485 = 10;
export const MAX_PDF_BYTES_483 = 10 * 1024 * 1024;
export const MAX_PDF_PAGES_485 = 10;
export const EXTRACT_TIMEOUT_MS_485 = 20_000;

export const NOTICE_OUTLINE_485 =
  "글자가 도형으로 변환된 PDF일 수 있어요. 디자인 파일에서 '글자 포함(아웃라인 해제)' 상태로 PDF를 다시 내보내 주세요.";

export const NOTICE_NO_HANGUL_485 =
  "한글 표시사항이 읽히지 않았어요. 한글이 포함된 텍스트 PDF로 다시 내보내 주세요. 판정을 보류합니다.";

export const ERR_NOT_PDF_485 = "PDF 파일이 아닙니다. 파일 내용을 확인해 주세요.";
export const ERR_TOO_LARGE_485 = "파일은 최대 10MB까지 가능합니다.";
export const ERR_TOO_MANY_PAGES_485 = "PDF는 최대 10쪽까지 검수할 수 있습니다.";
export const ERR_TIMEOUT_485 = "처리 시간 초과, 확인 불가";
export const ERR_UNREADABLE_PDF_485 = "열 수 없는 PDF입니다. 암호화되었거나 손상되었을 수 있습니다.";
export const ERR_RATE_485 = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

/** 486 — 파일럿 소개 카피(범위 고정, 임의 확장 금지) */
export const INTRO_ONE_LINE_486 =
  "화장품 패키지 시안(PDF)의 표시사항을 인쇄 전에 사전 점검합니다.";
export const INTRO_LINES_486 = [
  "PDF를 올리면 필수 표시사항·알레르기 성분·주의가 필요한 광고 문구를 확인합니다",
  "업로드한 파일은 점검 직후 저장하지 않고 폐기합니다",
  "참고용 사전 점검이며 법적 판단이 아닙니다",
] as const;
export const SAMPLE_BANNER_486 = "가상 브랜드 예시입니다";
