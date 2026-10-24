/**
 * 회귀 — 448차 2 입력 퍼징(시드 고정 앞 30개, 360·390·750폭, 라이브 6개). 예외·빈 화면·undefined/NaN 노출·가로 넘침·잘린 글자·린트 error가 0.
 * 필수 입력인 제품명이 공백인 사례의 R10(히어로 제품명 없음)은 앱이 막는 입력이라 제외. 전체 200개: `npx tsx scripts/fuzz-check.ts`.
 */
import { runFuzz } from "../fuzz-check";

export const name = "입력 퍼징 30개(시드 고정) — 예외·undefined 노출·가로 넘침·잘린 글자·린트 error 0";

export async function run(): Promise<string[]> {
  const { cases, violations } = await runFuzz({ n: 200, live: 6, widths: [360, 390, 750], subset: 30 });
  const fails: string[] = [];
  if (cases.length !== 30) fails.push(`사례 수 ${cases.length}`);
  const blank = new Set(cases.filter((c) => c.ops.includes("제품명 공백")).map((c) => c.id));
  for (const v of violations) {
    if (v.kind === "렌더 느림") continue;
    if (v.kind === "린트 error" && /R10/.test(v.detail) && blank.has(v.id)) continue;
    fails.push(`${v.id} ${v.kind}: ${v.detail}`);
  }
  return fails.slice(0, 10);
}
