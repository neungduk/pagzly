/**
 * 466차 — 문자열 대비 감사(브라우저 없음). 마크업을 훑으며 글자 노드마다 "가장 가까운 불투명 배경"과 "상속된 글자색"의 대비를 잰다.
 *  - 배경: 헥스/rgb(a)(알파 ≥ 0.95)는 그 색, 그라데이션은 모든 색 정지점 중 최악, 반투명 색은 부모 배경 위 합성. 사진(`<img>`, `url(`)이 덮는 영역은 건너뜀(측정 불가).
 *  - 글자색: 가장 가까운 `color:`(rgba면 그 배경 위 합성). 없으면 `inherit` 기본(`#1B1B18`).
 *  - 건너뛰는 것: `aria-hidden="true"` 하위(장식), svg, style/script, 글자 없는 노드.
 *  - 기준: 일반 글자 4.5:1, 큰 글자(≥ 24px 또는 ≥ 18.66px 굵게) 3:1.
 * 한계: 실제 렌더 높이·겹침·z-index는 보지 않는다. 가상 배경(`::before`)·CSS 클래스로 정해진 색은 모른다(인라인 스타일만).
 */
const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);

type RGB = [number, number, number];
const lum = (c: RGB): number => {
  const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
};
export const ratio = (a: RGB, b: RGB): number => {
  const la = lum(a); const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
export function parseColor(s: string): { c: RGB; a: number } | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s.trim());
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = [...h].map((x) => x + x).join("");
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { c: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)], a };
  }
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(s.trim());
  if (m) return { c: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) };
  if (/^(white)$/i.test(s.trim())) return { c: [255, 255, 255], a: 1 };
  return null;
}
const over = (fg: { c: RGB; a: number }, bg: RGB): RGB => [0, 1, 2].map((i) => Math.round(fg.c[i]! * fg.a + bg[i]! * (1 - fg.a))) as RGB;

function decl(style: string, prop: string): string | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*((?:[a-z-]+-gradient\\((?:[^()]|\\([^()]*\\))*\\))|(?:url\\([^)]*\\)[^;]*)|[^;]+)`, "i").exec(style);
  return m ? m[1]!.trim() : null;
}

type Frame = { tag: string; bgs: RGB[] | "unknown"; color: { c: RGB; a: number } | null; size: number; weight: number; hidden: boolean };
export type Finding = { text: string; fg: string; bg: string; ratio: number; need: number; size: number };

const hex = (c: RGB) => `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;

/** html의 글자 노드 대비 위반 목록. rootBg = 가장 바깥 배경(섹션 단독 검사 시 페이지 바탕) */
export function contrastFindings(html: string, rootBg: string = "#FFFFFF", rootInk: string = "#1B1B18"): Finding[] {
  const out: Finding[] = [];
  const rb = parseColor(rootBg)!.c;
  const stack: Frame[] = [{ tag: "root", bgs: [rb], color: parseColor(rootInk), size: 16, weight: 400, hidden: false }];
  const re = /<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let skipTag: string | null = null;
  let skipDepth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[5] !== undefined) {
      const txt = m[5].replace(/&[a-z#0-9]+;/gi, " ").trim();
      const top = stack[stack.length - 1]!;
      if (!txt || top.hidden || skipTag || top.bgs === "unknown") continue;
      const fgc = top.color ?? { c: [27, 27, 24] as RGB, a: 1 };
      let worst = Infinity; let worstBg: RGB = rb; let worstFg: RGB = fgc.c;
      for (const bg of top.bgs) {
        const f = over(fgc, bg);
        const r = ratio(f, bg);
        if (r < worst) { worst = r; worstBg = bg; worstFg = f; }
      }
      const large = top.size >= 24 || (top.size >= 18.66 && top.weight >= 700);
      const need = large ? 3 : 4.5;
      if (worst < need) out.push({ text: txt.slice(0, 24), fg: hex(worstFg), bg: hex(worstBg), ratio: Math.round(worst * 100) / 100, need, size: top.size });
      continue;
    }
    const [, close, tag, attrs, self] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (skipTag) {
      if (!close && t === skipTag && !VOID.has(t) && !self) skipDepth += 1;
      else if (close && t === skipTag) { skipDepth -= 1; if (skipDepth === 0) skipTag = null; }
      continue;
    }
    if (close) {
      if (stack.length > 1 && !VOID.has(t)) stack.pop();
      continue;
    }
    if (t === "svg" || t === "style" || t === "script") { if (!self) { skipTag = t; skipDepth = 1; } continue; }
    const top = stack[stack.length - 1]!;
    const style = /style="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const hidden = top.hidden || /aria-hidden="true"/.test(attrs);
    let bgs: Frame["bgs"] = top.bgs;
    const bgv = decl(style, "background(?:-color)?");
    if (bgv) {
      if (/url\(/i.test(bgv) && !/gradient/i.test(bgv.replace(/url\([^)]*\)/g, ""))) bgs = "unknown";
      else if (/gradient/i.test(bgv)) {
        if (/url\(/i.test(bgv)) bgs = "unknown";
        else {
          const stops = [...bgv.matchAll(/#[0-9a-f]{6}\b|rgba?\([^)]*\)/gi)].map((x) => parseColor(x[0])).filter((x): x is { c: RGB; a: number } => !!x);
          const base = top.bgs === "unknown" ? [rb] : top.bgs;
          bgs = stops.length ? stops.flatMap((s) => base.map((b) => over(s, b))) : bgs;
        }
      } else {
        const pc = parseColor(bgv.split(/\s+/)[0]!) ?? parseColor(bgv);
        if (pc && pc.a > 0) {
          const base = top.bgs === "unknown" ? [rb] : top.bgs;
          bgs = base.map((b) => over(pc, b));
        }
      }
    }
    if (t === "img") { if (!self && !VOID.has(t)) stack.push(top); continue; }
    const colv = decl(style, "color");
    const color = colv ? parseColor(colv) ?? top.color : top.color;
    const fs = decl(style, "font-size");
    const size = fs && /px/.test(fs) ? parseFloat(fs) : top.size;
    const fw = decl(style, "font-weight");
    const weight = fw ? parseInt(fw, 10) || (/bold/.test(fw) ? 700 : 400) : top.weight;
    if (VOID.has(t) || self) continue;
    stack.push({ tag: t, bgs, color, size, weight, hidden });
  }
  return out;
}
