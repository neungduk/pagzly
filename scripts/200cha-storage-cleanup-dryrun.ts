/**
 * 200차 — Supabase images 버킷 정리 드라이런 (목록만, 삭제 없음).
 *
 *   npx tsx scripts/200cha-storage-cleanup-dryrun.ts
 *
 * 절대 규칙: Storage remove API 호출 금지. 분류·집계·리포트만.
 */
import fs from "fs";
import path from "path";
import { createServiceRoleClient } from "../lib/supabase/service-role";

const ROOT = path.join(__dirname, "..");
const BUCKET = "images";
const PAGE_SIZE = 100;
const CUTOFF_MS = 3 * 24 * 60 * 60 * 1000;
const OUT_JSON = path.join(ROOT, "review", "200cha-storage-cleanup-dryrun.json");
const OUT_SAMPLE = path.join(ROOT, "review", "200cha-storage-cleanup-dryrun-sample.md");

type ListedFile = {
  path: string;
  createdAt: string;
  size: number;
};

type FolderAgg = {
  folder: string;
  fileCount: number;
  totalBytes: number;
  oldestCreatedAt: string;
  newestCreatedAt: string;
  toDeleteCount: number;
  toKeepCount: number;
};

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isFolderEntry(item: {
  id: string | null;
  name: string;
  metadata: Record<string, unknown> | null;
}): boolean {
  // Supabase: 폴더는 id/metadata가 null. size가 있으면 파일로 확정.
  const size = (item.metadata as { size?: number } | null)?.size;
  if (typeof size === "number") return false;
  if (item.id == null || item.metadata == null) return true;
  // 확장자 없는 이름은 폴더로 취급 (uuid 세션 폴더 등)
  return !/\.[a-zA-Z0-9]{1,8}$/.test(item.name);
}

function joinPrefix(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name;
}

async function listViaStorageApi(files: ListedFile[]): Promise<"ok" | "quota"> {
  try {
    await listAllFilesRecursive("", files);
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/402|exceed_storage_size_quota|restricted/i.test(msg)) {
      console.warn(
        "storage.list blocked by quota — falling back to storage.objects catalog (still dry-run, no delete)",
      );
      return "quota";
    }
    throw e;
  }
}

async function listAllFilesRecursive(
  prefix: string,
  files: ListedFile[],
): Promise<void> {
  const supabase = createServiceRoleClient();
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`list failed at "${prefix || "/"}": ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.name === ".emptyFolderPlaceholder") continue;

      const fullPath = joinPrefix(prefix, item.name);
      if (isFolderEntry(item)) {
        await listAllFilesRecursive(fullPath, files);
        continue;
      }

      const meta = item.metadata as { size?: number } | null;
      const size = typeof meta?.size === "number" ? meta.size : 0;
      const createdAt =
        item.created_at ||
        item.updated_at ||
        new Date(0).toISOString();

      files.push({
        path: fullPath,
        createdAt,
        size,
      });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
}

/** Storage API가 쿼터로 잠겼을 때 — DB catalog만 읽어 목록 (remove 없음) */
async function listViaStorageObjectsTable(files: ListedFile[]): Promise<void> {
  const supabase = createServiceRoleClient();
  const page = 1000;
  let from = 0;

  for (;;) {
    const to = from + page - 1;
    const { data, error } = await supabase
      .schema("storage")
      .from("objects")
      .select("name, created_at, updated_at, metadata")
      .eq("bucket_id", BUCKET)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`storage.objects query failed: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      const name = row.name as string;
      if (!name || name.endsWith("/.emptyFolderPlaceholder")) continue;
      if (name.endsWith("/")) continue; // 폴더 마커

      const meta = row.metadata as { size?: number } | null;
      const size = typeof meta?.size === "number" ? meta.size : 0;
      const createdAt =
        (row.created_at as string | null) ||
        (row.updated_at as string | null) ||
        new Date(0).toISOString();

      files.push({ path: name, createdAt, size });
    }

    if (data.length < page) break;
    from += page;
  }
}

async function collectAllFiles(): Promise<{
  files: ListedFile[];
  source: "storage.list" | "storage.objects";
}> {
  const files: ListedFile[] = [];
  const mode = await listViaStorageApi(files);
  if (mode === "ok") return { files, source: "storage.list" };

  files.length = 0;
  await listViaStorageObjectsTable(files);
  return { files, source: "storage.objects" };
}

function topFolder(filePath: string): string {
  const i = filePath.indexOf("/");
  return i === -1 ? "(root)" : filePath.slice(0, i);
}

