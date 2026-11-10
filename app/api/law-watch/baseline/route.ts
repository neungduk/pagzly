import { NextResponse } from "next/server";
import { getLawWatchBaselineLabel516 } from "@/lib/law-watch/baseline-date";

/** 516 — 화면용 법령 확인 기준일(공개, 민감정보 없음). 실패 시 line=null */
export async function GET() {
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
