/** 483 — 화장품 표시사항 검수 타입 (참고용 사전 점검) */

export type ProductKind = "rinse_off" | "leave_on";

export type CheckStatus = "pass" | "possible" | "attention" | "unknown";

export type CheckType = "code" | "ai" | "manual";

export type LabelMarket = "KR" | "US";

/** 506 — 텍스트 모드 범위 */
export type LabelCheckScope506 = "ad_only" | "full";

export type LabelCheckInput = {
  rinseOff: boolean;
  functional: boolean;
  /** 기본 KR */
  market?: LabelMarket;
  /** US-005 수입품 */
  imported?: boolean;
  /** US-011 전문가용 */
  professionalUse?: boolean;
  /** US-009 에어로졸·아동용 등 */
  hazardous?: boolean;
  /** 자외선차단·여드름 등 OTC 성격 → 판정 보류 */
  otcDrugLike?: boolean;
  /**
   * 504 — 제품 유형(복수). type_cautions 판정에만 사용.
   * scrub|pack|shampoo|vulva|softener|deodorant|spray_sunscreen|aerosol
   * 506 — color_makeup = 색조 화장용(예외 product_condition)
   */
  productTypes?: string[];
  /** 506 — 텍스트 모드 등. 기본 full(PDF). ad_only=광고만 */
  scope?: LabelCheckScope506;
  /**
   * 506 — 재점검 비교용 직전 항목 키 목록(클라 전송).
   * 형식: "checkKey||label" (checkKey는 광고 MFDS/USAD 등, 필수항목은 label 기반)
   */
  priorKeys?: string[];
};

export type FixKind = "fix" | "soften" | "evidence";

/** 506 — 수정안 블록(데이터에서만) */
export type FindingFix506 = {
  kind: "fill" | "replace" | "delete" | "evidence" | "functional_only" | "manual";
  headline: string;
  templates?: string[];
  alternatives?: Array<{
    text: string;
    basis: string;
    kind: "general" | "guideline_exception";
  }>;
  note?: string;
};

export type FindingEvidence506 = {
  found: string;
  sentence: string;
  page?: number;
};

export type FindingBasis506 = {
  law: string;
  source: string;
};

export type FindingException506 = {
  id: string;
  result: string;
  text: string;
};

export type Finding = {
  /** 화면용 한글 라벨만 — 내부 KR-LBL-* id는 API에 넣지 않음 */
  category: string;
  label: string;
  status: CheckStatus;
  found: string;
  suggest: string;
  checkType: CheckType;
  /** 494 — 수정 제안(데이터에서만). 없으면 UI에서 접힘 생략 가능 */
  fixSuggestion?: string;
  fixExample?: string;
  fixKind?: FixKind;
  /** 504 — 광고·주의 exception_note 등. 접힘 한 줄 */
  exceptionNote?: string;
  /**
   * 506 — 비교·매핑용 키(광고는 MFDS-/USAD- 계열, 그 외는 lbl:제목).
   * KR-LBL 계열 문자열은 넣지 않음(483 노출 금지).
   */
  checkKey?: string;
  fix?: FindingFix506;
  evidence?: FindingEvidence506[];
  basis?: FindingBasis506;
  exception?: FindingException506;
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
  manualItems: Array<{
    category: string;
    label: string;
    suggest: string;
    fixSuggestion?: string;
    fixExample?: string;
    /** 513 — "왜 직접 봐야 하나요: …" */
    whyManual?: string;
  }>;
  /** 513 — 해당 없어 뺀 항목(접이식) */
  skippedItems513?: Array<{ label: string; reason: string }>;
  /** 513 — 개정 예정·동향 참고 */
  referenceNotes513?: Array<{ label: string; text: string }>;
  /** 513 — 수출 전용 안내(결과 상단) */
  exportNotice513?: string;
  /** 494 — 사용된 시장 */
  market?: LabelMarket;
  /** 501 — 결과 하단 점검 기준 한 줄 */
  rulesBasis?: string;
  /**
   * 505 — 광고 fix_kind=evidence 항목이 있을 때 결과 하단에 1회만 표시하는
   * 실증 체크포인트(상위 N줄). 항목별 접힘에 반복하지 않음.
   */
  evidenceCheckpoints?: string[];
  /** 506 — 광고만 점검 안내 */
  scopeNotice?: string;
  /** 506 — 재점검 비교 */
  compare?: {
    resolved: string[];
    remaining: string[];
    added: string[];
  };
  /** 506 — 성분 개수(파싱 성공 시) */
  ingredientCount?: number;
  /** 506 — 수정안 모아보기 텍스트 */
  fixSheet?: string;
  /**
   * 508 — 추출 품질.
   * unreadable: 점검 불가(점수·"발견된 항목이 없어요" 금지).
   * partial: 일부 쪽만 읽음.
   */
  readStatus?: "ok" | "partial" | "unreadable";
  pagesWithText?: number;
  pagesTotal?: number;
  /** OCR 평균 신뢰도(0~1). 저장 요약에는 넣지 않음 */
  avgOcrConfidence?: number;
  /** 508 — 사진 OCR 후 고객 확인 글자 기준 */
  ocrFromPhoto?: boolean;
};

