/**
 * 회귀 — 459차 이미지 저장소 전환 계층(브라우저·네트워크 없음: 가짜 클라이언트 주입, R2 서명은 로컬 계산).
 * ① provider 선택(기본 supabase·잘못된 값 오류·r2 환경변수 누락 오류에 값 없음) ② R2 provider(put·url·remove·서명 PUT: 키·헤더·Content-Length·5분 만료)
 * ③ supabase 모드는 기존 호출 형태 유지 ④ 업로드·삭제 요청 검증(비로그인 401·다른 사용자 경로 403·경로 탈출·형식·크기) ⑤ 클라이언트 업로드(두 모드)
 * ⑥ 정적: `supabase.storage` 직접 호출이 허용 목록뿐·R2 비밀 이름이 "use client" 파일에 없음·클라이언트가 서버 전용 모듈을 안 가져옴 ⑦ 호스트 계산(next.config·proxy-image·scene-images).
 */
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getStorage, readR2Config, resolveProviderName, StorageConfigError } from "../../lib/storage";
import { createR2Provider } from "../../lib/storage/r2-provider";
import { createSupabaseProvider } from "../../lib/storage/supabase-provider";
import { removeUploaded, uploadImage } from "../../lib/storage/client-upload";
import { CACHE_IMMUTABLE, CACHE_SHORT, isOwnPath, MAX_UPLOAD_BYTES, SIGNED_URL_TTL_SECONDS } from "../../lib/storage/policy";
import { isStoragePublicUrl, publicUrlFor, storagePublicHost, storageRemotePattern } from "../../lib/storage/public-url";
import { planRemove, planUpload } from "../../lib/storage/validate";
import { allowedProxyHosts, isAllowedProxyUrl } from "../../lib/proxy-image-policy";

export const name = "이미지 저장소 전환 계층 — provider 선택·R2 서명·supabase 호출 형태·요청 검증·정적 검사·호스트 계산";

const R2_ENV = { STORAGE_PROVIDER: "r2", R2_ACCOUNT_ID: "acct123", R2_ACCESS_KEY_ID: "testkeyid", R2_SECRET_ACCESS_KEY: "testsecretvalue", R2_BUCKET: "pagzly-images", R2_PUBLIC_BASE_URL: "https://img.example.com/" };

