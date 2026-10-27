/** 회귀 — 460차 이전 스크립트 판정 로직(가짜 deps, 네트워크 없음): 인자·드라이런·건너뜀·재시도·402/403 중단·이어하기·검증·정적 검사. */
import fs from "node:fs";
import {
  CONFIRM_PHRASE, FatalError, HttpError, classifyError, copyOne, countMissing, dryRunReport, md5Hex, parseArgs, parseStateLines, planGate, planRecOf, runCopy, sameObject, stateLine, verifyAll, withBackoff, writeAllowed,
  type Deps, type Head, type StateRec,
} from "../../lib/storage/migrate-core";

export const name = "이전 스크립트 로직 — 드라이런 기본·확인 문구·건너뜀·백오프·402/403 중단·이어하기·검증·비밀 출력 없음";

const B = { retries: 3, baseMs: 1, capMs: 4 };
const bytes = (s: string) => new TextEncoder().encode(s);

function fake(over: Partial<Deps> = {}, store = new Map<string, Uint8Array>()) {
  const sleeps: number[] = []; const puts: string[] = [];
  const deps: Deps = {
    download: async (p) => ({ bytes: bytes(`data:${p}`), contentType: "image/png" }),
    head: async (p): Promise<Head> => { const b = store.get(p); return b ? { size: b.byteLength, etag: `"${md5Hex(b)}"` } : null; },
    put: async (p, b) => { puts.push(p); store.set(p, b); return { error: null }; },
    sleep: async (ms) => { sleeps.push(ms); },
    ...over,
  };
  return { deps, sleeps, puts, store };
}

