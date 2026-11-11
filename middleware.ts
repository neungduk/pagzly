import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** 520 — 토스 CORS 프리플라이트: 세션 갱신 없이 통과 */
const TOSS_CORS_OPTIONS_PATHS = new Set([
  "/api/label-check",
  "/api/label-check/ocr",
  "/api/law-watch/baseline",
]);

export async function middleware(request: NextRequest) {
  if (
    request.method === "OPTIONS" &&
    TOSS_CORS_OPTIONS_PATHS.has(request.nextUrl.pathname)
  ) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
