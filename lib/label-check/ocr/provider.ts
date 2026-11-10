/**
 * 508 — OCR 공급자 인터페이스. KR→CLOVA(없으면 Google 대체), US→Google.
 */
import { createClovaProvider508, isClovaConfigured508 } from "@/lib/label-check/ocr/clova";
import { createVisionProvider508 } from "@/lib/label-check/ocr/google-vision";

export type OcrWord508 = {
  text: string;
  confidence: number;
  boxHeightPx: number;
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

export type OcrProviderId508 = "google" | "clova";

export function isGoogleConfigured508(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.GOOGLE_VISION_API_KEY || "").trim());
}

/** 아무 공급자든 OCR 가능하면 true */
export function isOcrConfigured508(env: NodeJS.ProcessEnv = process.env): boolean {
  return isGoogleConfigured508(env) || isClovaConfigured508(env);
}

export function ocrGoogleMonthlyLimit508(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.LABEL_OCR_GOOGLE_MONTHLY_LIMIT ?? env.LABEL_OCR_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 900;
}

export function ocrClovaMonthlyLimit508(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.LABEL_OCR_CLOVA_MONTHLY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 90;
}

/** @deprecated → ocrGoogleMonthlyLimit508 */
export function ocrMonthlyLimit508(env: NodeJS.ProcessEnv = process.env): number {
  return ocrGoogleMonthlyLimit508(env);
}

export function ocrDailyLimit508(
  isMember: boolean,
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (!isMember) return 5;
  const n = Number(env.LABEL_OCR_PER_USER_DAILY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

export type PickedProvider508 = {
  id: OcrProviderId508;
  provider: OcrProvider508;
  /** CLOVA 조각 높이 1900, Google 2400 */
  tileHeightPx: number;
  monthlyLimit: number;
  fallbackFromClova?: boolean;
};

/**
 * KR → CLOVA, 없으면 Google 대체(보고서에 명시).
 * US → Google.
 */
export function pickProvider508(
  market: "KR" | "US",
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch,
): PickedProvider508 | null {
  if (market === "KR") {
    if (isClovaConfigured508(env)) {
      return {
        id: "clova",
        provider: createClovaProvider508({
          invokeUrl: (env.CLOVA_OCR_INVOKE_URL || "").trim(),
          secret: (env.CLOVA_OCR_SECRET || "").trim(),
          fetchImpl,
        }),
        tileHeightPx: 1900,
        monthlyLimit: ocrClovaMonthlyLimit508(env),
      };
    }
    if (isGoogleConfigured508(env)) {
      return {
        id: "google",
        provider: createVisionProvider508({
          apiKey: (env.GOOGLE_VISION_API_KEY || "").trim(),
          fetchImpl,
        }),
        tileHeightPx: 2400,
        monthlyLimit: ocrGoogleMonthlyLimit508(env),
        fallbackFromClova: true,
      };
    }
    return null;
  }
  // US
  if (!isGoogleConfigured508(env)) return null;
  return {
    id: "google",
    provider: createVisionProvider508({
      apiKey: (env.GOOGLE_VISION_API_KEY || "").trim(),
      fetchImpl,
    }),
    tileHeightPx: 2400,
    monthlyLimit: ocrGoogleMonthlyLimit508(env),
  };
}

export function ocrVendorNotice508(market: "KR" | "US", picked: PickedProvider508 | null): string {
  if (!picked) {
    return "사진을 글자로 바꾸기 위해 이미지가 외부 OCR 서비스로 전송되며, 저장하지 않습니다.";
  }
  if (picked.id === "clova") {
    return "사진을 글자로 바꾸기 위해 이미지가 외부 OCR 서비스(네이버 클라우드)로 전송되며, 저장하지 않습니다.";
  }
  return "사진을 글자로 바꾸기 위해 이미지가 외부 OCR 서비스(Google)로 전송되며, 저장하지 않습니다.";
}
