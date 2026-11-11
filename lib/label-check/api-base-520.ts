/**
 * 520 — 토스 미니앱 등 다른 Origin에서 API를 부를 때 절대 URL.
 * NEXT_PUBLIC_LABEL_API_BASE 가 없으면 path 그대로(웹과 동일).
 */
export function labelApiUrl(path: string, env: NodeJS.ProcessEnv = process.env): string {
  if (typeof path !== "string" || !path.startsWith("/api/")) return path;
  const raw = (env.NEXT_PUBLIC_LABEL_API_BASE || "").trim();
  if (!raw) return path;
  const base = raw.replace(/\/+$/, "");
  return `${base}${path}`;
}
