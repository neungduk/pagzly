/**
 * 498 — label-check API 오류 형식 `{ error, code }`.
 * (클라이언트·서버 공용 — next/server 금지)
 */
import { ERR_LOGIN_EXPIRED_495, ERR_SERVER_495 } from "@/lib/label-check/member-constants";
import {
  ERR_NOT_PDF_485,
  ERR_RATE_485,
  ERR_TIMEOUT_485,
  ERR_TOO_LARGE_485,
  ERR_TOO_MANY_PAGES_485,
  ERR_UNREADABLE_PDF_485,
} from "@/lib/label-check/types";

export type LabelCheckErrorCode =
  | "NO_FILE"
  | "TOO_LARGE"
  | "NOT_PDF"
  | "TOO_MANY_PAGES"
  | "UNREADABLE"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "LOGIN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "SERVER";

export const LABEL_CHECK_ERR: Record<LabelCheckErrorCode, string> = {
  NO_FILE: "PDF 파일이 필요합니다.",
  TOO_LARGE: ERR_TOO_LARGE_485,
  NOT_PDF: ERR_NOT_PDF_485,
  TOO_MANY_PAGES: ERR_TOO_MANY_PAGES_485,
  UNREADABLE: ERR_UNREADABLE_PDF_485,
  TIMEOUT: ERR_TIMEOUT_485,
  RATE_LIMIT: ERR_RATE_485,
  LOGIN: ERR_LOGIN_EXPIRED_495,
  NOT_FOUND: "결과를 찾을 수 없습니다.",
  BAD_REQUEST: "요청 형식이 올바르지 않습니다.",
  SERVER: ERR_SERVER_495,
};

export function labelCheckErrorResponse(
  code: LabelCheckErrorCode,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: LABEL_CHECK_ERR[code], code }, { status, headers });
}

/** 클라이언트: JSON이 아니거나 413일 때 동일 용량 안내 */
export async function readLabelCheckApiFailure(res: Response): Promise<{
  error: string;
  code?: string;
}> {
  const status = res.status;
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { error?: string; code?: string };
    if (j.error) return { error: j.error, code: j.code };
    if (j.code && j.code in LABEL_CHECK_ERR) {
      return {
        error: LABEL_CHECK_ERR[j.code as LabelCheckErrorCode],
        code: j.code,
      };
    }
  } catch {
    /* HTML/plain (플랫폼 413 등) */
  }
  if (status === 413) {
    return { error: ERR_TOO_LARGE_485, code: "TOO_LARGE" };
  }
  return { error: "검수에 실패했습니다.", code: "SERVER" };
}
