/**
 * 473차 안전망 — hero-473 + 직전 472 회귀 + V5 off 바이트(호출만).
 */
import { setDesignV5ForTests, setDesignUp1ForTests } from "../lib/design-v4";
import * as hero473 from "./regression/hero-473";
import * as hero472 from "./regression/hero-472";

async function main() {
  const fails: string[] = [];
  for (const m of [hero473, hero472]) {
    const f = await m.run();
    if (f.length) fails.push(`${m.name}\n` + f.slice(0, 40).map((x) => `  - ${x}`).join("\n"));
  }
  setDesignUp1ForTests(true);
  setDesignV5ForTests(false);
  // off 경로는 각 회귀 내부에서 검사. 여기서는 플래그만 원복.
  setDesignV5ForTests(false);
  if (fails.length) {
    console.log(fails.join("\n"));
    console.log("실패");
    process.exit(1);
  }
  console.log("통과");
}

void main();
