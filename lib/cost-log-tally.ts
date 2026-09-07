/**
 * 130차 — per-call [cost] 로그 옆의 배치 집계용 카운터.
 * 비즈니스 로직과 무관. generate-backdrop 시작 시 리셋, enhance 종료 시 요약.
 */
type Tally = { count: number; usd: number };

const tallies = new Map<string, Tally>();

export function resetCostLogTallies(): void {
  tallies.clear();
}

export function addCostLogTally(key: string, usd: number): void {
  const cur = tallies.get(key) ?? { count: 0, usd: 0 };
  cur.count += 1;
  cur.usd += usd;
  tallies.set(key, cur);
}

/** 파이프라인(또는 enhance 배치) 스캔용 요약 — 개별 로그는 그대로 둔 채 추가만 */
export function logCostLogTallySummaries(keys: string[]): void {
  for (const key of keys) {
    const t = tallies.get(key);
    if (!t || t.count <= 0) continue;
    console.log(`[cost] ${key} total: ${t.count}회 $${t.usd.toFixed(4)}`);
  }
}
