/**
 * 483 — 화장품 표시사항 PDF 검수 API.
 * 업로드는 메모리만 사용, 저장·본문 로그 없음. 유료 AI/OCR 호출 없음.
 */
import { NextResponse } from "next/server";
import { MAX_PDF_BYTES_483 } from "@/lib/label-check/types";
import { runLabelCheck483 } from "@/lib/label-check/run-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const rinseOff = String(form.get("rinseOff") ?? "false") === "true";
    const functional = String(form.get("functional") ?? "false") === "true";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES_483) {
      return NextResponse.json({ error: "파일은 최대 10MB까지 가능합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runLabelCheck483(buffer, { rinseOff, functional });
    // buffer는 스코프 종료와 함께 폐기. 본문/파일명 상세 로그 금지.
    console.log(`[label-check] ok readable=${result.readable} findings=${result.findings.length}`);
    return NextResponse.json(result);
  } catch {
    console.warn("[label-check] failed");
    return NextResponse.json({ error: "검수 중 오류가 발생했습니다." }, { status: 500 });
  }
}
