/**
 * 회귀 — 457차 1. launch-smoke가 공개 페이지 실패 메시지에 **어느 요청이 4xx/5xx였는지(메서드·경로)와 연결 실패**를 포함한다(콘솔의 «하위 리소스 500»에는 주소가 없어 원인을 못 찾았다).
 * 서버를 띄우는 실제 스모크는 pc-verify의 smoke 단계가 한다.
 */
import fs from "node:fs";

export const name = "launch-smoke 진단 — 4xx/5xx·연결 실패 요청의 경로를 실패 메시지에 포함";

export async function run(): Promise<string[]> {
  const src = fs.readFileSync("scripts/launch-smoke.ts", "utf8");
  const fails: string[] = [];
  for (const [re, what] of [[/page\.on\("response"/, "응답 상태 수집"], [/r\.status\(\) >= 400/, "4xx/5xx 판정"], [/page\.on\("requestfailed"/, "요청 실패 수집"], [/bad\.slice\(0, 3\)/, "메시지에 요청 경로 포함"]] as const) if (!re.test(src)) fails.push(`launch-smoke에 ${what}가 없음`);
  return fails;
}
