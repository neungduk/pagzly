/**
 * 508 — OCR 공급자 인터페이스(Vision 교체 가능).
 */
export type OcrWord508 = {
  text: string;
  confidence: number;
  /** 바운딩 박스 높이(px). 없으면 0 */
  boxHeightPx: number;
  /** 타일 내 y(중복 제거용) */
  y?: number;
};

export type OcrLine508 = {
  text: string;
  confidence: number;
  words: OcrWord508[];
  y?: number;
};

export type OcrTileResult508 = {
  tileIndex: number;
  lines: OcrLine508[];
  fullText: string;
  avgConfidence: number;
};

export type OcrProvider508 = {
  name: string;
  annotateDocumentText: (args: {
    imagesBase64: string[];
    languageHints?: string[];
  }) => Promise<OcrTileResult508[]>;
};

export function isOcrConfigured508(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.GOOGLE_VISION_API_KEY || "").trim());
}

export function ocrMonthlyLimit508(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.LABEL_OCR_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 900;
}

export function ocrDailyLimit508(
  isMember: boolean,
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (!isMember) return 5;
  const n = Number(env.LABEL_OCR_PER_USER_DAILY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}