type Call = { op: string; args: unknown[] };
function fakeSupabase(): { client: SupabaseClient; calls: Call[] } {
  const calls: Call[] = [];
  const bucket = (b: string) => ({
    upload: async (...args: unknown[]) => { calls.push({ op: `upload:${b}`, args }); return { error: null }; },
    getPublicUrl: (p: string) => { calls.push({ op: `getPublicUrl:${b}`, args: [p] }); return { data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/${b}/${p}` } }; },
    remove: async (...args: unknown[]) => { calls.push({ op: `remove:${b}`, args }); return { error: null }; },
  });
  return { client: { storage: { from: bucket } } as unknown as SupabaseClient, calls };
}

const walk = (dir: string, out: string[] = []): string[] => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(f.name)) out.push(p);
  }
  return out;
};

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) fails.push(m); };

  // ① 선택
  ok(resolveProviderName({}) === "supabase", "기본이 supabase가 아님");
  ok(resolveProviderName({ STORAGE_PROVIDER: "supabase" }) === "supabase" && resolveProviderName({ STORAGE_PROVIDER: " R2 " }) === "r2", "provider 값 해석 오류");
  try { resolveProviderName({ STORAGE_PROVIDER: "s3" }); fails.push("잘못된 provider 값이 통과"); } catch (e) { ok(e instanceof StorageConfigError, "잘못된 값 오류 종류"); }
  const { client: sb0 } = fakeSupabase();
  ok(getStorage(sb0, {}).name === "supabase", "기본 getStorage가 supabase가 아님");
  try {
    getStorage(sb0, { ...R2_ENV, R2_SECRET_ACCESS_KEY: "", R2_BUCKET: undefined });
    fails.push("r2 환경변수 누락이 오류 없이 통과(조용히 supabase로 떨어졌을 수 있음)");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    ok(e instanceof StorageConfigError && msg.includes("R2_SECRET_ACCESS_KEY") && msg.includes("R2_BUCKET"), `누락 이름이 오류에 없음: ${msg}`);
    ok(!msg.includes("testsecretvalue") && !msg.includes("testkeyid") && !msg.includes("acct123"), "오류 메시지에 값이 들어감");
  }
  ok(readR2Config(R2_ENV).bucket === "pagzly-images", "r2 설정 읽기");

  // ② R2 provider (가짜 클라이언트)
  const sent: unknown[] = [];
  const r2 = createR2Provider(readR2Config(R2_ENV), { client: { send: async (c) => { sent.push(c); return {}; } } });
  ok(r2.getPublicUrl("u1/a.png") === "https://img.example.com/u1/a.png", `공개 주소: ${r2.getPublicUrl("u1/a.png")}`);
  ok(r2.getPublicUrl("/u1/a.png") === "https://img.example.com/u1/a.png", "앞 슬래시 정리");
  const put = await r2.putObject({ path: "u1/a.png", body: Buffer.from("x"), contentType: "image/png", cacheControl: CACHE_IMMUTABLE, upsert: true });
  const pc = sent[0] as PutObjectCommand;
  ok(!put.error && pc instanceof PutObjectCommand && pc.input.Bucket === "pagzly-images" && pc.input.Key === "u1/a.png" && pc.input.ContentType === "image/png" && pc.input.CacheControl === CACHE_IMMUTABLE, "putObject 인자");
  ok(pc.input.IfNoneMatch === undefined, "upsert:true에 IfNoneMatch가 붙음");
  await r2.putObject({ path: "u1/b.png", body: new Uint8Array([1]), contentType: "image/png", upsert: false });
  ok((sent[1] as PutObjectCommand).input.IfNoneMatch === "*", "upsert:false가 덮어쓰기 방지로 안 감");
  const failing = createR2Provider(readR2Config(R2_ENV), { client: { send: async () => { throw new Error("boom"); } } });
  const bad = await failing.putObject({ path: "u1/c.png", body: Buffer.from("x"), contentType: "image/png" });
  ok(bad.error?.message === "boom", "put 오류가 {error}로 안 돌아옴");
  await r2.removeObjects(["u1/a.png", "u1/b.png"]);
  const dc = sent[2] as DeleteObjectsCommand;
  ok(dc instanceof DeleteObjectsCommand && dc.input.Delete?.Objects?.length === 2 && dc.input.Bucket === "pagzly-images", "removeObjects 인자");
  const empty = await r2.removeObjects([]);
  ok(!empty.error && sent.length === 3, "빈 삭제가 요청을 보냄");
  // 서명(가짜 presign으로 인자 확인)
  let presignOpts: { expiresIn: number; signableHeaders: Set<string> } | null = null;
  let presignCmd: PutObjectCommand | null = null;
  const r2s = createR2Provider(readR2Config(R2_ENV), { presign: async (cmd, opts) => { presignCmd = cmd; presignOpts = opts; return "https://signed.example/put"; } });
  const t = await r2s.createUploadTarget({ path: "u1/up.png", contentType: "image/png", size: 1234 });
  ok(t?.url === "https://signed.example/put" && t.publicUrl === "https://img.example.com/u1/up.png" && t.expiresInSeconds === SIGNED_URL_TTL_SECONDS && t.headers["Content-Type"] === "image/png", "서명 대상 응답");
  ok(presignOpts !== null && (presignOpts as { expiresIn: number }).expiresIn === 300 && (presignOpts as { signableHeaders: Set<string> }).signableHeaders.has("content-length") && (presignOpts as { signableHeaders: Set<string> }).signableHeaders.has("content-type"), "서명 옵션(5분·Content-Length/Type 묶음)");
  ok((presignCmd as PutObjectCommand | null)?.input.ContentLength === 1234 && (presignCmd as PutObjectCommand | null)?.input.Key === "u1/up.png", "서명 명령의 크기·키");
  // 실제 로컬 서명(네트워크 없음): 만료·서명 헤더가 주소에 들어간다
  const real = createR2Provider(readR2Config(R2_ENV));
  const rt = await real.createUploadTarget({ path: "u1/real.png", contentType: "image/png", size: 99 });
  ok(!!rt && rt.url.startsWith("https://pagzly-images.acct123.r2.cloudflarestorage.com/") && rt.url.includes("X-Amz-Expires=300") && /X-Amz-SignedHeaders=[^&]*content-length/i.test(rt.url) && !rt.url.includes("testsecretvalue"), `로컬 서명 주소 형태: ${rt?.url.slice(0, 120)}`);

  // ③ supabase 호출 형태
  const { client: sb, calls } = fakeSupabase();
  const sp = createSupabaseProvider(sb);
  await sp.putObject({ path: "u1/a.png", body: Buffer.from("x"), contentType: "image/png", upsert: true, cacheControl: CACHE_SHORT });
  const up = calls[0];
  ok(up?.op === "upload:images" && up.args[0] === "u1/a.png" && JSON.stringify(up.args[2]) === JSON.stringify({ contentType: "image/png", upsert: true }), `supabase upload 인자: ${JSON.stringify(up?.args[2])}`);
  ok(sp.getPublicUrl("u1/a.png") === "https://proj.supabase.co/storage/v1/object/public/images/u1/a.png", "supabase 공개 주소");
  await sp.removeObjects(["u1/a.png"]);
  ok(calls.some((c) => c.op === "remove:images" && JSON.stringify(c.args[0]) === '["u1/a.png"]'), "supabase remove 인자");
  ok((await sp.createUploadTarget()) === null, "supabase 서명 대상이 null이 아님");

  // ④ 요청 검증
  const U = "11111111-2222-3333-4444-555555555555";
  ok(!planUpload(null, {}).ok && (planUpload(null, {}) as { status: number }).status === 401, "비로그인 401");
  ok((planUpload(U, { path: "other/a.png", contentType: "image/png", size: 10 }) as { status: number }).status === 403, "다른 사용자 경로 403");
  ok((planUpload(U, { path: `${U}/../x.png`, contentType: "image/png", size: 10 }) as { status: number }).status === 403, "경로 탈출 거절");
  ok((planUpload(U, { path: `${U}//x.png`, contentType: "image/png", size: 10 }) as { status: number }).status === 403, "빈 경로 조각 거절");
  ok((planUpload(U, { path: `${U}/a.html`, contentType: "text/html", size: 10 }) as { status: number }).status === 400, "허용 밖 형식 거절");
  for (const size of [0, -1, 1.5, MAX_UPLOAD_BYTES + 1, "10"]) ok((planUpload(U, { contentType: "image/png", size }) as { status: number }).status === 400, `크기 ${String(size)} 거절`);
  const good = planUpload(U, { path: `${U}/a.png`, contentType: "image/avif", size: MAX_UPLOAD_BYTES });
  ok(good.ok && good.path === `${U}/a.png`, "정상 요청 거절됨");
  const gen = planUpload(U, { contentType: "image/png", size: 5 }, () => "fixed");
  ok(gen.ok && gen.path === `${U}/fixed`, "경로 서버 생성 접두사");
  ok(isOwnPath(`${U}/a/b.png`, U) && !isOwnPath(`${U}x/a.png`, U), "isOwnPath 접두사 경계");
  ok((planRemove(U, { paths: [`${U}/a.png`, "other/b.png"] }) as { status: number }).status === 403, "삭제: 남의 경로가 섞이면 전부 거절");
  ok(planRemove(U, { paths: [`${U}/a.png`] }).ok && (planRemove(U, { paths: [] }) as { status: number }).status === 400 && (planRemove(null, {}) as { status: number }).status === 401, "삭제 검증");

  // ⑤ 클라이언트 업로드
  const { client: sbc, calls: cc } = fakeSupabase();
  const file = new Blob(["abc"], { type: "image/png" });
  const r1 = await uploadImage(sbc, file, { path: `${U}/p.png`, contentType: "image/png", upsert: false }, {});
  ok("publicUrl" in r1 && cc[0]?.op === "upload:images" && JSON.stringify(cc[0].args[2]) === JSON.stringify({ contentType: "image/png", upsert: false }), "클라이언트 supabase 모드 호출 형태");
  const fetched: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    fetched.push({ url, init });
    if (url === "/api/storage/upload-url") return new Response(JSON.stringify({ url: "https://signed.example/put", headers: { "Content-Type": "image/png" }, publicUrl: `https://img.example.com/${U}/p.png`, path: `${U}/p.png` }), { status: 200 });
    return new Response("", { status: 200 });
  }) as unknown as typeof fetch;
  const r2c = await uploadImage(sbc, file, { path: `${U}/p.png`, contentType: "image/png" }, { NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "https://img.example.com" }, fakeFetch);
  ok("publicUrl" in r2c && r2c.publicUrl === `https://img.example.com/${U}/p.png` && fetched[0]?.url === "/api/storage/upload-url" && fetched[1]?.url === "https://signed.example/put" && fetched[1].init?.method === "PUT", "클라이언트 r2 모드 흐름");
  ok(JSON.parse(String(fetched[0]?.init?.body)).size === 3, "서명 요청에 크기가 안 실림");
  const failFetch = (async () => new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { status: 401 })) as unknown as typeof fetch;
  const rf = await uploadImage(sbc, file, { path: `${U}/p.png` }, { NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "https://img.example.com" }, failFetch);
  ok("error" in rf && rf.error === "로그인이 필요합니다.", "서명 실패 오류 전달");
  const { client: sbr, calls: rc } = fakeSupabase();
  await removeUploaded(sbr, ["p"], {});
  ok(rc[0]?.op === "remove:images", "클라이언트 삭제(supabase 모드) 형태");
  const rfetched: string[] = [];
  await removeUploaded(sbr, ["p"], { NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "https://img.example.com" }, (async (u: string) => { rfetched.push(u); return new Response("{}"); }) as unknown as typeof fetch);
  ok(rfetched[0] === "/api/storage/remove", "클라이언트 삭제(r2 모드) 경로");

  // ⑥ 정적 검사
  const ALLOW = new Set(["lib/storage/supabase-provider.ts", "lib/storage/client-upload.ts"]);
  const files = ["app", "lib", "components"].flatMap((d) => walk(d));
  for (const f of files) {
    const rel = f.replace(/\\/g, "/");
    const src = fs.readFileSync(f, "utf8");
    if (/supabase\.storage|\.storage\s*\.from\(/.test(src) && !ALLOW.has(rel)) fails.push(`직접 저장소 호출이 남음: ${rel}`);
    const isClient = /^﻿?\s*["']use client["']/.test(src);
    if (isClient) {
      if (/R2_(SECRET_ACCESS_KEY|ACCESS_KEY_ID|ACCOUNT_ID|BUCKET)|STORAGE_PROVIDER/.test(src)) fails.push(`"use client" 파일에 R2 비밀·서버 설정 이름: ${rel}`);
      if (/from\s+["']@\/lib\/storage["']|r2-provider|supabase-provider|@aws-sdk/.test(src)) fails.push(`"use client" 파일이 서버 전용 저장소 모듈을 가져옴: ${rel}`);
    }
  }
  for (const f of ["lib/storage/client-upload.ts", "lib/storage/public-url.ts", "lib/storage/policy.ts"]) {
    const src = fs.readFileSync(f, "utf8");
    if (/@aws-sdk|R2_SECRET|R2_ACCESS|from\s+["']@\/lib\/storage["']/.test(src)) fails.push(`클라이언트 공용 모듈이 서버 전용 코드를 참조: ${f}`);
  }

  // ⑦ 호스트 계산
  const E = { NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "https://img.example.com/media/", NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co" };
  ok(publicUrlFor("a/b.png", E) === "https://img.example.com/media/a/b.png" && publicUrlFor("a", {}) === null, "publicUrlFor");
  ok(storagePublicHost(E) === "img.example.com" && storagePublicHost({}) === null && storagePublicHost({ NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "not a url" }) === null, "storagePublicHost");
  const rp = storageRemotePattern(E);
  ok(rp?.protocol === "https" && rp.hostname === "img.example.com" && rp.pathname === "/media/**", `remotePattern: ${JSON.stringify(rp)}`);
  ok(storageRemotePattern({}) === null && storageRemotePattern({ NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL: "http://img.example.com" }) === null, "remotePattern은 설정·https일 때만");
  ok(isStoragePublicUrl("https://img.example.com/media/a.png", E) && !isStoragePublicUrl("https://img.example.com/other/a.png", E) && !isStoragePublicUrl("https://evil.example.com/media/a.png", E) && !isStoragePublicUrl("https://img.example.com/media/a.png", {}), "isStoragePublicUrl");
  ok(isAllowedProxyUrl("https://img.example.com/media/a.png", { ...E, NODE_ENV: "production" }) && isAllowedProxyUrl("https://proj.supabase.co/storage/v1/object/public/images/a.png", { ...E, NODE_ENV: "production" }), "proxy 허용: R2·Supabase 모두");
  const base = { NEXT_PUBLIC_SUPABASE_URL: "https://proj.supabase.co", NODE_ENV: "production" };
  ok(!isAllowedProxyUrl("https://img.example.com/a.png", base) && isAllowedProxyUrl("https://proj.supabase.co/x.png", base) && isAllowedProxyUrl("https://a.replicate.delivery/x.png", base) && !isAllowedProxyUrl("https://other.supabase.co/x.png", base), "R2 설정이 없으면 proxy 허용 목록이 이전과 같다");
  ok(allowedProxyHosts(base).exact.join() === "proj.supabase.co,replicate.delivery", "허용 호스트 목록 불변");
  const nc = fs.readFileSync("next.config.ts", "utf8");
  ok(nc.includes("qnstsrplqzoqlndojuyw.supabase.co") && nc.includes("storageRemotePattern"), "next.config가 Supabase 호스트를 유지하고 R2 패턴을 더함");
  return fails.slice(0, 15);
}
