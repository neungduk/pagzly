/**
 * 회귀 — 452차 1 퍼징 안정화. 서버 없이 확인되는 것: ① 같은 시드로 퍼징 사례를 두 번 만들면 완전히 같다(결정성, 앞 30개) ② 측정 도구가 안정화 대기(글꼴·이미지 decode·두 프레임 같은 상자)와
 * 재측정(두 번 다 위반일 때만 판정)을 갖고 있다 ③ 위반 비교 함수가 키(id·종류·글자)로 차이를 센다. 작업자 4 vs 1 실제 비교는 pc-verify `--full`의 dev 단계(fuzz-stability).
 */
import fs from "node:fs";
import { fuzzCases } from "../fuzz-sessions";
import { diffViolations } from "../fuzz-stability";

export const name = "퍼징 안정화 — 같은 시드 결정성·측정 안정화 대기·재측정·위반 비교";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const a = fuzzCases(200).slice(0, 30), b = fuzzCases(200).slice(0, 30);
  if (JSON.stringify(a) !== JSON.stringify(b)) fails.push("같은 시드 퍼징 사례가 두 번 다름");
  const src = fs.readFileSync("scripts/fuzz-live.ts", "utf8");
  for (const [re, what] of [[/document\.fonts\.ready/, "글꼴 로드 대기"], [/\.decode\(\)/, "이미지 decode 대기"], [/same < 2/, "두 프레임 연속 같은 상자 대기"], [/first\.filter\(/, "재측정 후 교집합 판정"]] as const) if (!re.test(src)) fails.push(`측정 도구에 ${what}가 없음`);
  const v = (id: string, d: string) => ({ kind: "R7 대비", id, detail: d });
  const d = diffViolations([v("x", "390px «A» 12px 1.0<4.5"), v("y", "«B»")], [v("x", "390px «A» 12px 1.0<4.5")]);
  if (d.onlyA.length !== 1 || d.onlyB.length !== 0) fails.push(`위반 비교 함수 오류: ${JSON.stringify(d)}`);
  return fails;
}
