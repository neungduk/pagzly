/**
 * 467차 — "다이나믹" 대리 지표(문자열 전용: 말뭉치 export HTML을 읽을 뿐, 브라우저·네트워크 없음). 지표는 본문 섹션(히어로 제외) 마크업에서 센다.
 *  ① 겹침: 음수 margin / translate 로 이웃 영역을 침범하는 요소 수   ② 기울임: rotate·skew 요소 수   ③ 비직선 도형: 원(border-radius:50%·999px 정사각)·SVG path/circle/ellipse/polygon 장식 수
 *  ④ 초점 스케일: 섹션별 (가장 큰 글자 px ÷ 본문 15px) 의 중앙값   ⑤ 같은 반경·그림자 사각 카드 비율(가장 흔한 카드 서명이 카드 전체에서 차지하는 비율)
 *  ⑥ 수평 직선 이음새 비율(섹션 경계 중 이음새 도형 없는 것)   ⑦ 서로 다른 사진 틀 수   ⑧ 좌우 비대칭 구도 수(열 폭 비가 50:50이 아닌 flex/grid)
 * 한계: 마크업 문자열이라 실제 렌더 크기·겹침은 보지 않는다. 장식 SVG는 aria-hidden 으로 센다. 반복 style 묶음(data-pz-s)은 풀어서 읽는다.
 */
import { expandDedupedStyles } from "../lib/style-dedupe";
import { topSections, signatureOf } from "./variety-metrics-463";

export type DynMetrics = {
  sections: number;
  overlap: number;
  tilt: number;
  shapes: number;
  focalMedian: number;
  cardSameShare: number;
  straightSeamShare: number;
  frameKinds: number;
  asym: number;
};

const px = (s: string): number[] => [...s.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));

export function dynMetrics(html: string): DynMetrics {
  const secs = topSections(expandDedupedStyles(html));
  let overlap = 0; let tilt = 0; let shapes = 0; let asym = 0;
  const focal: number[] = [];
  const cards = new Map<string, number>();
  const frames = new Set<string>();
  let straight = 0; let boundaries = 0;
  secs.forEach((s, i) => {
    overlap += (s.match(/margin(?:-top|-bottom|-left|-right)?:\s*-\d+(?:\.\d+)?px/g) ?? []).length + (s.match(/transform:[^;"]*translate[XY]?\((?:-\d|[^)]*,\s*-\d)/g) ?? []).length;
    tilt += (s.match(/transform:[^;"]*(?:rotate|skew)\(/g) ?? []).length;
    shapes += (s.match(/border-radius:\s*(?:50%|999px|9999px)/g) ?? []).length + (s.match(/<(?:path|ellipse|polygon)\b/g) ?? []).length;
    asym += (s.match(/flex:\s*0 0 (\d+)%/g) ?? []).filter((m) => !/ 50%/.test(m)).length + (s.match(/grid-template-columns:\s*[^;"]*(?:fr|%)[^;"]*/g) ?? []).filter((m) => !/repeat\(\d+,\s*1fr\)|1fr 1fr/.test(m)).length;
    const sizes = px(s).filter((v) => v < 200);
    if (sizes.length) focal.push(Math.max(...sizes) / 15);
    for (const m of s.matchAll(/<div[^>]*style="([^"]*)"/g)) {
      const st = m[1]!;
      const rad = /border-radius:\s*(\d+(?:px)?(?:\s+\d+(?:px)?){0,3})/.exec(st)?.[1];
      if (!rad || !/background/.test(st) || !/border:|box-shadow:/.test(st) || /overflow:hidden[^"]*aspect-ratio|aspect-ratio[^"]*overflow:hidden/.test(st)) continue;
      const sig = `${rad.replace(/px/g, "").trim()}|${/box-shadow:\s*([^;"]+)/.exec(st)?.[1]?.replace(/\s+/g, "") ?? "none"}`;
      cards.set(sig, (cards.get(sig) ?? 0) + 1);
    }
    for (const m of s.matchAll(/<div[^>]*style="([^"]*overflow:hidden[^"]*)"[^>]*>\s*<img/g)) {
      const st = m[1]!;
      frames.add(`${/border-radius:\s*([^;"]+)/.exec(st)?.[1] ?? "0"}|${/aspect-ratio:\s*([^;"]+)/.exec(st)?.[1]?.trim() ?? ""}|${/transform:\s*([^;"]+)/.exec(st)?.[1] ?? ""}`);
    }
    if (i > 0) {
      boundaries += 1;
      // 이음새: 맨 위 구분선(data-pz-divider) · 이음새 도형(data-pz-seam — 466/467차 레이어는 섹션 끝에 붙는다) · 걸침(루트 margin-top 음수)
      if (!/data-pz-divider/.test(s.slice(0, 900)) && !/data-pz-seam/.test(s) && !/margin-top:\s*-\d/.test(s.slice(0, s.indexOf(">") + 1))) straight += 1;
    }
  });
  const total = [...cards.values()].reduce((a, b) => a + b, 0);
  focal.sort((a, b) => a - b);
  return {
    sections: secs.length, overlap, tilt, shapes,
    focalMedian: focal.length ? focal[Math.floor(focal.length / 2)]! : 0,
    cardSameShare: total ? Math.max(...cards.values()) / total : 0,
    straightSeamShare: boundaries ? straight / boundaries : 0,
    frameKinds: frames.size, asym,
  };
}

export function sigOf(html: string): string[] { return topSections(expandDedupedStyles(html)).map(signatureOf); }
