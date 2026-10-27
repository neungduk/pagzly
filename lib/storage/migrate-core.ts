import { createHash } from "node:crypto";
import { CACHE_IMMUTABLE } from "@/lib/storage/policy";

/**
 * 460차 — Supabase 버킷 → R2 복사의 판정·재시도·상태 로직(순수/주입형). 네트워크는 호출부(scripts/migrate-storage-to-r2.ts)가 deps로 넘긴다.
 * 비밀은 다루지 않는다. 상태 파일에는 경로·크기·상태만 적는다.
 */
export const CONFIRM_PHRASE = "R2로 복사";
/** R2 무료 한도: Class A(쓰기·목록) 월 100만 건. 개체 1개 복사 = PUT 1건(+HEAD는 Class B) */
export const R2_FREE_CLASS_A_PER_MONTH = 1_000_000;

export type Item = { path: string; size?: number; /** 목록 API의 eTag(있으면 다운로드 없이 R2 ETag와 비교해 건너뛴다) */ etag?: string };
export type Status = "copied" | "skipped" | "failed" | "missing" | "verified" | "mismatch";
export type StateRec = { path: string; size: number; status: Status };

export class FatalError extends Error {
  readonly httpStatus?: number;
  constructor(message: string, httpStatus?: number) { super(message); this.name = "FatalError"; this.httpStatus = httpStatus; }
}
export class HttpError extends Error {
  readonly httpStatus: number;
  constructor(httpStatus: number, message = `HTTP ${httpStatus}`) { super(message); this.name = "HttpError"; this.httpStatus = httpStatus; }
}

export type Downloaded = { bytes: Uint8Array; contentType: string };
export type Head = { size: number; etag?: string; contentType?: string } | null;
export type Deps = {
  download(path: string): Promise<Downloaded>;
  head(path: string): Promise<Head>;
  put(path: string, bytes: Uint8Array, contentType: string, cacheControl: string): Promise<{ error: { message: string } | null }>;
  sleep(ms: number): Promise<void>;
};

export type Args = {
  apply: boolean; confirm: string | null; verify: boolean; onlyMissing: boolean; fromUrls: string | null; state: string | null; failures: string | null;
  concurrency: number; retries: number; timeoutMs: number; sample: number; limit: number | null; prefix: string | null;
};

export function parseArgs(argv: string[]): Args {
  const a: Args = { apply: false, confirm: null, verify: false, onlyMissing: false, fromUrls: null, state: null, failures: null, concurrency: 4, retries: 5, timeoutMs: 30_000, sample: 20, limit: null, prefix: null };
  const val = (i: number, flag: string): string => { const v = argv[i + 1]; if (v === undefined || v.startsWith("--")) throw new Error(`${flag} 값이 필요합니다`); return v; };
  const num = (s: string, flag: string, min: number): number => { const n = Number(s); if (!Number.isInteger(n) || n < min) throw new Error(`${flag}는 ${min} 이상의 정수여야 합니다`); return n; };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--apply") a.apply = true;
    else if (f === "--verify") a.verify = true;
    else if (f === "--only-missing") a.onlyMissing = true;
    else if (f === "--confirm") a.confirm = val(i++, f);
    else if (f === "--from-urls") a.fromUrls = val(i++, f);
    else if (f === "--state") a.state = val(i++, f);
    else if (f === "--failures") a.failures = val(i++, f);
    else if (f === "--prefix") a.prefix = val(i++, f);
    else if (f === "--concurrency") a.concurrency = Math.min(16, num(val(i++, f), f, 1));
    else if (f === "--retries") a.retries = num(val(i++, f), f, 0);
    else if (f === "--timeout-ms") a.timeoutMs = num(val(i++, f), f, 1000);
    else if (f === "--sample") a.sample = num(val(i++, f), f, 0);
    else if (f === "--limit") a.limit = num(val(i++, f), f, 1);
    else throw new Error(`알 수 없는 옵션: ${f}`);
  }
  return a;
}