function buildFolderAggs(
  files: ListedFile[],
  cutoffIso: string,
): FolderAgg[] {
  const map = new Map<string, FolderAgg>();
  for (const f of files) {
    const folder = topFolder(f.path);
    let agg = map.get(folder);
    if (!agg) {
      agg = {
        folder,
        fileCount: 0,
        totalBytes: 0,
        oldestCreatedAt: f.createdAt,
        newestCreatedAt: f.createdAt,
        toDeleteCount: 0,
        toKeepCount: 0,
      };
      map.set(folder, agg);
    }
    agg.fileCount += 1;
    agg.totalBytes += f.size;
    if (f.createdAt < agg.oldestCreatedAt) agg.oldestCreatedAt = f.createdAt;
    if (f.createdAt > agg.newestCreatedAt) agg.newestCreatedAt = f.createdAt;
    if (f.createdAt < cutoffIso) agg.toDeleteCount += 1;
    else agg.toKeepCount += 1;
  }
  return [...map.values()].sort((a, b) => b.totalBytes - a.totalBytes);
}

function writeSampleMd(
  aggs: FolderAgg[],
  summary: {
    generatedAt: string;
    cutoffIso: string;
    listSource: string;
    totalObjects: number;
    toDeleteCount: number;
    toDeleteBytes: number;
    toKeepCount: number;
    toKeepBytes: number;
    elapsedMs: number;
  },
): void {
  const lines: string[] = [
    "# 200차 — images 버킷 정리 드라이런 요약",
    "",
    `- generatedAt: \`${summary.generatedAt}\``,
    `- cutoff (3일 전): \`${summary.cutoffIso}\``,
    `- bucket: \`${BUCKET}\``,
    `- listSource: \`${summary.listSource}\``,
    `- totalObjects: **${summary.totalObjects}**`,
    `- toDelete: **${summary.toDeleteCount}** (${formatBytes(summary.toDeleteBytes)})`,
    `- toKeep: **${summary.toKeepCount}** (${formatBytes(summary.toKeepBytes)})`,
    `- elapsed: ${summary.elapsedMs} ms`,
    "",
    "> 이 파일은 사람용 폴더 집계입니다. 전체 경로는 `200cha-storage-cleanup-dryrun.json`을 보세요.",
    "> **삭제는 수행하지 않았습니다** (드라이런).",
    "",
    "## 상위 폴더별 집계",
    "",
    "| folder | files | bytes | oldest | newest | delete | keep |",
    "|--------|------:|------:|--------|--------|-------:|-----:|",
  ];

  for (const a of aggs) {
    lines.push(
      `| \`${a.folder}\` | ${a.fileCount} | ${formatBytes(a.totalBytes)} | ${a.oldestCreatedAt} | ${a.newestCreatedAt} | ${a.toDeleteCount} | ${a.toKeepCount} |`,
    );
  }

  lines.push("");
  fs.writeFileSync(OUT_SAMPLE, lines.join("\n"), "utf8");
}

