/**
 * 499 — label-check 클라 제출: 추출 JSON 우선, 실패 시 ≤4MB 업로드 폴백.
 * (client-extract-pdf는 여기서만 동적 import)
 */
import { readLabelCheckApiFailure } from "@/lib/label-check/api-errors";
import {
  MAX_CLIENT_PDF_BYTES_499,
  MAX_EXTRACTED_JSON_BYTES_499,
  type ExtractedLabelPayload,
} from "@/lib/label-check/extracted-payload-shared";
import {
  ERR_TOO_LARGE_485,
  ERR_TOO_MANY_PAGES_485,
  MAX_PDF_BYTES_483,
  type LabelCheckInput,
  type LabelCheckResult,
} from "@/lib/label-check/types";

export const PROGRESS_CLIENT_EXTRACT_499 = "내 컴퓨터에서 글자를 읽는 중";

/** 클라 전용 — extracted-payload(서버) import 금지 */
function pagesTextFromPayloadClient(payload: ExtractedLabelPayload): string {
  return payload.pages
    .map((p) => p.items.map((i) => i.text).join(""))
    .filter((t) => t.trim())
    .join("\n");
}

export type ClientSubmitOptions = LabelCheckInput & {
  save?: boolean;
  productName?: string;
  /** 506 — 텍스트 모드 */
  text?: string;
  scope?: "ad_only" | "full";
  priorKeys?: string[];
  /** 508 — 사진 OCR 후 고객 확인 글자 */
  ocrFromPhoto?: boolean;
  avgOcrConfidence?: number;
};

export type ClientSubmitOk = {
  ok: true;
  result: LabelCheckResult & { savedId?: string | null; saveError?: string | null };
  /** 517 — 클라가 이미 가진 읽은 글자(화면 핀용). 서버 저장 안 함 */
  sourceText?: string;
};
export type ClientSubmitFail = { ok: false; error: string; status?: number };
export type ClientSubmitProgress = (msg: string | null) => void;

function commonJsonOpts(opts: ClientSubmitOptions): Record<string, unknown> {
  return {
    rinseOff: opts.rinseOff,
    functional: opts.functional,
    market: opts.market ?? "KR",
    imported: Boolean(opts.imported),
    professionalUse: Boolean(opts.professionalUse),
    hazardous: Boolean(opts.hazardous),
    otcDrugLike: Boolean(opts.otcDrugLike),
    productTypes: (opts.productTypes || []).join(","),
    save: Boolean(opts.save),
    productName: opts.productName ?? "",
    scope: opts.scope,
    priorKeys: opts.priorKeys,
  };
}

async function postExtracted(
  payload: ExtractedLabelPayload,
  opts: ClientSubmitOptions,
): Promise<Response> {
  const body = JSON.stringify({
    extracted: payload,
    ...commonJsonOpts(opts),
  });
  const bytes = new TextEncoder().encode(body).length;
  if (bytes > MAX_EXTRACTED_JSON_BYTES_499) {
    throw Object.assign(new Error("TOO_LARGE"), { code: "TOO_LARGE" });
  }
  return fetch("/api/label-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

/** 506 — 문구 붙여넣기 / 다시 점검 */
export async function submitLabelCheckTextClient(
  text: string,
  opts: ClientSubmitOptions,
): Promise<ClientSubmitOk | ClientSubmitFail> {
  const body = JSON.stringify({
    text,
    ...commonJsonOpts({
      ...opts,
      scope: opts.scope ?? "ad_only",
    }),
    ocrFromPhoto: Boolean(opts.ocrFromPhoto),
    avgOcrConfidence: opts.avgOcrConfidence,
  });
  const res = await fetch("/api/label-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const fail = await readLabelCheckApiFailure(res);
    return { ok: false, error: fail.error, status: res.status };
  }
  const result = (await res.json()) as LabelCheckResult & {
    savedId?: string | null;
    saveError?: string | null;
  };
  return { ok: true, result, sourceText: text };
}

async function postFile(file: File, opts: ClientSubmitOptions): Promise<Response> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("rinseOff", String(opts.rinseOff));
  fd.set("functional", String(opts.functional));
  fd.set("market", opts.market ?? "KR");
  fd.set("imported", String(Boolean(opts.imported)));
  fd.set("professionalUse", String(Boolean(opts.professionalUse)));
  fd.set("hazardous", String(Boolean(opts.hazardous)));
  fd.set("otcDrugLike", String(Boolean(opts.otcDrugLike)));
  fd.set("productTypes", (opts.productTypes || []).join(","));
  fd.set("save", String(Boolean(opts.save)));
  fd.set("productName", opts.productName ?? "");
  return fetch("/api/label-check", { method: "POST", body: fd });
}

export function assertClientPdfSize(file: File): string | null {
  const isImage = /^image\//i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (isImage) {
    if (file.size > 10 * 1024 * 1024) {
      return "이미지 파일이 너무 큽니다(장당 10MB 이하).";
    }
    return null;
  }
  if (file.size > MAX_CLIENT_PDF_BYTES_499) {
    return `PDF가 너무 큽니다. 점검용 파일은 ${Math.floor(MAX_CLIENT_PDF_BYTES_499 / (1024 * 1024))}MB 이하로 준비해 주세요.`;
  }
  return null;
}

export async function submitLabelCheckClient(
  file: File,
  opts: ClientSubmitOptions,
  onProgress?: ClientSubmitProgress,
): Promise<ClientSubmitOk | ClientSubmitFail> {
  const sizeErr = assertClientPdfSize(file);
  if (sizeErr) return { ok: false, error: sizeErr };

  let extracted: ExtractedLabelPayload | null = null;
  try {
    onProgress?.(PROGRESS_CLIENT_EXTRACT_499);
    const { extractLabelPdfInBrowser } = await import("@/lib/label-check/client-extract-pdf");
    extracted = await extractLabelPdfInBrowser(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "TOO_MANY_PAGES") {
      return { ok: false, error: ERR_TOO_MANY_PAGES_485 };
    }
    extracted = null;
  } finally {
    onProgress?.(null);
  }

  try {
    let res: Response;
    if (extracted) {
      try {
        res = await postExtracted(extracted, opts);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "TOO_LARGE") return { ok: false, error: ERR_TOO_LARGE_485 };
        // JSON 전송 실패 → 폴백 시도
        if (file.size <= MAX_PDF_BYTES_483) {
          res = await postFile(file, opts);
        } else {
          return { ok: false, error: ERR_TOO_LARGE_485 };
        }
      }
    } else if (file.size <= MAX_PDF_BYTES_483) {
      res = await postFile(file, opts);
    } else {
      return { ok: false, error: ERR_TOO_LARGE_485 };
    }

    if (!res.ok) {
      const fail = await readLabelCheckApiFailure(res);
      return { ok: false, error: fail.error, status: res.status };
    }
    const result = (await res.json()) as LabelCheckResult & {
      savedId?: string | null;
      saveError?: string | null;
    };
    const sourceText = extracted ? pagesTextFromPayloadClient(extracted) : undefined;
    return { ok: true, result, sourceText };
  } catch {
    return { ok: false, error: "네트워크 오류로 검수에 실패했습니다." };
  }
}
