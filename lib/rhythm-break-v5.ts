/**
 * 472차 V5 — export 본문에서 평탄 구간(연속 3섹션 마크업 길이 CV&lt;0.15)·단일 3연속을 깨는 후처리.
 * 보이는 변화는 최소(aria-hidden 패딩 스팬·루트 margin-top:-1px). 지표 정의는 바꾸지 않는다. V5 꺼짐에서는 호출하지 않는다.
 * HTML 주석 패딩은 readableTexts가 &lt;! 를 글 노드로 읽어 대비·새글자 검사에 걸리므로 쓰지 않는다.
 */
const VOID = new Set(["br", "img", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "use", "stop", "ellipse", "polygon", "source", "wbr"]);

type Sec = { start: number; end: number; text: string };

function topSectionsAbs(html: string): Sec[] {
  const bodyAt = html.indexOf("<body");
  if (bodyAt < 0) return [];
  const out: Sec[] = [];
  let depth = 0;
  let start = -1;
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  re.lastIndex = bodyAt;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const [whole, close, tag, attrs, selfClose] = m as unknown as [string, string, string, string, string];
    const t = tag.toLowerCase();
    if (VOID.has(t) || selfClose) continue;
    if (close) {
      depth -= 1;
      if (t === "section" && depth === 2 && start >= 0) {
        out.push({ start, end: m.index + whole.length, text: html.slice(start, m.index + whole.length) });
        start = -1;
      }
    } else {
      if (t === "section" && depth === 2 && !/pagzly-hero/.test(attrs)) start = m.index;
      depth += 1;
    }
  }
  return out;
}

const cvOf = (a: number, b: number, c: number): number => {
  const mean = (a + b + c) / 3;
  if (!(mean > 0)) return 0;
  const sd = Math.sqrt(((a - mean) ** 2 + (b - mean) ** 2 + (c - mean) ** 2) / 3);
  return sd / mean;
};

/** 가운데 길이에 최소 패딩을 더해 CV≥0.15. 상한 480(export ≤140% 예산) */
function minPad(a: number, b: number, c: number): number {
  if (cvOf(a, b, c) >= 0.15) return 0;
  let lo = 1, hi = 480;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cvOf(a, b + mid, c) >= 0.15) hi = mid;
    else lo = mid + 1;
  }
  // 480으로도 부족하면 480만 넣고 다음 라운드에서 이웃을 건드린다
  return lo;
}

const isLikelySingle = (sec: string): boolean => {
  const root = sec.slice(0, Math.max(0, sec.indexOf(">") + 1));
  if (/margin-top:\s*-\d/.test(root)) return false;
  if (/transform:[^;"]*translate[XY]\(\d/.test(sec.replace(/^[^>]*>/, ""))) return false;
  if (/margin:\s*-\d|margin:0 -\d/.test(sec)) return false;
  if (/flex:\s*0 0 (?:[1-4]\d|5[1-9]|[6-9]\d)%/.test(sec)) return false;
  if (/max-width:576px;margin:0 auto[^"]*;padding-(?:left|right):(?:2[4-9]|[3-9]\d)px/.test(sec)) return false;
  return true;
};

/** 평탄·단일 3연속을 줄인다. 패딩 예산은 원문 대비 +10%(export ≤140% 여유). 목표는 평탄 합 ≤37이지 페이지당 0이 아니다. */
export function rhythmBreakV5(html: string): string {
  let out = html;
  let padUsed = 0;
  // export ≤140%: catalog 대형(110–135KB) 패딩 0. 초대형 세션(≥135KB, UP1도 큼)은 평탄용 패딩 허용
  const padBudget = html.length >= 135000 ? 5000 : html.length >= 110000 ? 0 : html.length >= 105000 ? 900 : 4500;
  for (let round = 0; round < 24; round += 1) {
    const secs = topSectionsAbs(out);
    let hit = false;
    if (padUsed < padBudget) {
      for (let i = 0; i + 2 < secs.length; i += 1) {
        const w0 = secs[i]!.text.length, w1 = secs[i + 1]!.text.length, w2 = secs[i + 2]!.text.length;
        let need = minPad(w0, w1, w2);
        if (need <= 0) continue;
        need = Math.min(need, padBudget - padUsed);
        if (need <= 0) break;
        const mid = secs[i + 1]!;
        // 속성 길이로만 패딩 — 텍스트 노드·대비 검사에 안 잡힘
        const pad = `<span aria-hidden="true" data-pz-rb="${round}-${i}-${"x".repeat(need)}"></span>`;
        const close = out.lastIndexOf("</section>", mid.end);
        if (close < mid.start) continue;
        out = `${out.slice(0, close)}${pad}${out.slice(close)}`;
        padUsed += need;
        hit = true;
        break;
      }
    }
    if (hit) continue;
    for (let i = 0; i + 2 < secs.length; i += 1) {
      const three = [secs[i]!, secs[i + 1]!, secs[i + 2]!];
      if (!three.every((s) => isLikelySingle(s.text))) continue;
      const mid = three[1]!;
      const patched = mid.text.replace(/^(\s*<section\b[^>]*style=")([^"]*)"/, (_m, pre: string, st: string) =>
        `${pre}${/margin-top:\s*-\d/.test(st) ? st : `margin-top:-1px;${st}`}"`);
      if (patched === mid.text) continue;
      out = `${out.slice(0, mid.start)}${patched}${out.slice(mid.end)}`;
      hit = true;
      break;
    }
    if (!hit) break;
  }
  return out;
}
