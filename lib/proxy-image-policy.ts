/**
 * 426차 W6 — /api/proxy-image 정책(순수 함수, 단위 테스트 가능).
 *  - 허용 호스트: 자기 Supabase 프로젝트 호스트(NEXT_PUBLIC_SUPABASE_URL에서)와 *.replicate.delivery. 임의의 *.supabase.co(다른 프로젝트)와 *.googleapis.com은 더 이상 중계하지 않는다.
 *  - localhost는 개발 환경(NODE_ENV !== "production")에서만.
 *  - 응답은 이미지 콘텐츠 타입(png·jpeg·webp·gif·avif)만, 크기 상한 15MB, 타임아웃 10초. SVG·octet-stream은 거절.
 */
export const PROXY_MAX_BYTES = 15 * 1024 * 1024;
export const PROXY_TIMEOUT_MS = 10_000;
const ALLOWED_TYPES = /^image\/(png|jpe?g|webp|gif|avif)(;|$)/i;

type Env = Record<string, string | undefined>;

export function allowedProxyHosts(env: Env = process.env): { exact: string[]; suffixes: string[] } {
  const exact: string[] = [];
  try {
    const u = env.NEXT_PUBLIC_SUPABASE_URL;
    if (u) exact.push(new URL(u).host.toLowerCase());
  } catch {
    /* 주소가 이상하면 Supabase 호스트는 허용하지 않는다 */
  }
  exact.push("replicate.delivery");
  return { exact, suffixes: [".replicate.delivery"] };
}

export function isAllowedProxyUrl(raw: string, env: Env = process.env): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && env.NODE_ENV !== "production")) return false;
    if (u.username || u.password) return false;
    const host = u.host.toLowerCase();
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return env.NODE_ENV !== "production";
    const { exact, suffixes } = allowedProxyHosts(env);
    return exact.includes(host) || suffixes.some((s) => u.hostname.toLowerCase().endsWith(s));
  } catch {
    return false;
  }
}

export const isAllowedImageType = (contentType: string | null | undefined): boolean => !!contentType && ALLOWED_TYPES.test(contentType);

/** 본문을 읽되 상한을 넘으면 중단하고 null(스트림 취소). 상한 이내면 합쳐서 돌려준다 */
export async function readCapped(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}