export async function run(): Promise<string[]> {
  const f: string[] = [];
  const ok = (c: boolean, m: string) => { if (!c) f.push(m); };

  // 인자: 기본 드라이런, 확인 문구 필요
  ok(!writeAllowed(parseArgs([])), "기본이 쓰기 허용");
  ok(!writeAllowed(parseArgs(["--apply"])), "--apply만으로 쓰기 허용");
  ok(!writeAllowed(parseArgs(["--apply", "--confirm", "아니오"])), "틀린 확인 문구로 쓰기 허용");
  ok(writeAllowed(parseArgs(["--apply", "--confirm", CONFIRM_PHRASE])), "올바른 조합이 쓰기 불허");
  ok(!writeAllowed(parseArgs(["--apply", "--confirm", CONFIRM_PHRASE, "--verify"])), "--verify에서 쓰기 허용");
  ok(parseArgs(["--concurrency", "99"]).concurrency === 16, "동시성 상한");
  for (const bad of [["--nope"], ["--concurrency"], ["--concurrency", "0"], ["--retries", "x"]]) { try { parseArgs(bad); f.push(`잘못된 인자 통과: ${bad.join(" ")}`); } catch { /* 기대 */ } }

  // 드라이런 집계: 쓰기 요청 수는 복사 예정 개수
  const done = new Map<string, StateRec>([["a", { path: "a", size: 1, status: "copied" }], ["b", { path: "b", size: 1, status: "failed" }]]);
  const d = dryRunReport([{ path: "a", size: 10 }, { path: "b", size: 20 }, { path: "c", size: 30 }], done);
  ok(d.total === 3 && d.totalBytes === 60 && d.alreadyDone === 1 && d.toCopy === 2 && d.estClassA === 2, `드라이런 집계 ${JSON.stringify(d)}`);

  // 건너뜀: 같은 크기·같은 해시면 put 안 함 / 크기 같고 해시 다르면 덮어씀 / 없으면 복사
  { const store = new Map([["x.png", bytes("data:x.png")]]); const m = fake({}, store);
    const r = await copyOne({ path: "x.png" }, m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(r.status === "skipped" && m.puts.length === 0, "동일 객체를 건너뛰지 않음"); }
  { const store = new Map([["x.png", bytes("data:x.PNG")]]); const m = fake({}, store);
    const r = await copyOne({ path: "x.png" }, m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(r.status === "copied" && m.puts.length === 1, "크기 같고 해시 다른 객체를 덮어쓰지 않음"); }
  ok(sameObject({ size: 3, etag: "\"abc-2\"" }, bytes("abc")), "멀티파트 ETag는 크기만 비교");
  ok(!sameObject(null, bytes("a")), "없는 객체를 같다고 판정");
  { const m = fake(); await copyOne({ path: "n.png" }, m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(m.puts.length === 1 && m.store.has("n.png"), "새 객체 복사 안 됨"); }

  // 백오프: 5xx 재시도(지수 증가·상한), 4xx는 즉시, 404는 즉시
  { let n = 0; const sl: number[] = [];
    const v = await withBackoff(async () => { if (++n < 4) throw new HttpError(503); return "ok"; }, async (ms) => { sl.push(ms); }, B);
    ok(v === "ok" && sl.join() === "1,2,4", `백오프 간격 ${sl.join()}`); }
  { let n = 0; try { await withBackoff(async () => { n++; throw new HttpError(400); }, async () => {}, B); } catch { /* 기대 */ } ok(n === 1, "400을 재시도함"); }
  { let n = 0; try { await withBackoff(async () => { n++; throw new HttpError(503); }, async () => {}, B); } catch { /* 기대 */ } ok(n === B.retries + 1, "재시도 횟수"); }

  // 402/403은 원인을 말하고 즉시 중단
  for (const st of [402, 403]) {
    const m = fake({ download: async () => { throw new HttpError(st); } });
    const r = await runCopy([{ path: "a" }, { path: "b" }, { path: "c" }], m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(r.fatal instanceof FatalError && r.fatal.message.includes(String(st)), `${st} 중단 안 됨`);
    ok(r.summary.copied === 0 && m.puts.length === 0, `${st} 뒤에 계속 복사`);
    ok(m.sleeps.length === 0, `${st}에서 재시도`);
  }

  // 404는 missing(실패 목록에 안 넣음), 그 외 실패는 목록에
  { const m = fake({ download: async (p) => { if (p === "gone") throw new HttpError(404); if (p === "bad") throw new Error("boom"); return { bytes: bytes(p), contentType: "image/png" }; } });
    const recs: StateRec[] = [];
    const r = await runCopy([{ path: "ok" }, { path: "gone" }, { path: "bad" }], m.deps, { concurrency: 2, backoff: { retries: 0, baseMs: 1, capMs: 1 }, done: new Map(), record: (x) => recs.push(x) });
    ok(r.summary.copied === 1 && r.summary.missing === 1 && r.summary.failed === 1 && r.failures.length === 1 && r.failures[0]!.path === "bad", `분류 ${JSON.stringify(r.summary)}`); }

  // 이어하기: 상태 파일의 copied는 다운로드도 하지 않는다. 상태 줄에는 경로·크기·상태만
  { const line = stateLine({ path: "a", size: 5, status: "copied" });
    ok(Object.keys(JSON.parse(line)).sort().join() === "path,size,status", "상태 줄에 다른 필드");
    const st = parseStateLines(`${line}\n{깨진 줄`);
    let downloads = 0; const m = fake({ download: async (p) => { downloads++; return { bytes: bytes(p), contentType: "image/png" }; } });
    const r = await runCopy([{ path: "a" }, { path: "b" }], m.deps, { concurrency: 1, backoff: B, done: st, record() {} });
    ok(downloads === 1 && r.summary.skipped === 1 && r.summary.copied === 1, "이어하기에서 완료분 재처리"); }

  // 검증
  { const store = new Map<string, Uint8Array>([["a", bytes("data:a")], ["b", bytes("data:b")]]);
    const m = fake({}, store);
    const base = { head: m.deps.head, download: async (p: string) => ({ bytes: store.get(p) ?? bytes(""), contentType: "image/png" }), sleep: m.deps.sleep, random: () => 0.5 };
    const good = await verifyAll([{ path: "a", size: 6 }, { path: "b", size: 6 }, { path: "c", size: 6 }], { ...base, fetchPublic: async () => ({ status: 200, contentType: "image/png" }) }, { sample: 5, concurrency: 2, backoff: B, srcDownload: async (p) => ({ bytes: bytes(`data:${p}`), contentType: "image/png" }) });
    ok(good.absent.join() === "c" && good.sizeMismatch.length === 0 && good.hashMismatch.length === 0 && good.publicBad.length === 0, `검증 정상 ${JSON.stringify(good)}`);
    const bad = await verifyAll([{ path: "a", size: 99 }, { path: "b", size: 6 }], { ...base, fetchPublic: async (p) => ({ status: p === "a" ? 404 : 200, contentType: p === "b" ? "text/html" : "image/png" }) }, { sample: 5, concurrency: 1, backoff: B, srcDownload: async (p) => ({ bytes: bytes(p === "b" ? "other" : `data:${p}`), contentType: "image/png" }) });
    ok(bad.sizeMismatch.join() === "a" && bad.hashMismatch.join() === "b" && bad.publicBad.sort().join() === "a,b", `검증 이상 ${JSON.stringify(bad)}`); }

  // 461차: --only-missing 은 쓰기 없음·HEAD만, --apply 는 드라이런 기록 없이는 거부, 원인 분류
  ok(!writeAllowed(parseArgs(["--apply", "--confirm", CONFIRM_PHRASE, "--only-missing"])), "--only-missing 에서 쓰기 허용");
  { const store = new Map<string, Uint8Array>([["a", bytes("aaa")], ["b", bytes("bb")]]);
    const m = fake({}, store);
    const r = await countMissing([{ path: "a", size: 3 }, { path: "b", size: 9 }, { path: "c", size: 5 }], { head: m.deps.head, sleep: m.deps.sleep }, { concurrency: 2, backoff: B });
    ok(r.checked === 3 && r.missing === 1 && r.sizeDiffers === 1 && r.missingBytes === 14 && r.failed === 0, `only-missing 집계 ${JSON.stringify(r)}`);
    ok(m.puts.length === 0, "only-missing 이 씀"); }
  { const a = parseArgs(["--apply", "--confirm", CONFIRM_PHRASE]);
    ok(planGate(a, null)?.includes("--state") === true, "--state 없이 --apply 통과");
    const a2 = parseArgs(["--apply", "--confirm", CONFIRM_PHRASE, "--state", "s.jsonl"]);
    ok(planGate(a2, null)?.includes("s.jsonl.plan") === true, "드라이런 기록 없이 --apply 통과");
    ok(planGate(a2, "{깨짐") !== null, "깨진 기록으로 --apply 통과");
    ok(planGate(a2, JSON.stringify(planRecOf({ total: 3, totalBytes: 10, toCopy: 3 }, new Date(0)))) === null, "정상 기록인데 거부");
    ok(!JSON.stringify(planRecOf({ total: 1, totalBytes: 1, toCopy: 1 })).includes("path"), "plan 기록에 경로가 들어감"); }
  ok(classifyError(new HttpError(402)).kind === "supabase-limit" && classifyError(new HttpError(403)).kind === "supabase-limit", "402/403 분류");
  ok(classifyError(new HttpError(404)).kind === "source-missing", "404 분류");
  ok(classifyError(new HttpError(503)).kind === "retry" && classifyError(new Error("fetch failed")).kind === "retry", "5xx/연결 분류");
  ok(classifyError(new Error("x")).kind === "other", "기타 분류");
  { const m = fake({ download: async () => { throw new HttpError(503); } });
    const r = await runCopy([{ path: "a" }], m.deps, { concurrency: 1, backoff: { retries: 0, baseMs: 1, capMs: 1 }, done: new Map(), record() {} });
    ok(Object.keys(r.summary.reasons).join().startsWith("503"), `원인 집계 ${JSON.stringify(r.summary.reasons)}`);
    const m2 = fake(); const sk = await runCopy([{ path: "a" }], m2.deps, { concurrency: 1, backoff: B, done: new Map([["a", { path: "a", size: 7, status: "copied" }]]), record() {} });
    ok(sk.summary.skipped === 1 && sk.summary.skippedBytes === 7, "건너뜀 크기 합계"); }

  // 461차: 원본 크기·eTag가 R2와 같으면 다운로드(Supabase egress) 없이 건너뜀 / eTag가 다르면 내려받아 판정
  { const store = new Map([["x", bytes("abc")]]); let dl = 0;
    const m = fake({ download: async () => { dl++; return { bytes: bytes("abc"), contentType: "image/png" }; } }, store);
    const r = await copyOne({ path: "x", size: 3, etag: `"${md5Hex(bytes("abc"))}"` }, m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(r.status === "skipped" && dl === 0, `eTag 일치인데 다운로드함 dl=${dl}`);
    const r2 = await copyOne({ path: "x", size: 3, etag: "\"deadbeef\"" }, m.deps, { concurrency: 1, backoff: B, done: new Map(), record() {} });
    ok(dl === 1 && r2.status === "skipped", "eTag 불일치 시 내려받아 판정하지 않음"); }

  // 정적: 스크립트가 비밀 값을 출력하지 않고, 쓰기는 writeAllowed 뒤에만
  const src = fs.readFileSync("scripts/migrate-storage-to-r2.ts", "utf8");
  ok(!/console\.(log|error|warn)\([^)]*process\.env/.test(src), "process.env 값을 출력");
  ok(!/console\.\w+\([^)]*(SERVICE_ROLE|SECRET_ACCESS|ACCESS_KEY)/.test(src.replace(/환경변수[^\n]*/g, "")), "비밀 이름을 값과 함께 출력");
  ok(src.indexOf("writeAllowed(a)") > 0 && src.indexOf("writeAllowed(a)") < src.indexOf("runCopy("), "writeAllowed 이전에 복사");
  ok(!/\.remove\(|removeObjects|DeleteObject/.test(src), "이전 스크립트가 삭제를 호출");
  return f;
}

if (require.main === module) void run().then((f) => { console.log(f.length ? f.join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
