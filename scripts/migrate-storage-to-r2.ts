/**
 * 460차 — Supabase Storage `images` 버킷 전체를 같은 경로로 Cloudflare R2에 복사·검증한다. **사용자가 PC에서 실행**(클라우드에서는 실행하지 않았다).
 *
 *   드라이런(기본, 쓰기 없음):   npx tsx scripts/migrate-storage-to-r2.ts --state state.jsonl
 *   목록 파일로:                 npx tsx scripts/migrate-storage-to-r2.ts --from-urls urls.txt
 *   실제 복사:                   npx tsx scripts/migrate-storage-to-r2.ts --apply --confirm "R2로 복사" --state state.jsonl --failures failed.txt
 *   검증(읽기 전용):             npx tsx scripts/migrate-storage-to-r2.ts --verify --sample 30
 *
 * 환경변수(값은 출력·저장하지 않는다): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(목록 API용; --from-urls면 불필요), R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 * 옵션: --concurrency N(기본 4, 최대 16) --retries N(5) --timeout-ms N(30000) --limit N --prefix <경로접두> --sample N(검증 표본, 20)
 * 다운로드 egress: Storage 약 0.2GB를 한 번 내려받는다(Supabase Cached Egress). 402/403이면 원인을 출력하고 즉시 멈춘다.
 */
import fs from "node:fs";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readR2Config, StorageConfigError } from "../lib/storage";
import { createR2Provider, r2Endpoint } from "../lib/storage/r2-provider";
import { STORAGE_BUCKET } from "../lib/storage/policy";
import { legacyPathOf } from "../lib/storage/legacy-url";
import {
  CONFIRM_PHRASE, FatalError, HttpError, dryRunReport, parseArgs, parseStateLines, runCopy, stateLine, verifyAll, writeAllowed,
  type Args, type Deps, type Item, type StateRec,
} from "../lib/storage/migrate-core";

const BACKOFF = (a: Args) => ({ retries: a.retries, baseMs: 1000, capMs: 30_000 });
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const need = (k: string): string => { const v = (process.env[k] ?? "").trim(); if (!v) { console.error(`환경변수 ${k} 가 없습니다(값은 출력하지 않습니다).`); process.exit(2); } return v; };
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;

async function listAll(supaUrl: string, a: Args): Promise<Item[]> {
  const key = need("SUPABASE_SERVICE_ROLE_KEY");
  const out: Item[] = [];
  const walk = async (prefix: string): Promise<void> => {
    for (let offset = 0; ; offset += 1000) {
      const res = await fetch(`${supaUrl}/storage/v1/object/list/${STORAGE_BUCKET}`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, apikey: key },
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }), signal: AbortSignal.timeout(a.timeoutMs),
      });
      if (res.status === 402 || res.status === 403) throw new FatalError(`목록 API가 ${res.status}로 거절했습니다. 서비스 키·결제·한도를 확인하세요.`, res.status);
      if (!res.ok) throw new HttpError(res.status, `목록 API HTTP ${res.status}`);
      const rows = (await res.json()) as Array<{ name: string; id: string | null; metadata?: { size?: number } | null }>;
      for (const r of rows) {
        const p = prefix ? `${prefix}/${r.name}` : r.name;
        if (r.id === null) await walk(p); // 폴더
        else out.push({ path: p, size: r.metadata?.size });
      }
      if (rows.length < 1000) return;
    }
  };
  await walk(a.prefix ?? "");
  return out;
}

