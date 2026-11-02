/**
 * 473차 — 히어로/장면 말줄임·중복 제목·한눈에 보기 칸·구분 띠 의도 모양 (문자열 전용).
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { topSections } from "./variety-metrics-463";

/** V5 히어로·장면 구간에서 말줄임/클램프/고정높이+overflow로 글이 잘리는 조합 */
export function ellipsisHits(html: string): string[] {
  const hits: string[] = [];
  const hero = html.match(/<section[^>]*pagzly-hero[\s\S]*?<\/section>/gi) ?? [];
  const scenes = topSections(expandDedupedStyles(html)).filter((s) => /data-pz-v4="[^"]*\.scene"/.test(s.slice(0, 400)));
  for (const raw of [...hero, ...scenes]) {
    // 접힌·중복숨김 노드는 의도적 overflow — 검사에서 제외
    const block = raw.replace(/<[^>]*data-hero-(?:fold|dup)[^>]*>[\s\S]*?<\/(?:p|div|span|h1)>/gi, "");
    if (/text-overflow\s*:\s*ellipsis/i.test(block)) hits.push("ellipsis");
    if (/-webkit-line-clamp\s*:/i.test(block)) hits.push("line-clamp");
  }
  return hits;
}

/** 히어로에서 시각 중복 부제(data-hero-dup)가 있으면 시각 숨김 스타일이 있는지 */
export function dupTitleOk(html: string): boolean {
  const dups = [...html.matchAll(/data-hero-dup="[^"]*"[^>]*style="([^"]*)"/g)];
  if (!dups.length) return true;
  return dups.every((m) => /clip:rect\(0,\s*0,\s*0,\s*0\)|clip:\s*rect\(0,0,0,0\)/.test(m[1] ?? ""));
}

/** 한눈에 보기: data-pz-glance=N 과 grid 존재, N=2/3/4 규칙 */
export function glanceLayoutOk(html: string): string[] {
  const f: string[] = [];
  for (const m of html.matchAll(/<section[^>]*data-pz-glance="(\d+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const n = Number(m[1]);
    const body = m[2] ?? "";
    if (!/data-pz-glance-grid/.test(body)) f.push(`glance${n}: grid 없음`);
    const cells = (body.match(/data-pz-glance-cell=/g) ?? []).length;
    if (cells !== n && cells > 0) f.push(`glance${n}: 칸 ${cells}≠${n}`);
  }
  return f;
}

/** 구분 띠: 단색 height 막대만 있고 패턴/점선/라벨/도형이 없으면 실패 */
export function bareBreatherHits(html: string): string[] {
  const f: string[] = [];
  for (const sec of topSections(expandDedupedStyles(html))) {
    if (!/data-pz-v4="breather\.rule"/.test(sec.slice(0, 400))) continue;
    const hasIntent =
      /repeating-linear-gradient/i.test(sec) ||
      /border(?:-top)?\s*:\s*[^;]*dotted/i.test(sec) ||
      /border(?:-top)?\s*:\s*[^;]*dashed/i.test(sec) ||
      /<svg[\s\S]*?<\/svg>/.test(sec);
    if (!hasIntent) f.push("bare-breather");
  }
  return f;
}
