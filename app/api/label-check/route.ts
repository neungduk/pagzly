/**
 * 485/495/498/499 — 화장품 표시사항 PDF 검수 API.
 * 499: JSON(ExtractedLabelPayload) 우선 경로 + 기존 FormData 업로드 유지.
 * 로그인+save=true 일 때만 결과 요약 저장(원문·파일명 금지).
 */
import { labelCheckErrorResponse, type LabelCheckErrorCode } from "@/lib/label-check/api-errors";
import { validatePriorKeys506 } from "@/lib/label-check/compare-506";
import {
  payloadToExtractedPdf,
  validateExtractedPayload,
} from "@/lib/label-check/extracted-payload";
import { saveLabelCheckRun } from "@/lib/label-check/save-run";
import {
  assertTextModeLength506,
  parseTextModeScope506,
  textToExtractedPdf506,
} from "@/lib/label-check/text-mode-506";
import {
  ERR_NOT_PDF_485,
  ERR_TIMEOUT_485,
  ERR_TOO_LARGE_485,
  ERR_TOO_MANY_PAGES_485,
  ERR_UNREADABLE_PDF_485,
  MAX_PDF_BYTES_483,
  type LabelCheckInput,
  type LabelMarket,
} from "@/lib/label-check/types";
import { runLabelCheck483, runLabelCheckFromExtracted } from "@/lib/label-check/run-check";
import {
  assertPageLimit,
  assertPdfSignature,
  countPdfPages,
  labelCheckClientIp,
  labelCheckLimiter,
  labelCheckMemberLimiter,
  withExtractTimeout,
} from "@/lib/label-check/safe-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 498 — 추출 20s + 여유. Next는 리터럴 export만 허용 */
export const maxDuration = 30;

function mapUploadError(message: string) {
  if (message === ERR_TOO_LARGE_485) return labelCheckErrorResponse("TOO_LARGE", 400);
  if (message === ERR_NOT_PDF_485) return labelCheckErrorResponse("NOT_PDF", 400);
  if (message === ERR_TOO_MANY_PAGES_485) return labelCheckErrorResponse("TOO_MANY_PAGES", 400);
  if (message === ERR_TIMEOUT_485) return labelCheckErrorResponse("TIMEOUT", 408);
  if (message === ERR_UNREADABLE_PDF_485) return labelCheckErrorResponse("UNREADABLE", 400);
  return labelCheckErrorResponse("SERVER", 500);
}

function parseOptions(src: Record<string, unknown> | FormData): {
  input: LabelCheckInput;
  save: boolean;
  productName: string | null;
} {
  const get = (k: string) =>
    src instanceof FormData ? String(src.get(k) ?? "") : String(src[k] ?? "");
  const bool = (k: string) => {
    if (src instanceof FormData) return get(k) === "true";
    return src[k] === true || src[k] === "true";
  };
  const marketRaw = get("market").toUpperCase() || "KR";
  const market: LabelMarket = marketRaw === "US" ? "US" : "KR";
  const productNameRaw = get("productName").trim();
  const scopeRaw =
    src instanceof FormData ? get("scope") : (src as Record<string, unknown>).scope;
  const priorRaw =
    src instanceof FormData
      ? (() => {
          try {
            return JSON.parse(get("priorKeys") || "[]");
          } catch {
            return null;
          }
        })()
      : (src as Record<string, unknown>).priorKeys;
  const priorKeys = validatePriorKeys506(priorRaw);
  return {
    input: {
      rinseOff: bool("rinseOff"),
      functional: bool("functional"),
      market,
      imported: bool("imported"),
      professionalUse: bool("professionalUse"),
      hazardous: bool("hazardous"),
      otcDrugLike: bool("otcDrugLike"),
      productTypes: get("productTypes")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      scope: scopeRaw != null && String(scopeRaw).trim() ? parseTextModeScope506(scopeRaw) : undefined,
      priorKeys: priorKeys === null ? undefined : priorKeys,
    },
    save: bool("save"),
    productName: productNameRaw ? productNameRaw.slice(0, 80) : null,
  };
}

