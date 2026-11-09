import { NextResponse } from "next/server";
import { DETAIL_PAGE_DISABLED_ERROR, isDetailPageEnabled } from "@/lib/feature-flags";

/**
 * 489 — 상세페이지 기능 꺼짐 시 라우트 최상단에서 즉시 거절(외부 유료 호출 전).
 * null이면 통과. 응답에 키·경로·스택 없음.
 */
export function detailPageDisabledResponse(): NextResponse | null {
  if (isDetailPageEnabled()) return null;
  return NextResponse.json({ error: DETAIL_PAGE_DISABLED_ERROR }, { status: 503 });
}