async function main() {
  const t0 = Date.now();
  loadEnvLocal();

  // 키 값 로그 금지 — 존재 여부만 확인
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim(),
  );
  if (!hasUrl || !hasKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY in .env.local",
    );
  }
  console.log("env ok: url=%s serviceRole=%s", hasUrl, hasKey);

  const generatedAt = new Date().toISOString();
  const cutoffMs = Date.now() - CUTOFF_MS;
  const cutoffIso = new Date(cutoffMs).toISOString();

  console.log("bucket=%s cutoff=%s (DRY RUN — no remove)", BUCKET, cutoffIso);

  const { files, source } = await collectAllFiles();
  console.log("list source:", source);

  const toDeletePaths: string[] = [];
  const toKeepPaths: string[] = [];
  let toDeleteBytes = 0;
  let toKeepBytes = 0;

  for (const f of files) {
    const createdMs = Date.parse(f.createdAt);
    const isOld = Number.isFinite(createdMs)
      ? createdMs < cutoffMs
      : f.createdAt < cutoffIso;
    if (isOld) {
      toDeletePaths.push(f.path);
      toDeleteBytes += f.size;
    } else {
      toKeepPaths.push(f.path);
      toKeepBytes += f.size;
    }
  }

  if (toDeletePaths.length + toKeepPaths.length !== files.length) {
    throw new Error(
      `classify mismatch: delete=${toDeletePaths.length} keep=${toKeepPaths.length} total=${files.length}`,
    );
  }

  const payload = {
    generatedAt,
    cutoffIso,
    bucket: BUCKET,
    listSource: source,
    totalObjects: files.length,
    toDelete: {
      count: toDeletePaths.length,
      totalBytes: toDeleteBytes,
      paths: toDeletePaths,
    },
    toKeep: {
      count: toKeepPaths.length,
      totalBytes: toKeepBytes,
      paths: toKeepPaths,
    },
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");

  const aggs = buildFolderAggs(files, cutoffIso);
  const elapsedMs = Date.now() - t0;
  writeSampleMd(aggs, {
    generatedAt,
    cutoffIso,
    listSource: source,
    totalObjects: files.length,
    toDeleteCount: toDeletePaths.length,
    toDeleteBytes,
    toKeepCount: toKeepPaths.length,
    toKeepBytes,
    elapsedMs,
  });

  // 샘플 인용용 (created_at 포함) — 키 미포함
  const byPath = new Map(files.map((f) => [f.path, f]));
  const keepSamples = toKeepPaths
    .slice()
    .sort((a, b) => {
      const ca = byPath.get(a)!.createdAt;
      const cb = byPath.get(b)!.createdAt;
      return cb.localeCompare(ca);
    })
    .slice(0, 5)
    .map((p) => byPath.get(p)!);
  const deleteSamples = toDeletePaths
    .slice()
    .sort((a, b) => {
      const ca = byPath.get(a)!.createdAt;
      const cb = byPath.get(b)!.createdAt;
      return ca.localeCompare(cb);
    })
    .slice(0, 5)
    .map((p) => byPath.get(p)!);

  console.log("=== summary ===");
  console.log("totalObjects", files.length);
  console.log(
    "toDelete",
    toDeletePaths.length,
    formatBytes(toDeleteBytes),
  );
  console.log("toKeep", toKeepPaths.length, formatBytes(toKeepBytes));
  console.log("elapsedMs", elapsedMs);
  console.log("json", OUT_JSON);
  console.log("sampleMd", OUT_SAMPLE);
  console.log("API calls: 0");
  console.log("remove() calls: 0");

  console.log("=== keep samples (newest) ===");
  for (const s of keepSamples) {
    console.log(s.createdAt, s.path, formatBytes(s.size));
  }
  console.log("=== delete samples (oldest) ===");
  for (const s of deleteSamples) {
    console.log(s.createdAt, s.path, formatBytes(s.size));
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg);
  try {
    const generatedAt = new Date().toISOString();
    const cutoffIso = new Date(Date.now() - CUTOFF_MS).toISOString();
    const blocker = {
      generatedAt,
      cutoffIso,
      bucket: BUCKET,
      status: "blocked",
      error: msg,
      note:
        "Supabase project storage is restricted (exceed_storage_size_quota). Both storage.list and storage.objects catalog returned the same restriction. No files were deleted. Re-run after temporary plan unlock or with direct DB access.",
      totalObjects: 0,
      toDelete: { count: 0, totalBytes: 0, paths: [] as string[] },
      toKeep: { count: 0, totalBytes: 0, paths: [] as string[] },
      removeCalls: 0,
      apiGenerateCalls: 0,
    };
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(blocker, null, 2), "utf8");
    fs.writeFileSync(
      OUT_SAMPLE,
      [
        "# 200차 — images 버킷 정리 드라이런 요약",
        "",
        `- generatedAt: \`${generatedAt}\``,
        `- cutoff: \`${cutoffIso}\``,
        `- status: **blocked**`,
        "",
        "## Blocker",
        "",
        "Supabase `images` 버킷 목록 API가 `exceed_storage_size_quota`로 잠겨 있습니다.",
        "`storage.from('images').list(...)` 와 `storage.objects` 카탈로그 조회 모두 동일 제한으로 실패했습니다.",
        "",
        "**삭제는 수행하지 않았습니다** (`remove()` 코드 없음).",
        "",
        "### 다음 액션 (201차 전)",
        "",
        "1. Supabase 대시보드에서 일시적으로 스토리지 쿼터/플랜 제한을 풀어 API 접근을 복구한 뒤 이 스크립트를 재실행, 또는",
        "2. Database 직접 접속(SQL Editor / `psql`)으로 `storage.objects`를 조회해 동일 분류 JSON을 만든 뒤 검토.",
        "",
        "전체 JSON: `review/200cha-storage-cleanup-dryrun.json`",
        "",
      ].join("\n"),
      "utf8",
    );
    console.log("wrote blocker artifacts", OUT_JSON, OUT_SAMPLE);
  } catch {
    // ignore secondary write failures
  }
  process.exit(1);
});
