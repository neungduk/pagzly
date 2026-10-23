/**
 * 회귀 — 441차 1-5 신뢰 스트립(DESIGN_V4): 구매 카드 바로 위, 문구는 입력 원문(배지 또는 스펙 행 "라벨 값")만, 서로 포함 관계 중복 없음,
 * 2개 미만이면 생략(구매 카드 칩 그대로), 스트립으로 옮긴 배지는 구매 카드 칩에서 빠짐, 아이콘 전 항목. 호출 0.
 */
import fs from "node:fs";
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";

export const name = "신뢰 스트립 — 구매 카드 위·입력 원문만·중복 없음·2개 미만 생략·배지 이동";

type Sec = { type: string; badges?: string[]; v4?: { family: string; items?: Array<{ title: string }> } };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const files = corpus();
  if (files.length < 18) return fails;
  let shown = 0;
  for (const [id, f] of files) {
    const raw = fs.readFileSync(f, "utf8");
    const d = displayOf(f).sections as unknown as Sec[];
    const ti = d.findIndex((s) => s.v4?.family === "trust");
    const cta = d.find((s) => s.type === "cta_price");
    if (ti < 0) continue;
    shown += 1;
    if (d[ti + 1]?.type !== "cta_price") fails.push(`${id}: 신뢰 스트립이 구매 카드 바로 위가 아님`);
    const titles = (d[ti]!.v4!.items ?? []).map((x) => x.title);
    if (titles.length < 2 || titles.length > 4) fails.push(`${id}: 항목 수 ${titles.length}`);
    for (const t of titles) {
      // 입력 원문: 배지 그대로이거나 "라벨 값"의 두 부분이 각각 입력에 있음
      const parts = raw.includes(JSON.stringify(t).slice(1, -1)) ? [] : [t.slice(0, t.indexOf(" ")), t.slice(t.indexOf(" ") + 1)];
      for (const p of parts) if (!raw.includes(p)) fails.push(`${id}: 입력에 없는 문구 «${t}»`);
    }
    for (const a of titles) for (const b of titles) if (a !== b && b.includes(a)) fails.push(`${id}: 중복 «${a}» ⊂ «${b}»`);
    for (const bdg of cta?.badges ?? []) if (titles.some((t) => t.includes(bdg))) fails.push(`${id}: 옮긴 배지 «${bdg}»가 구매 카드에 남음`);
    const html = exportHtmlOf(f);
    const block = /data-pz-v4="trust\.strip"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
    if ((block.match(/data-pz-icon=/g) ?? []).length !== titles.length) fails.push(`${id}: 아이콘 수 ≠ 항목 수`);
  }
  if (!shown) fails.push("말뭉치에 신뢰 스트립이 하나도 없음");
  // 입력 없음 → 생략
  const sparse = files.find(([id]) => id === "fx-tier-sparse-tech-1p-noprice");
  if (sparse && (displayOf(sparse[1]).sections as unknown as Sec[]).some((s) => s.v4?.family === "trust")) fails.push("가격·배지 없는 픽스처에 신뢰 스트립");
  // 중복을 빼면 1개 → 생략, 칩 그대로
  const s418 = files.find(([id]) => id === "s418");
  if (s418) {
    const d = displayOf(s418[1]).sections as unknown as Sec[];
    if (d.some((s) => s.v4?.family === "trust")) fails.push("s418: 중복 제거 후 1개인데 스트립");
    if (!d.find((s) => s.type === "cta_price")?.badges?.includes("5만원 이상 무료배송")) fails.push("s418: 스트립 생략인데 구매 카드 배지가 빠짐");
  }
  return fails;
}
