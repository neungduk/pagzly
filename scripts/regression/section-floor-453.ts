/**
 * 회귀 — 453차 3 섹션 종류별 바닥. 합성 21종 × 390폭 최상위 구간(scripts/section-floor.ts) 중 구간 수 2 이상인 종류의 평균 점수 하한 ≥95, 사이즈 실측표(v4:spec.line) 평균 ≥97·외톨이 ≤3,
 * 모든 종류의 겹침·넘침 0(전 종류 전/후 동일, 하락 없음의 잠금).
 */
import { aggregate, run as measure } from "../section-floor";

export const name = "섹션 종류별 바닥 — 종류 평균 ≥95·사이즈 실측표 ≥97·겹침/넘침 0";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows = await measure(390);
  const aggs = aggregate(rows).filter((a) => a.n >= 2);
  for (const a of aggs) {
    if (a.mean < 95) fails.push(`${a.type} 평균 ${a.mean.toFixed(1)} < 95`);
    if (a.overlap > 0) fails.push(`${a.type} 겹침 ${a.overlap}`);
    if (a.overflow > 0) fails.push(`${a.type} 넘침 ${a.overflow}`);
  }
  const spec = aggs.find((a) => a.type === "v4:spec.line");
  if (!spec) fails.push("v4:spec.line 구간을 못 찾음");
  else { if (spec.mean < 97) fails.push(`사이즈 실측표 평균 ${spec.mean.toFixed(1)} < 97`); if (spec.orphan > 3) fails.push(`사이즈 실측표 외톨이 ${spec.orphan} > 3`); }
  return fails;
}