/** 506 — 텍스트 모드 상한 */
export const MAX_TEXT_MODE_CHARS_506 = 20_000;
export const NOTICE_AD_ONLY_506 = "광고 문구만 점검했어요";
export const NOTICE_RECHECK_EMPTY_506 =
  "이번 점검에서 발견된 항목이 없어요. 최종 확인은 직접 하셔야 합니다.";
/** 색조 예외용 productTypes id */
export const PRODUCT_TYPE_COLOR_MAKEUP_506 = "color_makeup";

export const DISCLAIMER_483 =
  "본 결과는 참고용 사전 점검이며 법적 판단이 아닙니다. ‘위반’이 아니라 ‘위반 가능/확인 필요’로만 안내합니다.";

/** 미국 모드 추가 면책(한 줄). DISCLAIMER_483 뒤에 붙임 */
export const DISCLAIMER_US_EXTRA_494 =
  "미국 연방 규정 기준이며 주(州) 법(예: 캘리포니아)은 포함되지 않음";

export const NOTICE_OTC_US_494 =
  "이 점검기는 일반 화장품만 다룹니다(OTC 약품은 Drug Facts 라벨 별도)";

export const FIX_EXAMPLE_NOTE_494 =
  "예시이며 그대로 사용하지 말고 실제 정보로 바꾸세요";

export const DISCLAIMER_PRINT_485 =
  "참고용 사전 점검이며 법적 판단이 아닙니다.";

export const MIN_CHARS_483 = 40;
/** 한글이 이 미만이면 아웃라인/스캔으로 보고 판정 생략 */
export const MIN_HANGUL_CHARS_485 = 10;
/**
 * 498 — Vercel Hobby 요청 본문 ~4.5MB보다 작게(서버가 플랫폼보다 먼저 거절).
 * 표시용 MB는 floor(bytes/1MiB).
 */
export const MAX_PDF_BYTES_483 = 4 * 1024 * 1024;
export const MAX_PDF_MB_498 = Math.floor(MAX_PDF_BYTES_483 / (1024 * 1024));
export const MAX_PDF_PAGES_485 = 10;
export const EXTRACT_TIMEOUT_MS_485 = 20_000;
/** route segment — 추출 20s + 여유 */
export const LABEL_CHECK_MAX_DURATION_SEC_498 = 30;

export const NOTICE_OUTLINE_485 =
  "글자가 도형으로 변환된 PDF일 수 있어요. 디자인 파일에서 '글자 포함(아웃라인 해제)' 상태로 PDF를 다시 내보내 주세요.";

/** 497 — 이미지·스캔 PDF(글자 레이어 없음). 해결 방법 ≤2 */
export const NOTICE_IMAGE_PDF_497 =
  "글자가 이미지로 들어 있어 읽지 못했습니다. 디자인 프로그램에서 글자를 살린 채(윤곽선 만들기 해제) PDF로 다시 내보내 주세요. 해결: ① 텍스트를 윤곽선으로 바꾸지 말고 보내기 ② 스캔본이면 글자가 있는 원본 시안을 쓰세요.";

export const NOTICE_US_NON_ENGLISH_497 =
  "영어 라벨이 아닌 것으로 보입니다. 미국 모드에서는 영문 필수 항목 판정을 보류하고 영어 표기만 안내합니다.";

export const NOTICE_NO_HANGUL_485 =
  "한글 표시사항이 읽히지 않았어요. 한글이 포함된 텍스트 PDF로 다시 내보내 주세요. 판정을 보류합니다.";

export const ERR_NOT_PDF_485 = "PDF 파일이 아닙니다. 파일 내용을 확인해 주세요.";
export const ERR_TOO_LARGE_485 = `PDF가 너무 큽니다. 이미지 해상도를 낮추거나 점검용으로 저해상도 PDF를 내보내 주세요 (권장 ${MAX_PDF_MB_498}MB 이하).`;
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
