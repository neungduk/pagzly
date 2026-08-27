import type { GenerationAttemptStore } from "@/lib/cost/attempt-store";
import { getImageJobStoreMode } from "@/lib/image-router/jobs/job-store-config";
import {
  getMemoryAttemptStore,
  type MemoryGenerationAttemptStore,
} from "@/lib/cost/memory-attempt-store";
import { createWorkerAttemptStore } from "@/lib/cost/supabase-attempt-store";
import { isServiceRoleAvailable } from "@/lib/supabase/service-role";

export function getAttemptStore(): GenerationAttemptStore {
  if (getImageJobStoreMode() === "memory") {
    return getMemoryAttemptStore();
  }
  if (isServiceRoleAvailable()) {
    return createWorkerAttemptStore();
  }
  return getMemoryAttemptStore();
}

export function getMemoryAttemptStoreForTests(): MemoryGenerationAttemptStore {
  return getMemoryAttemptStore();
}
