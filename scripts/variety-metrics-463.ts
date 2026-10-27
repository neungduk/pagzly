/**
 * 463차 — 상세페이지 단조로움 지표(브라우저·네트워크 없음: 말뭉치를 export 문자열로 뽑아 마크업만 읽는다).
 *   npx tsx scripts/variety-metrics-463.ts            # 표 출력
 *   NEXT_PUBLIC_DESIGN_V4_UP1=on npx tsx scripts/variety-metrics-463.ts
 * 본문 섹션 = 래퍼 바로 아래 `<section>`(히어로 제외; 패션 페이지는 data-pz-i가 없어 속성에 의존하지 않는다). 구조 서명 = data-pz-v4(계열.변형) → data-pz-impact(임팩트 종류) → class 첫 낱말 → "plain".
 * 면(face) = 그 섹션 style의 첫 background 값. 높이 추정 = 섹션 마크업 길이. 제목 정렬 = 섹션 안 첫 text-align.
 * 한계: 마크업 길이는 실제 높이가 아니다(사진·여백 단위가 빠짐). 서명은 임팩트 종류 단위라 같은 종류 안의 세부 모양(색·간격)은 구분하지 못한다.
 */
import { budgetOf } from "./color-budget";

export type PageMetrics = {
  sections: number;
  signatures: string[];
  distinct: number;
  /** 서로 다른 서명 수 / 섹션 수 */
  diversity: number;
  /** 같은 서명이 이어지는 최대 길이 */
  maxRun: number;
  /** 이웃 섹션이 같은 면인 비율 */
  sameFaceRatio: number;
  /** 첫 text-align이 center인 섹션 비율 / 연속 최대 길이 */
  centerRatio: number;
  centerRun: number;
  /** 연속 3개 섹션의 길이 변동계수가 0.15 미만인 구간 수(같은 밀도가 이어짐) */
  flatZones: number;
  /** 464차 — 섹션 위 여백 단계(첫 padding 값)가 같은 채로 이어지는 최대 길이(모르는 섹션은 끊김) */
  padRun: number;
  /** 464차 — 위 여백 단계가 같은 섹션 3개가 이어지는 곳의 수(모르는 섹션이 끼면 끊김) */
  padTriples: number;
  /** 464차 — 면 색상군 수(446차 색 예산과 같은 함수 budgetOf를 마크업의 면 색 문자열에 적용한 근사; 실제 측정은 브라우저 필요) */
  colorGroups: number;
};

const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);

/** 본문 래퍼(`pagzly-wrap`) 바로 아래 `<section>`(히어로 제외)를 마크업 그대로 뽑는다 */
export function topSections(html: string): string[] {
  const b = html.slice(Math.max(0, html.indexOf("<body")));
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  for (let m = re.exec(b); m; m = re.exec(b)) {
    const [whole, close, tag, attrs, selfClose] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (VOID.has(t) || selfClose) continue;
    if (close) {
      depth -= 1;
      if (t === "section" && depth === 2 && start >= 0) { out.push(b.slice(start, m.index + whole.length)); start = -1; }
    } else {
      if (t === "section" && depth === 2 && !/pagzly-hero/.test(attrs)) start = m.index;
      depth += 1;
    }
  }
  return out;
}

export function signatureOf(sec: string): string {
  const head = sec.slice(0, sec.indexOf(">") + 1);
  const v4 = /data-pz-v4="([^"]+)"/.exec(head)?.[1];
  if (v4) return v4;
  const imp = /data-pz-impact="([^"]+)"/.exec(head)?.[1];
  if (imp) return `impact.${imp}`;
  const cls = /class="([^"]+)"/.exec(head)?.[1]?.split(/\s+/)[0];
  if (cls) return cls.replace(/^pagzly-/, "");
  const id = /id="pagzly-([^"]+)"/.exec(head)?.[1];
  return id ? `id.${id}` : "plain";
}

export function faceOf(sec: string): string {
  const head = sec.slice(0, sec.indexOf(">") + 1);
  const style = /style="([^"]*)"/.exec(head)?.[1] ?? "";
  const m = /(?:^|;)\s*background(?:-color)?:\s*((?:linear-gradient\([^;]*\))|[^;]+)/.exec(style);
  return (m?.[1] ?? "none").trim().toLowerCase();
}

