/**
 * 400차 — 회귀 점검 한 번에 돌리기 (무료: 생성 API·Replicate·dev 서버·브라우저 모두 불필요).
 *   npx tsx scripts/regression/run-all.ts
 * 하나라도 실패하면 종료 코드 1. 입력은 모두 각 파일 안의 고정값이다.
 */
import * as keywordSplit from "./keyword-split";
import * as iconRules from "./icon-rules";
import * as deadTracking from "./dead-tracking";
import * as liveExportRender from "./live-export-render";
import * as sizeDiagram from "./size-diagram";
import * as conceptIconPolicy from "./concept-icon-policy";
import * as fashionCompositePolicy from "./fashion-composite-policy";

const SUITES = [keywordSplit, iconRules, deadTracking, liveExportRender, sizeDiagram, conceptIconPolicy, fashionCompositePolicy];

async function main() {
  let failed = 0;
  for (const suite of SUITES) {
    let fails: string[];
    try {
      fails = await suite.run();
    } catch (e) {
      fails = [`실행 오류: ${e instanceof Error ? e.message : String(e)}`];
    }
    console.log(`${fails.length ? "실패" : "통과"}  ${suite.name}`);
    for (const f of fails) console.log(`      - ${f}`);
    if (fails.length) failed += 1;
  }
  console.log(failed ? `\n회귀 점검 실패 ${failed}/${SUITES.length}` : `\n회귀 점검 통과 ${SUITES.length}/${SUITES.length}`);
  process.exit(failed ? 1 : 0);
}

void main();