/** 쓰기는 --apply 와 정확한 확인 문구가 모두 있을 때만. --verify는 읽기 전용이라 --apply 불필요 */
export function writeAllowed(a: Args): boolean { return a.apply && a.confirm === CONFIRM_PHRASE && !a.verify && !a.onlyMissing; }

export const md5Hex = (b: Uint8Array): string => createHash("md5").update(b).digest("hex");
const etagOf = (e?: string): string | undefined => e?.replace(/"/g, "").toLowerCase();

/** 이미 같은 객체인지: 크기가 같고, ETag가 단일 파트 MD5면 해시도 같아야 한다(ETag가 MD5 형식이 아니면 크기만) */
export function sameObject(head: Head, bytes: Uint8Array): boolean {
  if (!head || head.size !== bytes.byteLength) return false;
  const e = etagOf(head.etag);
  if (e && /^[0-9a-f]{32}$/.test(e)) return e === md5Hex(bytes);
  return true;
}

export type Backoff = { retries: number; baseMs: number; capMs: number };
export async function withBackoff<T>(fn: () => Promise<T>, sleep: Deps["sleep"], b: Backoff): Promise<T> {
  for (let n = 0; ; n++) {
    try { return await fn(); } catch (e) {
      const st = e instanceof HttpError || e instanceof FatalError ? e.httpStatus : undefined;
      if (st === 402 || st === 403) throw new FatalError(`Supabase가 ${st}로 거절했습니다(${st === 402 ? "결제·한도 제한" : "권한 또는 egress 한도 제한"}). 복사를 중단합니다 — Supabase 대시보드의 Usage·Billing을 확인하세요.`, st);
      if (e instanceof FatalError) throw e;
      if (st === 404) throw e;
      if (st !== undefined && st < 500 && st !== 429 && st !== 408) throw e;
      if (n >= b.retries) throw e;
      await sleep(Math.min(b.capMs, b.baseMs * 2 ** n));
    }
  }
}

export type Summary = { total: number; totalBytes: number; copied: number; skipped: number; failed: number; missing: number; bytesCopied: number; skippedBytes: number; reasons: Record<string, number> };
export const emptySummary = (): Summary => ({ total: 0, totalBytes: 0, copied: 0, skipped: 0, failed: 0, missing: 0, bytesCopied: 0, skippedBytes: 0, reasons: {} });

/** 드라이런: 개수·용량·상태 파일 기준 건너뜀·예상 R2 쓰기 요청 수 */
export function dryRunReport(items: Item[], done: Map<string, StateRec>): { total: number; totalBytes: number; alreadyDone: number; toCopy: number; estClassA: number; freeShare: string } {
  const totalBytes = items.reduce((s, i) => s + (i.size ?? 0), 0);
  const alreadyDone = items.filter((i) => { const r = done.get(i.path); return r && (r.status === "copied" || r.status === "skipped"); }).length;
  const toCopy = items.length - alreadyDone;
  return { total: items.length, totalBytes, alreadyDone, toCopy, estClassA: toCopy, freeShare: `${((toCopy / R2_FREE_CLASS_A_PER_MONTH) * 100).toFixed(2)}%` };
}

export type RunOpts = { concurrency: number; backoff: Backoff; cacheControl?: string; done: Map<string, StateRec>; record(r: StateRec): void; onFatal?(e: FatalError): void };

export async function copyOne(item: Item, deps: Deps, o: RunOpts): Promise<StateRec> {
  const prev = o.done.get(item.path);
  if (prev && (prev.status === "copied" || prev.status === "skipped")) return { ...prev, status: "skipped" };
  const head = await withBackoff(() => deps.head(item.path), deps.sleep, o.backoff);
  // 원본 크기·ETag를 알고 R2에 같은 크기·같은 ETag가 있으면 다운로드(= Supabase egress) 없이 건너뛴다
  const srcTag = etagOf(item.etag); const dstTag = etagOf(head?.etag);
  if (head && item.size !== undefined && head.size === item.size && srcTag && dstTag && srcTag === dstTag) return { path: item.path, size: head.size, status: "skipped" };
  const dl = await withBackoff(() => deps.download(item.path), deps.sleep, o.backoff);
  if (sameObject(head, dl.bytes)) return { path: item.path, size: dl.bytes.byteLength, status: "skipped" };
  const res = await withBackoff(async () => {
    const r = await deps.put(item.path, dl.bytes, dl.contentType, o.cacheControl ?? CACHE_IMMUTABLE);
    if (r.error) throw new Error(r.error.message);
    return r;
  }, deps.sleep, o.backoff);
  void res;
  return { path: item.path, size: dl.bytes.byteLength, status: "copied" };
}

/** 동시성 제한 풀. Fatal(402/403)이면 새 작업을 더 시작하지 않고 원인을 돌려준다 */
export async function runCopy(items: Item[], deps: Deps, o: RunOpts): Promise<{ summary: Summary; failures: StateRec[]; fatal: FatalError | null }> {
  const summary = emptySummary(); const failures: StateRec[] = [];
  summary.total = items.length; summary.totalBytes = items.reduce((s, i) => s + (i.size ?? 0), 0);
  let idx = 0; let fatal: FatalError | null = null;
  const worker = async () => {
    while (!fatal) {
      const item = items[idx++]; if (!item) return;
      let rec: StateRec;
      try { rec = await copyOne(item, deps, o); } catch (e) {
        if (e instanceof FatalError) { fatal = e; o.onFatal?.(e); return; }
        const missing = e instanceof HttpError && e.httpStatus === 404;
        rec = { path: item.path, size: item.size ?? 0, status: missing ? "missing" : "failed" };
        if (!missing) failures.push(rec);
        const why = classifyError(e).label; summary.reasons[why] = (summary.reasons[why] ?? 0) + 1;
      }
      o.record(rec);
      if (rec.status === "copied") { summary.copied++; summary.bytesCopied += rec.size; }
      else if (rec.status === "skipped") { summary.skipped++; summary.skippedBytes += rec.size; }
      else if (rec.status === "missing") summary.missing++;
      else summary.failed++;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency) }, worker));
  return { summary, failures, fatal };
}

