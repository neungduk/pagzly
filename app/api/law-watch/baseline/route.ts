import { NextResponse } from "next/server";
import { getLawWatchBaselineLabel516 } from "@/lib/law-watch/baseline-date";
import { preflight520, withCors520 } from "@/lib/label-check/cors-520";

/** 520 — 토스 프리플라이트 */
export function OPTIONS(req: Request) {
  return preflight520(req);
}

/** 516 — 화면용 법령 확인 기준일(공개, 민감정보 없음). 실패 시 line=null */
export async function GET(req: Request) {
  return withCors520(req, await getBaseline516());
}

async function getBaseline516(): Promise<Response> {
  try {
    const line = await getLawWatchBaselineLabel516();
    return NextResponse.json(
      { line: line ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ line: null }, { status: 200 });
  }
}