export function padOf(sec: string): number | null {
  const head = sec.slice(0, sec.indexOf(">") + 1);
  const m = /padding:\s*(?:var\(--pz-pad-y,\s*)?(\d+)px/.exec(head);
  return m ? Number(m[1]) : null;
}

/** 면 색 문자열 → rgb() (그라데이션은 첫 색). 색을 못 읽으면 null */
export function rgbOfFace(face: string): string | null {
  const m = /#([0-9a-f]{6})\b/i.exec(face) ?? /#([0-9a-f]{3})\b/i.exec(face);
  if (!m) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
}

export function titleAlignOf(sec: string): "center" | "other" {
  const m = /text-align:\s*(center|left|start|right)/.exec(sec);
  return m?.[1] === "center" ? "center" : "other";
}

export function pageMetrics(html: string): PageMetrics {
  const secs = topSections(html);
  const sigs = secs.map(signatureOf);
  const faces = secs.map(faceOf);
  const aligns = secs.map(titleAlignOf);
  const lens = secs.map((s) => s.length);
  const n = secs.length;
  let maxRun = n ? 1 : 0;
  let run = 1;
  for (let i = 1; i < n; i += 1) { run = sigs[i] === sigs[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
  let same = 0;
  for (let i = 1; i < n; i += 1) if (faces[i] === faces[i - 1]) same += 1;
  let cRun = 0;
  let cMax = 0;
  for (const a of aligns) { cRun = a === "center" ? cRun + 1 : 0; cMax = Math.max(cMax, cRun); }
  let flat = 0;
  for (let i = 0; i + 2 < n; i += 1) {
    const w = [lens[i]!, lens[i + 1]!, lens[i + 2]!];
    const mean = (w[0]! + w[1]! + w[2]!) / 3;
    const sd = Math.sqrt(w.reduce((a, x) => a + (x - mean) ** 2, 0) / 3);
    if (mean > 0 && sd / mean < 0.15) flat += 1;
  }
  const pads = secs.map(padOf);
  let padRun = 0;
  let pr = 0;
  for (let i = 0; i < n; i += 1) { pr = pads[i] !== null && i > 0 && pads[i] === pads[i - 1] ? pr + 1 : pads[i] !== null ? 1 : 0; padRun = Math.max(padRun, pr); }
  let padTriples = 0;
  for (let i = 2; i < n; i += 1) if (pads[i] !== null && pads[i] === pads[i - 1] && pads[i] === pads[i - 2]) padTriples += 1;
  const colorGroups = budgetOf(faces.map(rgbOfFace).filter((x): x is string => !!x)).groups;
  const distinct = new Set(sigs).size;
  return {
    sections: n, signatures: sigs, distinct, diversity: n ? distinct / n : 0, maxRun,
    sameFaceRatio: n > 1 ? same / (n - 1) : 0,
    centerRatio: n ? aligns.filter((a) => a === "center").length / n : 0, centerRun: cMax, flatZones: flat, padRun, padTriples, colorGroups,
  };
}

export type CorpusRow = { id: string; m: PageMetrics };
export async function corpusMetrics(): Promise<CorpusRow[]> {
  const { corpus, exportHtmlOf } = await import("./design-corpus");
  return corpus().map(([id, file]) => ({ id, m: pageMetrics(exportHtmlOf(file)) }));
}

export type Summary = { padTriples: number; padRun: number; maxColorGroups: number; colorOver: number; crossPageSimilarity: number; pages: number; diversity: number; maxRun: number; sameFaceRatio: number; centerRatio: number; centerRun: number; flatZones: number; distinctTotal: number };
/** 페이지 쌍마다 서명 이웃쌍(bigram) 집합의 자카드 유사도 평균 — 상품이 달라도 같은 순서로 나오는 정도(낮을수록 다양) */
export function crossPageSimilarity(rows: CorpusRow[]): number {
  const sets = rows.filter((r) => r.m.sections >= 5).map((r) => new Set(r.m.signatures.slice(1).map((x, i) => `${r.m.signatures[i]}>${x}`)));
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < sets.length; i += 1) for (let j = i + 1; j < sets.length; j += 1) {
    const a = sets[i]!; const b = sets[j]!;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter += 1;
    const uni = a.size + b.size - inter;
    sum += uni ? inter / uni : 0;
    cnt += 1;
  }
  return cnt ? sum / cnt : 0;
}

export function summarize(rows: CorpusRow[]): Summary {
  rows = rows.filter((r) => r.m.sections > 0);
  const k = Math.max(1, rows.length);
  const avg = (f: (m: PageMetrics) => number) => rows.reduce((a, r) => a + f(r.m), 0) / k;
  return {
    padTriples: rows.reduce((a, r) => a + r.m.padTriples, 0), padRun: Math.max(0, ...rows.map((r) => r.m.padRun)), maxColorGroups: Math.max(0, ...rows.map((r) => r.m.colorGroups)), colorOver: rows.filter((r) => r.m.colorGroups > 3).length,
    crossPageSimilarity: crossPageSimilarity(rows), pages: rows.length, diversity: avg((m) => m.diversity), maxRun: Math.max(0, ...rows.map((r) => r.m.maxRun)),
    sameFaceRatio: avg((m) => m.sameFaceRatio), centerRatio: avg((m) => m.centerRatio), centerRun: Math.max(0, ...rows.map((r) => r.m.centerRun)),
    flatZones: rows.reduce((a, r) => a + r.m.flatZones, 0), distinctTotal: new Set(rows.flatMap((r) => r.m.signatures)).size,
  };
}

async function main() {
  const rows = await corpusMetrics();
  const f2 = (x: number) => x.toFixed(2);
  console.log(`UP1=${process.env.NEXT_PUBLIC_DESIGN_V4_UP1 === "on" ? "on" : "off"}`);
  console.log("id\t섹션\t서명수\t다양도\t최대연속\t이웃같은면\t중앙정렬비\t중앙연속\t평탄구간\t여백연속\t색상군");
  for (const { id, m } of rows) console.log([id, m.sections, m.distinct, f2(m.diversity), m.maxRun, f2(m.sameFaceRatio), f2(m.centerRatio), m.centerRun, m.flatZones, m.padRun, m.colorGroups].join("\t"));
  const s = summarize(rows);
  console.log(`평균/합\t-\t-\t${f2(s.diversity)}\t${s.maxRun}(최대)\t${f2(s.sameFaceRatio)}\t${f2(s.centerRatio)}\t${s.centerRun}(최대)\t${s.flatZones}(합)\t전체 서명 종류 ${s.distinctTotal}`);
  console.log(`페이지 간 서명 이웃쌍 유사도(낮을수록 다양) ${f2(s.crossPageSimilarity)} · 페이지 ${s.pages} · 여백 연속 최대 ${s.padRun} · 여백 3연속 ${s.padTriples}곳 · 색상군 최대 ${s.maxColorGroups}(3 초과 ${s.colorOver}쪽)`);
  if (process.argv.includes("--signatures")) for (const { id, m } of rows) console.log(`${id}: ${m.signatures.join(" > ")}`);
}

if (require.main === module) void main();
