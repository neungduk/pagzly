/**
 * 502 — 표시사항 전용 회귀 진입점 (`npm run regression:label-check`).
 */
import { LABEL_CHECK_SUITES } from "./label-check-suites";

async function main() {
  let failed = 0;
  const timings: Array<{ name: string; ms: number; ok: boolean }> = [];
  const tAll = Date.now();
  for (const suite of LABEL_CHECK_SUITES) {
    let fails: string[];
    const t0 = Date.now();
    try {
      fails = await suite.run();
    } catch (e) {
      fails = [`실행 오류: ${e instanceof Error ? e.message : String(e)}`];
    }
    const ms = Date.now() - t0;
    const ok = fails.length === 0;
    timings.push({ name: suite.name, ms, ok });
    console.log(`${ok ? "통과" : "실패"}  ${suite.name}  (${ms}ms)`);
    for (const f of fails) console.log(`      - ${f}`);
    if (!ok) failed += 1;
  }
  console.log("\n--- 소요 시간 ---");
  for (const t of timings) {
    console.log(`${t.ok ? "OK" : "NG"}\t${t.ms}ms\t${t.name}`);
  }
  const totalMs = Date.now() - tAll;
  console.log(
    failed
      ? `\n표시사항 회귀 실패 ${failed}/${LABEL_CHECK_SUITES.length} (총 ${totalMs}ms)`
      : `\n표시사항 회귀 통과 ${LABEL_CHECK_SUITES.length}/${LABEL_CHECK_SUITES.length} (총 ${totalMs}ms)`,
  );
  process.exit(failed ? 1 : 0);
}

void main();
