/**
 * 회귀 — 452차 3 린트 점수 하한. 합성 21종(DOM 측정 포함, `npx tsx scripts/design-lint.ts`와 같은 경로)의 최저 ≥ 85·평균 ≥ 92(지시서 목표는 80·83, 452차 결과 87·95.2를 잠금).
 * R6 error(12px 미만)·R7·R10 error는 0이어야 한다.
 */
import { lintCorpus } from "../design-lint";

export const name = "린트 점수 하한 — 합성 21종 최저 ≥85·평균 ≥92·error 0";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rs = (await lintCorpus()).filter((r) => r.id.startsWith("fx-"));
  if (rs.length < 21) fails.push(`합성 ${rs.length}종 < 21`);
  const avg = rs.reduce((a, r) => a + r.score, 0) / Math.max(1, rs.length);
  const min = Math.min(...rs.map((r) => r.score));
  if (min < 85) fails.push(`최저 ${min} < 85 (${rs.filter((r) => r.score < 85).map((r) => r.id).join(", ")})`);
  if (avg < 92) fails.push(`평균 ${avg.toFixed(1)} < 92`);
  for (const r of rs) for (const i of r.issues.filter((x) => x.sev === "error")) fails.push(`${r.id} ${i.rule} error ${i.msg}`);
  return fails.slice(0, 10);
}