/** 검증: 모든 객체 HEAD 크기, 무작위 표본 해시, 공개 주소 200·content-type */
export type VerifyDeps = { head: Deps["head"]; download: Deps["download"]; fetchPublic(path: string): Promise<{ status: number; contentType: string | null }>; sleep: Deps["sleep"]; random?: () => number };
export type VerifyResult = { checked: number; sizeMismatch: string[]; absent: string[]; hashMismatch: string[]; publicBad: string[]; sampled: number };

export function pickSample<T>(xs: T[], n: number, rnd: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a.slice(0, Math.min(n, a.length));
}

export async function verifyAll(items: Item[], deps: VerifyDeps, o: { sample: number; concurrency: number; backoff: Backoff; srcDownload: Deps["download"] }): Promise<VerifyResult> {
  const r: VerifyResult = { checked: 0, sizeMismatch: [], absent: [], hashMismatch: [], publicBad: [], sampled: 0 };
  let idx = 0;
  const worker = async () => {
    for (;;) {
      const it = items[idx++]; if (!it) return;
      const h = await withBackoff(() => deps.head(it.path), deps.sleep, o.backoff).catch(() => undefined);
      r.checked++;
      if (h === undefined || h === null) { r.absent.push(it.path); continue; }
      if (it.size !== undefined && h.size !== it.size) r.sizeMismatch.push(it.path);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency) }, worker));
  const ok = items.filter((i) => !r.absent.includes(i.path));
  for (const it of pickSample(ok, o.sample, deps.random ?? Math.random)) {
    r.sampled++;
    try {
      const [src, dst] = await Promise.all([o.srcDownload(it.path), deps.download(it.path)]);
      if (md5Hex(src.bytes) !== md5Hex(dst.bytes)) r.hashMismatch.push(it.path);
      const pub = await deps.fetchPublic(it.path);
      if (pub.status !== 200 || !(pub.contentType ?? "").toLowerCase().startsWith("image/")) r.publicBad.push(it.path);
    } catch { r.publicBad.push(it.path); }
  }
  return r;
}

