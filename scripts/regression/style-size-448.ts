/**
 * 회귀 — 448차 5 성능 예산. ① 합성 21종 export HTML ≤ 예산(일반 150KB·풍부 220KB), ② 반복 style 묶기: 되돌리면(expand) 묶기 표식이 사라지고 두 번 묶어도 같음,
 * 묶은 쪽이 되돌린 쪽보다 평균 3% 이상 작음, 대표 3종 390폭에서 모든 요소 계산 스타일 동일(애니메이션 정지 상태), ③ PNG 대조 순수 함수(구간 계획·구간 비교).
 */
import sharp from "sharp";
import { BUDGET_KB, isRich, measureCorpus } from "../size-budget";
import { dedupeStyles, expandDedupedStyles } from "../../lib/style-dedupe";
import { corpus, exportHtmlOf } from "../design-corpus";
import { diffDocs } from "../style-dedupe-check";
import { launch } from "../eye-lib";
import { planCaptureParts } from "../../lib/capture-detail-png";
import { compareImages } from "../png-compare";

export const name = "성능 예산 — export 크기 예산·반복 style 묶기(역변환·계산 스타일 동일)·PNG 대조 함수";

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const r of measureCorpus()) { const b = isRich(r.id) ? BUDGET_KB.rich : BUDGET_KB.normal; if (r.bytes / 1024 > b) fails.push(`${r.id} ${(r.bytes / 1024).toFixed(1)}KB > ${b}KB`); }

  const ents = corpus().filter(([id]) => id.startsWith("fx-"));
  let on = 0, off = 0;
  for (const [id, f] of ents) {
    const h = exportHtmlOf(f);
    const e = expandDedupedStyles(h);
    if (/data-pz-s=/.test(e)) fails.push(`${id}: 되돌린 문서에 묶기 표식이 남음`);
    if (dedupeStyles(h) !== h) fails.push(`${id}: 두 번 묶으면 달라짐`);
    on += Buffer.byteLength(h); off += Buffer.byteLength(e);
  }
  if (on > off * 0.97) fails.push(`묶기 효과가 3% 미만 (${((1 - on / off) * 100).toFixed(1)}%)`);

  const b = await launch();
  for (const id of ["fx-skincare-serum", "fx-living-storage", "fx-compare-fashion"]) {
    const r = await diffDocs(b, exportHtmlOf(corpus({ only: [id] })[0]![1]), 390);
    if (r.diff) fails.push(`${id}: 묶기 전후 계산 스타일 ${r.diff}곳 다름 — ${r.sample}`);
  }
  await b.close();

  // PNG 대조 순수 함수
  const parts = planCaptureParts(30000, 1.34375, 14000);
  if (parts.length !== 3 || parts.some((p) => p.h * 1.34375 > 14000 + 1) || parts.reduce((s, p) => s + p.h, 0) !== 30000) fails.push(`구간 계획 이상: ${JSON.stringify(parts)}`);
  const mk = async (c: string) => sharp({ create: { width: 860, height: 1260, channels: 3, background: c } }).png().toBuffer();
  const same = await compareImages(await mk("#336699"), await mk("#336699"), 860);
  if (same.mean > 0.5) fails.push(`같은 그림의 차이가 ${same.mean}`);
  const diff = await compareImages(await mk("#336699"), await mk("#CC9933"), 860);
  if (diff.mean < 40) fails.push(`다른 그림의 차이가 너무 작음 ${diff.mean}`);
  return fails;
}
