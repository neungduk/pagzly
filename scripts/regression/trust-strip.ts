/**
 * 회귀 — 441·442차 신뢰 문구(DESIGN_V4): 구매 카드 안(제품명 → 가격 → 혜택 칩 → 신뢰 → 버튼·안내), 문구는 입력 원문(배지 또는 스펙 행 "라벨 값")만,
 * 16자 이하·서로 포함 관계 중복 없음, 2개 미만이면 생략(구매 카드 칩 그대로), 옮긴 배지는 칩에서 빠짐, 아이콘 전 항목, 라이브·export가 같은 함수를 부름. 호출 0.
 */
import fs from "node:fs";
import { corpus, displayOf, exportHtmlOf } from "../design-corpus";

export const name = "신뢰 문구 — 구매 카드 안 순서·입력 원문만·16자 이하·중복 없음·2개 미만 생략·배지 이동·라이브/export 같은 함수";

type Cta = { type: string; badges?: string[]; trust?: string[] };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const files = corpus();
  if (files.length < 18) return fails;
  let shown = 0;
  for (const [id, f] of files) {
    const raw = fs.readFileSync(f, "utf8");
    const d = displayOf(f).sections as unknown as Cta[];
    const cta = d.find((s) => s.type === "cta_price");
    const titles = cta?.trust ?? [];
    if (!titles.length) continue;
    shown += 1;
    if (titles.length < 2 || titles.length > 4) fails.push(`${id}: 항목 수 ${titles.length}`);
    for (const t of titles) {
      if ([...t].length > 16) fails.push(`${id}: 요약 문구가 16자 초과 «${t}»`);
      // 입력 원문: 배지 그대로이거나 "라벨 값"의 두 부분이 각각 입력에 있음
      const parts = raw.includes(JSON.stringify(t).slice(1, -1)) ? [] : [t.slice(0, t.indexOf(" ")), t.slice(t.indexOf(" ") + 1)];
      for (const p of parts) if (!raw.includes(p)) fails.push(`${id}: 입력에 없는 문구 «${t}»`);
    }
    for (const a of titles) for (const b of titles) if (a !== b && b.includes(a)) fails.push(`${id}: 중복 «${a}» ⊂ «${b}»`);
    for (const bdg of cta?.badges ?? []) if (titles.some((t) => t.includes(bdg))) fails.push(`${id}: 옮긴 배지 «${bdg}»가 구매 카드 칩에 남음`);
    // 별도 블록이 아니라 카드 안: export 구매 카드 섹션 안에 있고, 가격 뒤·안내 문장 앞
    const html = exportHtmlOf(f);
    const card = /<section[^>]*class="pagzly-cta"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
    const at = card.indexOf("data-pz-trust");
    const priceAt = card.indexOf("₩");
    const noteAt = card.indexOf("배송·교환·환불은 판매자");
    if (at < 0) fails.push(`${id}: 구매 카드 안에 신뢰 문구가 없음`);
    else if (!(priceAt >= 0 && priceAt < at && (noteAt < 0 || at < noteAt))) fails.push(`${id}: 순서가 제품명·가격 → 신뢰 → 안내가 아님`);
    const block = /data-pz-trust[\s\S]*?<\/div><\/div>(?=\s*<|$)/.exec(card)?.[0] ?? card.slice(at);
    if ((block.match(/data-pz-icon=/g) ?? []).length < titles.length) fails.push(`${id}: 아이콘 수 < 항목 수`);
    if (/data-pz-v4="trust/.test(html)) fails.push(`${id}: 별도 신뢰 블록이 남음`);
  }
  if (!shown) fails.push("말뭉치에 신뢰 문구가 하나도 없음");
  // 입력 없음 → 생략
  const sparse = files.find(([id]) => id === "fx-tier-sparse-tech-1p-noprice");
  if (sparse && (displayOf(sparse[1]).sections as unknown as Cta[]).some((s) => s.trust?.length)) fails.push("가격·배지 없는 픽스처에 신뢰 문구");
  // 중복을 빼면 1개 → 생략, 칩 그대로
  const s418 = files.find(([id]) => id === "s418");
  if (s418) {
    const c = (displayOf(s418[1]).sections as unknown as Cta[]).find((s) => s.type === "cta_price");
    if (c?.trust?.length) fails.push("s418: 중복 제거 후 1개인데 신뢰 문구");
    if (!c?.badges?.includes("5만원 이상 무료배송")) fails.push("s418: 생략인데 구매 카드 배지가 빠짐");
  }
  // 라이브·export가 같은 함수를 부른다
  const liveSrc = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  const expSrc = fs.readFileSync("lib/export-detail-html.ts", "utf8");
  if (!/ctaTrustHtml\(section\.trust, theme\)/.test(liveSrc) || !/ctaTrustHtml\(section\.trust, theme\)/.test(expSrc)) fails.push("라이브·export가 같은 ctaTrustHtml을 부르지 않음");
  return fails;
}
