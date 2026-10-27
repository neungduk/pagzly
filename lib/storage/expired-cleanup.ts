import { CLEANUP_CHUNK_SIZE, CLEANUP_MAX_PER_RUN, EXPIRED_IMAGE_DAYS } from "@/lib/storage/policy";
import type { StorageProvider } from "@/lib/storage/types";

/**
 * 460차 — 만료 이미지 정리의 판정·실행(주입형: DB·저장소는 호출부가 넘긴다). 판정은 supabase/functions/cleanup-expired-images 와 같다:
 *   product_id 가 null(완성 상품으로 이어지지 않음) AND image_uploaded_at < now-3일 AND (protected_until 이 null 이거나 과거).
 *   완성된 상품의 이미지(product_id 있음)는 영구 보존. 엣지 함수와 달리 **저장소 삭제가 실패한 묶음의 행은 지우지 않고 남겨 다음 실행이 재시도**한다(R2 객체 고아 방지).
 */
export type ExpiredRow = { id: string; storage_path: string; product_id: string | null; image_uploaded_at: string; protected_until: string | null };

export const cutoffIso = (now: Date): string => new Date(now.getTime() - EXPIRED_IMAGE_DAYS * 86_400_000).toISOString();

export function isExpiredImage(row: ExpiredRow, now: Date): boolean {
  if (row.product_id !== null) return false;
  if (!(new Date(row.image_uploaded_at).getTime() < now.getTime() - EXPIRED_IMAGE_DAYS * 86_400_000)) return false;
  if (row.protected_until === null) return true;
  return new Date(row.protected_until).getTime() < now.getTime();
}

export type CleanupDeps = {
  /** DB 조회: 엣지 함수와 같은 조건(is product_id null · lt image_uploaded_at cutoff · protected_until null 또는 과거), 오래된 순, limit 개 */
  listCandidates(cutoff: string, nowIso: string, limit: number): Promise<{ rows: ExpiredRow[]; error: string | null }>;
  deleteRows(ids: string[]): Promise<{ error: string | null }>;
  storage: Pick<StorageProvider, "removeObjects" | "name">;
  now?: () => Date;
  limit?: number;
  chunkSize?: number;
};
export type CleanupResult = { ok: boolean; provider: string; selected: number; deleted: number; failedChunks: number; rowDeleteErrors: number; error?: string };

export async function runExpiredCleanup(d: CleanupDeps): Promise<CleanupResult> {
  const now = (d.now ?? (() => new Date()))();
  const limit = Math.max(1, Math.min(d.limit ?? CLEANUP_MAX_PER_RUN, CLEANUP_MAX_PER_RUN));
  const chunk = Math.max(1, d.chunkSize ?? CLEANUP_CHUNK_SIZE);
  const out: CleanupResult = { ok: true, provider: d.storage.name, selected: 0, deleted: 0, failedChunks: 0, rowDeleteErrors: 0 };
  const { rows, error } = await d.listCandidates(cutoffIso(now), now.toISOString(), limit);
  if (error) return { ...out, ok: false, error: "list_failed" };
  // 방어적 재판정 + 상한 + 중복 경로 제거(같은 행이 두 번 오면 한 번만)
  const picked = rows.filter((r) => isExpiredImage(r, now)).slice(0, limit);
  out.selected = picked.length;
  for (let i = 0; i < picked.length; i += chunk) {
    const part = picked.slice(i, i + chunk);
    const res = await d.storage.removeObjects([...new Set(part.map((r) => r.storage_path))]);
    if (res.error) { out.failedChunks += 1; continue; } // 행을 남겨 다음 실행이 재시도
    const del = await d.deleteRows(part.map((r) => r.id));
    if (del.error) out.rowDeleteErrors += 1; else out.deleted += part.length;
  }
  out.ok = out.failedChunks === 0 && out.rowDeleteErrors === 0;
  return out;
}
