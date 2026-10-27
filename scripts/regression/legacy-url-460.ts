/** 회귀 — 460차 옛 Supabase 주소 ↔ 경로 ↔ R2 주소 변환(순수 함수, 네트워크 없음). */
import { legacyPathOf, legacyToR2, r2UrlOf, replaceLegacyInText } from "../../lib/storage/legacy-url";

export const name = "옛 Supabase 주소 → R2 주소 변환 — 쿼리·인코딩·중복 슬래시·다른 호스트/버킷 거절·본문 치환";

const H = { hosts: ["proj-a.supabase.co"] };
const R2 = "https://img.example.com/";
const P = "https://proj-a.supabase.co/storage/v1/object/public/images/";

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (got !== want) f.push(`${label}: ${String(got)} ≠ ${String(want)}`); };

  eq("기본", legacyPathOf(`${P}u1/a.png`, H), "u1/a.png");
  eq("쿼리 제거", legacyToR2(`${P}u1/a.png?t=123`, R2, H), "https://img.example.com/u1/a.png");
  eq("조각 제거", legacyToR2(`${P}u1/a.png#x`, R2, H), "https://img.example.com/u1/a.png");
  eq("중복 슬래시", legacyPathOf(`${P}u1//a.png`, H), "u1/a.png");
  eq("경로 앞 중복 슬래시", legacyPathOf("https://proj-a.supabase.co//storage//v1/object/public/images//u1/a.png", H), "u1/a.png");
  eq("인코딩 공백", legacyPathOf(`${P}u1/a%20b.png`, H), "u1/a b.png");
  eq("재인코딩", legacyToR2(`${P}u1/a%20b.png`, R2, H), "https://img.example.com/u1/a%20b.png");
  eq("한글", legacyToR2(`${P}u1/${encodeURIComponent("사진")}.png`, R2, H), `https://img.example.com/u1/${encodeURIComponent("사진")}.png`);
  eq("호스트 대소문자", legacyPathOf(`https://PROJ-A.supabase.co/storage/v1/object/public/images/u1/a.png`, H), "u1/a.png");
  eq("다른 프로젝트", legacyPathOf("https://proj-b.supabase.co/storage/v1/object/public/images/u1/a.png", H), null);
  eq("다른 버킷", legacyPathOf("https://proj-a.supabase.co/storage/v1/object/public/other/u1/a.png", H), null);
  eq("http 거절", legacyPathOf("http://proj-a.supabase.co/storage/v1/object/public/images/u1/a.png", H), null);
  { const t = legacyPathOf(`${P}u1/%2e%2e/a.png`, H); if (t !== null && t.split("/").includes("..")) f.push("경로 탈출 통과"); }
  eq("인코딩 슬래시 탈출", legacyPathOf(`${P}u1/..%2fa.png`, H), null);
  eq("빈 경로", legacyPathOf(P, H), null);
  eq("깨진 인코딩", legacyPathOf(`${P}u1/%E0%A4%A`, H), null);
  eq("URL 아님", legacyPathOf("not a url", H), null);
  eq("호스트 목록 비어 있음", legacyPathOf(`${P}u1/a.png`, { hosts: [] }), null);
  eq("userinfo 거절", legacyPathOf("https://x@proj-a.supabase.co/storage/v1/object/public/images/u1/a.png", H), null);
  eq("base 끝 슬래시", r2UrlOf("u1/a.png", "https://img.example.com///"), "https://img.example.com/u1/a.png");

  const body = JSON.stringify({ a: `${P}u1/a.png?x=1`, b: [`${P}u1/b.webp`, "https://elsewhere.com/storage/v1/object/public/images/u1/c.png"], d: "https://proj-b.supabase.co/storage/v1/object/public/images/u1/e.png" });
  const r = replaceLegacyInText(body, R2, H);
  eq("본문 치환 개수", r.count, 2);
  if (r.text.includes("proj-a.supabase.co")) f.push("본문에 옛 주소 잔존");
  if (!r.text.includes("proj-b.supabase.co") || !r.text.includes("elsewhere.com")) f.push("허용 밖 호스트가 바뀜");
  try { JSON.parse(r.text); } catch { f.push("치환 뒤 JSON 깨짐"); }
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
