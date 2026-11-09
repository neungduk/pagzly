/** 클라이언트·서버 공용 — 파일 시스템 의존 없음 */
import type { FixKind } from "@/lib/label-check/types";

export function fixKindHeading496(kind: FixKind | undefined): string {
  if (kind === "evidence") return "근거 자료 확인";
  if (kind === "soften") return "표현 완화 예시";
  return "수정 제안";
}
