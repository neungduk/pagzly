/**
 * 회귀 — 439차 2-2 그래픽 모티프: 좌표 모델(섹션 안 깊이 ≤40px·경계 밖 ≤20px·좌우 안쪽)로 글 영역과 겹치지 않음,
 * 섹션당 ≤2개, v4 블록 상하 여백(mood 적용 후) > 안전 영역, 외부 이미지 0, 모션 0. 호출 0.
 */
import { MAX_MOTIFS_PER_SECTION, MOTIF_IDS, SAFE_BAND_PX, isSafe, motifHtml, motifSvg, planMotifs, readMotifMarks } from "../../lib/motifs";
import { MOODS } from "../../lib/archetype-recipes";
import { corpus, exportHtmlOf } from "../design-corpus";

export const name = "모티프(v4) — 안전 영역 좌표·섹션당 ≤2·여백 > 안전 영역·외부 이미지/모션 없음";

const C = { a: "#AABBCC", b: "#334455", c: "#DD6677" };

export async function run(): Promise<string[]> {
  const fails: string[] = [];
  for (const mood of [...Object.keys(MOODS), null]) {
    // 440차 7-4 — 실제 시드는 부호 없는 32비트(seedOf)라 2^31 이상도 검사(이전엔 0~39만 봐서 inset 음수를 놓쳤다)
    for (const seed of [...Array.from({ length: 40 }, (_, i) => i), 0x80000000, 0x80000005, 0xdeadbeef, 0xfffffffe, 0xffffffff]) {
      for (const cross of [true, false]) {
        const ps = planMotifs(mood, seed, { count: 2, cross });
        if (ps.length > MAX_MOTIFS_PER_SECTION) fails.push(`${mood}/${seed}: ${ps.length}개`);
        for (const p of ps) if (!isSafe(p)) fails.push(`${mood}/${seed}/${p.id}: 안전 영역 밖 offset=${p.offset} h=${p.h} inset=${p.inset}`);
      }
    }
  }
  for (const id of MOTIF_IDS) {
    const svg = motifSvg(id, 40, 40, C, 3);
    if (/<image|url\(|https?:/.test(svg)) fails.push(`${id}: 외부 이미지 참조`);
    if (/<animate|@keyframes|animation/.test(svg)) fails.push(`${id}: 모션`);
  }
  const html = motifHtml(planMotifs("playful", 3, { count: 1, cross: true })[0]!, C);
  if (!/aria-hidden="true"/.test(html) || !/pointer-events:none/.test(html)) fails.push("모티프가 장식 표식(aria-hidden·pointer-events)을 안 가짐");
  // 말뭉치 export: 모든 v4 섹션의 모티프 표식이 안전, 섹션당 ≤2, 첫 여백 > 안전 영역
  for (const [id, file] of corpus()) {
    const html = exportHtmlOf(file);
    for (const m of html.matchAll(/<section[^>]*data-pz-impact="v4"[^>]*style="[^"]*?padding:(\d+)px[^"]*"[\s\S]*?<\/section>/g)) {
      const sec = m[0];
      const top = Number(m[1]);
      const marks = readMotifMarks(sec.slice(0, sec.indexOf('<div style="position:relative;z-index:1') > 0 ? sec.indexOf('<div style="position:relative;z-index:1') : sec.length));
      if (marks.length > MAX_MOTIFS_PER_SECTION) fails.push(`${id}: 섹션 모티프 ${marks.length}개`);
      for (const k of marks) if (!isSafe({ offset: k.offset, h: k.h })) fails.push(`${id}: 모티프 ${k.id} 안전 영역 밖`);
      if (marks.length && top > 0 && top <= SAFE_BAND_PX) fails.push(`${id}: 위 여백 ${top}px ≤ 안전 영역 ${SAFE_BAND_PX}px`);
    }
  }
  return fails;
}
