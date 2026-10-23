/**
 * 회귀 — 443차 3 R17 셋째 조건(DOM 측정)과 간격 스냅: ① 측정 함수가 같은 면 이웃의 96px 초과 빈 간격·한 화면 안 간격 2배 초과 불균형을 센다(합성 HTML),
 * ② 말뭉치 export에서 AI 생성 콘텐츠 안내 섹션의 위·아래 여백이 32(스케일 안)이고 앞뒤 이웃과의 간격이 96px 이하, ③ 라이브 AI 안내도 같은 값(py-8). 호출 0·서버 0.
 */
import fs from "node:fs";
import { SPACE_V4 } from "../../lib/design-tokens-v4";
import { corpus, exportHtmlOf } from "../design-corpus";
import { measureDomPages } from "../design-metrics-dom";

export const name = "간격 스냅 — R17 셋째 조건 측정·AI 안내 위아래 32·이웃 간격 96 이하";

const sec = (bg: string, pt: number, pb: number, body = "x") => `<section style="background:${bg};padding:${pt}px 20px ${pb}px"><p>${body}</p></section>`;

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  const syn = await measureDomPages([
    ["same-face-112", `<body style="margin:0">${sec("#ffffff", 64, 64)}${sec("#ffffff", 48, 48)}</body>`],
    ["diff-face-112", `<body style="margin:0">${sec("#ffffff", 64, 64)}${sec("#f3eee8", 48, 48)}</body>`],
    ["same-face-96", `<body style="margin:0">${sec("#ffffff", 64, 64)}${sec("#ffffff", 32, 48)}</body>`],
    ["uneven", `<body style="margin:0">${sec("#ffffff", 20, 20)}${sec("#f3eee8", 20, 20)}${sec("#ffffff", 64, 64)}</body>`], // 간격 40 → 84(2.1배)
  ]);
  if (syn.get("same-face-112")!.gapBig !== 1) fails.push(`같은 면 112px 간격을 못 셈(${syn.get("same-face-112")!.gapBig})`);
  if (syn.get("diff-face-112")!.gapBig !== 0) fails.push("면이 다른 이웃을 빈 간격으로 셈");
  if (syn.get("same-face-96")!.gapBig !== 0) fails.push("96px(경계값)를 빈 간격으로 셈");
  if (syn.get("uneven")!.gapUneven < 1) fails.push("한 화면 안 간격 2배 초과 불균형을 못 셈");
  if (syn.get("same-face-96")!.gapUneven !== 0) fails.push("간격 둘뿐인 균형 화면을 불균형으로 셈");
  // 말뭉치 export: AI 안내 섹션
  const pages: Array<[string, string]> = corpus().map(([id, f]) => [id, exportHtmlOf(f)]);
  let aiSeen = 0;
  for (const [id, html] of pages) {
    for (const m of html.matchAll(/<section[^>]*style="padding:(\d+)px var\(--pz-pad-x,20px\);[^"]*"[^>]*>\s*<div style="max-width:36rem;margin:0 auto;text-align:center;border:1px solid/g)) {
      aiSeen += 1;
      if (Number(m[1]) !== SPACE_V4.sm) fails.push(`${id}: AI 안내 위·아래 여백 ${m[1]}px ≠ ${SPACE_V4.sm}`);
    }
  }
  if (corpus().length >= 18 && !aiSeen) fails.push("말뭉치에 AI 안내 섹션 없음(검사 무의미)");
  const dom = await measureDomPages(pages);
  for (const [id, m] of dom) if (m.padOff) fails.push(`${id}: 3단 밖 여백 ${m.padOff}곳`);
  // 라이브: v4일 때 py-8(= 32)
  const live = fs.readFileSync("components/DetailSectionRenderer.tsx", "utf8");
  if (!/DESIGN_V4_ENABLED \? "px-6 py-8 @min-\[640px\]\/pz:px-10" : "px-6 py-10 @min-\[640px\]\/pz:px-10"/.test(live)) fails.push("라이브 AI 안내 여백이 v4에서 py-8이 아님");
  return fails;
}
