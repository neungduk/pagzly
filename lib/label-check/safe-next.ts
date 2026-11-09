/** 로그인 복귀 경로 — open redirect 방지 */
export function safeLabelCheckNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path = raw;
  try {
    if (raw.startsWith("http")) {
      const u = new URL(raw);
      path = u.pathname + u.search;
    }
  } catch {
    return null;
  }
  if (!path.startsWith("/label-check")) return null;
  if (path.includes("//") || path.includes("\\")) return null;
  return path;
}
