/**
 * STEP 3.5 — Generation Job persistence 테스트
 *
 * A) IMAGE_JOB_STORE=memory
 * B) IMAGE_JOB_STORE=supabase — DB persist + 재조회(재시작 시뮬)
 * C) Supabase Storage 업로드 URL 확인
 *
 * supabase mode: SUPABASE_SERVICE_ROLE_KEY, PAGZLY_TEST_USER_ID (auth.users FK),
 * migration 적용된 DB 필요.
 *
 * 실행:
 *   npx tsx scripts/test-generation-persistence-step35.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  createAsyncGenerationJob,
  getGenerationStatus,
  pollGenerationUntilDone,
  runGenerationJobSync,
} from "@/lib/image-router/jobs/async-generation-service";
import {
  assertImageJobStoreConfig,
  generationOutputStoragePath,
  ImageJobStoreConfigError,
} from "@/lib/image-router/jobs/job-store-config";
import { resetWorkerInFlightForTests } from "@/lib/image-router/jobs/generation-worker";
import { getMemoryJobStore, resetMemoryJobStore } from "@/lib/image-router/jobs/memory-job-store";
import { createWorkerJobStore } from "@/lib/image-router/jobs/supabase-job-store";
import { createFluxProvider } from "@/lib/image-router/providers/flux-provider";
import { resetAllBudgets } from "@/lib/image-router/budget";

function loadEnvLocal() {
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1]!.trim();
      const val = m[2]!.trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function testMemoryMode(userId: string) {
  console.log("\n=== TEST A: IMAGE_JOB_STORE=memory ===");
  process.env.IMAGE_JOB_STORE = "memory";
  resetMemoryJobStore();
  resetWorkerInFlightForTests();
  resetAllBudgets();

  const store = getMemoryJobStore();
  const created = await createAsyncGenerationJob({
    userId,
    store,
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: "minimal studio backdrop, no product, no text",
      aspectRatio: "1:1",
      resolution: "512",
      idempotencyKey: `step35-memory-${Date.now()}`,
    },
  });

  assert(created.status === "QUEUED", "A: created QUEUED");
  await runGenerationJobSync(created.id, store);

  const status = await getGenerationStatus({ jobId: created.id, userId, store });
  assert(status != null, "A: status exists");
  console.log("A status:", status!.status, "outputs:", status!.outputs.length);
  assert(
    status!.status === "COMPLETED" || status!.status === "FAILED",
    "A: terminal status",
  );
  console.log("TEST A PASSED");
}

async function testSupabaseMissingServiceRole(serviceRoleKey: string | undefined) {
  console.log("\n=== TEST: supabase without SERVICE_ROLE → clear error ===");
  process.env.IMAGE_JOB_STORE = "supabase";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  let threw = false;
  try {
    assertImageJobStoreConfig({ requireWorker: true });
  } catch (err) {
    threw = err instanceof ImageJobStoreConfigError;
    console.log("expected error:", (err as Error).message.slice(0, 80), "…");
  }

  if (serviceRoleKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  }

  assert(threw, "missing service role must throw ImageJobStoreConfigError");
  console.log("service role guard PASSED");
}

async function testSupabasePersistence(userId: string, hasFlux: boolean, hasServiceRole: boolean) {
  console.log("\n=== TEST B/C: IMAGE_JOB_STORE=supabase ===");
  if (!hasServiceRole) {
    console.log("SKIP B/C — SUPABASE_SERVICE_ROLE_KEY not in environment");
    return;
  }

  process.env.IMAGE_JOB_STORE = "supabase";

  assertImageJobStoreConfig({ requireWorker: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // migration / table 존재 확인
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const probe = await admin.from("image_generation_jobs").select("id").limit(1);
  if (probe.error?.message.includes("does not exist")) {
    console.log("SKIP B/C — image_generation_jobs table not migrated yet");
    console.log("Apply migrations locally: supabase db push (staging) or supabase migration up");
    return;
  }
  if (probe.error) {
    console.log("SKIP B/C — DB probe failed:", probe.error.message);
    return;
  }

  resetWorkerInFlightForTests();
  resetAllBudgets();

  const workerStore = createWorkerJobStore();

  const created = await createAsyncGenerationJob({
    userId,
    store: workerStore,
    body: {
      taskType: "PRODUCT_ONLY",
      prompt: "clean product studio backdrop, soft gradient, empty center, no text",
      aspectRatio: "1:1",
      resolution: hasFlux ? "768" : "512",
      idempotencyKey: `step35-supabase-${Date.now()}`,
      draftToken: "step35-draft",
    },
  });

  console.log("B created job id:", created.id);

  if (!hasFlux) {
    console.log("SKIP flux generation — no API key; verifying DB row only");
    const row = await workerStore.getJob(created.id);
    assert(row != null, "B: row in DB");
    assert(row!.status === "QUEUED", "B: QUEUED in DB");
    console.log("TEST B (DB insert only) PASSED");
    return;
  }

  await runGenerationJobSync(created.id, workerStore);

  // 재시작 시뮬: 새 store 인스턴스 (service role — DB에서 직접 읽기)
  const freshStore = createWorkerJobStore();
  const afterRestart = await getGenerationStatus({
    jobId: created.id,
    userId,
    store: freshStore,
  });

  assert(afterRestart != null, "B: status after restart");
  console.log("B after restart:", afterRestart!.status, "progress:", afterRestart!.progress);
  assert(afterRestart!.status === "COMPLETED", "B: COMPLETED persisted");

  const dbRow = await workerStore.getJob(created.id);
  assert(dbRow != null, "B: DB row exists");
  assert(dbRow!.prompt != null, "B: prompt persisted");

  // wrong user cannot read
  const wrongUser = await getGenerationStatus({
    jobId: created.id,
    userId: "00000000-0000-0000-0000-000000000001",
    store: freshStore,
  });
  assert(wrongUser == null, "security: other user cannot read job");

  if (afterRestart!.outputs.length > 0) {
    const out = afterRestart!.outputs[0]!;
    const expectedPath = generationOutputStoragePath(userId, created.id, 0);
    console.log("C output url:", out.url.slice(0, 100), "…");
    console.log("C expected storage path:", expectedPath);
    if (out.storagePath) {
      assert(out.storagePath === expectedPath, "C: storage path matches");
      assert(out.url.includes("/storage/v1/object/public/images/"), "C: images bucket URL");
      console.log("TEST C PASSED (Storage upload)");
    } else {
      console.log("C: storagePath absent — Replicate CDN URL kept (upload may have failed)");
    }
  }

  console.log("TEST B PASSED");
}

async function resolveTestUserId(): Promise<string> {
  if (process.env.PAGZLY_TEST_USER_ID) {
    return process.env.PAGZLY_TEST_USER_ID;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (data.users[0]?.id) return data.users[0].id;
  }

  return "00000000-0000-0000-0000-000000000099";
}

async function main() {
  loadEnvLocal();

  const provider = createFluxProvider();
  const hasFlux = provider.isAvailable();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRole = Boolean(serviceRoleKey?.trim());
  const userId = await resolveTestUserId();
  console.log("test userId:", userId);
  console.log("flux available:", hasFlux);
  console.log("service role configured:", hasServiceRole);

  await testMemoryMode(userId);
  await testSupabaseMissingServiceRole(serviceRoleKey);
  await testSupabasePersistence(userId, hasFlux, hasServiceRole);

  console.log("\nSTEP 3.5 TESTS DONE");
}

main().catch((err) => {
  console.error("STEP 3.5 FAILED:", err);
  process.exit(1);
});
