/**
 * 회귀 — 452차 2 한글 타이포. ① 합성 21종 × 390·750폭 DOM 지표가 전(451차 끝: 외톨이 35 · 끊김 35 · 본문 행간 이탈 153)보다 나아졌다 — 외톨이 ≤22 · 본문 행간 이탈 ≤95 · 끊김 ≤35 · 제목 행간 이탈 0
 * ② 글을 바꾸는 유일한 수정인 bindTail이 글자(공백 정규화 후)를 바꾸지 않는다 ③ typo CSS에 금지 기법(`text-wrap`·`:has(`)이 없다.
 */
import { bindTail } from "../../lib/typo-rhythm";
import { typoCssExport } from "../../lib/typo-v4";
import { run as measure, sum } from "../typo-metrics";

export const name = "한글 타이포 — 외톨이·본문 행간 이탈 감소·끊김 증가 없음·bindTail 글자 불변·금지 기법 없음";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const rows = await measure([390, 750]);
  const o = sum(rows, "orphan"), m = sum(rows, "midword"), b = sum(rows, "bodyLh"), t = sum(rows, "titleLh");
  if (o > 22) fails.push(`외톨이 ${o} > 22 (전 35)`);
  if (b > 95) fails.push(`본문 행간 이탈 ${b} > 95 (전 153)`);
  if (m > 35) fails.push(`단어 중간 끊김 ${m} > 35`);
  if (t > 0) fails.push(`제목 행간 이탈 ${t} > 0`);
  for (const s of ["얼굴에 뿌려 수분 보충", "메이크업 위에도 사용 가능", "주변 소리는 그대로 듣고", "단백질 바", "하나"]) {
    const out = bindTail(s);
    if (out.replace(/<[^>]+>/g, "").replace(/\s+/g, " ") !== s.replace(/\s+/g, " ")) fails.push(`bindTail이 글자를 바꿈: ${s}`);
  }
  const css = typoCssExport(".x");
  if (/text-wrap|:has\(|@container|clip-path|mask|mix-blend/.test(css)) fails.push("typo CSS에 금지 기법");
  return fails;
}
