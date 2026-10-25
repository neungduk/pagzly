/**
 * 회귀 — 453차 2 줄 길이·행간 잔여. 합성 21종 × 390·750폭에서 ① 본문 행간 이탈 ≤40(452차 끝 86) ② 한 줄 글자 수 이탈 중 **좁은 칸이 아닌 것**(390폭에서 상자 폭 ≥280px, 750폭에서 ≥460px)이
 * 22건 이하로 늘지 않는다(잠금: 24~25자 경계·영문 혼합이 대부분) ③ 제목 행간 이탈 0.
 */
import { run as measure, sum } from "../typo-metrics";

export const name = "줄 길이·행간 — 본문 행간 이탈 ≤40·본문 영역 줄 길이 이탈 ≤22·제목 행간 이탈 0";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows = await measure([390, 750]);
  const b = sum(rows, "bodyLh"), t = sum(rows, "titleLh");
  if (b > 40) fails.push(`본문 행간 이탈 ${b} > 40`);
  if (t > 0) fails.push(`제목 행간 이탈 ${t} > 0`);
  let wide = 0;
  for (const r of rows) for (const d of r.detail) {
    if (d.kind !== "lineLen") continue;
    const w = Number(/w(\d+)/.exec(d.info)?.[1] ?? 0);
    if (w >= (r.width < 700 ? 280 : 460)) wide += 1;
  }
  if (wide > 22) fails.push(`본문 영역 줄 길이 이탈 ${wide} > 22`);
  return fails;
}
