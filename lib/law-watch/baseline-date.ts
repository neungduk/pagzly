/**
 * 516 — 화면용 법령 확인 기준일.
 * 모든 감시 항목 스냅샷의 가장 오래된 last_checked_at.
 * 7일 초과·데이터 부족·조회 실패 → null (줄 숨김).
 */
import { createServiceRoleClient, isServiceRoleAvailable } from "@/lib/supabase/service-role";
import { getLawWatchList516 } from "./watch-list";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function formatLawBaselineLine516(isoDate: string): string {
  const d = isoDate.slice(0, 10);
  return `법령 확인 기준일: ${d} · 화장품법·시행령·시행규칙`;
}

/** 순수 함수 — 테스트용 */
export function pickLawBaselineDate516(
  rows: { key: string; last_checked_at: string | null }[],
  watchKeys: string[],
  nowMs = Date.now(),
): string | null {
  if (!watchKeys.length) return null;
  const byKey = new Map(
    rows
      .filter((r) => r.last_checked_at)
      .map((r) => [r.key, r.last_checked_at as string]),
  );
  const times: number[] = [];
  for (const k of watchKeys) {
    const raw = byKey.get(k);
    if (!raw) return null;
    const t = Date.parse(raw);
    if (Number.isNaN(t)) return null;
    times.push(t);
  }
  const oldest = Math.min(...times);
  if (nowMs - oldest > MAX_AGE_MS) return null;
  return new Date(oldest).toISOString().slice(0, 10);
}

export async function getLawWatchBaselineLabel516(): Promise<string | null> {
  try {
    if (!isServiceRoleAvailable()) return null;
    const keys = getLawWatchList516().map((i) => i.key);
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("law_watch_snapshots")
      .select("key, last_checked_at");
    if (error || !data) return null;
    const day = pickLawBaselineDate516(data, keys);
    if (!day) return null;
    return formatLawBaselineLine516(day);
  } catch {
    return null;
  }
}
