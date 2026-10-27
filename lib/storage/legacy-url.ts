/**
 * 460차 — Supabase 공개 주소 ↔ 경로 ↔ R2 공개 주소 변환(순수 함수, 비밀 없음). 이전 스크립트·SQL 문서·회귀가 같은 규칙을 쓴다.
 * 형식: https://<project>.supabase.co/storage/v1/object/public/images/<path>[?쿼리][#조각]
 * 다른 프로젝트 호스트·다른 버킷·http는 거절한다(허용 호스트를 호출부가 넘긴다 — 코드에 프로젝트 이름을 박지 않는다).
 */
const MARK = "/storage/v1/object/public/images/";

export type LegacyUrlOpts = { hosts: string[] };

const hostSet = (hosts: string[]): Set<string> => new Set(hosts.map((h) => h.trim().toLowerCase()).filter(Boolean));

/** 주소에서 버킷 안 경로를 뽑는다(디코딩된 경로). 형식이 다르면 null */
export function legacyPathOf(rawUrl: string, opts: LegacyUrlOpts): string | null {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  if (!hostSet(opts.hosts).has(u.host.toLowerCase())) return null;
  const pn = u.pathname.replace(/\/{2,}/g, "/");
  if (!pn.startsWith(MARK)) return null;
  const encoded = pn.slice(MARK.length);
  if (!encoded) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(encoded); } catch { return null; }
  const segs = decoded.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) return null;
  return decoded;
}

/** 경로 → R2 공개 주소. 경로의 각 조각을 다시 인코딩한다(공백·한글 등). baseUrl 끝 슬래시는 정리 */
export function r2UrlOf(path: string, r2BaseUrl: string): string {
  const base = r2BaseUrl.trim().replace(/\/+$/, "");
  return `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Supabase 공개 주소 → R2 공개 주소(쿼리·조각은 버린다 — 객체 주소에는 의미가 없다). 변환 불가면 null */
export function legacyToR2(rawUrl: string, r2BaseUrl: string, opts: LegacyUrlOpts): string | null {
  const p = legacyPathOf(rawUrl, opts);
  return p ? r2UrlOf(p, r2BaseUrl) : null;
}

/** 문자열(JSON 본문 등) 안의 모든 옛 주소를 바꾼다. 바꾼 개수도 돌려준다 */
export function replaceLegacyInText(text: string, r2BaseUrl: string, opts: LegacyUrlOpts): { text: string; count: number } {
  let count = 0;
  const out = text.replace(/https:\/\/[A-Za-z0-9.-]+\/storage\/v1\/object\/public\/images\/[^\s"'<>\\)]+/g, (m) => {
    const r = legacyToR2(m, r2BaseUrl, opts);
    if (!r) return m;
    count += 1;
    return r;
  });
  return { text: out, count };
}
