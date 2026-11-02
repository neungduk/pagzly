/** 472차 회귀 진입점: scripts/regression/hero-472.ts 단독 실행. 문자열 전용. */
import { run } from "./regression/hero-472";

void run().then((f) => { console.log(f.length ? f.slice(0, 80).join("\n") : "통과"); process.exit(f.length ? 1 : 0); });