function fromUrlsFile(file: string, supaUrl: string): Item[] {
  const hosts = [new URL(supaUrl).host];
  const seen = new Set<string>(); const items: Item[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim(); if (!t) continue;
    const p = legacyPathOf(t, { hosts }) ?? (t.includes("://") ? null : t);
    if (p && !seen.has(p)) { seen.add(p); items.push({ path: p }); }
  }
  return items;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.apply && a.confirm !== CONFIRM_PHRASE) { console.error(`--apply 는 --confirm "${CONFIRM_PHRASE}" 와 함께여야 합니다. 쓰기 없이 종료합니다.`); process.exit(2); }
  const supaUrl = need("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
  const state = a.state && fs.existsSync(a.state) ? parseStateLines(fs.readFileSync(a.state, "utf8")) : new Map<string, StateRec>();

  let items = a.fromUrls ? fromUrlsFile(a.fromUrls, supaUrl) : await listAll(supaUrl, a);
  if (a.prefix) items = items.filter((i) => i.path.startsWith(a.prefix!));
  if (a.limit) items = items.slice(0, a.limit);

  let cfg; try { cfg = readR2Config(); } catch (e) { if (e instanceof StorageConfigError) { console.error(e.message); process.exit(2); } throw e; }
  const s3 = new S3Client({ region: "auto", endpoint: r2Endpoint(cfg.accountId), credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  const provider = createR2Provider(cfg, { client: s3 });
  const srcUrl = (p: string) => `${supaUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`;
  const download = async (p: string) => {
    const res = await fetch(srcUrl(p), { signal: AbortSignal.timeout(a.timeoutMs) });
    if (!res.ok) throw new HttpError(res.status);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  };
  const head = async (p: string) => {
    try { const r = await s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: p })); return { size: r.ContentLength ?? 0, etag: r.ETag, contentType: r.ContentType }; }
    catch (e) { const st = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode; if (st === 404) return null; throw e; }
  };
  const r2Download = async (p: string) => {
    const r = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: p }));
    return { bytes: await r.Body!.transformToByteArray(), contentType: r.ContentType ?? "" };
  };

  if (a.verify) {
    const res = await verifyAll(items, { head, download: r2Download, sleep, fetchPublic: async (p) => { const r = await fetch(provider.getPublicUrl(p), { method: "HEAD", signal: AbortSignal.timeout(a.timeoutMs) }); return { status: r.status, contentType: r.headers.get("content-type") }; } }, { sample: a.sample, concurrency: a.concurrency, backoff: BACKOFF(a), srcDownload: download });
    console.log(`검증: 확인 ${res.checked}개, 표본 ${res.sampled}개 / R2에 없음 ${res.absent.length}, 크기 불일치 ${res.sizeMismatch.length}, 해시 불일치 ${res.hashMismatch.length}, 공개 주소 이상 ${res.publicBad.length}`);
    for (const [k, v] of Object.entries({ absent: res.absent, sizeMismatch: res.sizeMismatch, hashMismatch: res.hashMismatch, publicBad: res.publicBad })) for (const p of v.slice(0, 20)) console.log(`  - ${k}: ${p}`);
    process.exit(res.absent.length + res.sizeMismatch.length + res.hashMismatch.length + res.publicBad.length ? 1 : 0);
  }

  const rep = dryRunReport(items, state);
  console.log(`대상 ${rep.total}개 · 총 ${mb(rep.totalBytes)}(목록 API가 크기를 준 것만 합산) · 상태 파일 기준 이미 완료 ${rep.alreadyDone} · 복사 예정 ${rep.toCopy}`);
  console.log(`예상 R2 쓰기(Class A) 요청 ${rep.estClassA}건 = 월 무료 100만 건의 ${rep.freeShare}`);
  console.log(`예상 Supabase 다운로드 egress: 약 ${mb(rep.totalBytes)} (한 번)`);
  if (!writeAllowed(a)) { console.log(`드라이런입니다 — 아무것도 쓰지 않았습니다. 복사하려면 --apply --confirm "${CONFIRM_PHRASE}" 를 붙이세요.`); return; }

  const deps: Deps = { download, head, put: (p, b, ct, cc) => provider.putObject({ path: p, body: b, contentType: ct, cacheControl: cc, upsert: true }), sleep };
  const stateFd = a.state ? fs.openSync(a.state, "a") : null;
  let n = 0;
  const { summary, failures, fatal } = await runCopy(items, deps, {
    concurrency: a.concurrency, backoff: BACKOFF(a), done: state,
    record: (r) => { if (stateFd !== null) fs.writeSync(stateFd, stateLine(r) + "\n"); if (++n % 100 === 0) console.log(`  진행 ${n}/${items.length}`); },
  });
  if (stateFd !== null) fs.closeSync(stateFd);
  if (a.failures) fs.writeFileSync(a.failures, failures.map((f) => f.path).join("\n") + (failures.length ? "\n" : ""));
  console.log(`복사 ${summary.copied}(${mb(summary.bytesCopied)}) · 건너뜀 ${summary.skipped} · 원본 없음 ${summary.missing} · 실패 ${summary.failed}`);
  if (fatal) { console.error(`중단: ${fatal.message}`); process.exit(3); }
  if (summary.failed) { console.error(`실패 ${summary.failed}건${a.failures ? ` — 목록: ${a.failures}` : ""}. 같은 명령을 다시 실행하면 이어서 처리합니다.`); process.exit(1); }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : "알 수 없는 오류"); process.exit(1); });