async function finishResult(
  result: Awaited<ReturnType<typeof runLabelCheck483>>,
  opts: {
    save: boolean;
    userId: string | undefined;
    productName: string | null;
    input: LabelCheckInput;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any;
  },
) {
  let savedId: string | null = null;
  let saveError: string | null = null;
  // 508 — unreadable 결과는 저장하지 않음(기록·통계 오염 방지)
  if (
    opts.save &&
    opts.userId &&
    !result.skipJudgment &&
    result.readStatus !== "unreadable"
  ) {
    const saved = await saveLabelCheckRun(opts.supabase, opts.userId, {
      market: opts.input.market ?? "KR",
      productName: opts.productName,
      options: {
        rinseOff: opts.input.rinseOff,
        functional: opts.input.functional,
        imported: Boolean(opts.input.imported),
        professionalUse: Boolean(opts.input.professionalUse),
        hazardous: Boolean(opts.input.hazardous),
        otcDrugLike: Boolean(opts.input.otcDrugLike),
      },
      result,
    });
    if ("id" in saved) savedId = saved.id;
    else {
      saveError = "save_failed";
      console.warn("[label-check] save-failed");
    }
  }
  console.log(
    `[label-check] ok readable=${result.readable} skip=${Boolean(result.skipJudgment)} findings=${result.findings.length} saved=${Boolean(savedId)}`,
  );
  return Response.json({ ...result, savedId, saveError });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = labelCheckClientIp(req.headers);
    const limiter = user ? labelCheckMemberLimiter : labelCheckLimiter;
    const rateKey = user ? `u:${user.id}` : `ip:${ip}`;
    const rate = limiter.check(rateKey);
    if (!rate.allowed) {
      return labelCheckErrorResponse("RATE_LIMIT", 429, {
        "Retry-After": String(rate.retryAfterSec),
      });
    }

    const ct = req.headers.get("content-type") || "";

    // 499 — 클라 추출 JSON / 506 — 텍스트 모드
    if (ct.includes("application/json")) {
      const rawText = await req.text();
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        return labelCheckErrorResponse("BAD_REQUEST", 400);
      }
      const { input, save, productName } = parseOptions(body);

      // 506 — text 필드가 있으면 문구 붙여넣기 경로
      if (typeof body.text === "string") {
        const len = assertTextModeLength506(body.text);
        if (len === "empty") return labelCheckErrorResponse("NO_FILE", 400);
        if (len === "too_large") return labelCheckErrorResponse("TOO_LARGE", 400);
        const scope = parseTextModeScope506(body.scope ?? input.scope ?? "ad_only");
        const ocrFromPhoto = body.ocrFromPhoto === true || body.ocrFromPhoto === "true";
        const avgOcr =
          typeof body.avgOcrConfidence === "number" ? body.avgOcrConfidence : null;
        const extracted = textToExtractedPdf506(body.text, {
          ocrFromPhoto,
          avgConfidence: avgOcr,
        });
        const timed = await withExtractTimeout(
          runLabelCheckFromExtracted(extracted, { ...input, scope }),
        );
        if (!timed.ok) {
          console.warn("[label-check] extract-limit");
          return mapUploadError(timed.error);
        }
        let result = timed.value;
        if (ocrFromPhoto) {
          result = { ...result, ocrFromPhoto: true };
          // 용량 불일치 finding(정규화 재검)
          const { normalizeOcrText508, NET_CONTENT_CONFLICT_LABEL_508, NET_CONTENT_CONFLICT_SUGGEST_508 } =
            await import("@/lib/label-check/ocr/normalize-ocr");
          const norm = normalizeOcrText508(body.text);
          if (norm.netContentConflict && !result.skipJudgment) {
            const findings = [
              ...result.findings,
              {
                category: "OCR",
                label: NET_CONTENT_CONFLICT_LABEL_508,
                status: "attention" as const,
                found: norm.netContents.map((h) => h.raw).slice(0, 4).join(" / "),
                suggest: NET_CONTENT_CONFLICT_SUGGEST_508,
                checkType: "code" as const,
                checkKey: "OCR-NET-CONFLICT",
              },
            ];
            const summary = { ...result.summary, attention: (result.summary.attention || 0) + 1 };
            result = { ...result, findings, summary };
          }
        }
        return finishResult(result, {
          save,
          userId: user?.id,
          productName,
          input: { ...input, scope },
          supabase,
        });
      }

      if (body.priorKeys != null && validatePriorKeys506(body.priorKeys) === null) {
        return labelCheckErrorResponse("BAD_REQUEST", 400);
      }

      const validated = validateExtractedPayload(body.extracted, Buffer.byteLength(rawText, "utf8"));
      if (!validated.ok) {
        const code = validated.code as LabelCheckErrorCode;
        const status = code === "TOO_LARGE" || code === "TOO_MANY_PAGES" ? 400 : 400;
        return labelCheckErrorResponse(code === "TOO_LARGE" ? "TOO_LARGE" : code, status);
      }
      const extracted = payloadToExtractedPdf(validated.payload);
      const timed = await withExtractTimeout(runLabelCheckFromExtracted(extracted, input));
      if (!timed.ok) {
        console.warn("[label-check] extract-limit");
        return mapUploadError(timed.error);
      }
      return finishResult(timed.value, {
        save,
        userId: user?.id,
        productName,
        input,
        supabase,
      });
    }

    const form = await req.formData();
    const { input, save, productName } = parseOptions(form);
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return labelCheckErrorResponse("NO_FILE", 400);
    }
    if (file.size > MAX_PDF_BYTES_483) {
      return labelCheckErrorResponse("TOO_LARGE", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sigErr = assertPdfSignature(buffer);
    if (sigErr) {
      return mapUploadError(sigErr);
    }

    const pageInfo = await countPdfPages(buffer);
    if ("error" in pageInfo) {
      return mapUploadError(pageInfo.error);
    }
    const pageErr = assertPageLimit(pageInfo.pages);
    if (pageErr) {
      return mapUploadError(pageErr);
    }

    const timed = await withExtractTimeout(runLabelCheck483(buffer, input));
    if (!timed.ok) {
      console.warn("[label-check] extract-limit");
      return mapUploadError(timed.error);
    }

    return finishResult(timed.value, {
      save,
      userId: user?.id,
      productName,
      input,
      supabase,
    });
  } catch {
    console.warn("[label-check] failed");
    return labelCheckErrorResponse("SERVER", 500);
  }
}
