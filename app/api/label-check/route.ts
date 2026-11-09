/**
 * 485/495/498 — 화장품 표시사항 PDF 검수 API.
 * 메모리 점검. 로그인+save=true 일 때만 결과 요약 저장(원문·파일명 금지).
 */
import { labelCheckErrorResponse } from "@/lib/label-check/api-errors";
import { saveLabelCheckRun } from "@/lib/label-check/save-run";
import {
  ERR_NOT_PDF_485,
  ERR_TIMEOUT_485,
  ERR_TOO_LARGE_485,
  ERR_TOO_MANY_PAGES_485,
  ERR_UNREADABLE_PDF_485,
  MAX_PDF_BYTES_483,
} from "@/lib/label-check/types";
import { runLabelCheck483 } from "@/lib/label-check/run-check";
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

    const form = await req.formData();
    const file = form.get("file");
    const rinseOff = String(form.get("rinseOff") ?? "false") === "true";
    const functional = String(form.get("functional") ?? "false") === "true";
    const marketRaw = String(form.get("market") ?? "KR").toUpperCase();
    const market = marketRaw === "US" ? "US" : "KR";
    const imported = String(form.get("imported") ?? "false") === "true";
    const professionalUse = String(form.get("professionalUse") ?? "false") === "true";
    const hazardous = String(form.get("hazardous") ?? "false") === "true";
    const otcDrugLike = String(form.get("otcDrugLike") ?? "false") === "true";
    const save = String(form.get("save") ?? "false") === "true";
    const productNameRaw = String(form.get("productName") ?? "").trim();
    const productName = productNameRaw ? productNameRaw.slice(0, 80) : null;

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

    const timed = await withExtractTimeout(
      runLabelCheck483(buffer, {
        rinseOff,
        functional,
        market,
        imported,
        professionalUse,
        hazardous,
        otcDrugLike,
      }),
    );
    if (!timed.ok) {
      console.warn("[label-check] extract-limit");
      return mapUploadError(timed.error);
    }

    const result = timed.value;
    let savedId: string | null = null;
    let saveError: string | null = null;

    if (save && user && !result.skipJudgment) {
      const saved = await saveLabelCheckRun(supabase, user.id, {
        market,
        productName,
        options: {
          rinseOff,
          functional,
          imported,
          professionalUse,
          hazardous,
          otcDrugLike,
        },
        result,
      });
      if ("id" in saved) savedId = saved.id;
      else {
        saveError = "save_failed";
        console.warn("[label-check] save-failed");
      }
    }

    // 파일명·본문·경로 로그 금지
    console.log(
      `[label-check] ok readable=${result.readable} skip=${Boolean(result.skipJudgment)} findings=${result.findings.length} saved=${Boolean(savedId)}`,
    );
    return Response.json({
      ...result,
      savedId,
      saveError,
    });
  } catch {
    console.warn("[label-check] failed");
    return labelCheckErrorResponse("SERVER", 500);
  }
}
