/**
 * 485 — 화장품 표시사항 PDF 검수 API.
 * 메모리만 사용, 저장·파일명·본문 로그 없음. 유료 AI/OCR 없음.
 */
import { NextResponse } from "next/server";
import {
  ERR_RATE_485,
  ERR_TOO_LARGE_485,
  MAX_PDF_BYTES_483,
} from "@/lib/label-check/types";
import { runLabelCheck483 } from "@/lib/label-check/run-check";
import {
  assertPageLimit,
  assertPdfSignature,
  countPdfPages,
  labelCheckClientIp,
  labelCheckLimiter,
  withExtractTimeout,
} from "@/lib/label-check/safe-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = labelCheckClientIp(req.headers);
    const rate = labelCheckLimiter.check(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: ERR_RATE_485 },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const rinseOff = String(form.get("rinseOff") ?? "false") === "true";
    const functional = String(form.get("functional") ?? "false") === "true";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES_483) {
      return NextResponse.json({ error: ERR_TOO_LARGE_485 }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sigErr = assertPdfSignature(buffer);
    if (sigErr) {
      return NextResponse.json({ error: sigErr }, { status: 400 });
    }

    const pageInfo = await countPdfPages(buffer);
    if ("error" in pageInfo) {
      return NextResponse.json({ error: pageInfo.error }, { status: 400 });
    }
    const pageErr = assertPageLimit(pageInfo.pages);
    if (pageErr) {
      return NextResponse.json({ error: pageErr }, { status: 400 });
    }

    const timed = await withExtractTimeout(runLabelCheck483(buffer, { rinseOff, functional }));
    if (!timed.ok) {
      console.warn("[label-check] extract-limit");
      return NextResponse.json({ error: timed.error }, { status: 408 });
    }

    const result = timed.value;
    // 파일명·본문·경로 로그 금지
    console.log(
      `[label-check] ok readable=${result.readable} skip=${Boolean(result.skipJudgment)} findings=${result.findings.length}`,
    );
    return NextResponse.json(result);
  } catch {
    console.warn("[label-check] failed");
    return NextResponse.json({ error: "검수 중 오류가 발생했습니다." }, { status: 500 });
  }
}
