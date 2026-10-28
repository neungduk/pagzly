/** 471차 회귀 진입점(요청된 경로): scripts/regression/hero-471.ts 를 단독 실행한다. 문자열 전용. */
import { run } from "./regression/hero-471";

void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
