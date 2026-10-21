/**
 * 회귀 — 427차 1-3 랜딩 근거 없는 수치 정리. 랜딩·비교표·상담봇 공식 정보에 근거 없는 수치("$0.16"·"3~7일"·"5만~30만원"·"2~3분"·"2분 안에")와
 * 옛 무료 토큰 표기, 시간·매출 효과 단정이 다시 들어오지 않는다. 시간 문구는 "약 5분 내외", 무료 혜택은 "첫 1회 무료 생성"으로 일치한다. 호출 0.
 */
import fs from "node:fs";

export const name = "랜딩 문구 — 근거 없는 수치·효과 단정 없음, 시간 '약 5분 내외'·무료 '첫 1회' 일치";

const FILES = ["app/page.tsx", "lib/landing-content.ts", "components/LandingHero.tsx", "components/LandingMarquee.tsx", "components/ComparisonTable.tsx", "lib/support-chat-prompt.ts"];
const BANNED: Array<[RegExp, string]> = [
  [/\$\s?0\.16/, "비교표 원가 $0.16"],
  [/3~7일/, "외주 소요일 수치"],
  [/5만~30만/, "외주 비용 수치"],
  [/2~3분|2–3분|2분 안에|2 MIN/, "옛 시간 문구"],
  [/무료 토큰/, "옛 무료 토큰 표기"],
  [/놓치는 주문|오늘의 매출|주문을\s*끊/, "매출·주문 효과 단정"],
  [/SELL FASTER/, "매출 효과 슬로건"],
  [/어떤 판매 채널/, "모든 채널 단정"],
];

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const all = FILES.map((f) => [f, fs.readFileSync(f, "utf8")] as const);
  for (const [f, t] of all) for (const [re, label] of BANNED) if (re.test(t)) fails.push(`${f}: ${label}`);
  const joined = all.map(([, t]) => t).join("\n");
  if (!/약 5분 내외/.test(joined)) fails.push("'약 5분 내외' 없음");
  if (!/첫 1회 무료 생성/.test(joined)) fails.push("'첫 1회 무료 생성' 없음");
  // 비교표 행에는 숫자·화폐 단위 비교가 없어야 한다
  const table = fs.readFileSync("components/ComparisonTable.tsx", "utf8");
  const rows = table.slice(table.indexOf("const rows"), table.indexOf("];", table.indexOf("const rows")));
  if (/\d/.test(rows.replace(/\/\/.*$/gm, ""))) fails.push("비교표 행에 숫자가 있음");
  return fails;
}
