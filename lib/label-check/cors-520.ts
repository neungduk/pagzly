/**
 * 520 — 토스 미니앱 CORS. LABEL_TOSS_ENABLED=1 일 때만 헤더를 붙인다.
 * Access-Control-Allow-Credentials 금지. * 와일드카드 금지.
 */

const TOSS_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.apps\.tossmini\.com$/;

export function isTossCorsEnabled520(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.LABEL_TOSS_ENABLED || "").trim() === "1";
}

/** 허용 Origin이면 그 문자열, 아니면 null */
export function allowedOrigin520(
  origin: string | null,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!isTossCorsEnabled520(env)) return null;
  if (!origin) return null;
  if (TOSS_ORIGIN_RE.test(origin)) return origin;
  const extra = (env.LABEL_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra.includes(origin)) return origin;
  return null;
}

function mergeVary(existing: string | null, value: string): string {
  if (!existing) return value;
  const parts = existing.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.some((p) => p.toLowerCase() === value.toLowerCase())) return existing;
  return `${existing}, ${value}`;
}

/** 허용 Origin이면 CORS 헤더를 붙인 새 Response. 아니면 원본. */
export function withCors520(req: Request, res: Response, env: NodeJS.ProcessEnv = process.env): Response {
  if (!isTossCorsEnabled520(env)) return res;
  const origin = allowedOrigin520(req.headers.get("origin"), env);
  if (!origin) return res;
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", mergeVary(headers.get("Vary"), "Origin"));
  // Credentials 절대 금지
  headers.delete("Access-Control-Allow-Credentials");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/** OPTIONS 프리플라이트 — 항상 204. 허용 Origin일 때만 CORS 헤더. */
export function preflight520(req: Request, env: NodeJS.ProcessEnv = process.env): Response {
  const headers = new Headers();
  if (isTossCorsEnabled520(env)) {
    const origin = allowedOrigin520(req.headers.get("origin"), env);
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Max-Age", "86400");
    }
  }
  return new Response(null, { status: 204, headers });
}
