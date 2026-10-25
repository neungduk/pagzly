/**
 * 회귀 — 451차 2 히어로 필수 요소(제품명·훅·가격)가 합성 21종 × 390·750폭에서 첫 화면(390→844, 750→1000) 안에 들어온다(브라우저 실측, scripts/hero-fold-check.ts).
 */
import { run as measure } from "../hero-fold-check";

export const name = "히어로 첫 화면 — 제품명·훅·가격이 390(844)·750(1000)폭 첫 화면 안(합성 21종 실측)";

export async function run(): Promise<string[]> {
  const rows = await measure();
  const fails = rows.filter((r) => r.out.length).map((r) => `${r.id} ${r.width}px ${r.variant}: ${r.out.join(", ")}`);
  if (rows.length < 42) fails.push(`측정 ${rows.length}건 < 42`);
  return fails;
}
