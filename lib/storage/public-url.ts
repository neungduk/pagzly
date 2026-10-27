/**
 * 459차 — 클라이언트에서도 쓰는 공개 주소 계산(순수 함수, 비밀 없음). r2 모드의 공개 주소 앞부분은 NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL.
 * 이 값이 있으면 브라우저는 r2 모드로 본다(서버 STORAGE_PROVIDER=r2와 함께 설정할 것 — docs/r2-setup.md).
 */
export const trimSlash = (s: string): string => s.trim().replace(/\/+$/, "");

type Env = Record<string, string | undefined>;
/** Next 클라이언트 번들은 `process.env.` 뒤에 공개 변수 이름을 글자 그대로 쓴 곳만 값으로 바꾼다 — env를 넘기지 않으면 그 형태로 읽는다(테스트는 env를 주입) */
const rawBase = (env?: Env): string => (env ? env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL : process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL) ?? "";

export function storagePublicBase(env?: Env): string | null {
  const v = trimSlash(rawBase(env));
  return v ? v : null;
}

/** r2 모드(공개 주소가 설정된 경우)의 경로 → 공개 주소. 설정이 없으면 null(Supabase 주소는 클라이언트 SDK가 만든다) */
export function publicUrlFor(path: string, env?: Env): string | null {
  const base = storagePublicBase(env);
  return base ? `${base}/${path.replace(/^\/+/, "")}` : null;
}

/** R2 공개 호스트(next.config remotePatterns·proxy-image 허용에 쓴다). 설정이 없거나 주소가 잘못이면 null */
export function storagePublicHost(env?: Env): string | null {
  const base = storagePublicBase(env);
  if (!base) return null;
  try { return new URL(base).hostname || null; } catch { return null; }
}

/** URL.host(포트 포함, 소문자). proxy-image 허용 호스트 비교에 쓴다 */
export function storagePublicHostWithPort(env?: Env): string | null {
  const base = storagePublicBase(env);
  if (!base) return null;
  try { return new URL(base).host.toLowerCase() || null; } catch { return null; }
}

/** next.config images.remotePatterns 항목(R2 공개 주소가 설정되고 https일 때만, 아니면 null). 주소에 경로가 있으면 그 아래만 허용 */
export function storageRemotePattern(env?: Env): { protocol: "https"; hostname: string; port?: string; pathname: string } | null {
  const base = storagePublicBase(env);
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.protocol !== "https:" || !u.hostname) return null;
    const prefix = u.pathname.replace(/\/+$/, "");
    return { protocol: "https", hostname: u.hostname, ...(u.port ? { port: u.port } : {}), pathname: `${prefix}/**` };
  } catch {
    return null;
  }
}

/** 우리 R2 공개 주소(설정된 공개 주소 아래)인지 — 서버가 클라이언트가 보낸 주소를 읽기 전 검사하는 데 쓴다(설정이 없으면 항상 false) */
export function isStoragePublicUrl(u: string, env?: Env): boolean {
  const base = storagePublicBase(env);
  if (!base) return false;
  try {
    const b = new URL(base), x = new URL(u);
    const prefix = b.pathname.replace(/\/+$/, "");
    return x.protocol === "https:" && x.host.toLowerCase() === b.host.toLowerCase() && (prefix === "" || x.pathname === prefix || x.pathname.startsWith(`${prefix}/`));
  } catch {
    return false;
  }
}