export function parseStateLines(text: string): Map<string, StateRec> {
  const m = new Map<string, StateRec>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line) as StateRec; if (typeof r.path === "string" && typeof r.size === "number" && typeof r.status === "string") m.set(r.path, { path: r.path, size: r.size, status: r.status }); } catch { /* 끊긴 마지막 줄은 무시 */ }
  }
  return m;
}
export const stateLine = (r: StateRec): string => JSON.stringify({ path: r.path, size: r.size, status: r.status });

/** 실패 원인 분류(출력용). 402/403 = Supabase 제한 또는 권한, 404 = 원본 없음, 429/5xx/시간 초과 = 재시도 대상 */
export type ErrorKind = "supabase-limit" | "source-missing" | "retry" | "other";
export function classifyError(e: unknown): { kind: ErrorKind; label: string } {
  const st = e instanceof HttpError || e instanceof FatalError ? e.httpStatus : undefined;
  if (st === 402 || st === 403) return { kind: "supabase-limit", label: `${st}: Supabase 제한 또는 권한` };
  if (st === 404) return { kind: "source-missing", label: "404: 원본 없음" };
  if (st === 429 || (st !== undefined && st >= 500) || st === 408) return { kind: "retry", label: `${st}: 재시도 대상` };
  const msg = e instanceof Error ? e.message : "";
  if (/abort|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg)) return { kind: "retry", label: "시간 초과/연결 오류: 재시도 대상" };
  return { kind: "other", label: "기타 오류(R2 쓰기 등)" };
}

/** 2차 복사용 보고: R2에 없는 개수·크기만 센다(HEAD만, 쓰기 없음). 이미 있으면(크기 일치) 제외 */
export async function countMissing(items: Item[], deps: Pick<Deps, "head" | "sleep">, o: { concurrency: number; backoff: Backoff }): Promise<{ checked: number; missing: number; missingBytes: number; sizeDiffers: number; failed: number }> {
  const r = { checked: 0, missing: 0, missingBytes: 0, sizeDiffers: 0, failed: 0 };
  let idx = 0;
  const worker = async () => {
    for (;;) {
      const it = items[idx++]; if (!it) return;
      try {
        const h = await withBackoff(() => deps.head(it.path), deps.sleep, o.backoff);
        r.checked++;
        if (h === null) { r.missing++; r.missingBytes += it.size ?? 0; }
        else if (it.size !== undefined && h.size !== it.size) { r.sizeDiffers++; r.missingBytes += it.size; }
      } catch { r.failed++; }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency) }, worker));
  return r;
}

/** 드라이런 기록(`<state>.plan`): 개수·용량만. --apply 는 이 기록이 없으면 거부한다 */
export type PlanRec = { at: string; total: number; totalBytes: number; toCopy: number };
export const planFileOf = (statePath: string): string => `${statePath}.plan`;
export function parsePlan(text: string): PlanRec | null {
  try {
    const r = JSON.parse(text) as PlanRec;
    return typeof r.at === "string" && Number.isFinite(r.total) && Number.isFinite(r.totalBytes) && Number.isFinite(r.toCopy) ? r : null;
  } catch { return null; }
}
export const planRecOf = (rep: { total: number; totalBytes: number; toCopy: number }, now: Date = new Date()): PlanRec => ({ at: now.toISOString(), total: rep.total, totalBytes: rep.totalBytes, toCopy: rep.toCopy });

/** 쓰기 전 확인: --state 가 있고 그 드라이런 기록이 있어야 한다. 막는 이유를 문장으로 돌려준다(통과면 null) */
export function planGate(a: Args, planText: string | null): string | null {
  if (!a.state) return "--apply 는 --state <파일> 이 필요합니다(드라이런 기록과 이어하기에 씁니다).";
  if (planText === null || parsePlan(planText) === null) return `드라이런 기록(${planFileOf(a.state)})이 없습니다. 먼저 --apply 없이 같은 --state 로 드라이런을 실행하세요.`;
  return null;
}
